import { describe, expect, it } from "vitest";
import {
  budgetSteps,
  comparedOptions,
  defaultBudget,
  hasPlanner,
  optionResult,
  pickFor,
  pickHeadline,
} from "../src/lib/recommend";
import { costOf, twoAmbulanceCost } from "../src/lib/plan";
import { night, scenarios } from "./fixture";

const NIGHTS = ["typical", "holiday", "heat"] as const;
const data = scenarios();
// These tests need the real export (options + recommendation). Skip on fake data.
const real = NIGHTS.every((n) => hasPlanner(night(n)));

describe.runIf(real)("planner pick (real export)", () => {
  for (const name of NIGHTS) {
    it(`${name}: pick matches the export for every budget step and stays affordable`, () => {
      const n = night(name);
      for (const step of budgetSteps(n)) {
        const pick = pickFor(n, step);
        expect(pick?.id).toBe(n.recommendation![String(step)]);
        expect(pick!.cost_usd).toBeLessThanOrEqual(step);
      }
    });

    it(`${name}: a budget between steps uses the largest step below it`, () => {
      const n = night(name);
      const [a, b] = budgetSteps(n);
      expect(pickFor(n, (a! + b!) / 2)?.id).toBe(n.recommendation![String(a)]);
      expect(pickFor(n, a! - 1)).toBeNull();
    });

    it(`${name}: default budget is a real step`, () => {
      expect(budgetSteps(night(name))).toContain(defaultBudget(night(name)));
    });

    it(`${name}: compared options include the pick once and give every other option a reason`, () => {
      const n = night(name);
      const budget = defaultBudget(n);
      const pick = pickFor(n, budget)!;
      const rows = comparedOptions(n, budget, pick);
      expect(rows.filter((r) => r.chosen)).toHaveLength(1);
      expect(rows.find((r) => r.chosen)?.option.id).toBe(pick.id);
      expect(rows.some((r) => r.option.id === "nothing")).toBe(true);
      for (const r of rows) if (!r.chosen) expect(r.verdict).not.toBe("Recommended");
      // Nothing affordable beats the pick on hours back (that is how the export picks).
      for (const r of rows) if (r.option.cost_usd <= budget) expect(r.option.hours_back).toBeLessThanOrEqual(pick.hours_back);
    });
  }

  it("never invents a replay for +1 ambulance or mixes", () => {
    for (const name of NIGHTS) {
      for (const o of night(name).options!) {
        const r = optionResult(night(name), o);
        if (o.extra_ambulances === 1) expect(r).toBeNull();
        if (o.extra_ambulances === 0) expect(r).not.toBeNull();
      }
    }
  });

  it("+2 ambulances costs what the export says (per-ambulance pricing)", () => {
    const n = night("typical");
    const amb2 = n.options!.find((o) => o.id === "amb2")!;
    expect(twoAmbulanceCost(data.costs, n)).toBe(amb2.cost_usd);
    expect(costOf(data.costs, "amb", 0, 3, n)).toBe(amb2.cost_usd);
  });
});

describe("pickHeadline", () => {
  const base = { id: "x", label: "", cost_usd: 0, hours_back: 0, hours_at_hospital: 0, late: 0 };
  it("reads like an instruction", () => {
    expect(pickHeadline({ ...base, slots: ["A-1", "B-2"], extra_ambulances: 0 })).toBe("Add 2 offload nurse shifts");
    expect(pickHeadline({ ...base, slots: ["A-1"], extra_ambulances: 1 })).toBe(
      "Add 1 ambulance for the night and 1 offload nurse shift",
    );
    expect(pickHeadline({ ...base, slots: [], extra_ambulances: 0 })).toBe("Do nothing");
  });
});

describe("shiftRuns", () => {
  it("merges consecutive blocks per hospital and sorts by time", async () => {
    const { shiftRuns } = await import("../src/lib/recommend");
    const { blockRangeLabel } = await import("../src/lib/time");
    const runs = shiftRuns(["B-3", "A-2", "B-2", "C-3", "B-5"]);
    expect(runs).toEqual([
      { hospital: "A", startBlock: 2, endBlock: 2 },
      { hospital: "B", startBlock: 2, endBlock: 3 },
      { hospital: "C", startBlock: 3, endBlock: 3 },
      { hospital: "B", startBlock: 5, endBlock: 5 },
    ]);
    expect(blockRangeLabel(2, 3)).toBe("10 PM to 2 AM");
  });
});
