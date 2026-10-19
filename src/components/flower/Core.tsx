"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import type { QualityTier } from "@/lib/experience/types";
import { mulberry32, range } from "@/lib/experience/random";

interface CoreProps {
  quality: QualityTier;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255, 246, 224, 1)");
    gradient.addColorStop(0.18, "rgba(255, 214, 150, 0.92)");
    gradient.addColorStop(0.45, "rgba(255, 168, 84, 0.36)");
    gradient.addColorStop(0.75, "rgba(255, 140, 60, 0.08)");
    gradient.addColorStop(1, "rgba(255, 120, 40, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Core({ quality }: CoreProps) {
  const { state } = useExperience();
  const group = useRef<THREE.Group>(null);
  const floretsMesh = useRef<THREE.InstancedMesh>(null);
  const filaments = useRef<THREE.InstancedMesh>(null);
  const tips = useRef<THREE.InstancedMesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);

  const floretCount = quality === "high" ? 96 : quality === "medium" ? 64 : 34;
  const filamentCount = quality === "high" ? 30 : quality === "medium" ? 22 : 14;

  const geometry = useMemo(
    () => ({
      core: new THREE.SphereGeometry(0.155, 32, 24),
      floret: new THREE.SphereGeometry(0.021, 6, 5),
      filament: new THREE.CylinderGeometry(0.0045, 0.0115, 1, 5, 1, false),
      tip: new THREE.SphereGeometry(0.026, 7, 6),
    }),
    [],
  );

  const materials = useMemo(
    () => ({
      core: new THREE.MeshPhysicalMaterial({
        color: "#3a1c06",
        roughness: 0.44,
        metalness: 0.25,
        emissive: new THREE.Color("#ff9b3d"),
        emissiveIntensity: 1.6,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
      }),
      floret: new THREE.MeshStandardMaterial({
        color: "#4a2508",
        roughness: 0.5,
        metalness: 0.2,
        emissive: new THREE.Color("#ffab52"),
        emissiveIntensity: 2.2,
      }),
      filament: new THREE.MeshStandardMaterial({
        color: "#4a2a0a",
        roughness: 0.45,
        metalness: 0.1,
        emissive: new THREE.Color("#ffc16b"),
        emissiveIntensity: 2.6,
      }),
      tip: new THREE.MeshStandardMaterial({
        color: "#5c2f08",
        roughness: 0.4,
        metalness: 0.1,
        emissive: new THREE.Color("#ffd88f"),
        emissiveIntensity: 4,
      }),
    }),
    [],
  );

  const glowTexture = useMemo(() => createGlowTexture(), []);

  const florets = useMemo(() => {
    const random = mulberry32(4421);
    const result: { position: THREE.Vector3; scale: number; color: THREE.Color }[] = [];

    for (let i = 0; i < floretCount; i += 1) {
      const y = -0.2 + (i / floretCount) * 1.1;
      const clamped = Math.min(y, 1);
      const radius = Math.sqrt(Math.max(0, 1 - clamped * clamped));
      const theta = i * GOLDEN_ANGLE;
      const r = 0.19 * radius;
      result.push({
        position: new THREE.Vector3(
          Math.cos(theta) * r,
          y * 0.17 + 0.01,
          Math.sin(theta) * r,
        ),
        scale: range(random, 0.7, 1.45),
        color: new THREE.Color().setHSL(
          range(random, 0.07, 0.11),
          range(random, 0.7, 0.95),
          range(random, 0.42, 0.66),
        ),
      });
    }

    return result;
  }, [floretCount]);

  const filData = useMemo(() => {
    const random = mulberry32(8821);
    return Array.from({ length: filamentCount }, (_, i) => ({
      azimuth: i * GOLDEN_ANGLE + range(random, -0.2, 0.2),
      tilt: range(random, 0.45, 1.05),
      length: range(random, 0.4, 0.64),
      phase: random() * Math.PI * 2,
      scale: range(random, 0.8, 1.2),
    }));
  }, [filamentCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  const emissiveColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const mesh = floretsMesh.current;
    if (!mesh) return;

    for (let i = 0; i < florets.length; i += 1) {
      const floret = florets[i];
      dummy.position.copy(floret.position);
      dummy.quaternion.identity();
      dummy.scale.setScalar(floret.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, floret.color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy, florets]);

  useEffect(
    () => () => {
      Object.values(geometry).forEach((item) => item.dispose());
      Object.values(materials).forEach((item) => item.dispose());
      glowTexture.dispose();
    },
    [geometry, glowTexture, materials],
  );

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const reveal = s.core;
    const heat = (0.22 + reveal * 0.72 + s.pulse * 1.1) * (0.95 + (1 - s.dream) * 0.22);

    if (group.current) {
      group.current.visible = reveal > 0.004;
      group.current.scale.setScalar(0.4 + 0.6 * reveal);
      group.current.rotation.y += delta * (0.05 + 0.1 * s.sway);
    }

    const filamentMesh = filaments.current;
    const tipMesh = tips.current;

    if (filamentMesh && tipMesh) {
      const flutter = 0.02 + 0.05 * s.sway;

      for (let i = 0; i < filData.length; i += 1) {
        const data = filData[i];
        const tilt =
          THREE.MathUtils.lerp(0.12, data.tilt, reveal) +
          Math.sin(t * 1.1 + data.phase) * flutter;
        const azimuth =
          data.azimuth + Math.sin(t * 0.5 + data.phase * 1.7) * 0.06 * s.sway;
        const length = THREE.MathUtils.lerp(0.14, data.length, reveal);

        direction
          .set(
            Math.sin(tilt) * Math.sin(azimuth),
            Math.cos(tilt),
            Math.sin(tilt) * Math.cos(azimuth),
          )
          .normalize();

        euler.set(tilt, azimuth, 0);
        dummy.quaternion.setFromEuler(euler);
        dummy.position.copy(direction).multiplyScalar(length * 0.5 + 0.03);
        dummy.scale.set(1, length, 1);
        dummy.updateMatrix();
        filamentMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.copy(direction).multiplyScalar(length + 0.05);
        dummy.quaternion.identity();
        dummy.scale.setScalar(data.scale);
        dummy.updateMatrix();
        tipMesh.setMatrixAt(i, dummy.matrix);
      }

      filamentMesh.instanceMatrix.needsUpdate = true;
      tipMesh.instanceMatrix.needsUpdate = true;
    }

    materials.core.emissiveIntensity = 0.5 + heat * 1.1;
    materials.floret.emissiveIntensity = 0.4 + heat * 1.4;
    materials.filament.emissiveIntensity = 0.3 + heat * 1.6;
    materials.tip.emissiveIntensity = 0.6 + heat * 2.2;

    emissiveColor.setRGB(1, 0.72 + (1 - s.dream) * 0.08, 0.42 - (1 - s.dream) * 0.06);
    materials.floret.emissive.copy(emissiveColor);

    if (glow.current) {
      glow.current.scale.setScalar(0.8 + reveal * 0.55 + s.pulse * 0.7);
      const material = glow.current.material as THREE.SpriteMaterial;
      material.opacity = (0.06 + reveal * 0.3) * (0.85 + (1 - s.dream) * 0.25);
    }

    if (halo.current) {
      halo.current.scale.setScalar(1.9 + reveal * 1.0 + s.pulse * 1.2);
      const material = halo.current.material as THREE.SpriteMaterial;
      material.opacity = (0.02 + reveal * 0.07) * (0.85 + (1 - s.dream) * 0.4);
    }

    if (light.current) {
      light.current.intensity = (0.6 + reveal * 3.4 + s.pulse * 5) * (0.9 + (1 - s.dream) * 0.35);
    }
  });

  return (
    <group ref={group} position={[0, 0.06, 0]}>
      <mesh geometry={geometry.core} material={materials.core} position={[0, 0.05, 0]} />

      <instancedMesh
        ref={floretsMesh}
        args={[geometry.floret, materials.floret, floretCount]}
      />

      <instancedMesh
        ref={filaments}
        args={[geometry.filament, materials.filament, filamentCount]}
      />
      <instancedMesh ref={tips} args={[geometry.tip, materials.tip, filamentCount]} />

      <sprite ref={glow} scale={[0.8, 0.8, 0.8]}>
        <spriteMaterial
          map={glowTexture}
          color="#ffc780"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite ref={halo} scale={[2.4, 2.4, 2.4]}>
        <spriteMaterial
          map={glowTexture}
          color="#ff9d55"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <pointLight
        ref={light}
        color="#ffb266"
        intensity={0}
        distance={7}
        decay={2}
        position={[0, 0.1, 0]}
      />
    </group>
  );
}
