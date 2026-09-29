/*
 * Palco 3D do site. Um único renderizador WebGL que "pula" entre três lugares
 * da página conforme a rolagem:
 *   story   → abertura com rolagem guiada (o carro se desmonta)
 *   garage  → garagem interativa (girar, raio-x, explodir, ligar o motor)
 *   sponsor → prévia do logo do patrocinador na lateral do carro
 */
import * as THREE from "../../vendor/three.bundle.min.js";
import { buildCar } from "./car.js";
import { createAirflow } from "./airflow.js";
import { EngineAudio } from "./engine-audio.js";
import { PARTS, VIEWS } from "./parts.js";
import { studioEnvironment, floorTextures } from "./textures.js";
import { createPhotoMode } from "./photo.js";

/* vinheta + grão de filme, aplicados depois do tone mapping */
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.32 }, grain: { value: 0.028 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float vignette; uniform float grain; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d) * 1.35);
      c.rgb += (hash(vUv * 1000.0 + fract(time) * 100.0) - 0.5) * grain;
      gl_FragColor = c;
    }`,
};

/*
 * Sombra de contato (técnica usada em apresentações de produto): uma câmera
 * ortográfica olha o carro de baixo para cima, grava a profundidade como
 * opacidade, e o resultado desfocado é aplicado num plano logo acima do piso.
 */
function createContactShadows(renderer, scene, { size = [4, 3], res = 512, blur = 3, darkness = 1.5, opacity = 0.8, far = 0.9 } = {}) {
  const [w, h] = size;
  const rtA = new THREE.WebGLRenderTarget(res, res);
  const rtB = new THREE.WebGLRenderTarget(res, res);
  rtA.texture.generateMipmaps = rtB.texture.generateMipmaps = false;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: rtA.texture, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.scale.y = -1; // a câmera olha de baixo: a imagem vem espelhada
  plane.position.y = 0.003;
  plane.renderOrder = 1;
  scene.add(plane);
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, far);
  cam.rotation.x = Math.PI / 2;
  const depthMat = new THREE.MeshDepthMaterial();
  depthMat.depthTest = depthMat.depthWrite = false;
  depthMat.transparent = true;
  depthMat.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = { value: darkness };
    shader.fragmentShader = "uniform float darkness;\n" + shader.fragmentShader.replace(
      "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );"
    );
  };
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const hBlur = new THREE.ShaderMaterial(THREE.HorizontalBlurShader);
  const vBlur = new THREE.ShaderMaterial(THREE.VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;
  const clear = new THREE.Color();
  const api = {
    hide: [],
    update(target) {
      const prevBg = scene.background, prevOverride = scene.overrideMaterial, prevFog = scene.fog;
      const prevAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      const vis = api.hide.map((o) => o.visible);
      api.hide.forEach((o) => (o.visible = false));
      plane.visible = false;
      scene.background = null;
      scene.fog = null;
      scene.overrideMaterial = depthMat;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(rtA);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = prevOverride;
      // desfoque em duas passadas (horizontal e vertical), duas vezes
      for (let i = 0; i < 2; i++) {
        quad.material = hBlur;
        hBlur.uniforms.tDiffuse.value = rtA.texture;
        hBlur.uniforms.h.value = (blur * (i + 1)) / (res * 2);
        renderer.setRenderTarget(rtB);
        renderer.render(quad, quadCam);
        quad.material = vBlur;
        vBlur.uniforms.tDiffuse.value = rtB.texture;
        vBlur.uniforms.v.value = (blur * (i + 1)) / (res * 2);
        renderer.setRenderTarget(rtA);
        renderer.render(quad, quadCam);
      }
      renderer.setRenderTarget(null);
      renderer.setClearColor(clear, prevAlpha);
      scene.background = prevBg;
      scene.fog = prevFog;
      api.hide.forEach((o, i) => (o.visible = vis[i]));
      plane.visible = true;
    },
  };
  return api;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* passos da abertura: câmera + estado do carro */
// shift: desloca o carro na horizontal (fração da largura) para abrir espaço ao texto;
// sy: o mesmo na vertical, usado em telas em pé (celular)
const STEPS = [
  { cam: { pos: [4.5, 1.45, 4.3], tgt: [0.15, 0.38, 0] }, st: {}, orbit: 1, shift: 0.2, sy: -0.2 },
  { cam: { pos: [0.15, 0.8, 6.4], tgt: [0, 0.5, 0] }, st: { spin: 16, roll: 1 }, shift: 0.16, sy: 0.17 },
  { cam: { pos: [3.0, 3.5, 3.1], tgt: [0.05, 0.3, 0] }, st: { xray: 1, hl: { chassi: 1 } }, shift: -0.15, sy: 0.17 },
  { cam: { pos: [1.95, 0.85, 2.05], tgt: [0.78, 0.3, 0.45] }, st: { xray: 0.7, heaveAmp: 0.028, steerAmp: 0.22, hl: { suspensao: 1 } }, shift: 0.15, sy: 0.17 },
  { cam: { pos: [1.0, 2.3, 2.5], tgt: [-0.5, 0.45, 0] }, st: { xray: 0.3, heat: 0.9, spin: 10, hl: { powertrain: 1, admissao: 0.7 } }, shift: -0.15, sy: 0.17 },
  { cam: { pos: [0.6, 1.15, 6.7], tgt: [0.3, 0.64, 0] }, st: { air: 1, spin: 18, roll: 1, hl: { aero: 0.8 } }, shift: 0.15, sy: 0.17 },
  { cam: { pos: [5.4, 3.9, 5.6], tgt: [0, 0.85, 0] }, st: { explode: 1, driver: 0 }, shift: -0.14, sy: 0.17 },
];
const DEF = { explode: 0, xray: 0, air: 0, heaveAmp: 0, steerAmp: 0, spin: 0, heat: 0, driver: 1, brake: 0, roll: 0 };

export function createStage(opts = {}) {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") || probe.getContext("webgl");
  if (!gl) return null;

  const isTouch = matchMedia("(pointer: coarse)").matches;
  // ?hq=1 força a qualidade máxima e ?lq=1 a mínima (útil para testar)
  const qs = new URLSearchParams(location.search);
  const lowPower = qs.has("hq") ? false : qs.has("lq") ? true : isTouch || (navigator.hardwareConcurrency || 8) < 4;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "stage__canvas";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor("#0b0b0d", 1);

  /* ---------- cena: estúdio fotográfico ---------- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#0b0b0d", 7, 17);
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1.0;

  const key = new THREE.DirectionalLight("#ffffff", 1.6);
  key.position.set(2.5, 7, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 1, far: 20 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  // o contorno laranja vem da faixa de luz laranja do estúdio (textures.js), sem luz direta no piso
  const rim = null;

  // piso de concreto polido (a textura rola quando o carro "anda")
  const floorT = floorTextures();
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorT.map, roughnessMap: floorT.roughnessMap, roughness: 0.55, metalness: 0,
    transparent: !lowPower, opacity: lowPower ? 1 : 0.9,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.001;
  floor.receiveShadow = true;
  scene.add(floor);
  // reflexo do carro no piso (só em computador)
  let reflector = null;
  if (!lowPower) {
    reflector = new THREE.Reflector(new THREE.PlaneGeometry(40, 40), { textureWidth: 1024, textureHeight: 1024, color: 0x7a7a80 });
    reflector.rotation.x = -Math.PI / 2;
    // não recalcula o reflexo nas passadas auxiliares (oclusão de ambiente, sombra)
    const reflect = reflector.onBeforeRender;
    reflector.onBeforeRender = function (r, s, c) { if (!s.overrideMaterial) reflect.call(this, r, s, c); };
    scene.add(reflector);
  }
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.0, 128), new THREE.MeshBasicMaterial({ color: "#ff8000", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(1.2, 0.72, 1);
  glow.position.y = 0.004;
  scene.add(glow);

  /* ---------- carro e fluxo de ar ---------- */
  const car = buildCar({ carNumber: String(opts.carNumber || 38), carName: opts.carName || "TR-04" });
  scene.add(car.root);
  const air = createAirflow(car.bodyProfile, lowPower ? 450 : 1000);
  scene.add(air.object);

  /* ---------- sombra de contato: o carro visto de baixo, desfocado ---------- */
  const contact = createContactShadows(renderer, scene, { size: [4.4, 3.0], res: lowPower ? 256 : 512, blur: lowPower ? 2 : 3, darkness: 1.6, opacity: 0.8 });
  contact.hide = [floor, glow, air.object, ...(reflector ? [reflector] : [])];

  /* ---------- câmera, controles, pós-processamento ---------- */
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  camera.position.set(3.7, 1.3, 3.5);
  const photo = createPhotoMode(renderer, () => camera);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.addEventListener("change", () => photo.cameraMoved());
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

  // pós-processamento (computador): MSAA, oclusão de ambiente, bloom, vinheta e grão
  let composer = null, bloom = null, gtao = null, film = null;
  if (!lowPower) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new THREE.EffectComposer(renderer, rt);
    composer.addPass(new THREE.RenderPass(scene, camera));
    gtao = new THREE.GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: 0.22, distanceExponent: 1.5, thickness: 1, scale: 1.1, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.4, 0.9);
    composer.addPass(bloom);
    composer.addPass(new THREE.OutputPass());
    film = new THREE.ShaderPass(FilmShader);
    composer.addPass(film);
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
    if (roll > 0.01) {
      // a textura cobre 4 m; desloca na velocidade da roda
      const d = (spinRate * 0.255 * dt * roll) / 4;
      floorT.map.offset.x -= d;
      floorT.roughnessMap.offset.x -= d;
    }
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
    updateGarageCamera(dt);
    updateGarageState();
  }
  function updateGarageCamera(dt) {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const e = easeIO(tween.t);
      camera.position.lerpVectors(tween.fp, tween.tp, e);
      controls.target.lerpVectors(tween.ft, tween.tt, e);
      camera.lookAt(controls.target);
      if (tween.t >= 1) tween = null;
    } else controls.update();
  }
  function updateGarageState() {
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

  /* ---------- modo foto (path tracing) ---------- */
  let saveRequested = false;
  function stopPhoto() {
    if (!photo.active) return;
    photo.stop();
    if (garage.onPhotoEnd) garage.onPhotoEnd();
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
    _t.set(0.22, 0.3, 0.36);
    _p.set(0.3, 0.22, 2.05).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang).add(_t);
    fit(_p, _t);
    camera.position.copy(_p);
    camera.lookAt(_t);
    Object.assign(target, { explode: 0, xray: 0, air: 0, heave: 0, steer: 0, driver: 1, brake: 0, heat: 0 });
    for (const k in hlTarget) hlTarget[k] = 0;
    spinRate = 0;
  }

  function onEnter(name, prev) {
    car.setSponsorSlot(name === "sponsor");
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

    // modo foto: só o path tracer desenha; a câmera continua livre
    if (photo.active) {
      if (active !== "garage") {
        stopPhoto();
      } else {
        const moving = !!tween;
        updateGarageCamera(dt);
        if (moving) photo.cameraMoved();
        photo.render();
        if (saveRequested) { saveRequested = false; photo.snapshot(); }
        if (garage.onPhoto) garage.onPhoto(photo.samples);
        return;
      }
    }

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

    contact.update(car.root);
    if (film) film.uniforms.time.value = time;
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
    scene,
    debug: { floor, reflector, glow, contact, gtao, bloom, film, key, rim, jump(pos, tgt) { tween = null; camera.position.set(...pos); controls.target.set(...tgt); camera.lookAt(controls.target); controls.update(); } },
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
    photo: {
      // tira a foto do carro como ele está agora (explodido, raio-x, pintura...)
      async start() {
        await photo.start(car.root);
      },
      stop: stopPhoto,
      save() { saveRequested = true; },
      get active() { return photo.active; },
    },
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
