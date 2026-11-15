import { CompareCard } from "./CompareCard";
import { PlanCard } from "./PlanCard";
import { WhyCard } from "./WhyCard";
import css from "./BeatPlanner.module.css";

/** The hands-on part: place your own nurses and compare with the agent. Shown inside its drawer. */
export function BeatPlanner() {
  return (
    <div className={css.body}>
      <PlanCard />
      <CompareCard />
      <WhyCard />
    </div>
  );
}
