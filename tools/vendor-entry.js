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
export { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
export { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
export { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
export { Reflector } from "three/examples/jsm/objects/Reflector.js";
export { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
export { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
export { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
