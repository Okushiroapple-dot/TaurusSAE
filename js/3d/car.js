/*
 * Modelo 3D procedural de um Fórmula SAE a combustão.
 * Tudo é gerado em código (sem arquivo de modelo): chassi tubular,
 * carenagem, suspensão duplo A com pushrod, motor, escape, asas e rodas.
 *
 * Eixos: x para a frente (bico), y para cima, z para a direita.
 * Unidades: metros. Origem no chão, entre os eixos.
 */
import * as THREE from "../../vendor/three.bundle.min.js";
import { carbonTextures, flakeNormal, noiseTexture, heatTintTexture, discTexture, fabricNormal, roadTireTextures, camoTexture, wingPanelTextures, numberPlateTexture, labelTexture } from "./textures.js";

const Y = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 18, 1);
const _d = new THREE.Vector3();
const DEG = Math.PI / 180;

export const PAINTS = {
  taurus: { body: "#111114", accent: "#1c1d21", stripe: "#ff7a00", lettering: "#ff7a00", matte: true },
  papaya: { body: "#ff8000", accent: "#0f0f12", stripe: "#ffffff", lettering: "#0f0f12" },
  preto: { body: "#141418", accent: "#ff8000", stripe: "#ff8000", lettering: "#ffffff" },
  branco: { body: "#f2f2f2", accent: "#ff8000", stripe: "#141418", lettering: "#141418" },
  carbono: { body: "#1b1b20", accent: "#2a2b30", stripe: "#ffffff", lettering: "#ff8000" },
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
    // v pelo comprimento do contorno (e não pelo ângulo), para o texto da pintura
    // não sair esticado nas laterais retas
    const ring = [];
    const acc = [0];
    for (let j = 0; j <= seg; j++) {
      ring.push(ringPoint(s, -Math.PI / 2 + (j / seg) * Math.PI * 2, n, nb));
      if (j) acc.push(acc[j - 1] + Math.hypot(ring[j][1] - ring[j - 1][1], ring[j][2] - ring[j - 1][2]));
    }
    const L = acc[seg] || 1;
    for (let j = 0; j <= seg; j++) {
      pos.push(...ring[j]);
      uv.push((x0 - s.x) / (x0 - x1), acc[j] / L);
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
      // ordem anti-horária vista de fora: a face da frente aponta para fora
      idx.push(a, b, c, b, d, c);
    }
  }
  const addCap = (ringIdx, flip) => {
    const s = rings[ringIdx];
    const center = pos.length / 3;
    pos.push(s.x, (s.yb + s.yt) / 2, s.zc || 0);
    uv.push(ringIdx === 0 ? 0 : 1, 0.5);
    for (let j = 0; j < seg; j++) {
      const a = ringIdx * row + j;
      if (flip) idx.push(center, a, a + 1);
      else idx.push(center, a + 1, a);
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
// k: quanto o canvas é "apertado" na horizontal em relação ao carro
// (1 px em u cobre menos metros que 1 px em v); o desenho é esticado por k
function textDraw(text, color, weight = 800, k = 1) {
  return (g, w, h) => {
    let size = h;
    g.font = `italic ${weight} ${size}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`;
    const m = g.measureText(text).width * k;
    if (m > w) { size = (size * w) / m; g.font = `italic ${weight} ${size}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif`; }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.scale(k, 1);
    g.fillText(text, 0, 0);
  };
}
function imageDraw(img, k = 1) {
  return (g, w, h) => {
    const r = Math.min(w / (img.width * k), h / img.height);
    const iw = img.width * r, ih = img.height * r;
    g.scale(k, 1);
    g.fillStyle = "rgba(255,255,255,0.92)";
    const pad = 0.12 * ih;
    g.beginPath();
    g.roundRect(-iw / 2 - pad, -ih / 2 - pad, iw + pad * 2, ih + pad * 2, pad);
    g.fill();
    g.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  };
}

/* ------------------------------------------------------------------ */
/* construção: TR-04, o carro da Taurus Racing (feito a partir de fotos) */
/* ------------------------------------------------------------------ */
export function buildCar({ carNumber = "38", carName = "TR-04" } = {}) {
  const root = new THREE.Group();
  root.name = "car";

  /* ----- registro de materiais por subsistema (para destaque) ----- */
  const registry = {}; // sub -> Set(materials)
  // texturas procedurais compartilhadas (js/3d/textures.js)
  const carbonT = carbonTextures(12);
  const flakes = flakeNormal(90);
  const castNoise = noiseTexture({ size: 256, base: 150, amp: 55, blobs: 1400, seed: 4, repeat: 3 });
  const heatTint = heatTintTexture();
  const tireT = roadTireTextures();
  const discMap = discTexture();
  const fabric = fabricNormal(24);
  const camo = camoTexture({ repeat: [1.6, 1.6] });
  // elementos finos da asa dianteira: repete mais ao longo da envergadura para as manchas não esticarem
  const camoSpan = camoTexture({ repeat: [3.6, 1], seed: 7 });
  const wingPanels = wingPanelTextures();
  const base = {
    // pintura: a base muda com a pintura escolhida (setPaint)
    paint: () => new THREE.MeshPhysicalMaterial({
      color: "#ffffff", metalness: 0.1, roughness: 0.55, normalMap: flakes, normalScale: new THREE.Vector2(0.06, 0.06),
      clearcoat: 0.35, clearcoatRoughness: 0.3, side: THREE.DoubleSide,
    }),
    carbon: () => new THREE.MeshPhysicalMaterial({
      color: "#ffffff", map: carbonT.map, normalMap: carbonT.normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
      metalness: 0.2, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.05,
    }),
    // asa com adesivo camuflado (vinil fosco)
    camo: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: camo, roughness: 0.62, metalness: 0.05 }),
    camoSpan: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: camoSpan, roughness: 0.62, metalness: 0.05 }),
    wingFront: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: wingPanels.front, roughness: 0.6, metalness: 0.05 }),
    wingBack: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: wingPanels.back, roughness: 0.6, metalness: 0.05 }),
    steel: () => new THREE.MeshStandardMaterial({ color: "#cfd2d8", metalness: 1, roughness: 0.2 }),
    chrome: () => new THREE.MeshStandardMaterial({ color: "#e8eaee", metalness: 1, roughness: 0.08 }),
    alu: () => new THREE.MeshPhysicalMaterial({ color: "#c9ccd2", metalness: 1, roughness: 0.16, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    dark: () => new THREE.MeshStandardMaterial({ color: "#26282d", metalness: 0.7, roughness: 0.42 }),
    // roda preta brilhante
    wheel: () => new THREE.MeshPhysicalMaterial({ color: "#0d0d10", metalness: 0.6, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    cast: () => new THREE.MeshStandardMaterial({ color: "#8f939a", metalness: 0.85, roughness: 0.55, roughnessMap: castNoise, bumpMap: castNoise, bumpScale: 0.6 }),
    black: () => new THREE.MeshStandardMaterial({ color: "#0e0e11", metalness: 0.1, roughness: 0.6 }),
    // silencioso pintado de preto, já marcado pelo calor
    muffler: () => new THREE.MeshStandardMaterial({ color: "#1a1a1d", metalness: 0.3, roughness: 0.8, bumpMap: castNoise, bumpScale: 0.4 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: tireT.map, bumpMap: tireT.bumpMap, bumpScale: 2, metalness: 0, roughness: 0.92, envMapIntensity: 0.5 }),
    foam: () => new THREE.MeshStandardMaterial({ color: "#141417", metalness: 0, roughness: 0.95, bumpMap: castNoise, bumpScale: 1.5 }),
    pad: () => new THREE.MeshStandardMaterial({ color: "#4b4d53", metalness: 0, roughness: 0.75, normalMap: fabric, normalScale: new THREE.Vector2(0.4, 0.4) }),
    orange: () => new THREE.MeshPhysicalMaterial({ color: "#ff7a00", metalness: 0.2, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    gripOrange: () => new THREE.MeshStandardMaterial({ color: "#ff7a00", metalness: 0, roughness: 0.75 }),
    gold: () => new THREE.MeshStandardMaterial({ color: "#c79a3a", metalness: 1, roughness: 0.3 }),
    white: () => new THREE.MeshPhysicalMaterial({ color: "#f1f1f1", metalness: 0, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    // tubos do chassi pintados de preto fosco
    frame: () => new THREE.MeshPhysicalMaterial({ color: "#141417", metalness: 0.25, roughness: 0.58, clearcoat: 0.15, clearcoatRoughness: 0.5 }),
    exhaust: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: heatTint, metalness: 1, roughness: 0.28 }),
    disc: () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: discMap, metalness: 0.95, roughness: 0.42 }),
    visor: () => new THREE.MeshPhysicalMaterial({ color: "#050507", metalness: 0.6, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0 }),
    seat: () => new THREE.MeshStandardMaterial({ color: "#1b1b20", metalness: 0, roughness: 0.85, normalMap: fabric, normalScale: new THREE.Vector2(0.5, 0.5) }),
    suit: () => new THREE.MeshStandardMaterial({ color: "#16161a", metalness: 0, roughness: 0.8, normalMap: fabric, normalScale: new THREE.Vector2(0.4, 0.4) }),
    strap: () => new THREE.MeshStandardMaterial({ color: "#141417", metalness: 0, roughness: 0.75, normalMap: fabric, normalScale: new THREE.Vector2(0.6, 0.6) }),
    red: () => new THREE.MeshPhysicalMaterial({ color: "#d4140c", metalness: 0, roughness: 0.25, clearcoat: 1 }),
    lamp: () => new THREE.MeshStandardMaterial({ color: "#3a0402", emissive: "#ff1a0a", emissiveIntensity: 0, roughness: 0.2 }),
    plate: () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5, metalness: 0 }),
  };
  const matCache = {};
  function M(sub, key) {
    const id = sub + ":" + key;
    if (!matCache[id]) {
      const m = base[key]();
      m.userData.sub = sub;
      m.userData.key = key;
      m.userData.baseGlow = 0;
      matCache[id] = m;
      (registry[sub] ||= new Set()).add(m);
    }
    return matCache[id];
  }
  const labelMat = (texture) => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0, side: THREE.DoubleSide });

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
    MH_lo: V(-0.28, 0.08, 0.33), MH_mid: V(-0.285, 0.36, 0.33), MH_sh: V(-0.29, 0.72, 0.305), MH_top: V(-0.3, 0.97, 0.19),
    R1_lo: V(-0.72, 0.1, 0.26), R1_hi: V(-0.72, 0.52, 0.22),
    R2_lo: V(-1.0, 0.12, 0.2), R2_hi: V(-1.0, 0.44, 0.18),
  };
  // o arco principal é um tubo curvado à parte (ver abaixo)
  const side = [
    ["FB_lo", "F2_lo"], ["F2_lo", "FH_lo"], ["FH_lo", "C_lo"], ["C_lo", "MH_lo"], ["MH_lo", "R1_lo"], ["R1_lo", "R2_lo"],
    ["FB_hi", "F2_hi"], ["F2_hi", "FH_mid"], ["FH_mid", "C_mid"], ["C_mid", "MH_mid"], ["MH_mid", "R1_hi"], ["R1_hi", "R2_hi"],
    ["FB_lo", "FB_hi"], ["F2_lo", "F2_hi"], ["FH_lo", "FH_mid"], ["FH_mid", "FH_top"], ["C_lo", "C_mid"],
    ["R1_lo", "R1_hi"], ["R2_lo", "R2_hi"],
    ["FB_lo", "F2_hi"], ["F2_lo", "FH_mid"], ["FH_lo", "C_mid"], ["C_lo", "MH_mid"], ["MH_lo", "R1_hi"], ["R1_lo", "R2_hi"],
    ["FH_top", "F2_hi"], ["MH_top", "R1_hi"], ["FH_mid", "C_lo"],
  ];
  const cross = ["FB_lo", "FB_hi", "F2_lo", "F2_hi", "FH_lo", "FH_top", "MH_lo", "MH_sh", "R1_lo", "R1_hi", "R2_lo", "R2_hi"];
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
  const nodeGeo = new THREE.SphereGeometry(0.018, 10, 8);
  const nodeList = Object.values(N).flatMap((v) => [v, mir(v)]);
  const nodes = new THREE.InstancedMesh(nodeGeo, frameMat, nodeList.length);
  nodeList.forEach((v, i) => { dummy.position.copy(v); dummy.scale.setScalar(1); dummy.quaternion.identity(); dummy.updateMatrix(); nodes.setMatrixAt(i, dummy.matrix); });
  frame.add(nodes);
  // arco principal: um tubo só, dobrado em U, como no carro
  {
    const half = [V(-0.28, 0.08, 0.33), V(-0.285, 0.36, 0.33), V(-0.29, 0.72, 0.305), V(-0.297, 0.9, 0.27), V(-0.303, 1.0, 0.19), V(-0.307, 1.045, 0.09)];
    const pts = [...half, V(-0.308, 1.055, 0), ...half.slice().reverse().map(mir)];
    const hoop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 160, 0.015, 14), frameMat);
    hoop.castShadow = true;
    frame.add(hoop);
    // espumas de proteção nas pernas do arco e encosto de cabeça
    for (const s of [1, -1]) {
      const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 20), M("chassi", "foam"));
      foam.position.set(-0.293, 0.83, 0.29 * s);
      foam.rotation.x = -0.15 * s;
      frame.add(foam);
    }
    frame.add(tube(V(-0.3, 0.86, 0.26), V(-0.3, 0.86, -0.26), 0.01, frameMat));
    const headrest = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.1, 0.18, 0.2, 3, 0.03), M("chassi", "pad"));
    headrest.position.set(-0.25, 0.83, 0);
    frame.add(headrest);
  }
  const att = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.16), M("chassi", "white"));
  att.position.set(1.17, 0.23, 0);
  frame.add(att);
  const floorPan = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.008, 0.56), M("chassi", "black"));
  floorPan.position.set(0.4, 0.07, 0);
  frame.add(floorPan);
  const firewall = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.6, 0.62), M("chassi", "black"));
  firewall.position.set(-0.3, 0.38, 0);
  frame.add(firewall);
  // botões de desligamento, dos dois lados do arco principal
  for (const s of [1, -1]) {
    const baseB = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), M("chassi", "orange"));
    baseB.rotation.x = Math.PI / 2;
    baseB.position.set(-0.29, 0.62, 0.31 * s);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("chassi", "red"));
    knob.rotation.x = (Math.PI / 2) * s;
    knob.position.set(-0.29, 0.62, 0.322 * s);
    frame.add(baseB, knob);
  }

  /* ================= CARENAGEM ================= */
  const body = G("carenagem");
  const paintMat = M("carenagem", "paint");
  // painéis mais retos que o normal (superelipse de expoente alto), como a carenagem do TR-04
  const NB = 6;
  const bodyStations = [
    { x: 1.27, w: 0.12, yb: 0.13, yt: 0.33 },
    { x: 1.2, w: 0.17, yb: 0.09, yt: 0.4 },
    { x: 1.02, w: 0.215, yb: 0.07, yt: 0.46 },
    { x: 0.82, w: 0.255, yb: 0.06, yt: 0.51 },
    { x: 0.62, w: 0.3, yb: 0.06, yt: 0.55 },
    { x: 0.45, w: 0.34, yb: 0.06, yt: 0.58 },
    { x: 0.2, w: 0.36, yb: 0.06, yt: 0.56 },
    { x: -0.05, w: 0.365, yb: 0.06, yt: 0.55 },
    { x: -0.22, w: 0.36, yb: 0.06, yt: 0.58 },
    { x: -0.3, w: 0.355, yb: 0.06, yt: 0.6 },
  ];
  const RIM = 0.46, CK_A = -0.24, CK_B = 0.5;
  const bodyGeo = loftGeometry(bodyStations, {
    per: 14, seg: 120, n: NB, nb: NB,
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
      const a = Math.asin(Math.pow(q, NB / 2));
      return V(s.x, RIM, sgn * s.w * sgnPow(Math.cos(a), 2 / NB));
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
    body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.014, 8, true), M("carenagem", "black")));
  }
  // wireframe (modo raio-x)
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(loftGeometry(bodyStations, { per: 3, seg: 36, n: NB, nb: NB, skip: (x, y) => x > CK_A && x < CK_B && y > RIM, capStart: false, capEnd: false })),
    new THREE.LineBasicMaterial({ color: "#ff9a3d", transparent: true, opacity: 0, depthWrite: false })
  );
  body.add(wire);

  /* ================= COCKPIT E PILOTO ================= */
  const cockpit = G("cockpit");
  const seatBack = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.06, 0.52, 0.42, 3, 0.025), M("cockpit", "seat"));
  seatBack.position.set(-0.13, 0.33, 0);
  seatBack.rotation.z = 28 * DEG;
  const seatBase = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.42, 0.05, 0.4, 3, 0.02), M("cockpit", "seat"));
  seatBase.position.set(0.12, 0.1, 0);
  cockpit.add(seatBack, seatBase);
  // volante redondo com empunhadura laranja (como no carro)
  const wheelG = new THREE.Group();
  wheelG.position.set(0.34, 0.5, 0);
  wheelG.rotation.z = 18 * DEG;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.017, 14, 56), M("cockpit", "gripOrange"));
  ring.rotation.y = Math.PI / 2;
  const hubW = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 20), M("cockpit", "black"));
  hubW.rotation.z = Math.PI / 2;
  wheelG.add(ring, hubW);
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
    wheelG.add(tube(V(0, 0, 0), V(0, Math.sin(a) * 0.12, Math.cos(a) * 0.12), 0.008, M("cockpit", "black")));
  }
  cockpit.add(wheelG);
  cockpit.add(tube(V(0.36, 0.49, 0), V(0.72, 0.28, 0), 0.012, M("cockpit", "steel")));
  groups.steeringWheel = wheelG;
  // cinto de 5 pontos preto com as etiquetas vermelhas
  const strapMat = M("cockpit", "strap");
  const strap = (a, b, w = 0.045) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), strapMat);
    _d.subVectors(b, a);
    const len = _d.length();
    m.position.copy(a).addScaledVector(_d, 0.5);
    m.quaternion.setFromUnitVectors(Y, _d.clone().normalize());
    m.scale.set(w, len, 0.004);
    return m;
  };
  for (const s of [1, -1]) {
    cockpit.add(strap(V(-0.29, 0.72, 0.09 * s), V(-0.1, 0.63, 0.1 * s)));
    cockpit.add(strap(V(-0.1, 0.63, 0.1 * s), V(0.06, 0.3, 0.08 * s)));
    cockpit.add(strap(V(-0.02, 0.1, 0.19 * s), V(0.07, 0.28, 0.06 * s), 0.05));
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.03), M("cockpit", "red"));
    tab.position.set(-0.03, 0.47, 0.095 * s);
    tab.rotation.z = 0.9;
    cockpit.add(tab);
  }

  const driver = G("piloto");
  const suit = M("piloto", "suit");
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 8, 16), suit);
  torso.position.set(-0.06, 0.42, 0);
  torso.rotation.z = 28 * DEG;
  torso.scale.set(0.85, 1, 1.25);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.125, 48, 32), M("piloto", "white"));
  helmet.position.set(-0.13, 0.77, 0);
  helmet.scale.set(1.08, 1, 0.94);
  helmet.castShadow = true;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.1268, 40, 18, Math.PI - 0.95, 1.9, 1.2, 0.5), M("piloto", "visor"));
  visor.position.copy(helmet.position);
  visor.scale.copy(helmet.scale);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.127, 0.012, 10, 64, Math.PI), M("piloto", "orange"));
  stripe.position.copy(helmet.position);
  stripe.scale.copy(helmet.scale);
  const hans = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 10, 32, Math.PI * 1.3), M("piloto", "black"));
  hans.position.set(-0.14, 0.64, 0);
  hans.rotation.set(Math.PI / 2, 0, Math.PI * 0.35);
  driver.add(torso, helmet, visor, stripe, hans);
  for (const s of [1, -1]) {
    const sh = V(-0.08, 0.58, 0.17 * s), el = V(0.12, 0.47, 0.2 * s), hand = V(0.33, 0.52, 0.12 * s);
    driver.add(tube(sh, el, 0.042, suit), tube(el, hand, 0.034, suit));
    for (const [p, r] of [[sh, 0.05], [el, 0.04]]) {
      const j = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), suit);
      j.position.copy(p);
      driver.add(j);
    }
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), M("piloto", "black"));
    glove.position.copy(hand);
    glove.scale.set(1, 1.2, 1);
    driver.add(glove);
  }

  /* ================= POWERTRAIN ================= */
  const pt = G("powertrain");
  const block = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.3, 0.3, 0.42, 4, 0.03), M("powertrain", "cast"));
  block.position.set(-0.5, 0.3, 0);
  block.castShadow = true;
  const head = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.22, 0.13, 0.38, 4, 0.02), M("powertrain", "cast"));
  head.position.set(-0.48, 0.51, 0);
  const cover = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.2, 0.05, 0.34, 3, 0.018), M("powertrain", "black"));
  cover.position.set(-0.47, 0.6, 0);
  const sump = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.24, 0.07, 0.3, 3, 0.015), M("powertrain", "cast"));
  sump.position.set(-0.52, 0.14, 0);
  pt.add(block, head, cover, sump);
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.006, 0.43), M("powertrain", "cast"));
    fin.position.set(-0.5, 0.2 + i * 0.04, 0);
    pt.add(fin);
  }
  // radiador exposto na lateral direita, logo atrás do cockpit
  const radiator = new THREE.Group();
  radiator.position.set(-0.36, 0.33, 0.43);
  radiator.rotation.y = -0.35;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.24), M("powertrain", "black"));
  const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.29), new THREE.MeshStandardMaterial({ map: gridTexture("#161618", "#34363c"), roughness: 0.7, metalness: 0.5 }));
  grill.position.x = 0.031;
  grill.rotation.y = Math.PI / 2;
  const tankR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.25), M("powertrain", "black"));
  tankR.position.y = 0.165;
  radiator.add(core, grill, tankR);
  pt.add(radiator);
  const hose = new THREE.CatmullRomCurve3([V(-0.45, 0.46, 0.2), V(-0.4, 0.44, 0.33), V(-0.37, 0.46, 0.42)]);
  pt.add(new THREE.Mesh(new THREE.TubeGeometry(hose, 20, 0.016, 8), M("powertrain", "black")));
  groups.engineShake = pt;

  /* admissão: filtro -> restritor -> plenum arredondado -> dutos */
  const intake = G("admissao");
  const plenum = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 28), M("admissao", "black"));
  plenum.scale.set(1.15, 0.72, 1.05);
  plenum.position.set(-0.62, 0.7, 0);
  intake.add(plenum);
  for (const s of [1, -1]) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 28), M("admissao", "black"));
    can.position.set(-0.5, 0.72, 0.21 * s);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.012, 28), M("admissao", "steel"));
    lid.position.set(-0.5, 0.79, 0.21 * s);
    intake.add(can, lid);
  }
  for (let i = 0; i < 4; i++) {
    const z = -0.135 + i * 0.09;
    intake.add(tube(V(-0.58, 0.66, z * 0.8), V(-0.45, 0.56, z), 0.019, M("admissao", "black")));
  }
  const throttle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 18), M("admissao", "alu"));
  throttle.rotation.x = Math.PI / 2;
  throttle.position.set(-0.64, 0.66, -0.2);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 24), M("admissao", "black"));
  filter.rotation.x = Math.PI / 2;
  filter.position.set(-0.64, 0.66, -0.29);
  intake.add(throttle, filter);
  // plaqueta "TR-04" acima do motor, virada para trás
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.075), labelMat(labelTexture(carName)));
  tag.position.set(-0.72, 0.86, 0);
  tag.rotation.set(0, -Math.PI / 2, 0.35);
  intake.add(tag);

  /* escape: 4 coletores -> silencioso preto grande com ponteira cromada */
  const exhaust = G("escape");
  const exMat = M("escape", "exhaust");
  for (let i = 0; i < 4; i++) {
    const z = -0.14 + i * 0.093;
    const c = new THREE.CatmullRomCurve3([
      V(-0.6, 0.49, z), V(-0.66, 0.44, z * 0.9 - 0.02), V(-0.68, 0.38, z * 0.5 - 0.14), V(-0.66, 0.4, -0.3), V(-0.68, 0.42, -0.34),
    ]);
    exhaust.add(new THREE.Mesh(new THREE.TubeGeometry(c, 32, 0.017, 10), exMat));
  }
  const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 32), M("escape", "muffler"));
  muffler.rotation.z = Math.PI / 2;
  muffler.position.set(-0.93, 0.44, -0.36);
  const capF = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("escape", "muffler"));
  capF.rotation.z = -Math.PI / 2;
  capF.scale.set(1, 0.35, 1);
  capF.position.set(-0.68, 0.44, -0.36);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.13, 24, 1, true), M("escape", "chrome"));
  tip.rotation.set(0, 0.35, Math.PI / 2 + 0.1);
  tip.position.set(-1.22, 0.45, -0.39);
  exhaust.add(muffler, capF, tip);
  exhaust.userData.explode.set(-0.4, 0.1, -0.6);

  /* transmissão: pinhão, corrente central, coroa, diferencial e semieixos */
  const trans = G("transmissao");
  const diff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 28), M("transmissao", "dark"));
  diff.rotation.x = Math.PI / 2;
  diff.position.set(-0.76, 0.24, 0.06);
  const sprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 36), M("transmissao", "steel"));
  sprocket.rotation.x = Math.PI / 2;
  sprocket.position.set(-0.76, 0.24, -0.04);
  const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 18), M("transmissao", "steel"));
  pinion.rotation.x = Math.PI / 2;
  pinion.position.set(-0.42, 0.18, -0.04);
  trans.add(diff, sprocket, pinion);
  {
    const a = V(-0.42, 0.18, -0.04), b = V(-0.76, 0.24, -0.04);
    const pts = [];
    const ra = 0.04, rb = 0.105;
    for (let i = 0; i < 24; i++) { const t = -Math.PI / 2 + (i / 23) * Math.PI; pts.push(V(a.x + ra * Math.cos(t), a.y + ra * Math.sin(t), a.z)); }
    for (let i = 0; i < 36; i++) { const t = Math.PI / 2 + (i / 35) * Math.PI; pts.push(V(b.x + rb * Math.cos(t), b.y + rb * Math.sin(t), b.z)); }
    trans.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.006, 6, true), M("transmissao", "black")));
    // protetor da corrente em volta da coroa
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 40, 1, true, Math.PI * 0.55, Math.PI * 0.95), M("transmissao", "black"));
    guard.material.side = THREE.DoubleSide;
    guard.rotation.x = Math.PI / 2;
    guard.position.copy(b);
    trans.add(guard);
  }
  // luz de freio no centro da traseira
  const lampMat = M("transmissao", "lamp");
  const brakeLight = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.03, 0.05, 0.16, 2, 0.01), lampMat);
  brakeLight.position.set(-1.0, 0.47, 0);
  trans.add(brakeLight);
  trans.userData.explode.set(-0.25, -0.02, 0);
  groups.sprocket = sprocket;

  /* ================= AERODINÂMICA: asa traseira de 2 elementos ================= */
  const aeroRear = G("asaTraseira");
  const SPAN = 1.32;
  const camoMat = M("aero", "camo");
  const blackA = M("aero", "black");
  // elemento com adesivo na face de cima e (opcional) outra na de baixo
  const element = (center, chord, thick, aoaDeg, topMat, bottomMat) => {
    const pivot = new THREE.Group();
    pivot.position.copy(center);
    pivot.rotation.z = -aoaDeg * DEG; // bordo de fuga para cima
    // largura = envergadura; girado 90° para o eixo u da textura correr ao longo da asa
    const mats = [blackA, blackA, topMat, bottomMat || blackA, blackA, blackA];
    const m = new THREE.Mesh(new THREE.BoxGeometry(SPAN, thick, chord), mats);
    m.rotation.y = Math.PI / 2;
    m.castShadow = true;
    pivot.add(m);
    return pivot;
  };
  aeroRear.add(element(V(-0.8, 0.95, 0), 0.56, 0.035, 5, camoMat));
  aeroRear.add(element(V(-1.17, 1.1, 0), 0.3, 0.03, 55, M("aero", "wingFront"), M("aero", "wingBack")));
  const plateNum = numberPlateTexture(carNumber);
  for (const s of [1, -1]) {
    const ep = plate([[-0.48, 0.74], [-1.36, 0.74], [-1.4, 0.82], [-1.4, 1.36], [-1.08, 1.36], [-0.5, 1.02]], 0.01, (SPAN / 2 + 0.005) * s, camoMat);
    aeroRear.add(ep);
    // placa com o número, na face de fora da placa lateral
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.28), labelMat(plateNum));
    num.position.set(-1.2, 0.98, (SPAN / 2 + 0.013) * s);
    if (s < 0) num.rotation.y = Math.PI;
    aeroRear.add(num);
    // suportes: dois tirantes até a traseira do chassi e uma chapa triangular até o arco principal
    aeroRear.add(tube(V(-0.95, 0.94, 0.3 * s), V(-1.0, 0.44, 0.18 * s), 0.011, blackA));
    aeroRear.add(tube(V(-0.72, 0.52, 0.22 * s), V(-0.95, 0.94, 0.3 * s), 0.009, blackA));
    aeroRear.add(plate([[-0.3, 0.96], [-0.62, 0.99], [-0.36, 0.75]], 0.006, 0.23 * s, blackA));
  }
  aeroRear.userData.explode.set(-0.85, 0.55, 0);

  /* ================= AERODINÂMICA: asa dianteira de 3 elementos ================= */
  // (não aparece nas fotos porque estava fora do carro para ajustes)
  const aeroFront = G("asaDianteira");
  const FSPAN = 1.4;
  const frontElement = (center, chord, thick, aoaDeg, span, zc) => {
    const pivot = new THREE.Group();
    pivot.position.set(center.x, center.y, zc);
    pivot.rotation.z = -aoaDeg * DEG; // bordo de fuga (para trás) mais alto que o de ataque
    const m = new THREE.Mesh(new THREE.BoxGeometry(span, thick, chord), [blackA, blackA, M("aero", "camoSpan"), blackA, blackA, blackA]);
    m.rotation.y = Math.PI / 2;
    m.castShadow = true;
    pivot.add(m);
    return pivot;
  };
  // plano principal inteiro, passando por baixo do bico
  aeroFront.add(frontElement(V(1.38, 0.058), 0.38, 0.03, 3, FSPAN, 0));
  // flaps só por fora do bico, um par de cada lado
  const FIN = 0.2, FOUT = FSPAN / 2;
  for (const s of [1, -1]) {
    const zc = ((FIN + FOUT) / 2) * s, span = FOUT - FIN;
    aeroFront.add(frontElement(V(1.24, 0.125), 0.2, 0.024, 24, span, zc));
    aeroFront.add(frontElement(V(1.155, 0.205), 0.12, 0.02, 44, span, zc));
    // placa lateral
    aeroFront.add(plate([[1.13, 0.03], [1.62, 0.03], [1.64, 0.07], [1.5, 0.15], [1.28, 0.29], [1.13, 0.29]], 0.01, (FOUT + 0.005) * s, camoMat));
    // pilones entre o plano principal e o bico
    aeroFront.add(plate([[1.2, 0.07], [1.34, 0.07], [1.27, 0.14], [1.2, 0.12]], 0.008, 0.08 * s, blackA));
    // pequena chapa (gurney) no fim do último flap
    aeroFront.add(tube(V(1.11, 0.25, FIN * s), V(1.11, 0.25, FOUT * s), 0.004, blackA));
  }
  aeroFront.userData.explode.set(0.5, 0.12, 0);

  /* ================= SUSPENSÃO, RODAS E FREIOS ================= */
  const R = 0.28; // pneu de rua 175/65 R14
  const corners = [];
  const tireGeo = (() => {
    const pts = [];
    const rc = 0.229, hr = 0.051, hw = 0.088, n = 5;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector2(rc + hr * sgnPow(Math.cos(a), 2 / n), hw * sgnPow(Math.sin(a), 2 / n)));
    }
    const g = new THREE.LatheGeometry(pts, 112);
    g.rotateX(Math.PI / 2);
    return g;
  })();
  // roda de 14" preta: perfil com flanges
  const barrelGeo = (() => {
    const p = [[0.182, -0.09], [0.186, -0.084], [0.178, -0.078], [0.176, -0.055], [0.155, -0.03], [0.152, 0.02], [0.172, 0.045], [0.176, 0.078], [0.186, 0.084], [0.183, 0.09]];
    const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 96);
    g.rotateX(Math.PI / 2);
    return g;
  })();
  const spokeGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(0.05, -0.009);
    s.lineTo(0.172, -0.006);
    s.lineTo(0.172, 0.006);
    s.lineTo(0.05, 0.009);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 });
    g.translate(0, 0, -0.006);
    return g;
  })();
  const discGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.009, 64).rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.055, 0.058, 0.05, 32).rotateX(Math.PI / 2);
  const lugGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.02, 6).rotateX(Math.PI / 2);
  const rodEndGeo = new THREE.SphereGeometry(0.014, 16, 12);
  const Rs = R - 0.255; // diferença de altura em relação às rodas originais

  const cornerSpecs = [
    { name: "FR", front: true, s: 1, c: V(0.8, R, 0.62), uo: V(0.8, 0.37 + Rs, 0.53), lo: V(0.8, 0.13 + Rs, 0.55), ui: [V(0.95, 0.36, 0.17), V(0.62, 0.37, 0.25)], li: [V(0.95, 0.12, 0.16), V(0.62, 0.1, 0.25)], dTop: V(0.78, 0.47, 0.24), steerIn: V(0.7, 0.2, 0.2), steerOut: V(0.7, 0.22 + Rs, 0.53) },
    { name: "RR", front: false, s: 1, c: V(-0.76, R, 0.6), uo: V(-0.76, 0.37 + Rs, 0.51), lo: V(-0.76, 0.13 + Rs, 0.53), ui: [V(-0.6, 0.4, 0.23), V(-0.93, 0.38, 0.19)], li: [V(-0.6, 0.11, 0.26), V(-0.93, 0.12, 0.2)], dTop: V(-0.8, 0.53, 0.24), steerIn: V(-0.88, 0.22, 0.2), steerOut: V(-0.88, 0.24 + Rs, 0.51) },
  ];
  const specs = [];
  for (const sp of cornerSpecs) {
    specs.push(sp);
    const m = (v) => V(v.x, v.y, -v.z);
    specs.push({ ...sp, name: sp.name[0] + "L", s: -1, c: m(sp.c), uo: m(sp.uo), lo: m(sp.lo), ui: sp.ui.map(m), li: sp.li.map(m), dTop: m(sp.dTop), steerIn: m(sp.steerIn), steerOut: m(sp.steerOut) });
  }

  const suspMat = M("suspensao", "frame");
  const suspDark = M("suspensao", "dark");
  const springMat = M("suspensao", "black");
  // amortecedor coilover de ação direta: corpo, haste, mola preta e reservatório
  const damperL0 = 0.36;
  function makeDamper() {
    const g = new THREE.Group();
    const bodyD = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, damperL0 * 0.55, 16), suspDark);
    bodyD.position.y = damperL0 * 0.7;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, damperL0 * 0.5, 8), M("suspensao", "chrome"));
    rod.position.y = damperL0 * 0.25;
    const helix = [];
    for (let i = 0; i <= 160; i++) { const t = i / 160; const a = t * Math.PI * 2 * 7; helix.push(V(Math.cos(a) * 0.029, 0.08 * damperL0 + t * damperL0 * 0.72, Math.sin(a) * 0.029)); }
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 320, 0.0055, 6), springMat);
    const res = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 14), M("suspensao", "gold"));
    res.position.set(0.03, damperL0 * 0.8, 0);
    g.add(bodyD, rod, spring, res);
    return g;
  }
  function setDamper(g, a, b) {
    _d.subVectors(b, a);
    const len = _d.length();
    g.position.copy(a);
    g.quaternion.setFromUnitVectors(Y, _d.divideScalar(len));
    g.scale.set(1, len / damperL0, 1);
  }

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
    const tire = new THREE.Mesh(tireGeo, M("rodas", "rubber"));
    tire.castShadow = true;
    const barrel = new THREE.Mesh(barrelGeo, M("rodas", "wheel"));
    barrel.castShadow = true;
    const hubM = new THREE.Mesh(hubGeo, M("rodas", "wheel"));
    hubM.position.z = 0.04;
    spin.add(tire, barrel, hubM);
    // 4 porcas de roda de rua
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const lug = new THREE.Mesh(lugGeo, M("rodas", "steel"));
      lug.position.set(Math.cos(a) * 0.034, Math.sin(a) * 0.034, 0.07);
      spin.add(lug);
    }
    // raios finos
    for (let k = 0; k < 14; k++) {
      const sk = new THREE.Mesh(spokeGeo, M("rodas", "wheel"));
      sk.rotation.z = (k / 14) * Math.PI * 2;
      sk.position.z = 0.05;
      sk.castShadow = true;
      spin.add(sk);
    }
    const disc = new THREE.Mesh(discGeo, M("freios", "disc"));
    disc.position.z = -0.035;
    spin.add(disc);
    const caliper = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.07, 0.05, 0.04, 2, 0.01), M("freios", "dark"));
    caliper.position.set(-0.07, 0.07, -0.035);
    caliper.rotation.z = 0.8;
    mount.add(caliper);
    const upright = tube(sp.uo.clone().sub(sp.c), sp.lo.clone().sub(sp.c), 0.022, suspDark);
    hub.add(upright);

    const arms = [0, 1, 2, 3].map(() => g.add(tube(V(), V(0, 1, 0), 0.0095, suspMat)).children.at(-1));
    for (const p of [...sp.ui, ...sp.li]) {
      const re = new THREE.Mesh(rodEndGeo, M("suspensao", "steel"));
      re.position.copy(p);
      g.add(re);
    }
    const reU = new THREE.Mesh(rodEndGeo, M("suspensao", "steel")), reL = new THREE.Mesh(rodEndGeo, M("suspensao", "steel"));
    g.add(reU, reL);
    const link = tube(V(), V(0, 1, 0), 0.008, M("suspensao", "steel"));
    g.add(link);
    let shaft = null;
    if (!sp.front) {
      shaft = tube(V(), V(0, 1, 0), 0.016, M("transmissao", "steel"));
      g.add(shaft);
      // coifas das juntas homocinéticas
      for (const f of [0.18, 0.86]) {
        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.07, 16), M("transmissao", "black"));
        boot.userData.f = f;
        g.add(boot);
      }
    }
    const damper = makeDamper();
    g.add(damper);

    const corner = {
      sp, group: g, hub, spin, arms, link, shaft, damper, disc,
      update(heave, steer) {
        const off = V(0, heave, 0);
        const rot = (p) => p.clone().sub(sp.c).applyAxisAngle(Y, sp.front ? steer : 0).add(sp.c).add(off);
        hub.position.copy(sp.c).add(off);
        hub.rotation.y = sp.front ? steer : 0;
        const uo = rot(sp.uo), lo = rot(sp.lo);
        reU.position.copy(uo);
        reL.position.copy(lo);
        setTube(arms[0], sp.ui[0], uo);
        setTube(arms[1], sp.ui[1], uo);
        setTube(arms[2], sp.li[0], lo);
        setTube(arms[3], sp.li[1], lo);
        setTube(link, sp.steerIn.clone().add(V(0, 0, sp.front ? steer * 0.09 : 0)), rot(sp.steerOut));
        // coilover: da bandeja inferior (perto da manga) até o chassi
        const liMid = sp.li[0].clone().add(sp.li[1]).multiplyScalar(0.5);
        const dLow = liMid.lerp(lo, 0.72).add(V(0, 0.025, 0));
        setDamper(damper, dLow, sp.dTop);
        if (shaft) {
          const inner = V(-0.76, 0.24, 0.12 * sp.s);
          setTube(shaft, inner, hub.position);
          g.children.filter((o) => o.userData.f).forEach((b) => {
            b.position.lerpVectors(inner, hub.position, b.userData.f);
            b.quaternion.copy(shaft.quaternion);
          });
        }
      },
    };
    corner.update(0, 0);
    corners.push(corner);
  }

  /* ================= PINTURA (canvas no loft) ================= */
  const liveryCanvas = document.createElement("canvas");
  liveryCanvas.width = 2048;
  liveryCanvas.height = 1024;
  const liveryTex = new THREE.CanvasTexture(liveryCanvas);
  liveryTex.colorSpace = THREE.SRGBColorSpace;
  liveryTex.anisotropy = 8;
  paintMat.map = liveryTex;

  let sponsorImg = null;
  let sponsorSlot = false;
  let paint = PAINTS.taurus;
  function drawLivery() {
    const W = liveryCanvas.width, H = liveryCanvas.height;
    const g = liveryCanvas.getContext("2d");
    g.fillStyle = paint.body;
    g.fillRect(0, 0, W, H);
    // painel inferior em tom diferente, com a divisa inclinada (como no carro)
    g.fillStyle = paint.accent;
    const lower = (flipY) => {
      g.beginPath();
      const Y = (v) => (flipY ? v * H : (1 - v) * H);
      g.moveTo(0, Y(0));
      g.lineTo(0, Y(0.2));
      g.lineTo(W * 0.3, Y(0.18));
      g.lineTo(W, Y(0.165));
      g.lineTo(W, Y(0));
      g.closePath();
      g.fill();
    };
    lower(false);
    lower(true);
    g.fillRect(0, (1 - 0.06) * H, W, 0.12 * H);
    // nome da equipe grande na lateral do cockpit; na prévia de patrocínio ele
    // vai para o bico e o espaço do cockpit fica para a marca do patrocinador
    const sp = sponsorImg || sponsorSlot;
    const K = 2.8, KN = 1.9; // correção de proporção na lateral do cockpit e no bico
    if (sp) {
      drawSideText(g, W, H, textDraw("TAURUS", paint.lettering, 800, KN), 0.08, 0.36, 0.27, 0.08);
      drawSideText(g, W, H, textDraw("RACING", paint.lettering, 800, KN), 0.12, 0.32, 0.215, 0.045);
    } else {
      drawSideText(g, W, H, textDraw("TAURUS", paint.lettering, 800, K), 0.44, 0.84, 0.238, 0.068);
      drawSideText(g, W, H, textDraw("RACING", paint.lettering, 800, K), 0.5, 0.78, 0.198, 0.032);
      drawSideText(g, W, H, textDraw("BOSCH", "#e2231a", 800, KN), 0.14, 0.36, 0.265, 0.05);
    }
    if (sponsorImg) drawSideText(g, W, H, imageDraw(sponsorImg, K), 0.46, 0.84, 0.235, 0.075);
    else if (sponsorSlot) drawSideText(g, W, H, textDraw("SUA MARCA AQUI", "rgba(255,255,255,0.55)", 700, K), 0.46, 0.84, 0.235, 0.04);
    liveryTex.needsUpdate = true;
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
    suspensao: { group: groups.cornerFR, p: V(0.8, 0.395, 0.44) },
    freios: { group: groups.cornerFR, p: V(0.8, 0.33, 0.53) },
    powertrain: { group: pt, p: V(-0.5, 0.42, 0.22) },
    admissao: { group: intake, p: V(-0.62, 0.78, 0.05) },
    escape: { group: exhaust, p: V(-0.95, 0.52, -0.4) },
    transmissao: { group: trans, p: V(-0.76, 0.3, -0.04) },
    aero: { group: aeroRear, p: V(-0.95, 1.05, 0.45) },
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
  const tmp = new THREE.Vector3();

  function apply(time = 0) {
    for (const g of Object.values(groups)) {
      if (!g.userData || !g.userData.explode) continue;
      g.position.copy(g.userData.explode).multiplyScalar(ease(state.explode));
    }
    for (const c of corners) {
      c.update(state.heave * (c.sp.front ? 1 : 0.9), state.steer);
      c.spin.rotation.z = -state.spin * c.sp.s;
    }
    groups.steeringWheel.rotation.x = -state.steer * 5;
    groups.sprocket.rotation.z = -state.spin;
    // raio-x: a carenagem e a asa ficam translúcidas, o chassi brilha
    const xr = state.xray;
    paintMat.transparent = xr > 0.001;
    paintMat.opacity = 1 - 0.9 * xr;
    paintMat.depthWrite = xr < 0.5;
    wire.material.opacity = 0.55 * xr;
    for (const m of registry.aero) {
      m.transparent = xr > 0.001;
      m.opacity = 1 - 0.6 * xr;
    }
    frameMat.userData.baseGlow = 1.6 * xr;
    exMat.userData.baseGlow = state.heat * 1.8;
    exMat.userData.glowColor = "heat";
    groups.engineShake.position.x = groups.powertrain.userData.explode.x * ease(state.explode) + (state.heat > 0.02 ? Math.sin(time * 90) * 0.0012 * (0.4 + state.heat) : 0);
    groups.engineShake.position.y = groups.powertrain.userData.explode.y * ease(state.explode) + (state.heat > 0.02 ? Math.cos(time * 77) * 0.0012 * (0.4 + state.heat) : 0);
    for (const m of registry.freios) if (m.userData.key === "disc") m.userData.baseGlow = state.brake * 2.2;
    groups.piloto.visible = state.driver > 0.02;
    groups.piloto.scale.setScalar(Math.max(0.001, state.driver));
    const pulse = 0.55 + 0.45 * Math.sin(time * 4);
    for (const [sub, set] of Object.entries(registry)) {
      let h = 0;
      for (const [k, amt] of Object.entries(state.highlight)) if ((subOf[k] || [k]).includes(sub)) h = Math.max(h, amt);
      for (const m of set) {
        if (!m.emissive) continue;
        if (m.userData.key === "lamp") {
          m.emissive.set("#ff1a0a");
          m.emissiveIntensity = 0.15 + state.brake * 6;
          continue;
        }
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
      paint = PAINTS[name] || PAINTS.taurus;
      paintMat.roughness = paint.matte ? 0.55 : 0.32;
      paintMat.clearcoat = paint.matte ? 0.35 : 1;
      paintMat.clearcoatRoughness = paint.matte ? 0.3 : 0.04;
      paintMat.metalness = name === "carbono" ? 0.4 : paint.matte ? 0.1 : 0.15;
      drawLivery();
    },
    setSponsor(img) {
      sponsorImg = img;
      drawLivery();
    },
    // mostra "SUA MARCA AQUI" na lateral (usado na prévia de patrocínio)
    setSponsorSlot(on) {
      if (sponsorSlot === on) return;
      sponsorSlot = on;
      drawLivery();
    },
    bodyProfile: bodyStations,
    dispose() {},
  };
}
