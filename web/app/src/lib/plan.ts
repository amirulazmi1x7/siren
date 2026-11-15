// Planner logic on top of the contract: which result a view shows, costs, best value.
import {
  HOSPITAL_IDS,
  MAX_LOOKUP_SHIFTS,
  type AiBudget,
  type HospitalId,
  type Night,
  type PlanResult,
  type Scenarios,
  type Slot,
  resultFor,
} from "./contract";

export const MIN_BUDGET = 1;
export const MAX_BUDGET = 6;
/** Best value = fewest shifts reaching at least this share of the 6-shift AI plan's benefit. */
export const BEST_VALUE_SHARE = 0.8;

export type View = "nothing" | "amb" | "yours" | "ai";
export const VIEWS: View[] = ["nothing", "amb", "yours", "ai"];

export const VIEW_META: Record<View, { name: string; color: string }> = {
  nothing: { name: "Do nothing", color: "var(--muted)" },
  amb: { name: "+2 ambulances", color: "var(--amb)" },
  yours: { name: "Your plan", color: "var(--accent)" },
  ai: { name: "AI plan", color: "var(--ai)" },
};

/** "your plan", "AI plan": view name for use mid-sentence. */
export function viewNameInline(v: View): string {
  return VIEW_META[v].name.toLowerCase().replace(/^ai /, "AI ");
}

export function clampBudget(b: number): number {
  return Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, Math.round(b)));
}

export function aiPlan(night: Night, budget: number) {
  return night.ai_plans[String(clampBudget(budget)) as AiBudget];
}

/** Slots that a view places (empty for views without nurses). */
export function slotsForView(night: Night, view: View, yourSlots: Slot[], budget: number): Slot[] {
  if (view === "ai") return aiPlan(night, budget).slots;
  if (view === "yours") return yourSlots;
  return [];
}

/** Result shown for a view. Null only for "yours" when the plan was not precomputed. */
export function resultForView(night: Night, view: View, yourSlots: Slot[], budget: number): PlanResult | null {
  switch (view) {
    case "nothing":
      return night.baseline;
    case "amb":
      return night.ambulances_plus2;
    case "ai":
      return aiPlan(night, budget);
    case "yours":
      return resultFor(night, yourSlots);
  }
}

export function costOf(costs: Scenarios["costs"], view: View, nYourSlots: number, budget: number): number {
  switch (view) {
    case "nothing":
      return 0;
    case "amb":
      return costs.ambulance_night_usd;
    case "ai":
      return clampBudget(budget) * costs.nurse_shift_usd;
    case "yours":
      return nYourSlots * costs.nurse_shift_usd;
  }
}

/** People reached within 10 minutes who would have been late doing nothing. */
export function extraReached(night: Night, result: PlanResult): number {
  return night.baseline.late_ids.length - result.late_ids.length;
}

export interface BestValue {
  /** Recommended number of shifts (1 to 4). */
  k: number;
  /** Extra people reached in time with k shifts. */
  gain: number;
  /** gain as a share of what 6 shifts would reach (0 to 1). */
  share: number;
}

export function bestValue(night: Night): BestValue {
  const gain = (k: number) => extraReached(night, aiPlan(night, k));
  const maxGain = gain(MAX_BUDGET);
  if (maxGain <= 0) return { k: 1, gain: 0, share: 0 };
  for (let k = 1; k <= MAX_LOOKUP_SHIFTS; k++) {
    if (gain(k) >= BEST_VALUE_SHARE * maxGain) return { k, gain: gain(k), share: gain(k) / maxGain };
  }
  const k = MAX_LOOKUP_SHIFTS;
  return { k, gain: gain(k), share: gain(k) / maxGain };
}

/** Hospital with the most ambulances stuck at its door over the night, doing nothing. */
export function mostJammedHospital(night: Night): { index: number; id: HospitalId } {
  const sums = night.baseline.stuck.map((row) => row.reduce((a, b) => a + b, 0));
  const index = sums.indexOf(Math.max(...sums));
  return { index, id: HOSPITAL_IDS[index] ?? "A" };
}

export type ToggleOutcome =
  | { ok: true; slots: Slot[] }
  | { ok: false; slots: Slot[]; message: string };

/** Add or remove a slot, enforcing the 4-shift lookup limit and the budget. Keeps placement order. */
export function toggleSlot(slots: Slot[], slot: Slot, budget: number): ToggleOutcome {
  if (slots.includes(slot)) return { ok: true, slots: slots.filter((s) => s !== slot) };
  if (slots.length >= MAX_LOOKUP_SHIFTS) {
    return { ok: false, slots, message: "We precomputed plans up to 4 shifts. Remove one or press Show AI plan." };
  }
  if (slots.length >= budget) {
    return {
      ok: false,
      slots,
      message: `Your budget is ${budget} shift${budget === 1 ? "" : "s"}. Raise it or remove one.`,
    };
  }
  return { ok: true, slots: [...slots, slot] };
}

/** Lowering the budget drops the most recently placed slots. */
export function fitSlotsToBudget(slots: Slot[], budget: number): Slot[] {
  return slots.slice(0, Math.max(0, budget));
}
