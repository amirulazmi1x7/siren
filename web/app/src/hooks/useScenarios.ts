import { useEffect, useState } from "react";
import { type Scenarios, assertScenarios } from "../lib/contract";

export type ScenariosState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Scenarios };

/** Loads web/data/scenarios.json (served at /scenarios.json). */
export function useScenarios(): ScenariosState {
  const [state, setState] = useState<ScenariosState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}scenarios.json`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<unknown>;
      })
      .then((raw) => {
        if (!cancelled) setState({ status: "ready", data: assertScenarios(raw) });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
