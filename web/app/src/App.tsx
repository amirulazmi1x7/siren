import { BeatPlanner } from "./components/BeatPlanner";
import { Footer } from "./components/Footer";
import { FixLibrary, HowItWorks } from "./components/HowItWorks";
import { MapHud } from "./components/MapHud";
import { OptionsCard } from "./components/OptionsCard";
import { ProblemStrip } from "./components/ProblemStrip";
import { RecommendationCard } from "./components/RecommendationCard";
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
  const { data } = usePlanner();
  return (
    <div className={css.shell}>
      <TopBar />
      {data.fake && (
        <div className={css.fake} role="note">
          FAKE DATA for building the page. Real numbers arrive with the pipeline export.
        </div>
      )}
      <ProblemStrip />
      <main className={css.main}>
        {/* Decision first: the recommendation, how it was chosen, then the hands-on challenge. */}
        <aside className={css.panel} aria-label="Planner">
          <RecommendationCard />
          <OptionsCard />
          <HowItWorks />
          <FixLibrary />
          <BeatPlanner />
          <Footer />
        </aside>
        <section className={css.mapCol} aria-label="Map of the night">
          <div className={css.mapBox}>
            <MapView />
            <MapHud />
          </div>
          <Timeline />
          <Legend />
        </section>
      </main>
    </div>
  );
}
