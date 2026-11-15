import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  AttributionControl,
  Marker,
  type MapRef,
} from "react-map-gl/maplibre";
import type { HospitalId } from "../lib/contract";
import { motionMs } from "../lib/motion";
import { usePlanner } from "../state/PlannerContext";
import { MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, ONLINE_STYLE_URL, boundsOf, hidePlaceLabels } from "./basemap";
import { DeckOverlay } from "./DeckOverlay";
import { HospitalMarker } from "./HospitalMarker";
import { StoryPin } from "./StoryPin";
import { storyFor } from "../lib/story";
import { callLayers, orderCalls } from "./layers";
import { registerFocusHandler } from "./mapControl";
import css from "./MapView.module.css";

/** Frame the study area in the part of the screen the floating panels leave free (title, left panel, right rail, bottom pill). */
const FIT_PADDING = { top: 190, bottom: 110, left: 440, right: 340 };
const FLY_MS = 1200;
const FOCUS_ZOOM = 14.5;
const FOCUS_MS = 800;
/** Hospital badge is 30px; anchor its center on the hospital. */
const BADGE_HALF = 17;
/** A bubble is about this wide and tall (px); closer neighbors than this would collide. */
const BUBBLE_SPAN = 210;
const BUBBLE_ROW = 70;
/** Right rail (300px) + gaps + room for the pin label (~190px). */
const RIGHT_RAIL_CLEARANCE = 540;

export function MapView() {
  const { data, state, derived } = usePlanner();
  const mapRef = useRef<MapRef>(null);
  const [tileError, setTileError] = useState(false);
  // Bumped when the camera stops, so bubble directions are recomputed for the new zoom/pan.
  const [, setCameraTick] = useState(0);

  // Frame the night's calls and the hospitals, so the camera follows the real study area.
  const bounds = useMemo(() => boundsOf([...derived.night.calls, ...data.hospitals]), [derived.night, data.hospitals]);

  // The map's box changes size with the window and layout; keep the canvas in step with it.
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => mapRef.current?.getMap().resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.resize();
    map.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 });
    hidePlaceLabels(map);
    map.on("styledata", () => hidePlaceLabels(map));
    // Dev only: lets QA scripts check rendered labels (e.g. no hospital names). Stripped from builds.
    if (import.meta.env.DEV) (window as unknown as { __map: typeof map }).__map = map;
  }, [bounds]);

  // Fly to the study area whenever the night changes (skip first render: initialViewState handles it).
  const firstFit = useRef(true);
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false;
      return;
    }
    mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: motionMs(FLY_MS) });
  }, [bounds]);

  const focusHospital = useCallback((lon: number, lat: number) => {
    mapRef.current?.easeTo({ center: [lon, lat], zoom: FOCUS_ZOOM, duration: motionMs(FOCUS_MS) });
  }, []);

  // Let the plan grid's hospital labels move the camera here.
  useEffect(() => {
    registerFocusHandler((id: HospitalId) => {
      const h = data.hospitals.find((x) => x.id === id);
      if (h) focusHospital(h.lon, h.lat);
    });
    return () => registerFocusHandler(null);
  }, [data.hospitals, focusHospital]);

  // Late calls draw on top; recompute only when the night or the result changes, not every frame.
  // The decision's story call: pinned once the replay reaches it, only while the map shows the agent's plan
  // (the story comes from the same rehearsal run the map replays).
  const story = useMemo(() => storyFor(derived.night, derived.pick), [derived.night, derived.pick]);
  const showPin =
    !!story?.call && state.phase === "decision" && state.view === "rec" && state.t >= story.highlight.t;

  // Busiest hospital right now gets the red ring; bubbles pop in busiest first.
  const stuckNow = data.hospitals.map((_, i) => derived.shown.stuck[i]?.[derived.block] ?? 0);
  const busiestIndex = stuckNow.indexOf(Math.max(...stuckNow));
  // Bubbles open to the right. If another hospital sits just to the right (on screen), open this one to the
  // left instead so neighboring bubbles never overlap.
  const bubbleLeft = (() => {
    const map = mapRef.current?.getMap();
    if (!map) return data.hospitals.map(() => false);
    const pts = data.hospitals.map((h) => map.project([h.lon, h.lat]));
    return pts.map((p, i) =>
      pts.some((q, j) => j !== i && q.x > p.x && q.x - p.x < BUBBLE_SPAN && Math.abs(q.y - p.y) < BUBBLE_ROW),
    );
  })();
  const order = stuckNow.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const rankOf: number[] = [];
  order.forEach(([, i], r) => (rankOf[i] = r));

  // Keep the pin's label clear of the right rail: flip it left when the call is near the right edge.
  const pinNearRight = (lon: number, lat: number) => {
    const map = mapRef.current?.getMap();
    if (!map) return false;
    return map.project([lon, lat]).x > map.getContainer().clientWidth - RIGHT_RAIL_CLEARANCE;
  };

  const resultKey = useMemo(() => derived.shown.late_ids.join(","), [derived.shown]);
  const ordered = useMemo(() => orderCalls(derived.night.calls, derived.lateIds), [derived.night, derived.lateIds]);
  const layers = callLayers({
    calls: ordered,
    lateIds: derived.lateIds,
    t: state.t,
    playing: state.playing,
    resultKey,
  });

  return (
    <div ref={wrapRef} className={css.wrap} data-testid="map">
      <Map
        ref={mapRef}
        mapStyle={ONLINE_STYLE_URL}
        initialViewState={{ bounds, fitBoundsOptions: { padding: FIT_PADDING } }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={MAX_BOUNDS}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={false}
        onLoad={onLoad}
        onMoveEnd={() => setCameraTick((n) => n + 1)}
        onError={() => {
          // Only report a failure to load the street style itself, not a single missing tile.
          if (!mapRef.current?.getMap().isStyleLoaded()) setTileError(true);
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* interleaved: draw inside MapLibre's own WebGL context, so HTML markers and the legend stay on top. */}
        <DeckOverlay interleaved layers={layers} />
        <AttributionControl position="top-right" compact />
        {data.hospitals.map((h, i) => (
          <Marker key={h.id} longitude={h.lon} latitude={h.lat} anchor="top-left" offset={[-BADGE_HALF, -BADGE_HALF]}>
            <HospitalMarker
              id={h.id}
              stuck={stuckNow[i] ?? 0}
              waitMin={derived.shown.door_wait_min[i]?.[derived.block] ?? 0}
              busiest={i === busiestIndex}
              rank={rankOf[i] ?? i}
              bubbleLeft={bubbleLeft[i] ?? false}
            />
          </Marker>
        ))}
        {showPin && story?.call && (
          <Marker longitude={story.call.lon} latitude={story.call.lat} anchor="center">
            <StoryPin highlight={story.highlight} flip={pinNearRight(story.call.lon, story.call.lat)} />
          </Marker>
        )}
      </Map>
      {tileError && (
        <div className={css.error} role="status">
          Street map tiles could not load (no internet?). Data still works; use the offline page if needed.
        </div>
      )}
    </div>
  );
}
