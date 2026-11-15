import json

import pytest

from chat import tools

NIGHT = "typical"


def call(name, **kw):
    return json.loads(tools.run_tool(name, kw))


def test_get_night_reports_real_stats_and_bottleneck():
    r = call("get_night", night=NIGHT)
    assert r["real"]["urgent_late"] == 26 and r["calls"] == 238
    assert r["bottleneck"]["er"] in "ABC" and "PM" in r["bottleneck"]["hours"] or "AM" in r["bottleneck"]["hours"]


def test_compare_options_returns_the_planners_pick_within_budget():
    r = call("compare_options", night=NIGHT, budget_usd=900)
    assert r["recommended"]["cost_usd"] <= 900
    assert any(o["id"] == "amb1" for o in r["options"])


def test_simulate_plan_with_nothing_changes_nothing():
    r = call("simulate_plan", night=NIGHT, nurse_shifts=[], runs=2)
    assert r["ambulance_hours_back"] == 0 and r["fewer_people_late"] == 0


def test_short_staffed_er_makes_the_night_worse():
    normal = call("simulate_plan", night=NIGHT, nurse_shifts=[], runs=2)
    short = call("simulate_plan", night=NIGHT, nurse_shifts=[], short_staffed_er="B", runs=2)
    assert short["no_fix"]["ambulance_hours_at_hospital"] > normal["no_fix"]["ambulance_hours_at_hospital"]


def test_plan_for_conditions_stays_within_budget():
    r = call("plan_for_conditions", night=NIGHT, budget_usd=540, short_staffed_er="A", runs=2)
    assert r["best"]["cost_usd"] <= 540 and len(r["best"]["nurse_shifts"]) <= 3


def test_bad_input_returns_a_readable_error():
    r = call("simulate_plan", night="monday", nurse_shifts=[])
    assert "error" in r
    r = call("simulate_plan", night=NIGHT, nurse_shifts=["Z-9"])
    assert "error" in r
