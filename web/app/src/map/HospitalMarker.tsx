import type { HospitalId } from "../lib/contract";
import css from "./HospitalMarker.module.css";

/** Most ambulance blocks we draw; past this the "N waiting" number carries it. */
const MAX_BLOCKS = 12;

interface Props {
  id: HospitalId;
  /** Mean ambulances waiting at the door in the current block (SIM). */
  stuck: number;
  /** Mean minutes at the hospital in the current block (SIM). */
  waitMin: number;
  onSelect?: () => void;
}

export function HospitalMarker({ id, stuck, waitMin, onSelect }: Props) {
  const n = Math.round(stuck);
  const shown = Math.min(n, MAX_BLOCKS);
  return (
    <button
      type="button"
      className={css.marker}
      onClick={onSelect}
      title={`Hospital ${id}: about ${stuck} ambulances waiting at the door, ${waitMin} min at hospital (SIM)`}
      aria-label={`Hospital ${id}, ${n} ambulances waiting`}
      data-hospital={id}
      data-waiting={n}
    >
      <span className={css.badge}>{id}</span>
      <span className={css.queue} aria-hidden="true">
        {Array.from({ length: shown }, (_, k) => (
          <span key={k} className={css.amb} />
        ))}
      </span>
      {n > 0 && <span className={css.count}>{n} waiting</span>}
    </button>
  );
}
