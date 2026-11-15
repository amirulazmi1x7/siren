import { useScenarios } from "./hooks/useScenarios";
import { HOSPITAL_IDS, N_BLOCKS, type NightName, type Slot } from "./lib/contract";
import { money, signed } from "./lib/format";
import { VIEWS, VIEW_META } from "./lib/plan";
import { clockLabel } from "./lib/time";
import { PlannerProvider, usePlanner } from "./state/PlannerContext";

export function App() {
  const s = useScenarios();
  if (s.status === "loading") return <p style={{ padding: 24 }}>Loading scenarios…</p>;
  if (s.status === "error")
    return <p style={{ padding: 24, color: "var(--late)" }}>Could not load scenarios.json: {s.message}</p>;
  return (
    <PlannerProvider data={s.data}>
      <DebugPanel />
    </PlannerProvider>
  );
}

// T3 debug panel: exercises state end to end. Replaced by the real layout in T4 to T7.
function DebugPanel() {
  const { data, state, dispatch, derived } = usePlanner();
  return (
    <main style={{ padding: 24, display: "grid", gap: 12, maxWidth: 760 }}>
      <h1 style={{ margin: 0 }}>Offload Planner (state debug)</h1>
      <div style={{ display: "flex", gap: 6 }}>
        {(Object.keys(data.nights) as NightName[]).map((n) => (
          <button key={n} aria-pressed={n === state.nightName} onClick={() => dispatch({ type: "setNight", name: n })}>
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => dispatch({ type: "togglePlay" })}>{state.playing ? "Pause" : "Play"}</button>
        <input
          type="range"
          min={0}
          max={720}
          value={state.t}
          onChange={(e) => dispatch({ type: "setTime", t: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <b data-testid="clock">{clockLabel(state.t)}</b>
      </div>
      <div>
        Budget <button onClick={() => dispatch({ type: "setBudget", budget: state.budget - 1 })}>−</button>{" "}
        <b data-testid="budget">{state.budget}</b>{" "}
        <button onClick={() => dispatch({ type: "setBudget", budget: state.budget + 1 })}>+</button>{" "}
        <button onClick={() => dispatch({ type: "toggleAi" })}>Show AI plan</button>{" "}
        <button onClick={() => dispatch({ type: "clear" })}>Clear</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `30px repeat(${N_BLOCKS}, 1fr)`, gap: 4 }}>
        {HOSPITAL_IDS.map((h) => [
          <b key={h}>{h}</b>,
          ...Array.from({ length: N_BLOCKS }, (_, b) => {
            const slot = `${h}-${b}` as Slot;
            const on = derived.shownSlots.has(slot);
            return (
              <button key={slot} data-slot={slot} aria-pressed={on} onClick={() => dispatch({ type: "toggleSlot", slot })}>
                {on ? (state.view === "ai" ? "AI" : "+1") : "·"}
              </button>
            );
          }),
        ])}
      </div>
      {state.msg && <p style={{ color: "var(--late)" }}>{state.msg}</p>}
      <div style={{ display: "flex", gap: 6 }}>
        {VIEWS.map((v) => (
          <button key={v} aria-pressed={v === state.view} onClick={() => dispatch({ type: "setView", view: v })}>
            {VIEW_META[v].name}
          </button>
        ))}
      </div>
      <pre data-testid="derived" style={{ background: "var(--card)", padding: 12, margin: 0 }}>
        {JSON.stringify(
          {
            night: derived.night.label,
            view: state.view,
            slots: state.slots,
            block: derived.block,
            lateSoFar: derived.lateSoFar,
            extra: derived.extra === null ? null : signed(derived.extra),
            cost: money(derived.cost),
            bestValue: derived.bestValue,
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
