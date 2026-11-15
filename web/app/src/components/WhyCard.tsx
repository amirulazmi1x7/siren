import { VIEW_META, mostJammedHospital, viewNameInline } from "../lib/plan";
import { usePlanner } from "../state/PlannerContext";
import { Badge } from "./Badge";
import css from "./WhyCard.module.css";

const W = 420;
const H = 190;
const M = { t: 10, r: 6, b: 24, l: 34 };

/** Nice round axis max (10, 20, 50, 100 ...) at or above v. */
function niceMax(v: number): number {
  const step = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / step) * step;
}

export function WhyCard() {
  const { data, state, derived } = usePlanner();
  const { night, shown } = derived;
  const { index: hi, id } = mostJammedHospital(night);
  const base = night.baseline.door_wait_min[hi] ?? [];
  const cur = shown.door_wait_min[hi] ?? [];
  const yMax = niceMax(Math.max(...base, ...cur) * 1.05);

  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;
  const band = innerW / data.blocks.length;
  const barW = band * 0.36;
  const y = (v: number) => M.t + innerH - (v / yMax) * innerH;
  const ticks = [0, yMax / 2, yMax];
  const curColor = VIEW_META[state.view].color;

  return (
    <section className="card" aria-labelledby="why-h">
      <h2 id="why-h">
        Why it works <Badge kind="sim" />
      </h2>
      <p className="muted small">
        Hospital {id} has the most ambulances stuck at its door. Minutes each ambulance spends there, by block: do nothing
        vs {viewNameInline(state.view)}.
      </p>
      <svg className={css.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Minutes at Hospital ${id} by block`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={css.grid} />
            <text x={M.l - 6} y={y(v)} className={css.axis} textAnchor="end" dominantBaseline="middle">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {data.blocks.map((label, b) => {
          const x0 = M.l + b * band + (band - 2 * barW - 2) / 2;
          const bv = base[b] ?? 0;
          const cv = cur[b] ?? 0;
          return (
            <g key={label}>
              <rect x={x0} width={barW} y={y(bv)} height={y(0) - y(bv)} className={css.base}>
                <title>{`${label}, do nothing: ${bv} min`}</title>
              </rect>
              <rect
                x={x0 + barW + 2}
                width={barW}
                y={y(cv)}
                height={y(0) - y(cv)}
                fill={curColor}
                className={css.cur}
              >
                <title>{`${label}, ${viewNameInline(state.view)}: ${cv} min`}</title>
              </rect>
              <text x={M.l + b * band + band / 2} y={H - 6} className={css.axis} textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={css.key}>
        <span>
          <i className={css.swBase} /> Do nothing
        </span>
        <span>
          <i style={{ background: curColor }} /> {VIEW_META[state.view].name}
        </span>
      </div>
      <p className={`small ${css.real}`}>
        Real median time at hospital: <b className="num">{night.real.median_time_at_hospital_min} min</b>{" "}
        <Badge kind="real" />
      </p>
    </section>
  );
}
