/*
 * Modelo 3D procedural de um Fórmula SAE a combustão.
 * Tudo é gerado em código (sem arquivo de modelo): chassi tubular,
 * carenagem, suspensão duplo A com pushrod, motor, escape, asas e rodas.
 *
 * Eixos: x para a frente (bico), y para cima, z para a direita.
 * Unidades: metros. Origem no chão, entre os eixos.
 */
import * as THREE from "../../vendor/three.bundle.min.js";

const Y = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14, 1);
const _d = new THREE.Vector3();
const DEG = Math.PI / 180;

export const PAINTS = {
  papaya: { body: "#ff8000", accent: "#0f0f12", stripe: "#ffffff" },
  preto: { body: "#141418", accent: "#ff8000", stripe: "#ff8000" },
  branco: { body: "#f2f2f2", accent: "#ff8000", stripe: "#141418" },
  carbono: { body: "#1b1b20", accent: "#ff8000", stripe: "#ffffff" },
};

/* ------------------------------------------------------------------ */
/* utilitários                                                         */
/* ------------------------------------------------------------------ */
function setTube(m, a, b) {
  _d.subVectors(b, a);
  const len = _d.length() || 1e-6;
  m.position.copy(a).addScaledVector(_d, 0.5);
  m.scale.set(m.userData.r, len, m.userData.r);
  m.quaternion.setFromUnitVectors(Y, _d.divideScalar(len));
}
function tube(a, b, r, mat) {
  const m = new THREE.Mesh(CYL, mat);
  m.userData.r = r;
  setTube(m, a, b);
  m.castShadow = true;
  return m;
}
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

// interpolação Catmull-Rom de um parâmetro ao longo das estações
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function sampleStations(st, per) {
  const keys = Object.keys(st[0]);
  const out = [];
  for (let i = 0; i < st.length - 1; i++) {
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const o = {};
      for (const key of keys) {
        const g = (j) => st[Math.max(0, Math.min(st.length - 1, j))][key];
        o[key] = cr(g(i - 1), g(i), g(i + 1), g(i + 2), t);
      }
      out.push(o);
    }
  }
  out.push({ ...st[st.length - 1] });
  return out;
}

/*
 * Superfície "lofted": seções superelípticas ao longo de x.
 * v = 0 no fundo, 0.25 na lateral +z, 0.5 no topo, 0.75 na lateral -z.
 */
function ringPoint(s, a, n, nb) {
  const c = Math.cos(a), si = Math.sin(a);
  const ym = (s.yb + s.yt) / 2, h = (s.yt - s.yb) / 2;
  const e = si < 0 ? nb : n;
  return [s.x, ym + h * sgnPow(si, 2 / e), (s.zc || 0) + s.w * sgnPow(c, 2 / n)];
}
function loftGeometry(stations, { per = 8, seg = 72, n = 3, nb = 5, skip = null, capStart = true, capEnd = true } = {}) {
  const rings = sampleStations(stations, per);
  const x0 = rings[0].x, x1 = rings[rings.length - 1].x;
  const pos = [], uv = [], idx = [];
  rings.forEach((s) => {
    for (let j = 0; j <= seg; j++) {
      const v = j / seg;
      const a = -Math.PI / 2 + v * Math.PI * 2;
      pos.push(...ringPoint(s, a, n, nb));
      uv.push((x0 - s.x) / (x0 - x1), v);
    }
  });
  const row = seg + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      if (skip) {
        let cx = 0, cy = 0, cz = 0;
        for (const q of [a, b, c, d]) { cx += pos[q * 3]; cy += pos[q * 3 + 1]; cz += pos[q * 3 + 2]; }
        if (skip(cx / 4, cy / 4, cz / 4)) continue;
      }
      idx.push(a, c, b, b, c, d);
    }
  }
  const addCap = (ringIdx, flip) => {
    const s = rings[ringIdx];
    const center = pos.length / 3;
    pos.push(s.x, (s.yb + s.yt) / 2, s.zc || 0);
    uv.push(ringIdx === 0 ? 0 : 1, 0.5);
    for (let j = 0; j < seg; j++) {
      const a = ringIdx * row + j;
      if (flip) idx.push(center, a + 1, a);
      else idx.push(center, a, a + 1);
    }
  };
  if (capStart) addCap(0, false);
  if (capEnd) addCap(rings.length - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.rings = rings;
  return g;
}

/* perfil NACA 4 dígitos */
function airfoilShape(chord, t = 0.12, m = 0.06, p = 0.4, n = 36) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const b = (i / n) * Math.PI;
    const x = (1 - Math.cos(b)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
    const dyc = x < p ? ((2 * m) / (p * p)) * (p - x) : ((2 * m) / (1 - p) ** 2) * (p - x);
    const th = Math.atan(dyc);
    up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
    lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  const s = new THREE.Shape();
  s.moveTo(up[n][0] * chord, up[n][1] * chord);
  for (let i = n - 1; i >= 0; i--) s.lineTo(up[i][0] * chord, up[i][1] * chord);
  for (let i = 1; i <= n; i++) s.lineTo(lo[i][0] * chord, lo[i][1] * chord);
  return s;
}
/* elemento de asa invertida: bordo de ataque em `le`, corda para trás, ângulo em graus (TE para cima) */
function wingElement(le, chord, span, aoa, mat, t = 0.12, m = 0.07) {
  const geo = new THREE.ExtrudeGeometry(airfoilShape(chord, t, m), { depth: span, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -span / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(le);
  mesh.rotation.z = Math.PI - aoa * DEG;
  mesh.castShadow = true;
  return mesh;
}
function plate(points, thick, z, mat) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
  geo.translate(0, 0, z - thick / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* texturas                                                            */
/* ------------------------------------------------------------------ */
function carbonTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const s = 16;
  for (let y = 0; y < 128; y += s)
    for (let x = 0; x < 128; x += s) {
      const odd = (x / s + y / s) % 2;
      const grd = odd ? g.createLinearGradient(x, y, x + s, y) : g.createLinearGradient(x, y, x, y + s);
      grd.addColorStop(0, "#0b0b0e");
      grd.addColorStop(0.5, "#2e2e35");
      grd.addColorStop(1, "#0b0b0e");
      g.fillStyle = grd;
      g.fillRect(x, y, s, s);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function gridTexture(color = "#111", line = "#3a3d44") {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = line;
  g.lineWidth = 2;
  for (let i = 0; i <= 64; i += 8) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

/*
 * Pintura (livery) desenhada num canvas e aplicada pelas coordenadas u/v do loft.
 * Lateral +z fica em v≈0.25 (texto espelhado em x), lateral -z em v≈0.75 (texto espelhado em y).
 */
function drawSideText(g, W, H, draw, u0, u1, vc, vh) {
  // lado +z
  g.save();
  const x0 = u0 * W, x1 = u1 * W, w = x1 - x0;
  let yc = (1 - vc) * H;
  g.translate(x0 + w / 2, yc);
  g.scale(-1, 1);
  draw(g, w, vh * H);
  g.restore();
  // lado -z (espelho de v em torno do topo: v' = 1 - v)
  g.save();
  yc = vc * H;
  g.translate(x0 + w / 2, yc);
  g.scale(1, -1);
  draw(g, w, vh * H);
  g.restore();
}
function numberDraw(num, color, stroke) {
  return (g, w, h) => {
    g.font = `italic 800 ${Math.round(h)}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (stroke) { g.lineWidth = h * 0.08; g.strokeStyle = stroke; g.strokeText(num, 0, 0); }
    g.fillStyle = color;
    g.fillText(num, 0, 0);
  };
}
function textDraw(text, color, weight = 800) {
  return (g, w, h) => {
    let size = h;
    g.font = `italic ${weight} ${size}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
    const m = g.measureText(text).width;
    if (m > w) { size = (size * w) / m; g.font = `italic ${weight} ${size}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`; }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.fillText(text, 0, 0);
  };
}
function imageDraw(img) {
  return (g, w, h) => {
    const r = Math.min(w / img.width, h / img.height);
    const iw = img.width * r, ih = img.height * r;
    g.fillStyle = "rgba(255,255,255,0.92)";
    const pad = 0.12 * Math.min(w, h);
    g.beginPath();
    g.roundRect(-iw / 2 - pad, -ih / 2 - pad, iw + pad * 2, ih + pad * 2, pad);
    g.fill();
    g.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  };
}

/* ------------------------------------------------------------------ */
/* construção                                                          */
/* ------------------------------------------------------------------ */
export function buildCar({ carNumber = "39" } = {}) {
  const root = new THREE.Group();
  root.name = "car";

  /* ----- registro de materiais por subsistema (para destaque) ----- */
  const registry = {}; // sub -> Set(materials)
  const carbonMap = carbonTexture();
  const base = {
    paint: () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide }),
    carbon: () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: carbonMap, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
    steel: () => new THREE.MeshStandardMaterial({ color: "#c3c7cf", metalness: 1, roughness: 0.25 }),
    dark: () => new THREE.MeshStandardMaterial({ color: "#2a2d33", metalness: 0.85, roughness: 0.38 }),
    black: () => new THREE.MeshStandardMaterial({ color: "#0f0f12", metalness: 0.2, roughness: 0.6 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: "#141416", metalness: 0, roughness: 0.88 }),
    orange: () => new THREE.MeshStandardMaterial({ color: "#ff8000", metalness: 0.35, roughness: 0.38 }),
    white: () => new THREE.MeshStandardMaterial({ color: "#f3f3f3", metalness: 0.1, roughness: 0.3 }),
    frame: () => new THREE.MeshStandardMaterial({ color: "#3a3d45", metalness: 0.85, roughness: 0.3 }),
    exhaust: () => new THREE.MeshStandardMaterial({ color: "#9aa0aa", metalness: 1, roughness: 0.22 }),
    disc: () => new THREE.MeshStandardMaterial({ color: "#8d9199", metalness: 1, roughness: 0.35 }),
    visor: () => new THREE.MeshPhysicalMaterial({ color: "#0a0a0c", metalness: 0.9, roughness: 0.05, clearcoat: 1 }),
    seat: () => new THREE.MeshStandardMaterial({ color: "#1c1c21", metalness: 0.05, roughness: 0.8 }),
  };
  const matCache = {};
  function M(sub, key) {
    const id = sub + ":" + key;
    if (!matCache[id]) {
      const m = base[key]();
      m.userData.sub = sub;
      m.userData.key = key;
      m.userData.baseGlow = 0;
      m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
      matCache[id] = m;
      (registry[sub] ||= new Set()).add(m);
    }
    return matCache[id];
  }

  const groups = {};
  function G(name, parent = root) {
    const g = new THREE.Group();
    g.name = name;
    g.userData.explode = new THREE.Vector3();
    parent.add(g);
    groups[name] = g;
    return g;
  }

  /* ================= CHASSI TUBULAR ================= */
  const frame = G("chassi");
  const N = {
    FB_lo: V(1.12, 0.11, 0.13), FB_hi: V(1.12, 0.34, 0.12),
    F2_lo: V(0.82, 0.11, 0.2), F2_hi: V(0.82, 0.41, 0.19),
    FH_lo: V(0.47, 0.08, 0.28), FH_mid: V(0.47, 0.36, 0.3), FH_top: V(0.46, 0.64, 0.16),
    C_lo: V(0.1, 0.08, 0.32), C_mid: V(0.1, 0.36, 0.33),
    MH_lo: V(-0.28, 0.08, 0.33), MH_mid: V(-0.28, 0.36, 0.34), MH_sh: V(-0.29, 0.72, 0.29), MH_top: V(-0.31, 1.02, 0.15),
    R1_lo: V(-0.72, 0.1, 0.26), R1_hi: V(-0.72, 0.52, 0.22),
    R2_lo: V(-1.0, 0.12, 0.2), R2_hi: V(-1.0, 0.44, 0.18),
  };
  const side = [
    ["FB_lo", "F2_lo"], ["F2_lo", "FH_lo"], ["FH_lo", "C_lo"], ["C_lo", "MH_lo"], ["MH_lo", "R1_lo"], ["R1_lo", "R2_lo"],
    ["FB_hi", "F2_hi"], ["F2_hi", "FH_mid"], ["FH_mid", "C_mid"], ["C_mid", "MH_mid"], ["MH_mid", "R1_hi"], ["R1_hi", "R2_hi"],
    ["FB_lo", "FB_hi"], ["F2_lo", "F2_hi"], ["FH_lo", "FH_mid"], ["FH_mid", "FH_top"], ["C_lo", "C_mid"],
    ["MH_lo", "MH_mid"], ["MH_mid", "MH_sh"], ["MH_sh", "MH_top"], ["R1_lo", "R1_hi"], ["R2_lo", "R2_hi"],
    ["FB_lo", "F2_hi"], ["F2_lo", "FH_mid"], ["FH_lo", "C_mid"], ["C_lo", "MH_mid"], ["MH_lo", "R1_hi"], ["R1_lo", "R2_hi"],
    ["FH_top", "F2_hi"], ["MH_top", "R1_hi"], ["FH_mid", "C_lo"],
  ];
  const cross = ["FB_lo", "FB_hi", "F2_lo", "F2_hi", "FH_lo", "FH_top", "MH_lo", "MH_sh", "MH_top", "R1_lo", "R1_hi", "R2_lo", "R2_hi"];
  const mir = (v) => V(v.x, v.y, -v.z);
  const members = [];
  for (const [a, b] of side) {
    members.push([N[a], N[b]]);
    members.push([mir(N[a]), mir(N[b])]);
  }
  for (const k of cross) members.push([N[k], mir(N[k])]);
  members.push([N.FB_lo, mir(N.FB_hi)], [N.R2_lo, mir(N.R2_hi)], [N.MH_lo, mir(N.R1_lo)], [N.F2_lo, mir(N.FH_lo)]);
  const frameMat = M("chassi", "frame");
  const inst = new THREE.InstancedMesh(CYL, frameMat, members.length);
  const dummy = new THREE.Object3D();
  dummy.userData.r = 0.0127;
  members.forEach(([a, b], i) => {
    setTube(dummy, a, b);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });
  inst.castShadow = true;
  frame.add(inst);
  // nós soldados
  const nodeGeo = new THREE.SphereGeometry(0.018, 10, 8);
  const nodeList = Object.values(N).flatMap((v) => [v, mir(v)]);
  const nodes = new THREE.InstancedMesh(nodeGeo, frameMat, nodeList.length);
  nodeList.forEach((v, i) => { dummy.position.copy(v); dummy.scale.setScalar(1); dummy.quaternion.identity(); dummy.updateMatrix(); nodes.setMatrixAt(i, dummy.matrix); });
  frame.add(nodes);
  // atenuador de impacto (bloco à frente da antepara)
  const att = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), M("chassi", "white"));
  att.position.set(1.19, 0.23, 0);
  frame.add(att);
  const floorPan = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.008, 0.56), M("chassi", "carbon"));
  floorPan.position.set(0.4, 0.07, 0);
  frame.add(floorPan);
  const firewall = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.6, 0.62), M("chassi", "carbon"));
  firewall.position.set(-0.3, 0.38, 0);
  frame.add(firewall);

  /* ================= CARENAGEM ================= */
  const body = G("carenagem");
  const paintMat = M("carenagem", "paint");
  const bodyStations = [
    { x: 1.36, w: 0.035, yb: 0.2, yt: 0.27 },
    { x: 1.3, w: 0.11, yb: 0.13, yt: 0.34 },
    { x: 1.18, w: 0.18, yb: 0.08, yt: 0.41 },
    { x: 1.02, w: 0.215, yb: 0.065, yt: 0.46 },
    { x: 0.82, w: 0.255, yb: 0.06, yt: 0.51 },
    { x: 0.62, w: 0.305, yb: 0.06, yt: 0.56 },
    { x: 0.45, w: 0.35, yb: 0.06, yt: 0.6 },
    { x: 0.2, w: 0.372, yb: 0.06, yt: 0.585 },
    { x: -0.05, w: 0.378, yb: 0.06, yt: 0.575 },
    { x: -0.22, w: 0.372, yb: 0.06, yt: 0.62 },
    { x: -0.32, w: 0.365, yb: 0.06, yt: 0.64 },
  ];
  const RIM = 0.46, CK_A = -0.24, CK_B = 0.5;
  const bodyGeo = loftGeometry(bodyStations, {
    per: 8, seg: 80, n: 3, nb: 6,
    skip: (x, y) => x > CK_A && x < CK_B && y > RIM,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  body.add(bodyMesh);
  // borda do cockpit
  {
    const rings = bodyGeo.userData.rings.filter((s) => s.x > CK_A && s.x < CK_B);
    const edge = (s, sgn) => {
      const ym = (s.yb + s.yt) / 2, h = (s.yt - s.yb) / 2;
      const q = Math.max(0, Math.min(1, (RIM - ym) / h));
      const si = Math.pow(q, 3 / 2);
      const a = Math.asin(si);
      return V(s.x, RIM, sgn * s.w * sgnPow(Math.cos(a), 2 / 3));
    };
    const pts = [];
    rings.forEach((s) => pts.push(edge(s, 1)));
    const back = rings[rings.length - 1], front = rings[0];
    const zb = edge(back, 1).z;
    for (let k = 1; k < 6; k++) pts.push(V(back.x - 0.01 * Math.sin((k / 6) * Math.PI), RIM + 0.012 * Math.sin((k / 6) * Math.PI), zb * Math.cos((k / 6) * Math.PI)));
    for (let i = rings.length - 1; i >= 0; i--) pts.push(edge(rings[i], -1));
    const zf = edge(front, 1).z;
    for (let k = 1; k < 6; k++) pts.push(V(front.x + 0.01 * Math.sin((k / 6) * Math.PI), RIM + 0.012 * Math.sin((k / 6) * Math.PI), -zf * Math.cos((k / 6) * Math.PI)));
    const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.2);
    const rim = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.014, 8, true), M("carenagem", "black"));
    body.add(rim);
  }
  // wireframe (modo raio-x)
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(loftGeometry(bodyStations, { per: 3, seg: 36, n: 3, nb: 6, skip: (x, y) => x > CK_A && x < CK_B && y > RIM, capStart: false, capEnd: false })),
    new THREE.LineBasicMaterial({ color: "#ff9a3d", transparent: true, opacity: 0, depthWrite: false })
  );
  body.add(wire);

  /* ----- sidepods (radiador no direito) ----- */
  const pods = [];
  for (const s of [1, -1]) {
    const pod = G(s > 0 ? "sidepodR" : "sidepodL");
    const st = [
      { x: 0.27, w: 0.1, yb: 0.1, yt: 0.4, zc: 0.47 * s },
      { x: 0.1, w: 0.108, yb: 0.09, yt: 0.415, zc: 0.47 * s },
      { x: -0.15, w: 0.1, yb: 0.09, yt: 0.385, zc: 0.465 * s },
      { x: -0.38, w: 0.075, yb: 0.1, yt: 0.3, zc: 0.45 * s },
      { x: -0.56, w: 0.025, yb: 0.13, yt: 0.2, zc: 0.43 * s },
    ];
    const geo = loftGeometry(st, { per: 8, seg: 56, n: 3.2, nb: 5, capStart: false, capEnd: true });
    const mesh = new THREE.Mesh(geo, paintMat);
    mesh.castShadow = true;
    pod.add(mesh);
    // entrada de ar com colmeia do radiador
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.29), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.8, metalness: 0.4 }));
    grill.position.set(0.265, 0.25, 0.47 * s);
    grill.rotation.y = Math.PI / 2;
    pod.add(grill);
    pods.push(mesh);
    pod.userData.explode.set(0, 0.1, 0.78 * s);
  }
  // radiador e ventoinha (visíveis no raio-x)
  const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.17), M("powertrain", "dark"));
  radiator.position.set(0.18, 0.25, 0.47);
  radiator.rotation.z = -12 * DEG;
  groups.sidepodR.add(radiator);

  /* ================= COCKPIT E PILOTO ================= */
  const cockpit = G("cockpit");
  const seatBack = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.06, 0.52, 0.42, 3, 0.025), M("cockpit", "seat"));
  seatBack.position.set(-0.13, 0.33, 0);
  seatBack.rotation.z = 28 * DEG;
  const seatBase = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.42, 0.05, 0.4, 3, 0.02), M("cockpit", "seat"));
  seatBase.position.set(0.12, 0.1, 0);
  cockpit.add(seatBack, seatBase);
  const wheelG = new THREE.Group();
  wheelG.position.set(0.34, 0.5, 0);
  wheelG.rotation.z = 18 * DEG;
  const rimW = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 36), M("cockpit", "black"));
  rimW.rotation.y = Math.PI / 2;
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.12), M("cockpit", "carbon"));
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({ color: "#ff8000" }));
  lcd.position.set(-0.011, 0, 0);
  lcd.rotation.y = -Math.PI / 2;
  wheelG.add(rimW, screen, lcd);
  cockpit.add(wheelG);
  const column = tube(V(0.36, 0.49, 0), V(0.72, 0.28, 0), 0.012, M("cockpit", "steel"));
  cockpit.add(column);
  groups.steeringWheel = wheelG;

  const driver = G("piloto");
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.125, 36, 24), M("piloto", "white"));
  helmet.position.set(-0.13, 0.76, 0);
  helmet.castShadow = true;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.1265, 32, 16, Math.PI - 0.95, 1.9, 1.15, 0.55), M("piloto", "visor"));
  visor.position.copy(helmet.position);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.127, 0.013, 8, 48, Math.PI), M("piloto", "orange"));
  stripe.position.copy(helmet.position);
  const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 6, 12), M("piloto", "seat"));
  shoulders.rotation.x = Math.PI / 2;
  shoulders.position.set(-0.1, 0.54, 0);
  driver.add(helmet, visor, stripe, shoulders);

  /* ================= POWERTRAIN ================= */
  const pt = G("powertrain");
  const block = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.3, 0.3, 0.42, 3, 0.03), M("powertrain", "dark"));
  block.position.set(-0.5, 0.3, 0);
  block.castShadow = true;
  const head = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.22, 0.13, 0.38, 3, 0.02), M("powertrain", "steel"));
  head.position.set(-0.48, 0.51, 0);
  const cover = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.2, 0.05, 0.34, 3, 0.018), M("powertrain", "orange"));
  cover.position.set(-0.47, 0.6, 0);
  const sump = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.24, 0.07, 0.3, 2, 0.015), M("powertrain", "dark"));
  sump.position.set(-0.52, 0.14, 0);
  pt.add(block, head, cover, sump);
  // fins de arrefecimento no bloco
  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.006, 0.43), M("powertrain", "steel"));
    fin.position.set(-0.5, 0.2 + i * 0.045, 0);
    pt.add(fin);
  }
  // mangueiras do radiador
  const hose = new THREE.CatmullRomCurve3([V(-0.4, 0.42, 0.21), V(-0.2, 0.36, 0.34), V(0.05, 0.3, 0.42), V(0.16, 0.22, 0.44)]);
  pt.add(new THREE.Mesh(new THREE.TubeGeometry(hose, 30, 0.015, 8), M("powertrain", "black")));
  groups.engineShake = pt;

  /* admissão: filtro -> restritor -> plenum -> dutos */
  const intake = G("admissao");
  const plenum = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 8, 18), M("admissao", "carbon"));
  plenum.rotation.x = Math.PI / 2;
  plenum.position.set(-0.47, 0.72, 0);
  intake.add(plenum);
  for (let i = 0; i < 4; i++) {
    const z = -0.135 + i * 0.09;
    intake.add(tube(V(-0.47, 0.7, z), V(-0.43, 0.56, z), 0.02, M("admissao", "steel")));
  }
  const restrictor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.018, 0.14, 20, 1, true), M("admissao", "orange"));
  restrictor.rotation.z = Math.PI / 2 - 0.25;
  restrictor.position.set(-0.6, 0.75, 0);
  const throttle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 18), M("admissao", "steel"));
  throttle.rotation.z = Math.PI / 2 - 0.25;
  throttle.position.set(-0.7, 0.78, 0);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.13, 22), M("admissao", "white"));
  filter.rotation.z = Math.PI / 2 - 0.25;
  filter.position.set(-0.8, 0.81, 0);
  intake.add(restrictor, throttle, filter);
  intake.add(tube(V(-0.52, 0.73, 0), V(-0.56, 0.74, 0), 0.03, M("admissao", "steel")));

  /* escape: 4 coletores -> coletor 4x1 -> silencioso */
  const exhaust = G("escape");
  const exMat = M("escape", "exhaust");
  for (let i = 0; i < 4; i++) {
    const z = -0.14 + i * 0.093;
    const c = new THREE.CatmullRomCurve3([
      V(-0.6, 0.49, z), V(-0.68, 0.46, z * 0.9), V(-0.74, 0.38, z * 0.6 - 0.06), V(-0.8, 0.3, -0.16), V(-0.86, 0.3, -0.22),
    ]);
    exhaust.add(new THREE.Mesh(new THREE.TubeGeometry(c, 32, 0.017, 10), exMat));
  }
  const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 24), exMat);
  muffler.rotation.z = Math.PI / 2 - 0.12;
  muffler.position.set(-1.04, 0.34, -0.26);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.07, 18, 1, true), M("escape", "dark"));
  tip.rotation.z = Math.PI / 2 - 0.12;
  tip.position.set(-1.24, 0.37, -0.26);
  exhaust.add(muffler, tip);
  exhaust.add(tube(V(-0.86, 0.3, -0.22), V(-0.88, 0.32, -0.26), 0.028, exMat));
  exhaust.userData.explode.set(-0.4, 0.1, -0.6);

  /* transmissão: pinhão, corrente, coroa e diferencial */
  const trans = G("transmissao");
  const diff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 28), M("transmissao", "dark"));
  diff.rotation.x = Math.PI / 2;
  diff.position.set(-0.76, 0.24, 0.02);
  const sprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 36), M("transmissao", "steel"));
  sprocket.rotation.x = Math.PI / 2;
  sprocket.position.set(-0.76, 0.24, -0.1);
  const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 18), M("transmissao", "steel"));
  pinion.rotation.x = Math.PI / 2;
  pinion.position.set(-0.42, 0.18, -0.1);
  trans.add(diff, sprocket, pinion);
  {
    const a = V(-0.42, 0.18, -0.1), b = V(-0.76, 0.24, -0.1);
    const pts = [];
    const ra = 0.04, rb = 0.105;
    for (let i = 0; i < 24; i++) { const t = -Math.PI / 2 + (i / 23) * Math.PI; pts.push(V(a.x + ra * Math.cos(t), a.y + ra * Math.sin(t), a.z)); }
    for (let i = 0; i < 36; i++) { const t = Math.PI / 2 + (i / 35) * Math.PI; pts.push(V(b.x + rb * Math.cos(t), b.y + rb * Math.sin(t), b.z)); }
    const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.006, 6, true), M("transmissao", "black"));
    trans.add(chain);
  }
  trans.userData.explode.set(-0.25, -0.02, 0);
  groups.sprocket = sprocket;

  /* ================= AERODINÂMICA ================= */
  const aeroFront = G("asaDianteira");
  const carbonA = M("aero", "carbon");
  aeroFront.add(wingElement(V(1.52, 0.075, 0), 0.3, 1.36, 4, carbonA, 0.12, 0.07));
  aeroFront.add(wingElement(V(1.25, 0.13, 0), 0.19, 0.98, 24, carbonA, 0.1, 0.07));
  aeroFront.add(wingElement(V(1.12, 0.2, 0), 0.15, 0.98, 42, M("aero", "orange"), 0.1, 0.07));
  for (const s of [1, -1]) {
    aeroFront.add(plate([[1.54, 0.035], [1.1, 0.035], [1.02, 0.14], [1.02, 0.3], [1.3, 0.3], [1.54, 0.12]], 0.008, 0.685 * s, carbonA));
    aeroFront.add(tube(V(1.3, 0.1, 0.14 * s), V(1.22, 0.2, 0.12 * s), 0.008, M("aero", "steel")));
  }
  aeroFront.userData.explode.set(0.95, 0, 0);

  const aeroRear = G("asaTraseira");
  aeroRear.add(wingElement(V(-1.02, 0.86, 0), 0.36, 1.04, 6, carbonA, 0.13, 0.08));
  aeroRear.add(wingElement(V(-1.26, 0.98, 0), 0.24, 1.04, 32, carbonA, 0.11, 0.08));
  aeroRear.add(wingElement(V(-1.36, 1.1, 0), 0.17, 1.04, 55, M("aero", "orange"), 0.1, 0.08));
  for (const s of [1, -1]) {
    aeroRear.add(plate([[-0.98, 0.74], [-1.46, 0.74], [-1.5, 0.95], [-1.5, 1.24], [-1.3, 1.24], [-0.98, 0.98]], 0.008, 0.525 * s, carbonA));
    aeroRear.add(tube(V(-1.0, 0.44, 0.18 * s), V(-1.14, 0.84, 0.2 * s), 0.011, M("aero", "steel")));
    aeroRear.add(tube(V(-0.76, 0.5, 0.2 * s), V(-1.14, 0.84, 0.2 * s), 0.009, M("aero", "steel")));
  }
  aeroRear.userData.explode.set(-0.85, 0.55, 0);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.006, 0.6), carbonA);
  diffuser.position.set(-0.95, 0.09, 0);
  diffuser.rotation.z = -10 * DEG;
  aeroRear.add(diffuser);

  /* ================= SUSPENSÃO, RODAS E FREIOS ================= */
  const R = 0.255;
  const corners = [];
  const tireGeo = (() => {
    const pts = [];
    const rc = 0.212, hr = 0.043, hw = 0.1, n = 5;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector2(rc + hr * sgnPow(Math.cos(a), 2 / n), hw * sgnPow(Math.sin(a), 2 / n)));
    }
    const g = new THREE.LatheGeometry(pts, 72);
    g.rotateX(Math.PI / 2);
    return g;
  })();
  const barrelGeo = new THREE.CylinderGeometry(0.168, 0.168, 0.19, 40, 1, true).rotateX(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.01, 40).rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.07, 20).rotateX(Math.PI / 2);
  const nutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.035, 6).rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.13, 0.024, 0.016);
  const bandGeo = new THREE.RingGeometry(0.226, 0.236, 72);

  const cornerSpecs = [
    { name: "FR", front: true, s: 1, c: V(0.8, R, 0.61), uo: V(0.8, 0.37, 0.53), lo: V(0.8, 0.13, 0.55), ui: [V(0.95, 0.36, 0.17), V(0.62, 0.37, 0.25)], li: [V(0.95, 0.12, 0.16), V(0.62, 0.1, 0.25)], rocker: V(0.8, 0.42, 0.14), steerIn: V(0.7, 0.2, 0.2), steerOut: V(0.7, 0.22, 0.53) },
    { name: "RR", front: false, s: 1, c: V(-0.76, R, 0.59), uo: V(-0.76, 0.37, 0.51), lo: V(-0.76, 0.13, 0.53), ui: [V(-0.6, 0.4, 0.23), V(-0.93, 0.38, 0.19)], li: [V(-0.6, 0.11, 0.26), V(-0.93, 0.12, 0.2)], rocker: V(-0.76, 0.56, 0.2), steerIn: V(-0.88, 0.22, 0.2), steerOut: V(-0.88, 0.24, 0.51) },
  ];
  const specs = [];
  for (const sp of cornerSpecs) {
    specs.push(sp);
    const m = (v) => V(v.x, v.y, -v.z);
    specs.push({ ...sp, name: sp.name[0] + "L", s: -1, c: m(sp.c), uo: m(sp.uo), lo: m(sp.lo), ui: sp.ui.map(m), li: sp.li.map(m), rocker: m(sp.rocker), steerIn: m(sp.steerIn), steerOut: m(sp.steerOut) });
  }

  const suspMat = M("suspensao", "steel");
  const suspDark = M("suspensao", "dark");
  const springMat = M("suspensao", "orange");
  for (const sp of specs) {
    const g = G("corner" + sp.name);
    g.userData.explode.set(sp.front ? 0.2 : -0.2, 0, 0.8 * sp.s);
    const hub = new THREE.Group();
    hub.position.copy(sp.c);
    g.add(hub);
    const spin = new THREE.Group();
    const mount = new THREE.Group();
    if (sp.s < 0) mount.rotation.y = Math.PI;
    hub.add(mount);
    mount.add(spin);
    // roda (gira)
    const tire = new THREE.Mesh(tireGeo, M("rodas", "rubber"));
    tire.castShadow = true;
    const barrel = new THREE.Mesh(barrelGeo, M("rodas", "dark"));
    const hubM = new THREE.Mesh(hubGeo, M("rodas", "dark"));
    hubM.position.z = 0.05;
    const nut = new THREE.Mesh(nutGeo, M("rodas", "orange"));
    nut.position.z = 0.09;
    spin.add(tire, barrel, hubM, nut);
    for (let k = 0; k < 6; k++) {
      const sk = new THREE.Mesh(spokeGeo, M("rodas", "dark"));
      const a = (k / 6) * Math.PI * 2;
      sk.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.06);
      sk.rotation.z = a;
      spin.add(sk);
    }
    for (const zz of [1, -1]) {
      const band = new THREE.Mesh(bandGeo, M("rodas", "orange"));
      band.position.z = 0.101 * zz;
      if (zz < 0) band.rotation.y = Math.PI;
      spin.add(band);
    }
    const disc = new THREE.Mesh(discGeo, M("freios", "disc"));
    disc.position.z = -0.035;
    spin.add(disc);
    // não gira: pinça e manga
    const caliper = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.07, 0.05, 0.04, 2, 0.01), M("freios", "orange"));
    caliper.position.set(-0.07, 0.07, -0.035);
    caliper.rotation.z = 0.8;
    mount.add(caliper);
    // manga de eixo (entre os pivôs)
    const uprightA = sp.uo.clone().sub(sp.c), uprightB = sp.lo.clone().sub(sp.c);
    const upright = tube(uprightA, uprightB, 0.022, suspDark);
    hub.add(upright);

    const arms = [0, 1, 2, 3].map(() => g.add(tube(V(), V(0, 1, 0), 0.0095, suspMat)).children.at(-1));
    const push = tube(V(), V(0, 1, 0), 0.009, suspMat);
    const link = tube(V(), V(0, 1, 0), 0.008, suspMat);
    g.add(push, link);
    let shaft = null;
    if (!sp.front) {
      shaft = tube(V(), V(0, 1, 0), 0.016, M("transmissao", "steel"));
      g.add(shaft);
    }
    // balancim, mola e amortecedor (presos ao chassi)
    const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.06), springMat);
    rocker.position.copy(sp.rocker);
    frame.add(rocker);
    const dampTo = sp.front ? V(1.02, 0.4, 0.06 * sp.s) : V(-0.97, 0.52, 0.07 * sp.s);
    const damper = new THREE.Group();
    damper.position.copy(sp.rocker);
    const dir = dampTo.clone().sub(sp.rocker);
    const L = dir.length();
    damper.quaternion.setFromUnitVectors(Y, dir.normalize());
    const bodyD = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L * 0.6, 14), suspDark);
    bodyD.position.y = L * 0.7;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, L * 0.5, 8), suspMat);
    rod.position.y = L * 0.25;
    const helix = [];
    for (let i = 0; i <= 160; i++) { const t = i / 160; const a = t * Math.PI * 2 * 8; helix.push(V(Math.cos(a) * 0.028, 0.08 * L + t * L * 0.7, Math.sin(a) * 0.028)); }
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 320, 0.0045, 6), springMat);
    damper.add(bodyD, rod, spring);
    frame.add(damper);

    const corner = {
      sp, group: g, hub, spin, arms, push, link, shaft, rocker, damper, spring, disc,
      update(heave, steer) {
        const off = V(0, heave, 0);
        const rot = (p) => p.clone().sub(sp.c).applyAxisAngle(Y, sp.front ? steer : 0).add(sp.c).add(off);
        hub.position.copy(sp.c).add(off);
        hub.rotation.y = sp.front ? steer : 0;
        const uo = rot(sp.uo), lo = rot(sp.lo);
        setTube(arms[0], sp.ui[0], uo);
        setTube(arms[1], sp.ui[1], uo);
        setTube(arms[2], sp.li[0], lo);
        setTube(arms[3], sp.li[1], lo);
        const pushLow = lo.clone().add(V(0, 0.02, -0.04 * sp.s));
        setTube(push, pushLow, sp.rocker);
        setTube(link, sp.steerIn.clone().add(V(0, 0, (sp.front ? steer * 0.09 : 0) * 1)), rot(sp.steerOut));
        if (shaft) setTube(shaft, V(-0.76, 0.24, 0.1 * sp.s), hub.position);
        rocker.rotation.x = heave * 6 * sp.s;
        const k = 1 - heave * 2.2;
        damper.scale.set(1, k, 1);
      },
    };
    corner.update(0, 0);
    corners.push(corner);
  }

  /* ================= LIVERY (canvas) ================= */
  const liveryCanvas = document.createElement("canvas");
  liveryCanvas.width = 2048;
  liveryCanvas.height = 1024;
  const liveryTex = new THREE.CanvasTexture(liveryCanvas);
  liveryTex.colorSpace = THREE.SRGBColorSpace;
  liveryTex.anisotropy = 8;
  const podCanvas = document.createElement("canvas");
  podCanvas.width = 1024;
  podCanvas.height = 1024;
  const podTex = new THREE.CanvasTexture(podCanvas);
  podTex.colorSpace = THREE.SRGBColorSpace;
  podTex.anisotropy = 8;
  const podMat = paintMat.clone();
  podMat.userData = { ...paintMat.userData };
  registry.carenagem.add(podMat);
  pods.forEach((m) => (m.material = podMat));
  paintMat.map = liveryTex;
  podMat.map = podTex;

  let sponsorImg = null;
  let paint = PAINTS.papaya;
  function drawLivery() {
    const W = liveryCanvas.width, H = liveryCanvas.height;
    const g = liveryCanvas.getContext("2d");
    g.fillStyle = paint.body;
    g.fillRect(0, 0, W, H);
    // faixa escura inferior (fundo e parte baixa das laterais), subindo em direção à traseira
    g.fillStyle = paint.accent;
    for (const [v0, v1] of [[0, 0.13], [0.87, 1]]) g.fillRect(0, (1 - v1) * H, W, (v1 - v0) * H);
    g.beginPath();
    g.moveTo(0, (1 - 0.13) * H);
    g.lineTo(W * 0.35, (1 - 0.13) * H);
    g.lineTo(W, (1 - 0.2) * H);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
    g.beginPath();
    g.moveTo(0, 0.13 * H);
    g.lineTo(W * 0.35, 0.13 * H);
    g.lineTo(W, 0.2 * H);
    g.lineTo(W, 0);
    g.lineTo(0, 0);
    g.fill();
    // filete na divisa
    g.strokeStyle = paint.stripe;
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(0, (1 - 0.135) * H); g.lineTo(W * 0.35, (1 - 0.135) * H); g.lineTo(W, (1 - 0.205) * H); g.stroke();
    g.beginPath(); g.moveTo(0, 0.135 * H); g.lineTo(W * 0.35, 0.135 * H); g.lineTo(W, 0.205 * H); g.stroke();
    // filete central no topo
    g.fillStyle = paint.stripe;
    g.fillRect(0, 0.5 * H - 5, W * 0.55, 10);
    // nome e número no bico
    drawSideText(g, W, H, textDraw("TAURUS RACING", paint.stripe), 0.2, 0.5, 0.265, 0.05);
    drawSideText(g, W, H, textDraw("UFTM · FÓRMULA SAE", paint.stripe, 600), 0.22, 0.45, 0.215, 0.025);
    liveryTex.needsUpdate = true;

    const P = podCanvas.getContext("2d");
    const PW = podCanvas.width, PH = podCanvas.height;
    P.fillStyle = paint.body;
    P.fillRect(0, 0, PW, PH);
    P.fillStyle = paint.accent;
    P.fillRect(0, (1 - 0.13) * PH, PW, 0.13 * PH);
    P.fillRect(0, 0, PW, 0.13 * PH);
    // número: círculo branco com número escuro (padrão de competição)
    drawSideText(P, PW, PH, (gg, w, h) => {
      gg.fillStyle = "#ffffff";
      gg.beginPath();
      gg.roundRect(-w / 2, -h / 2, w, h, h * 0.18);
      gg.fill();
      numberDraw(carNumber, "#0f0f12")(gg, w, h * 0.95);
    }, 0.06, 0.38, 0.25, 0.14);
    if (sponsorImg) drawSideText(P, PW, PH, imageDraw(sponsorImg), 0.44, 0.86, 0.25, 0.11);
    else drawSideText(P, PW, PH, textDraw("SUA MARCA AQUI", paint.stripe, 700), 0.44, 0.86, 0.25, 0.05);
    podTex.needsUpdate = true;
  }
  drawLivery();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLivery);

  /* ================= explosão (deslocamentos) ================= */
  groups.carenagem.userData.explode.set(0.2, 1.3, 0);
  groups.cockpit.userData.explode.set(0.05, 0.6, 0);
  groups.piloto.userData.explode.set(0, 2.2, 0);
  groups.powertrain.userData.explode.set(-0.1, 0.4, 0);
  groups.admissao.userData.explode.set(-0.15, 1.05, 0);

  /* ================= âncoras para rótulos ================= */
  const anchors = {
    chassi: { group: frame, p: V(0.1, 0.36, 0.33) },
    suspensao: { group: groups.cornerFR, p: V(0.8, 0.37, 0.44) },
    freios: { group: groups.cornerFR, p: V(0.8, 0.3, 0.52) },
    powertrain: { group: pt, p: V(-0.5, 0.42, 0.22) },
    admissao: { group: intake, p: V(-0.62, 0.77, 0.05) },
    escape: { group: exhaust, p: V(-1.08, 0.36, -0.3) },
    transmissao: { group: trans, p: V(-0.76, 0.3, -0.1) },
    aero: { group: aeroRear, p: V(-1.2, 1.1, 0.35) },
    cockpit: { group: cockpit, p: V(0.34, 0.56, 0) },
  };
  const subOf = {
    chassi: ["chassi"], suspensao: ["suspensao"], freios: ["freios"], powertrain: ["powertrain"],
    admissao: ["admissao"], escape: ["escape"], transmissao: ["transmissao"], aero: ["aero"], cockpit: ["cockpit"],
    carenagem: ["carenagem"], rodas: ["rodas"],
  };

  /* ================= estado ================= */
  const state = { explode: 0, xray: 0, air: 0, heave: 0, steer: 0, spin: 0, heat: 0, brake: 0, highlight: {}, driver: 1 };
  const orange = new THREE.Color("#ff8000");
  const white = new THREE.Color("#ffffff");
  const tmp = new THREE.Vector3();

  function apply(time = 0) {
    // explosão
    for (const g of Object.values(groups)) {
      if (!g.userData || !g.userData.explode) continue;
      g.position.copy(g.userData.explode).multiplyScalar(ease(state.explode));
    }
    // suspensão / direção
    for (const c of corners) {
      c.update(state.heave * (c.sp.front ? 1 : 0.9), state.steer);
      c.spin.rotation.z = -state.spin * c.sp.s;
    }
    groups.steeringWheel.rotation.x = -state.steer * 5;
    groups.sprocket.rotation.z = -state.spin;
    // raio-x
    const xr = state.xray;
    for (const m of [paintMat, podMat]) {
      m.transparent = xr > 0.001;
      m.opacity = 1 - 0.9 * xr;
      m.depthWrite = xr < 0.5;
    }
    wire.material.opacity = 0.55 * xr;
    carbonA.transparent = xr > 0.001;
    carbonA.opacity = 1 - 0.6 * xr;
    frameMat.userData.baseGlow = 1.6 * xr;
    // motor: calor no escape, vibração
    exMat.userData.baseGlow = state.heat * 1.8;
    exMat.userData.glowColor = "heat";
    groups.engineShake.position.x = groups.powertrain.userData.explode.x * ease(state.explode) + (state.heat > 0.02 ? Math.sin(time * 90) * 0.0012 * (0.4 + state.heat) : 0);
    groups.engineShake.position.y = groups.powertrain.userData.explode.y * ease(state.explode) + (state.heat > 0.02 ? Math.cos(time * 77) * 0.0012 * (0.4 + state.heat) : 0);
    // freios
    for (const m of registry.freios) if (m.userData.key === "disc") m.userData.baseGlow = state.brake * 2.2;
    // piloto
    groups.piloto.visible = state.driver > 0.02;
    groups.piloto.scale.setScalar(Math.max(0.001, state.driver));
    // destaque por subsistema + brilhos
    const pulse = 0.55 + 0.45 * Math.sin(time * 4);
    for (const [sub, set] of Object.entries(registry)) {
      let h = 0;
      for (const [k, amt] of Object.entries(state.highlight)) if ((subOf[k] || [k]).includes(sub)) h = Math.max(h, amt);
      for (const m of set) {
        if (!m.emissive) continue;
        const glow = m.userData.baseGlow || 0;
        const e = glow + h * 0.55 * pulse;
        if (m.userData.glowColor === "heat") m.emissive.setRGB(1, 0.32 + 0.2 * Math.min(1, glow), 0.02);
        else m.emissive.copy(orange);
        m.emissiveIntensity = e;
      }
    }
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function anchorWorld(name, target = tmp) {
    const a = anchors[name];
    return target.copy(a.p).add(a.group.position).applyMatrix4(root.matrixWorld);
  }

  return {
    root,
    groups,
    corners,
    state,
    apply,
    anchors,
    anchorWorld,
    setPaint(name) {
      paint = PAINTS[name] || PAINTS.papaya;
      const carbon = name === "carbono";
      for (const m of [paintMat, podMat]) {
        m.metalness = carbon ? 0.4 : 0.2;
        m.roughness = carbon ? 0.3 : 0.32;
      }
      drawLivery();
    },
    setSponsor(img) {
      sponsorImg = img;
      drawLivery();
    },
    bodyProfile: bodyStations,
    dispose() {},
  };
}
