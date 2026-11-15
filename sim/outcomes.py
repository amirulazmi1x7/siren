"""Patient outcomes from response times: the "why care beyond budget" numbers.

Cardiac arrest is the one emergency with a well-measured per-minute effect: the Resuscitation
Outcomes Consortium found survival odds fall about 8% per extra minute of EMS response
(odds ratio 0.92). We anchor the curve at 10% survival for an 8-minute response, a typical US
out-of-hospital cardiac arrest survival rate (assumption). Severity-1 calls (arrest, choking,
unconscious) stand in for cardiac arrests, so this is an estimate. See
docs/research/response-time-outcomes.md.
"""
import math

ARREST_SEVERITY = 1
ODDS_RATIO_PER_MIN = 0.92
ANCHOR_MIN, ANCHOR_SURVIVAL = 8.0, 0.10
_B = math.log(ODDS_RATIO_PER_MIN)
_A = math.log(ANCHOR_SURVIVAL / (1 - ANCHOR_SURVIVAL)) - _B * ANCHOR_MIN


def arrest_survival(response_min: float) -> float:
    """Estimated chance a cardiac-arrest patient survives, given the ambulance's response time."""
    return 1 / (1 + math.exp(-(_A + _B * response_min)))


URGENT_MAX_SEVERITY = 3
LATE_MIN = 10


def pick_highlight(calls: list[dict], before: dict[int, float], after: dict[int, float]) -> dict | None:
    """The one urgent call that tells the plan's story: one that was late with no fix and is reached within
    10 minutes with the plan (the biggest such gain, most severe first); otherwise the biggest gain at all.
    None if no urgent call is reached sooner."""
    urgent = [c for c in calls if c["severity"] <= URGENT_MAX_SEVERITY and c["id"] in before and c["id"] in after]
    gains = [(before[c["id"]] - after[c["id"]], c) for c in urgent if before[c["id"]] - after[c["id"]] > 0.5]
    if not gains:
        return None
    rescued = [(g, c) for g, c in gains if before[c["id"]] > LATE_MIN >= after[c["id"]]]
    g, c = max(rescued or gains, key=lambda gc: (gc[0] if not rescued else 0, -gc[1]["severity"], gc[0]))
    return {"id": c["id"], "t": round(c["t"], 1), "severity": c["severity"], "hosp": c["hosp"],
            "before_min": round(before[c["id"]], 1), "after_min": round(after[c["id"]], 1)}
