// Lets components outside the map (e.g. the plan grid) move the camera.
// MapView registers its handler on mount; calls before that are ignored.
import type { HospitalId } from "../lib/contract";

type FocusFn = (id: HospitalId) => void;
let focusHandler: FocusFn | null = null;

export function registerFocusHandler(fn: FocusFn | null): void {
  focusHandler = fn;
}

/** Ease the map to a hospital. No-op if the map isn't ready. */
export function focusHospital(id: HospitalId): void {
  focusHandler?.(id);
}
