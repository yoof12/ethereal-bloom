"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import type { QualityTier } from "@/lib/experience/types";
import { createPetalGeometry } from "./petal-geometry";
import {
  createPetalMaterial,
  type SharedPetalUniforms,
} from "./petal-material";
import type { PetalSpec } from "./petal-layout";

interface PetalLayerProps {
  specs: PetalSpec[];
  shared: SharedPetalUniforms;
  quality: QualityTier;
}

export function PetalLayer({ specs, shared, quality }: PetalLayerProps) {
  const { state } = useExperience();
  const groups = useRef<(THREE.Group | null)[]>([]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  const petals = useMemo(
    () =>
      specs.map((spec) => {
        const geometry = createPetalGeometry(spec.geometry);
        const handle = createPetalMaterial({
          quality,
          shared,
          tint: spec.tint,
          phase: spec.phase,
          veinPhase: spec.veinPhase,
        });
        return { spec, geometry, handle };
      }),
    [specs, shared, quality],
  );

  useEffect(
    () => () => {
      petals.forEach(({ geometry, handle }) => {
        geometry.dispose();
        handle.material.dispose();
      });
    },
    [petals],
  );

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const amp = 0.006 + 0.032 * s.sway;
    const petalSway = 0.012 + 0.05 * s.sway + s.pulse * 0.02;
    const smoothing = Math.min(1, delta * 7);

    for (let i = 0; i < petals.length; i += 1) {
      const { spec, handle } = petals[i];
      const group = groups.current[i];
      const mesh = meshes.current[i];
      if (!group || !mesh) continue;

      const local = Math.min(1, Math.max(0, (s.open - spec.delay) / 0.4));
      const eased = 1 - Math.pow(1 - local, 3);
      const settle = Math.sin(local * Math.PI) * 0.045 * (1 - local);
      const tilt =
        spec.tiltClosed + (spec.tiltOpen - spec.tiltClosed) * eased + settle;

      const wobble =
        Math.sin(t * 0.62 + spec.phase) * 0.55 +
        Math.sin(t * 1.41 + spec.phase * 1.7) * 0.28 +
        Math.sin(t * 2.3 + spec.phase * 2.4) * 0.1;

      group.rotation.y =
        spec.azimuth + Math.sin(t * 0.38 + spec.phase * 0.7) * amp * 0.4;
      group.position.y =
        spec.baseY + Math.sin(t * 0.7 + spec.phase) * 0.008 * s.sway;

      mesh.rotation.x = tilt + wobble * amp;
      mesh.rotation.y = Math.sin(t * 0.44 + spec.phase) * amp * 0.5;
      mesh.rotation.z = spec.roll + Math.sin(t * 0.9 + spec.phase * 1.3) * amp * 0.8;
      mesh.position.z = spec.radius * (1 + 0.22 * eased);

      const scale = spec.scale * (0.86 + 0.14 * eased);
      mesh.scale.setScalar(scale);

      handle.hover.value += (handle.hoverTarget.value - handle.hover.value) * smoothing;
      handle.sway.value = petalSway;
    }
  });

  return (
    <>
      {petals.map(({ spec, geometry, handle }, index) => (
        <group
          key={spec.id}
          ref={(node) => {
            groups.current[index] = node;
          }}
          rotation={[0, spec.azimuth, 0]}
        >
          <mesh
            ref={(node) => {
              meshes.current[index] = node;
            }}
            geometry={geometry}
            material={handle.material}
            position={[0, 0, spec.radius]}
            rotation={[spec.tiltClosed, 0, spec.roll]}
            onPointerOver={(event) => {
              event.stopPropagation();
              handle.hoverTarget.value = 1;
            }}
            onPointerOut={() => {
              handle.hoverTarget.value = 0;
            }}
          />
        </group>
      ))}
    </>
  );
}
