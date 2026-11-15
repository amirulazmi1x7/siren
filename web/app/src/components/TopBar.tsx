import type { NightName } from "../lib/contract";
import { usePlanner } from "../state/PlannerContext";
import css from "./TopBar.module.css";

/** "Typical Friday (2026-09-12) - FAKE DATA" -> "Typical Friday" */
const shortLabel = (label: string) => label.replace(/\s*\(.*$/, "");

export function TopBar() {
  const { data, state, dispatch } = usePlanner();
  return (
    <header className={css.bar}>
      <div>
        <h1 className={css.title}>Offload Planner</h1>
        <p className={css.sub}>
          Find the cheapest way to get ambulances back on the road tonight · {data.city.area}, {data.city.name}
        </p>
      </div>
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
