import type { NightName } from "../lib/contract";
import { usePlanner } from "../state/PlannerContext";
import css from "./TopBar.module.css";

/** "Typical Friday (2026-09-12)" -> "Typical", "Holiday weekend Friday (…)" -> "Holiday weekend". */
const shortLabel = (label: string) => label.replace(/\s*\(.*$/, "").replace(/\s+Friday$/, "");

/** Title, location, and the scenario toggle with a sliding "water drop" behind the active night. */
export function TopBar() {
  const { data, state, dispatch } = usePlanner();
  const names = Object.keys(data.nights) as NightName[];
  const active = Math.max(0, names.indexOf(state.nightName));
  return (
    <header className={css.bar}>
      <h1 className={css.title}>AmbuReady</h1>
      <p className={css.where}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {data.city.area}, {data.city.name} · Fri 6 PM to Sat 6 AM
      </p>
      <nav
        className={`glass ${css.toggle}`}
        aria-label="Choose a night"
        style={{ gridTemplateColumns: `repeat(${names.length}, var(--seg))` }}
      >
        <span className={css.drop} style={{ transform: `translateX(calc(${active} * var(--seg)))` }} aria-hidden="true" />
        {names.map((name) => (
          <button
            key={name}
            type="button"
            className={css.night}
            aria-pressed={name === state.nightName}
            onClick={() => dispatch({ type: "setNight", name })}
          >
            {shortLabel(data.nights[name]?.label ?? name)}
          </button>
        ))}
      </nav>
    </header>
  );
}
