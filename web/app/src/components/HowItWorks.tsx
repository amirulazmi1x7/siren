import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./HowItWorks.module.css";

/** Short on purpose: the drawer's own title already says "How it works". */
export function HowItWorks() {
  const { derived } = usePlanner();
  const { calls } = derived.night;
  return (
    <section className="card" aria-label="How it works">
      <ol className={css.steps}>
        <li>
          <b>Real 911 calls.</b> {calls.length} tonight, near 3 ERs. <Badge kind="real" />
        </li>
        <li>
          <b>Rehearsal.</b> Replays the night's ambulances and ER doors.
        </li>
        <li>
          <b>Agent.</b> Tests thousands of fixes, picks the one that frees the most ambulance-hours.
        </li>
        <li>
          <b>Why it matters.</b> In cardiac arrest, survival drops about 8% per minute of delay. Too few arrests here
          to count lives saved; across a city, the minutes add up.
        </li>
      </ol>
    </section>
  );
}

export function FixLibrary() {
  return (
    <section className="card" aria-labelledby="fix-h">
      <h2 id="fix-h">Fixes it can test</h2>
      <ul className={css.fixes}>
        <li className={css.on}>Offload nurses at the ER door</li>
        <li className={css.on}>Extra ambulances</li>
        <li>Rerouting to the least busy ER (next)</li>
        <li>Telehealth for minor calls (next)</li>
      </ul>
    </section>
  );
}
