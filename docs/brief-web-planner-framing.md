# Brief for Person B's Claude: reframe the page as a planner that picks the fix

**From:** Person A (data/sim) · **Date:** 2026-11-14 · **Read with:** `PLAN.md`, `shared/contract.py`

## What changed and why
Mentors kept asking "are offload nurses the right answer?". New framing: **the product is the decision, not the nurse.**
The planner tests several fixes on a digital twin of the city and recommends the cheapest one that works
for a given night and budget. Offload nurses are one option; extra ambulances are another.
None of the fixes are new; choosing between them ahead of time is.

**One-line pitch:** "Every Friday night, Brooklyn ambulances spend about 100 hours at hospitals.
Our AI planner tests every fix on a digital twin of the city and picks the cheapest one."

## Page order (top to bottom)
1. **Headline:** "Find the cheapest way to get ambulances back on the road tonight." Subline: "A digital twin of the
   city's ambulances and ERs. It tests every fix and recommends the best one for your budget."
2. **The problem: 3 stat tiles, tagged REAL.**
   - 44 min: median time an ambulance spends at the hospital per patient
   - ~100 ambulance-hours a Friday night at hospitals (this area; `area_real.ambulance_hours_per_friday`)
   - 20 min: widely used benchmark for handing a patient over (no federal standard exists; say "widely used", not "national")
   Context line: "Wall time is worst in busy urban systems. California, which mandates reporting, still averages a 39–49 min 90th percentile." Source: docs/research/ambulance-offload-delay-us.md
   Wording: the 44 min is "arrival to back in service" (it includes paperwork), not pure offload wait.
   Don't call it "offload time".
3. **"Tonight's recommendation" card (the hero).** Night picker + budget slider. Shows the planner's pick, e.g.
   "For $720: 4 nurse shifts at B 10 PM–2 AM, A 10 PM, C 12 AM. Frees 28 ambulance-hours, about 10× cheaper than adding ambulances."
4. **"Options it compared" chart.** Side-by-side bars: Do nothing | +2 ambulances | Best nurse plan | Best mix.
   Columns: cost, ambulance-hours back on the road, urgent patients reached late. Tag the outcomes **SIM**.
   This chart is what proves the planner *chose*.
5. **"Try to beat the planner."** The existing map replay + schedule grid, reframed as a challenge.
6. **Fix library.**
   - ✅ Offload nurses (modeled)
   - ✅ Extra ambulances (modeled)
   - 🔜 Planned rerouting to the least-busy ER, decided ahead of time instead of after an ER is full
   - 🔜 Treat-and-release / telehealth for minor calls
   - 🔜 Hospital fast-track handover desk
7. **How it works (3 steps):** Real 911 data → digital twin (checked against real nights) → tests thousands of plans → picks the best.

## Honesty rules (unchanged, still apply)
- Tag every number **REAL** (from NYC data) or **SIM** (from the twin).
- Hospitals stay **A / B / C**; never name them.
- Don't claim the real data proves fewer late patients. Late-patient numbers are **SIM** estimates only.
- "AI planner" is OK: it searches thousands of plans on the twin. Don't say "trained on hospital data".
- Costs ($180 per nurse shift, $3,600 per ambulance night) are placeholders until verified. Label them "est."

## Data: new fields, now live in the real scenarios.json (additive to the contract)
`web/data/scenarios.json` is now real (`fake: false`, 4.4 MB, built by `python -m sim.export`) and still passes the contract. It adds:
- each result object (`baseline`, `ambulances_plus2`, `ai_plans[k]`, `lookup[key]`) gains
  `hours_at_hospital` (number, ambulance-hours at hospitals that night, SIM)
- each night gains `options`: a list of
  `{ "id", "label", "cost_usd", "hours_back", "late", "slots", "extra_ambulances" }`
  covering: do nothing, +1/+2 ambulances, best nurse plan for 1–6 shifts, and mixes (1 ambulance + nurses)
- each night gains `recommendation`: `{ "<budget_usd>": "<option id>" }`, the planner's pick per budget step
- top level gains `area_real`: `{ "median_time_at_hospital_min": 44.3, "ambulance_hours_per_friday": 102.9, "benchmark_offload_min": 20 }`

Recommendation keys are budget steps in dollars (180 … 7200). For a slider value, use the largest key ≤ the slider. Costs are placeholders, so the planner's pick depends on them.
