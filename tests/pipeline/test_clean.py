from datetime import date

import numpy as np
import pandas as pd
import pytest

from pipeline.clean import attach_locations, clean_calls, real_stats


def _raw(**over):
    row = {"incident_id": "1", "incident_datetime": "2026-09-11T19:00:00.000",
           "initial_severity_level_code": "3", "zipcode": "11217",
           "valid_incident_rspns_time_indc": "Y", "incident_response_seconds_qy": "600",
           "first_hosp_arrival_datetime": "2026-09-11T19:30:00.000",
           "incident_close_datetime": "2026-09-11T20:12:00.000"}
    row.update(over)
    return row


def test_after_midnight_belongs_to_friday_night():
    df = clean_calls(pd.DataFrame([_raw(incident_datetime="2026-09-12T01:30:00.000")]))
    assert df.night.iloc[0] == date(2026, 9, 11)
    assert df.t.iloc[0] == pytest.approx(450)


def test_untransported_call_kept_with_nan_time_at_hosp():
    df = clean_calls(pd.DataFrame([_raw(first_hosp_arrival_datetime=None)]))
    assert len(df) == 1
    assert not df.transport.iloc[0]
    assert np.isnan(df.time_at_hosp_min.iloc[0])


def test_time_at_hosp_outliers_dropped():
    rows = [_raw(incident_id="1", incident_close_datetime="2026-09-11T19:25:00.000"),   # -5
            _raw(incident_id="2", incident_close_datetime="2026-09-12T07:10:00.000"),   # 700
            _raw(incident_id="3", incident_close_datetime="2026-09-11T20:12:00.000")]   # 42
    df = clean_calls(pd.DataFrame(rows)).set_index("incident_id")
    assert np.isnan(df.loc["1", "time_at_hosp_min"])
    assert np.isnan(df.loc["2", "time_at_hosp_min"])
    assert df.loc["3", "time_at_hosp_min"] == pytest.approx(42)


def test_invalid_response_time_is_nan():
    df = clean_calls(pd.DataFrame([_raw(valid_incident_rspns_time_indc="N")]))
    assert np.isnan(df.response_min.iloc[0])


def test_attach_locations_nearest_hospital_and_jitter_is_deterministic():
    df = clean_calls(pd.DataFrame([_raw(), _raw(incident_id="2", zipcode="99999")]))
    cents = pd.DataFrame({"zip": ["11217"], "lat": [40.655], "lon": [-73.945]})
    a = attach_locations(df, cents, seed=1)
    b = attach_locations(df, cents, seed=1)
    assert len(a) == 1                       # unknown zip dropped
    assert a.hosp.iloc[0] == "A"             # sits on hospital A
    assert abs(a.lat.iloc[0] - 40.655) <= 0.004
    assert a.lat.iloc[0] == b.lat.iloc[0]


def test_real_stats_medians():
    df = pd.DataFrame({"response_min": [8, 9, 10, np.nan], "time_at_hosp_min": [40, 42, np.nan, 50]})
    s = real_stats(df)
    assert s == {"median_response_min": 9.0, "median_time_at_hospital_min": 42.0}


def test_pick_nights_are_distinct_and_typical_avoids_holidays():
    from pipeline.clean import pick_nights
    nights = {date(2025, 7, 4): 800, date(2025, 8, 15): 700, date(2025, 3, 7): 600,
              date(2025, 3, 14): 610, date(2025, 3, 21): 590, date(2025, 7, 11): 605}
    df = pd.DataFrame({"night": [n for n, c in nights.items() for _ in range(c)]})
    p = pick_nights(df)
    assert p["holiday"] == date(2025, 7, 4)
    assert p["heat"] == date(2025, 8, 15)          # busiest summer night that isn't the holiday pick
    assert len(set(p.values())) == 3
    assert p["typical"] not in (date(2025, 7, 4),)


def test_attach_locations_keeps_only_zips_within_radius():
    df = clean_calls(pd.DataFrame([_raw(incident_id="1", zipcode="11213"),
                                   _raw(incident_id="2", zipcode="11206")]))
    cents = pd.DataFrame({"zip": ["11213", "11206"],
                          "lat": [40.671155, 40.701870], "lon": [-73.936266, -73.942552]})
    out = attach_locations(df, cents, seed=0, radius_km=2.5)
    assert list(out.zip) == ["11213"]       # 11206 is 2.67 km from the nearest hospital


def test_summer_night_skips_any_holiday_week():
    from pipeline.clean import pick_nights
    nights = {date(2025, 7, 4): 330, date(2026, 7, 3): 320, date(2026, 8, 14): 290,
              date(2026, 3, 6): 240, date(2026, 3, 13): 238}
    df = pd.DataFrame({"night": [n for n, c in nights.items() for _ in range(c)]})
    assert pick_nights(df)["heat"] == date(2026, 8, 14)


def test_night_real_stats_counts_late_urgent_and_hospital_hours():
    from pipeline.clean import night_real_stats
    df = pd.DataFrame({"response_min": [12.0, 8.0, 15.0, np.nan], "severity": [2, 3, 6, 1],
                       "time_at_hosp_min": [60.0, 30.0, np.nan, 30.0]})
    s = night_real_stats(df)
    assert s["urgent_calls"] == 2 and s["urgent_late"] == 1          # sev 6 not urgent; NaN response skipped
    assert s["hours_at_hospital"] == 2.0
    assert s["median_response_min"] == 12.0
