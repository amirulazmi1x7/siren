"""Turn raw EMS rows into clean Friday-night calls, place them on the map, and pick demo nights.

Run: python -m pipeline.clean   (prints real stats + chosen nights)
"""
from datetime import date, timedelta

import numpy as np
import pandas as pd

from pipeline.config import CITY, HOSPITALS

# US federal holidays 2024-2026 (observed dates), used to find a "holiday weekend" Friday.
HOLIDAYS = [date.fromisoformat(d) for d in (
    "2024-01-01 2024-01-15 2024-02-19 2024-05-27 2024-06-19 2024-07-04 2024-09-02 2024-10-14 "
    "2024-11-11 2024-11-28 2024-12-25 2025-01-01 2025-01-20 2025-02-17 2025-05-26 2025-06-19 "
    "2025-07-04 2025-09-01 2025-10-13 2025-11-11 2025-11-27 2025-12-25 2026-01-01 2026-01-19 "
    "2026-02-16 2026-05-25 2026-06-19 2026-07-03 2026-09-07").split()]


def clean_calls(raw: pd.DataFrame) -> pd.DataFrame:
    ts = pd.to_datetime(raw["incident_datetime"])
    # Calls before 06:00 belong to the previous evening's night.
    night_start = (ts - pd.Timedelta(hours=18)).dt.normalize() + pd.Timedelta(hours=18)
    df = pd.DataFrame({
        "incident_id": raw["incident_id"].astype(str),
        "night": night_start.dt.date,
        "t": (ts - night_start).dt.total_seconds() / 60,
        "zip": raw["zipcode"].astype("string"),
        "severity": pd.to_numeric(raw["initial_severity_level_code"], errors="coerce").fillna(9).astype(int),
    })
    arrive = pd.to_datetime(raw["first_hosp_arrival_datetime"])
    close = pd.to_datetime(raw["incident_close_datetime"])
    df["transport"] = arrive.notna().to_numpy()
    resp = pd.to_numeric(raw["incident_response_seconds_qy"], errors="coerce") / 60
    df["response_min"] = resp.where(raw["valid_incident_rspns_time_indc"] == "Y").to_numpy()
    tah = (close - arrive).dt.total_seconds() / 60
    df["time_at_hosp_min"] = tah.where((tah > 0) & (tah <= 600)).to_numpy()
    return df[(df.t >= 0) & (df.t <= 720)].reset_index(drop=True)


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def attach_locations(df: pd.DataFrame, centroids: pd.DataFrame, seed: int = 0,
                     radius_km: float | None = None) -> pd.DataFrame:
    c = centroids.assign(zip=centroids["zip"].astype(str))
    if radius_km is not None:
        dist = np.min([haversine_km(c["lat"].to_numpy(), c["lon"].to_numpy(), h["lat"], h["lon"])
                       for h in HOSPITALS], axis=0)
        c = c[dist <= radius_km]
    out = df.merge(c, on="zip", how="inner").sort_values("incident_id").reset_index(drop=True)
    rng = np.random.default_rng(seed)
    out["lat"] = out["lat"] + rng.uniform(-0.004, 0.004, len(out))
    out["lon"] = out["lon"] + rng.uniform(-0.004, 0.004, len(out))
    hl = np.array([[h["lat"], h["lon"]] for h in HOSPITALS])
    d = (out["lat"].to_numpy()[:, None] - hl[:, 0]) ** 2 + (out["lon"].to_numpy()[:, None] - hl[:, 1]) ** 2
    out["hosp"] = [HOSPITALS[i]["id"] for i in d.argmin(axis=1)]
    return out


def pick_nights(df: pd.DataFrame) -> dict[str, date]:
    counts = df.groupby("night").size()
    near_hol = [n for n in counts.index if any(abs((n - h).days) <= 3 for h in HOLIDAYS)]
    holiday = counts[near_hol].idxmax() if near_hol else counts.idxmax()
    summer = [n for n in counts.index if n.month in (6, 7, 8) and n not in near_hol]
    heat = counts[summer].idxmax() if summer else counts.drop(holiday).idxmax()
    ordinary = counts.drop([n for n in set(near_hol) | {holiday, heat} if n in counts.index])
    if ordinary.empty:
        ordinary = counts.drop([holiday, heat], errors="ignore")
    typical = (ordinary - counts.median()).abs().idxmin()
    return {"typical": typical, "holiday": holiday, "heat": heat}


def real_stats(df: pd.DataFrame) -> dict:
    return {"median_response_min": round(float(np.nanmedian(df["response_min"])), 1),
            "median_time_at_hospital_min": round(float(np.nanmedian(df["time_at_hosp_min"])), 1)}


def load_all(raw_path: str = "data/raw/fridays.parquet", seed: int = 0) -> pd.DataFrame:
    raw = pd.read_parquet(raw_path)
    cents = pd.read_csv(CITY["centroids_csv"], dtype={"zip": str})
    return attach_locations(clean_calls(raw), cents, seed, radius_km=CITY.get("area_radius_km"))


def night_calls(df: pd.DataFrame, night: date) -> list[dict]:
    """One night's calls as simulation input, sorted by time, with ids 0..n-1."""
    n = df[df["night"] == night].sort_values("t").reset_index(drop=True)
    return [{"id": i, "t": float(r.t), "lat": float(r.lat), "lon": float(r.lon), "hosp": r.hosp,
             "severity": int(r.severity), "transport": bool(r.transport)} for i, r in enumerate(n.itertuples())]


if __name__ == "__main__":
    df = load_all()
    print("calls:", len(df), "nights:", df.night.nunique())
    print("real stats:", real_stats(df))
    print("nights:", {k: (v.isoformat(), int((df.night == v).sum())) for k, v in pick_nights(df).items()})
    print("calls per hospital:", df.hosp.value_counts().to_dict())
