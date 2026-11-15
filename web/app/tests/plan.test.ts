import { describe, expect, it } from "vitest";
import type { Slot } from "../src/lib/contract";
import {
  BEST_VALUE_SHARE,
  aiPlan,
  bestValue,
  costOf,
  extraReached,
  fitSlotsToBudget,
  mostJammedHospital,
  resultForView,
  toggleSlot,
  viewNameInline,
} from "../src/lib/plan";
import { night, scenarios } from "./fixture";

describe("toggleSlot", () => {
  it("adds and removes, keeping placement order", () => {
    const a = toggleSlot([], "A-3", 3);
    expect(a).toEqual({ ok: true, slots: ["A-3"] });
    const b = toggleSlot(a.slots, "A-2", 3);
    expect(b.slots).toEqual(["A-3", "A-2"]);
    expect(toggleSlot(b.slots, "A-3", 3).slots).toEqual(["A-2"]);
  });

  it("refuses a 5th shift with the lookup message", () => {
    const four: Slot[] = ["A-0", "A-1", "B-0", "B-1"];
    const r = toggleSlot(four, "C-0", 6);
    expect(r.ok).toBe(false);
    expect(r.slots).toBe(four);
    if (!r.ok) expect(r.message).toMatch(/up to 4 shifts/);
  });

  it("refuses going over budget", () => {
    const r = toggleSlot(["A-0", "A-1"], "B-0", 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/budget is 2 shifts/);
  });
});

describe("fitSlotsToBudget", () => {
  it("drops the most recently placed slots", () => {
    expect(fitSlotsToBudget(["C-3", "A-2", "A-4"], 2)).toEqual(["C-3", "A-2"]);
    expect(fitSlotsToBudget(["C-3"], 3)).toEqual(["C-3"]);
  });
});

describe("resultForView / costOf", () => {
  const n = night();
  const costs = scenarios().costs;

  it("maps each view to its result", () => {
    expect(resultForView(n, "nothing", [], 3)).toBe(n.baseline);
    expect(resultForView(n, "amb", [], 3)).toBe(n.ambulances_plus2);
    expect(resultForView(n, "ai", [], 3)).toBe(n.ai_plans["3"]);
    expect(resultForView(n, "yours", [], 3)).toBe(n.lookup[""]);
  });

  it("prices each view", () => {
    expect(costOf(costs, "nothing", 2, 3)).toBe(0);
    // ambulance_night_usd is per ambulance; +2 ambulances costs twice that.
    expect(costOf(costs, "amb", 2, 3)).toBe(2 * costs.ambulance_night_usd);
    expect(costOf(costs, "yours", 2, 3)).toBe(2 * costs.nurse_shift_usd);
    expect(costOf(costs, "ai", 2, 3)).toBe(3 * costs.nurse_shift_usd);
  });
});

describe("bestValue", () => {
  for (const name of ["typical", "holiday", "heat"] as const) {
    it(`is between 1 and 4 and honest on ${name}`, () => {
      const n = night(name);
      const bv = bestValue(n);
      expect(bv.k).toBeGreaterThanOrEqual(1);
      expect(bv.k).toBeLessThanOrEqual(4);
      expect(bv.gain).toBe(extraReached(n, aiPlan(n, bv.k)));
      const max = extraReached(n, aiPlan(n, 6));
      if (max > 0 && bv.k < 4) {
        expect(bv.gain).toBeGreaterThanOrEqual(BEST_VALUE_SHARE * max);
        if (bv.k > 1) expect(extraReached(n, aiPlan(n, bv.k - 1))).toBeLessThan(BEST_VALUE_SHARE * max);
      }
    });
  }
});

describe("misc", () => {
  it("finds the most jammed hospital", () => {
    const { index, id } = mostJammedHospital(night());
    expect(["A", "B", "C"]).toContain(id);
    const sums = night().baseline.stuck.map((r) => r.reduce((a, b) => a + b, 0));
    expect(sums[index]).toBe(Math.max(...sums));
  });

  it("keeps AI capitalised mid-sentence", () => {
    expect(viewNameInline("ai")).toBe("AI plan");
    expect(viewNameInline("yours")).toBe("your plan");
  });
});
