// Planner state: one reducer, pure, testable without React.
import type { Night, NightName, PlanResult, Scenarios, Slot } from "../lib/contract";
import {
  type BestValue,
  type View,
  bestValue,
  clampBudget,
  costOf,
  extraReached,
  fitSlotsToBudget,
  resultForView,
  slotsForView,
  toggleSlot,
} from "../lib/plan";
import { type PlanOption } from "../lib/contract";
import { defaultBudget, hasPlanner, pickFor } from "../lib/recommend";
import { NIGHT_MIN, blockOf } from "../lib/time";

/** A full night replays in this many seconds. */
export const REPLAY_SECONDS = 24;
const MIN_PER_MS = NIGHT_MIN / (REPLAY_SECONDS * 1000);

export interface PlannerState {
  nightName: NightName;
  /** Your slots, in the order they were placed (lowering the budget drops the newest). */
  slots: Slot[];
  budget: number;
  /** Budget in dollars for the planner's recommendation (slider on the hero card). */
  recBudget: number;
  view: View;
  /** Replay time, minutes since 6 PM. */
  t: number;
  playing: boolean;
  /** Message shown under the grid (budget / 4-shift limit). Empty when none. */
  msg: string;
}

export type PlannerAction =
  | { type: "setNight"; name: NightName }
  | { type: "toggleSlot"; slot: Slot }
  | { type: "setBudget"; budget: number }
  | { type: "setRecBudget"; usd: number }
  | { type: "setView"; view: View }
  | { type: "toggleAi" }
  | { type: "clear" }
  | { type: "setTime"; t: number }
  | { type: "togglePlay" }
  | { type: "pause" }
  | { type: "tick"; dtMs: number }
  | { type: "dismissMsg" };

export function nightOf(data: Scenarios, name: NightName): Night {
  const n = data.nights[name];
  if (!n) throw new Error(`night '${name}' not in scenarios.json`);
  return n;
}

export function initialState(data: Scenarios, name: NightName = "typical"): PlannerState {
  const nightName = data.nights[name] ? name : (Object.keys(data.nights)[0] as NightName);
  const night = nightOf(data, nightName);
  return {
    nightName,
    slots: [],
    budget: bestValue(night).k,
    recBudget: defaultBudget(night),
    // Lead with the planner's pick when the data has one.
    view: hasPlanner(night) ? "rec" : "yours",
    t: NIGHT_MIN,
    playing: false,
    msg: "",
  };
}

export function plannerReducer(state: PlannerState, action: PlannerAction, data: Scenarios): PlannerState {
  switch (action.type) {
    case "setNight": {
      if (!data.nights[action.name]) return state;
      // New night: fresh plan, best-value budget, keep replay time.
      return { ...initialState(data, action.name), t: state.t, playing: state.playing };
    }
    case "toggleSlot": {
      const r = toggleSlot(state.slots, action.slot, state.budget);
      // Tapping the grid always means "edit my plan".
      return { ...state, view: "yours", slots: r.slots, msg: r.ok ? "" : r.message };
    }
    case "setBudget": {
      const budget = clampBudget(action.budget);
      return { ...state, budget, slots: fitSlotsToBudget(state.slots, budget), msg: "" };
    }
    case "setRecBudget":
      // Moving the budget means "show me the planner's pick".
      return { ...state, recBudget: Math.max(0, action.usd), view: "rec", msg: "" };
    case "setView":
      return { ...state, view: action.view, msg: "" };
    case "toggleAi":
      return { ...state, view: state.view === "ai" ? "yours" : "ai", msg: "" };
    case "clear":
      return { ...state, slots: [], view: "yours", msg: "" };
    case "setTime":
      return { ...state, t: clampT(action.t), playing: false };
    case "togglePlay": {
      if (state.playing) return { ...state, playing: false };
      // Pressing play at the end of the night restarts it.
      return { ...state, playing: true, t: state.t >= NIGHT_MIN ? 0 : state.t };
    }
    case "pause":
      return state.playing ? { ...state, playing: false } : state;
    case "tick": {
      if (!state.playing) return state;
      const t = clampT(state.t + Math.max(0, action.dtMs) * MIN_PER_MS);
      return { ...state, t, playing: t < NIGHT_MIN };
    }
    case "dismissMsg":
      return state.msg ? { ...state, msg: "" } : state;
  }
}

function clampT(t: number): number {
  return Math.min(NIGHT_MIN, Math.max(0, t));
}

/** Everything the UI derives from state. Pure, so components stay simple. */
export interface Derived {
  night: Night;
  /** Result for the current view, or null if your plan was not precomputed. */
  result: PlanResult | null;
  /** result, falling back to doing nothing, for drawing the map. */
  shown: PlanResult;
  lateIds: ReadonlySet<number>;
  /** Slots drawn on the grid for the current view. */
  shownSlots: ReadonlySet<Slot>;
  block: number;
  cost: number;
  /** Extra people reached in time vs doing nothing; null if not precomputed. */
  extra: number | null;
  bestValue: BestValue;
  /** The planner's pick for recBudget; null if the data has no planner output. */
  pick: PlanOption | null;
  /** Late calls that have happened by replay time t. */
  lateSoFar: number;
}

export function derive(state: PlannerState, data: Scenarios): Derived {
  const night = nightOf(data, state.nightName);
  const result = resultForView(night, state.view, state.slots, state.budget, state.recBudget);
  const shown = result ?? night.baseline;
  const lateIds = new Set(shown.late_ids);
  let lateSoFar = 0;
  for (const c of night.calls) if (c.t <= state.t && lateIds.has(c.id)) lateSoFar++;
  return {
    night,
    result,
    shown,
    lateIds,
    shownSlots: new Set(slotsForView(night, state.view, state.slots, state.budget, state.recBudget)),
    block: blockOf(Math.min(state.t, NIGHT_MIN - 0.01)),
    cost: costOf(data.costs, state.view, state.slots.length, state.budget, night, state.recBudget),
    extra: result ? extraReached(night, result) : null,
    bestValue: bestValue(night),
    pick: pickFor(night, state.recBudget),
    lateSoFar,
  };
}
