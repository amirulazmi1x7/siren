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
          <b>Digital twin.</b> A simulation of the area's ambulances and ER doors, checked against real nights.
        </li>
        <li>
          <b>AI planner.</b> Tests thousands of fixes on the twin and picks the one that frees the most
          ambulance-hours for the budget.
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
        <li>Treat-and-release or telehealth for minor calls (next)</li>
        <li>Hospital fast-track handover desk (next)</li>
      </ul>
    </section>
  );
}
