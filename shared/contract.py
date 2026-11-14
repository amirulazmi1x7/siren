"""The data contract for web/data/scenarios.json (see PLAN.md).

validate_scenarios(d) returns a list of human-readable errors; [] means valid.
plan_key(slots) builds the lookup key; web/app.js planKey() must match it.
"""
from __future__ import annotations

import re
from typing import Iterable

HOSPITAL_IDS = ["A", "B", "C"]
N_BLOCKS = 6
NIGHT_T_MAX = 720  # minutes from 6 PM to 6 AM
REQUIRED_NIGHTS = ["typical", "holiday", "heat"]
OPTIONAL_NIGHTS = ["forecast"]
MAX_LOOKUP_SHIFTS = 4
AI_BUDGETS = [str(k) for k in range(1, 7)]
SLOT_RE = re.compile(r"^[ABC]-[0-5]$")


def plan_key(slots: Iterable[str]) -> str:
    """Slot keys sorted ascending and joined with ','. Empty plan -> ''."""
    return ",".join(sorted(set(slots)))


def _is_num(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _check_grid(grid, where: str, errors: list[str]) -> None:
    if (
        not isinstance(grid, list)
        or len(grid) != len(HOSPITAL_IDS)
        or any(not isinstance(r, list) or len(r) != N_BLOCKS for r in grid)
    ):
        errors.append(f"{where}: must be a 3x6 list of numbers")
        return
    for row in grid:
        for v in row:
            if not _is_num(v) or v < 0:
                errors.append(f"{where}: values must be numbers >= 0")
                return


def _check_result(res, where: str, call_ids: set, errors: list[str]) -> None:
    if not isinstance(res, dict):
        errors.append(f"{where}: must be an object")
        return
    for field in ("late_ids", "stuck", "door_wait_min"):
        if field not in res:
            errors.append(f"{where}: missing '{field}'")
    late = res.get("late_ids")
    if late is not None:
        if not isinstance(late, list):
            errors.append(f"{where}.late_ids: must be a list")
        else:
            unknown = [i for i in late if i not in call_ids]
            if unknown:
                errors.append(f"{where}.late_ids: ids not in calls, e.g. {unknown[:3]}")
    if "stuck" in res:
        _check_grid(res["stuck"], f"{where}.stuck", errors)
    if "door_wait_min" in res:
        _check_grid(res["door_wait_min"], f"{where}.door_wait_min", errors)


def _check_slots(slots, where: str, errors: list[str]) -> bool:
    if not isinstance(slots, list) or any(not isinstance(s, str) or not SLOT_RE.match(s) for s in slots):
        errors.append(f"{where}: slots must look like 'A-3'")
        return False
    if len(set(slots)) != len(slots):
        errors.append(f"{where}: duplicate slots")
        return False
    return True


def _check_night(name: str, night, errors: list[str]) -> None:
    w = f"nights.{name}"
    if not isinstance(night, dict):
        errors.append(f"{w}: must be an object")
        return
    for field in ("label", "calls", "real", "baseline", "ambulances_plus2", "ai_plans", "lookup"):
        if field not in night:
            errors.append(f"{w}: missing '{field}'")

    call_ids: set = set()
    calls = night.get("calls")
    if calls is not None:
        if not isinstance(calls, list) or not calls:
            errors.append(f"{w}.calls: must be a non-empty list")
        else:
            for c in calls:
                if not isinstance(c, dict) or any(k not in c for k in ("id", "t", "lat", "lon", "hosp", "severity")):
                    errors.append(f"{w}.calls: each call needs id, t, lat, lon, hosp, severity")
                    break
                if c["id"] in call_ids:
                    errors.append(f"{w}.calls: duplicate id {c['id']}")
                    break
                call_ids.add(c["id"])
                if not _is_num(c["t"]) or not 0 <= c["t"] <= NIGHT_T_MAX:
                    errors.append(f"{w}.calls: t must be 0-{NIGHT_T_MAX} (id {c['id']})")
                    break
                if c["hosp"] not in HOSPITAL_IDS:
                    errors.append(f"{w}.calls: hosp must be A/B/C (id {c['id']})")
                    break

    if "label" in night and not isinstance(night["label"], str):
        errors.append(f"{w}.label: must be a string")

    real = night.get("real")
    if real is not None:
        for k in ("median_response_min", "median_time_at_hospital_min"):
            if not isinstance(real, dict) or not _is_num(real.get(k)):
                errors.append(f"{w}.real: missing number '{k}'")

    for field in ("baseline", "ambulances_plus2"):
        if field in night:
            _check_result(night[field], f"{w}.{field}", call_ids, errors)

    ai = night.get("ai_plans")
    if ai is not None:
        if not isinstance(ai, dict) or sorted(ai.keys(), key=int) != AI_BUDGETS:
            errors.append(f"{w}.ai_plans: keys must be '1'-'6'")
        else:
            for k, plan in ai.items():
                pw = f"{w}.ai_plans.{k}"
                if not isinstance(plan, dict) or "slots" not in plan:
                    errors.append(f"{pw}: missing 'slots'")
                    continue
                if _check_slots(plan["slots"], pw, errors) and len(plan["slots"]) != int(k):
                    errors.append(f"{pw}: needs exactly {k} slots")
                _check_result(plan, pw, call_ids, errors)

    lookup = night.get("lookup")
    if lookup is not None:
        if not isinstance(lookup, dict):
            errors.append(f"{w}.lookup: must be an object")
        else:
            if "" not in lookup:
                errors.append(f"{w}.lookup: missing the empty plan ''")
            for key, res in lookup.items():
                lw = f"{w}.lookup['{key}']"
                slots = key.split(",") if key else []
                if not _check_slots(slots, lw, errors):
                    break
                if plan_key(slots) != key:
                    errors.append(f"{lw}: key not sorted, should be '{plan_key(slots)}'")
                    break
                if len(slots) > MAX_LOOKUP_SHIFTS:
                    errors.append(f"{lw}: more than {MAX_LOOKUP_SHIFTS} shifts")
                    break
                before = len(errors)
                _check_result(res, lw, call_ids, errors)
                if len(errors) > before:
                    break


def validate_scenarios(d) -> list[str]:
    errors: list[str] = []
    if not isinstance(d, dict):
        return ["top level: must be an object"]

    city = d.get("city")
    if not isinstance(city, dict) or not isinstance(city.get("name"), str) or not isinstance(city.get("area"), str):
        errors.append("city: needs string 'name' and 'area'")

    blocks = d.get("blocks")
    if not isinstance(blocks, list) or len(blocks) != N_BLOCKS:
        errors.append("blocks: must list 6 block labels")

    hospitals = d.get("hospitals")
    if not isinstance(hospitals, list) or [h.get("id") for h in hospitals if isinstance(h, dict)] != HOSPITAL_IDS:
        errors.append("hospitals: must be 3 objects with ids A, B, C in order")
    else:
        for h in hospitals:
            if not _is_num(h.get("lat")) or not _is_num(h.get("lon")):
                errors.append(f"hospitals: {h.get('id')} needs numeric lat/lon")

    costs = d.get("costs")
    for k in ("nurse_shift_usd", "ambulance_night_usd"):
        if not isinstance(costs, dict) or not _is_num(costs.get(k)):
            errors.append(f"costs: missing number '{k}'")

    nights = d.get("nights")
    if not isinstance(nights, dict):
        errors.append("nights: must be an object")
        return errors
    for name in REQUIRED_NIGHTS:
        if name not in nights:
            errors.append(f"nights: missing '{name}'")
    for name, night in nights.items():
        if name not in REQUIRED_NIGHTS + OPTIONAL_NIGHTS:
            errors.append(f"nights: unknown night '{name}'")
            continue
        _check_night(name, night, errors)
    return errors
