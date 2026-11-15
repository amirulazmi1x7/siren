import { type Dispatch, useEffect } from "react";
import type { PlannerAction } from "../state/planner";

/** Longest frame we accept. A backgrounded tab can stall for seconds; don't jump the night. */
const MAX_FRAME_MS = 100;

/** While playing, advances replay time every animation frame. */
export function useReplay(playing: boolean, dispatch: Dispatch<PlannerAction>): void {
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      if (last !== null) dispatch({ type: "tick", dtMs: Math.min(MAX_FRAME_MS, now - last) });
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, dispatch]);
}
