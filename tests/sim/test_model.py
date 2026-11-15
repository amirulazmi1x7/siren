from sim.model import SimParams, run_night
from tests.sim.toy import jammed_a_night

# A small local fleet and most patients going to hospital A, so A's door is busy but not hopeless.
TIGHT = SimParams(n_ambulances=10, door_capacity=((3,) * 6,) * 3, handoff_mean_min=30)
CONSERVATIVE = SimParams(n_ambulances=10, door_capacity=((3,) * 6,) * 3, handoff_mean_min=30,
                         nurse_handoff_min=30, nurse_patients=3)


def test_same_seed_same_result():
    calls = jammed_a_night()
    a, b = run_night(calls, TIGHT, seed=4), run_night(calls, TIGHT, seed=4)
    assert a.late_ids == b.late_ids and a.stuck == b.stuck


def test_nurse_never_increases_late_count():
    calls = jammed_a_night()
    for params in (TIGHT, CONSERVATIVE):
        for seed in range(5):
            base = run_night(calls, params, seed=seed)
            nurse = run_night(calls, params, frozenset({"A-2", "A-3"}), seed=seed)
            assert len(nurse.late_ids) <= len(base.late_ids)


def test_nurse_shortens_door_queue_in_its_block():
    calls = jammed_a_night()
    base = run_night(calls, TIGHT, seed=0)
    nurse = run_night(calls, TIGHT, frozenset({"A-3"}), seed=0)
    assert nurse.stuck[0][3] < base.stuck[0][3]
    assert nurse.door_wait_min[0][3] < base.door_wait_min[0][3]


def test_nurse_releases_crews_within_nurse_handoff_time():
    calls = jammed_a_night()
    nurse = run_night(calls, TIGHT, frozenset({"A-3"}), seed=0)
    assert nurse.door_wait_min[0][3] <= TIGHT.nurse_handoff_min + 15   # most crews leave by ~20 min


def test_extra_ambulances_reduce_response():
    calls = jammed_a_night()
    base = run_night(calls, TIGHT, seed=0)
    more = run_night(calls, TIGHT, extra_ambulances=4, seed=0)
    assert sum(more.response_min.values()) < sum(base.response_min.values())


def test_no_transport_calls_never_reach_door():
    calls = [dict(c, transport=False) for c in jammed_a_night()]
    r = run_night(calls, TIGHT, seed=0)
    assert r.time_at_hosp_min == []
    assert all(v == 0 for row in r.stuck for v in row)


def test_late_means_urgent_and_over_10_minutes():
    calls = jammed_a_night()
    r = run_night(calls, TIGHT, seed=0)
    sev = {c["id"]: c["severity"] for c in calls}
    assert set(r.response_min) == {c["id"] for c in calls}           # every call answered
    assert set(r.late_ids) == {i for i, v in r.response_min.items() if v > 10 and sev[i] <= 3}


def test_shapes():
    r = run_night(jammed_a_night(), TIGHT, seed=0)
    assert len(r.stuck) == 3 and all(len(row) == 6 for row in r.stuck)
    assert len(r.door_wait_min) == 3 and all(len(row) == 6 for row in r.door_wait_min)


def test_hosp_visits_match_time_at_hosp():
    r = run_night(jammed_a_night(), TIGHT, seed=0)
    assert sorted(v for _, _, v in r.hosp_visits) == sorted(r.time_at_hosp_min)
    assert all(h in "ABC" and 0 <= b < 6 for h, b, _ in r.hosp_visits)


def test_outside_unit_covers_urgent_calls_when_local_fleet_is_busy():
    # 2 local ambulances can't cover a busy night; outside units keep URGENT responses bounded
    p = SimParams(n_ambulances=2, door_capacity=((3,) * 6,) * 3, handoff_mean_min=30, outside_travel_min=14)
    calls = jammed_a_night()
    r = run_night(calls, p, seed=0)
    urgent = [c["id"] for c in calls if c["severity"] <= 3]
    assert max(r.response_min[i] for i in urgent) <= p.dispatch_delay_min + 1.5 * p.outside_travel_min + 0.01
    assert r.outside_responses > 0


def test_non_urgent_calls_wait_for_local_units_never_outside():
    p = SimParams(n_ambulances=2, door_capacity=((3,) * 6,) * 3, handoff_mean_min=30, outside_travel_min=14)
    calls = jammed_a_night()
    r = run_night(calls, p, seed=0)
    n_urgent = sum(c["severity"] <= 3 for c in calls)
    assert r.outside_responses <= n_urgent
    non_urgent = [r.response_min[c["id"]] for c in calls if c["severity"] > 3]
    assert max(non_urgent) > 1.5 * p.outside_travel_min      # held calls wait longer than any outside unit


def test_stuck_local_fleet_means_more_outside_responses():
    base = run_night(jammed_a_night(), TIGHT, seed=0)
    nurse = run_night(jammed_a_night(), TIGHT, frozenset({"A-2", "A-3"}), seed=0)
    assert nurse.outside_responses <= base.outside_responses
