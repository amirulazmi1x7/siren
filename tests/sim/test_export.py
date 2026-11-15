from shared.contract import validate_scenarios
from sim.export import build_night, build_scenarios, result_to_json
from sim.model import SimParams, run_night
from tests.sim.toy import jammed_a_night

TIGHT = SimParams(n_ambulances=10, door_capacity=((3,) * 6,) * 3, handoff_mean_min=30)
REAL = {"median_response_min": 10.0, "median_time_at_hospital_min": 44.0}


def _night():
    return build_night("typical", jammed_a_night(n=40), TIGHT, REAL, "Typical Friday (2026-08-21)",
                       max_k=1, seeds=range(2))


def test_result_to_json_has_contract_fields_and_hours():
    out = result_to_json(run_night(jammed_a_night(n=40), TIGHT, seed=0))
    assert set(out) == {"late_ids", "stuck", "door_wait_min", "hours_at_hospital"}
    assert all(v == round(v, 1) for row in out["stuck"] for v in row)


def test_build_night_lookup_and_ai_plans():
    n = _night()
    assert len(n["lookup"]) == 19                      # empty plan + 18 single shifts
    assert sorted(n["ai_plans"], key=int) == [str(k) for k in range(1, 7)]
    assert all(len(p["slots"]) == int(k) for k, p in n["ai_plans"].items())


def test_options_and_recommendation():
    n = _night()
    opts = {o["id"]: o for o in n["options"]}
    assert {"nothing", "amb1", "amb2", "nurses1", "nurses6", "amb1_nurses2"} <= set(opts)
    assert opts["nothing"]["hours_back"] == 0 and opts["nothing"]["cost_usd"] == 0
    assert opts["amb2"]["extra_ambulances"] == 2 and opts["nurses3"]["slots"] == n["ai_plans"]["3"]["slots"]
    for budget, oid in n["recommendation"].items():
        best = opts[oid]
        affordable = [o for o in opts.values() if o["cost_usd"] <= int(budget)]
        assert best["cost_usd"] <= int(budget)
        assert best["hours_back"] == max(o["hours_back"] for o in affordable)


def test_full_file_passes_the_contract():
    nights = {k: (jammed_a_night(n=40, seed=s), REAL, f"{k} night") for s, k in enumerate(("typical", "holiday", "heat"))}
    d = build_scenarios(nights, TIGHT, max_k=1, seeds=range(2))
    assert validate_scenarios(d) == []
    assert d["fake"] is False and "area_real" not in d or isinstance(d.get("area_real"), dict)
