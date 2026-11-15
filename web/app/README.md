# Siren web app

React + TypeScript + Vite. Street map with MapLibre (OpenFreeMap tiles) and deck.gl.
Reads one file, `web/data/scenarios.json` (written by Person A's `python -m sim.export`), served as `/scenarios.json`.
Nothing is computed on a server: every number is precomputed, so a build is a static site.

## Run it

Needs Node 20+.

```bash
cd web/app && npm install
```

Development (hot reload) at http://localhost:5173:

```bash
npm run dev
```

Production build, served at http://localhost:4173 (use this for the demo):

```bash
npm run build && npm run preview
```

Checks (strict TypeScript + 63 tests, including TS `planKey` parity with Python `plan_key` and the planner's pick matching the export at every budget step):

```bash
npm run typecheck && npm test
```

## Demo checklist (before judging)

1. `git pull`, then `npm run build && npm run preview`. Open http://localhost:4173.
2. Internet is needed for the street map tiles. **No internet?** The data still works but the map is blank; use the old offline page instead: `cd web && python3 -m http.server 8765`, open http://localhost:8765.
3. Browser zoom 100%, window at least 1280×720. The page forces a light theme even if the laptop is in dark mode.
4. Hard-refresh once after any new `scenarios.json` (Cmd+Shift+R).

## Demo path (about 60 seconds)

1. Problem strip: "Ambulances spend 44 minutes at the hospital per patient. About 103 ambulance-hours every Friday night."
2. Tonight's recommendation: drag the budget slider; the pick, hours back, late patients and cost update.
3. How it decided: the pick is ticked; every other option says why it lost (over budget, fewer hours, or the trade-off).
4. Map: press Play night. Watch the door queues at A, B, C; click a hospital to zoom in.
5. Send schedule: the printable shift sheet for the pick.
6. Optional: open "Try to beat the planner" and let a judge place nurses.

## Honesty rules the UI follows

- Every number is tagged REAL (NYC 911 data) or SIM (simulation output).
- Hospitals are shown only as A, B, C. The map style has no place-of-interest labels, so real hospital names never appear.
- Recommendation and "How it decided" numbers are averages over simulated runs. The map is one simulated run, and says so.
- +1 ambulance and mixed options have no call-by-call replay in the data; when picked, the map says so and shows doing nothing.
- Costs are estimates from the export (`costs` in `scenarios.json`); the footer and shift sheet read them, never hard-coded.
- On-screen copy says "rehearsal", never "digital twin" or "simulation". No lives-saved number is shown.
- The one-person story call is a real 911 call (time, type, area); its before/after minutes are rehearsal results (SIM).
- Call locations are approximate (zip code area), and map zoom is capped.

## Code map

| Path | What |
|---|---|
| `src/lib/contract.ts` | Types for `scenarios.json`, `planKey`, `resultFor`, shape check |
| `src/lib/recommend.ts` | Planner pick per budget, options compared + reasons, shift grouping |
| `src/lib/plan.ts` | Views, costs, best value, slot rules |
| `src/state/planner.ts` | Reducer + `derive()` (all UI numbers) |
| `src/map/` | MapView, deck.gl layers, hospital markers, legend, hidden POI labels |
| `src/components/` | Recommendation card, options, problem strip, timeline, map HUD, try-to-beat-it section |
| `src/schedule/` | Printable shift sheet (`schedule.html?night=&plan=&amb=`) |
| `tests/` | Vitest, runs against the real `web/data/scenarios.json` |
