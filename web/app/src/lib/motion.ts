// Motion helpers. All animation in the app goes through these so reduced-motion is honored everywhere.

const QUERY = "(prefers-reduced-motion: reduce)";

/** True when the viewer asked the OS for less motion. Safe outside the browser (tests). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
}

/** Duration to use for an animation: 0 when reduced motion is on. */
export function motionMs(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

/** Ease-out cubic, 0..1 -> 0..1. */
export function easeOut(x: number): number {
  return 1 - (1 - x) ** 3;
}
