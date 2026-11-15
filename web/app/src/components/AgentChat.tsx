import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { type Slot, isSlot } from "../lib/contract";
import { usePlanner } from "../state/PlannerContext";
import css from "./AgentChat.module.css";

/** Shape returned by the chat server (chat/server.py). */
interface ChatStep {
  tool: string;
  summary: string;
}
interface ChatPlan {
  nurse_shifts: string[];
  extra_ambulances: number;
  cost_usd?: number;
}
interface Turn {
  role: "user" | "agent";
  text: string;
  steps?: ChatStep[];
  plan?: ChatPlan | null;
  error?: boolean;
}

const NIGHT_WORDS: Record<string, string> = {
  typical: "the typical Friday",
  holiday: "the holiday weekend Friday",
  heat: "the busy summer Friday",
};

const SUGGESTIONS = [
  "What if Hospital B is short-staffed tonight?",
  "What if tonight is 30% busier?",
  "Is 2 extra ambulances better than nurses?",
];

/** Ask the agent a what-if. Answers come from Claude running the rehearsal through tools (chat/tools.py). */
export function AgentChat() {
  const { state, dispatch } = usePlanner();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const session = useRef(`s-${Math.random().toString(36).slice(2)}`);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => setOnline(r.ok))
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    // The agent needs to know which night and budget the user is looking at.
    const context = `(I'm looking at ${NIGHT_WORDS[state.nightName] ?? state.nightName} with a budget of $${state.recBudget}.) `;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.current, message: context + q }),
      });
      const body = (await r.json()) as { reply?: string; steps?: ChatStep[]; plan?: ChatPlan | null; error?: string };
      setTurns((t) => [
        ...t,
        body.error || !r.ok
          ? { role: "agent", text: body.error ?? `The chat server returned ${r.status}.`, error: true }
          : { role: "agent", text: body.reply ?? "", steps: body.steps ?? [], plan: body.plan ?? null },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "agent", text: "Can't reach the chat server. Start it with: python -m chat.server", error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  const showPlan = (p: ChatPlan) => {
    const slots = p.nurse_shifts.filter(isSlot) as Slot[];
    dispatch({ type: "loadPlan", slots });
  };

  if (online === false) {
    return (
      <p className={css.offline}>
        The what-if chat is offline. Start it with <code>python -m chat.server</code>.
      </p>
    );
  }

  return (
    <section className={css.chat} aria-label="Ask the agent">
      <div className={css.log} aria-live="polite">
        {turns.length === 0 && (
          <div className={css.suggest}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className={css.chip} onClick={() => void ask(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className={css.user}>
              {t.text}
            </p>
          ) : (
            <div key={i} className={`${css.agent} ${t.error ? css.error : ""}`}>
              {t.steps && t.steps.length > 0 && (
                <ol className={css.steps}>
                  {t.steps.map((s, j) => (
                    <li key={j}>{s.summary}</li>
                  ))}
                </ol>
              )}
              <ReplyText text={t.text} />
              {t.plan && t.plan.extra_ambulances === 0 && t.plan.nurse_shifts.length > 0 && (
                <button type="button" className={`btn ${css.show}`} onClick={() => showPlan(t.plan!)}>
                  Show this plan on the map
                </button>
              )}
            </div>
          ),
        )}
        {busy && <p className={css.thinking}>Rehearsing the night…</p>}
        <div ref={end} />
      </div>
      <form className={css.form} onSubmit={onSubmit}>
        <input
          className={css.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a what-if, e.g. what if Hospital A is short-staffed?"
          aria-label="Ask the agent a question"
          disabled={busy}
        />
        <button type="submit" className="btn primary" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
      <p className={css.fine}>Answers come from Claude running the rehearsal (SIM). It can't rehearse what isn't modeled yet.</p>
    </section>
  );
}

/** "**x**" -> bold, without injecting HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <b key={i}>{part.slice(2, -2)}</b> : part,
  );
}

/**
 * The agent is told to answer in plain text, but models sometimes slip into markdown. Render the two forms it
 * uses (bullets and bold) properly instead of showing raw "**" and "- " on the projector. Text only, no HTML.
 */
function ReplyText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (items.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className={css.bullets}>
          {items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>,
      );
      items = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) items.push(bullet[1] ?? "");
    else {
      flush();
      if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <div className={css.reply}>{blocks}</div>;
}

