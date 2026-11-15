import { AgentPanel } from "./components/AgentPanel";
import { RightRail } from "./components/RightRail";
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
      {/* The map fills the screen; everything else floats on top as glass. */}
      <div className={css.map} aria-label="Map of the night">
        <MapView />
      </div>
      <div className={css.overlay}>
        <TopBar />
        {data.fake && (
          <div className={css.fake} role="note">
            FAKE DATA for building the page. Real numbers arrive with the pipeline export.
          </div>
        )}
        <main className={css.middle}>
          <div className={css.left}>
            <AgentPanel />
          </div>
          <div className={css.right}>
            <RightRail />
          </div>
        </main>
        <div className={css.bottom}>
          <Timeline />
          <div className={`glass ${css.legend}`}>
            <Legend />
          </div>
          <p className={css.ps}>
            <b>P.S.</b> An <b>offload nurse</b> waits at the ER door and takes patients off ambulance crews, so a crew
            can leave in minutes instead of waiting for a bed and get back to 911 calls. Ontario, Canada funds this; the
            agent tests where and when it helps most here.
          </p>
        </div>
      </div>
    </div>
  );
}
