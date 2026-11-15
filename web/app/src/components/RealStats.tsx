import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./RealStats.module.css";

export function RealStats() {
  const { derived } = usePlanner();
  const { real } = derived.night;
  return (
    <section className="card" aria-labelledby="real-h">
      <h2 id="real-h">
        Real numbers for this night <Badge kind="real" />
      </h2>
      <div className={css.grid}>
        <div>
          <b className="num" data-testid="real-response">
            {real.median_response_min} min
          </b>
          <span>median response</span>
        </div>
        <div>
          <b className="num">{real.median_time_at_hospital_min} min</b>
          <span>median time at hospital</span>
        </div>
      </div>
    </section>
  );
}
