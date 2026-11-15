"""The agent's tools: everything the chat can know comes from these, run on our rehearsal of real 911 nights.

Each tool takes plain JSON input and returns a JSON string. Errors come back as {"error": ...} so the model
can explain them instead of guessing. Night calls are read from web/data/scenarios.json (same calls the page
shows), and the rehearsal itself is sim.model.run_night with the calibrated settings.
"""
import dataclasses
import json
import random
from functools import lru_cache
from pathlib import Path

from pipeline.config import AMB_EACH_NIGHT_USD, NURSE_SHIFT_USD
from sim.calibrate import load_params
from sim.model import HOSP_IDS, N_BLOCKS, SimParams
from sim.optimize import all_slots, evaluate

ROOT = Path(__file__).resolve().parent.parent
SCENARIOS = ROOT / "web/data/scenarios.json"
BLOCK_HOURS = ["6 PM to 8 PM", "8 PM to 10 PM", "10 PM to 12 AM", "12 AM to 2 AM", "2 AM to 4 AM", "4 AM to 6 AM"]
MAX_SHIFTS = 6
DEFAULT_RUNS = 5


@lru_cache(maxsize=1)
def _data() -> dict:
    return json.loads(SCENARIOS.read_text())


@lru_cache(maxsize=1)
def _params() -> SimParams:
    return load_params(str(ROOT / "data/params_calibrated.json"))


class ToolError(ValueError):
    pass


def _night(name: str) -> dict:
    nights = _data()["nights"]
    if name not in nights:
        raise ToolError(f"Unknown night '{name}'. Choose one of: {', '.join(nights)}.")
    return nights[name]


def _check_slots(slots: list[str]) -> list[str]:
    valid = set(all_slots())
    bad = [s for s in slots if s not in valid]
    if bad:
        raise ToolError(f"Invalid nurse shifts {bad}. Use '<ER>-<block>' with ER A/B/C and block 0-5, e.g. 'B-2'.")
    if len(set(slots)) > MAX_SHIFTS:
        raise ToolError(f"At most {MAX_SHIFTS} nurse shifts per plan.")
    return sorted(set(slots))


def _conditions(night: str, short_staffed_er: str | None, busier_percent: float) -> tuple[list[dict], SimParams]:
    """The night's calls and rehearsal settings, adjusted for a what-if."""
    calls = list(_night(night)["calls"])
    params = _params()
    if short_staffed_er:
        if short_staffed_er not in HOSP_IDS:
            raise ToolError("short_staffed_er must be A, B or C.")
        i = HOSP_IDS.index(short_staffed_er)
        cap = tuple(tuple(max(1, c - 1) for c in row) if k == i else row for k, row in enumerate(params.door_capacity))
        params = dataclasses.replace(params, door_capacity=cap)
    if busier_percent:
        if not 0 < busier_percent <= 100:
            raise ToolError("busier_percent must be between 1 and 100.")
        rng = random.Random(7)
        extra = rng.sample(calls, k=round(len(calls) * busier_percent / 100))
        next_id = max(c["id"] for c in calls) + 1
        for j, c in enumerate(extra):
            calls.append({**c, "id": next_id + j, "t": min(720.0, max(0.0, c["t"] + rng.uniform(-20, 20)))})
    return calls, params


def _describe(slots: list[str]) -> list[str]:
    return [f"Hospital {s[0]}, {BLOCK_HOURS[int(s[2])]}" for s in slots]


def _cost(n_slots: int, extra: int) -> int:
    return n_slots * NURSE_SHIFT_USD + extra * AMB_EACH_NIGHT_USD


def _compare(calls, params, slots, extra, runs) -> dict:
    seeds = range(runs)
    base = evaluate(calls, params, frozenset(), seeds)
    plan = evaluate(calls, params, frozenset(slots), seeds, extra_ambulances=extra)
    return {
        "no_fix": {"ambulance_hours_at_hospital": round(base["hours_at_hospital"], 1),
                   "urgent_patients_late": round(base["late"], 1)},
        "with_plan": {"ambulance_hours_at_hospital": round(plan["hours_at_hospital"], 1),
                      "urgent_patients_late": round(plan["late"], 1)},
        "ambulance_hours_back": round(base["hours_at_hospital"] - plan["hours_at_hospital"] + 12 * extra, 1),
        "fewer_people_late": round(base["late"] - plan["late"], 1),
        "urgent_minutes_saved": round(base["urgent_response_min"] - plan["urgent_response_min"], 1),
    }


# ---- tools -------------------------------------------------------------------------------------------------

def get_night(night: str) -> dict:
    n = _night(night)
    stuck = n["baseline"]["stuck"]
    er, block = max(((i, b) for i in range(len(HOSP_IDS)) for b in range(N_BLOCKS)), key=lambda ib: stuck[ib[0]][ib[1]])
    per_block = [0] * N_BLOCKS
    for c in n["calls"]:
        per_block[min(N_BLOCKS - 1, int(c["t"] // 120))] += 1
    return {
        "label": n["label"],
        "calls": len(n["calls"]),
        "calls_by_block": dict(zip(BLOCK_HOURS, per_block)),
        "real": n["real"],
        "bottleneck": {"er": HOSP_IDS[er], "hours": BLOCK_HOURS[block],
                       "ambulances_waiting_at_door_on_average": stuck[er][block]},
        "budget_steps_usd": sorted(int(b) for b in n.get("recommendation", {})),
        "note": "'real' is measured NYC data. Everything else here comes from the rehearsal (SIM).",
    }


def compare_options(night: str, budget_usd: float) -> dict:
    n = _night(night)
    options = n.get("options") or []
    steps = sorted(int(b) for b in n.get("recommendation", {}))
    affordable_steps = [s for s in steps if s <= budget_usd]
    if not affordable_steps:
        raise ToolError(f"The cheapest fix costs ${steps[0]:,}." if steps else "No planner output for this night.")
    rec_id = n["recommendation"][str(affordable_steps[-1])]
    slim = lambda o: {"id": o["id"], "label": o["label"], "cost_usd": o["cost_usd"],
                      "ambulance_hours_back": o["hours_back"], "urgent_patients_late": o["late"],
                      "urgent_minutes_saved": o.get("urgent_minutes_saved"),
                      "nurse_shifts": o["slots"], "nurse_shift_times": _describe(o["slots"]),
                      "extra_ambulances": o["extra_ambulances"]}
    rec = next(o for o in options if o["id"] == rec_id)
    return {"budget_usd": budget_usd, "recommended": slim(rec),
            "options": [slim(o) for o in options if o["cost_usd"] <= max(budget_usd, 5280)],
            "note": "Precomputed rehearsal results (SIM), averaged over 5 replays. Costs are estimates."}


def simulate_plan(night: str, nurse_shifts: list[str], extra_ambulances: int = 0, short_staffed_er: str | None = None,
                  busier_percent: float = 0, runs: int = DEFAULT_RUNS) -> dict:
    slots = _check_slots(nurse_shifts)
    if extra_ambulances not in (0, 1, 2):
        raise ToolError("extra_ambulances must be 0, 1 or 2.")
    calls, params = _conditions(night, short_staffed_er, busier_percent)
    return {"plan": {"nurse_shifts": slots, "nurse_shift_times": _describe(slots), "extra_ambulances": extra_ambulances,
                     "cost_usd": _cost(len(slots), extra_ambulances)},
            "conditions": {"short_staffed_er": short_staffed_er, "busier_percent": busier_percent},
            **_compare(calls, params, slots, extra_ambulances, runs),
            "note": f"Live rehearsal (SIM), {runs} replays of this night's real calls."}


def plan_for_conditions(night: str, budget_usd: float, short_staffed_er: str | None = None,
                        busier_percent: float = 0, runs: int = 3) -> dict:
    """Re-plan from scratch under a what-if: greedy nurse placement, then compare with ambulance options."""
    calls, params = _conditions(night, short_staffed_er, busier_percent)
    seeds = range(runs)
    max_nurses = min(MAX_SHIFTS, int(budget_usd // NURSE_SHIFT_USD))
    chosen: list[str] = []
    for _ in range(max_nurses):
        rest = [s for s in all_slots() if s not in chosen]
        best = min(rest, key=lambda s: (evaluate(calls, params, frozenset(chosen + [s]), seeds)["hours_at_hospital"], s))
        chosen.append(best)
    candidates = [(sorted(chosen[:k]), 0) for k in range(1, len(chosen) + 1)]
    for extra in (1, 2):
        for k in range(len(chosen) + 1):
            if _cost(k, extra) <= budget_usd:
                candidates.append((sorted(chosen[:k]), extra))
    if not candidates:
        raise ToolError(f"A budget of ${budget_usd:,.0f} can't buy a nurse shift (${NURSE_SHIFT_USD}).")
    results = [(slots, extra, _compare(calls, params, slots, extra, runs)) for slots, extra in candidates]
    slots, extra, best = max(results, key=lambda r: (r[2]["ambulance_hours_back"], -_cost(len(r[0]), r[1])))
    return {"best": {"nurse_shifts": slots, "nurse_shift_times": _describe(slots), "extra_ambulances": extra,
                     "cost_usd": _cost(len(slots), extra), **best},
            "conditions": {"short_staffed_er": short_staffed_er, "busier_percent": busier_percent},
            "tested": len(results),
            "note": f"Re-planned live on the rehearsal (SIM), {runs} replays per option. Costs are estimates."}


TOOLS = {"get_night": get_night, "compare_options": compare_options,
         "simulate_plan": simulate_plan, "plan_for_conditions": plan_for_conditions}

_NIGHT = {"type": "string", "enum": ["typical", "holiday", "heat"],
          "description": "typical = Typical Friday, holiday = Holiday weekend Friday, heat = Busy summer Friday."}
_SHORT = {"type": "string", "enum": ["A", "B", "C"],
          "description": "What-if: this ER has one fewer staffed handover slot all night."}
_BUSIER = {"type": "number", "description": "What-if: this percent more 911 calls than the real night (0-100)."}
_SHIFTS = {"type": "array", "items": {"type": "string"},
           "description": "Nurse shifts as '<ER>-<block>'. ER is A, B or C. Block 0=6-8 PM, 1=8-10 PM, 2=10 PM-12 AM, "
                          "3=12-2 AM, 4=2-4 AM, 5=4-6 AM. Example: ['B-1','B-2']."}

TOOL_SCHEMAS = [
    {"name": "get_night",
     "description": "Facts about one Friday night: real measured stats (urgent patients waiting over 10 min, hours "
                    "ambulances spent at hospitals), calls by 2-hour block, the ER and hours where ambulances queue "
                    "most, and the budget steps the planner has precomputed. Call this first for any question about a night.",
     "input_schema": {"type": "object", "properties": {"night": _NIGHT}, "required": ["night"]}},
    {"name": "compare_options",
     "description": "The planner's precomputed recommendation for a budget on a normal night, plus every fix it "
                    "compared (do nothing, +1/+2 ambulances, 1-6 nurse shifts, mixes) with cost, ambulance-hours back, "
                    "urgent patients late and urgent minutes saved. Fast. Use for 'what should I do with $X'.",
     "input_schema": {"type": "object", "properties": {"night": _NIGHT, "budget_usd": {"type": "number"}},
                      "required": ["night", "budget_usd"]}},
    {"name": "simulate_plan",
     "description": "Rehearse one specific plan live on the night's real calls and compare it with no fix under the "
                    "same conditions. Use to check a plan the user proposes, or a what-if (an ER short-staffed, a busier "
                    "night). Takes a few seconds.",
     "input_schema": {"type": "object", "properties": {
         "night": _NIGHT, "nurse_shifts": _SHIFTS,
         "extra_ambulances": {"type": "integer", "description": "0, 1 or 2 extra ambulances for the whole night."},
         "short_staffed_er": _SHORT, "busier_percent": _BUSIER}, "required": ["night", "nurse_shifts"]}},
    {"name": "plan_for_conditions",
     "description": "Find the best plan for a budget from scratch under a what-if (an ER short-staffed and/or a "
                    "busier night): places nurses one shift at a time where they free the most ambulance-hours, then "
                    "weighs extra ambulances. Use when conditions differ from the normal night. Takes 5-15 seconds.",
     "input_schema": {"type": "object", "properties": {
         "night": _NIGHT, "budget_usd": {"type": "number"}, "short_staffed_er": _SHORT, "busier_percent": _BUSIER},
         "required": ["night", "budget_usd"]}},
]


def run_tool(name: str, args: dict) -> str:
    """Run a tool and return JSON text; never raises for bad input."""
    fn = TOOLS.get(name)
    if fn is None:
        return json.dumps({"error": f"Unknown tool '{name}'."})
    try:
        return json.dumps(fn(**args))
    except ToolError as e:
        return json.dumps({"error": str(e)})
    except TypeError as e:
        return json.dumps({"error": f"Bad arguments: {e}"})
