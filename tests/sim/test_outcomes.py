import math

from sim.optimize import evaluate
from sim.outcomes import ARREST_SEVERITY, arrest_survival
from tests.sim.test_optimize import TIGHT
from tests.sim.toy import jammed_a_night


def test_survival_is_anchored_and_falls_8_percent_in_odds_per_minute():
    assert abs(arrest_survival(8) - 0.10) < 1e-9
    odds = lambda p: p / (1 - p)
    assert abs(odds(arrest_survival(9)) / odds(arrest_survival(8)) - 0.92) < 1e-9
    assert arrest_survival(4) > arrest_survival(12)


def test_evaluate_reports_urgent_minutes_and_arrest_survival():
    calls = jammed_a_night()
    e = evaluate(calls, TIGHT, frozenset(), seeds=range(2))
    assert e["urgent_response_min"] > 0
    n_arrest = sum(c["severity"] == ARREST_SEVERITY for c in calls)
    assert 0 <= e["arrest_survivors"] <= n_arrest


def test_nurses_save_urgent_minutes():
    calls = jammed_a_night()
    base = evaluate(calls, TIGHT, frozenset(), seeds=range(3))
    nurse = evaluate(calls, TIGHT, frozenset({"A-2", "A-3"}), seeds=range(3))
    assert nurse["urgent_response_min"] < base["urgent_response_min"]
    assert nurse["arrest_survivors"] >= base["arrest_survivors"] - 1e-9


def test_highlight_prefers_a_call_the_plan_brings_under_10_minutes():
    from sim.outcomes import pick_highlight
    calls = [{"id": 0, "t": 10.0, "severity": 2, "hosp": "A", "lat": 1.0, "lon": 2.0},
             {"id": 1, "t": 20.0, "severity": 3, "hosp": "B", "lat": 1.0, "lon": 2.0},
             {"id": 2, "t": 30.0, "severity": 6, "hosp": "C", "lat": 1.0, "lon": 2.0}]
    before = {0: 13.0, 1: 30.0, 2: 40.0}
    after = {0: 7.0, 1: 22.0, 2: 5.0}          # call 1 improves most but stays late; call 2 is not urgent
    h = pick_highlight(calls, before, after)
    assert h["id"] == 0 and h["before_min"] == 13.0 and h["after_min"] == 7.0 and h["severity"] == 2


def test_highlight_falls_back_to_biggest_gain_and_none_when_nothing_improves():
    from sim.outcomes import pick_highlight
    calls = [{"id": 0, "t": 1.0, "severity": 1, "hosp": "A", "lat": 1.0, "lon": 2.0}]
    assert pick_highlight(calls, {0: 20.0}, {0: 15.0})["id"] == 0
    assert pick_highlight(calls, {0: 9.0}, {0: 9.0}) is None
