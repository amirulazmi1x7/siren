import { describe, expect, it } from "vitest";
import { assertScenarios, parsePlanKey, planKey, resultFor } from "../src/lib/contract";
import { night, scenarios } from "./fixture";

describe("planKey", () => {
  it("matches the Python examples", () => {
    expect(planKey(["B-3", "A-2", "A-3"])).toBe("A-2,A-3,B-3");
    expect(planKey([])).toBe("");
  });

  it("ignores order and duplicates", () => {
    expect(planKey(["A-3", "A-2"])).toBe(planKey(["A-2", "A-3"]));
    expect(planKey(["C-1", "C-1"])).toBe("C-1");
  });

  it("reproduces every lookup key Python wrote (parity)", () => {
    for (const name of ["typical", "holiday", "heat"] as const) {
      for (const key of Object.keys(night(name).lookup)) {
        const slots = key === "" ? [] : key.split(",");
        expect(planKey([...slots].reverse())).toBe(key);
      }
    }
  });
});

describe("parsePlanKey", () => {
  it("round-trips valid keys and rejects bad ones", () => {
    expect(parsePlanKey("")).toEqual([]);
    expect(parsePlanKey("A-2,C-5")).toEqual(["A-2", "C-5"]);
    expect(parsePlanKey("Z-9")).toBeNull();
    expect(parsePlanKey("A-6")).toBeNull();
  });
});

describe("resultFor", () => {
  it("finds lookup plans regardless of order", () => {
    const n = night();
    expect(resultFor(n, ["A-3", "A-2"])).toBe(resultFor(n, ["A-2", "A-3"]));
    expect(resultFor(n, [])).toBe(n.lookup[""]);
  });

  it("finds AI plans bigger than the lookup", () => {
    const n = night();
    const six = n.ai_plans["6"];
    expect(resultFor(n, [...six.slots].reverse())).toBe(six);
  });

  it("returns null for an un-precomputed plan", () => {
    expect(resultFor(night(), ["A-0", "A-1", "B-0", "B-1", "C-5"])).toBeNull();
  });
});

describe("assertScenarios", () => {
  it("accepts the shared file", () => {
    expect(scenarios().nights.typical).toBeDefined();
  });

  it("rejects obviously wrong data", () => {
    expect(() => assertScenarios(null)).toThrow();
    expect(() => assertScenarios({ city: { name: "x", area: "y" } })).toThrow(/blocks/);
  });
});
