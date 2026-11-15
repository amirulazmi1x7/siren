import { type KeyboardEvent, type PointerEvent, useMemo, useRef } from "react";
import { BLOCK_MIN, NIGHT_MIN, clockLabel } from "../lib/time";
import { usePlanner } from "../state/PlannerContext";
import css from "./Timeline.module.css";

/** Histogram bin width in minutes (48 bins over the night). */
const BIN_MIN = 15;
const N_BINS = NIGHT_MIN / BIN_MIN;
/** Arrow keys move 5 minutes; Page Up/Down move a whole block. */
const KEY_STEP = 5;

const pct = (t: number) => `${(t / NIGHT_MIN) * 100}%`;

export function Timeline() {
  const { data, state, dispatch, derived } = usePlanner();
  const track = useRef<HTMLDivElement>(null);
  const { night, lateIds } = derived;

  // Calls per 15-minute bin, and the late calls (drawn as markers below the bars).
  const bins = useMemo(() => {
    const counts = new Array<number>(N_BINS).fill(0);
    for (const c of night.calls) counts[Math.min(N_BINS - 1, Math.floor(c.t / BIN_MIN))]!++;
    return counts;
  }, [night]);
  const maxBin = Math.max(1, ...bins);
  const lateTimes = useMemo(() => night.calls.filter((c) => lateIds.has(c.id)).map((c) => c.t), [night, lateIds]);

  const timeAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width === 0) return state.t;
    return Math.round(((clientX - r.left) / r.width) * NIGHT_MIN);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dispatch({ type: "setTime", t: timeAt(e.clientX) });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) dispatch({ type: "setTime", t: timeAt(e.clientX) });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowLeft: -KEY_STEP,
      ArrowRight: KEY_STEP,
      PageDown: -BLOCK_MIN,
      PageUp: BLOCK_MIN,
    };
    if (e.key === "Home") dispatch({ type: "setTime", t: 0 });
    else if (e.key === "End") dispatch({ type: "setTime", t: NIGHT_MIN });
    else if (e.key === " " || e.key === "Enter") dispatch({ type: "togglePlay" });
    else if (e.key in step) dispatch({ type: "setTime", t: state.t + (step[e.key] ?? 0) });
    else return;
    e.preventDefault();
  };

  return (
    <div className={css.wrap}>
      <button
        type="button"
        className={`btn primary ${css.play}`}
        onClick={() => dispatch({ type: "togglePlay" })}
        aria-label={state.playing ? "Pause replay" : "Play the night"}
      >
        {state.playing ? "❚❚ Pause" : "▶ Play night"}
      </button>

      <div className={css.body}>
        <div
          ref={track}
          className={css.track}
          role="slider"
          tabIndex={0}
          aria-label="Time of night"
          aria-valuemin={0}
          aria-valuemax={NIGHT_MIN}
          aria-valuenow={Math.round(state.t)}
          aria-valuetext={clockLabel(state.t)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
          data-testid="timeline"
        >
          {/* Calls per 15 minutes; bins after the playhead are dimmed. */}
          <div className={css.bars} aria-hidden="true">
            {bins.map((n, i) => (
              <span
                key={i}
                className={`${css.bar} ${(i + 1) * BIN_MIN <= state.t ? css.played : ""}`}
                style={{ height: `${(n / maxBin) * 100}%` }}
              />
            ))}
          </div>
          {/* Late calls: small triangles (shape, not just color). */}
          <div className={css.ticks} aria-hidden="true">
            {lateTimes.map((t, i) => (
              <span key={i} className={`${css.tick} ${t <= state.t ? css.tickOn : ""}`} style={{ left: pct(t) }} />
            ))}
          </div>
          {/* Block dividers + labels. */}
          <div className={css.blocks} aria-hidden="true">
            {data.blocks.map((b) => (
              <span key={b} className={css.block}>
                {b}
              </span>
            ))}
          </div>
          <div className={css.head} style={{ left: pct(state.t) }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
