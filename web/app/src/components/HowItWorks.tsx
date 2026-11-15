import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./HowItWorks.module.css";

export function HowItWorks() {
  const { derived } = usePlanner();
  const { real, calls } = derived.night;
  return (
    <section className="card" aria-labelledby="how-h">
      <h2 id="how-h">How it works</h2>
      <ol className={css.steps}>
        <li>
          <b>Real 911 data.</b> This night: {calls.length} calls near these 3 ERs, median response{" "}
          {real.median_response_min} min, median {real.median_time_at_hospital_min} min at the hospital{" "}
          <Badge kind="real" />
        </li>
        <li>
          <b>Simulation.</b> A replay of the area's ambulances and ER doors, built from real 911 calls and checked
          against real nights.
        </li>
        <li>
          <b>AI planner.</b> Tests thousands of fixes on the simulation and picks the one that frees the most
          ambulance-hours for the budget.
        </li>
        <li>
          <b>Why it matters.</b> Freed ambulances reach urgent patients sooner; the panel shows those minutes. For
          cardiac arrest, survival odds fall about 8% per minute of delay (Resuscitation Outcomes Consortium). In these
          3 ERs there are only 2 to 4 arrest calls on a Friday night, so the estimated lives saved is under 1 a year and
          too small to measure precisely. Across a whole city, every night, the minutes add up.
        </li>
      </ol>
    </section>
  );
}

export function FixLibrary() {
  return (
    <section className="card" aria-labelledby="fix-h">
      <h2 id="fix-h">Fixes the planner can test</h2>
      <ul className={css.fixes}>
        <li className={css.on}>Offload nurses at the ER door (modeled)</li>
        <li className={css.on}>Extra ambulances (modeled)</li>
        <li>Planned rerouting to the least busy ER, decided ahead of time (next)</li>
        <li>Treat-and-release or telehealth for minor calls (proposed)</li>
      </ul>
    </section>
  );
}
