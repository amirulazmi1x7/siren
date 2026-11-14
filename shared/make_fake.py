"""Write a contract-valid FAKE web/data/scenarios.json so the page can be built
before Person A's real export (Task A6) lands.

The numbers come from a tiny toy model, not the simulation. Every night label
says "FAKE DATA" so nobody mistakes them for results. The city/hospital values
below are placeholders for the fake file only; the real ones live in
pipeline/config.py.

Run:  python -m shared.make_fake
"""
from __future__ import annotations

import itertools
import json
from datetime import datetime
from pathlib import Path

import numpy as np

from shared.contract import HOSPITAL_IDS, N_BLOCKS, plan_key

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "scenarios.json"

FAKE_CITY = {"name": "New York City", "area": "Brooklyn"}
BLOCKS = ["6-8P", "8-10P", "10P-12A", "12-2A", "2-4A", "4-6A"]
FAKE_HOSPITALS = [
    {"id": "A", "lat": 40.656, "lon": -73.944},  # central
    {"id": "B", "lat": 40.586, "lon": -73.965},  # south
    {"id": "C", "lat": 40.677, "lon": -73.896},  # east
]
COSTS = {"nurse_shift_usd": 180, "ambulance_night_usd": 3600}

# Rough neighborhood centers, used only to scatter fake calls over land.
ANCHORS = [
    (40.708, -73.957), (40.727, -73.951), (40.694, -73.921), (40.687, -73.941),
    (40.669, -73.943), (40.641, -73.959), (40.645, -73.930), (40.663, -73.910),
    (40.666, -73.882), (40.640, -73.901), (40.671, -73.977), (40.645, -74.010),
    (40.626, -74.030), (40.604, -73.994), (40.633, -73.990), (40.591, -73.944),
    (40.578, -73.975), (40.693, -73.987), (40.622, -73.932),
]
BLOCK_WEIGHTS = [0.17, 0.19, 0.20, 0.18, 0.14, 0.12]

# name -> (call count, how jammed hospital doors are, label date)
NIGHTS = {
    "typical": (380, 1.0, "Typical Friday", "2026-09-12"),
    "holiday": (470, 1.25, "Holiday weekend Friday", "2025-12-26"),
    "heat": (440, 1.15, "Heat wave Friday", "2025-07-25"),
}

HANDOFF_MIN = 25.0
CLEANUP_MIN = 10.0
LATE_MIN = 10.0
# base offload capacity per hospital per block; A is the jammed one
BASE_CAP = np.array([
    [2, 2, 1, 1, 1, 2],
    [2, 2, 2, 2, 2, 2],
    [2, 2, 2, 1, 2, 2],
], dtype=float)

ALL_SLOTS = [f"{h}-{b}" for h in HOSPITAL_IDS for b in range(N_BLOCKS)]


def _gen_calls(rng: np.random.Generator, n: int) -> list[dict]:
    blocks = rng.choice(N_BLOCKS, size=n, p=BLOCK_WEIGHTS)
    t = np.sort(blocks * 120 + rng.uniform(0, 120, size=n))
    anchors = rng.integers(0, len(ANCHORS), size=n)
    hlat = np.array([h["lat"] for h in FAKE_HOSPITALS])
    hlon = np.array([h["lon"] for h in FAKE_HOSPITALS])
    calls = []
    for i in range(n):
        lat = ANCHORS[anchors[i]][0] + rng.uniform(-0.006, 0.006)
        lon = ANCHORS[anchors[i]][1] + rng.uniform(-0.006, 0.006)
        h = int(np.argmin((hlat - lat) ** 2 + ((hlon - lon) * 0.76) ** 2))
        calls.append({
            "id": i,
            "t": round(float(min(t[i], 720.0)), 1),
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "hosp": HOSPITAL_IDS[h],
            "severity": int(rng.integers(1, 6)),
        })
    return calls


class _ToyNight:
    """Toy door-queue model. More capacity at a door -> fewer stuck -> faster responses."""

    def __init__(self, calls: list[dict], jam: float, rng: np.random.Generator):
        self.ids = np.array([c["id"] for c in calls])
        self.block = np.array([min(int(c["t"] // 120), N_BLOCKS - 1) for c in calls])
        self.hosp = np.array([HOSPITAL_IDS.index(c["hosp"]) for c in calls])
        transported = rng.random(len(calls)) < 0.65
        self.arrivals = np.zeros((3, N_BLOCKS))
        np.add.at(self.arrivals, (self.hosp[transported], self.block[transported]), 1)
        self.jam = jam
        # each call's response time if no ambulance were stuck anywhere (common random numbers)
        self.r0 = 3.0 + rng.gamma(2.0, 1.5, size=len(calls))

    def result(self, slots=(), extra_ambulances: int = 0) -> dict:
        cap = BASE_CAP.copy()
        for s in slots:
            h, b = s.split("-")
            cap[HOSPITAL_IDS.index(h), int(b)] += 1
        busy = self.arrivals * HANDOFF_MIN / 120.0 * self.jam  # ambulances needing the door at once
        stuck = np.maximum(0.0, busy - cap * 0.8) * 1.6
        door_wait = HANDOFF_MIN + CLEANUP_MIN + stuck / cap * HANDOFF_MIN
        total = stuck.sum(axis=0)
        resp = (
            self.r0
            + 0.12 * total[self.block]
            + 0.35 * stuck[self.hosp, self.block]
            - 0.6 * extra_ambulances
        )
        late = self.ids[resp > LATE_MIN]
        return {
            "late_ids": [int(i) for i in late],
            "stuck": np.round(stuck, 1).tolist(),
            "door_wait_min": np.round(door_wait, 1).tolist(),
        }


def _greedy(model: _ToyNight, max_budget: int = 6) -> dict[str, dict]:
    chosen: list[str] = []
    plans = {}
    for k in range(1, max_budget + 1):
        best = None
        for s in ALL_SLOTS:
            if s in chosen:
                continue
            r = model.result(chosen + [s])
            score = (len(r["late_ids"]), sum(map(sum, r["stuck"])), s)
            if best is None or score < best[0]:
                best = (score, s)
        chosen.append(best[1])
        slots = sorted(chosen)
        plans[str(k)] = {"slots": slots, **model.result(slots)}
    return plans


def _build_night(name: str, seed: int) -> dict:
    n, jam, label, date = NIGHTS[name]
    rng = np.random.default_rng(seed)
    calls = _gen_calls(rng, n)
    model = _ToyNight(calls, jam, rng)
    lookup = {}
    for k in range(0, 5):
        for combo in itertools.combinations(ALL_SLOTS, k):
            lookup[plan_key(combo)] = model.result(combo)
    return {
        "label": f"{label} ({date}) - FAKE DATA",
        "calls": calls,
        "real": {"median_response_min": 8.6, "median_time_at_hospital_min": 42.7},
        "baseline": lookup[""],
        "ambulances_plus2": model.result(extra_ambulances=2),
        "ai_plans": _greedy(model),
        "lookup": lookup,
    }


def make_fake(seed: int = 7) -> dict:
    return {
        "generated_at": datetime.now().replace(microsecond=0).isoformat(),
        "fake": True,
        "city": dict(FAKE_CITY),
        "blocks": list(BLOCKS),
        "hospitals": [dict(h) for h in FAKE_HOSPITALS],
        "costs": dict(COSTS),
        "nights": {name: _build_night(name, seed + i) for i, name in enumerate(NIGHTS)},
    }


def main() -> None:
    d = make_fake()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(d, separators=(",", ":")))
    size_mb = OUT.stat().st_size / 1e6
    for name, night in d["nights"].items():
        base = len(night["baseline"]["late_ids"])
        amb = len(night["ambulances_plus2"]["late_ids"])
        ai3 = night["ai_plans"]["3"]
        print(f"{name:8s} calls={len(night['calls'])} late: base={base} +2amb={amb} "
              f"ai3={len(ai3['late_ids'])} {ai3['slots']}")
    print(f"wrote {OUT} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
