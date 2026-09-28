/*
 * Física simplificada de um Fórmula SAE (modelo de massa pontual).
 * - Aderência lateral e de frenagem: μ · (peso + downforce)
 * - Tração: μ · carga no eixo traseiro, limitada pela potência (P = F · v)
 * - Resistências: arrasto aerodinâmico + rolamento
 * - Uso combinado de aderência pelo círculo de atrito
 */
export const G = 9.81;
export const RHO = 1.2;

export const REFERENCE = Object.freeze({
  mass: 290, // kg, carro + piloto
  power: 50, // kW nas rodas
  mu: 1.45, // coeficiente de atrito do pneu
  cla: 2.2, // coef. de sustentação × área (m²)
  cda: 1.1, // coef. de arrasto × área (m²)
  crr: 0.015,
  rear: 0.55, // fração do peso no eixo traseiro
  cgh: 0.19, // altura do CG / entre-eixos (transferência de carga)
  vmax: 36, // m/s, limite da última marcha
});

const df = (v, p) => 0.5 * RHO * p.cla * v * v;
const drag = (v, p) => 0.5 * RHO * p.cda * v * v;

export function latLimit(v, p) {
  return (p.mu * (p.mass * G + df(v, p))) / p.mass;
}
// na aceleração parte do peso passa para o eixo traseiro: a = μ·g·r / (1 − μ·h/L)
export function tractionLimit(v, p) {
  return (p.mu * (p.mass * G + df(v, p)) * p.rear) / (p.mass * (1 - p.mu * p.cgh));
}
export function driveAccel(v, p) {
  const pow = (p.power * 1000) / (p.mass * Math.max(v, 0.3));
  return Math.min(tractionLimit(v, p), pow);
}
export function resist(v, p) {
  return (drag(v, p) + p.crr * p.mass * G) / p.mass;
}
export function cornerSpeed(kappa, p) {
  const k = Math.abs(kappa);
  if (k < 1e-5) return p.vmax;
  const den = p.mass * k - 0.5 * RHO * p.cla * p.mu;
  if (den <= 0) return p.vmax;
  return Math.min(p.vmax, Math.sqrt((p.mu * p.mass * G) / den));
}

/* ---------- volta completa (simulação quase-estática) ---------- */
export function lapSim(track, p) {
  const n = track.n, ds = track.ds, K = track.kappa;
  const vc = new Float64Array(n);
  let i0 = 0;
  for (let i = 0; i < n; i++) {
    vc[i] = cornerSpeed(K[i], p);
    if (vc[i] < vc[i0]) i0 = i;
  }
  const ell = (v, k, lim) => {
    const ay = v * v * Math.abs(k);
    const r = ay / lim;
    return r >= 1 ? 0 : Math.sqrt(1 - r * r);
  };
  // passada para a frente (aceleração)
  const vf = new Float64Array(n);
  vf[i0] = vc[i0];
  for (let s = 1; s <= n; s++) {
    const i = (i0 + s) % n, j = (i0 + s - 1) % n;
    const v = vf[j];
    const ax = driveAccel(v, p) * ell(v, K[j], latLimit(v, p)) - resist(v, p);
    const vn = Math.sqrt(Math.max(0.01, v * v + 2 * ax * ds));
    vf[i] = Math.min(vn, vc[i]);
  }
  // passada para trás (frenagem)
  const vb = new Float64Array(n);
  vb[i0] = vc[i0];
  for (let s = 1; s <= n; s++) {
    const i = (i0 - s + n * 2) % n, j = (i + 1) % n;
    const v = vb[j];
    const ax = latLimit(v, p) * ell(v, K[j], latLimit(v, p)) + resist(v, p);
    const vn = Math.sqrt(v * v + 2 * ax * ds);
    vb[i] = Math.min(vn, vc[i]);
  }
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = Math.min(vf[i], vb[i]);

  const t = new Float64Array(n + 1);
  const ax = new Float64Array(n), ay = new Float64Array(n);
  let vmax = 0, aymax = 0, axmax = 0, axmin = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const vm = Math.max(0.5, (v[i] + v[j]) / 2);
    t[i + 1] = t[i] + ds / vm;
    ax[i] = (v[j] * v[j] - v[i] * v[i]) / (2 * ds) / G;
    ay[i] = (v[i] * v[i] * K[i]) / G;
    vmax = Math.max(vmax, v[i]);
    aymax = Math.max(aymax, Math.abs(ay[i]));
    axmax = Math.max(axmax, ax[i]);
    axmin = Math.min(axmin, ax[i]);
  }
  return { v, t, ax, ay, lapTime: t[n], vmax, aymax, axmax, axmin, vavg: (n * ds) / t[n] };
}

/* ---------- aceleração 75 m ---------- */
export function accelSim(p, dist = 75) {
  let x = 0, v = 0, t = 0, t100 = null;
  const dt = 0.002;
  const trace = [{ t: 0, x: 0, v: 0 }];
  while (x < dist && t < 20) {
    let a = driveAccel(v, p) - resist(v, p);
    if (v >= p.vmax) a = Math.min(0, a);
    v = Math.max(0, v + a * dt);
    x += v * dt;
    t += dt;
    if (t100 === null && v >= 100 / 3.6) t100 = t;
    if (trace.length === 0 || t - trace[trace.length - 1].t >= 0.02) trace.push({ t, x, v });
  }
  trace.push({ t, x: dist, v });
  return { time: t, vfinal: v, t100, trace };
}

/* ---------- skidpad ---------- */
export const SKID_R = 9.125; // raio da linha central (pista de 15,25 m + 3 m de largura)
export function skidpadSim(p) {
  const v = cornerSpeed(1 / SKID_R, p);
  const time = (2 * Math.PI * SKID_R) / v;
  const g = (v * v) / SKID_R / G;
  return { v, time, g };
}

export function interp(trace, key, t) {
  if (t <= trace[0].t) return trace[0][key];
  for (let i = 1; i < trace.length; i++) {
    if (trace[i].t >= t) {
      const a = trace[i - 1], b = trace[i];
      const u = (t - a.t) / (b.t - a.t || 1);
      return a[key] + (b[key] - a[key]) * u;
    }
  }
  return trace[trace.length - 1][key];
}
