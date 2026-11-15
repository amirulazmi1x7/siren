import { type Dispatch, type ReactNode, createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { Scenarios } from "../lib/contract";
import { useReplay } from "../hooks/useReplay";
import {
  type Derived,
  type PlannerAction,
  type PlannerState,
  derive,
  initialState,
  plannerReducer,
} from "./planner";

interface PlannerContextValue {
  data: Scenarios;
  state: PlannerState;
  dispatch: Dispatch<PlannerAction>;
  derived: Derived;
}

const Ctx = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ data, children }: { data: Scenarios; children: ReactNode }) {
  const reducer = useCallback((s: PlannerState, a: PlannerAction) => plannerReducer(s, a, data), [data]);
  const [state, dispatch] = useReducer(reducer, data, (d) => initialState(d));
  useReplay(state.playing, dispatch);
  const derived = useMemo(() => derive(state, data), [state, data]);
  const value = useMemo(() => ({ data, state, dispatch, derived }), [data, state, derived]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlanner must be used inside <PlannerProvider>");
  return v;
}
