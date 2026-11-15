import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./ProblemStrip.module.css";

/** The problem in three measured numbers. Area-wide, so it doesn't change with the night. */
export function ProblemStrip() {
  const { data, derived } = usePlanner();
  const a = data.area_real;
  const atHospital = a?.median_time_at_hospital_min ?? derived.night.real.median_time_at_hospital_min;
  return (
    <section className={css.strip} aria-label="The problem">
      <div className={css.tile}>
        <b className="num">{atHospital} min</b>
        <span>
          median time an ambulance spends at the hospital per patient (arrival to back in service){" "}
          <Badge kind="real" />
        </span>
      </div>
      {a && (
        <div className={css.tile}>
          <b className="num">~{Math.round(a.ambulance_hours_per_friday)} h</b>
          <span>
            ambulance-hours spent at these 3 hospitals on a Friday night, off the road <Badge kind="real" />
          </span>
        </div>
      )}
      {a && (
        <div className={css.tile}>
          <b className="num">{a.benchmark_offload_min} min</b>
          <span>widely used handover benchmark (a convention; there is no federal standard)</span>
        </div>
      )}
    </section>
  );
}
