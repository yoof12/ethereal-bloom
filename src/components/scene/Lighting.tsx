"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";

/**
 * All mood lighting lives here so the Dream ↔ Radiance transition can be a
 * single continuous cross-fade instead of a hard swap.
 */
export function Lighting() {
  const { state } = useExperience();
  const { scene } = useThree();
  const key = useRef<THREE.SpotLight>(null);
  const violetRim = useRef<THREE.PointLight>(null);
  const blueRim = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const s = state.current;
    const radiance = 1 - s.dream;

    scene.environmentIntensity = 0.8 + s.awake * 0.25 + radiance * 0.55;

    if (key.current) {
      key.current.intensity =
        (10 + s.core * 8 + s.pulse * 12) * (0.85 + radiance * 0.55);
    }
    if (violetRim.current) {
      violetRim.current.intensity =
        (16 + s.open * 8 + s.pulse * 10) * (0.8 + radiance * 0.65);
    }
    if (blueRim.current) {
      blueRim.current.intensity =
        (9 + s.open * 5 + s.pulse * 8) * (0.9 + radiance * 0.5);
    }
  });

  return (
    <>
      <ambientLight intensity={0.32} color="#8d9bff" />
      <hemisphereLight args={["#7c84ff", "#050410", 0.42]} />
      <directionalLight position={[3.5, 6, 4]} intensity={1.5} color="#eae5ff" />
      <spotLight
        ref={key}
        position={[0, 7.5, 2.5]}
        angle={0.55}
        penumbra={1}
        intensity={10}
        distance={24}
        decay={2}
        color="#ffe0b8"
      />
      <pointLight
        ref={violetRim}
        position={[-3.8, 1.5, -2.4]}
        intensity={16}
        distance={16}
        decay={2}
        color="#7a5cff"
      />
      <pointLight
        ref={blueRim}
        position={[3.5, -0.4, 2.6]}
        intensity={9}
        distance={16}
        decay={2}
        color="#4f7cff"
      />
      <pointLight
        position={[0, -2.5, 1.6]}
        intensity={3.5}
        distance={9}
        decay={2}
        color="#2a6f6a"
      />
    </>
  );
}
