import { CompareCard } from "./CompareCard";
import { PlanCard } from "./PlanCard";
import { WhyCard } from "./WhyCard";
import css from "./BeatPlanner.module.css";

/** The hands-on part: place your own nurses and compare with the planner. Closed by default. */
export function BeatPlanner() {
  return (
    <details className={css.wrap}>
      <summary className={css.summary}>
        <span>
          <b>Think you can do better?</b> Try to beat the planner
        </span>
        <span className={css.chev} aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className={css.body}>
        <PlanCard />
        <CompareCard />
        <WhyCard />
      </div>
    </details>
  );
}
