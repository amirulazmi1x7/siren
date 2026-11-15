import { useState } from "react";
import type { HospitalId } from "../lib/contract";
import css from "./HospitalMarker.module.css";

/** Most ambulance bars we draw; past this the bubble's number carries it. */
const MAX_BARS = 8;
/** Pop-in stagger between hospitals, busiest first. */
const STAGGER_S = 0.15;

interface Props {
  id: HospitalId;
  /** Mean ambulances waiting at the door in the current block (SIM). */
  stuck: number;
  /** Mean minutes at the hospital in the current block (SIM). */
  waitMin: number;
  /** True for the hospital with the most ambulances waiting right now (red ring, navy outline). */
  busiest: boolean;
  /** 0 = busiest, used to stagger the bubbles' pop-in. */
  rank: number;
  /** Open the bubble to the left (a neighbor sits just to the right). */
  bubbleLeft?: boolean;
}

/**
 * Dark square with the letter, a pulsing ring, ambulance bars, and a glass "N ambulances at the door" bubble
 * (tap to toggle). N = crews at the ER still holding their patient (queued or mid-handover), averaged over the
 * current 2-hour block in one rehearsal run (SIM).
 */
export function HospitalMarker({ id, stuck, waitMin, busiest, rank, bubbleLeft = false }: Props) {
  const [open, setOpen] = useState(true);
  const n = Math.round(stuck);
  const tone = busiest && n > 0 ? "var(--late)" : "var(--warn)";
  const delay = `${rank * STAGGER_S}s`;
  return (
    <div
      className={css.marker}
      data-hospital={id}
      data-waiting={n}
      style={{ "--tone": tone, "--pop": delay } as React.CSSProperties}
    >
      {open && n > 0 && (
        <span
          className={`${css.bob} ${bubbleLeft ? css.toLeft : ""}`}
          style={{ animationDelay: `${rank * STAGGER_S + 0.8}s` }}
        >
          <span className={css.bubble} role="status">
            <span className={css.icon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 16V8a1 1 0 0 1 1-1h10v9" />
                <path d="M14 10h3.5l3.5 3.5V16h-7" />
                <circle cx="7.5" cy="17" r="1.8" />
                <circle cx="17" cy="17" r="1.8" />
                <path d="M8.5 9.5v4M6.5 11.5h4" />
              </svg>
            </span>
            <span className={`num ${css.count}`}>{n}</span>
            {/* Short on purpose: the icon says "ambulance", and nearby hospitals' bubbles must not overlap. */}
            <span className={css.waiting}>at the door</span>
            <span
              className={css.sim}
              title={`${n} ${n === 1 ? "ambulance" : "ambulances"} at the ER door, still holding a patient. Rehearsal result: average over this 2-hour block, one rehearsal run.`}
            >
              SIM
            </span>
          </span>
        </span>
      )}
      <span className={css.badgeWrap}>
        {n > 0 && <span className={css.ping} aria-hidden="true" />}
        <button
          type="button"
          className={css.badgeBtn}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`Hospital ${id}, about ${n} ambulance${n === 1 ? "" : "s"} at the door waiting to hand over a patient (rehearsal)`}
          title={`Hospital ${id}: about ${stuck} ambulances waiting at the door, ${waitMin} min at hospital (SIM)`}
        >
          <span className={`${css.badge} ${busiest && n > 0 ? css.busiest : ""}`}>{id}</span>
        </button>
      </span>
      <span className={css.bars} aria-hidden="true">
        {Array.from({ length: Math.min(n, MAX_BARS) }, (_, k) => (
          <span key={k} className={css.amb} />
        ))}
      </span>
    </div>
  );
}
