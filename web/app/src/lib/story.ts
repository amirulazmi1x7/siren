// The "one person" story: a real urgent call the recommended plan helps.
// The call's time, type and area are REAL; its before/after minutes are rehearsal results (SIM).
import type { Call, Night, PlanOption, StoryCall } from "./contract";
import { optionById } from "./recommend";

/** NYC EMS initial severity codes, in plain words. */
const SEVERITY: Record<number, string> = {
  1: "a life-threatening call (cardiac arrest, choking or unconscious)",
  2: "a heart, breathing or stroke emergency",
  3: "a serious emergency (cardiac, major injury or altered mental state)",
};

export function severityLabel(code: number): string {
  return SEVERITY[code] ?? "an urgent call";
}

/** More people reached within 10 minutes than doing nothing (mean over rehearsal runs), rounded. */
export function fewerLate(night: Night, pick: PlanOption): number | null {
  const nothing = optionById(night, "nothing");
  return nothing ? Math.max(0, Math.round(nothing.late - pick.late)) : null;
}

export interface Story {
  highlight: StoryCall;
  /** The real call it refers to (for the map pin). Undefined if the id isn't in this night's calls. */
  call: Call | undefined;
}

export function storyFor(night: Night, pick: PlanOption | null): Story | null {
  const h = pick?.highlight;
  if (!h) return null;
  return { highlight: h, call: night.calls.find((c) => c.id === h.id) };
}
