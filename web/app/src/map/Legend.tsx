import css from "./Legend.module.css";

/** One key for the map and the timeline, shown in a row under the timeline (keeps the map clear). */
export function Legend() {
  return (
    <div className={css.legend}>
      <span>
        <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="11" fill="var(--ok)" stroke="#fff" strokeWidth="4" />
        </svg>
        Reached within 10 min
      </span>
      <span>
        <svg width="16" height="16" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 4 L36 33 L4 33 Z" fill="var(--late)" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
        Waited over 10 min (SIM)
      </span>
      <span>
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
          <rect x="1" y="1" width="15" height="10" rx="2" fill="var(--amb)" stroke="var(--amb-edge)" />
        </svg>
        Ambulance waiting at the ER door
      </span>
      <span>
        <i className={css.bar} aria-hidden="true" />
        Calls per 15 min (REAL)
      </span>
      <span className={css.note}>Call locations are approximate (zip code area)</span>
    </div>
  );
}
