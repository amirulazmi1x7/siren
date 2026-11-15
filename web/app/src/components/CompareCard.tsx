import { money, plural, signed } from "../lib/format";
import { VIEWS, VIEW_META, costOf, extraReached, resultForView } from "../lib/plan";
import { usePlanner } from "../state/PlannerContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { Badge } from "./Badge";
import css from "./CompareCard.module.css";

export function CompareCard() {
  const { data, state, dispatch, derived } = usePlanner();
  const { night } = derived;

  const rows = VIEWS.map((v) => {
    const r = resultForView(night, v, state.slots, state.budget);
    return { v, extra: r ? extraReached(night, r) : null, cost: costOf(data.costs, v, state.slots.length, state.budget) };
  });
  const maxExtra = Math.max(1, ...rows.map((r) => Math.abs(r.extra ?? 0)));

  const sub = (v: (typeof VIEWS)[number], cost: number) =>
    v === "nothing"
      ? "baseline"
      : v === "amb"
        ? money(cost)
        : v === "ai"
          ? `${plural(state.budget, "shift")} · ${money(cost)}`
          : `${plural(state.slots.length, "shift")} · ${money(cost)}`;

  const { result, extra, cost } = derived;
  const perPerson = extra !== null && extra > 0 && cost > 0 ? cost / extra : null;

  return (
    <section className="card" aria-labelledby="cmp-h">
      <h2 id="cmp-h">
        Compare <Badge kind="sim" />
      </h2>
      <p className="muted small">Extra people reached in time vs doing nothing. Tap a row to show it on the map.</p>

      <div className={css.rows}>
        {rows.map((r) => (
          <button
            key={r.v}
            type="button"
            className={`${css.row} ${state.view === r.v ? css.sel : ""}`}
            aria-pressed={state.view === r.v}
            data-view={r.v}
            onClick={() => dispatch({ type: "setView", view: r.v })}
          >
            <span className={css.name}>
              {VIEW_META[r.v].name}
              <small>{sub(r.v, r.cost)}</small>
            </span>
            <span className={css.track} aria-hidden="true">
              <span
                className={css.bar}
                style={{
                  width: `${r.extra === null ? 0 : (Math.max(0, r.extra) / maxExtra) * 100}%`,
                  background: VIEW_META[r.v].color,
                }}
              />
            </span>
            {r.extra === null ? (
              <span className={`num ${css.val}`}>n/a</span>
            ) : (
              <AnimatedNumber value={r.extra} format={(n) => signed(Math.round(n))} className={`num ${css.val}`} />
            )}
          </button>
        ))}
      </div>

      {result ? (
        <div className={css.stats} data-testid="stats">
          <Stat value={result.late_ids.length} label="reached late" />
          <Stat value={extra ?? 0} format={(n) => signed(Math.round(n))} label="extra people in time" />
          <Stat value={cost} format={money} label="cost for the night" />
          <Stat value={perPerson} format={money} label="cost per extra person" />
        </div>
      ) : (
        <p className="muted small">No precomputed result for this plan.</p>
      )}
    </section>
  );
}

function Stat({ value, label, format }: { value: number | null; label: string; format?: (n: number) => string }) {
  return (
    <div className={css.stat}>
      <b className="num">{value === null ? "-" : <AnimatedNumber value={value} format={format} />}</b>
      <span>{label}</span>
    </div>
  );
}
