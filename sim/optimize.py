"""Step 6: choose which offload-nurse shifts to buy for each budget.

A plan is a set of shifts like {"A-2", "B-3"} (ER A, block 2 = 10 PM-12 AM). We judge a plan by
  1. ambulance-hours spent at hospitals (lower = more ambulance time back on the road), then
  2. urgent patients reached late (tie-breaker; this one is a SIM estimate).
Greedy: start empty, try adding each remaining shift, keep the best, repeat. Every candidate is
replayed on the same seeds, so the only difference between candidates is the plan itself.
"""
import itertools
import statistics

from shared.contract import MAX_LOOKUP_SHIFTS, plan_key
from sim.model import HOSP_IDS, N_BLOCKS, NightResult, SimParams, run_night
from sim.outcomes import ARREST_SEVERITY, arrest_survival


def all_slots() -> list[str]:
    return [f"{h}-{b}" for h in HOSP_IDS for b in range(N_BLOCKS)]


def all_plan_keys(max_k: int = MAX_LOOKUP_SHIFTS) -> list[str]:
    """Every plan of 0..max_k shifts, as lookup keys (18 slots, up to 4 shifts -> 4,048 plans)."""
    return [plan_key(c) for k in range(max_k + 1) for c in itertools.combinations(all_slots(), k)]


def hours_at_hospital(r: NightResult) -> float:
    return sum(v for _, _, v in r.hosp_visits) / 60


def evaluate(calls: list[dict], params: SimParams, slots: frozenset[str] = frozenset(),
             seeds=range(5), extra_ambulances: int = 0) -> dict:
    runs = [run_night(calls, params, slots, extra_ambulances, seed=s) for s in seeds]
    urgent = [c["id"] for c in calls if c["severity"] <= params.urgent_max_severity]
    arrests = [c["id"] for c in calls if c["severity"] == ARREST_SEVERITY]
    return {"hours_at_hospital": round(statistics.mean(hours_at_hospital(r) for r in runs), 2),
            "late": round(statistics.mean(len(r.late_ids) for r in runs), 2),
            # Total minutes urgent patients waited for an ambulance, and expected cardiac-arrest survivors.
            "urgent_response_min": round(statistics.mean(sum(r.response_min[i] for i in urgent) for r in runs), 1),
            "arrest_survivors": round(statistics.mean(sum(arrest_survival(r.response_min[i]) for i in arrests)
                                                      for r in runs), 5)}


def score(calls: list[dict], params: SimParams, slots: frozenset[str], seeds=range(5)) -> tuple[float, float]:
    """Lower is better: (ambulance-hours at hospital, late urgent patients)."""
    e = evaluate(calls, params, slots, seeds)
    return e["hours_at_hospital"], e["late"]


def greedy_plans(calls: list[dict], params: SimParams, max_budget: int = 6, seeds=range(5)) -> dict[int, list[str]]:
    plans, chosen = {}, []
    for k in range(1, max_budget + 1):
        rest = [s for s in all_slots() if s not in chosen]
        best = min(rest, key=lambda s: (score(calls, params, frozenset(chosen + [s]), seeds), s))
        chosen = chosen + [best]
        plans[k] = sorted(chosen)
    return plans
