# Brief for Person B's Claude: Unstuck page, next round

**From:** Person A · **Date:** 2026-11-14 night · **Supersedes:** the page-layout parts of `docs/brief-web-planner-framing.md` (its honesty rules still apply).

## Where things stand (already on `main` after this push)
`web/app` was reworked into an **agent flow** (see `src/components/AgentPanel.tsx`, `src/state/planner.ts` `phase`):
1. **Brief**: the map fills the screen; one panel states the night's REAL problem ("26 of 79 urgent patients waited over 10 minutes…", "Crews spent 113 hours parked at three ERs"), a budget dropdown, and **Plan this night**.
2. **Working** (~3 s): four real steps tick in (calls read, bottleneck ER and hours, 4,048 schedules tested, fixes ranked) while the map replays the night with no fix.
3. **Decision**: the pick, shift times, minutes saved, ambulance-hours back, cost; **Approve and send schedule** / **Change budget**; drawers **Why this plan? / Try to beat the agent / How it works**. Map HUD shows the plan's late count next to "With no fix: N by this time".

Visual rules used: one accent (agent blue `--accent`), red = waited over 10 min, green = reached in time, quiet outlined REAL/SIM tags, map as the stage, few cards. Tests: `npx vitest run` (58 pass), `npx tsc --noEmit` clean. `ProblemStrip` and `RecommendationCard` are now unused; delete them if you like.

## Your tasks
### 1. Rename the product to **Unstuck**
- Top bar, `<title>` in `index.html` and `schedule.html`, the schedule sheet header, `PRODUCT.md` (Name, positioning line).
- Tagline: *"An AI agent that rehearses tonight's ER shift on real 911 data, and finds the cheapest way to get ambulances back on the road."*
- Pitch line it pairs with: *"Ambulances aren't slow. They're stuck."*

### 2. Say "rehearsal", never "digital twin" or "simulation", in user-facing copy
- e.g. Brief fine print: "The agent rehearses this night on a replay of real 911 calls and tests thousands of fixes before it recommends one."
- Keep the tag **SIM** on rehearsal numbers (or rename the tag to **REHEARSAL** if it fits; REAL stays REAL).

### 3. The "one person" card on the Decision panel (the emotional beat)
Replace the minutes-led sentence with:
> **{fewer} more people reached in time tonight.**
> *(urgent calls: heart, breathing and stroke emergencies, and other life-threatening calls)*
>
> **One of them:** {clock(t)}, {severity label} near Hospital {hosp}.
> No fix: the ambulance arrives in **{before_min} min**. With the plan: **{after_min} min**. (SIM)
>
> *In cardiac arrest, every minute without help lowers the chance of survival by about 8%.*

- `{fewer}` = `options[nothing].late − pick.late`, rounded (mean over replays).
- Story call = `pick.highlight` (may be `null`: then hide "One of them").
- Severity labels (NYC EMS codes): `1` → "a life-threatening call (cardiac arrest, choking or unconscious)", `2` → "a heart, breathing or stroke emergency", `3` → "a serious emergency (cardiac, major injury or altered mental state)".
- Keep "ambulance-hours back on the road for $X (est.)" as the second line.
- **Pin the story call on the map** during the Decision replay: a ring at that call's lat/lon (find it in `night.calls` by `id`) that appears when replay time passes `highlight.t`. Optional: tooltip with the before/after minutes.

Real values at $900 (5 nurse shifts) to sanity-check against:
| Night | fewer late | highlight |
|---|---|---|
| Typical | 5.0 | 12:02 AM, severity 2, Hospital B, 16.3 → 2.4 min |
| Holiday | 10.2 | 10:26 PM, severity 2, Hospital A, 11.6 → 2.3 min |
| Busy summer | 7.4 | 5:26 AM, severity 2, Hospital B, 12.1 → 2.2 min |

## New data fields (`web/data/scenarios.json`, additive; contract still passes)
- `nights.*.real`: `urgent_calls`, `urgent_late` (REAL, that night), `hours_at_hospital` (REAL).
- `nights.*.options[]`:
  - `urgent_minutes_saved`: total minutes of faster arrival for urgent patients vs no fix (SIM)
  - `arrest_survivors_per_year`: estimate, **do not display as a number**, see below
  - `highlight`: `{id, t, severity, hosp, before_min, after_min}` or `null`, from replay run 0 (the same run the map shows)

## Honesty rules (must keep)
- **Lives:** do not show a lives-saved number. At 3 ERs it is under 1 a year and within noise (−0.2 to +0.4). The "How it works" drawer already says this plainly; keep it. Use the per-minute research line instead. Sources: `docs/research/response-time-outcomes.md`.
- The story call is a **real call** (time, type, area are real); its before/after times are **rehearsal** results. Label them SIM/REHEARSAL.
- Hospitals stay A/B/C. Costs are estimates ("est."). Benchmark is "widely used", not "national".
- Background for any claim: `docs/research/ambulance-offload-delay-us.md`.

## Done when
Unstuck name everywhere, no "digital twin" or "simulation" in user-facing copy, the one-person card shows for all three nights at $900, the map pin appears during the Decision replay, tests and typecheck pass, it reads well at 1280–1440 px wide on a projector.
