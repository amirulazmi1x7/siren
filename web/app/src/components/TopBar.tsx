import type { NightName } from "../lib/contract";
import { usePlanner } from "../state/PlannerContext";
import css from "./TopBar.module.css";

/** "Typical Friday (2026-09-12)" -> "Typical Friday" */
const shortLabel = (label: string) => label.replace(/\s*\(.*$/, "");

export function TopBar() {
  const { data, state, dispatch } = usePlanner();
  return (
    <header className={css.bar}>
      <p className={css.title}>
        <b>Offload Planner</b>
        <span>
          Planning agent for {data.city.area}, {data.city.name}
        </span>
      </p>
      <nav className={css.nights} aria-label="Choose a night">
        {(Object.keys(data.nights) as NightName[]).map((name) => (
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
