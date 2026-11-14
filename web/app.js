// Offload Planner page. Reads only data/scenarios.json (contract: shared/contract.py).
// Nothing is computed live: every result comes from the precomputed file.

const HOSP_IDS = ["A", "B", "C"];
const MAX_LOOKUP_SHIFTS = 4;
const NIGHT_MIN = 720;
const REPLAY_SECONDS = 24; // a full night plays in this many seconds

const VIEWS = {
  nothing: { name: "Do nothing", color: "var(--muted)" },
  amb: { name: "+2 ambulances", color: "var(--amb)" },
  yours: { name: "Your plan", color: "var(--accent)" },
  ai: { name: "AI plan", color: "var(--ai)" },
};

const state = {
  data: null,
  nightName: "typical",
  slots: [], // user's slots, in the order they were placed
  budget: 3,
  view: "yours",
  t: NIGHT_MIN,
  playing: false,
  msg: "",
};

// ---------- contract helpers (must match shared/contract.py) ----------

function planKey(slots) {
  return [...new Set(slots)].sort().join(",");
}

function resultFor(night, slots) {
  return night.lookup[planKey(slots)] ?? null;
}

async function loadScenarios() {
  const res = await fetch("data/scenarios.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`scenarios.json: HTTP ${res.status}`);
  return res.json();
}

console.assert(planKey(new Set(["B-3", "A-2", "A-3"])) === "A-2,A-3,B-3", "planKey must match Python plan_key");
console.assert(planKey([]) === "", "empty plan key must be ''");

// ---------- derived state ----------

const night = () => state.data.nights[state.nightName];
const blockOf = (t) => Math.min(5, Math.max(0, Math.floor(t / 120)));
const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");

function currentResult(view = state.view) {
  const n = night();
  if (view === "nothing") return n.baseline;
  if (view === "amb") return n.ambulances_plus2;
  if (view === "ai") return n.ai_plans[String(state.budget)];
  return resultFor(n, state.slots);
}

function costOf(view) {
  const c = state.data.costs;
  if (view === "amb") return c.ambulance_night_usd;
  if (view === "ai") return state.budget * c.nurse_shift_usd;
  if (view === "yours") return state.slots.length * c.nurse_shift_usd;
  return 0;
}

function clockLabel(t) {
  const mins = (18 * 60 + Math.round(t)) % (24 * 60);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

// ---------- map ----------

const map = { svg: null, proj: null, w: 600, h: 600, dots: null, hosp: null, geo: null };
const PAD = 16;

// Zip code shapes are optional: if the file is missing the map still works on a blank background.
async function loadAreaShapes() {
  try {
    const res = await fetch("data/brooklyn_zcta.geojson");
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function setupMap(geo) {
  const svg = d3.select("#map").attr("viewBox", `0 0 ${map.w} ${map.h}`);
  map.svg = svg;
  map.geo = geo;
  const land = svg.append("g").attr("class", "land");
  svg.append("g").attr("class", "calls");
  svg.append("g").attr("class", "hospitals");
  if (!geo) return;
  map.proj = d3.geoMercator().fitExtent([[PAD, PAD], [map.w - PAD, map.h - PAD]], geo);
  const path = d3.geoPath(map.proj);
  land.selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("d", path)
    .append("title")
    .text((f) => `ZIP ${f.properties.zip}`);
}

function drawNightOnMap() {
  const n = night();
  if (!map.geo) {
    const pts = [
      ...n.calls.map((c) => [c.lon, c.lat]),
      ...state.data.hospitals.map((h) => [h.lon, h.lat]),
    ];
    map.proj = d3.geoMercator().fitExtent(
      [[30, 30], [map.w - 30, map.h - 30]],
      { type: "MultiPoint", coordinates: pts },
    );
  }

  map.dots = map.svg.select("g.calls")
    .selectAll("circle")
    .data(n.calls, (c) => c.id)
    .join("circle")
    .attr("class", "call")
    .attr("fill", "var(--ok)")
    .attr("r", 4)
    .attr("cx", (c) => map.proj([c.lon, c.lat])[0])
    .attr("cy", (c) => map.proj([c.lon, c.lat])[1]);
  map.dots.selectAll("title").remove();
  map.dots.append("title").text((c) => `Call ${c.id} · ${clockLabel(c.t)} · goes to Hospital ${c.hosp}`);

  map.hosp = map.svg.select("g.hospitals")
    .selectAll("g.h")
    .data(state.data.hospitals, (h) => h.id)
    .join((enter) => {
      const g = enter.append("g").attr("class", "h");
      g.append("circle").attr("class", "hosp-ring").attr("fill", "var(--late)").attr("opacity", 0.18);
      g.append("rect").attr("x", -11).attr("y", -11).attr("width", 22).attr("height", 22).attr("rx", 5).attr("fill", "#1d1f23").attr("stroke", "#fff").attr("stroke-width", 1.5);
      g.append("text").attr("class", "hosp-label").text((h) => h.id);
      g.append("g").attr("class", "queue");
      g.append("title");
      return g;
    })
    .attr("transform", (h) => `translate(${map.proj([h.lon, h.lat]).join(",")})`);
}

function updateMap() {
  const res = currentResult() ?? night().baseline;
  const late = new Set(res.late_ids);
  const blk = blockOf(Math.min(state.t, NIGHT_MIN - 0.01));

  map.dots
    .attr("fill", (c) => (late.has(c.id) ? "var(--late)" : "var(--ok)"))
    .attr("opacity", (c) => (c.t <= state.t ? 0.85 : 0));

  map.hosp.each(function (h, i) {
    const stuck = res.stuck[i][blk];
    const n = Math.round(stuck);
    const g = d3.select(this);
    g.select(".hosp-ring").attr("r", 14 + Math.min(stuck, 12) * 2.2);
    g.select("title").text(`Hospital ${h.id}: about ${stuck} ambulances waiting at the door, ${res.door_wait_min[i][blk]} min at hospital (SIM)`);
    g.select(".queue")
      .selectAll("rect")
      .data(d3.range(Math.min(n, 12)))
      .join("rect")
      .attr("width", 10)
      .attr("height", 6)
      .attr("rx", 1.5)
      .attr("x", (k) => 16 + (k % 6) * 12)
      .attr("y", (k) => -7 + Math.floor(k / 6) * 8);
  });

  document.getElementById("clock").textContent = clockLabel(state.t);
  document.getElementById("time").value = state.t;
  const shown = night().calls.filter((c) => c.t <= state.t && late.has(c.id)).length;
  document.getElementById("lateCount").textContent = shown;
}

// ---------- replay ----------

let lastFrame = null;
function tick(now) {
  if (!state.playing) return;
  if (lastFrame !== null) {
    state.t = Math.min(NIGHT_MIN, state.t + ((now - lastFrame) / 1000) * (NIGHT_MIN / REPLAY_SECONDS));
  }
  lastFrame = now;
  updateMap();
  if (state.t >= NIGHT_MIN) {
    setPlaying(false);
    return;
  }
  requestAnimationFrame(tick);
}

function setPlaying(on) {
  state.playing = on;
  document.getElementById("play").textContent = on ? "❚❚ Pause" : "▶ Play night";
  if (on) {
    if (state.t >= NIGHT_MIN) state.t = 0;
    lastFrame = null;
    requestAnimationFrame(tick);
  }
}

// ---------- plan grid ----------

function renderGrid() {
  const grid = document.getElementById("grid");
  const blocks = state.data.blocks;
  const base = night().baseline;
  const aiSlots = new Set(state.view === "ai" ? night().ai_plans[String(state.budget)].slots : []);
  const mine = new Set(state.slots);
  const maxStuck = Math.max(1, ...base.stuck.flat());

  const parts = [`<div></div>`, ...blocks.map((b) => `<div class="lab">${b}</div>`)];
  HOSP_IDS.forEach((h, i) => {
    parts.push(`<div class="lab rowlab">${h}</div>`);
    blocks.forEach((_, b) => {
      const key = `${h}-${b}`;
      const cls = aiSlots.has(key) ? "ai" : mine.has(key) ? "on" : "";
      const heat = base.stuck[i][b] / maxStuck;
      const label = cls ? "+1" : "";
      parts.push(
        `<button class="slot ${cls}" data-slot="${key}" aria-pressed="${!!cls}" ` +
          `title="Hospital ${h}, ${blocks[b]}: ${base.stuck[i][b]} ambulances stuck if you do nothing (SIM)">` +
          `${label}<span class="heat" style="opacity:${(0.15 + 0.85 * heat).toFixed(2)};width:calc((100% - 6px) * ${heat.toFixed(2)})"></span></button>`,
      );
    });
  });
  grid.innerHTML = parts.join("");

  document.getElementById("budget").textContent = state.budget;
  document.getElementById("showAi").classList.toggle("active", state.view === "ai");
  const msg = document.getElementById("msg");
  msg.hidden = !state.msg;
  msg.textContent = state.msg;
}

function toggleSlot(key) {
  state.msg = "";
  if (state.view === "ai" || state.view === "nothing" || state.view === "amb") state.view = "yours";
  const i = state.slots.indexOf(key);
  if (i >= 0) {
    state.slots.splice(i, 1);
  } else if (state.slots.length >= MAX_LOOKUP_SHIFTS) {
    state.msg = "We precomputed plans up to 4 shifts. Remove one or press Show AI plan.";
  } else if (state.slots.length >= state.budget) {
    state.msg = `Your budget is ${state.budget} shift${state.budget === 1 ? "" : "s"}. Raise it or remove one.`;
  } else {
    state.slots.push(key);
  }
  render();
}

function setBudget(b) {
  state.budget = Math.min(6, Math.max(1, b));
  state.msg = "";
  while (state.slots.length > state.budget) state.slots.pop(); // drop most recently placed
  render();
}

// ---------- compare + stats ----------

function renderCompare() {
  const baseLate = night().baseline.late_ids.length;
  const rows = Object.keys(VIEWS).map((v) => {
    const r = currentResult(v);
    return { v, extra: r ? baseLate - r.late_ids.length : null, cost: costOf(v) };
  });
  const maxExtra = Math.max(1, ...rows.map((r) => Math.abs(r.extra ?? 0)));

  document.getElementById("compare").innerHTML = rows
    .map((r) => {
      const meta = VIEWS[r.v];
      const sub =
        r.v === "nothing" ? "baseline" :
        r.v === "amb" ? fmtMoney(r.cost) :
        r.v === "ai" ? `${state.budget} shifts · ${fmtMoney(r.cost)}` :
        `${state.slots.length} shifts · ${fmtMoney(r.cost)}`;
      const width = r.extra === null ? 0 : (Math.max(0, r.extra) / maxExtra) * 100;
      const val = r.extra === null ? "n/a" : (r.extra > 0 ? "+" : "") + r.extra;
      return (
        `<button class="cmp ${state.view === r.v ? "sel" : ""}" data-view="${r.v}">` +
        `<span class="name">${meta.name}<small>${sub}</small></span>` +
        `<span class="track"><span class="bar" style="display:block;width:${width}%;background:${meta.color}"></span></span>` +
        `<span class="val">${val}</span></button>`
      );
    })
    .join("");

  const r = currentResult();
  const stats = document.getElementById("stats");
  if (!r) {
    stats.innerHTML = `<div style="grid-column:1/-1"><span>No precomputed result for this plan.</span></div>`;
    return;
  }
  const late = r.late_ids.length;
  const extra = baseLate - late;
  const cost = costOf(state.view);
  const per = extra > 0 && cost > 0 ? fmtMoney(cost / extra) : "-";
  stats.innerHTML = [
    [late, "reached late"],
    [(extra > 0 ? "+" : "") + extra, "extra people in time"],
    [fmtMoney(cost), "cost for the night"],
    [per, "cost per extra person"],
  ]
    .map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`)
    .join("");
}

// ---------- why chart ----------

function renderWhy() {
  const n = night();
  const base = n.baseline;
  const cur = currentResult() ?? base;
  const sums = base.stuck.map((row) => d3.sum(row));
  const hi = sums.indexOf(Math.max(...sums));
  const h = HOSP_IDS[hi];

  document.getElementById("whyText").textContent =
    `Hospital ${h} has the most ambulances stuck at its door. Minutes each ambulance spends at Hospital ${h}, by block: do nothing vs ${VIEWS[state.view].name.toLowerCase()}.`;
  document.getElementById("whyReal").textContent = `${n.real.median_time_at_hospital_min} min`;

  const svg = d3.select("#why");
  const W = svg.node().clientWidth || 320;
  const H = 150;
  const m = { t: 8, r: 6, b: 20, l: 28 };
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  const x = d3.scaleBand().domain(state.data.blocks).range([m.l, W - m.r]).padding(0.25);
  const maxY = d3.max([...base.door_wait_min[hi], ...cur.door_wait_min[hi]]) || 1;
  const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([H - m.b, m.t]);
  const bw = x.bandwidth() / 2;

  svg.selectAll("*").remove();
  svg.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSize(0)).call((g) => g.select(".domain").remove());
  svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(0)).call((g) => g.select(".domain").remove());
  const blocks = state.data.blocks;
  svg.append("g").selectAll("rect").data(base.door_wait_min[hi]).join("rect")
    .attr("x", (_, b) => x(blocks[b])).attr("width", bw - 1)
    .attr("y", (v) => y(v)).attr("height", (v) => y(0) - y(v))
    .attr("fill", "var(--muted)").attr("opacity", 0.45);
  svg.append("g").selectAll("rect").data(cur.door_wait_min[hi]).join("rect")
    .attr("x", (_, b) => x(blocks[b]) + bw).attr("width", bw - 1)
    .attr("y", (v) => y(v)).attr("height", (v) => y(0) - y(v))
    .attr("fill", VIEWS[state.view].color);
}

// ---------- header ----------

function renderHeader() {
  const d = state.data;
  document.getElementById("city").textContent = `${d.city.area}, ${d.city.name}`;
  document.getElementById("fakeBanner").hidden = !d.fake;
  document.getElementById("nights").innerHTML = Object.entries(d.nights)
    .map(([k, n]) => `<button data-night="${k}" aria-pressed="${k === state.nightName}">${n.label.replace(/ \(.*$/, "")}</button>`)
    .join("");
  const n = night();
  document.getElementById("realResp").textContent = `${n.real.median_response_min} min`;
  document.getElementById("realHosp").textContent = `${n.real.median_time_at_hospital_min} min`;
  document.getElementById("viewLabel").textContent = `Showing: ${VIEWS[state.view].name.toLowerCase()} · ${n.label}`;
  document.getElementById("nurseCost").textContent = d.costs.nurse_shift_usd.toLocaleString("en-US");
  document.getElementById("ambCost").textContent = d.costs.ambulance_night_usd.toLocaleString("en-US");
  document.getElementById("generated").textContent = `Data generated ${d.generated_at}.`;
}

function render() {
  renderHeader();
  renderGrid();
  renderCompare();
  renderWhy();
  updateMap();
}

function setNight(name) {
  state.nightName = name;
  state.slots = [];
  state.msg = "";
  state.view = "yours";
  drawNightOnMap();
  render();
}

// ---------- wiring ----------

function wire() {
  document.getElementById("nights").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-night]");
    if (b) setNight(b.dataset.night);
  });
  document.getElementById("grid").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-slot]");
    if (b) toggleSlot(b.dataset.slot);
  });
  document.getElementById("compare").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-view]");
    if (b) { state.view = b.dataset.view; state.msg = ""; render(); }
  });
  document.getElementById("budgetDown").onclick = () => setBudget(state.budget - 1);
  document.getElementById("budgetUp").onclick = () => setBudget(state.budget + 1);
  document.getElementById("showAi").onclick = () => {
    state.view = state.view === "ai" ? "yours" : "ai";
    state.msg = "";
    render();
  };
  document.getElementById("clear").onclick = () => { state.slots = []; state.msg = ""; state.view = "yours"; render(); };
  document.getElementById("play").onclick = () => setPlaying(!state.playing);
  document.getElementById("time").addEventListener("input", (e) => {
    setPlaying(false);
    state.t = Number(e.target.value);
    updateMap();
  });
  window.addEventListener("resize", () => renderWhy());
}

(async function main() {
  let geo = null;
  try {
    [state.data, geo] = await Promise.all([loadScenarios(), loadAreaShapes()]);
  } catch (err) {
    document.getElementById("city").textContent = "Could not load data/scenarios.json. Serve the web/ folder (see README).";
    console.error(err);
    return;
  }
  if (!state.data.nights[state.nightName]) state.nightName = Object.keys(state.data.nights)[0];
  setupMap(geo);
  wire();
  setNight(state.nightName);
})();
