"""Small synthetic nights for sim tests (test utility, not production)."""
import random


def jammed_a_night(n: int = 120, seed: int = 3) -> list[dict]:
    """Most calls near hospital A and transported, so A's door jams in blocks 2-4."""
    r = random.Random(seed)
    calls = []
    for i in range(n):
        t = r.uniform(0, 720)
        near_a = r.random() < 0.75
        lat = 40.655 + r.uniform(-0.02, 0.02) if near_a else 40.60 + r.uniform(-0.02, 0.02)
        lon = -73.945 + r.uniform(-0.02, 0.02) if near_a else -73.96 + r.uniform(-0.02, 0.02)
        calls.append({"id": i, "t": t, "lat": lat, "lon": lon, "hosp": "A" if near_a else "B",
                      "severity": r.randint(1, 8), "transport": r.random() < 0.8})
    return sorted(calls, key=lambda c: c["t"])
