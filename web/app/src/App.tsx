import { AgentPanel } from "./components/AgentPanel";
import { MapHud } from "./components/MapHud";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { useScenarios } from "./hooks/useScenarios";
import { Legend } from "./map/Legend";
import { MapView } from "./map/MapView";
import { PlannerProvider, usePlanner } from "./state/PlannerContext";
import css from "./App.module.css";

export function App() {
  const s = useScenarios();
  if (s.status === "loading") return <p className={css.status}>Loading scenarios…</p>;
  if (s.status === "error")
    return (
      <p className={css.status} role="alert">
        Could not load scenarios.json ({s.message}). Check that web/data/scenarios.json exists.
      </p>
    );
  return (
    <PlannerProvider data={s.data}>
      <Shell />
    </PlannerProvider>
  );
}

function Shell() {
  const { data, state } = usePlanner();
  return (
    <div className={css.shell} data-phase={state.phase}>
      <TopBar />
      {data.fake && (
        <div className={css.fake} role="note">
          FAKE DATA for building the page. Real numbers arrive with the pipeline export.
        </div>
      )}
      {/* The map is the stage; the agent speaks over it, the replay controls dock at the bottom. */}
      <main className={css.stage}>
        <div className={css.map} aria-label="Map of the night">
          <MapView />
        </div>
        <div className={css.rail}>
          <AgentPanel />
        </div>
        {state.phase !== "brief" && <MapHud />}
        <div className={css.dock}>
          <Timeline />
          <Legend />
        </div>
      </main>
    </div>
  );
}
