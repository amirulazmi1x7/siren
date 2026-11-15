"""Step 7: run the twin on the demo nights and write web/data/scenarios.json for the page.

Per night it stores:
  - the calls (map dots), REAL stats, and SIM results for: do nothing, +2 ambulances, the AI plan for 1-6 shifts,
    and a lookup of every plan of up to 4 shifts (so any grid the user taps has a precomputed answer);
  - `options`: every fix the planner compared, with cost, ambulance-hours back on the road, and late patients;
  - `recommendation`: for each budget, the option that gives back the most ambulance-hours (cheapest on ties).

"Ambulance-hours back" = hours no longer spent at hospitals (nurses) + 12 h of road time per extra ambulance.

Run: python -m sim.export
"""
import json
import sys
from datetime import datetime
from pathlib import Path

from pipeline.config import AMB_EACH_NIGHT_USD, AMB_NIGHT_USD, BLOCKS, CITY, HOSPITALS, NURSE_SHIFT_USD
from shared.contract import MAX_LOOKUP_SHIFTS, validate_scenarios
from sim.model import NightResult, SimParams, run_night
from sim.optimize import all_plan_keys, evaluate, greedy_plans, hours_at_hospital

NIGHT_HOURS = 12
LABELS = {"typical": "Typical Friday", "holiday": "Holiday weekend Friday", "heat": "Busy summer Friday"}


def _r1(grid):
    return [[round(v, 1) for v in row] for row in grid]


def result_to_json(r: NightResult) -> dict:
    return {"late_ids": list(r.late_ids), "stuck": _r1(r.stuck), "door_wait_min": _r1(r.door_wait_min),
            "hours_at_hospital": round(hours_at_hospital(r), 1)}


def _option(oid, label, slots, extra, e, base_hours) -> dict:
    return {"id": oid, "label": label, "slots": slots, "extra_ambulances": extra,
            "cost_usd": len(slots) * NURSE_SHIFT_USD + extra * AMB_EACH_NIGHT_USD,
            "hours_back": round(base_hours - e["hours_at_hospital"] + extra * NIGHT_HOURS, 1),
            "hours_at_hospital": e["hours_at_hospital"], "late": e["late"]}


def build_options(calls, params, plans: dict[int, list[str]], seeds) -> list[dict]:
    base = evaluate(calls, params, seeds=seeds)
    h0 = base["hours_at_hospital"]
    opts = [_option("nothing", "Do nothing", [], 0, base, h0)]
    for m in (1, 2):
        opts.append(_option(f"amb{m}", f"+{m} ambulance{'s' if m > 1 else ''}", [], m,
                            evaluate(calls, params, seeds=seeds, extra_ambulances=m), h0))
    for k, slots in plans.items():
        opts.append(_option(f"nurses{k}", f"{k} nurse shift{'s' if k > 1 else ''}", slots, 0,
                            evaluate(calls, params, frozenset(slots), seeds), h0))
    for k in range(1, 5):
        slots = plans[k]
        opts.append(_option(f"amb1_nurses{k}", f"+1 ambulance & {k} nurse shift{'s' if k > 1 else ''}", slots, 1,
                            evaluate(calls, params, frozenset(slots), seeds, extra_ambulances=1), h0))
    return opts


def recommend(options: list[dict]) -> dict[str, str]:
    """For each budget (every distinct option cost), the affordable option with the most hours back."""
    out = {}
    for budget in sorted({o["cost_usd"] for o in options if o["cost_usd"] > 0}):
        affordable = [o for o in options if o["cost_usd"] <= budget]
        out[str(budget)] = max(affordable, key=lambda o: (o["hours_back"], -o["cost_usd"]))["id"]
    return out


def build_night(name, calls, params: SimParams, real: dict, label: str, seed: int = 0,
                max_k: int = MAX_LOOKUP_SHIFTS, seeds=range(5)) -> dict:
    plans = greedy_plans(calls, params, 6, seeds)
    lookup = {}
    for key in all_plan_keys(max_k):
        lookup[key] = result_to_json(run_night(calls, params, frozenset(key.split(",")) if key else frozenset(),
                                               seed=seed))
    ai = {str(k): {"slots": s, **result_to_json(run_night(calls, params, frozenset(s), seed=seed))}
          for k, s in plans.items()}
    options = build_options(calls, params, plans, seeds)
    return {
        "label": label,
        "calls": [{"id": c["id"], "t": round(c["t"], 1), "lat": round(c["lat"], 5), "lon": round(c["lon"], 5),
                   "hosp": c["hosp"], "severity": c["severity"], "transport": c.get("transport", True)} for c in calls],
        "real": real,
        "baseline": lookup[""],
        "ambulances_plus2": result_to_json(run_night(calls, params, extra_ambulances=2, seed=seed)),
        "ai_plans": ai,
        "lookup": lookup,
        "options": options,
        "recommendation": recommend(options),
    }


def build_scenarios(nights: dict[str, tuple[list[dict], dict, str]], params: SimParams,
                    max_k: int = MAX_LOOKUP_SHIFTS, seeds=range(5), area_real: dict | None = None) -> dict:
    d = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "fake": False,
        "city": {"name": CITY["name"], "area": CITY["area"]},
        "blocks": BLOCKS,
        "hospitals": [{"id": h["id"], "lat": h["lat"], "lon": h["lon"]} for h in HOSPITALS],
        "costs": {"nurse_shift_usd": NURSE_SHIFT_USD, "ambulance_night_usd": AMB_NIGHT_USD,
                  "ambulance_each_night_usd": AMB_EACH_NIGHT_USD},
        "nights": {name: build_night(name, calls, params, real, label, max_k=max_k, seeds=seeds)
                   for name, (calls, real, label) in nights.items()},
    }
    if area_real:
        d["area_real"] = area_real
    return d


def area_real_stats(df) -> dict:
    per_night = df.groupby("night")["time_at_hosp_min"].sum() / 60
    return {"median_time_at_hospital_min": round(float(df["time_at_hosp_min"].median()), 1),
            "ambulance_hours_per_friday": round(float(per_night.median()), 1),
            "benchmark_offload_min": 20}


def main() -> None:
    from pipeline.clean import load_all, night_calls, pick_nights, real_stats
    from sim.calibrate import load_params
    df, params = load_all(), load_params()
    nights = {}
    for name, night in pick_nights(df).items():
        nights[name] = (night_calls(df, night), real_stats(df[df["night"] == night]),
                        f"{LABELS[name]} ({night.isoformat()})")
    d = build_scenarios(nights, params, area_real=area_real_stats(df))
    errors = validate_scenarios(d)
    if errors:
        print("\n".join(errors[:20]))
        sys.exit(1)
    out = Path("web/data/scenarios.json")
    out.write_text(json.dumps(d, separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    for name, n in d["nights"].items():
        opts = {o["id"]: o for o in n["options"]}
        print(f"\n{n['label']}")
        for b, oid in n["recommendation"].items():
            o = opts[oid]
            print(f"  budget ${b:>5}: {o['label']:<30} ${o['cost_usd']:>5}  {o['hours_back']:5.1f} h back  late {o['late']}")


if __name__ == "__main__":
    main()
