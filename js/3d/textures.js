/*
 * Texturas e ambiente gerados em código (nenhum arquivo de imagem externo).
 * Tudo é desenhado em canvas e convertido em texturas do Three.js.
 */
import * as THREE from "../../vendor/three.bundle.min.js";

function canvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function tex(c, { repeat = [1, 1], srgb = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// gerador pseudoaleatório determinístico (a textura sai igual toda vez)
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* converte um mapa de altura (Float32Array w×h) em mapa normal */
function heightToNormal(h, w, hh, strength = 2) {
  const c = canvas(w, hh);
  const g = c.getContext("2d");
  const img = g.createImageData(w, hh);
  const at = (x, y) => h[((y + hh) % hh) * w + ((x + w) % w)];
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return c;
}

/* ---------- fibra de carbono em sarja 2x2 ---------- */
export function carbonTextures(repeat = 10) {
  const N = 256, cells = 8, s = N / cells;
  const col = canvas(N), g = col.getContext("2d");
  const height = new Float32Array(N * N);
  const r = rng(7);
  for (let cy = 0; cy < cells; cy++)
    for (let cx = 0; cx < cells; cx++) {
      // sarja 2x2: a direção do cabo alterna em diagonal
      const horiz = ((cx + cy) >> 1) % 2 === 0;
      for (let y = 0; y < s; y++)
        for (let x = 0; x < s; x++) {
          const u = horiz ? y / s : x / s; // posição através do cabo
          const along = horiz ? x / s : y / s;
          const bump = Math.sin(u * Math.PI); // cabo arredondado
          const fiber = 0.5 + 0.5 * Math.sin((horiz ? y : x) * 2.1 + r() * 0.6);
          const hgt = bump * 0.8 + fiber * 0.08 + Math.sin(along * Math.PI) * 0.15;
          height[(cy * s + y) * N + (cx * s + x)] = hgt;
        }
    }
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = height[i];
    const c = 14 + v * 34;
    img.data[i * 4] = c;
    img.data[i * 4 + 1] = c;
    img.data[i * 4 + 2] = c + 4;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const normal = heightToNormal(height, N, N, 3);
  return {
    map: tex(col, { repeat: [repeat, repeat], srgb: true }),
    normalMap: tex(normal, { repeat: [repeat, repeat] }),
  };
}

/* ---------- microflocos da pintura metálica ---------- */
export function flakeNormal(repeat = 60) {
  const N = 128;
  const c = canvas(N), g = c.getContext("2d");
  const img = g.createImageData(N, N);
  const r = rng(3);
  for (let i = 0; i < N * N; i++) {
    const nx = (r() - 0.5) * 0.9, ny = (r() - 0.5) * 0.9;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    img.data[i * 4] = (nx * 0.5 + 0.5) * 255;
    img.data[i * 4 + 1] = (ny * 0.5 + 0.5) * 255;
    img.data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, { repeat: [repeat, repeat] });
  t.magFilter = THREE.NearestFilter;
  return t;
}

/* ---------- ruído suave (alumínio fundido, concreto) ---------- */
export function noiseTexture({ size = 256, base = 128, amp = 60, blobs = 900, seed = 11, repeat = 4, srgb = false } = {}) {
  const c = canvas(size), g = c.getContext("2d");
  g.fillStyle = `rgb(${base},${base},${base})`;
  g.fillRect(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < blobs; i++) {
    const x = r() * size, y = r() * size, rad = 1 + r() * (size / 40);
    const v = base + (r() - 0.5) * amp * 2;
    g.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},${0.25 + r() * 0.35})`;
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      g.beginPath();
      g.arc(x + ox, y + oy, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c, { repeat: [repeat, repeat], srgb });
}

/* ---------- coloração de calor do escape (ao longo do tubo) ---------- */
export function heatTintTexture() {
  const c = canvas(512, 16), g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 512, 0);
  // perto do cabeçote o aço fica azul e roxo; depois dourado; no fim volta ao aço
  grd.addColorStop(0.0, "#3a4a8c");
  grd.addColorStop(0.12, "#6b3f8e");
  grd.addColorStop(0.24, "#9a5a3a");
  grd.addColorStop(0.36, "#c9a15a");
  grd.addColorStop(0.55, "#b9b3a6");
  grd.addColorStop(1.0, "#c4c7cc");
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 16);
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------- flanco do pneu com letreiro ---------- */
export function tireTexture(label = "TAURUS RACING  ·  FÓRMULA SAE  ·  39  ·  SLICK  ·  ") {
  // 1 px na horizontal ≈ 1,3 mm da circunferência; na vertical ≈ 2 mm do perfil.
  // Por isso o texto é esticado 1,5× na horizontal para não sair espremido.
  const W = 1024, H = 256;
  const c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#1a1a1c";
  g.fillRect(0, 0, W, H);
  // leve variação (borracha)
  const r = rng(5);
  for (let i = 0; i < 4000; i++) {
    const v = 22 + r() * 10;
    g.fillStyle = `rgba(${v},${v},${v + 2},0.5)`;
    g.fillRect(r() * W, r() * H, 2, 2);
  }
  // letreiro no flanco externo (v ≈ 0.25 do perfil do pneu)
  const y = H * (1 - 0.25);
  g.font = `700 ${Math.round(H * 0.11)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  g.textBaseline = "middle";
  const stretch = 1.5;
  const unit = g.measureText(label).width * stretch;
  // repete o letreiro um número inteiro de vezes para fechar a volta sem emenda
  const reps = Math.max(1, Math.round(W / unit));
  const k = W / (reps * unit);
  g.save();
  // espelhado na horizontal: o u do torno cresce no sentido horário visto de fora
  g.translate(W, y);
  g.scale(-stretch * k, -1);
  g.fillStyle = "#e8e8ea";
  for (let i = 0; i < reps; i++) g.fillText(label, (i * unit) / stretch, 0);
  g.restore();
  // faixa laranja
  g.fillStyle = "#ff8000";
  g.fillRect(0, H * (1 - 0.195) - 3, W, 6);
  return tex(c, { srgb: true, aniso: 8 });
}

/* ---------- disco de freio furado ---------- */
export function discTexture() {
  const N = 512, c = canvas(N), g = c.getContext("2d");
  const cx = N / 2;
  const grd = g.createRadialGradient(cx, cx, N * 0.2, cx, cx, N * 0.5);
  grd.addColorStop(0, "#6d7178");
  grd.addColorStop(0.5, "#9aa0a8");
  grd.addColorStop(1, "#7d8189");
  g.fillStyle = grd;
  g.fillRect(0, 0, N, N);
  // marcas circulares de uso
  for (let rr = N * 0.3; rr < N * 0.5; rr += 2) {
    g.strokeStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    g.beginPath(); g.arc(cx, cx, rr, 0, Math.PI * 2); g.stroke();
  }
  // furos
  g.fillStyle = "#16171a";
  for (let k = 0; k < 3; k++)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + k * 0.12;
      const rad = N * (0.33 + k * 0.05);
      g.beginPath(); g.arc(cx + Math.cos(a) * rad, cx + Math.sin(a) * rad, N * 0.012, 0, Math.PI * 2); g.fill();
    }
  // flange central
  g.fillStyle = "#2b2d33";
  g.beginPath(); g.arc(cx, cx, N * 0.27, 0, Math.PI * 2); g.fill();
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------- tecido (banco e macacão) ---------- */
export function fabricNormal(repeat = 20) {
  const N = 64;
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) h[y * N + x] = (Math.sin(x * 0.8) * Math.sin(y * 0.8) + 1) * 0.5;
  return tex(heightToNormal(h, N, N, 1.2), { repeat: [repeat, repeat] });
}

/* ---------- piso de concreto polido ---------- */
export function floorTextures() {
  const N = 1024, c = canvas(N), g = c.getContext("2d");
  g.fillStyle = "#1b1c20";
  g.fillRect(0, 0, N, N);
  const r = rng(21);
  // manchas amplas e muito suaves + grão fino (concreto polido)
  for (let i = 0; i < 260; i++) {
    const x = r() * N, y = r() * N, s = 40 + r() * 140;
    const grd = g.createRadialGradient(x, y, 0, x, y, s);
    const v = 24 + r() * 10;
    grd.addColorStop(0, `rgba(${v},${v},${v + 3},0.18)`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - s, y - s, s * 2, s * 2);
  }
  const img = g.getImageData(0, 0, N, N);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 7;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // juntas de dilatação a cada 2 m (textura cobre 4 m)
  g.strokeStyle = "#0c0c0e";
  g.lineWidth = 3;
  for (const p of [0, N / 2]) {
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, N); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(N, p); g.stroke();
  }
  const map = tex(c, { repeat: [10, 10], srgb: true });
  const rough = noiseTexture({ size: 512, base: 170, amp: 30, blobs: 1800, seed: 9, repeat: 10 });
  return { map, roughnessMap: rough };
}

/*
 * Estúdio fotográfico para reflexos: sala escura com softbox grande no teto,
 * faixas de luz verticais nas laterais e uma faixa laranja atrás.
 * Renderizado uma vez num mapa de ambiente (PMREM).
 */
export function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060607");
  const light = (w, h, pos, rot, color, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
  };
  // teto: softbox principal e duas faixas longas (desenham os reflexos compridos na pintura)
  light(6, 3, [0, 6, 0], [Math.PI / 2, 0, 0], "#ffffff", 5);
  light(10, 0.5, [0, 5.8, 2.2], [Math.PI / 2, 0, 0], "#ffffff", 6);
  light(10, 0.5, [0, 5.8, -2.2], [Math.PI / 2, 0, 0], "#ffffff", 6);
  // laterais
  light(0.6, 4, [0, 2, 7], [0, 0, 0], "#ffffff", 3.5);
  light(0.6, 4, [3.5, 2, 6.5], [0, -0.4, 0], "#ffffff", 2.5);
  light(0.6, 4, [-3.5, 2, -6.5], [0, 0.4 + Math.PI, 0], "#ffffff", 2.5);
  // frente e fundo
  light(4, 2, [8, 2, 0], [0, -Math.PI / 2, 0], "#fff2e6", 1.6);
  light(8, 0.4, [-8, 1.2, 0], [0, Math.PI / 2, 0], "#ff8000", 5);
  // chão escuro levemente iluminado
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color("#141416") }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  return env;
}

/* ================= TR-04: texturas do carro real ================= */

/* camuflagem preta com manchas laranja e cinza (asa traseira do TR-04) */
function camoCanvas(W, H, seed = 13, density = 1) {
  const c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#141417";
  g.fillRect(0, 0, W, H);
  const r = rng(seed);
  const blob = (x, y, s, color) => {
    const n = 7 + Math.floor(r() * 5);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rad = s * (0.45 + r() * 0.75);
      pts.push([x + Math.cos(a) * rad * (1 + r() * 0.8), y + Math.sin(a) * rad * 0.6]);
    }
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) g.moveTo(mx, my);
      else g.quadraticCurveTo(p[0], p[1], mx, my);
    }
    const p0 = pts[0], p1 = pts[1];
    g.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    g.fill();
  };
  const count = Math.round(((W * H) / 9000) * density);
  for (let i = 0; i < count; i++) blob(r() * W, r() * H, 10 + r() * 26, r() < 0.62 ? "#ff7a00" : "#6f737b");
  return c;
}
export function camoTexture({ repeat = [1, 1], seed = 13 } = {}) {
  return tex(camoCanvas(512, 512, seed), { repeat, srgb: true });
}

/* painéis da asa: frente do flap (patrocinadores) e traseira (lema) */
export function wingPanelTextures() {
  const W = 2048, H = 512;
  const front = camoCanvas(W, H, 21, 0.8);
  const g = front.getContext("2d");
  g.textBaseline = "middle";
  const txt = (s, x, y, color, size, weight = 800) => {
    g.font = `${weight} ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillText(s, x + 4, y + 4);
    g.fillStyle = color;
    g.fillText(s, x, y);
  };
  // nomes dos patrocinadores como aparecem na asa do carro (só texto, sem logotipos)
  txt("COLÉGIO", 170, H / 2 - 95, "#f2f2f2", 70, 600);
  txt("SINAPSE", 150, H / 2 + 20, "#f2f2f2", 170, 800);
  txt("BOSCH", 880, H / 2, "#e2231a", 150, 800);
  txt("NANYA", 1330, H / 2, "#f2f2f2", 200, 800);
  const back = canvas(W, H), b = back.getContext("2d");
  b.fillStyle = "#121215";
  b.fillRect(0, 0, W, H);
  b.save();
  b.translate(W, H);
  b.scale(-1, -1); // a face de trás do flap fica girada 180° em relação à da frente
  b.fillStyle = "#e9e9ec";
  b.textAlign = "center";
  b.textBaseline = "middle";
  b.font = '800 150px "Barlow Condensed", "Arial Narrow", sans-serif';
  b.fillText("A VIDA SÓ É DURA PRA QUEM É MOLE", W / 2, H / 2);
  b.restore();
  return { front: tex(front, { srgb: true }), back: tex(back, { srgb: true }) };
}

/* placa branca com o número do carro */
export function numberPlateTexture(num) {
  const c = canvas(256, 360), g = c.getContext("2d");
  g.fillStyle = "#f4f4f4";
  g.beginPath();
  g.roundRect(4, 4, 248, 352, 18);
  g.fill();
  g.fillStyle = "#101012";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '700 250px "Barlow Condensed", "Arial Narrow", sans-serif';
  g.fillText(String(num), 128, 190);
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* plaqueta "TR-04" */
export function labelTexture(text, { w = 512, h = 160, bg = "#121215", fg = "#f2f2f2" } = {}) {
  const c = canvas(w, h), g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `800 ${Math.round(h * 0.62)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  g.fillText(text, w / 2, h / 2 + 4);
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* pneu de rua: banda com sulcos e lamelas + letreiro discreto no flanco */
export function roadTireTextures() {
  const W = 2048, H = 512;
  const col = canvas(W, H), g = col.getContext("2d");
  const bump = canvas(W, H), b = bump.getContext("2d");
  g.fillStyle = "#1a1a1d";
  g.fillRect(0, 0, W, H);
  b.fillStyle = "#808080";
  b.fillRect(0, 0, W, H);
  // a banda de rodagem fica em v ∈ [0, 0.1] e [0.9, 1] (o perfil começa no meio da banda)
  const band = (y0, y1) => {
    const ya = (1 - y1) * H, yb = (1 - y0) * H;
    // sulcos circunferenciais
    for (const f of [0.25, 0.75]) {
      const y = ya + (yb - ya) * f;
      g.fillStyle = "#0c0c0e"; g.fillRect(0, y - 4, W, 8);
      b.fillStyle = "#1a1a1a"; b.fillRect(0, y - 4, W, 8);
    }
    // lamelas transversais inclinadas
    for (let x = 0; x < W; x += 22) {
      g.strokeStyle = "#0f0f11"; b.strokeStyle = "#303030";
      g.lineWidth = b.lineWidth = 3;
      for (const ctx of [g, b]) {
        ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x + 10, ya + (yb - ya) * 0.22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 6, ya + (yb - ya) * 0.3); ctx.lineTo(x + 16, ya + (yb - ya) * 0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, ya + (yb - ya) * 0.78); ctx.lineTo(x + 10, yb); ctx.stroke();
      }
    }
  };
  band(0, 0.1);
  band(0.9, 1);
  // letreiro em relevo no flanco externo (v ≈ 0.25), preto sobre preto
  const label = "TOURING  ·  175/65 R14  ·  ";
  g.font = b.font = `700 ${Math.round(H * 0.06)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  const stretch = 1.5;
  const unit = g.measureText(label).width * stretch;
  const reps = Math.max(1, Math.round(W / unit));
  const k = W / (reps * unit);
  for (const [ctx, color] of [[g, "#2c2c31"], [b, "#b0b0b0"]]) {
    ctx.save();
    ctx.translate(W, H * (1 - 0.25));
    ctx.scale(-stretch * k, -1);
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    for (let i = 0; i < reps; i++) ctx.fillText(label, (i * unit) / stretch, 0);
    ctx.restore();
  }
  return { map: tex(col, { srgb: true }), bumpMap: tex(bump) };
}
