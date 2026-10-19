import * as THREE from "three";
import type { QualityTier } from "@/lib/experience/types";

export interface SharedPetalUniforms {
  time: { value: number };
  glow: { value: number };
  veinColor: { value: THREE.Color };
}

export function createSharedPetalUniforms(): SharedPetalUniforms {
  return {
    time: { value: 0 },
    glow: { value: 0.6 },
    veinColor: { value: new THREE.Color("#ffcf8a") },
  };
}

export interface PetalMaterialOptions {
  quality: QualityTier;
  shared: SharedPetalUniforms;
  tint: THREE.ColorRepresentation;
  phase: number;
  veinPhase: number;
  /** 0 = matte botanical, 1 = full crystalline petal. */
  crystal?: number;
  veinColor?: THREE.ColorRepresentation;
  transmission?: number;
  iridescence?: number;
  roughness?: number;
  emissive?: THREE.ColorRepresentation;
}

export interface PetalMaterialHandle {
  material: THREE.MeshPhysicalMaterial;
  hover: { value: number };
  hoverTarget: { value: number };
  sway: { value: number };
}

const VERTEX_PARS = /* glsl */ `
uniform float uPetalTime;
uniform float uPetalPhase;
uniform float uPetalSway;
varying vec2 vPetalUv;
`;

const VERTEX_BODY = /* glsl */ `
#include <begin_vertex>
vPetalUv = uv;
float petalWeight = clamp(position.y * 0.9, 0.0, 1.0);
float petalAmp = uPetalSway * petalWeight * petalWeight;
transformed.z += (
  sin(uPetalTime * 1.07 + uPetalPhase) * 0.65 +
  sin(uPetalTime * 0.47 + uPetalPhase * 1.93) * 0.35
) * petalAmp;
transformed.x += cos(uPetalTime * 0.83 + uPetalPhase * 1.37) * petalAmp * 0.45;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform float uPetalTime;
uniform float uPetalGlow;
uniform float uPetalHover;
uniform float uPetalVeinPhase;
uniform vec3 uPetalVeinColor;
varying vec2 vPetalUv;
`;

const ROUGHNESS_BODY = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.35, uPetalHover);
`;

const EMISSIVE_BODY = /* glsl */ `
#include <emissivemap_fragment>
{
  float vein = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float wobble = sin(vPetalUv.y * (5.0 + fi * 2.3) + fi * 2.1) * 0.2;
    float lateral = abs(vPetalUv.x - (0.5 + wobble * (0.3 + vPetalUv.y * 0.7)));
    vein += smoothstep(0.03 - fi * 0.006, 0.0, lateral) * (0.62 - fi * 0.14);
  }
  vein += smoothstep(0.022, 0.0, abs(vPetalUv.x - 0.5)) * 0.45;
  vein = clamp(vein, 0.0, 1.0);

  float pulse = smoothstep(
    0.78,
    0.98,
    sin(uPetalTime * 0.75 + uPetalVeinPhase - vPetalUv.y * 7.5) * 0.5 + 0.5
  );
  float lengthMask = smoothstep(0.05, 0.9, vPetalUv.y);

  totalEmissiveRadiance +=
    uPetalVeinColor * vein * lengthMask * (0.045 + 0.5 * pulse) * uPetalGlow;
  totalEmissiveRadiance += uPetalVeinColor * uPetalHover * 0.09 * (0.4 + vPetalUv.y);
  totalEmissiveRadiance += vec3(0.022, 0.016, 0.045) * uPetalHover;
}
`;

const programKey = (crystal: number) => `ethereal-petal-v2-${crystal > 0.5 ? "crystal" : "leaf"}`;

export function createPetalMaterial(options: PetalMaterialOptions): PetalMaterialHandle {
  const crystal = options.crystal ?? 1;
  const quality = options.quality;
  const shared = options.shared;

  const hover = { value: 0 };
  const hoverTarget = { value: 0 };
  const sway = { value: 0.02 };
  const phase = { value: options.phase };
  const veinPhase = { value: options.veinPhase };
  const veinColor = options.veinColor
    ? { value: new THREE.Color(options.veinColor) }
    : shared.veinColor;

  const baseTransmission = options.transmission ?? 0.42;
  const transmission =
    quality === "high"
      ? baseTransmission
      : quality === "medium"
        ? baseTransmission * 0.55
        : 0;

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(options.tint),
    vertexColors: true,
    metalness: 0.02,
    roughness: options.roughness ?? 0.17,
    transmission,
    thickness: 0.55,
    ior: 1.36,
    attenuationColor: new THREE.Color("#7a58ff"),
    attenuationDistance: 1.4,
    clearcoat: quality === "low" ? 0.35 : 1,
    clearcoatRoughness: 0.14,
    sheen: crystal > 0.5 ? 0.55 : 0.2,
    sheenColor: new THREE.Color(crystal > 0.5 ? "#d8c6ff" : "#9fe8c7"),
    sheenRoughness: 0.45,
    iridescence: crystal > 0.5 ? (options.iridescence ?? 0.95) : 0.15,
    iridescenceIOR: 1.34,
    iridescenceThicknessRange: [140, 560],
    emissive: new THREE.Color(options.emissive ?? "#120a22"),
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: transmission > 0 ? 0.94 : 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPetalTime = shared.time;
    shader.uniforms.uPetalGlow = shared.glow;
    shader.uniforms.uPetalVeinColor = veinColor;
    shader.uniforms.uPetalHover = hover;
    shader.uniforms.uPetalSway = sway;
    shader.uniforms.uPetalPhase = phase;
    shader.uniforms.uPetalVeinPhase = veinPhase;

    shader.vertexShader = VERTEX_PARS + shader.vertexShader.replace(
      "#include <begin_vertex>",
      VERTEX_BODY,
    );

    shader.fragmentShader = FRAGMENT_PARS + shader.fragmentShader
      .replace("#include <roughnessmap_fragment>", ROUGHNESS_BODY)
      .replace("#include <emissivemap_fragment>", EMISSIVE_BODY);
  };

  material.customProgramCacheKey = () => programKey(crystal);

  return { material, hover, hoverTarget, sway };
}
