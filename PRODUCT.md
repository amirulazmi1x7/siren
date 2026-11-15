# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: an ER manager (charge nurse or ED operations lead) planning staffing for a Friday overnight, 6 PM to 6 AM. Their job: decide where and when to put a few extra offload nurses so ambulances stop waiting at the ER door, and hand staff a shift sheet they can act on.

Secondary: MadHacks 2026 judges. They see the page on a projector during a 3-minute live demo, and some open the Devpost link on their own laptop. The page is designed as a real work tool first; the demo shows that tool working.

## Product Purpose
Offload Planner is a digital twin of a city's ambulances and ERs. It replays a real night of 911 calls, shows ambulances stuck at hospital doors, and lets the manager place offload nurses (3 hospitals x 6 two-hour blocks) within a budget. It then compares do nothing, +2 ambulances, the manager's plan, and the AI plan, and prints the chosen schedule.

Success: the manager can see which slots matter, trust why, and leave with a schedule. For judges: the before/after is obvious within one demo pass.

## Positioning
"Ambulances aren't slow. They're stuck. Dashboards show you the problem; we tell you the fix." Existing dashboards report response times. This tool recommends a specific staffing change, tests it in a simulation calibrated to real NYC 911 data, and outputs a schedule.

## Operating Context
- Used at a desk or on a big screen ahead of a shift, not mid-crisis.
- Viewed on a projector (judging, Sun Nov 15, 1:00-2:30 PM) and on laptops. Phone is not a target.
- Static page reading one precomputed file, `web/data/scenarios.json`. Nothing computes live, so it works offline.
- "Send schedule" produces a printable shift sheet (`web/schedule.html`).

## Capabilities and Constraints
- Three nights to compare: typical, holiday, heat. Brooklyn is city #1; city values live only in `pipeline/config.py`.
- Hospitals are shown as A, B, C only, never named. Calls go to the nearest hospital, and the page says this is an assumption.
- Every number is labelled REAL (NYC data) or SIM (simulation output). Never hard-code a result.
- "Time at hospital" includes cleanup, not only the handoff.
- A late call means response over 10 minutes.
- The "AI plan" is a greedy optimizer. Say "AI agent" only if the chat box ships.
- Lookup covers plans of 0 to 4 shifts. A missing plan shows a message, never an error.
- Costs ($180 nurse shift, $3,600 for +2 ambulances) are placeholders, and the footer says so.
- Stretch, undecided: agent chat box, LightGBM forecast, "why was this call late?" popup.

## Brand Commitments
- Name: Offload Planner.
- Voice: calm and clinical, like a hospital operations tool. Short, sober labels; numbers do the talking. No hype, no em-dashes in user-facing text.

## Evidence on Hand
- Real NYC 911 call data for Brooklyn Fridays (from Person A's pipeline; real stats in `real_stats` / `nights.*.real`).
- Until Person A's export lands, `web/data/scenarios.json` is fake data from `shared/make_fake.py`. Do not quote its numbers anywhere.
- No users, testimonials, partner hospitals, or pilot results exist. Do not invent any.

## Product Principles
1. Recommend, don't just report: every view should lead toward a staffing decision.
2. Honest numbers: REAL vs SIM is always visible, assumptions are stated, and placeholders are marked.
3. Show the mechanism: the door queue, and the before/after on it, is the proof.
4. Readable from the back of the room: the main comparison should land at projector distance.
5. End in something usable: a schedule a manager could hand to staff.

## Accessibility & Inclusion
Projector use calls for strong contrast and large key figures. Late/on-time and REAL/SIM must not rely on color alone.
