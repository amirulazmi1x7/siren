# Web Redesign Plan: React + TypeScript + Street Map

Owner: Person B (`web/`). Written Sat Nov 14, ~6 PM. Code freeze Sun 8 AM.

## 1. Goal

Rebuild the planner page as a React + TypeScript app with a **real, zoomable street map** (pan and zoom like Google Maps) and purposeful animation, without changing anything Person A depends on.

**Done means:** the new app does everything the current page does (see the parity checklist, section 10), runs on fake and real `scenarios.json`, reads well on a 1280×720 projector, and builds to static files.

**Not in scope tonight**
- 3D tilt, extruded buildings, photorealistic tiles. Possible later, since the same map library supports it.
- Moving ambulances along streets. The contract has no ambulance positions, so animating them would invent data (breaks the REAL/SIM rule).
- Live simulation or any backend.
- Phone layout. PRODUCT.md says phones aren't a target.

## 1b. Phase 2: planner framing (added Sat ~10:30 PM, replaces the dashboard layout)

Source: `docs/brief-web-planner-framing.md` (Person A). The product is **the decision, not the nurse**: the planner compares every fix it can test on the digital twin and recommends the one that gets the most ambulance-hours back on the road for the budget. Nurses are one option; ambulances and mixes are others.

**Layout (1280×720):**
- Top bar: title, one-line promise, night tabs.
- Problem strip (REAL): 44 min at hospital per patient (arrival to back in service), ~103 ambulance-hours a Friday night at hospitals, 20 min widely used handover benchmark (cited, not a federal standard).
- Left column (scrolls): **Tonight's recommendation** hero (budget slider in dollars, the pick in plain words, hours back, late patients, cost, cost per hour vs +2 ambulances, Send schedule), **Options it compared** (pick marked, reason each other option lost), How it works (3 steps), Fix library (2 modeled, 3 coming), **Try to beat the planner** (collapsible: nurse grid, compare, why chart), footer.
- Right column: map + headline + timeline, showing the recommended plan by default.

**Rules:**
- Card and options numbers come from `options` (average of simulated runs); map replay comes from the single-run lookup. The map says "one simulated run" so the two never look contradictory.
- Mixes (+1 ambulance & nurses) and +1 ambulance have no per-call replay in the data. When picked, the map shows "doing nothing" with a clear note, never a guessed replay.
- Ambulance cost is **per ambulance per night** ($3,600), matching Person A's export; +2 ambulances = $7,200 (read from `options`).
- Say "AI planner" (it searched thousands of plans). Not "AI agent".

**Tasks:** P1 types + recommendation logic + reducer + tests · P2 problem strip + hero card · P3 options chart · P4 layout swap, map shows pick, beat-the-planner section · P5 how it works + fix library + copy · P6 verify numbers vs data, projector, console. Then T10/T11.

**Status (Sat ~11:30 PM): P1 to P6 done.** `lib/recommend.ts`, `ProblemStrip`, `RecommendationCard`, `OptionsCard`, `HowItWorks`/`FixLibrary`, `BeatPlanner`; schedule sheet takes `amb=`; 56 tests. Verified on all 3 real nights at 1280×720: hero numbers equal the export's `options`, verdicts show trade-offs, mixes show "no replay" instead of a guessed map.
**Open question for Person A:** the export's rule is "most hours within budget", so at high budgets it can pay 4× for a few more hours (holiday: $4,320 for 40.0 h vs $1,080 for 38.4 h). The page shows this openly; consider a cost-effectiveness cutoff in `sim/export.py recommend()`.

## 2. Fixed constraints (do not break)

- **Contract is frozen.** The app reads `scenarios.json` exactly as `shared/contract.py` defines it. TS `planKey` must equal Python `plan_key`.
- **Person A's file path doesn't change:** `web/data/scenarios.json`.
- **REAL/SIM badge on every number.** Late vs on-time never shown by color alone.
- **Hospitals are A/B/C, never named.** A street map shows real place labels, so **hospital and other POI labels must be hidden** in the map style (see risk R3).
- **Call locations are approximate** (zip code centroid plus jitter). Cap max zoom so dots don't look like street addresses, and say "approximate location" on the map.
- **The current page stays as the fallback** (`web/index.html`, `app.js`, `style.css`, `schedule.html`) until cutover. Commit its latest changes before starting.
- Agents don't commit or push. The human runs git.
- No em-dashes in UI copy. Voice: calm, clinical (PRODUCT.md).

## 3. Context that changed today

- Person A narrowed the study area to **3 real ERs within 2.5 km** in central/east Brooklyn (`pipeline/config.py`). The map should open on that area, not all of Brooklyn.
- `shared/make_fake.py` still scatters fake calls across all of Brooklyn with old hospital positions. **Ask Person A** whether to update it to the new area (`shared/` is edited together), so fake data looks like real data.
- `mockup/offload-planner.html` now exists in the repo. Use it as a layout reference, not a constraint.

## 4. Stack

Pin exact versions at install time, choosing releases that are at least 2 weeks old. Versions below are what npm reported today, for reference.

| Need | Package | Notes |
|---|---|---|
| Build | `vite` (8.x), `@vitejs/plugin-react` | Builds to static files |
| UI | `react`, `react-dom` (19.x), `typescript` (5.x/7.x, whichever Vite template uses) | |
| Street map | `maplibre-gl` (6.x) + `react-map-gl` (8.x, `react-map-gl/maplibre`) | Open source, no API key, pan/zoom/pinch like Google Maps |
| Data layers on the map | `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/extensions`, `@deck.gl/mapbox` (9.x) | GPU-rendered calls, filter by time cheaply. Same stack enables 3D later |
| Base map tiles (phase 1, online) | OpenFreeMap "positron" style | Free, no key. Needs internet |
| Base map tiles (phase 2, offline) | `pmtiles` + `@protomaps/basemaps` | Brooklyn-only tile file served from the laptop |
| Charts | `d3-scale`, `d3-array`, `d3-shape` | Math only; React renders SVG |
| Motion | `motion` (Framer Motion) | Number count-ups, panel and bar transitions |
| Tests | `vitest` | `planKey` parity, `bestValue`, reducer |
| Quality | ESLint + Prettier (Vite defaults) | |

Styling: plain CSS with CSS variables + CSS modules per component. Reuse the projector-tuned tokens from the current `style.css`.

## 5. Where the code lives

New app in its own folder so the old page keeps working untouched:

```
web/
  index.html, app.js, style.css, schedule.html   ← current page (fallback, unchanged)
  data/                                           ← shared data, unchanged path
    scenarios.json, brooklyn_zcta.geojson, (later) basemap/brooklyn.pmtiles
  app/                                            ← NEW Vite project (root)
    package.json, vite.config.ts, tsconfig.json
    index.html                                    entry: planner
    schedule.html                                 entry: shift sheet
    src/
      main.tsx, schedule.tsx
      lib/contract.ts        types for scenarios.json, planKey, resultFor
      lib/plan.ts            bestValue, costOf, view helpers
      lib/time.ts            clockLabel, blockOf, blockLabel
      lib/format.ts          money, signed numbers
      state/planner.ts       reducer, actions, context
      hooks/useScenarios.ts  fetch + validate shape
      hooks/useReplay.ts     requestAnimationFrame clock
      hooks/useAnimatedNumber.ts
      map/MapView.tsx        react-map-gl + deck.gl overlay
      map/basemap.ts         style: online positron or offline pmtiles, POI labels hidden
      map/layers.ts          deck.gl layers: calls, recent-call pulse, study area outline
      map/HospitalMarker.tsx door queue + "N waiting"
      components/            TopBar, NightTabs, MapHud, Timeline, RealStats, PlanGrid,
                             BudgetStepper, CompareBars, StatsGrid, WhyChart, Badge, Legend
      schedule/ScheduleSheet.tsx
      styles/tokens.css
    tests/                   contract.test.ts, plan.test.ts, planner.test.ts
```

`vite.config.ts` sets `publicDir: '../data'`, so `scenarios.json` is served at `/scenarios.json` in dev and copied into `dist/` on build. Person A's path stays `web/data/scenarios.json`.

## 6. Design direction

Projector-first operations console. Light theme only. Map is the hero.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Offload Planner   Central Brooklyn · Fri 6 PM to Sat 6 AM  [Typical][Holiday][Heat] │
├──────────────────────────────────────────────┬────────────────────────────┤
│ ┌ HUD ───────────────────┐        [+][−]     │ REAL  8.6 min   42.7 min   │
│ │ 57 waited over 10 min  │                   ├────────────────────────────┤
│ │ SIM        2:10 AM     │                   │ Place offload nurses  [−3+]│
│ └────────────────────────┘                   │ Best value: 3 shifts …     │
│         street map (pan / zoom)              │ [3×6 grid]                 │
│      ▲ late calls   ● on time                │ [Show AI plan] [Send]      │
│      [A] ▮▮▮▮ 4 waiting                       ├────────────────────────────┤
│                                              │ Compare (big bars, tap)    │
│ legend · approximate locations · © OSM       │ Stats                      │
├──────────────────────────────────────────────┤ Why it works (chart)       │
│ ▶  [6-8P|8-10P|10P-12A|12-2A|2-4A|4-6A] timeline with call density + late ticks │
└──────────────────────────────────────────────┴────────────────────────────┘
```

- App shell fills the screen (100vh). The map fills the left area. The right panel scrolls on its own.
- **Timeline** under the map replaces the plain slider: 6 labelled blocks, a small call-count histogram, red ticks for late calls, and a draggable playhead.
- **HUD over the map:** headline number and clock, large enough to read from the back of the room.
- Hospitals: dark A/B/C markers with a row of ambulance blocks and "N waiting".
- Late = red triangle, on time = small green circle (shape + color).

## 7. Animation spec

Motion explains, it doesn't decorate. All motion respects `prefers-reduced-motion` (instant changes instead).

| What | Trigger | Motion | Duration |
|---|---|---|---|
| Calls appear | replay time passes `t` | fade + scale in, plus a short ring pulse | 400 ms pulse |
| Late/on-time change | plan or view changes | crossfade color and shape | 400 ms |
| Door queue | block changes or a nurse is placed | ambulance blocks slide in/out one by one; count ticks | 60 ms stagger |
| Headline and stats numbers | any result change | count up/down | 500 ms ease-out |
| Compare bars | result change | width ease | 400 ms |
| Grid slot | tap | press scale + fill | 150 ms |
| Camera | night change | fly to study area | 1200 ms |
| Camera | click hospital or its grid row | ease to zoom ~14.5 on that hospital | 800 ms |
| Replay | Play | 12-hour night in ~24 s, timeline playhead moves | continuous |

## 8. State

One reducer (`state/planner.ts`), same fields as today:
`nightName, slots (ordered), budget, view ('nothing'|'amb'|'yours'|'ai'), t, playing, msg`.

Actions: `setNight`, `toggleSlot`, `setBudget`, `setView`, `clear`, `setTime`, `play`, `pause`, `tick`.
Rules carried over exactly: max 4 placed shifts (message, never a missing-key crash), budget limit message, lowering budget drops the most recent slot, switching nights resets the plan and sets budget to best value.

## 9. Tasks

Time estimates are for one person with an agent. Each task ends with something visible.

- [ ] **T0. Before starting** (10 min)
  - Commit the current page's projector fixes (`web/style.css`, `web/app.js`, `web/index.html`).
  - Ask Person A about updating `make_fake.py` to the 2.5 km area.
- [x] **T1. Scaffold** (30 min): Vite React TS in `web/app/`, Vitest, `publicDir: '../data'`, two entries, `npm run dev` shows a shell that loads `scenarios.json`. `node_modules/` and `dist/` ignored in `web/app/.gitignore`. Pinned: react 18.3.1, vite 5.4.11, typescript 5.6.3, vitest 2.1.8 (stable, well-tested versions rather than the newest majors). ESLint/Prettier deferred; `npm run typecheck` (strict TS) covers most of it.
- [x] **T2. Typed contract + helpers + tests** (45 min). Done: `lib/contract.ts`, `lib/plan.ts`, `lib/time.ts`, `lib/format.ts`; 26 tests incl. `planKey` parity against every Python lookup key.: `contract.ts` types, `planKey`, `resultFor`, `bestValue`, `costOf`, time/format helpers. Tests: `planKey(["B-3","A-2","A-3"]) === "A-2,A-3,B-3"`, empty plan `""`, order independence, `bestValue` cap at 4.
- [x] **T3. State + data loading + replay clock** (45 min): reducer with tests for the 4-shift and budget rules, `useScenarios`, `useReplay`. Done: `state/planner.ts` (reducer + `derive`), `state/PlannerContext.tsx`, hooks; 12 reducer tests (38 total). `App.tsx` is a temporary debug panel until T4 to T7.
- [x] **T4. Street map** (1 h). Done: `map/MapView.tsx`, `map/basemap.ts`; maplibre-gl 4.7.1 + react-map-gl 7.1.7; OpenFreeMap positron (has no POI layer; filter guards anyway); checked 391 labels around A/B/C at zoom 13 to 15.5, none hospital-like. Hospital markers are plain A/B/C until T5.: `react-map-gl/maplibre` with OpenFreeMap positron, open on the study area, scroll/drag/pinch zoom, zoom buttons, `maxBounds` around Brooklyn, `minZoom` ~11, `maxZoom` ~15.5. Hide POI labels (hospitals especially). Attribution visible.
- [x] **T5. Map data layers** (1.5 h). Done: deck.gl 9.1.14 interleaved into MapLibre (`map/layers.ts`, `DeckOverlay.tsx`), circle vs triangle icons with GPU time filter, pulse ring while playing, `HospitalMarker` with queue + "N waiting" (click to zoom), `Legend` top-left.: deck.gl calls layer (circle/triangle icons, filtered by `t` on the GPU), recent-call pulse layer, hospital markers with door queue and "N waiting", legend with "approximate locations".
- [x] **T6. Side panel** (2 h). Done: app shell (`App.tsx`), `TopBar`, `RealStats`, `PlanCard`, `CompareCard`, `WhyCard`, `Footer`, `Badge`, shared `styles/ui.css`. Temporary `ReplayBar` under the map until T7. Parity checked against the old page: same numbers for order, 4-shift limit, budget, AI, +2 ambulances, night switch, Send schedule URL.: TopBar + NightTabs, RealStats, BudgetStepper + BestValue, PlanGrid ("+1" / "AI" labels, heat bars), Show AI plan / Clear / Send schedule, CompareBars (tap to switch view), StatsGrid, WhyChart.
- [x] **T7. Timeline + HUD** (1 h). Done: `components/Timeline.tsx` (15-min call histogram, late triangles, drag/click/keyboard playhead, play/pause), `components/MapHud.tsx` (late count + clock over the map). Legend moved under the timeline so it no longer covers map credits. Verified on real data.: block timeline with histogram and late ticks, draggable playhead, play/pause, clock + headline HUD over the map.
- [x] **T8. Animation pass** (1 h). Done: `lib/motion.ts` (reduced-motion aware), `useAnimatedNumber` + `AnimatedNumber` (HUD, compare values, stats count up/down), grid row labels A/B/C ease the map to that hospital (`map/mapControl.ts`), camera and pulse respect reduced motion. Existing: bar width, slot press, queue arrive, night fly-to. Skipped: icon size crossfade (calls reorder when late set changes, so per-item tweening would mismatch).: everything in section 7, plus reduced-motion check.
- [x] **T9. Schedule sheet** (45 min). Done: `schedule/ScheduleSheet.tsx`, same `?night=&plan=` URL as the old page; checked 3-shift plan, 6-shift AI plan (beyond the lookup), empty plan, invalid plan, unknown night; fixed the blank SIM badge bug the old sheet also had.: React version of `schedule.html` (same URL params `night`, `plan`), print styles, empty and invalid plan messages.
- [ ] **T10. Offline base map** (1 to 1.5 h, after cutover is safe): extract a Brooklyn `pmtiles` file (study area bbox, max zoom 15), serve fonts and sprites locally, switch style automatically when offline. If the file is over ~40 MB, gitignore it and add a download script instead of committing it.
- [x] **T11. QA + cutover** (1 h). Done Sat ~11:50 PM: parity checklist 15/15 automated checks pass on real data at 1280×720 in dark mode (after fixing one bug: count-up numbers froze when the window was hidden; now always land on the final value); all 36 budget steps × 3 nights match the export; production build (`npm run preview`) verified, dev hook stripped, console clean; `web/app/README.md` has run + demo steps. Not measured: frame rate during replay (browser pane was hidden, so frames were throttled); check on the demo laptop. **Cutover:** the React app is the demo; old `web/index.html` stays as the offline fallback.: run the parity checklist, test at 1280×720 with the laptop in dark mode, check console is clean, check performance during replay, write run instructions in `web/app/README.md`. Then decide the demo entry point.

Total: about 10 to 11 hours. **Must-have path:** T0 to T7, T9, T11 (about 9 h). T8 can shrink. T10 is protected by the fallback: if there's no internet at judging, the old page still works offline.

### Checkpoints

| Time | Target |
|---|---|
| 7 PM sync | Plan agreed with Person A. T1 done. |
| 10 PM | T2 to T5 done: map with calls and hospitals on fake data |
| 12 AM sync | T6, T7 done. Real `scenarios.json` plugged in. **Go/no-go on cutover.** If not at parity, keep the old page for the demo and keep polishing the new one. |
| 4 AM sync | T8, T9 done. T10 if time. |
| 8 AM | Code freeze. Only slides, video, rehearsal after. |

Sleep: take a 2-hour block between 4 and 7 AM, after the 4 AM sync.

## 10. Parity checklist (the new app must do all of this)

- [ ] Night tabs switch nights, reset the plan, and set budget to best value
- [ ] Replay 6 PM to 6 AM with clock; scrubbing the timeline pauses and updates the map
- [ ] Headline "N people waited over 10 min" counts only calls shown so far (SIM)
- [ ] Hospital door queues change per block, with "N waiting"
- [ ] Grid: toggle slots, "+1" for yours, "AI" for AI, heat bar per slot
- [ ] Tapping A-3 then A-2 gives the same result as A-2 then A-3
- [ ] 5th shift shows "We precomputed plans up to 4 shifts…" and no console error
- [ ] Budget limit message; lowering budget drops the most recent shift
- [ ] Best-value hint with SIM badge
- [ ] Compare: do nothing / +2 ambulances / your plan / AI plan, tap to switch map view
- [ ] Stats: reached late, extra people in time, cost, cost per extra person
- [ ] Why chart for the most jammed hospital, plus real median time at hospital (REAL)
- [ ] Send schedule opens the sheet for the plan on screen (yours or AI)
- [ ] Sheet: rows by time, effect, cost, fine print, print fits one page, empty and invalid plan messages
- [ ] FAKE DATA banner when `fake: true`
- [ ] Footer: A/B/C, nearest-hospital assumption, cleanup note, placeholder costs, generated time
- [ ] Late vs on-time readable without color
- [ ] Readable at 1280×720; light theme even when the laptop is in dark mode
- [ ] No console errors

## 11. Risks and fallbacks

| # | Risk | Fallback |
|---|---|---|
| R1 | Running out of time before parity | 12 AM go/no-go. Old page is the demo; new app is shown only if it's at parity. |
| R2 | No internet at judging (online tiles fail) | T10 offline tiles, or demo the old page, which is fully offline. |
| R3 | Street map labels name the real hospitals | Hide POI layers in the style. Check at every zoom level before the demo. |
| R4 | Dots at street zoom look like exact addresses | Max zoom cap + "approximate location" note in the legend. |
| R5 | maplibre / deck.gl / react-map-gl version mismatch | Use deck.gl's `MapboxOverlay` via `useControl`, the documented path. If it fights, render calls as native MapLibre layers instead. |
| R6 | Replay stutters with deck.gl | Use `DataFilterExtension` (GPU filter by time) instead of rebuilding data each frame. |
| R7 | Real data covers a much smaller area than fake | Camera fits to the actual calls + hospitals of the loaded night, not a hard-coded box. |
| R8 | Big files in git (tiles) | Gitignore + download script. |

## 12. Running it

```bash
cd web/app && npm install
```
```bash
npm run dev
```
```bash
npm run build && npm run preview
```
Old page (fallback): `cd web && python3 -m http.server 8765`.

## 13. Open questions (decide before T4)

1. **Online tiles first, offline second.** OK to start with OpenFreeMap (needs internet) and add offline tiles in T10?
2. **Look:** light clinical console as sketched in section 6, or do you have a visual reference (colors, a product you like)?
3. **Right panel:** one scrolling column (as now), or tabs (Plan / Compare / Why) so nothing scrolls on a projector?
4. **Fake data:** ask Person A to move `make_fake.py` to the 2.5 km study area?
