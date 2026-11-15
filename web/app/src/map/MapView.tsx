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
import css from "./MapView.module.css";

const FIT_PADDING = 48;
const FLY_MS = 1200;

export function MapView() {
  const { data, derived } = usePlanner();
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

  // Fly to the study area whenever the night changes (skips the first render: initialViewState handles it).
  const firstFit = useRef(true);
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false;
      return;
    }
    mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: FLY_MS });
  }, [bounds]);

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
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" unit="imperial" />
        <AttributionControl position="bottom-right" compact />
        {data.hospitals.map((h) => (
          <Marker key={h.id} longitude={h.lon} latitude={h.lat} anchor="center">
            <div className={css.hospital} aria-label={`Hospital ${h.id}`}>
              {h.id}
            </div>
          </Marker>
        ))}
      </Map>
      <div className={css.note}>Call locations are approximate (zip code area)</div>
      {tileError && (
        <div className={css.error} role="status">
          Street map tiles could not load (no internet?). Data still works; use the offline page if needed.
        </div>
      )}
    </div>
  );
}
