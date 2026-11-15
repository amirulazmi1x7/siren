import { useMemo } from "react";
import { clockLabel } from "../lib/time";
import { usePlanner } from "../state/PlannerContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { Badge } from "./Badge";
import css from "./MapHud.module.css";

/** What the map is showing right now: which scenario, the clock, and how many waited too long so far. */
export function MapHud() {
  const { state, derived } = usePlanner();
  const { night } = derived;
  // The same moment with no fix, so the plan is always seen next to what it replaces.
  const baseLate = useMemo(() => new Set(night.baseline.late_ids), [night]);
  let noFixSoFar = 0;
  for (const c of night.calls) if (c.t <= state.t && baseLate.has(c.id)) noFixSoFar++;
  const scenario =
    state.view === "nothing"
      ? "No fix"
      : state.view === "rec"
        ? "With the agent's plan"
        : state.view === "yours"
          ? "Your plan"
          : state.view === "amb"
            ? "+2 ambulances"
            : "AI plan";
  return (
    <div className={css.hud} data-view={state.view} aria-live="polite">
      <p className={css.scenario}>
        {scenario} <Badge kind="sim" />
      </p>
      <p className={css.clock} data-testid="clock">
        <span className="num">{clockLabel(state.t)}</span>
      </p>
      <p className={css.headline}>
        <AnimatedNumber
          value={derived.lateSoFar}
          instant={state.playing}
          ms={350}
          className={`num ${css.count}`}
          testId="late-count"
        />{" "}
        {derived.lateSoFar === 1 ? "person" : "people"} waited over 10 min
      </p>
      {state.view !== "nothing" && (
        <p className={css.vs}>
          With no fix: <b className="num">{noFixSoFar}</b> by this time
        </p>
      )}
      {derived.result === null && <p className={css.note}>No call-by-call replay for this option; showing no fix.</p>}
    </div>
  );
}
