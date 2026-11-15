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
  /** Ambulance-hours spent at hospitals that night (SIM). Added by the real export. */
  hours_at_hospital?: number;
}

/** One fix the planner compared (real export only). Numbers are averages over rehearsal runs (SIM). */
export interface PlanOption {
  id: string;
  label: string;
  slots: Slot[];
  extra_ambulances: number;
  cost_usd: number;
  /** Ambulance-hours back on the road vs doing nothing (fewer hours at hospitals + added ambulance hours). */
  hours_back: number;
  hours_at_hospital: number;
  /** Mean urgent patients reached late. */
  late: number;
  /** Total minutes of faster ambulance arrival for urgent patients vs doing nothing (SIM). */
  urgent_minutes_saved?: number;
  /** Estimated extra cardiac-arrest survivors if run every Friday for a year (SIM, noisy at this scale). */
  arrest_survivors_per_year?: number;
  /**
   * One real urgent call this plan helps, from rehearsal run 0 (the run the map replays).
   * Time, type and area are real; before/after minutes are rehearsal results (SIM). Null if none.
   */
  highlight?: StoryCall | null;
}

export interface StoryCall {
  /** Call id in night.calls. */
  id: number;
  /** Minutes since 6 PM. */
  t: number;
  /** NYC EMS initial severity code (1 most severe). */
  severity: number;
  hosp: HospitalId;
  before_min: number;
  after_min: number;
}

export interface AiPlan extends PlanResult {
  slots: Slot[];
}

export interface RealStats {
  median_response_min: number;
  median_time_at_hospital_min: number;
  /** Measured that night (real export only): urgent calls with a valid response time, how many waited over 10 min. */
  urgent_calls?: number;
  urgent_late?: number;
  /** Measured ambulance-hours at hospitals that night (arrival to back in service). */
  hours_at_hospital?: number;
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
  /** Every fix the planner compared (real export only). */
  options?: PlanOption[];
  /** Planner's pick per budget step: { "<budget usd>": "<option id>" }. Use the largest key <= budget. */
  recommendation?: Record<string, string>;
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
  costs: {
    nurse_shift_usd: number;
    /** Older exports: per ambulance. Newer exports: +2 ambulances; use ambulance_each_night_usd for one. */
    ambulance_night_usd: number;
    /** One extra ambulance for one night (newer exports). */
    ambulance_each_night_usd?: number;
  };
  nights: Partial<Record<NightName, Night>>;
  /** Area-wide measured numbers (REAL), real export only. */
  area_real?: {
    median_time_at_hospital_min: number;
    ambulance_hours_per_friday: number;
    /** Widely used handover benchmark (cited convention, not a federal standard). */
    benchmark_offload_min: number;
  };
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
