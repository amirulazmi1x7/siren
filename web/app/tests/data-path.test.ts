import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The app serves web/data/ as its public dir. Guard that the shared file is where Person A writes it.
const SCENARIOS = resolve(__dirname, "../../data/scenarios.json");

describe("shared data path", () => {
  it("web/data/scenarios.json exists", () => {
    expect(existsSync(SCENARIOS)).toBe(true);
  });

  it("has the three required nights", () => {
    const d = JSON.parse(readFileSync(SCENARIOS, "utf8")) as { nights: Record<string, unknown> };
    expect(Object.keys(d.nights)).toEqual(expect.arrayContaining(["typical", "holiday", "heat"]));
  });
});
