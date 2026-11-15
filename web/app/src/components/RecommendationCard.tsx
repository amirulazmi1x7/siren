import { planKey } from "../lib/contract";
import { money, plural } from "../lib/format";
import { budgetSteps, costPerHour, optionById, optionResult, pickHeadline, shiftRuns } from "../lib/recommend";
import { blockRangeLabel } from "../lib/time";
import { usePlanner } from "../state/PlannerContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { Badge } from "./Badge";
import css from "./RecommendationCard.module.css";

/** The hero: the planner's pick for tonight at the chosen budget, in plain words. */
export function RecommendationCard() {
  const { state, dispatch, derived } = usePlanner();
  const { night, pick } = derived;
  const steps = budgetSteps(night);

  if (!pick || steps.length === 0) {
    return (
      <section className={`card ${css.card}`}>
        <h2>Tonight's recommendation</h2>
        <p className="muted">
          This data file has no planner output yet. Run <code>python -m sim.export</code> to add options and
          recommendations.
        </p>
      </section>
    );
  }

  const stepIndex = Math.max(0, steps.filter((s) => s <= state.recBudget).length - 1);
  const nothing = optionById(night, "nothing");
  const amb2 = optionById(night, "amb2");
  const perHour = costPerHour(pick);
  const amb2PerHour = amb2 ? costPerHour(amb2) : null;
  const ratio = perHour && amb2PerHour ? amb2PerHour / perHour : null;
  const runs = shiftRuns(pick.slots);
  const hasReplay = optionResult(night, pick) !== null;

  const sendSchedule = () => {
    const q = new URLSearchParams({ night: state.nightName, plan: planKey(pick.slots) });
    if (pick.extra_ambulances > 0) q.set("amb", String(pick.extra_ambulances));
    window.open(`${import.meta.env.BASE_URL}schedule.html?${q}`, "_blank", "noopener");
  };

  return (
    <section className={`card ${css.card}`} aria-labelledby="rec-h">
      <div className={css.head}>
        <h2 id="rec-h">
          Tonight's recommendation <Badge kind="sim" />
        </h2>
        <span className="muted">{night.label.replace(/\s*\(.*$/, "")}</span>
      </div>

      <label className={css.budget}>
        <span>
          Budget for tonight <b className="num">{money(state.recBudget)}</b> <span className="muted">(est. costs)</span>
        </span>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          step={1}
          value={stepIndex}
          onChange={(e) => dispatch({ type: "setRecBudget", usd: steps[Number(e.target.value)] ?? steps[0]! })}
          aria-valuetext={money(state.recBudget)}
          data-testid="rec-budget"
        />
        <span className={css.scale} aria-hidden="true">
          <span>{money(steps[0]!)}</span>
          <span>{money(steps[steps.length - 1]!)}</span>
        </span>
      </label>

      {/* Keyed by the pick so the body re-reveals when the recommendation changes. */}
      <div key={pick.id} className={css.body}>
        <p className={css.pick} data-testid="rec-pick">
          {pickHeadline(pick)}
        </p>
        <ul className={css.shifts}>
          {pick.extra_ambulances > 0 && (
            <li>
              <span className={css.amb} aria-hidden="true" />
              {plural(pick.extra_ambulances, "extra ambulance")} for the whole night
            </li>
          )}
          {runs.map((r) => (
            <li key={`${r.hospital}-${r.startBlock}`}>
              <span className={css.dot} aria-hidden="true" />
              <b>Hospital {r.hospital}</b> {blockRangeLabel(r.startBlock, r.endBlock)}
              {r.endBlock > r.startBlock && <span className="muted"> ({r.endBlock - r.startBlock + 1} shifts)</span>}
            </li>
          ))}
        </ul>

        <div className={css.numbers}>
          <div>
            <b className="num">
              <AnimatedNumber value={pick.hours_back} format={(n) => n.toFixed(1)} /> h
            </b>
            <span>ambulance-hours back on the road</span>
          </div>
          <div>
            <b className="num">
              <AnimatedNumber value={pick.late} format={(n) => n.toFixed(1)} />
            </b>
            <span>
              urgent patients reached late{nothing ? `, vs ${nothing.late.toFixed(1)} doing nothing` : ""}
            </span>
          </div>
          <div>
            <b className="num">
              <AnimatedNumber value={pick.cost_usd} format={money} />
            </b>
            <span>
              {perHour ? `${money(perHour)} per ambulance-hour freed` : "cost for the night"}
              {ratio && ratio >= 1.5 ? `, about ${Math.round(ratio)}× cheaper than +2 ambulances` : ""}
            </span>
          </div>
        </div>
        <p className={css.note}>
          Averages over simulated runs of this night.
          {!hasReplay && " The map can't replay this option call by call, so it shows doing nothing."}
        </p>
      </div>

      <div className={css.actions}>
        <button type="button" className="btn primary" onClick={sendSchedule}>
          Send schedule
        </button>
        {state.view !== "rec" && (
          <button type="button" className="btn" onClick={() => dispatch({ type: "setView", view: "rec" })}>
            Show on map
          </button>
        )}
      </div>
    </section>
  );
}
