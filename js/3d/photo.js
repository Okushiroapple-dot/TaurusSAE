/*
 * Modo foto: renderização por traçado de raios (path tracing) com
 * three-gpu-pathtracer. A imagem começa ruidosa e fica limpa a cada amostra,
 * com iluminação global, sombras suaves e reflexos fisicamente corretos.
 *
 * O módulo do path tracer (~60 KB comprimido) só é baixado quando a pessoa
 * liga o modo foto.
 */
import * as THREE from "../../vendor/three.bundle.min.js";
import { floorTextures } from "./textures.js";

/* cópia do carro sem InstancedMesh (o path tracer só aceita malhas comuns) */
function cloneForPathTracing(root) {
  const out = root.clone(true);
  const swaps = [];
  out.traverse((o) => {
    if (o.isInstancedMesh) swaps.push(o);
  });
  const m = new THREE.Matrix4();
  for (const inst of swaps) {
    const group = new THREE.Group();
    group.position.copy(inst.position);
    group.quaternion.copy(inst.quaternion);
    group.scale.copy(inst.scale);
    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, m);
      const mesh = new THREE.Mesh(inst.geometry, inst.material);
      m.decompose(mesh.position, mesh.quaternion, mesh.scale);
      group.add(mesh);
    }
    inst.parent.add(group);
    inst.parent.remove(inst);
  }
  // linhas (fluxo de ar, wireframe) e objetos invisíveis ficam de fora
  const drop = [];
  out.traverse((o) => { if (o.isLine || o.isPoints || !o.visible) drop.push(o); });
  drop.forEach((o) => o.parent && o.parent.remove(o));
  return out;
}

export function createPhotoMode(renderer, getCamera) {
  let pt = null;
  let ptScene = null;
  let loading = null;
  let active = false;

  async function load() {
    if (pt) return;
    if (!loading) loading = import("../../vendor/pathtracer.bundle.min.js");
    const lib = await loading;
    pt = new lib.WebGLPathTracer(renderer);
    pt.tiles.set(2, 2);
    pt.bounces = 6;
    pt.filterGlossyFactor = 0.4;
    pt.minSamples = 1;
    pt.fadeDuration = 300;
    pt.renderDelay = 0;
    pt.dynamicLowRes = true;
    pt.lowResScale = 0.35;
    pt.multipleImportanceSampling = true;
    const env = new lib.GradientEquirectTexture(256);
    env.topColor.set("#d9dde6");
    env.bottomColor.set("#050506");
    env.exponent = 3;
    env.update();
    return env;
  }

  function buildScene(carRoot, env) {
    const scene = new THREE.Scene();
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    scene.background = new THREE.Color("#0b0b0d");
    carRoot.updateMatrixWorld(true);
    scene.add(cloneForPathTracing(carRoot));

    // piso de concreto polido
    const ft = floorTextures();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ map: ft.map, roughnessMap: ft.roughnessMap, roughness: 0.35, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // softboxes de estúdio (luzes de área) e a faixa laranja de contraluz
    const area = (w, h, color, intensity, pos, look) => {
      const l = new THREE.RectAreaLight(color, intensity, w, h);
      l.position.set(...pos);
      l.lookAt(...look);
      scene.add(l);
    };
    area(3.2, 1.6, "#ffffff", 9, [0.2, 4.2, 0.6], [0, 0, 0]);
    area(0.5, 3.0, "#ffffff", 7, [1.5, 1.6, 4.2], [0, 0.4, 0]);
    area(0.5, 3.0, "#ffffff", 5, [-2.5, 1.6, -4.0], [0, 0.4, 0]);
    area(4.0, 0.35, "#ff8000", 14, [-4.5, 0.9, 0], [0, 0.4, 0]);
    return scene;
  }

  return {
    get active() { return active; },
    get samples() { return pt ? pt.samples : 0; },
    async start(carRoot) {
      const env = await load();
      ptScene = buildScene(carRoot, env || ptScene?.environment);
      // deixa o navegador pintar o "Preparando a cena…" antes do trabalho pesado
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      pt.setScene(ptScene, getCamera());
      active = true;
    },
    stop() {
      active = false;
      if (pt) pt.reset();
    },
    cameraMoved() {
      if (active && pt) pt.updateCamera();
    },
    render() {
      if (active && pt) pt.renderSample();
    },
    // salva a imagem atual (chamado logo depois de render, no mesmo quadro)
    snapshot(filename = "taurus-racing-39.png") {
      renderer.domElement.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, "image/png");
    },
  };
}
