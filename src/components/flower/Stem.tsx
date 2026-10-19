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
import { createStemGeometry, FLOWER_LOCAL_Y, STEM_CURVE } from "./stem-geometry";

interface StemProps {
  shared: SharedPetalUniforms;
  quality: QualityTier;
}

interface LeafConfig {
  t: number;
  azimuth: number;
  tilt: number;
  length: number;
  width: number;
  phase: number;
}

const LEAVES: LeafConfig[] = [
  { t: 0.34, azimuth: 0.55, tilt: 1.62, length: 1.05, width: 0.46, phase: 0.4 },
  { t: 0.52, azimuth: 2.7, tilt: 1.48, length: 0.9, width: 0.4, phase: 2.1 },
  { t: 0.7, azimuth: 4.6, tilt: 1.35, length: 0.76, width: 0.34, phase: 4.3 },
  { t: 0.83, azimuth: 1.9, tilt: 1.18, length: 0.6, width: 0.27, phase: 5.2 },
];

export function Stem({ shared, quality }: StemProps) {
  const { state } = useExperience();
  const group = useRef<THREE.Group>(null);
  const leafGroups = useRef<(THREE.Group | null)[]>([]);
  const leafMeshes = useRef<(THREE.Mesh | null)[]>([]);

  const stem = useMemo(() => createStemGeometry(), []);

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.38,
        metalness: 0.08,
        clearcoat: 0.7,
        clearcoatRoughness: 0.3,
        transmission: quality === "high" ? 0.12 : 0,
        thickness: 0.4,
        emissive: new THREE.Color("#04120f"),
        emissiveIntensity: 0.8,
        envMapIntensity: 1.1,
        side: THREE.DoubleSide,
      }),
    [quality],
  );

  const leaves = useMemo(
    () =>
      LEAVES.map((leaf) => {
        const point = STEM_CURVE.getPointAt(leaf.t);
        const geometry = createPetalGeometry({
          length: leaf.length,
          width: leaf.width,
          cup: 0.55,
          curl: 0.5,
          twist: 0.5,
          ripple: 0.9,
          seed: leaf.phase * 13.7,
          segmentsU: quality === "high" ? 20 : 13,
          segmentsV: quality === "high" ? 10 : 7,
          baseColor: "#0a2820",
          midColor: "#1d5c46",
          tipColor: "#4d9d78",
        });
        const handle = createPetalMaterial({
          quality,
          shared,
          tint: "#9fe8c7",
          phase: leaf.phase,
          veinPhase: leaf.phase * 2.3,
          crystal: 0,
          veinColor: "#9fe8c7",
          iridescence: 0.1,
          roughness: 0.32,
          transmission: quality === "high" ? 0.18 : 0,
          emissive: "#04140f",
        });
        return { leaf, point, geometry, handle };
      }),
    [quality, shared],
  );

  useEffect(
    () => () => {
      stem.geometry.dispose();
      stemMaterial.dispose();
      leaves.forEach(({ geometry, handle }) => {
        geometry.dispose();
        handle.material.dispose();
      });
    },
    [leaves, stem.geometry, stemMaterial],
  );

  useFrame(({ clock }) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const amp = 0.012 + 0.05 * s.sway;

    if (group.current) {
      group.current.rotation.x = Math.sin(t * 0.23) * amp * 0.35;
      group.current.rotation.z = Math.sin(t * 0.31 + 1.1) * amp * 0.5;
    }

    for (let i = 0; i < leaves.length; i += 1) {
      const g = leafGroups.current[i];
      const mesh = leafMeshes.current[i];
      if (!g || !mesh) continue;
      const leaf = leaves[i].leaf;
      g.rotation.z = Math.sin(t * 0.55 + leaf.phase) * amp * 0.6;
      g.rotation.x = Math.sin(t * 0.42 + leaf.phase * 1.3) * amp * 0.4;
      mesh.rotation.z =
        Math.sin(t * 0.8 + leaf.phase * 1.7) * amp * 0.8;
    }
  });

  return (
    <group ref={group}>
      <mesh
        geometry={stem.geometry}
        material={stemMaterial}
        rotation={[0, 0, 0]}
        castShadow={false}
      />
      {leaves.map(({ leaf, point, geometry, handle }, index) => (
        <group
          key={`leaf-${index}`}
          ref={(node) => {
            leafGroups.current[index] = node;
          }}
          position={[point.x, point.y, point.z]}
          rotation={[0, leaf.azimuth, 0]}
        >
          <mesh
            ref={(node) => {
              leafMeshes.current[index] = node;
            }}
            geometry={geometry}
            material={handle.material}
            rotation={[leaf.tilt, 0, 0]}
          />
        </group>
      ))}
      <mesh position={[0, FLOWER_LOCAL_Y - 0.02, 0]}>
        <sphereGeometry args={[0.115, 20, 16]} />
        <meshPhysicalMaterial
          color="#123a2d"
          roughness={0.5}
          metalness={0.1}
          clearcoat={0.5}
          emissive="#061913"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
