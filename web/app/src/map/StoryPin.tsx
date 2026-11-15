import type { StoryCall } from "../lib/contract";
import { clockLabel } from "../lib/time";
import css from "./StoryPin.module.css";

/** Ring on the decision's story call, with a short label. Before/after minutes are rehearsal results. */
/** flip: put the label on the left (when the call sits near the right edge, under the right rail). */
export function StoryPin({ highlight, flip = false }: { highlight: StoryCall; flip?: boolean }) {
  return (
    <div className={css.pin} data-testid="story-pin" role="img" aria-label="The call in the story">
      <span className={css.ring} aria-hidden="true" />
      <span className={`${css.label} ${flip ? css.flip : ""}`}>
        {clockLabel(highlight.t)} · <span className={css.before}>{highlight.before_min}</span> →{" "}
        <span className={css.after}>{highlight.after_min} min</span> <span className={css.sim}>SIM</span>
      </span>
    </div>
  );
}
