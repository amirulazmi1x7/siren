// Types and helpers for web/data/scenarios.json.
// The source of truth is shared/contract.py. Keep these in step with it.

export const HOSPITAL_IDS = ["A", "B", "C"] as const;
export type HospitalId = (typeof HOSPITAL_IDS)[number];

export const N_BLOCKS = 6;
export const MAX_LOOKUP_SHIFTS = 4;
export const AI_BUDGETS = ["1", "2", "3", "4", "5", "6"] as const;
export type AiBudget = (typeof AI_BUDGETS)[number];

/** A nurse slot: hospital + block index, e.g. "A-3". */
export type Slot = `${HospitalId}-${number}`;
const SLOT_RE = /^[ABC]-[0-5]$/;

/** 3 hospitals x 6 blocks, indexed [hospital][block]. */
export type Grid = number[][];

export interface Call {
  id: number;
  /** Minutes since 6 PM (0 to 720). */
  t: number;
  lat: number;
  lon: number;
  hosp: HospitalId;
  severity: number;
}

export interface PlanResult {
  late_ids: number[];
  /** Mean ambulances waiting at each hospital's door, per block. */
  stuck: Grid;
  /** Mean minutes at the hospital (wait + handoff + cleanup), per block. */
  door_wait_min: Grid;
}

export interface AiPlan extends PlanResult {
  slots: Slot[];
}

export interface RealStats {
  median_response_min: number;
  median_time_at_hospital_min: number;
}

export interface Night {
  label: string;
  calls: Call[];
  real: RealStats;
  baseline: PlanResult;
  ambulances_plus2: PlanResult;
  ai_plans: Record<AiBudget, AiPlan>;
  /** Every plan of 0 to 4 shifts, keyed by planKey(). */
  lookup: Record<string, PlanResult>;
}

export const REQUIRED_NIGHTS = ["typical", "holiday", "heat"] as const;
export type NightName = (typeof REQUIRED_NIGHTS)[number] | "forecast";

export interface Hospital {
  id: HospitalId;
  lat: number;
  lon: number;
}

export interface Scenarios {
  generated_at: string;
  /** Set by shared/make_fake.py only. */
  fake?: boolean;
  city: { name: string; area: string };
  blocks: string[];
  hospitals: Hospital[];
  costs: { nurse_shift_usd: number; ambulance_night_usd: number };
  nights: Partial<Record<NightName, Night>>;
}

/** Same as Python plan_key: unique slots, sorted ascending, joined with ",". Empty plan is "". */
export function planKey(slots: Iterable<string>): string {
  return [...new Set(slots)].sort().join(",");
}

export function isSlot(s: string): s is Slot {
  return SLOT_RE.test(s);
}

/** Parse a plan key back to slots. Returns null if any part is not a valid slot. */
export function parsePlanKey(key: string): Slot[] | null {
  if (key === "") return [];
  const parts = key.split(",");
  return parts.every(isSlot) ? (parts as Slot[]) : null;
}

/**
 * Precomputed result for a set of slots. Checks the lookup first (0 to 4 shifts),
 * then the AI plans (which can be up to 6 shifts). Null means "not precomputed".
 */
export function resultFor(night: Night, slots: Iterable<string>): PlanResult | null {
  const key = planKey(slots);
  const hit = night.lookup[key];
  if (hit) return hit;
  return Object.values(night.ai_plans).find((p) => planKey(p.slots) === key) ?? null;
}

export function hospitalIndex(id: HospitalId): number {
  return HOSPITAL_IDS.indexOf(id);
}

/**
 * Cheap shape check after fetching. Full validation is shared/contract.py's job;
 * this only catches "wrong file" or "half-written file" before the UI renders.
 */
export function assertScenarios(d: unknown): Scenarios {
  const fail = (why: string): never => {
    throw new Error(`scenarios.json: ${why}`);
  };
  if (typeof d !== "object" || d === null) fail("not an object");
  const s = d as Partial<Scenarios>;
  if (!s.city || typeof s.city.name !== "string") fail("missing city");
  if (!Array.isArray(s.blocks) || s.blocks.length !== N_BLOCKS) fail("blocks must have 6 labels");
  if (!Array.isArray(s.hospitals) || s.hospitals.map((h) => h.id).join() !== HOSPITAL_IDS.join()) {
    fail("hospitals must be A, B, C");
  }
  if (!s.costs) fail("missing costs");
  if (!s.nights) fail("missing nights");
  for (const n of REQUIRED_NIGHTS) {
    const night = s.nights![n];
    if (!night) fail(`missing night '${n}'`);
    if (!Array.isArray(night!.calls) || !night!.lookup || !night!.ai_plans) fail(`night '${n}' is incomplete`);
  }
  return s as Scenarios;
}
