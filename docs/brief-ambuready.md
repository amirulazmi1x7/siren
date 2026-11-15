# Brief for Person B's Claude: AmbuReady (read this first)

**From:** Person A · 2026-11-14 night. This file is the latest word. It overrides the name "Unstuck" in `docs/brief-unstuck-page.md`; everything else in that brief still applies (one-person card spec, new data fields, map pin).

## 1. Rename: the product is "AmbuReady"
Replaces "Offload Planner" (and "Unstuck") everywhere users read it: top bar title, `<title>` in `web/app/index.html` and `web/app/schedule.html`, the schedule sheet header, `PRODUCT.md` (Name and positioning).

- **Tagline:** *An AI agent that rehearses tonight's ER shift on real 911 data, and finds the cheapest way to get ambulances back on the road.*
- **Pitch line:** *Ambulances aren't slow. They're stuck at the ER. AmbuReady gets them ready for the next call.*

## 2. Say "rehearsal", never "digital twin" or "simulation", in user-facing copy
- Brief fine print: *The agent rehearses this night on a replay of real 911 calls and tests thousands of fixes before it recommends one.*
- Working step: *Rehearsing 4,048 nurse schedules, extra ambulances and mixes*
- How it works step 2: *Rehearsal. A replay of the area's ambulances and ER doors, built from real 911 calls and checked against real nights.*
- Tags: **REAL** = measured NYC data. Rehearsal numbers: keep **SIM** or rename to **REHEARSAL**, one choice used everywhere.
- Code comments and Python can keep "sim".

## 3. Why care beyond budget (the "lives" work, already in the data)
Full research: `docs/research/response-time-outcomes.md`.

- **Research:** in cardiac arrest, each extra minute before EMS arrives lowers survival odds by about **8%** (Resuscitation Outcomes Consortium, odds ratio 0.92 per minute; studies range 4–11%). Weaker, varying evidence for other emergencies.
- **Rehearsal results, $900 plan (5 nurse shifts):** fewer people waiting over 10 min: typical 5.0, holiday 10.2, summer 7.4. Urgent-patient minutes saved: 58.5 / 130 / 67.
- **Do NOT show a lives-saved number.** In 3 ERs there are only 2–4 arrest calls on a Friday night, so the estimate is under 1 a year and within noise (−0.2 to +0.4). "How it works" already says this. Use the research line instead.

### New data fields (`web/data/scenarios.json`)
- `nights.*.real.urgent_calls`, `urgent_late`, `hours_at_hospital`: REAL counts for that night (the Brief's "26 of 79…", "113 hours").
- `nights.*.options[].urgent_minutes_saved`: SIM.
- `nights.*.options[].arrest_survivors_per_year`: estimate only, **never display**.
- `nights.*.options[].highlight`: `{id, t, severity, hosp, before_min, after_min}` or `null`; a real call, from replay run 0 (the same run the map shows).

### The "one person" card (Decision panel)
> **{fewer} more people reached in time tonight.**
> *(urgent calls: heart, breathing and stroke emergencies, and other life-threatening calls)*
>
> **One of them:** {clock(highlight.t)}, {severity label} near Hospital {hosp}.
> No fix: the ambulance arrives in **{before_min} min**. With the plan: **{after_min} min**. (SIM)
>
> *In cardiac arrest, every minute without help lowers the chance of survival by about 8%.*

- `{fewer}` = `options` "nothing".late − pick.late, rounded.
- Severity labels: `1` a life-threatening call (cardiac arrest, choking or unconscious) · `2` a heart, breathing or stroke emergency · `3` a serious emergency (cardiac, major injury or altered mental state).
- Hide "One of them" when `highlight` is null.
- Pin that call on the map during the Decision replay once replay time passes `highlight.t`.
- Check: typical night at $900 → **12:02 AM, severity 2, Hospital B, 16.3 → 2.4 min.**

## 4. Honesty rules (unchanged)
Every number tagged REAL or SIM/REHEARSAL. The story call is a real 911 call (time, type, area are real); its before/after minutes are rehearsal results. Hospitals stay A/B/C. Costs are "est.". The 20-minute benchmark is "widely used", not "national". Claims backed by `docs/research/`.

## Done when
```bash
grep -rniE "offload planner|unstuck|digital twin|simulation" web/app/src web/app/*.html
```
prints nothing, the one-person card shows for all three nights at $900, the map pin appears during the Decision replay, and `npx vitest run` and `npx tsc --noEmit` pass.
