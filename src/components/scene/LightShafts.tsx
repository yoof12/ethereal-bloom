"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float horizontal =
    smoothstep(0.0, 0.32, vUv.x) * smoothstep(1.0, 0.68, vUv.x);
  float vertical =
    smoothstep(0.0, 0.32, vUv.y) * smoothstep(1.0, 0.42, vUv.y);
  float bands = 0.72 + 0.28 * sin(vUv.y * 6.5 + uTime * 0.22 + vUv.x * 2.0);
  float alpha = horizontal * vertical * bands * uOpacity;

  gl_FragColor = vec4(uColor, alpha);
}
`;

interface ShaftConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  opacity: number;
}

const SHAFTS: ShaftConfig[] = [
  {
    position: [-3.6, 1.4, -6.5],
    rotation: [0, 0.18, -0.16],
    scale: [4.2, 18, 1],
    opacity: 0.09,
  },
  {
    position: [1.8, 2.2, -8],
    rotation: [0, -0.22, 0.13],
    scale: [3.4, 20, 1],
    opacity: 0.06,
  },
  {
    position: [5.2, 0.4, -5.5],
    rotation: [0, 0.32, -0.25],
    scale: [2.6, 14, 1],
    opacity: 0.05,
  },
];

export function LightShafts() {
  const { state } = useExperience();
  const materials = useRef<(THREE.ShaderMaterial | null)[]>([]);

  const uniforms = useMemo(
    () =>
      SHAFTS.map(() => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color("#5d63d8") },
      })),
    [],
  );

  useFrame(({ clock }) => {
    const s = state.current;
    const t = clock.elapsedTime;

    for (let i = 0; i < uniforms.length; i += 1) {
      const shader = materials.current[i];
      if (!shader) continue;
      shader.uniforms.uTime.value = t;
      shader.uniforms.uOpacity.value =
        SHAFTS[i].opacity *
        s.awake *
        (0.75 + 0.35 * Math.sin(t * 0.18 + i * 2.1)) *
        (0.85 + (1 - s.dream) * 0.4);
    }
  });

  return (
    <>
      {SHAFTS.map((shaft, index) => (
        <mesh
          key={index}
          position={shaft.position}
          rotation={shaft.rotation}
          scale={shaft.scale}
          renderOrder={-2}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={(node: THREE.ShaderMaterial | null) => {
              materials.current[index] = node;
            }}
            uniforms={uniforms[index]}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}
