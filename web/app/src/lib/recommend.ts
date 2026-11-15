// The planner's recommendation: which fix to use for a budget, and why the others lost.
// Everything here reads Person A's `options` and `recommendation`; nothing is decided in the browser.
import { type Night, type PlanOption, type PlanResult, resultFor } from "./contract";
import { money } from "./format";

/** Default budget = fewest dollars whose pick gets at least this share of the best pick's hours back. */
export const DEFAULT_BUDGET_SHARE = 0.8;

export function hasPlanner(night: Night): boolean {
  return !!night.options?.length && !!night.recommendation && Object.keys(night.recommendation).length > 0;
}

/** Budget steps in dollars, ascending. */
export function budgetSteps(night: Night): number[] {
  return Object.keys(night.recommendation ?? {})
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

export function optionById(night: Night, id: string): PlanOption | undefined {
  return night.options?.find((o) => o.id === id);
}

/** The planner's pick for a budget: the largest budget step at or below it. Null below the first step. */
export function pickFor(night: Night, budgetUsd: number): PlanOption | null {
  let id: string | undefined;
  for (const step of budgetSteps(night)) if (step <= budgetUsd) id = night.recommendation?.[String(step)];
  return id ? (optionById(night, id) ?? null) : null;
}

export function defaultBudget(night: Night): number {
  const steps = budgetSteps(night);
  if (steps.length === 0) return 0;
  const best = Math.max(...steps.map((s) => pickFor(night, s)?.hours_back ?? 0));
  return steps.find((s) => (pickFor(night, s)?.hours_back ?? 0) >= DEFAULT_BUDGET_SHARE * best) ?? steps[0]!;
}

/**
 * Per-call replay for an option, if the data has one. Nurse-only plans come from the lookup or AI plans,
 * +2 ambulances has its own result. +1 ambulance and mixes have none: return null, never guess.
 */
export function optionResult(night: Night, o: PlanOption): PlanResult | null {
  if (o.extra_ambulances === 0) return resultFor(night, o.slots);
  if (o.extra_ambulances === 2 && o.slots.length === 0) return night.ambulances_plus2;
  return null;
}

export function costPerHour(o: PlanOption): number | null {
  return o.hours_back > 0 && o.cost_usd > 0 ? o.cost_usd / o.hours_back : null;
}

export interface ComparedRow {
  option: PlanOption;
  chosen: boolean;
  /** Plain-language reason, e.g. "Over budget" or "Frees 4.5 fewer hours". */
  verdict: string;
}

const hours = (h: number) => `${h.toFixed(1)} h`;

/**
 * The options shown in "Options it compared": doing nothing, ambulances, the best nurse plan and
 * the best mix for this budget, plus the pick. Each gets a factual reason.
 */
export function comparedOptions(night: Night, budgetUsd: number, pick: PlanOption): ComparedRow[] {
  const opts = night.options ?? [];
  const byId = (id: string) => opts.find((o) => o.id === id);
  const affordable = (o: PlanOption) => o.cost_usd <= budgetUsd;
  const bestOf = (list: PlanOption[]) =>
    list.length ? list.reduce((a, b) => (b.hours_back > a.hours_back || (b.hours_back === a.hours_back && b.cost_usd < a.cost_usd) ? b : a)) : undefined;

  const nurses = opts.filter((o) => o.extra_ambulances === 0 && o.slots.length > 0);
  const mixes = opts.filter((o) => o.extra_ambulances > 0 && o.slots.length > 0);
  const bestNurses = bestOf(nurses.filter(affordable)) ?? nurses.reduce<PlanOption | undefined>((a, b) => (!a || b.cost_usd < a.cost_usd ? b : a), undefined);
  const bestMix = bestOf(mixes.filter(affordable)) ?? mixes.reduce<PlanOption | undefined>((a, b) => (!a || b.cost_usd < a.cost_usd ? b : a), undefined);

  const picked = [byId("nothing"), byId("amb1"), byId("amb2"), bestNurses, bestMix, pick].filter(
    (o): o is PlanOption => !!o,
  );
  const unique = [...new Map(picked.map((o) => [o.id, o])).values()].sort((a, b) => a.cost_usd - b.cost_usd);

  return unique.map((o) => ({
    option: o,
    chosen: o.id === pick.id,
    verdict:
      o.id === pick.id
        ? "Recommended"
        : o.id === "nothing"
          ? "Baseline"
          : o.cost_usd > budgetUsd
            ? `Over budget (${money(o.cost_usd)})`
            : o.hours_back < pick.hours_back
              ? // Show the trade-off openly when the cheaper option is close.
                o.cost_usd < pick.cost_usd
                ? `${hours(pick.hours_back - o.hours_back)} fewer, ${money(pick.cost_usd - o.cost_usd)} cheaper`
                : `Frees ${hours(pick.hours_back - o.hours_back)} fewer`
              : "Similar result for more money",
  }));
}

/** "4 nurse shifts" -> "Add 4 offload nurse shifts", "+1 ambulance & 4 nurse shifts" -> "Add 1 ambulance and 4 offload nurse shifts". */
export function pickHeadline(o: PlanOption): string {
  const parts: string[] = [];
  if (o.extra_ambulances > 0) parts.push(`${o.extra_ambulances} ambulance${o.extra_ambulances === 1 ? "" : "s"} for the night`);
  if (o.slots.length > 0) parts.push(`${o.slots.length} offload nurse shift${o.slots.length === 1 ? "" : "s"}`);
  return parts.length ? `Add ${parts.join(" and ")}` : "Do nothing";
}

export interface ShiftRun {
  hospital: string;
  startBlock: number;
  endBlock: number;
}

/** Group slots into consecutive runs per hospital: B-2, B-3 -> Hospital B, blocks 2 to 3. Sorted by time. */
export function shiftRuns(slots: readonly string[]): ShiftRun[] {
  const byHosp = new Map<string, number[]>();
  for (const s of slots) {
    const [h, b] = s.split("-");
    if (!h || b === undefined) continue;
    byHosp.set(h, [...(byHosp.get(h) ?? []), Number(b)]);
  }
  const runs: ShiftRun[] = [];
  for (const [hospital, blocks] of byHosp) {
    const sorted = [...new Set(blocks)].sort((a, b) => a - b);
    let start = sorted[0]!;
    let prev = start;
    for (const b of sorted.slice(1)) {
      if (b !== prev + 1) {
        runs.push({ hospital, startBlock: start, endBlock: prev });
        start = b;
      }
      prev = b;
    }
    runs.push({ hospital, startBlock: start, endBlock: prev });
  }
  return runs.sort((x, y) => x.startBlock - y.startBlock || x.hospital.localeCompare(y.hospital));
}
