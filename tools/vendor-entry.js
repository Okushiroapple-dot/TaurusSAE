// Ponto de entrada do bundle do Three.js usado pelo site.
// Gere de novo com: bash tools/build-vendor.sh
export * from "three";
export { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
export { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
export { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
export { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
export { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
export { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
export { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
