import { viewNameInline } from "../lib/plan";
import { clockLabel } from "../lib/time";
import { usePlanner } from "../state/PlannerContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { Badge } from "./Badge";
import css from "./MapHud.module.css";

/** Headline + clock over the map, sized to read from the back of the room. */
export function MapHud() {
  const { state, derived } = usePlanner();
  return (
    <div className={css.hud} aria-live="polite">
      <div className={css.headline}>
        <AnimatedNumber
          value={derived.lateSoFar}
          instant={state.playing}
          ms={350}
          className={`num ${css.count}`}
          testId="late-count"
        />
        <span>
          {derived.lateSoFar === 1 ? "person" : "people"} waited over 10 min <Badge kind="sim" />
        </span>
      </div>
      <div className={css.meta}>
        <span className={`num ${css.clock}`} data-testid="clock">
          {clockLabel(state.t)}
        </span>
        <span className="muted">
          Showing {viewNameInline(state.view)} · one simulated run
          {derived.result === null && " · no replay for this option, map shows doing nothing"}
        </span>
      </div>
    </div>
  );
}
