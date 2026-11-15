from datetime import date

import pandas as pd
import pytest

from pipeline.clean import night_calls
from sim.calibrate import calibrate, capacity_grid, sim_stats, within_tolerance
from sim.model import SimParams
from tests.sim.toy import jammed_a_night


def test_within_tolerance():
    target = {"median_response_min": 10.1, "median_time_at_hospital_min": 44.3}
    assert within_tolerance({"median_response_min": 10.8, "median_time_at_hospital_min": 42.0}, target)
    assert not within_tolerance({"median_response_min": 12.0, "median_time_at_hospital_min": 44.3}, target)


def test_capacity_grid_slows_the_slowest_cells():
    real = [[43, 44, 45, 44, 43, 41], [46, 47, 46, 47, 45, 41], [42, 44, 44, 44, 43, 40]]
    cap = capacity_grid(real, base=3)
    assert cap[1][1] == 2 and cap[1][3] == 2          # B's slowest blocks lose one handoff slot
    assert cap[0][0] == 3 and cap[2][5] == 3
    assert capacity_grid(real, base=1)[1][1] == 1     # never below 1


def test_calibrate_recovers_known_settings():
    nights = {"toy": jammed_a_night()}
    truth = SimParams(n_ambulances=16, handoff_mean_min=30, door_capacity=((2,) * 6,) * 3)
    target = sim_stats(nights, truth, seeds=range(2))
    grid = {"n_ambulances": [12, 16, 20], "base_cap": [2], "handoff_mean_min": [20, 30, 40], "speed_kmh": [25.0]}
    got = calibrate(nights, target, real_grid=[[0] * 6] * 3, grid=grid, seeds=range(2))
    assert (got.n_ambulances, got.handoff_mean_min) == (16, 30)


def test_night_calls_builds_sim_input():
    df = pd.DataFrame({"night": [date(2026, 8, 21)] * 2 + [date(2026, 8, 28)], "t": [5.0, 1.0, 3.0],
                       "lat": [40.6] * 3, "lon": [-73.9] * 3, "hosp": ["A", "B", "C"],
                       "severity": [2, 5, 1], "transport": [True, False, True]})
    calls = night_calls(df, date(2026, 8, 21))
    assert [c["t"] for c in calls] == [1.0, 5.0]
    assert set(calls[0]) == {"id", "t", "lat", "lon", "hosp", "severity", "transport"}
    assert [c["id"] for c in calls] == [0, 1]


def test_sim_stats_reports_curves_by_block():
    s = sim_stats({"toy": jammed_a_night()}, SimParams(n_ambulances=10), seeds=range(1))
    assert len(s["response_by_block"]) == 6 and len(s["tah_by_block"]) == 6


def test_calibrate_prefers_matching_shape_not_just_overall():
    nights = {"toy": jammed_a_night()}
    truth = SimParams(n_ambulances=10, handoff_mean_min=30, door_capacity=((3,) * 6,) * 3, outside_travel_min=16)
    target = sim_stats(nights, truth, seeds=range(2))
    grid = {"n_ambulances": [6, 10, 14], "base_cap": [3], "handoff_mean_min": [30.0],
            "speed_kmh": [25.0], "outside_travel_min": [12.0, 16.0]}
    got = calibrate(nights, target, real_grid=[[0] * 6] * 3, grid=grid, seeds=range(2))
    assert (got.n_ambulances, got.outside_travel_min) == (10, 16)


def test_sim_stats_reports_urgent_late_share():
    calls = jammed_a_night()
    s = sim_stats({"toy": calls}, SimParams(n_ambulances=10), seeds=range(1))
    assert 0 <= s["urgent_late_share"] <= 1
    assert len(s["late_share_by_block"]) == 6
    assert s["urgent_median_response_min"] > 0


def test_real_targets_include_urgent_late_share():
    from sim.calibrate import real_targets
    df = pd.DataFrame({"t": [10.0, 20.0, 130.0, 140.0], "severity": [1, 2, 3, 6],
                       "response_min": [5.0, 12.0, 15.0, 30.0], "time_at_hosp_min": [40.0, 44.0, 50.0, None]})
    r = real_targets(df)
    assert r["urgent_late_share"] == pytest.approx(2 / 3, abs=1e-3)
    assert r["urgent_median_response_min"] == 12.0
    assert r["late_share_by_block"][:2] == [0.5, 1.0]
