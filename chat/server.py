"""Siren chat: a small local server that lets Claude answer what-if questions by running our rehearsal.

Run (key stays in your shell, never in code or git):
    export ANTHROPIC_API_KEY=...        # or `ant auth login`
    PYTHONPATH=. .venv/bin/python -m chat.server

POST /api/chat {"session_id": str, "message": str}
  -> {"reply": str, "steps": [{"tool", "input", "summary"}], "plan": {...} | null}
The Vite dev server proxies /api to this port (see web/app/vite.config.ts).
"""
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import anthropic

from chat.tools import TOOL_SCHEMAS, run_tool

PORT = int(os.environ.get("SIREN_CHAT_PORT") or os.environ.get("AMBUREADY_CHAT_PORT") or "8787")
MODEL = "claude-opus-5-5"
MAX_TOOL_ROUNDS = 6

SYSTEM = """You are Siren, a planning agent for ER and EMS managers in central Brooklyn (three ERs, called \
Hospital A, B and C). Ambulances lose time waiting at ER doors to hand over patients; you recommend the cheapest \
fixes for a Friday night (offload nurse shifts at an ER door, extra ambulances, or both).

How you work:
- Every number you give comes from your tools. Call a tool before answering any question about nights, plans, \
costs or outcomes. Never estimate or invent figures yourself.
- The tools run a rehearsal: a replay of real NYC 911 calls from that night on a model of the area's ambulances \
and ER doors, checked against real nights. Measured data is REAL; rehearsal results are SIM. Say which is which.
- For what-ifs (an ER short-staffed, a busier night), use plan_for_conditions to re-plan, or simulate_plan to \
check one plan.
- You can only rehearse what the tools support: these three Friday nights, nurse shifts at A/B/C in 2-hour \
blocks, 0-2 extra ambulances, one ER short-staffed, and up to 100% more calls. If asked about anything else \
(rerouting patients, weather, traffic, other cities, staffing beyond this), say plainly you can't rehearse that \
yet and offer the closest thing you can.
- Do not state a number of lives saved. If asked, explain that for cardiac arrest each minute of delay lowers \
survival odds by about 8% (published research), and that in three ERs there are too few arrest calls to measure \
lives saved honestly. Talk in minutes saved and people reached within 10 minutes.
- Costs are estimates ($180 per 2-hour nurse shift, $2,640 per extra ambulance per night).
- Never name the real hospitals; they are A, B and C.
- Stay on ambulance and ER planning. For an unrelated request (a poem, general trivia), decline in one short \
sentence and suggest a what-if you can rehearse. Do not call any tool for it.

Style: you are talking to a busy manager on a projector. Plain text only: no markdown, no ** bold, no \
headers, no tables. Lead with the recommendation in one sentence. Then at most 3 short lines starting with "- ", \
each with one key number and its SIM or REAL tag. End with one short line: rehearsal averages, costs are estimates. \
Keep the whole reply under 80 words. Write times like "10 PM to 2 AM", not block numbers."""

_client: anthropic.Anthropic | None = None
_sessions: dict[str, list] = {}
_lock = threading.Lock()


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def _summary(name: str, args: dict) -> str:
    """One readable line per tool call, shown in the chat as the agent's steps."""
    night = {"typical": "the typical Friday", "holiday": "the holiday weekend", "heat": "the busy summer Friday"}.get(
        args.get("night", ""), "the night")
    extras = []
    if args.get("short_staffed_er"):
        extras.append(f"Hospital {args['short_staffed_er']} short-staffed")
    if args.get("busier_percent"):
        extras.append(f"{args['busier_percent']:g}% more calls")
    cond = f" ({', '.join(extras)})" if extras else ""
    if name == "get_night":
        return f"Reading {night}"
    if name == "compare_options":
        return f"Comparing fixes for ${args.get('budget_usd', 0):,.0f} on {night}"
    if name == "simulate_plan":
        n = len(args.get("nurse_shifts", []))
        a = args.get("extra_ambulances", 0)
        what = ", ".join(p for p in (f"{n} nurse shift{'s' if n != 1 else ''}" if n else "",
                                     f"+{a} ambulance" if a else "") if p) or "no fix"
        return f"Rehearsing {what} on {night}{cond}"
    if name == "plan_for_conditions":
        return f"Re-planning ${args.get('budget_usd', 0):,.0f} on {night}{cond}"
    return name


def _plan_from(name: str, result: dict) -> dict | None:
    if name == "plan_for_conditions" and "best" in result:
        b = result["best"]
    elif name == "simulate_plan" and "plan" in result:
        b = result["plan"]
    elif name == "compare_options" and "recommended" in result:
        b = result["recommended"]
    else:
        return None
    return {"nurse_shifts": b.get("nurse_shifts", []), "extra_ambulances": b.get("extra_ambulances", 0),
            "cost_usd": b.get("cost_usd")}


def chat(session_id: str, message: str) -> dict:
    """One user turn: loop Claude <-> tools until Claude answers. History is kept server-side, unedited."""
    with _lock:
        messages = _sessions.setdefault(session_id, [])
    messages.append({"role": "user", "content": message})
    steps, plan = [], None
    for _ in range(MAX_TOOL_ROUNDS):
        response = client().beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=SYSTEM,
            tools=TOOL_SCHEMAS,
            messages=messages,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason == "refusal":
            return {"reply": "I can't help with that one. Ask me about planning ambulances and ER staffing.",
                    "steps": steps, "plan": plan}
        uses = [b for b in response.content if b.type == "tool_use"]
        if response.stop_reason != "tool_use" or not uses:
            text = "\n".join(b.text for b in response.content if b.type == "text").strip()
            return {"reply": text or "(no answer)", "steps": steps, "plan": plan}
        results = []
        for u in uses:
            out = run_tool(u.name, dict(u.input))
            steps.append({"tool": u.name, "input": u.input, "summary": _summary(u.name, dict(u.input))})
            parsed = json.loads(out)
            plan = _plan_from(u.name, parsed) or plan
            results.append({"type": "tool_result", "tool_use_id": u.id, "content": out,
                            **({"is_error": True} if "error" in parsed else {})})
        messages.append({"role": "user", "content": results})
    return {"reply": "That took too many steps. Try a simpler question.", "steps": steps, "plan": plan}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send(200, {"ok": True, "model": MODEL})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/api/chat":
            return self._send(404, {"error": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            sid, msg = str(body.get("session_id", "default")), str(body.get("message", "")).strip()
            if not msg:
                return self._send(400, {"error": "Type a question first."})
            self._send(200, chat(sid, msg[:2000]))
        except anthropic.AuthenticationError:
            self._send(500, {"error": "The chat server has no valid Anthropic API key. Set ANTHROPIC_API_KEY and restart it."})
        except anthropic.RateLimitError:
            self._send(503, {"error": "Too many requests right now. Wait a few seconds and try again."})
        except anthropic.APIConnectionError:
            self._send(503, {"error": "Can't reach the Anthropic API. Check the internet connection."})
        except anthropic.APIStatusError as e:
            self._send(502, {"error": f"The AI service returned an error ({e.status_code}). Try again."})

    def log_message(self, fmt, *args) -> None:  # quieter console
        print("chat:", fmt % args)


def main() -> None:
    print(f"Siren chat on http://localhost:{PORT}  (model {MODEL})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
