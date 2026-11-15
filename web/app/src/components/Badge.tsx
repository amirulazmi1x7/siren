/** REAL = measured NYC 911 data. SIM = simulation output. Every number on screen carries one. */
export function Badge({ kind }: { kind: "real" | "sim" }) {
  return (
    <span
      className={`badge ${kind}`}
      title={kind === "real" ? "Measured from NYC 911 data" : "Simulation output"}
    >
      {kind === "real" ? "REAL" : "SIM"}
    </span>
  );
}
