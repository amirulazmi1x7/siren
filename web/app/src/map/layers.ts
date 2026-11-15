// deck.gl layers drawn on top of the street map.
import { DataFilterExtension, type DataFilterExtensionProps } from "@deck.gl/extensions";
import { IconLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Call } from "../lib/contract";
import { prefersReducedMotion } from "../lib/motion";

type RGB = [number, number, number];
const OK: RGB = [26, 106, 66]; // --ok
const LATE: RGB = [180, 35, 24]; // --late

/** How long (sim minutes) a new call keeps pulsing during replay. */
export const PULSE_MIN = 18;

// Late vs on-time differs by SHAPE and color (PRODUCT.md: never color alone).
// Full-color SVGs with a white outline so they read on any street background.
const svg = (body: string, size: number) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`,
  )}`;

const ICON_OK = {
  id: "ok",
  url: svg(`<circle cx="16" cy="16" r="11" fill="rgb(${OK})" stroke="white" stroke-width="4"/>`, 32),
  width: 32,
  height: 32,
  mask: false,
};
const ICON_LATE = {
  id: "late",
  url: svg(`<path d="M20 4 L36 33 L4 33 Z" fill="rgb(${LATE})" stroke="white" stroke-width="3.5" stroke-linejoin="round"/>`, 40),
  width: 40,
  height: 40,
  mask: false,
};

// One instance for the app's lifetime (deck.gl compares extensions by identity).
const timeFilter = new DataFilterExtension({ filterSize: 1 });

export interface CallLayerInput {
  calls: Call[];
  lateIds: ReadonlySet<number>;
  /** Replay time, minutes since 6 PM. Only calls at or before t are drawn. */
  t: number;
  playing: boolean;
  /** Changes whenever lateIds changes, so deck.gl knows to recompute icons. */
  resultKey: string;
}

/** Calls sorted so late ones draw on top. */
export function orderCalls(calls: Call[], lateIds: ReadonlySet<number>): Call[] {
  return [...calls].sort((a, b) => Number(lateIds.has(a.id)) - Number(lateIds.has(b.id)));
}

export function callLayers({ calls, lateIds, t, playing, resultKey }: CallLayerInput) {
  const isLate = (c: Call) => lateIds.has(c.id);

  const dots = new IconLayer<Call, DataFilterExtensionProps<Call>>({
    id: "calls",
    data: calls,
    getPosition: (c) => [c.lon, c.lat],
    getIcon: (c) => (isLate(c) ? ICON_LATE : ICON_OK),
    getSize: (c) => (isLate(c) ? 17 : 11),
    sizeUnits: "pixels",
    // Time filter runs on the GPU: moving the playhead only updates a uniform.
    extensions: [timeFilter],
    getFilterValue: (c) => c.t,
    filterRange: [0, t + 1e-6],
    updateTriggers: { getIcon: resultKey, getSize: resultKey },
    pickable: false,
  });

  // A short expanding ring when a call comes in during replay.
  const recent = playing && !prefersReducedMotion() ? calls.filter((c) => c.t <= t && c.t > t - PULSE_MIN) : [];
  const pulse = new ScatterplotLayer<Call>({
    id: "call-pulse",
    data: recent,
    getPosition: (c) => [c.lon, c.lat],
    radiusUnits: "pixels",
    getRadius: (c) => 7 + 22 * ((t - c.t) / PULSE_MIN),
    stroked: true,
    filled: false,
    lineWidthUnits: "pixels",
    getLineWidth: 2,
    getLineColor: (c) => [...(isLate(c) ? LATE : OK), Math.round(220 * (1 - (t - c.t) / PULSE_MIN))],
    updateTriggers: { getRadius: t, getLineColor: [t, resultKey] },
    pickable: false,
  });

  return [pulse, dots];
}
