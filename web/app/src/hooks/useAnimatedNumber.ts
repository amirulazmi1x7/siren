import { useEffect, useRef, useState } from "react";
import { easeOut, motionMs } from "../lib/motion";

/**
 * Counts from the previous value to `target` over `ms` milliseconds.
 * Pass `instant` while values change every frame (replay), so the number never lags behind.
 * Always lands exactly on `target`.
 */
export function useAnimatedNumber(target: number, ms = 500, instant = false): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const duration = instant ? 0 : motionMs(ms);
    const start = from.current;
    if (duration === 0 || start === target) {
      from.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const v = start + (target - start) * easeOut(k);
      from.current = v;
      setValue(k >= 1 ? target : v);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Browsers pause animation frames in hidden windows; make sure we still land on the target.
    const done = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      from.current = target;
      setValue(target);
    }, duration + 50);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [target, ms, instant]);

  return value;
}
