"use client";

import { useMemo } from "react";
import * as THREE from "three";

const vertexShader = /* glsl */ `
varying vec3 vDirection;

void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
varying vec3 vDirection;

void main() {
  float height = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = mix(uBottom, uTop, smoothstep(0.0, 1.0, height));

  float horizon = pow(max(0.0, 1.0 - abs(vDirection.y) * 2.4), 2.0);
  float radial = pow(max(0.0, 1.0 - length(vDirection.xz) * 1.15), 3.0);
  color += uGlow * horizon * radial * 0.9;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color("#01020a") },
      uBottom: { value: new THREE.Color("#0a0a1f") },
      uGlow: { value: new THREE.Color("#241a5c") },
    }),
    [],
  );

  return (
    <mesh scale={[42, 42, 42]} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
