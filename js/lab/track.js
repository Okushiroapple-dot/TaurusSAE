/*
 * Traçado de autocross fictício (no estilo da Fórmula SAE): reta de largada,
 * cotovelo, slalom, curvas de raio constante e grampo.
 * Pontos de controle em metros, suavizados por Catmull-Rom centrípeta.
 */
const CONTROL = [
  [0, 0], [30, 0], [55, 0], [72, 3], [82, 14], [80, 28], [70, 34],
  [58, 34], [48, 40], [46, 52], [54, 62], [66, 64], [80, 60], [94, 58],
  [108, 64], [116, 76], [112, 90], [98, 96], [84, 92], [74, 100], [62, 94],
  [50, 100], [38, 94], [26, 100], [14, 96], [2, 86], [-2, 72], [6, 62],
  [18, 58], [22, 46], [12, 36], [-4, 34], [-16, 26], [-18, 12], [-10, 2],
];

function catmull(points, samplesPerSeg = 24) {
  const n = points.length;
  const out = [];
  const alpha = 0.5;
  const tj = (ti, a, b) => ti + Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), alpha);
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
    for (let k = 0; k < samplesPerSeg; k++) {
      const t = t1 + ((t2 - t1) * k) / samplesPerSeg;
      const L = (a, b, ta, tb) => [((tb - t) / (tb - ta)) * a[0] + ((t - ta) / (tb - ta)) * b[0], ((tb - t) / (tb - ta)) * a[1] + ((t - ta) / (tb - ta)) * b[1]];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  return out;
}

const SCALE = 1.5;

export function buildTrack(ds = 1) {
  const dense = catmull(CONTROL.map(([x, y]) => [x * SCALE, y * SCALE]), 30);
  // reamostragem por comprimento de arco
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1];
  const n = Math.round(total / ds);
  const step = total / n;
  const xs = new Float64Array(n), ys = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = i * step;
    while (cum[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length];
    const u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    xs[i] = a[0] + (b[0] - a[0]) * u;
    ys[i] = a[1] + (b[1] - a[1]) * u;
  }
  // curvatura com sinal (raio do círculo por três pontos, com passo de 3 m para reduzir ruído)
  const kappa = new Float64Array(n), heading = new Float64Array(n);
  const h = 3;
  for (let i = 0; i < n; i++) {
    const a = (i - h + n) % n, c = (i + h) % n;
    const ax = xs[a], ay = ys[a], bx = xs[i], by = ys[i], cx = xs[c], cy = ys[c];
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    const la = Math.hypot(bx - ax, by - ay), lb = Math.hypot(cx - bx, cy - by), lc = Math.hypot(cx - ax, cy - ay);
    kappa[i] = (2 * cross) / (la * lb * lc || 1);
    heading[i] = Math.atan2(cy - ay, cx - ax);
  }
  // suavização leve
  const sm = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += kappa[(i + k + n) % n];
    sm[i] = s / 5;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]);
  }
  return { n, ds: step, length: total, x: xs, y: ys, kappa: sm, heading, bounds: { minX, maxX, minY, maxY } };
}
