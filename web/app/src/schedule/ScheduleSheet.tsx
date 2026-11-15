import { useScenarios } from "../hooks/useScenarios";
import { type NightName, type Scenarios, type Slot, parsePlanKey, planKey, resultFor } from "../lib/contract";
import { money, plural, signed } from "../lib/format";
import { blockLabel } from "../lib/time";
import { Badge } from "../components/Badge";
import { perAmbulanceCost } from "../lib/plan";
import css from "./ScheduleSheet.module.css";

/** Printable shift sheet. URL: schedule.html?night=<name>&plan=<plan key> (same as the old page). */
export function ScheduleSheet() {
  const s = useScenarios();
  return (
    <>
      <div className={css.bar}>
        <a href={`${import.meta.env.BASE_URL}`}>← Back to planner</a>
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <main className={css.sheet}>
        <h1 className={css.title}>SIREN shift schedule</h1>
        {s.status === "loading" && <p className="muted">Loading…</p>}
        {s.status === "error" && <Problem text="Could not load scenarios.json." />}
        {s.status === "ready" && <SheetBody data={s.data} />}
        <div className={css.sign}>
          <div>Approved by</div>
          <div>Date</div>
        </div>
      </main>
    </>
  );
}

function SheetBody({ data }: { data: Scenarios }) {
  const params = new URLSearchParams(window.location.search);
  const nightName = (params.get("night") || "typical") as NightName;
  const night = data.nights[nightName];
  if (!night) return <Problem text={`Unknown night "${nightName}".`} />;

  const slots = parsePlanKey(params.get("plan") ?? "");
  if (!slots) return <Problem text="This link has an invalid plan." />;
  const amb = Number(params.get("amb") ?? "0");
  if (!Number.isInteger(amb) || amb < 0 || amb > 2) return <Problem text="This link has an invalid ambulance count." />;

  document.title = `SIREN shift schedule · ${night.label}`;
  const meta = (
    <p className={css.meta}>
      {data.city.area}, {data.city.name} · {night.label} · Friday 6 PM to Saturday 6 AM
    </p>
  );

  if (slots.length === 0 && amb === 0) {
    return (
      <>
        {meta}
        <div className={css.empty}>
          No shifts placed. Go back to the planner and tap a slot to add an offload nurse.
        </div>
      </>
    );
  }

  const rows = slots
    .map((slot: Slot) => {
      const [h, b] = slot.split("-");
      return { h: h ?? "", b: Number(b) };
    })
    .sort((x, y) => x.b - y.b || x.h.localeCompare(y.h));

  // If this plan is one of the planner's options, use its averaged numbers (same as the recommendation card).
  // Otherwise (your own plan), use the single rehearsal run from the lookup.
  const option = night.options?.find((o) => o.extra_ambulances === amb && planKey(o.slots) === planKey(slots));
  const nothing = night.options?.find((o) => o.id === "nothing");
  const result = amb === 0 ? resultFor(night, slots) : null;
  const before = option && nothing ? nothing.late : night.baseline.late_ids.length;
  const after = option ? option.late : (result?.late_ids.length ?? null);
  const fmt = (n: number) => (option ? n.toFixed(1) : String(n));
  const shiftCost = data.costs.nurse_shift_usd;
  const ambCost = perAmbulanceCost(data.costs);
  const total = option ? option.cost_usd : slots.length * shiftCost + amb * ambCost;

  return (
    <>
      {meta}
      <table className={css.table}>
        <thead>
          <tr>
            <th>Hospital</th>
            <th>Time</th>
            <th>Staff</th>
            <th>Shift cost</th>
          </tr>
        </thead>
        <tbody>
          {amb > 0 && (
            <tr>
              <td>
                <b>Ambulance service</b>
              </td>
              <td>6 PM to 6 AM</td>
              <td>{plural(amb, "extra ambulance")}</td>
              <td className="num">{money(amb * ambCost)}</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={`${r.h}-${r.b}`}>
              <td>
                <b>Hospital {r.h}</b>
              </td>
              <td>{blockLabel(r.b)}</td>
              <td>1 offload nurse</td>
              <td className="num">{money(shiftCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={css.summary}>
        <div>
          {option ? (
            <>
              <b className="num">{option.hours_back.toFixed(1)} h</b>
              <span>
                ambulance-hours back on the road <Badge kind="sim" />
              </span>
            </>
          ) : (
            <>
              <b className="num">{after === null ? "n/a" : signed(before - after)}</b>
              <span>
                extra people reached in 10 min <Badge kind="sim" />
              </span>
            </>
          )}
        </div>
        <div>
          <b className="num">
            {fmt(before)}
            {after === null ? "" : ` → ${fmt(after)}`}
          </b>
          <span>
            calls over 10 min, before → after <Badge kind="sim" />
          </span>
        </div>
        <div>
          <b className="num">{money(total)}</b>
          <span>
            total for {[amb > 0 && plural(amb, "ambulance"), slots.length > 0 && plural(slots.length, "shift")]
              .filter(Boolean)
              .join(" and ")}{" "}
            (est.)
          </span>
        </div>
      </div>

      <p className={css.fine}>
        {option && "Effects are averages over rehearsal runs. "}The expected effect comes from a rehearsal (SIM) of this night on real NYC 911 calls, checked against real data (median response{" "}
        {night.real.median_response_min} min, median time at hospital {night.real.median_time_at_hospital_min} min{" "}
        <Badge kind="real" />
        ). It is a planning estimate, not a guarantee. Hospitals are shown as A, B and C. Each call is assumed to go to its
        nearest hospital. Time at hospital includes cleanup, not only the handoff. Shift costs ({money(shiftCost)} per
        2-hour shift) are placeholders.
        {data.fake && (
          <>
            <br />
            <b>This sheet uses FAKE DATA for building the page.</b>
          </>
        )}{" "}
        Data generated {data.generated_at}.
      </p>
    </>
  );
}

function Problem({ text }: { text: string }) {
  return (
    <p className={css.error} role="alert">
      {text}
    </p>
  );
}
