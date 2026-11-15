import { useEffect, useState } from "react";

// T1 shell: proves the data path (web/data/scenarios.json -> /scenarios.json).
// Replaced by the real layout in T6/T7.
type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; nights: string[]; fake: boolean };

export function App() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}scenarios.json`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ nights: Record<string, unknown>; fake?: boolean }>;
      })
      .then((d) => setState({ kind: "ready", nights: Object.keys(d.nights), fake: !!d.fake }))
      .catch((e: unknown) => setState({ kind: "error", message: String(e) }));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Offload Planner</h1>
      <p style={{ color: "var(--muted)" }}>React + TypeScript shell (redesign in progress).</p>
      {state.kind === "loading" && <p>Loading scenarios…</p>}
      {state.kind === "error" && <p style={{ color: "var(--late)" }}>Could not load scenarios.json: {state.message}</p>}
      {state.kind === "ready" && (
        <p data-testid="nights">
          Loaded nights: {state.nights.join(", ")}
          {state.fake ? " (fake data)" : ""}
        </p>
      )}
    </main>
  );
}
