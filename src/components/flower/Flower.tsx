"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import type { QualityTier } from "@/lib/experience/types";
import { PetalLayer } from "./PetalLayer";
import { Core } from "./Core";
import { Stem } from "./Stem";
import { createPetalGeometry } from "./petal-geometry";
import { createPetalMaterial, createSharedPetalUniforms } from "./petal-material";
import type { SharedPetalUniforms } from "./petal-material";
import { createPetalSpecs } from "./petal-layout";
import { FLOWER_LOCAL_Y } from "./stem-geometry";

interface FlowerProps {
  quality: QualityTier;
}

const PLANT_BASE_Y = -3.2;
const SEPAL_COUNT = 5;

function Sepals({
  quality,
  shared,
}: {
  quality: QualityTier;
  shared: SharedPetalUniforms;
}) {
  const geometry = useMemo(
    () =>
      createPetalGeometry({
        length: 0.58,
        width: 0.22,
        cup: 0.5,
        curl: 0.35,
        twist: 0.3,
        ripple: 0.5,
        seed: 7.3,
        segmentsU: quality === "high" ? 16 : 10,
        segmentsV: quality === "high" ? 8 : 6,
        baseColor: "#082018",
        midColor: "#1d4d3a",
        tipColor: "#47906c",
      }),
    [quality],
  );

  const handle = useMemo(
    () =>
      createPetalMaterial({
        quality,
        shared,
        tint: "#a6e8c4",
        phase: 1.7,
        veinPhase: 3.1,
        crystal: 0,
        veinColor: "#8fe6bb",
        roughness: 0.34,
        transmission: 0.1,
        emissive: "#04150f",
      }),
    [quality, shared],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      handle.material.dispose();
    },
    [geometry, handle],
  );

  return (
    <>
      {Array.from({ length: SEPAL_COUNT }, (_, index) => (
        <group key={index} rotation={[0, (index / SEPAL_COUNT) * Math.PI * 2 + 0.3, 0]}>
          <mesh
            geometry={geometry}
            material={handle.material}
            position={[0, -0.05, 0.055]}
            rotation={[1.22, 0, 0]}
            scale={0.85}
          />
        </group>
      ))}
    </>
  );
}

export function Flower({ quality }: FlowerProps) {
  const { state, pulse } = useExperience();
  const plant = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const shared = useMemo(() => createSharedPetalUniforms(), []);
  const specs = useMemo(() => createPetalSpecs(quality), [quality]);
  const layers = useMemo(
    () => [0, 1, 2, 3, 4].map((layer) => specs.filter((spec) => spec.layer === layer)),
    [specs],
  );

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const t = clock.elapsedTime;

    shared.time.value = t;
    shared.glow.value =
      0.35 +
      s.appear * 0.3 +
      s.core * 1.05 +
      s.pulse * 1.5 +
      (1 - s.dream) * 0.4;

    s.pulse = Math.max(0, s.pulse - delta * 1.7);

    if (plant.current) {
      const amp = 0.006 + 0.022 * s.sway;
      const appear = s.appear;
      plant.current.scale.setScalar(0.9 + 0.1 * appear);
      plant.current.rotation.z =
        Math.sin(t * 0.31) * amp * 1.4 +
        s.parallaxX * 0.03 +
        (1 - appear) * 0.05;
      plant.current.rotation.x =
        Math.sin(t * 0.23 + 0.8) * amp * 0.8 - s.parallaxY * 0.018;
      plant.current.position.y =
        PLANT_BASE_Y - (1 - appear) * 0.18 + Math.sin(t * 0.5) * 0.012 * s.sway;
    }

    if (head.current) {
      head.current.rotation.y =
        s.parallaxX * 0.12 + Math.sin(t * 0.4) * 0.03 * s.sway;
      head.current.rotation.x =
        -s.parallaxY * 0.05 + Math.sin(t * 0.33 + 1) * 0.02 * s.sway;
    }
  });

  return (
    <group
      ref={plant}
      position={[0, PLANT_BASE_Y, 0]}
      onClick={(event) => {
        event.stopPropagation();
        if (state.current.dragDistance < 8) pulse();
      }}
    >
      <Stem shared={shared} quality={quality} />

      <group ref={head} position={[0, FLOWER_LOCAL_Y, 0]}>
        <Sepals quality={quality} shared={shared} />

        {layers.map((layerSpecs, index) => (
          <PetalLayer
            key={index}
            specs={layerSpecs}
            shared={shared}
            quality={quality}
          />
        ))}

        <Core quality={quality} />
      </group>
    </group>
  );
}
