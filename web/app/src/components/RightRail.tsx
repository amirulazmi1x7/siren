import { useMemo } from "react";
import { money } from "../lib/format";
import { budgetSteps, comparedOptions } from "../lib/recommend";
import { usePlanner } from "../state/PlannerContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { Badge } from "./Badge";
import css from "./RightRail.module.css";

/** Right column: what the map shows now, the budget, and the options the agent compared. */
export function RightRail() {
  const { state } = usePlanner();
  if (state.phase === "brief") return null;
  return (
    <div className={css.rail}>
      <LateCard />
      {state.phase === "decision" && <BudgetCard />}
      {state.phase === "decision" && <ComparedCard />}
    </div>
  );
}

const SCENARIO: Record<string, string> = {
  nothing: "No fix",
  rec: "With the agent's plan",
  yours: "Your plan",
  amb: "+2 ambulances",
  ai: "Agent's nurse plan",
};

function LateCard() {
  const { state, derived } = usePlanner();
  const { night } = derived;
  // The same moment with no fix, so the plan is always seen next to what it replaces.
  const baseLate = useMemo(() => new Set(night.baseline.late_ids), [night]);
  let noFixSoFar = 0;
  for (const c of night.calls) if (c.t <= state.t && baseLate.has(c.id)) noFixSoFar++;
  return (
    <article className={`glass ${css.card}`} data-view={state.view} aria-live="polite">
      <div className={css.lateRow}>
        <AnimatedNumber
          value={derived.lateSoFar}
          instant={state.playing}
          ms={350}
          className={`num ${css.late}`}
          testId="late-count"
        />
        <span className={css.lateLabel}>waited 10+ min</span>
        <Badge kind="sim" />
      </div>
      <span className={css.sub}>{SCENARIO[state.view]} · one rehearsal run</span>
      {state.view !== "nothing" && (
        <span className={css.sub}>
          No fix: <b className="num">{noFixSoFar}</b> by this time
        </span>
      )}
      {derived.result === null && <span className={css.sub}>No call-by-call replay for this option; map shows no fix.</span>}
    </article>
  );
}

function BudgetCard() {
  const { state, dispatch, derived } = usePlanner();
  const steps = budgetSteps(derived.night);
  if (steps.length === 0) return null;
  const index = Math.max(0, steps.filter((s) => s <= state.recBudget).length - 1);
  return (
    <article className={`glass ${css.card}`}>
      <div className={css.budgetHead}>
        <label htmlFor="rail-budget" className={css.budgetLabel}>
          Budget <span className={css.est}>(est.)</span>
        </label>
        <span className={`num ${css.budgetValue}`}>{money(steps[index]!)}</span>
      </div>
      <input
        id="rail-budget"
        className={css.range}
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={index}
        aria-valuetext={money(steps[index]!)}
        onChange={(e) => dispatch({ type: "setRecBudget", usd: steps[Number(e.target.value)] ?? steps[0]! })}
        data-testid="rail-budget"
      />
    </article>
  );
}

function ComparedCard() {
  const { state, derived } = usePlanner();
  const { night, pick } = derived;
  if (!pick) return null;
  // The pick first, then the alternatives by cost. "Do nothing" is the baseline, not an option to buy.
  const rows = comparedOptions(night, state.recBudget, pick)
    .filter((r) => r.option.id !== "nothing")
    .sort((a, b) => Number(b.chosen) - Number(a.chosen) || a.option.cost_usd - b.option.cost_usd);
  return (
    <article className={`glass ${css.card} ${css.compared}`} aria-labelledby="cmp-rail-h">
      <span id="cmp-rail-h" className={css.comparedHead}>
        Compared <Badge kind="sim" />
      </span>
      {rows.map(({ option: o, chosen, verdict }) => (
        <div
          key={o.id}
          className={`${css.row} ${chosen ? css.chosen : ""}`}
          style={{ opacity: o.cost_usd > state.recBudget ? 0.5 : 1 }}
          title={verdict}
          data-option={o.id}
          data-chosen={chosen}
        >
          <span className={css.name}>{o.label}</span>
          <span className={`num ${css.cost}`}>{money(o.cost_usd)}</span>
          <span className={`num ${css.hours}`}>{o.hours_back.toFixed(1)} h</span>
        </div>
      ))}
      <span className={css.foot}>Hours = ambulance-hours back on the road</span>
    </article>
  );
}
