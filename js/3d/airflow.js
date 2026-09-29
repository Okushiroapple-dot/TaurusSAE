/*
 * Visualização ilustrativa do fluxo de ar: traços que passam pelo carro,
 * sobem sobre a carenagem e são defletidos para cima pela asa traseira
 * (a reação dessa deflexão é a força para baixo).
 */
import * as THREE from "../../vendor/three.bundle.min.js";

export function createAirflow(bodyStations, count = 900) {
  const st = bodyStations.slice().sort((a, b) => a.x - b.x);
  const xMin = st[0].x, xMax = st[st.length - 1].x;
  function body(x) {
    if (x < xMin || x > xMax) return null;
    let i = 0;
    while (i < st.length - 2 && st[i + 1].x < x) i++;
    const a = st[i], b = st[i + 1];
    const t = (x - a.x) / (b.x - a.x || 1);
    return { w: a.w + (b.w - a.w) * t, yt: a.yt + (b.yt - a.yt) * t };
  }
  const R = 0.28;
  function height(x, z) {
    const az = Math.abs(z);
    let h = 0;
    const b = body(x);
    if (b && az < b.w + 0.04) h = Math.max(h, b.yt * (1 - Math.pow(az / (b.w + 0.04), 4) * 0.4));
    // arco principal / capacete / admissão
    if (x < -0.05 && x > -0.9 && az < 0.22) h = Math.max(h, x > -0.35 ? 1.02 - Math.abs(x + 0.2) * 0.4 : 0.8);
    // radiador exposto no lado direito
    if (z > 0.3 && z < 0.52 && x > -0.5 && x < -0.2) h = Math.max(h, 0.55);
    for (const xc of [0.8, -0.76]) {
      const dx = x - xc;
      if (az > 0.5 && az < 0.72 && Math.abs(dx) < R) h = Math.max(h, R + Math.sqrt(R * R - dx * dx));
    }
    return h;
  }
  function streamY(x, z, h0) {
    const H = Math.max(height(x, z), 0.92 * height(x + 0.12, z), 0.85 * height(x + 0.24, z), 0.8 * height(x - 0.14, z));
    let y;
    if (h0 < H + 0.04) y = H + 0.04 + (h0 / (H + 0.04)) * 0.03;
    else y = h0 + (H + 0.04) * 0.22 * Math.exp(-(h0 - H) * 4);
    // asa traseira: desvia o ar para cima atrás dela
    const az = Math.abs(z);
    if (az < 0.66 && h0 > 0.7 && h0 < 1.45) {
      const k = Math.exp(-Math.pow((h0 - 1.05) / 0.22, 2));
      const s = 1 / (1 + Math.exp((x + 1.2) * 14)); // 0 antes da asa, 1 depois
      y += 0.26 * k * s;
    }
    return { y, lift: y - h0 };
  }

  const pos = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;

  const P = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function spawn(p, anywhere) {
    p.x = anywhere ? rnd(-2.6, 2.6) : rnd(2.4, 2.8);
    const near = Math.random() < 0.8;
    p.z = near ? rnd(-0.75, 0.75) : rnd(-1.3, 1.3);
    p.h = near ? rnd(0.05, 1.3) : rnd(0.05, 1.6);
    p.v = rnd(2.2, 3.0);
    return p;
  }
  for (let i = 0; i < count; i++) P.push(spawn({}, true));

  const orange = new THREE.Color("#ff8000");
  const white = new THREE.Color("#fff3e6");
  const dim = new THREE.Color("#3a3f4a");
  const c = new THREE.Color();

  function update(dt, opacity) {
    mat.opacity = opacity;
    lines.visible = opacity > 0.01;
    if (!lines.visible) return;
    for (let i = 0; i < count; i++) {
      const p = P[i];
      const head = streamY(p.x, p.z, p.h);
      const sf = 1 + Math.min(1, head.lift * 5) * 0.7;
      p.x -= p.v * sf * dt;
      if (p.x < -2.6) spawn(p, false);
      const len = 0.1 + 0.16 * sf;
      const tail = streamY(p.x + len, p.z, p.h);
      const o = i * 6;
      pos[o] = p.x; pos[o + 1] = head.y; pos[o + 2] = p.z;
      pos[o + 3] = p.x + len; pos[o + 4] = tail.y; pos[o + 5] = p.z;
      const k = Math.min(1, head.lift * 6);
      if (k < 0.5) c.copy(dim).lerp(orange, k * 2);
      else c.copy(orange).lerp(white, (k - 0.5) * 2);
      const fade = Math.min(1, (2.6 - Math.abs(p.x)) * 1.5);
      col[o] = c.r * fade; col[o + 1] = c.g * fade; col[o + 2] = c.b * fade;
      col[o + 3] = 0; col[o + 4] = 0; col[o + 5] = 0;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return { object: lines, update };
}
