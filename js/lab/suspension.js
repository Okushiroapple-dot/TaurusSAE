/*
 * Cinemática de suspensão duplo A em vista frontal.
 * A bandeja inferior gira em torno do pivô interno; a manga (upright) fecha
 * o quadrilátero com a bandeja superior. Daí saem cambagem, centro instantâneo
 * e centro de rolagem para cada curso de roda.
 */
const R_TIRE = 0.255;

export const SUSP_PRESETS = {
  desiguais: { A1: [0.22, 0.33], A2: [0.5, 0.37], B1: [0.19, 0.12], B2: [0.55, 0.13] },
  paralelas: { A1: [0.25, 0.36], A2: [0.52, 0.36], B1: [0.25, 0.12], B2: [0.52, 0.12] },
  agressiva: { A1: [0.3, 0.32], A2: [0.5, 0.38], B1: [0.14, 0.11], B2: [0.55, 0.14] },
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const rot = (a, t) => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)];

function circleIntersect(c0, r0, c1, r1) {
  const d = len(sub(c1, c0));
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return null;
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const e = norm(sub(c1, c0));
  const m = add(c0, mul(e, a));
  const p1 = [m[0] + h * e[1], m[1] - h * e[0]];
  const p2 = [m[0] - h * e[1], m[1] + h * e[0]];
  return p1[1] > p2[1] ? p1 : p2;
}
function lineIntersect(p1, p2, p3, p4) {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-9) return null;
  const a = p1[0] * p2[1] - p1[1] * p2[0], b = p3[0] * p4[1] - p3[1] * p4[0];
  return [(a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d, (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d];
}

export function makeGeometry(h) {
  const g = { A1: h.A1.slice(), A2: h.A2.slice(), B1: h.B1.slice(), B2: h.B2.slice() };
  g.C0 = [0.61, R_TIRE];
  g.P0 = [0.61, 0];
  g.La = len(sub(g.A2, g.A1));
  g.Lb = len(sub(g.B2, g.B1));
  g.Lu = len(sub(g.A2, g.B2));
  const u = norm(sub(g.A2, g.B2));
  const n = [u[1], -u[0]];
  const loc = (p) => { const d = sub(p, g.B2); return [dot(d, u), dot(d, n)]; };
  g.cL = loc(g.C0);
  g.pL = loc(g.P0);
  g.lean0 = Math.atan2(u[0], u[1]);
  return g;
}

function poseAt(g, theta) {
  const B2 = add(g.B1, rot(sub(g.B2, g.B1), theta));
  const A2 = circleIntersect(g.A1, g.La, B2, g.Lu);
  if (!A2) return null;
  const u = norm(sub(A2, B2));
  const n = [u[1], -u[0]];
  const W = (l) => add(B2, add(mul(u, l[0]), mul(n, l[1])));
  const C = W(g.cL), P = W(g.pL);
  const camber = ((Math.atan2(u[0], u[1]) - g.lean0) * 180) / Math.PI;
  const IC = lineIntersect(g.A1, A2, g.B1, B2);
  let RC = null;
  if (IC) RC = lineIntersect(P, IC, [0, -1], [0, 1]);
  else {
    const dir = sub(A2, g.A1);
    RC = lineIntersect(P, add(P, dir), [0, -1], [0, 1]);
  }
  return { A2, B2, C, P, u, camber, IC, RC, travel: C[1] - g.C0[1], track: (P[0] - g.P0[0]) * 2 };
}

export function poseForTravel(g, travel) {
  // girar a bandeja inferior no sentido anti-horário sobe a roda; busca por bisseção
  let lo = -0.5, hi = 0.5;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    const pm = poseAt(g, mid);
    if (!pm) { if (mid > 0) hi = mid; else lo = mid; continue; }
    if (pm.travel > travel) hi = mid; else lo = mid;
  }
  return poseAt(g, (lo + hi) / 2);
}

export function camberCurve(g, from = -0.04, to = 0.04, steps = 41) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const tr = from + ((to - from) * i) / (steps - 1);
    const p = poseForTravel(g, tr);
    if (p) pts.push([tr, p.camber]);
  }
  return pts;
}
export function isValid(h) {
  const g = makeGeometry(h);
  const a = poseForTravel(g, -0.045), b = poseForTravel(g, 0.045);
  return !!(a && b && Math.abs(a.travel + 0.045) < 0.003 && Math.abs(b.travel - 0.045) < 0.003);
}
