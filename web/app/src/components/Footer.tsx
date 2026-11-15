import { perAmbulanceCost } from "../lib/plan";
import { usePlanner } from "../state/PlannerContext";

export function Footer() {
  const { data } = usePlanner();
  const n = (v: number) => v.toLocaleString("en-US");
  return (
    <footer className="muted" style={{ fontSize: 13, padding: "0 4px 8px" }}>
      Hospitals shown as A, B, C. Calls go to the nearest ER (assumed). Est. costs: ${n(data.costs.nurse_shift_usd)} per
      nurse shift, ${n(perAmbulanceCost(data.costs))} per ambulance-night.
    </footer>
  );
}
