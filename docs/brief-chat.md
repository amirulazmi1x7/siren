# Brief for Claude: AmbuReady what-if chat (handoff)

Paste this to your Claude. Person A built the chat; Person B (you) now owns finishing and polishing it.

## What exists (all committed on main)
- `chat/tools.py` — 4 tools Claude can call, all backed by our rehearsal (`sim/`):
  `get_night`, `compare_options`, `simulate_plan`, `plan_for_conditions`.
  What-ifs supported: `short_staffed_er` ("A"/"B"/"C", door capacity −1) and `busier_percent` (0–100).
  Data comes from `web/data/scenarios.json`.
- `chat/server.py` — stdlib HTTP server on 127.0.0.1:8787.
  `GET /api/health`, `POST /api/chat {session_id, message}` → `{reply, steps:[{tool,input,summary}], plan}`.
  Model `claude-opus-5-5`, manual tool loop (max 6 rounds), history kept server-side. The SYSTEM prompt enforces:
  numbers only from tools, REAL vs SIM labels, no lives-saved number, hospitals A/B/C only, short manager style,
  "can't rehearse that yet" for unmodeled things.
- `web/app/src/components/AgentChat.tsx` (+ `.module.css`) — chat UI: health check (offline message if server down),
  3 suggestion chips, shows the agent's steps, reply, and a "Show this plan on the map" button.
  Prepends "(I'm looking at <night> with a budget of $X.)" to each question.
- `planner.ts` — new action `loadPlan {slots}` (sets view "yours", slots, budget, t=0, playing). Test in `tests/planner.test.ts`.
- `AgentPanel.tsx` — Decision phase has an open drawer "Ask the agent a what-if" containing `<AgentChat/>`.
- `vite.config.ts` — proxy `/api` → `http://127.0.0.1:8787`.
- Tests: `tests/chat/` (8 tests, fake Claude). All Python + app tests pass.

## Status
Unit-tested with a fake Claude. **Never run against the real API yet.** First job: run it live.

## Run it
The API key stays in the shell only — never in code, `.env` committed to git, or the browser.
```bash
uv pip install --python .venv/bin/python anthropic   # once
export ANTHROPIC_API_KEY=...
PYTHONPATH=. .venv/bin/python -m chat.server
```
Second terminal: `npm --prefix web/app run dev` → http://localhost:5173 → Plan this night → chat drawer.

## Live test checklist (check answers, not just that it replies)
1. "What if Hospital B is short-staffed tonight?" → should call `plan_for_conditions`, give a plan + SIM numbers.
2. "What if tonight is 30% busier?" → same, with busier_percent 30.
3. "Is 2 extra ambulances better than nurses?" → compare_options / simulate_plan; costs $5,280 for +2.
4. "How many lives does this save?" → must NOT give a number; explains ~8%/min for cardiac arrest.
5. Off-topic ("write me a poem") → polite decline.
6. "What about rerouting patients?" → "can't rehearse that yet".
7. Every number in replies should match a tool result; hospitals never named.
If a reply is too long for the projector, tighten the Style section of SYSTEM in `chat/server.py`.

## Rules (don't break)
- Hospitals stay A/B/C. Label REAL vs SIM. No lives-saved number anywhere.
- Product name AmbuReady; say "rehearsal", not "digital twin/simulation", in user-facing copy
  (note: `AgentPanel.tsx` Brief still says "digital twin" in the fine print — change to "rehearsal").
- Don't change `scenarios.json` shape without telling Person A.

## Nice-to-haves if time
- "Show this plan on the map" only works for nurse-only plans; add extra-ambulance support if the map/state can show it.
- Latency: each answer ~5–20 s. The "Rehearsing the night…" line covers it; streaming is optional.
- A judge-facing line in the pitch: plain Claude can't answer "what if B is short-staffed" with numbers; ours runs the rehearsal.
