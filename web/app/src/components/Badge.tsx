/** REAL = measured NYC 911 data. SIM = rehearsal result. Every number on screen carries one. */
export function Badge({ kind }: { kind: "real" | "sim" }) {
  return (
    <span
      className={`badge ${kind}`}
      title={kind === "real" ? "Measured from NYC 911 data" : "Rehearsal result (replay of real 911 calls)"}
    >
      {kind === "real" ? "REAL" : "SIM"}
    </span>
  );
}
