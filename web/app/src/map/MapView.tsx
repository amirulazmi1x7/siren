import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  AttributionControl,
  Marker,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { usePlanner } from "../state/PlannerContext";
import { MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, ONLINE_STYLE_URL, boundsOf, hidePlaceLabels } from "./basemap";
import { DeckOverlay } from "./DeckOverlay";
import { HospitalMarker } from "./HospitalMarker";
import { callLayers, orderCalls } from "./layers";
import css from "./MapView.module.css";

const FIT_PADDING = 56;
const FLY_MS = 1200;
const FOCUS_ZOOM = 14.5;
const FOCUS_MS = 800;
/** Hospital badge is 30px; anchor its center on the hospital. */
const BADGE_HALF = 15;

export function MapView() {
  const { data, state, derived } = usePlanner();
  const mapRef = useRef<MapRef>(null);
  const [tileError, setTileError] = useState(false);

  // Frame the night's calls and the hospitals, so the camera follows the real study area.
  const bounds = useMemo(() => boundsOf([...derived.night.calls, ...data.hospitals]), [derived.night, data.hospitals]);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    hidePlaceLabels(map);
    map.on("styledata", () => hidePlaceLabels(map));
    // Dev only: lets QA scripts check rendered labels (e.g. no hospital names). Stripped from builds.
    if (import.meta.env.DEV) (window as unknown as { __map: typeof map }).__map = map;
  }, []);

  // Fly to the study area whenever the night changes (skip first render: initialViewState handles it).
  const firstFit = useRef(true);
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false;
      return;
    }
    mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: FLY_MS });
  }, [bounds]);

  const focusHospital = useCallback((lon: number, lat: number) => {
    mapRef.current?.easeTo({ center: [lon, lat], zoom: FOCUS_ZOOM, duration: FOCUS_MS });
  }, []);

  // Late calls draw on top; recompute only when the night or the result changes, not every frame.
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
    <div className={css.wrap} data-testid="map">
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
        onError={() => {
          // Only report a failure to load the street style itself, not a single missing tile.
          if (!mapRef.current?.getMap().isStyleLoaded()) setTileError(true);
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* interleaved: draw inside MapLibre's own WebGL context, so HTML markers and the legend stay on top. */}
        <DeckOverlay interleaved layers={layers} />
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" unit="imperial" />
        <AttributionControl position="bottom-right" compact />
        {data.hospitals.map((h, i) => (
          <Marker key={h.id} longitude={h.lon} latitude={h.lat} anchor="top-left" offset={[-BADGE_HALF, -BADGE_HALF]}>
            <HospitalMarker
              id={h.id}
              stuck={derived.shown.stuck[i]?.[derived.block] ?? 0}
              waitMin={derived.shown.door_wait_min[i]?.[derived.block] ?? 0}
              onSelect={() => focusHospital(h.lon, h.lat)}
            />
          </Marker>
        ))}
      </Map>
      {tileError && (
        <div className={css.error} role="status">
          Street map tiles could not load (no internet?). Data still works; use the offline page if needed.
        </div>
      )}
    </div>
  );
}
