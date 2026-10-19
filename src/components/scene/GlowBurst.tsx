"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import { mulberry32, range } from "@/lib/experience/random";

const vertexShader = /* glsl */ `
uniform float uProgress;
uniform float uScale;
attribute float aSeed;
varying float vAlpha;

void main() {
  float expansion = smoothstep(0.0, 1.0, uProgress);
  vec3 dir = normalize(position);
  float radius = length(position);

  vec3 p = dir * (radius * 0.35 + expansion * (1.4 + radius * 3.4));
  p.y += expansion * 0.45;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float fade = smoothstep(0.0, 0.08, uProgress) * (1.0 - expansion);
  vAlpha = fade * (0.45 + 0.55 * fract(aSeed * 9.17));
  gl_PointSize = (0.022 + 0.018 * (1.0 - expansion)) * uScale / max(0.1, -mv.z);
}
`;

const fragmentShader = /* glsl */ `
varying float vAlpha;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float d = length(centered);
  if (d > 0.5) discard;
  float glow = pow(1.0 - d * 2.0, 2.4);
  vec3 color = mix(vec3(1.0, 0.84, 0.55), vec3(0.72, 0.58, 1.0), d * 1.6);
  gl_FragColor = vec4(color, glow * vAlpha);
}
`;

const COUNT = 150;

export function GlowBurst() {
  const { state } = useExperience();
  const { gl, camera } = useThree();
  const material = useRef<THREE.ShaderMaterial>(null);
  const bufferSize = useMemo(() => new THREE.Vector2(), []);
  const local = useRef({ progress: 1, token: 0 });
  const tween = useRef<gsap.core.Tween | null>(null);

  const geometry = useMemo(() => {
    const random = mulberry32(7723);
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(range(random, -1, 1));
      const radius = range(random, 0.35, 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius * 0.8;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      seeds[i] = random();
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return buffer;
  }, []);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 1 },
      uScale: { value: 400 },
    }),
    [],
  );

  useEffect(
    () => () => {
      tween.current?.kill();
      geometry.dispose();
    },
    [geometry],
  );

  useFrame(() => {
    const s = state.current;
    if (s.burstToken !== local.current.token) {
      local.current.token = s.burstToken;
      local.current.progress = 0;
      tween.current?.kill();
      tween.current = gsap.to(local.current, {
        progress: 1,
        duration: 1.9,
        ease: "power2.out",
        overwrite: true,
      });
    }

    const shader = material.current;
    if (!shader) return;

    const drawingBuffer = gl.getDrawingBufferSize(bufferSize);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;

    shader.uniforms.uScale.value =
      drawingBuffer.y / (2 * Math.tan((fov * Math.PI) / 360));
    shader.uniforms.uProgress.value = Math.min(1, local.current.progress);
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={3}>
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
