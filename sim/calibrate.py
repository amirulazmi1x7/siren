"""Step 5: tune the digital twin until it reproduces real Friday nights.

We search over the settings we could not measure (fleet size, ER handoff slots, handoff time,
driving speed) and keep the combination whose median response time and median time at hospital
are closest to the real NYC numbers. ER blocks that are slowest in the real data get one fewer
handoff slot, so the twin also reproduces *where and when* doors are slow.

Run: python -m sim.calibrate
"""
import itertools
import json
import random
import statistics
from dataclasses import asdict
from pathlib import Path

import numpy as np

from sim.model import N_BLOCKS, SimParams, _block, run_night

DEFAULT_GRID = {
    "n_ambulances": [10, 14, 18, 22, 26],
    "base_cap": [3, 4, 5],
    "handoff_mean_min": [35.0, 40.0, 45.0],
    "speed_kmh": [12.0, 15.0, 18.0, 22.0],
    "outside_travel_min": [10.0, 12.0, 14.0, 16.0],
}
REAL_DISPATCH_DELAY_MIN = 0.6   # NYC median call-to-assignment for this area (Friday nights, 2025-26)
KEYS = ("median_response_min", "median_time_at_hospital_min")
URGENT_KEYS = ("urgent_median_response_min", "urgent_late_share")
LATE_MIN = 10


def within_tolerance(sim: dict, target: dict, tol: float = 0.10, keys=KEYS) -> bool:
    return all(abs(sim[k] - target[k]) <= tol * target[k] for k in keys)


def _error(sim: dict, target: dict) -> float:
    """Overall medians plus the shape of both curves across the night's six blocks."""
    err = sum(abs(sim[k] - target[k]) / target[k] for k in KEYS)
    err += 2 * sum(abs(sim[k] - target[k]) / target[k] for k in URGENT_KEYS if k in target and target[k])
    for curve in ("late_share_by_block", "tah_by_block"):
        if curve in target and curve in sim:
            pairs = [(s, t) for s, t in zip(sim[curve], target[curve]) if t]
            err += sum(abs(s - t) / t for s, t in pairs) / max(1, len(pairs))
    return err


def capacity_grid(real_grid: list[list[float]], base: int) -> tuple[tuple[int, ...], ...]:
    """Base handoff slots everywhere, one fewer in the slowest quarter of real (hospital, block) cells."""
    vals = np.array(real_grid, dtype=float)
    cut = np.percentile(vals, 75)
    if vals.max() == vals.min():
        return tuple(tuple(base for _ in row) for row in real_grid)
    return tuple(tuple(max(1, base - 1) if v >= cut else base for v in row) for row in vals)


def _med(xs) -> float:
    return round(statistics.median(xs), 2) if xs else 0.0


def sim_stats(nights: dict[str, list[dict]], params: SimParams, seeds=range(3)) -> dict:
    resp, tah, urg = [], [], []
    resp_b = [[] for _ in range(N_BLOCKS)]
    urg_b = [[] for _ in range(N_BLOCKS)]
    tah_b = [[] for _ in range(N_BLOCKS)]
    for calls in nights.values():
        info = {c["id"]: (c["t"], c["severity"]) for c in calls}
        for s in seeds:
            r = run_night(calls, params, seed=s)
            for cid, v in r.response_min.items():
                t, sev = info[cid]
                resp.append(v)
                resp_b[_block(t)].append(v)
                if sev <= params.urgent_max_severity:
                    urg.append(v)
                    urg_b[_block(t)].append(v)
            for _, b, v in r.hosp_visits:
                tah.append(v)
                tah_b[b].append(v)
    return _summary(resp, tah, urg, resp_b, urg_b, tah_b)


def _share_late(xs) -> float:
    return round(sum(v > LATE_MIN for v in xs) / len(xs), 4) if xs else 0.0


def _summary(resp, tah, urg, resp_b, urg_b, tah_b) -> dict:
    return {"median_response_min": _med(resp), "median_time_at_hospital_min": _med(tah),
            "urgent_median_response_min": _med(urg), "urgent_late_share": _share_late(urg),
            "response_by_block": [_med(x) for x in resp_b], "late_share_by_block": [_share_late(x) for x in urg_b],
            "tah_by_block": [_med(x) for x in tah_b]}


def real_targets(df) -> dict:
    """The same summary as sim_stats, computed from real NYC rows."""
    blk = df["t"].map(_block)
    resp = df["response_min"].notna()
    urgent = resp & (df["severity"] <= 3)
    tah = df["time_at_hosp_min"].notna()
    return _summary(
        list(df["response_min"][resp]), list(df["time_at_hosp_min"][tah]), list(df["response_min"][urgent]),
        [list(df["response_min"][resp & (blk == b)]) for b in range(N_BLOCKS)],
        [list(df["response_min"][urgent & (blk == b)]) for b in range(N_BLOCKS)],
        [list(df["time_at_hosp_min"][tah & (blk == b)]) for b in range(N_BLOCKS)])


def calibrate(nights: dict[str, list[dict]], target: dict, real_grid: list[list[float]],
              grid: dict | None = None, seeds=range(3)) -> SimParams:
    grid = grid or DEFAULT_GRID
    best, best_err = None, float("inf")
    outs = grid.get("outside_travel_min", [SimParams().outside_travel_min])
    delay = grid.get("dispatch_delay_min", SimParams().dispatch_delay_min)
    for n, cap, hm, sp, ot in itertools.product(grid["n_ambulances"], grid["base_cap"],
                                                grid["handoff_mean_min"], grid["speed_kmh"], outs):
        p = SimParams(n_ambulances=n, door_capacity=capacity_grid(real_grid, cap), handoff_mean_min=hm,
                      speed_kmh=sp, outside_travel_min=ot, dispatch_delay_min=delay)
        err = _error(sim_stats(nights, p, seeds), target)
        if err < best_err:
            best, best_err = p, err
    return best


def real_block_grid(df, column: str = "time_at_hosp_min") -> list[list[float]]:
    from pipeline.config import HOSPITALS
    out = []
    for h in HOSPITALS:
        sub = df[df["hosp"] == h["id"]]
        out.append([float(np.nanmedian(sub[column][sub["t"].map(_block) == b])) for b in range(N_BLOCKS)])
    return out


def plot_sim_vs_real(df_real, nights: dict[str, list[dict]], params: SimParams, out: Path, seeds=range(3)) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from pipeline.config import BLOCKS
    real = real_targets(df_real)
    sim = sim_stats(nights, params, seeds)
    real_resp = [100 * v for v in real["late_share_by_block"]]
    sim_resp = [100 * v for v in sim["late_share_by_block"]]
    real_tah, sim_tah = real["tah_by_block"], sim["tah_by_block"]

    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    for ax, real, sim, title in ((axes[0], real_resp, sim_resp, "Urgent calls reached late, >10 min (%)"),
                                 (axes[1], real_tah, sim_tah, "Time at hospital (min)")):
        ax.plot(BLOCKS, real, marker="o", linewidth=2.5, label="REAL (NYC 911 data)", color="#1f6f43")
        ax.plot(BLOCKS, sim, marker="s", linewidth=2, linestyle="--", label="SIM (digital twin)", color="#2f6fd0")
        ax.set_title(title)
        ax.set_ylim(0, max(max(real), max(sim)) * 1.25)
        ax.grid(alpha=0.3)
        ax.legend(loc="lower left")
    fig.suptitle("Digital twin vs real Brooklyn Friday nights (3-ER area)")
    fig.tight_layout()
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=150)


def main() -> None:
    from pipeline.clean import load_all, night_calls, pick_nights
    df = load_all()
    target = real_targets(df)
    real_grid = real_block_grid(df)
    all_nights = sorted(df["night"].unique())
    sample = random.Random(0).sample(all_nights, 12) + list(pick_nights(df).values())
    nights = {str(n): night_calls(df, n) for n in dict.fromkeys(sample)}
    print(f"calibrating on {len(nights)} real nights; target {target}")
    params = calibrate(nights, target, real_grid, grid={**DEFAULT_GRID, "dispatch_delay_min": REAL_DISPATCH_DELAY_MIN})
    got = sim_stats(nights, params)
    headline = URGENT_KEYS + ("median_time_at_hospital_min",)
    errs = {k: f"{abs(got[k] - target[k]) / target[k]:.0%}" for k in headline}
    print("urgent median      real:", target["urgent_median_response_min"], " sim:", got["urgent_median_response_min"])
    print("urgent late share  real:", target["urgent_late_share"], " sim:", got["urgent_late_share"])
    print("late share by blk  real:", target["late_share_by_block"], " sim:", got["late_share_by_block"])
    print("hospital by block  real:", target["tah_by_block"], " sim:", got["tah_by_block"])
    print("best:", {k: v for k, v in asdict(params).items() if k != "door_capacity"})
    print("door capacity:", params.door_capacity)
    print("headline errors:", errs, "| within 10%:", within_tolerance(got, target, keys=headline))
    print("all-call median (incl. held non-urgent) real:", target["median_response_min"], "sim:", got["median_response_min"])
    Path("data").mkdir(exist_ok=True)
    Path("data/params_calibrated.json").write_text(json.dumps(
        {"params": asdict(params), "target": target, "sim": got, "nights": list(nights)}, indent=2, default=str))
    plot_sim_vs_real(df, nights, params, Path("web/img/sim_vs_real.png"))
    print("wrote data/params_calibrated.json and web/img/sim_vs_real.png")


def load_params(path: str = "data/params_calibrated.json") -> SimParams:
    p = json.loads(Path(path).read_text())["params"]
    p["door_capacity"] = tuple(tuple(r) for r in p["door_capacity"])
    return SimParams(**p)


if __name__ == "__main__":
    main()
