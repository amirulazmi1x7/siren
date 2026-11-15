import { HOSPITAL_IDS, N_BLOCKS, type Slot, planKey } from "../lib/contract";
import { percent, plural } from "../lib/format";
import { MAX_BUDGET, MIN_BUDGET, slotsForView } from "../lib/plan";
import { focusHospital } from "../map/mapControl";
import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./PlanCard.module.css";

export function PlanCard() {
  const { data, state, dispatch, derived } = usePlanner();
  const { night, bestValue: bv, shownSlots } = derived;
  const base = night.baseline;
  const maxStuck = Math.max(1, ...base.stuck.flat());

  const sendSchedule = () => {
    // The sheet shows the plan on screen: the agent's nurse plan when shown, otherwise yours.
    const slots = slotsForView(night, state.view === "ai" ? "ai" : "yours", state.slots, state.budget);
    const q = new URLSearchParams({ night: state.nightName, plan: planKey(slots) });
    window.open(`${import.meta.env.BASE_URL}schedule.html?${q}`, "_blank", "noopener");
  };

  return (
    <section className="card" aria-labelledby="plan-h">
      <div className={css.head}>
        <h2 id="plan-h">Place offload nurses</h2>
        <div className={css.budget} role="group" aria-label="Budget in nurse shifts">
          <span className="muted">Budget</span>
          <button
            type="button"
            className="btn icon"
            aria-label="Lower budget"
            disabled={state.budget <= MIN_BUDGET}
            onClick={() => dispatch({ type: "setBudget", budget: state.budget - 1 })}
          >
            −
          </button>
          <b className={`num ${css.budgetNum}`} data-testid="budget">
            {state.budget}
          </b>
          <button
            type="button"
            className="btn icon"
            aria-label="Raise budget"
            disabled={state.budget >= MAX_BUDGET}
            onClick={() => dispatch({ type: "setBudget", budget: state.budget + 1 })}
          >
            +
          </button>
        </div>
      </div>
      <p className="muted small">Tap a slot to add one offload nurse for that 2-hour block.</p>
      <p className={`small ${css.best}`} data-testid="best-value">
        {bv.gain > 0
          ? `Best value: ${plural(bv.k, "shift")} reach ${bv.gain} more people in time, ${percent(bv.share)} of what 6 shifts would.`
          : "Extra nurses don't change late calls on this night."}{" "}
        <Badge kind="sim" />
      </p>

      <div className={css.grid} role="grid" aria-label="Nurse slots by hospital and time block">
        <div />
        {data.blocks.map((b) => (
          <div key={b} className={css.colLab}>
            {b}
          </div>
        ))}
        {HOSPITAL_IDS.map((h, i) => (
          <Row key={h}>
            <button
              type="button"
              className={css.rowLab}
              title={`Show Hospital ${h} on the map`}
              aria-label={`Show Hospital ${h} on the map`}
              onClick={() => focusHospital(h)}
            >
              {h}
            </button>
            {Array.from({ length: N_BLOCKS }, (_, b) => {
              const slot = `${h}-${b}` as Slot;
              const on = shownSlots.has(slot);
              // Slots placed by the agent (its pick or its nurse plan) are labelled "Agent", yours "+1".
              const isAi = on && (state.view === "ai" || state.view === "rec");
              const stuck = base.stuck[i]?.[b] ?? 0;
              const heat = stuck / maxStuck;
              return (
                <button
                  key={slot}
                  type="button"
                  data-slot={slot}
                  aria-pressed={on}
                  className={`${css.slot} ${on ? (isAi ? css.ai : css.on) : ""}`}
                  title={`Hospital ${h}, ${data.blocks[b]}: ${stuck} ambulances stuck if you do nothing (SIM)`}
                  onClick={() => dispatch({ type: "toggleSlot", slot })}
                >
                  {on ? (isAi ? "Agent" : "+1") : ""}
                  <span
                    className={css.heat}
                    style={{ width: `calc((100% - 6px) * ${heat.toFixed(2)})`, opacity: 0.2 + 0.8 * heat }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </Row>
        ))}
      </div>
      <p className={`muted ${css.heatNote}`}>Orange bar: ambulances stuck at the door if you do nothing.</p>

      {state.msg && (
        <div className={css.msg} role="status">
          {state.msg}
        </div>
      )}

      <div className={css.actions}>
        <button
          type="button"
          className={`btn ${state.view === "ai" ? "active" : ""}`}
          aria-pressed={state.view === "ai"}
          onClick={() => dispatch({ type: "toggleAi" })}
        >
          Show agent's plan
        </button>
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: "clear" })}>
          Clear
        </button>
        <button type="button" className={`btn primary ${css.push}`} onClick={sendSchedule}>
          Send schedule
        </button>
      </div>
    </section>
  );
}

/** Grid rows are flattened into the CSS grid; this just groups children for readability. */
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
