import { usePlanner } from "../state/PlannerContext";

export function Footer() {
  const { data } = usePlanner();
  const n = (v: number) => v.toLocaleString("en-US");
  return (
    <footer className="muted" style={{ fontSize: 13, padding: "0 4px 8px" }}>
      Hospitals are shown as A, B and C. Each call goes to its nearest hospital (an assumption). Time at hospital includes
      cleanup, not only the handoff. Costs (${n(data.costs.nurse_shift_usd)} per nurse shift, $
      {n(data.costs.ambulance_night_usd)} for +2 ambulances) are placeholders. Data generated {data.generated_at}.
    </footer>
  );
}
