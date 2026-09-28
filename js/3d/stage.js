/*
 * Palco 3D do site. Um único renderizador WebGL que "pula" entre três lugares
 * da página conforme a rolagem:
 *   story   → abertura com rolagem guiada (o carro se desmonta)
 *   garage  → garagem interativa (girar, raio-x, explodir, ligar o motor)
 *   sponsor → prévia do logo do patrocinador no sidepod
 */
import * as THREE from "../../vendor/three.bundle.min.js";
import { buildCar } from "./car.js";
import { createAirflow } from "./airflow.js";
import { EngineAudio } from "./engine-audio.js";
import { PARTS, VIEWS } from "./parts.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* passos da abertura: câmera + estado do carro */
// shift: desloca o carro na horizontal (fração da largura) para abrir espaço ao texto;
// sy: o mesmo na vertical, usado em telas em pé (celular)
const STEPS = [
  { cam: { pos: [4.1, 1.35, 3.9], tgt: [0.1, 0.36, 0] }, st: {}, orbit: 1, shift: 0.2, sy: -0.2 },
  { cam: { pos: [0.15, 0.7, 5.8], tgt: [0, 0.42, 0] }, st: { spin: 16, roll: 1 }, shift: 0.16, sy: 0.17 },
  { cam: { pos: [3.0, 3.5, 3.1], tgt: [0.05, 0.3, 0] }, st: { xray: 1, hl: { chassi: 1 } }, shift: -0.15, sy: 0.17 },
  { cam: { pos: [1.95, 0.85, 2.05], tgt: [0.78, 0.3, 0.45] }, st: { xray: 0.7, heaveAmp: 0.028, steerAmp: 0.22, hl: { suspensao: 1 } }, shift: 0.15, sy: 0.17 },
  { cam: { pos: [-1.85, 2.75, 3.15], tgt: [-0.55, 0.45, 0] }, st: { xray: 0.3, heat: 0.9, spin: 10, hl: { powertrain: 1, admissao: 0.7 } }, shift: -0.15, sy: 0.17 },
  { cam: { pos: [0.4, 0.95, 6.2], tgt: [-0.05, 0.5, 0] }, st: { air: 1, spin: 18, roll: 1, hl: { aero: 0.8 } }, shift: 0.15, sy: 0.17 },
  { cam: { pos: [5.4, 3.9, 5.6], tgt: [0, 0.85, 0] }, st: { explode: 1, driver: 0 }, shift: -0.14, sy: 0.17 },
];
const DEF = { explode: 0, xray: 0, air: 0, heaveAmp: 0, steerAmp: 0, spin: 0, heat: 0, driver: 1, brake: 0, roll: 0 };

export function createStage(opts = {}) {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") || probe.getContext("webgl");
  if (!gl) return null;

  const isTouch = matchMedia("(pointer: coarse)").matches;
  const lowPower = isTouch || (navigator.hardwareConcurrency || 8) <= 4;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "stage__canvas";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor("#0b0b0d", 1);

  /* ---------- cena ---------- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#0b0b0d", 7, 18);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight("#ffffff", 2.4);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 1, far: 20 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  // contraluz laranja baixo: marca o contorno do carro sem tingir o piso
  const rim = new THREE.DirectionalLight("#ff8000", 3);
  rim.position.set(-4.5, 0.9, -3.5);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight("#ffd2a6", 1.2);
  rim2.position.set(-2, 3, 4);
  scene.add(rim2);
  scene.add(new THREE.HemisphereLight("#ffffff", "#0b0b0d", 0.35));

  // piso com grade (rola quando o carro "anda")
  const gridC = document.createElement("canvas");
  gridC.width = gridC.height = 256;
  {
    const g = gridC.getContext("2d");
    g.fillStyle = "#0e0e11";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#23252b";
    g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = "#16171b";
    g.lineWidth = 1;
    for (let i = 64; i < 256; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
  }
  const gridTex = new THREE.CanvasTexture(gridC);
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(20, 20);
  gridTex.anisotropy = 8;
  gridTex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: gridTex, color: "#77777d", roughness: 0.72, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const radial = (inner, outer) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), new THREE.MeshBasicMaterial({ map: radial("rgba(0,0,0,0.85)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  scene.add(shadow);
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.0, 128), new THREE.MeshBasicMaterial({ color: "#ff8000", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(1.2, 0.72, 1);
  glow.position.y = 0.004;
  scene.add(glow);

  /* ---------- carro e fluxo de ar ---------- */
  const car = buildCar({ carNumber: String(opts.carNumber || 39) });
  scene.add(car.root);
  const air = createAirflow(car.bodyProfile, lowPower ? 450 : 1000);
  scene.add(air.object);

  /* ---------- câmera, controles, pós-processamento ---------- */
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  camera.position.set(3.7, 1.3, 3.5);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = 1.2;
  controls.maxDistance = 9;
  controls.target.set(0, 0.38, 0);
  canvas.style.touchAction = "pan-y";

  let composer = null, bloom = null;
  if (!lowPower) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.45, 0.86);
    composer.addPass(bloom);
    composer.addPass(new THREE.OutputPass());
  }

  /* ---------- hosts ---------- */
  const hosts = {};
  const vis = {};
  let active = null;
  function addHost(name, el) {
    if (!el) return;
    hosts[name] = el;
    vis[name] = 0;
    io.observe(el);
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const name = Object.keys(hosts).find((k) => hosts[k] === e.target);
        vis[name] = e.isIntersecting ? e.intersectionRect.height : 0;
      }
    },
    { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
  );
  function size() {
    if (!active) return;
    const el = hosts[active];
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", size);
  function pickHost() {
    let best = null, bv = 0;
    for (const k in vis) if (vis[k] > bv) { bv = vis[k]; best = k; }
    if (best !== active) {
      if (best) {
        hosts[best].prepend(canvas);
        const prev = active;
        active = best;
        onEnter(best, prev);
        size();
      } else {
        active = null;
      }
    }
  }

  /* ---------- estado ---------- */
  const S = car.state;
  const target = { explode: 0, xray: 0, air: 0, heave: 0, steer: 0, driver: 1, brake: 0, heat: 0 };
  const hlTarget = {};
  let spinRate = 0, time = 0, last = performance.now();
  const mouse = { x: 0, y: 0 };
  if (!isTouch) window.addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  /* ---------- modo: abertura (story) ---------- */
  const story = opts.story || {};
  const panels = story.section ? Array.from(story.section.querySelectorAll("[data-step]")) : [];
  const navBtns = story.section ? Array.from(story.section.querySelectorAll("[data-go]")) : [];
  const tags = story.section ? Array.from(story.section.querySelectorAll("[data-tag-step]")) : [];
  let storyF = 0;
  function storyProgress() {
    const s = story.section;
    if (!s) return 0;
    const r = s.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }
  navBtns.forEach((b) =>
    b.addEventListener("click", () => {
      const s = story.section;
      const span = s.offsetHeight - innerHeight;
      const i = +b.dataset.go;
      window.scrollTo({ top: s.offsetTop + (i / (STEPS.length - 1)) * span + 2, behavior: reduced ? "auto" : "smooth" });
    })
  );
  const _p = new THREE.Vector3(), _t = new THREE.Vector3();
  function fit(pos, tgt) {
    const a = camera.aspect;
    if (a < 1.3) {
      const k = Math.pow(1.3 / a, 0.7);
      pos.sub(tgt).multiplyScalar(k).add(tgt);
    }
  }
  function updateStory(dt) {
    const p = storyProgress();
    storyF = p * (STEPS.length - 1);
    const i = Math.min(STEPS.length - 2, Math.floor(storyF));
    const u = storyF - i;
    const t = smooth(0.18, 0.82, u);
    const A = STEPS[i], B = STEPS[i + 1];
    _p.copy(V3(A.cam.pos)).lerp(V3(B.cam.pos), t);
    _t.copy(V3(A.cam.tgt)).lerp(V3(B.cam.tgt), t);
    // órbita lenta no primeiro passo
    const orbit = lerp(A.orbit || 0, B.orbit || 0, t);
    if (orbit > 0 && !reduced) {
      const ang = Math.sin(time * 0.18) * 0.45 * orbit;
      _p.sub(_t).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang).add(_t);
    }
    _p.x += mouse.x * 0.35;
    _p.y -= mouse.y * 0.2;
    fit(_p, _t);
    camera.position.copy(_p);
    camera.lookAt(_t);
    const portrait = camera.aspect < 1;
    const sh = portrait ? 0 : lerp(A.shift || 0, B.shift || 0, t);
    const sv = portrait ? lerp(A.sy || 0, B.sy || 0, t) : 0;
    setOffset(sh, sv);

    const sa = { ...DEF, ...A.st }, sb = { ...DEF, ...B.st };
    const mix = (k) => lerp(sa[k], sb[k], t);
    target.explode = mix("explode");
    target.xray = mix("xray");
    target.air = mix("air");
    target.heat = mix("heat");
    target.driver = mix("driver");
    target.brake = mix("brake");
    target.heave = mix("heaveAmp") * Math.sin(time * 3.2);
    target.steer = mix("steerAmp") * Math.sin(time * 1.3);
    spinRate = mix("spin");
    const roll = mix("roll");
    if (roll > 0.01) gridTex.offset.x -= (spinRate * 0.255 * dt * roll) / 2;
    for (const k in hlTarget) hlTarget[k] = 0;
    for (const [k, v] of Object.entries(A.st.hl || {})) hlTarget[k] = (hlTarget[k] || 0) + v * (1 - t);
    for (const [k, v] of Object.entries(B.st.hl || {})) hlTarget[k] = (hlTarget[k] || 0) + v * t;

    panels.forEach((el) => {
      const j = +el.dataset.step;
      const d = storyF - j;
      const o = 1 - smooth(0.28, 0.5, Math.abs(d));
      el.style.opacity = o.toFixed(3);
      el.style.setProperty("--dy", (-d * 60).toFixed(1) + "px");
      el.classList.toggle("is-current", o > 0.5);
    });
    const cur = Math.round(storyF);
    navBtns.forEach((b) => b.classList.toggle("is-active", +b.dataset.go === cur));
    if (story.bar) story.bar.style.transform = `scaleY(${p.toFixed(4)})`;
    placeTags(tags, (el) => 1 - smooth(0.12, 0.3, Math.abs(storyF - +el.dataset.tagStep)), hosts.story);
  }

  const _sz = new THREE.Vector2();
  function setOffset(sx, sy) {
    renderer.getSize(_sz);
    if (Math.abs(sx) < 1e-4 && Math.abs(sy) < 1e-4) { if (camera.view && camera.view.enabled) camera.clearViewOffset(); return; }
    camera.setViewOffset(_sz.x, _sz.y, -sx * _sz.x, sy * _sz.y, _sz.x, _sz.y);
  }

  /* ---------- rótulos presos a pontos do carro ---------- */
  const _a = new THREE.Vector3();
  function placeTags(list, opacityOf, host) {
    if (!host) return;
    const w = host.clientWidth, h = host.clientHeight;
    for (const el of list) {
      const o = opacityOf(el);
      if (o <= 0.01) { el.style.opacity = "0"; el.style.visibility = "hidden"; continue; }
      car.anchorWorld(el.dataset.anchor, _a).project(camera);
      if (_a.z > 1) { el.style.visibility = "hidden"; continue; }
      el.style.visibility = "visible";
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(${((_a.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-_a.y * 0.5 + 0.5) * h).toFixed(1)}px, 0)`;
    }
  }

  /* ---------- modo: garagem ---------- */
  const garage = opts.garage || {};
  const G = { explode: 0, xray: 0, air: 0, heave: 0, steer: 0, driver: 1, sel: null, touchOn: false };
  const eng = { on: false, rpm: 0, throttle: 0, cut: 0, crank: 0 };
  const audio = new EngineAudio();
  let tween = null;
  let garageSeen = false;
  function flyTo(pos, tgt, dur = 1.1) {
    tween = { fp: camera.position.clone(), ft: controls.target.clone(), tp: V3(pos), tt: V3(tgt), t: 0, dur };
    if (hosts.garage && active === "garage") {
      const tmp = tween.tp.clone();
      const a = camera.aspect;
      if (a < 1.1) tween.tp = tmp.sub(tween.tt).multiplyScalar(Math.pow(1.1 / a, 0.7)).add(tween.tt);
    }
  }
  const labelEls = garage.labels || [];
  labelEls.forEach((el) => el.addEventListener("click", () => selectPart(el.dataset.anchor === G.sel ? null : el.dataset.anchor)));
  function selectPart(name) {
    G.sel = name;
    labelEls.forEach((el) => el.classList.toggle("is-active", el.dataset.anchor === name));
    if (garage.onSelect) garage.onSelect(name, name ? PARTS[name] : null);
    if (name) flyTo(PARTS[name].cam.pos, PARTS[name].cam.tgt);
  }
  function setTouch(on) {
    G.touchOn = on;
    controls.enabled = active === "garage" && (!isTouch || on);
    canvas.style.touchAction = controls.enabled && isTouch ? "none" : "pan-y";
  }
  function updateGarage(dt) {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const e = easeIO(tween.t);
      camera.position.lerpVectors(tween.fp, tween.tp, e);
      controls.target.lerpVectors(tween.ft, tween.tt, e);
      camera.lookAt(controls.target);
      if (tween.t >= 1) tween = null;
    } else controls.update();

    const part = G.sel ? PARTS[G.sel].estado : {};
    target.explode = G.explode;
    target.xray = Math.max(G.xray, part.xray || 0);
    target.air = Math.max(G.air, part.air || 0);
    target.driver = G.driver * (1 - smooth(0.1, 0.3, G.explode));
    target.brake = part.brake || 0;
    target.heave = part.demo === "heave" ? 0.026 * Math.sin(time * 3.2) : G.heave;
    target.steer = G.steer;
    for (const k in hlTarget) hlTarget[k] = 0;
    if (G.sel) hlTarget[G.sel] = 1;

    const n = clamp((eng.rpm - IDLE) / (LIMIT - IDLE), 0, 1);
    target.heat = Math.max(part.heat || 0, eng.on ? 0.15 + n * 0.85 : 0);
    spinRate = eng.on && eng.crank <= 0 ? n * 55 : 0;

    placeTags(labelEls, () => (tween ? 0.35 : 1), hosts.garage);
  }

  /* ---------- motor (roda mesmo com a garagem fora da tela) ---------- */
  const IDLE = 1650, LIMIT = 12800;
  let engClock = 0;
  function updateEngine(dt) {
    if (!eng.on && eng.rpm <= 0) return;
    engClock += dt;
    if (eng.on) {
      if (eng.crank > 0) {
        eng.crank -= dt;
        eng.rpm = 280 + Math.sin(engClock * 40) * 60;
        if (eng.crank <= 0) eng.rpm = 3200;
      } else {
        const tgt = IDLE + eng.throttle * (LIMIT - IDLE + 400);
        const rate = tgt > eng.rpm ? 3.2 + eng.throttle * 5 : 2.4;
        eng.rpm += (tgt - eng.rpm) * Math.min(1, rate * dt);
        if (eng.cut > 0) eng.cut -= dt;
        if (eng.rpm >= LIMIT && eng.cut <= 0) { eng.rpm = LIMIT - 650; eng.cut = 0.06; }
      }
      audio.set(eng.crank > 0 ? eng.rpm * 1.6 : eng.rpm, eng.throttle, eng.cut > 0);
    } else eng.rpm = Math.max(0, eng.rpm - dt * 6000);
    if (garage.onRpm) garage.onRpm(eng.rpm, LIMIT, eng.on);
  }

  /* ---------- modo: patrocinador ---------- */
  function updateSponsor() {
    const ang = Math.sin(time * 0.25) * 0.28;
    _t.set(-0.18, 0.27, 0.5);
    _p.set(0.3, 0.22, 2.05).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang).add(_t);
    fit(_p, _t);
    camera.position.copy(_p);
    camera.lookAt(_t);
    Object.assign(target, { explode: 0, xray: 0, air: 0, heave: 0, steer: 0, driver: 1, brake: 0, heat: 0 });
    for (const k in hlTarget) hlTarget[k] = 0;
    spinRate = 0;
  }

  function onEnter(name, prev) {
    controls.enabled = false;
    canvas.style.touchAction = "pan-y";
    if (name === "garage") {
      if (!garageSeen) {
        garageSeen = true;
        camera.position.set(...VIEWS["34"].pos);
        controls.target.set(...VIEWS["34"].tgt);
        const a = (hosts.garage.clientWidth || 1) / (hosts.garage.clientHeight || 1);
        if (a < 1.1) camera.position.sub(controls.target).multiplyScalar(Math.pow(1.1 / a, 0.7)).add(controls.target);
      } else if (prev) {
        camera.position.copy(garagePose.pos);
        controls.target.copy(garagePose.tgt);
      }
      camera.lookAt(controls.target);
      setTouch(G.touchOn);
    }
    if (prev === "garage") {
      garagePose.pos.copy(camera.position);
      garagePose.tgt.copy(controls.target);
      if (eng.on && garage.onLeave) garage.onLeave();
    }
  }
  const garagePose = { pos: V3(VIEWS["34"].pos), tgt: V3(VIEWS["34"].tgt) };

  /* ---------- loop ---------- */
  let firstFrame = true;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateEngine(dt);
    pickHost();
    if (!active || document.hidden) return;
    time += dt;

    if (active === "story") updateStory(dt);
    else {
      setOffset(0, 0);
      if (active === "garage") updateGarage(dt);
      else updateSponsor();
    }

    const k = 1 - Math.exp(-dt * 5);
    for (const key of ["explode", "xray", "air", "driver", "brake", "heat"]) S[key] = lerp(S[key], target[key], k);
    S.heave = lerp(S.heave, target.heave, 1 - Math.exp(-dt * 12));
    S.steer = lerp(S.steer, target.steer, 1 - Math.exp(-dt * 8));
    for (const key of new Set([...Object.keys(hlTarget), ...Object.keys(S.highlight)])) S.highlight[key] = lerp(S.highlight[key] || 0, hlTarget[key] || 0, k);
    S.spin += spinRate * dt;
    car.apply(time);
    air.update(dt, S.air);
    glow.material.opacity = 0.14 + 0.12 * S.heat + 0.05 * Math.sin(time * 2);

    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      opts.onReady && opts.onReady();
    }
  }

  addHost("story", opts.story && opts.story.host);
  addHost("garage", garage.host);
  addHost("sponsor", opts.sponsorHost);
  requestAnimationFrame((t) => { last = t; frame(t); });

  /* ---------- API pública (usada pela interface) ---------- */
  return {
    car,
    renderer,
    air,
    set(key, value) { G[key] = value; },
    view(name) { const v = VIEWS[name]; if (v) { selectPart(null); flyTo(v.pos, v.tgt); } },
    zoom(f) {
      const dir = camera.position.clone().sub(controls.target);
      const d = clamp(dir.length() * f, controls.minDistance, controls.maxDistance);
      flyTo(dir.setLength(d).add(controls.target).toArray(), controls.target.toArray(), 0.45);
    },
    select: selectPart,
    setTouch,
    paint(name) { car.setPaint(name); },
    sponsor(img) { car.setSponsor(img); },
    engine: {
      start() { audio.start(); eng.on = true; eng.crank = 0.9; },
      stop() { eng.on = false; eng.throttle = 0; audio.stop(); },
      throttle(v) { eng.throttle = v; },
      mute(m) { audio.setMuted(m); },
      get on() { return eng.on; },
    },
    isTouch,
  };
}
