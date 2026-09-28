/*
 * Laboratório de simulações: volta de autocross, aceleração 75 m, skidpad
 * e geometria de suspensão. Canvas 2D, sem dependências.
 */
import { REFERENCE, lapSim, accelSim, skidpadSim, SKID_R, interp } from "./physics.js";
import { buildTrack } from "./track.js";
import { makeGeometry, poseForTravel, camberCurve, SUSP_PRESETS, isValid } from "./suspension.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmt = (v, d = 2) => v.toFixed(d).replace(".", ",");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const C = {
  bg: "#101014", asphalt: "#1c1d22", edge: "#2a2c33", grid: "#17181c", text: "#a0a0ac", white: "#f3f3f5",
  orange: "#ff8000", orange2: "#ff9a3d", ref: "#6b6f7a", slow: [122, 46, 0], mid: [255, 128, 0], fast: [255, 241, 221],
};
function ramp(k) {
  k = clamp(k, 0, 1);
  const [a, b, t] = k < 0.5 ? [C.slow, C.mid, k * 2] : [C.mid, C.fast, (k - 0.5) * 2];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}
function delta(el, v, ref, unit, digits = 2, lowerIsBetter = true) {
  const d = v - ref;
  if (!el) return;
  if (Math.abs(d) < Math.pow(10, -digits) / 2) { el.textContent = "igual à referência"; el.className = "delta"; return; }
  const good = lowerIsBetter ? d < 0 : d > 0;
  el.textContent = `${d > 0 ? "+" : "−"}${fmt(Math.abs(d), digits)} ${unit} vs referência`;
  el.className = "delta " + (good ? "is-good" : "is-bad");
}
function carShape(g, x, y, ang, scale, fill, stroke) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(scale, scale);
  g.beginPath();
  g.moveTo(9, 0);
  g.lineTo(-6, -4.5);
  g.lineTo(-4, 0);
  g.lineTo(-6, 4.5);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.6 / scale; g.stroke(); }
  g.restore();
}

export function initLab(root) {
  if (!root) return;
  const track = buildTrack(1);
  const params = { ...REFERENCE };
  let refLap = lapSim(track, REFERENCE), lap = refLap;
  let refAcc = accelSim(REFERENCE), acc = refAcc;
  let refSkid = skidpadSim(REFERENCE), skid = refSkid;
  let tab = "volta";
  let visible = false;

  /* ---------- abas ---------- */
  const tabs = $$("[data-lab-tab]", root);
  const panels = $$("[data-lab-panel]", root);
  const setup = $(".lab__setup", root);
  function selectTab(name) {
    tab = name;
    tabs.forEach((t) => { const on = t.dataset.labTab === name; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    panels.forEach((p) => (p.hidden = p.dataset.labPanel !== name));
    setup.hidden = name === "suspensao";
    root.classList.toggle("lab--wide", name === "suspensao");
    requestAnimationFrame(() => { drawStatic(); redrawSusp(); });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.dataset.labTab));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); selectTab(n.dataset.labTab);
    });
  });

  /* ---------- parâmetros do carro ---------- */
  const sliders = $$("[data-param]", root);
  const UNITS = { mass: [" kg", 0], power: [" kW", 0], mu: ["", 2], cla: [" m²", 1], cda: [" m²", 2] };
  function syncSliders() {
    sliders.forEach((s) => {
      const k = s.dataset.param;
      s.value = params[k];
      const out = $(`[data-out="${k}"]`, root);
      const [u, d] = UNITS[k];
      if (out) out.textContent = fmt(+params[k], d) + u;
      const pct = ((params[k] - s.min) / (s.max - s.min)) * 100;
      s.style.setProperty("--p", pct + "%");
      s.parentElement.style.setProperty("--ref", ((REFERENCE[k] - s.min) / (s.max - s.min)).toFixed(4));
    });
  }
  let recalcQueued = false;
  function recalc() {
    if (recalcQueued) return;
    recalcQueued = true;
    requestAnimationFrame(() => {
      recalcQueued = false;
      lap = lapSim(track, params);
      acc = accelSim(params);
      skid = skidpadSim(params);
      drawStatic();
      updateResults();
    });
  }
  sliders.forEach((s) =>
    s.addEventListener("input", () => {
      params[s.dataset.param] = +s.value;
      $$("[data-preset]", root).forEach((b) => b.classList.remove("is-active"));
      syncSliders();
      recalc();
    })
  );
  const PRESETS = {
    referencia: {},
    "sem-asas": { cla: 0, cda: 0.75 },
    leve: { mass: 260 },
    pneu: { mu: 1.62 },
    potencia: { power: 62 },
  };
  $$("[data-preset]", root).forEach((b) =>
    b.addEventListener("click", () => {
      Object.assign(params, REFERENCE, PRESETS[b.dataset.preset]);
      $$("[data-preset]", root).forEach((x) => x.classList.toggle("is-active", x === b));
      syncSliders();
      recalc();
      lapClock = 0;
    })
  );

  /* ---------- volta ---------- */
  const trackCanvas = $("#lab-track", root);
  const speedCanvas = $("#lab-speed", root);
  const ggCanvas = $("#lab-gg", root);
  const hud = {
    t: $("#hud-t", root), v: $("#hud-v", root), gy: $("#hud-gy", root), gx: $("#hud-gx", root),
  };
  const res = {
    lap: $("#r-lap", root), lapD: $("#r-lap-d", root), vmax: $("#r-vmax", root), vavg: $("#r-vavg", root), gy: $("#r-gy", root),
    acc: $("#r-acc", root), accD: $("#r-acc-d", root), accV: $("#r-acc-v", root), acc100: $("#r-acc-100", root),
    skid: $("#r-skid", root), skidD: $("#r-skid-d", root), skidV: $("#r-skid-v", root), skidG: $("#r-skid-g", root),
  };
  let layer = null, map = null;
  let lapClock = 0, lapSpeed = 2, playing = true;
  $$("[data-lap-speed]", root).forEach((b) =>
    b.addEventListener("click", () => {
      lapSpeed = +b.dataset.lapSpeed;
      $$("[data-lap-speed]", root).forEach((x) => x.classList.toggle("is-active", x === b));
    })
  );
  const playBtn = $("#lap-play", root);
  playBtn && playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.textContent = playing ? "Pausar" : "Continuar";
    playBtn.setAttribute("aria-pressed", String(!playing));
  });

  function mapTransform(w, h) {
    const b = track.bounds, pad = 26;
    const sx = (w - pad * 2) / (b.maxX - b.minX), sy = (h - pad * 2) / (b.maxY - b.minY);
    const s = Math.min(sx, sy);
    const ox = (w - (b.maxX - b.minX) * s) / 2, oy = (h - (b.maxY - b.minY) * s) / 2;
    return { s, X: (x) => ox + (x - b.minX) * s, Y: (y) => h - oy - (y - b.minY) * s };
  }
  function drawStatic() {
    if (!trackCanvas || tab !== "volta") return;
    const { w, h } = fit(trackCanvas);
    if (!w) return;
    const dpr = trackCanvas.width / w;
    layer = layer || document.createElement("canvas");
    layer.width = trackCanvas.width;
    layer.height = trackCanvas.height;
    const g = layer.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    map = mapTransform(w, h);
    const { X, Y, s } = map;
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    // grade de fundo (10 m)
    g.strokeStyle = C.grid;
    g.lineWidth = 1;
    const b = track.bounds;
    for (let x = Math.floor(b.minX / 10) * 10; x < b.maxX + 10; x += 10) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), h); g.stroke(); }
    for (let y = Math.floor(b.minY / 10) * 10; y < b.maxY + 10; y += 10) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(w, Y(y)); g.stroke(); }
    // asfalto (5 m de largura)
    g.lineJoin = g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i <= track.n; i++) { const k = i % track.n; i ? g.lineTo(X(track.x[k]), Y(track.y[k])) : g.moveTo(X(track.x[k]), Y(track.y[k])); }
    g.strokeStyle = C.edge;
    g.lineWidth = 5.6 * s;
    g.stroke();
    g.strokeStyle = C.asphalt;
    g.lineWidth = 5 * s;
    g.stroke();
    // cones nas bordas
    for (let i = 0; i < track.n; i += 6) {
      const hd = track.heading[i];
      const nx = -Math.sin(hd), ny = Math.cos(hd);
      for (const sd of [1, -1]) {
        g.fillStyle = (i / 6) % 4 === 0 ? C.orange : "#d9d9de";
        g.beginPath();
        g.arc(X(track.x[i] + nx * 2.7 * sd), Y(track.y[i] + ny * 2.7 * sd), Math.max(1.1, s * 0.35), 0, Math.PI * 2);
        g.fill();
      }
    }
    // traçado colorido pela velocidade
    const vmin = Math.min(...lap.v), vmax = lap.vmax;
    g.lineWidth = Math.max(2.5, s * 1.4);
    for (let i = 0; i < track.n; i++) {
      const j = (i + 1) % track.n;
      g.strokeStyle = ramp((lap.v[i] - vmin) / (vmax - vmin || 1));
      g.beginPath();
      g.moveTo(X(track.x[i]), Y(track.y[i]));
      g.lineTo(X(track.x[j]), Y(track.y[j]));
      g.stroke();
    }
    // linha de largada quadriculada
    const hd = track.heading[0];
    const nx = -Math.sin(hd), ny = Math.cos(hd);
    for (let k = -4; k < 4; k++) {
      g.fillStyle = k % 2 ? "#fff" : "#000";
      g.fillRect(X(track.x[0] + nx * k * 0.65) - 2, Y(track.y[0] + ny * k * 0.65) - 2, 4, 4);
    }
    drawSpeedChart();
    drawGG();
  }
  function idxAt(tl, t) {
    let lo = 0, hi = tl.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tl[m] <= t) lo = m; else hi = m; }
    return lo;
  }
  function stateAt(sim, t) {
    const i = Math.min(track.n - 1, idxAt(sim.t, t));
    const j = (i + 1) % track.n;
    const u = clamp((t - sim.t[i]) / (sim.t[i + 1] - sim.t[i] || 1), 0, 1);
    return {
      i, x: track.x[i] + (track.x[j] - track.x[i]) * u, y: track.y[i] + (track.y[j] - track.y[i]) * u,
      hd: track.heading[i], v: sim.v[i] + (sim.v[j] - sim.v[i]) * u, ax: sim.ax[i], ay: sim.ay[i],
    };
  }
  function drawSpeedChart(cursorI = null) {
    if (!speedCanvas) return;
    const { g, w, h } = fit(speedCanvas);
    if (!w) return;
    const pad = { l: 38, r: 10, t: 12, b: 22 };
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    const vtop = Math.ceil((Math.max(lap.vmax, refLap.vmax) * 3.6) / 20) * 20;
    const X = (i) => pad.l + (i / track.n) * (w - pad.l - pad.r);
    const Yv = (v) => h - pad.b - ((v * 3.6) / vtop) * (h - pad.t - pad.b);
    g.font = "11px Inter, system-ui, sans-serif";
    g.fillStyle = C.text;
    g.strokeStyle = C.grid;
    for (let v = 0; v <= vtop; v += 20) {
      const y = Yv(v / 3.6);
      g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
      g.fillText(String(v), 6, y + 4);
    }
    for (let d = 0; d <= track.length; d += 100) g.fillText(d + " m", X(d / track.ds) - 10, h - 6);
    const line = (sim, color, width, dash) => {
      g.beginPath();
      for (let i = 0; i < track.n; i += 2) i ? g.lineTo(X(i), Yv(sim.v[i])) : g.moveTo(X(i), Yv(sim.v[i]));
      g.setLineDash(dash || []);
      g.strokeStyle = color;
      g.lineWidth = width;
      g.stroke();
      g.setLineDash([]);
    };
    line(refLap, C.ref, 1.5, [4, 4]);
    line(lap, C.orange, 2.2);
    if (cursorI !== null) {
      g.strokeStyle = "rgba(255,255,255,.5)";
      g.beginPath(); g.moveTo(X(cursorI), pad.t); g.lineTo(X(cursorI), h - pad.b); g.stroke();
      g.fillStyle = C.white;
      g.beginPath(); g.arc(X(cursorI), Yv(lap.v[cursorI]), 3.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = C.text;
    g.fillText("km/h", 6, 10);
  }
  function drawGG(cur = null) {
    if (!ggCanvas) return;
    const { g, w, h } = fit(ggCanvas);
    if (!w) return;
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 16;
    const gmax = 2.5;
    g.strokeStyle = C.grid;
    g.fillStyle = C.text;
    g.font = "10px Inter, system-ui, sans-serif";
    for (let k = 0.5; k <= gmax; k += 0.5) {
      g.beginPath(); g.arc(cx, cy, (k / gmax) * R, 0, Math.PI * 2); g.stroke();
      if (k % 1 === 0) g.fillText(k + "g", cx + (k / gmax) * R + 2, cy - 2);
    }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.fillStyle = "rgba(255,128,0,.35)";
    for (let i = 0; i < track.n; i += 2) g.fillRect(cx + (lap.ay[i] / gmax) * R - 1, cy - (lap.ax[i] / gmax) * R - 1, 2, 2);
    // limite de aderência parado (μ)
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.setLineDash([3, 4]);
    g.beginPath(); g.arc(cx, cy, (params.mu / gmax) * R, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    if (cur) {
      g.fillStyle = C.white;
      g.beginPath(); g.arc(cx + (cur.ay / gmax) * R, cy - (cur.ax / gmax) * R, 5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = C.text;
    g.fillText("lateral →", w - 60, h - 6);
    g.fillText("↑ acelera", 6, 12);
  }
  let lastCursor = -1;
  function tickLap(dt) {
    if (!trackCanvas || !layer || !map) return;
    if (playing) lapClock += dt * lapSpeed;
    if (lapClock > lap.lapTime + 1.2) lapClock = 0;
    const tt = Math.min(lapClock, lap.lapTime - 1e-3);
    const { g, w } = fit(trackCanvas);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(layer, 0, 0);
    const dpr = trackCanvas.width / w;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { X, Y } = map;
    // fantasma (referência)
    const rt = Math.min(lapClock, refLap.lapTime - 1e-3);
    const r = stateAt(refLap, rt);
    carShape(g, X(r.x), Y(r.y), -r.hd, 1.25, null, C.ref);
    const cs = stateAt(lap, tt);
    g.shadowColor = "rgba(255,128,0,.9)";
    g.shadowBlur = 14;
    carShape(g, X(cs.x), Y(cs.y), -cs.hd, 1.35, C.orange, "#fff");
    g.shadowBlur = 0;
    hud.t.textContent = fmt(tt, 2) + " s";
    hud.v.textContent = Math.round(cs.v * 3.6) + " km/h";
    hud.gy.textContent = fmt(Math.abs(cs.ay), 2) + " g";
    hud.gx.textContent = (cs.ax >= 0 ? "+" : "−") + fmt(Math.abs(cs.ax), 2) + " g";
    if (cs.i !== lastCursor) {
      lastCursor = cs.i;
      drawSpeedChart(cs.i);
      drawGG(cs);
    }
  }

  /* ---------- aceleração ---------- */
  const accCanvas = $("#lab-accel", root);
  const accBtn = $("#acc-go", root);
  const lights = $$(".lights i", root);
  let race = null; // {phase:'lights'|'run'|'done', t}
  accBtn && accBtn.addEventListener("click", () => {
    race = { phase: "lights", t: 0, go: 1.1 + Math.random() * 0.8 };
    accBtn.disabled = true;
  });
  function drawAccel() {
    if (!accCanvas) return;
    const { g, w, h } = fit(accCanvas);
    if (!w) return;
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    const x0 = 40, x1 = w - 30;
    const X = (m) => x0 + (m / 75) * (x1 - x0);
    const lanes = [h * 0.32, h * 0.7];
    g.fillStyle = C.asphalt;
    lanes.forEach((y) => g.fillRect(x0 - 20, y - 22, x1 - x0 + 40, 44));
    g.strokeStyle = "#2a2c33";
    g.font = "11px Inter, system-ui, sans-serif";
    g.fillStyle = C.text;
    for (let m = 0; m <= 75; m += 15) {
      g.beginPath(); g.moveTo(X(m), lanes[0] - 30); g.lineTo(X(m), lanes[1] + 30); g.stroke();
      g.fillText(m + " m", X(m) - 10, h - 8);
    }
    // largada e chegada
    g.fillStyle = "#fff";
    g.fillRect(X(0) - 1, lanes[0] - 22, 2, 44);
    g.fillRect(X(0) - 1, lanes[1] - 22, 2, 44);
    for (let k = 0; k < 8; k++) for (const y of lanes) { g.fillStyle = k % 2 ? "#fff" : "#000"; g.fillRect(X(75), y - 22 + k * 5.5, 5, 5.5); }
    g.fillStyle = C.text;
    g.fillText("Referência", 8, lanes[0] - 28);
    g.fillStyle = C.orange2;
    g.fillText("Seu acerto", 8, lanes[1] - 28);
    const t = race && race.phase !== "lights" ? race.t : 0;
    const xr = race ? interp(refAcc.trace, "x", t) : 0;
    const xm = race ? interp(acc.trace, "x", t) : 0;
    carShape(g, X(xr), lanes[0], 0, 2.2, "#3a3d45", C.ref);
    g.shadowColor = "rgba(255,128,0,.8)";
    g.shadowBlur = 16;
    carShape(g, X(xm), lanes[1], 0, 2.2, C.orange, "#fff");
    g.shadowBlur = 0;
    if (race && race.phase !== "lights") {
      g.font = "600 13px Inter, system-ui, sans-serif";
      g.fillStyle = C.text;
      const vr = interp(refAcc.trace, "v", Math.min(t, refAcc.time)), vm = interp(acc.trace, "v", Math.min(t, acc.time));
      g.fillText(Math.round(vr * 3.6) + " km/h", 8, lanes[0] + 36);
      g.fillStyle = C.orange2;
      g.fillText(Math.round(vm * 3.6) + " km/h", 8, lanes[1] + 36);
    }
  }
  function tickAccel(dt) {
    if (!race) { drawAccel(); return; }
    race.t += dt;
    if (race.phase === "lights") {
      const on = Math.min(5, Math.floor(race.t / 0.45) + 1);
      lights.forEach((l, i) => l.classList.toggle("is-on", i < on));
      if (race.t > 5 * 0.45 + race.go) {
        lights.forEach((l) => l.classList.remove("is-on"));
        race.phase = "run";
        race.t = 0;
      }
    } else if (race.phase === "run" && race.t > Math.max(acc.time, refAcc.time) + 0.6) {
      race.phase = "done";
      accBtn.disabled = false;
      accBtn.textContent = "Largar de novo";
    }
    drawAccel();
  }

  /* ---------- skidpad ---------- */
  const skidCanvas = $("#lab-skid", root);
  let skidClock = 0;
  function tickSkid(dt) {
    if (!skidCanvas) return;
    const { g, w, h } = fit(skidCanvas);
    if (!w) return;
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    const s = Math.min(w / (SKID_R * 4 + 12), h / (SKID_R * 2 + 12));
    const cx = w / 2, cy = h / 2;
    const cL = [cx - SKID_R * s, cy], cR = [cx + SKID_R * s, cy];
    for (const c of [cL, cR]) {
      g.strokeStyle = C.asphalt;
      g.lineWidth = 3 * s;
      g.beginPath(); g.arc(c[0], c[1], SKID_R * s, 0, Math.PI * 2); g.stroke();
      for (const r of [SKID_R - 1.5, SKID_R + 1.5]) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          g.fillStyle = k % 4 ? "#d9d9de" : C.orange;
          g.beginPath(); g.arc(c[0] + Math.cos(a) * r * s, c[1] + Math.sin(a) * r * s, Math.max(1.4, s * 0.3), 0, Math.PI * 2); g.fill();
        }
      }
    }
    // percurso: 2 voltas no círculo direito (horário), 2 no esquerdo (anti-horário)
    const lapT = skid.time, total = lapT * 4;
    skidClock = (skidClock + dt) % (total + 1);
    const tt = Math.min(skidClock, total);
    const k = Math.floor(tt / lapT), u = (tt % lapT) / lapT;
    let x, y, hd;
    if (k < 2) { const a = Math.PI - u * Math.PI * 2; x = cR[0] + Math.cos(a) * SKID_R * s; y = cR[1] - Math.sin(a) * SKID_R * s; hd = -a - Math.PI / 2; }
    else { const a = u * Math.PI * 2; x = cL[0] + Math.cos(a) * SKID_R * s; y = cL[1] - Math.sin(a) * SKID_R * s; hd = -a + Math.PI / 2 + Math.PI; }
    if (tt >= total) { x = cx; y = cy; hd = -Math.PI / 2; }
    // trilha
    g.strokeStyle = "rgba(255,128,0,.5)";
    g.lineWidth = 2;
    g.beginPath();
    if (k < 2) g.arc(cR[0], cR[1], SKID_R * s, Math.PI, Math.PI + u * Math.PI * 2 * 0.999, false);
    else g.arc(cL[0], cL[1], SKID_R * s, 0, -u * Math.PI * 2 * 0.999, true);
    g.stroke();
    g.shadowColor = "rgba(255,128,0,.9)";
    g.shadowBlur = 14;
    carShape(g, x, y, hd, 1.6, C.orange, "#fff");
    g.shadowBlur = 0;
    g.fillStyle = C.text;
    g.font = "12px Inter, system-ui, sans-serif";
    const lbl = k < 2 ? `Círculo direito · volta ${k + 1}${k === 1 ? " (cronometrada)" : ""}` : k < 4 ? `Círculo esquerdo · volta ${k - 1}${k === 3 ? " (cronometrada)" : ""}` : "Fim";
    g.fillText(lbl, 12, 20);
    // medidor de g lateral
    const gy = tt < total ? skid.g : 0;
    const mx = w - 70, my = h - 58, mr = 40;
    g.strokeStyle = C.grid; g.lineWidth = 6;
    g.beginPath(); g.arc(mx, my, mr, Math.PI, 0); g.stroke();
    g.strokeStyle = C.orange;
    g.beginPath(); g.arc(mx, my, mr, Math.PI, Math.PI + Math.PI * clamp(gy / 2.5, 0, 1)); g.stroke();
    g.fillStyle = C.white;
    g.font = "700 16px Inter, system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText(fmt(gy, 2) + " g", mx, my - 4);
    g.font = "10px Inter, system-ui, sans-serif";
    g.fillStyle = C.text;
    g.fillText("lateral", mx, my + 12);
    g.textAlign = "left";
  }

  /* ---------- resultados ---------- */
  function updateResults() {
    const set = (el, t) => el && (el.textContent = t);
    set(res.lap, fmt(lap.lapTime, 2) + " s");
    delta(res.lapD, lap.lapTime, refLap.lapTime, "s");
    set(res.vmax, Math.round(lap.vmax * 3.6) + " km/h");
    set(res.vavg, Math.round(lap.vavg * 3.6) + " km/h");
    set(res.gy, fmt(lap.aymax, 2) + " g");
    set(res.acc, fmt(acc.time, 2) + " s");
    delta(res.accD, acc.time, refAcc.time, "s");
    set(res.accV, Math.round(acc.vfinal * 3.6) + " km/h");
    set(res.acc100, acc.t100 ? fmt(acc.t100, 2) + " s" : "—");
    set(res.skid, fmt(skid.time, 2) + " s");
    delta(res.skidD, skid.time, refSkid.time, "s");
    set(res.skidV, fmt(skid.v * 3.6, 1) + " km/h");
    set(res.skidG, fmt(skid.g, 2) + " g");
  }

  /* ---------- suspensão ---------- */
  const suspCanvas = $("#lab-susp", root);
  const camCanvas = $("#lab-camber", root);
  const travelIn = $("#susp-travel", root);
  const suspOut = {
    cam: $("#s-cam", root), rc: $("#s-rc", root), trk: $("#s-trk", root), gain: $("#s-gain", root), tr: $("#s-tr", root),
  };
  let hp = JSON.parse(JSON.stringify(SUSP_PRESETS.desiguais));
  let geo = makeGeometry(hp);
  let curve = camberCurve(geo);
  let travel = 0, animSusp = false, drag = null;
  const HP_KEYS = ["A1", "A2", "B1", "B2"];
  const LIMITS = { A1: [[0.06, 0.36], [0.2, 0.46]], B1: [[0.06, 0.36], [0.04, 0.2]], A2: [[0.4, 0.56], [0.28, 0.46]], B2: [[0.45, 0.6], [0.06, 0.2]] };
  function suspView(w, h) {
    const s = Math.min(w / 1.6, h / 0.72);
    const ox = w / 2, oy = h / 2 + 0.26 * s;
    return { s, X: (x) => ox + x * s, Y: (y) => oy - y * s, inv: (px, py) => [(px - ox) / s, (oy - py) / s] };
  }
  function recomputeSusp() {
    geo = makeGeometry(hp);
    curve = camberCurve(geo);
    redrawSusp();
  }
  function redrawSusp() {
    if (!suspCanvas || tab !== "suspensao") return;
    const { g, w, h } = fit(suspCanvas);
    if (!w) return;
    const V = suspView(w, h);
    const { X, Y, s } = V;
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    const P = poseForTravel(geo, travel);
    if (!P) return;
    // chão
    g.strokeStyle = "#2a2c33";
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke();
    // linha de centro
    g.setLineDash([4, 6]);
    g.strokeStyle = "#3a3d45";
    g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), h); g.stroke();
    g.setLineDash([]);
    // chassi
    const minX = Math.min(hp.A1[0], hp.B1[0]);
    g.fillStyle = "#18191e";
    g.strokeStyle = "#3a3d45";
    g.beginPath();
    g.rect(X(-minX), Y(Math.max(hp.A1[1], hp.B1[1]) + 0.05), (2 * minX) * s, (Math.abs(hp.A1[1] - hp.B1[1]) + 0.1) * s);
    g.fill(); g.stroke();
    for (const side of [1, -1]) {
      const m = (p) => [p[0] * side, p[1]];
      const A1 = m(hp.A1), B1 = m(hp.B1), A2 = m(P.A2), B2 = m(P.B2), Cc = m(P.C), Pp = m(P.P);
      // linhas até o centro instantâneo
      if (P.IC) {
        const IC = m(P.IC);
        g.setLineDash([3, 5]);
        g.strokeStyle = "rgba(255,255,255,.18)";
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(X(A2[0]), Y(A2[1])); g.lineTo(X(IC[0]), Y(IC[1])); g.moveTo(X(B2[0]), Y(B2[1])); g.lineTo(X(IC[0]), Y(IC[1])); g.stroke();
        g.strokeStyle = "rgba(255,154,61,.45)";
        g.beginPath(); g.moveTo(X(Pp[0]), Y(Pp[1])); g.lineTo(X(IC[0]), Y(IC[1])); g.stroke();
        g.setLineDash([]);
        if (Math.abs(IC[0]) < 1.2) { g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.arc(X(IC[0]), Y(IC[1]), 3, 0, Math.PI * 2); g.fill(); }
      }
      // pneu (retângulo girado pela cambagem)
      const ang = ((P.camber * Math.PI) / 180) * side;
      g.save();
      g.translate(X(Cc[0]), Y(Cc[1]));
      g.rotate(ang);
      g.fillStyle = "#141416";
      g.strokeStyle = "#2c2d33";
      g.lineWidth = 2;
      g.beginPath(); g.roundRect(-0.1 * s, -0.255 * s, 0.2 * s, 0.51 * s, 0.03 * s); g.fill(); g.stroke();
      g.fillStyle = "#3a3d45";
      g.fillRect(-0.085 * s, -0.165 * s, 0.17 * s, 0.33 * s);
      g.strokeStyle = C.orange;
      g.beginPath(); g.moveTo(0, -0.3 * s); g.lineTo(0, 0.3 * s); g.stroke();
      g.restore();
      // manga
      g.strokeStyle = "#8d9199";
      g.lineWidth = 6;
      g.lineCap = "round";
      g.beginPath(); g.moveTo(X(A2[0]), Y(A2[1])); g.lineTo(X(B2[0]), Y(B2[1])); g.stroke();
      // bandejas
      g.strokeStyle = C.white;
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(X(A1[0]), Y(A1[1])); g.lineTo(X(A2[0]), Y(A2[1])); g.moveTo(X(B1[0]), Y(B1[1])); g.lineTo(X(B2[0]), Y(B2[1])); g.stroke();
      // pontos
      for (const [key, p] of [["A1", A1], ["A2", A2], ["B1", B1], ["B2", B2]]) {
        const editable = side === 1;
        g.fillStyle = editable ? C.orange : "#55585f";
        g.beginPath(); g.arc(X(p[0]), Y(p[1]), editable ? 7 : 4, 0, Math.PI * 2); g.fill();
        if (editable) { g.strokeStyle = drag === key ? "#fff" : "rgba(255,255,255,.4)"; g.lineWidth = 2; g.stroke(); }
      }
      // chão sob o pneu
      g.strokeStyle = "rgba(255,255,255,.35)";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(Pp[0] - 0.16 * side), Y(Pp[1])); g.lineTo(X(Pp[0] + 0.16 * side), Y(Pp[1])); g.stroke();
    }
    // centro de rolagem
    if (P.RC) {
      g.fillStyle = C.orange;
      g.beginPath(); g.arc(X(0), Y(P.RC[1]), 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
      g.fillStyle = C.orange2;
      g.font = "600 12px Inter, system-ui, sans-serif";
      g.fillText("centro de rolagem", X(0) + 10, Y(P.RC[1]) - 8);
    }
    g.fillStyle = C.text;
    g.font = "12px Inter, system-ui, sans-serif";
    g.fillText(travel > 0.001 ? "roda subindo (compressão)" : travel < -0.001 ? "roda descendo (extensão)" : "posição estática", 12, 20);

    const gain = (() => { const a = poseForTravel(geo, -0.005), b = poseForTravel(geo, 0.005); return a && b ? (b.camber - a.camber) : 0; })();
    suspOut.cam.textContent = (P.camber >= 0 ? "+" : "−") + fmt(Math.abs(P.camber), 2) + "°";
    suspOut.rc.textContent = P.RC ? Math.round(P.RC[1] * 1000) + " mm" : "—";
    suspOut.trk.textContent = (P.track >= 0 ? "+" : "−") + fmt(Math.abs(P.track * 1000), 1) + " mm";
    suspOut.gain.textContent = (gain >= 0 ? "+" : "−") + fmt(Math.abs(gain), 2) + "° / 10 mm";
    suspOut.tr.textContent = (travel >= 0 ? "+" : "−") + Math.round(Math.abs(travel * 1000)) + " mm";
    drawCamber(P.camber);
  }
  function drawCamber(cur) {
    if (!camCanvas) return;
    const { g, w, h } = fit(camCanvas);
    if (!w) return;
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    const pad = { l: 40, r: 12, t: 14, b: 26 };
    const cmin = Math.min(-3, ...curve.map((p) => p[1])), cmax = Math.max(3, ...curve.map((p) => p[1]));
    const X = (t) => pad.l + ((t + 0.04) / 0.08) * (w - pad.l - pad.r);
    const Yc = (c) => pad.t + ((cmax - c) / (cmax - cmin)) * (h - pad.t - pad.b);
    g.strokeStyle = C.grid;
    g.fillStyle = C.text;
    g.font = "10px Inter, system-ui, sans-serif";
    for (let c = Math.ceil(cmin); c <= cmax; c++) { g.beginPath(); g.moveTo(pad.l, Yc(c)); g.lineTo(w - pad.r, Yc(c)); g.stroke(); g.fillText((c > 0 ? "+" : "") + c + "°", 6, Yc(c) + 3); }
    for (let t = -40; t <= 40; t += 20) { g.beginPath(); g.moveTo(X(t / 1000), pad.t); g.lineTo(X(t / 1000), h - pad.b); g.stroke(); g.fillText(t + " mm", X(t / 1000) - 14, h - 8); }
    g.strokeStyle = C.orange;
    g.lineWidth = 2.2;
    g.beginPath();
    curve.forEach((p, i) => (i ? g.lineTo(X(p[0]), Yc(p[1])) : g.moveTo(X(p[0]), Yc(p[1]))));
    g.stroke();
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(X(travel), Yc(cur), 4.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.text;
    g.fillText("cambagem × curso da roda", pad.l, 10);
  }
  if (suspCanvas) {
    const pick = (e) => {
      const r = suspCanvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const V = suspView(r.width, r.height);
      const P = poseForTravel(geo, travel);
      const pts = { A1: hp.A1, B1: hp.B1, A2: P.A2, B2: P.B2 };
      let best = null, bd = 22;
      for (const k of HP_KEYS) { const d = Math.hypot(V.X(pts[k][0]) - px, V.Y(pts[k][1]) - py); if (d < bd) { bd = d; best = k; } }
      return { best, V, px, py };
    };
    suspCanvas.addEventListener("pointerdown", (e) => {
      const { best } = pick(e);
      if (!best) return;
      drag = best;
      travel = 0;
      if (travelIn) travelIn.value = 0;
      animSusp = false;
      suspCanvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      redrawSusp();
    });
    suspCanvas.addEventListener("pointermove", (e) => {
      if (!drag) {
        suspCanvas.style.cursor = pick(e).best ? "grab" : "default";
        return;
      }
      const r = suspCanvas.getBoundingClientRect();
      const V = suspView(r.width, r.height);
      const [x, y] = V.inv(e.clientX - r.left, e.clientY - r.top);
      const L = LIMITS[drag];
      const next = { ...hp, [drag]: [clamp(x, L[0][0], L[0][1]), clamp(y, L[1][0], L[1][1])] };
      if (isValid(next)) { hp = next; recomputeSusp(); }
    });
    const end = () => { drag = null; redrawSusp(); };
    suspCanvas.addEventListener("pointerup", end);
    suspCanvas.addEventListener("pointercancel", end);
  }
  travelIn && travelIn.addEventListener("input", () => { travel = +travelIn.value / 1000; animSusp = false; animBtn && animBtn.setAttribute("aria-pressed", "false"); redrawSusp(); });
  const animBtn = $("#susp-anim", root);
  animBtn && animBtn.addEventListener("click", () => { animSusp = !animSusp; animBtn.setAttribute("aria-pressed", String(animSusp)); });
  $$("[data-susp]", root).forEach((b) =>
    b.addEventListener("click", () => {
      hp = JSON.parse(JSON.stringify(SUSP_PRESETS[b.dataset.susp]));
      $$("[data-susp]", root).forEach((x) => x.classList.toggle("is-active", x === b));
      recomputeSusp();
    })
  );
  let suspT = 0;
  function tickSusp(dt) {
    if (!animSusp) return;
    suspT += dt;
    travel = Math.sin(suspT * 2.2) * 0.035;
    if (travelIn) travelIn.value = Math.round(travel * 1000);
    redrawSusp();
  }

  /* ---------- loop ---------- */
  new IntersectionObserver((es) => es.forEach((e) => (visible = e.isIntersecting)), { rootMargin: "100px" }).observe(root);
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    if (tab === "volta") tickLap(reduced ? 0 : dt);
    else if (tab === "aceleracao") tickAccel(dt);
    else if (tab === "skidpad") tickSkid(reduced ? 0 : dt);
    else tickSusp(dt);
  }
  window.addEventListener("resize", () => { drawStatic(); redrawSusp(); });

  syncSliders();
  updateResults();
  selectTab("volta");
  requestAnimationFrame(loop);
}
