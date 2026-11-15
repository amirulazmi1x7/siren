import { money } from "../lib/format";
import { comparedOptions } from "../lib/recommend";
import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./OptionsCard.module.css";

/** Proves the planner chose: every alternative, what it costs, what it frees, and why it lost. */
export function OptionsCard() {
  const { state, derived } = usePlanner();
  const { night, pick } = derived;
  if (!pick || !night.options) return null;

  const rows = comparedOptions(night, state.recBudget, pick);
  const maxHours = Math.max(1, ...rows.map((r) => r.option.hours_back));
  const nPlans = Object.keys(night.lookup).length;

  return (
    <section className="card" aria-labelledby="opt-h">
      <h2 id="opt-h">
        How it decided <Badge kind="sim" />
      </h2>
      <p className="muted small">
        Rehearsing this night on real 911 calls at these 3 ERs, it tested {nPlans.toLocaleString("en-US")} nurse schedules plus extra
        ambulances and mixes, then picked the option that frees the most ambulance-hours within {money(state.recBudget)}.
      </p>

      <div className={css.table} role="table" aria-label="Options compared">
        <div className={`${css.row} ${css.headRow}`} role="row">
          <span role="columnheader">Option</span>
          <span role="columnheader" className={css.right}>
            Cost
          </span>
          <span role="columnheader">Ambulance-hours back</span>
          <span role="columnheader" className={css.right}>
            Late
          </span>
        </div>
        {rows.map(({ option: o, chosen, verdict }) => (
          <div
            key={o.id}
            role="row"
            className={`${css.row} ${chosen ? css.chosen : ""}`}
            data-option={o.id}
            data-chosen={chosen}
          >
            <span role="cell" className={css.name}>
              <b>
                {chosen && <span aria-hidden="true">✓ </span>}
                {o.label}
              </b>
              <small className={chosen ? css.pickTag : css.verdict}>{verdict}</small>
            </span>
            <span role="cell" className={`num ${css.right}`}>
              {money(o.cost_usd)}
            </span>
            <span role="cell" className={css.barCell}>
              <span className={css.track} aria-hidden="true">
                <span
                  className={css.bar}
                  style={{ width: `${(Math.max(0, o.hours_back) / maxHours) * 100}%` }}
                />
              </span>
              <span className="num">{o.hours_back.toFixed(1)} h</span>
            </span>
            <span role="cell" className={`num ${css.right}`}>
              {o.late.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <p className={css.foot}>
        Hours back = fewer hours stuck at hospitals, plus 12 hours per extra ambulance. Late = urgent patients reached
        after 10 min. Averages over rehearsal runs. Costs are estimates.
      </p>
    </section>
  );
}
