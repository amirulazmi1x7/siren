import { describe, expect, it } from "vitest";
import { bestValue } from "../src/lib/plan";
import { NIGHT_MIN } from "../src/lib/time";
import {
  type PlannerAction,
  type PlannerState,
  REPLAY_SECONDS,
  derive,
  initialState,
  plannerReducer,
} from "../src/state/planner";
import { night, scenarios } from "./fixture";

const data = scenarios();
const run = (s: PlannerState, ...actions: PlannerAction[]) => actions.reduce((acc, a) => plannerReducer(acc, a, data), s);

describe("initial state", () => {
  it("starts on typical, full night shown, best-value budget, your plan", () => {
    const s = initialState(data);
    expect(s.nightName).toBe("typical");
    expect(s.t).toBe(NIGHT_MIN);
    expect(s.playing).toBe(false);
    expect(s.view).toBe("yours");
    expect(s.budget).toBe(bestValue(night("typical")).k);
  });
});

describe("plan editing", () => {
  it("toggling slots in any order gives the same result", () => {
    const s0 = { ...initialState(data), budget: 4 };
    const a = derive(run(s0, { type: "toggleSlot", slot: "A-3" }, { type: "toggleSlot", slot: "A-2" }), data);
    const b = derive(run(s0, { type: "toggleSlot", slot: "A-2" }, { type: "toggleSlot", slot: "A-3" }), data);
    expect(a.result).toBe(b.result);
    expect(a.extra).toBe(b.extra);
  });

  it("a 5th shift shows the message and changes nothing", () => {
    const s = run(
      { ...initialState(data), budget: 6 },
      { type: "toggleSlot", slot: "A-0" },
      { type: "toggleSlot", slot: "A-1" },
      { type: "toggleSlot", slot: "B-0" },
      { type: "toggleSlot", slot: "B-1" },
      { type: "toggleSlot", slot: "C-0" },
    );
    expect(s.slots).toHaveLength(4);
    expect(s.msg).toMatch(/up to 4 shifts/);
    expect(derive(s, data).result).not.toBeNull();
  });

  it("lowering the budget drops the most recent slots", () => {
    const s = run(
      { ...initialState(data), budget: 3 },
      { type: "toggleSlot", slot: "C-3" },
      { type: "toggleSlot", slot: "A-2" },
      { type: "toggleSlot", slot: "A-4" },
      { type: "setBudget", budget: 1 },
    );
    expect(s.slots).toEqual(["C-3"]);
  });

  it("tapping the grid while viewing the AI plan switches back to your plan", () => {
    const s = run(initialState(data), { type: "toggleAi" }, { type: "toggleSlot", slot: "B-2" });
    expect(s.view).toBe("yours");
    expect(s.slots).toEqual(["B-2"]);
  });

  it("budget is clamped to 1..6", () => {
    expect(run(initialState(data), { type: "setBudget", budget: 0 }).budget).toBe(1);
    expect(run(initialState(data), { type: "setBudget", budget: 9 }).budget).toBe(6);
  });
});

describe("views", () => {
  it("AI view shows AI slots and their cost", () => {
    const s = run({ ...initialState(data), budget: 3 }, { type: "toggleAi" });
    const d = derive(s, data);
    expect([...d.shownSlots].sort()).toEqual([...night().ai_plans["3"].slots].sort());
    expect(d.cost).toBe(3 * data.costs.nurse_shift_usd);
  });

  it("switching night resets the plan and budget", () => {
    const s = run(initialState(data), { type: "toggleSlot", slot: "A-1" }, { type: "setNight", name: "holiday" });
    expect(s.nightName).toBe("holiday");
    expect(s.slots).toEqual([]);
    expect(s.budget).toBe(bestValue(night("holiday")).k);
  });
});

describe("replay", () => {
  it("play at the end restarts from 6 PM", () => {
    const s = run(initialState(data), { type: "togglePlay" });
    expect(s.playing).toBe(true);
    expect(s.t).toBe(0);
  });

  it("ticks advance time and stop at 6 AM", () => {
    let s = run(initialState(data), { type: "togglePlay" });
    s = run(s, { type: "tick", dtMs: 1000 });
    expect(s.t).toBeCloseTo(NIGHT_MIN / REPLAY_SECONDS);
    s = run(s, { type: "tick", dtMs: REPLAY_SECONDS * 1000 });
    expect(s.t).toBe(NIGHT_MIN);
    expect(s.playing).toBe(false);
  });

  it("scrubbing pauses and clamps", () => {
    const s = run(initialState(data), { type: "togglePlay" }, { type: "setTime", t: 9999 });
    expect(s.playing).toBe(false);
    expect(s.t).toBe(NIGHT_MIN);
  });

  it("late count only includes calls so far", () => {
    const early = derive(run(initialState(data), { type: "setTime", t: 0 }), data);
    const full = derive(initialState(data), data);
    expect(early.lateSoFar).toBeLessThanOrEqual(full.lateSoFar);
    expect(full.lateSoFar).toBe(full.lateIds.size);
  });
});
