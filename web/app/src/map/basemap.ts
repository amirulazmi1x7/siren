// Base map: street-level vector tiles, styled calm and light for projectors.
import type { Map as MapLibreMap } from "maplibre-gl";

/** OpenFreeMap "positron": free, no API key, OpenStreetMap data. Needs internet (offline tiles come in T10). */
export const ONLINE_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/**
 * Label layers we never show. Hospitals are anonymized as A/B/C, so a street map must not
 * print their real names. Positron has no POI layer today; this guards against style changes
 * and against switching to a richer style later.
 */
const HIDDEN_SOURCE_LAYERS = new Set(["poi", "aerodrome_label", "housenumber"]);
// "poi" only as a whole id part, so "water_name_point_label" is not caught.
const HIDDEN_ID_PATTERN = /(^|[_-])poi([_-]|$)|hospital|airport|aerodrome|housenumber/i;

/** Hide place-of-interest labels. Safe to call repeatedly (on every style load). */
export function hidePlaceLabels(map: MapLibreMap): string[] {
  const hidden: string[] = [];
  for (const layer of map.getStyle()?.layers ?? []) {
    const sourceLayer = "source-layer" in layer ? (layer["source-layer"] as string | undefined) : undefined;
    if ((sourceLayer && HIDDEN_SOURCE_LAYERS.has(sourceLayer)) || HIDDEN_ID_PATTERN.test(layer.id)) {
      if (map.getLayoutProperty(layer.id, "visibility") !== "none") {
        map.setLayoutProperty(layer.id, "visibility", "none");
      }
      hidden.push(layer.id);
    }
  }
  return hidden;
}

/** Keep the camera around Brooklyn. [west, south], [east, north]. */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-74.12, 40.53],
  [-73.78, 40.77],
];

export const MIN_ZOOM = 10.5;
/** Calls are placed at zip-code level, so we stop before streets look like exact addresses. */
export const MAX_ZOOM = 15.5;

export type LngLatBounds = [[number, number], [number, number]];

/** Bounding box around a set of points. */
export function boundsOf(points: { lat: number; lon: number }[]): LngLatBounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const p of points) {
    west = Math.min(west, p.lon);
    east = Math.max(east, p.lon);
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}
