from sim.model import SimParams, run_night
from sim.optimize import all_plan_keys, all_slots, evaluate, greedy_plans, hours_at_hospital, score
from tests.sim.toy import jammed_a_night

TIGHT = SimParams(n_ambulances=10, door_capacity=((3,) * 6,) * 3, handoff_mean_min=30)


def test_eighteen_slots_and_4048_plans_up_to_four_shifts():
    assert len(all_slots()) == 18
    keys = all_plan_keys()
    assert len(keys) == 4048 and len(set(keys)) == 4048
    assert "" in keys and "A-0,A-1,A-2,A-3" in keys


def test_hours_at_hospital_sums_visits():
    r = run_night(jammed_a_night(), TIGHT, seed=0)
    assert abs(hours_at_hospital(r) - sum(v for _, _, v in r.hosp_visits) / 60) < 1e-9


def test_nurse_gives_back_ambulance_hours():
    calls = jammed_a_night()
    base = evaluate(calls, TIGHT, frozenset(), seeds=range(3))
    nurse = evaluate(calls, TIGHT, frozenset({"A-2", "A-3"}), seeds=range(3))
    assert nurse["hours_at_hospital"] < base["hours_at_hospital"]
    assert nurse["late"] <= base["late"]


def test_score_ranks_freed_hours_first():
    calls = jammed_a_night()
    good, useless = score(calls, TIGHT, frozenset({"A-3"}), range(2)), score(calls, TIGHT, frozenset({"C-0"}), range(2))
    assert good < useless


def test_greedy_plans_grow_by_one_shift_and_start_at_the_jammed_er():
    plans = greedy_plans(jammed_a_night(), TIGHT, max_budget=3, seeds=range(2))
    assert sorted(plans) == [1, 2, 3]
    for k in plans:
        assert len(plans[k]) == k == len(set(plans[k]))
        if k > 1:
            assert set(plans[k - 1]) <= set(plans[k])
    assert plans[1][0].startswith("A-")
