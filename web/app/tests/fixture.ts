import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertScenarios, type Night, type Scenarios } from "../src/lib/contract";

let cached: Scenarios | null = null;

/** The real shared file (fake or real data), parsed once per test run. */
export function scenarios(): Scenarios {
  if (!cached) {
    const raw = readFileSync(resolve(__dirname, "../../data/scenarios.json"), "utf8");
    cached = assertScenarios(JSON.parse(raw));
  }
  return cached;
}

export function night(name: "typical" | "holiday" | "heat" = "typical"): Night {
  const n = scenarios().nights[name];
  if (!n) throw new Error(`fixture missing night ${name}`);
  return n;
}
