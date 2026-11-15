import { useEffect, useState } from "react";
import { planKey } from "../lib/contract";
import { money } from "../lib/format";
import { mostJammedHospital } from "../lib/plan";
import { budgetSteps, optionById, pickHeadline, shiftRuns } from "../lib/recommend";
import { fewerLate as fewerLateOf, severityLabel, storyFor } from "../lib/story";
import { blockLabel, blockRangeLabel, clockLabel } from "../lib/time";
import { prefersReducedMotion } from "../lib/motion";
import { usePlanner } from "../state/PlannerContext";
import { AgentChat } from "./AgentChat";
import { AnimatedNumber } from "./AnimatedNumber";
import { BeatPlanner } from "./BeatPlanner";
import { Badge } from "./Badge";
import { Footer } from "./Footer";
import { FixLibrary, HowItWorks } from "./HowItWorks";
import { OptionsCard } from "./OptionsCard";
import css from "./AgentPanel.module.css";

/** "Typical Friday (2026-08-21)" -> "Friday, August 21, 2026" */
function nightDate(label: string): string {
  const m = label.match(/\((\d{4})-(\d{2})-(\d{2})\)/);
  if (!m) return label;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** The agent: brief (problem and goal), working (its steps), decision (the plan and why). */
export function AgentPanel() {
  const { state } = usePlanner();
  return (
    <section className={`glass ${css.panel}`} aria-label="Planning agent" aria-live="polite">
      {state.phase === "brief" && <Brief />}
      {state.phase === "working" && <Working />}
      {state.phase === "decision" && <Decision />}
    </section>
  );
}

function BudgetSelect() {
  const { state, dispatch, derived } = usePlanner();
  const steps = budgetSteps(derived.night);
  if (steps.length === 0) return null;
  const current = [...steps].reverse().find((s) => s <= state.recBudget) ?? steps[0]!;
  return (
    <select
      className={css.select}
      value={current}
      onChange={(e) => dispatch({ type: "setRecBudget", usd: Number(e.target.value) })}
      aria-label="Budget for tonight"
    >
      {steps.map((s) => (
        <option key={s} value={s}>
          {money(s)}
        </option>
      ))}
    </select>
  );
}

function Brief() {
  const { dispatch, derived, data } = usePlanner();
  const { night } = derived;
  const r = night.real;
  const hours = r.hours_at_hospital ?? data.area_real?.ambulance_hours_per_friday;
  return (
    <div className={css.brief}>
      {r.urgent_late !== undefined && r.urgent_calls ? (
        <h1 className={css.statement}>
          <span className={css.hit}>{r.urgent_late}</span> of {r.urgent_calls} urgent patients waited over 10 minutes
          for an ambulance. <Badge kind="real" />
        </h1>
      ) : (
        <h1 className={css.statement}>
          Ambulances spent a median of <span className={css.hit}>{r.median_time_at_hospital_min} min</span> at the
          hospital per patient. <Badge kind="real" />
        </h1>
      )}
      {hours !== undefined && (
        <p className={css.second}>
          Crews spent <b className="num">{Math.round(hours)} hours</b> parked at three ERs that night, off the road.{" "}
          <Badge kind="real" />
        </p>
      )}

      <div className={css.goal}>
        <span className={css.goalText}>Get ambulances back on the road with</span>
        <BudgetSelect />
      </div>
      <button type="button" className={`btn primary ${css.go}`} onClick={() => dispatch({ type: "plan" })}>
        Plan this night
      </button>
      <p className={css.fine}>
        The agent rehearses this night on a replay of real 911 calls and tests thousands of fixes before it
        recommends one.
      </p>
    </div>
  );
}

const STEP_MS = 750;

function Working() {
  const { state, dispatch, derived } = usePlanner();
  const { night } = derived;
  const jam = mostJammedHospital(night);
  const row = night.baseline.stuck[jam.index] ?? [];
  const worst = row.indexOf(Math.max(...row));
  const nPlans = Object.keys(night.lookup).length;
  const nOptions = night.options?.length ?? 0;
  const steps = [
    `Reading ${night.calls.length} real 911 calls from this night`,
    `Bottleneck found: Hospital ${jam.id}, ${blockLabel(Math.max(0, worst))}`,
    `Rehearsing ${nPlans.toLocaleString("en-US")} nurse schedules, extra ambulances and mixes`,
    nOptions ? `Ranking ${nOptions} fixes for ${money(state.recBudget)}` : "Ranking the fixes",
  ];

  const [shown, setShown] = useState(prefersReducedMotion() ? steps.length : 1);
  useEffect(() => {
    if (shown < steps.length) {
      const id = window.setTimeout(() => setShown((n) => n + 1), STEP_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => dispatch({ type: "decide" }), prefersReducedMotion() ? 0 : STEP_MS);
    return () => window.clearTimeout(id);
  }, [shown, steps.length, dispatch]);

  return (
    <div className={css.working}>
      <p className={css.when}>Planning {nightDate(night.label)}</p>
      <ol className={css.steps}>
        {steps.slice(0, shown).map((s, i) => (
          <li key={s} className={i < shown - 1 || shown === steps.length ? css.done : css.active}>
            {s}
          </li>
        ))}
      </ol>
      <p className={css.fine}>Meanwhile the map replays the night with no fix.</p>
    </div>
  );
}

function Decision() {
  const { state, dispatch, derived } = usePlanner();
  const { night, pick } = derived;

  if (!pick) {
    return (
      <div className={css.decision}>
        <h2 className={css.pick}>No planner output in this data file</h2>
        <p className={css.fine}>
          Run <code>python -m sim.export</code> to add options and recommendations.
        </p>
      </div>
    );
  }

  const fewer = fewerLateOf(night, pick);
  const story = storyFor(night, pick);
  const runs = shiftRuns(pick.slots);
  const amb1 = optionById(night, "amb1");

  const sendSchedule = () => {
    const q = new URLSearchParams({ night: state.nightName, plan: planKey(pick.slots) });
    if (pick.extra_ambulances > 0) q.set("amb", String(pick.extra_ambulances));
    window.open(`${import.meta.env.BASE_URL}schedule.html?${q}`, "_blank", "noopener");
  };

  return (
    <div className={css.decision}>
      <p className={css.when}>
        Recommendation for {money(state.recBudget)} <Badge kind="sim" />
      </p>
      <h2 className={css.pick}>{pickHeadline(pick)}</h2>
      <ul className={css.shifts}>
        {pick.extra_ambulances > 0 && (
          <li className={`tile ${css.shiftRow}`}>
            <span className={`${css.letter} ${css.ambLetter}`} aria-hidden="true">+</span>
            <span className={css.shiftTime}>Extra ambulance, whole night</span>
            <span className={css.shiftCount}>×{pick.extra_ambulances}</span>
          </li>
        )}
        {runs.map((r) => (
          <li key={`${r.hospital}-${r.startBlock}`} className={`tile ${css.shiftRow}`}>
            <span className={css.letter} aria-label={`Hospital ${r.hospital}`}>
              {r.hospital}
            </span>
            <span className={css.shiftTime}>{blockRangeLabel(r.startBlock, r.endBlock)}</span>
            <span className={css.shiftCount} title="offload nurse shifts">
              ×{r.endBlock - r.startBlock + 1}
            </span>
          </li>
        ))}
      </ul>

      {/* The one-person card: the emotional beat. People count is a rehearsal average; the story call is real. */}
      {fewer !== null && fewer >= 1 && (
        <div className={`tile ${css.story}`} data-testid="story">
          <p className={css.human}>
            <b className="num">
              <AnimatedNumber value={fewer} />
            </b>{" "}
            more {fewer === 1 ? "person" : "people"} reached in time tonight. <Badge kind="sim" />
          </p>
          <p className={css.storyNote}>
            Urgent calls: heart, breathing and stroke emergencies, and other life-threatening calls.
          </p>
          {story && (
            <p className={css.storyCall} data-testid="story-call">
              <b>One of them:</b> {clockLabel(story.highlight.t)}, {severityLabel(story.highlight.severity)} near
              Hospital {story.highlight.hosp}. No fix: the ambulance arrives in{" "}
              <b className={`num ${css.before}`}>{story.highlight.before_min} min</b>. With the plan:{" "}
              <b className={`num ${css.after}`}>{story.highlight.after_min} min</b>. <Badge kind="sim" />
            </p>
          )}
          <p className={css.storyNote}>In cardiac arrest, every minute without help lowers the chance of survival by about 8%.</p>
        </div>
      )}
      <p className={css.result}>
        <b className="num">
          <AnimatedNumber value={pick.hours_back} format={(n) => n.toFixed(0)} /> ambulance-hours
        </b>{" "}
        back on the road for {money(pick.cost_usd)} (est.).
      </p>
      {amb1 && pick.extra_ambulances === 0 && (
        <p className={css.why}>
          An extra ambulance would cost {money(amb1.cost_usd)} and give back {amb1.hours_back.toFixed(0)} hours.
        </p>
      )}

      <div className={css.actions}>
        <button type="button" className="btn primary" onClick={sendSchedule}>
          Approve and send schedule
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: "rebrief" })}>
          Change budget
        </button>
      </div>

      <div className={css.more}>
        <details className={css.drawer} open>
          <summary>Ask the agent a what-if</summary>
          <div className={css.drawerBody}>
            <AgentChat />
          </div>
        </details>
        <details className={css.drawer}>
          <summary>Why this plan?</summary>
          <div className={css.drawerBody}>
            <OptionsCard />
          </div>
        </details>
        <details className={css.drawer}>
          <summary>Try to beat the agent</summary>
          <div className={css.drawerBody}>
            <BeatPlanner />
          </div>
        </details>
        <details className={css.drawer}>
          <summary>How it works</summary>
          <div className={css.drawerBody}>
            <HowItWorks />
            <FixLibrary />
            <Footer />
          </div>
        </details>
      </div>
    </div>
  );
}
