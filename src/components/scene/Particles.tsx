"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import { mulberry32, range } from "@/lib/experience/random";
import type { QualityTier } from "@/lib/experience/types";

interface ParticleFieldProps {
  count: number;
  radius: number;
  minY: number;
  maxY: number;
  minSize: number;
  maxSize: number;
  size: number;
  speed: number;
  drift: number;
  opacity: number;
  colorA: string;
  colorB: string;
  seed: number;
}

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform float uSize;
uniform float uOpacity;
uniform float uDrift;
attribute float aSeed;
attribute float aSize;
varying float vAlpha;
varying float vSeed;

void main() {
  vSeed = aSeed;
  vec3 p = position;
  float speed = uSpeed * (0.35 + fract(aSeed * 7.13));
  float t = uTime * speed;

  p.y += sin(t * 0.6 + aSeed * 6.2831) * uDrift;
  p.x += cos(t * 0.43 + aSeed * 4.1) * uDrift * 0.9;
  p.z += sin(t * 0.35 + aSeed * 2.7) * uDrift * 0.7;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.55 + 0.45 * sin(uTime * (0.4 + fract(aSeed * 3.1)) + aSeed * 20.0);
  float depthFade = clamp(1.0 - (-mv.z - 2.0) / 42.0, 0.0, 1.0);

  vAlpha = uOpacity * twinkle * depthFade;
  gl_PointSize = aSize * uSize * uScale / max(0.1, -mv.z);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float distanceToCenter = length(centered);
  if (distanceToCenter > 0.5) discard;

  float glow = pow(1.0 - distanceToCenter * 2.0, 2.6);
  vec3 color = mix(uColorA, uColorB, fract(vSeed * 5.71));
  gl_FragColor = vec4(color, glow * vAlpha);
}
`;

function createParticleGeometry(props: ParticleFieldProps) {
  const random = mulberry32(props.seed);
  const positions = new Float32Array(props.count * 3);
  const seeds = new Float32Array(props.count);
  const sizes = new Float32Array(props.count);

  for (let i = 0; i < props.count; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * props.radius;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = range(random, props.minY, props.maxY);
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    seeds[i] = random();
    sizes[i] = range(random, props.minSize, props.maxSize);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, (props.minY + props.maxY) * 0.5, 0),
    props.radius * 1.3,
  );

  return geometry;
}

export function ParticleField(props: ParticleFieldProps) {
  const { state } = useExperience();
  const { gl, camera } = useThree();
  const material = useRef<THREE.ShaderMaterial>(null);
  const bufferSize = useMemo(() => new THREE.Vector2(), []);

  const geometry = useMemo(() => createParticleGeometry(props), [props]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 400 },
      uSpeed: { value: props.speed },
      uSize: { value: props.size },
      uOpacity: { value: 0 },
      uDrift: { value: props.drift },
      uColorA: { value: new THREE.Color(props.colorA) },
      uColorB: { value: new THREE.Color(props.colorB) },
    }),
    [props.colorA, props.colorB, props.drift, props.size, props.speed],
  );

  useFrame(({ clock }) => {
    const s = state.current;
    const shader = material.current;
    if (!shader) return;

    const drawingBuffer = gl.getDrawingBufferSize(bufferSize);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
    const scale = drawingBuffer.y / (2 * Math.tan((fov * Math.PI) / 360));

    shader.uniforms.uTime.value = clock.elapsedTime;
    shader.uniforms.uScale.value = scale;
    shader.uniforms.uSpeed.value = props.speed * (1 + (1 - s.dream) * 0.8);
    shader.uniforms.uOpacity.value =
      s.awake * props.opacity * (0.85 + (1 - s.dream) * 0.35);
    shader.uniforms.uDrift.value =
      props.drift * (0.6 + 0.7 * s.sway) * (0.8 + (1 - s.dream) * 0.6);
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function Particles({ quality }: { quality: QualityTier }) {
  const counts =
    quality === "high"
      ? { far: 720, near: 180 }
      : quality === "medium"
        ? { far: 420, near: 110 }
        : { far: 200, near: 55 };

  const far = useMemo(
    () => ({
      count: counts.far,
      radius: 9,
      minY: -4.5,
      maxY: 6.5,
      minSize: 0.012,
      maxSize: 0.034,
      size: 1,
      speed: 0.09,
      drift: 0.55,
      opacity: 0.55,
      colorA: "#8ea4ff",
      colorB: "#d9b1ff",
      seed: 1823,
    }),
    [counts.far],
  );

  const near = useMemo(
    () => ({
      count: counts.near,
      radius: 3.4,
      minY: -0.6,
      maxY: 3.4,
      minSize: 0.008,
      maxSize: 0.024,
      size: 1,
      speed: 0.16,
      drift: 0.3,
      opacity: 0.85,
      colorA: "#ffe6bb",
      colorB: "#ffc98a",
      seed: 5119,
    }),
    [counts.near],
  );

  return (
    <>
      <ParticleField {...far} />
      <ParticleField {...near} />
    </>
  );
}
