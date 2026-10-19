"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import { Flower } from "@/components/flower/Flower";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { GlowBurst } from "./GlowBurst";
import { Lighting } from "./Lighting";
import { LightShafts } from "./LightShafts";
import { Particles } from "./Particles";

export function Scene() {
  const { env, markReady } = useExperience();
  const quality = env?.quality ?? "high";

  const dpr: [number, number] =
    quality === "high" ? [1, 1.75] : quality === "medium" ? [1, 1.5] : [1, 1.15];

  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 3.1, 10.5], fov: 38, near: 0.1, far: 100 }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
        gl.transmissionResolutionScale = quality === "high" ? 0.5 : 0.35;
        camera.lookAt(0, 0.2, 0);
        markReady();
      }}
    >
      <fogExp2 attach="fog" args={["#04050d", 0.022]} />

      <Atmosphere />

      <Suspense fallback={null}>
        <Environment resolution={quality === "low" ? 64 : 128} frames={1}>
          <color attach="background" args={["#020308"]} />
          <Lightformer
            form="circle"
            intensity={1.6}
            color="#6b5cff"
            scale={7}
            position={[-5, 3, -4]}
            target={[0, 0.5, 0]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#ffe3bd"
            scale={[4, 2.2, 1]}
            position={[3, 4, 3]}
            target={[0, 0.5, 0]}
          />
          <Lightformer
            form="ring"
            intensity={0.9}
            color="#9ec3ff"
            scale={3.5}
            position={[0, -1.5, 4]}
            target={[0, 0.5, 0]}
          />
          <Lightformer
            form="rect"
            intensity={0.7}
            color="#ff9be8"
            scale={[2.4, 3.2, 1]}
            position={[0, 1.5, -5]}
            target={[0, 0.5, 0]}
          />
        </Environment>
      </Suspense>

      <Lighting />

      <Flower quality={quality} />
      <Particles quality={quality} />
      <group position={[0, 0.55, 0]}>
        <GlowBurst />
      </group>
      <LightShafts />

      <CameraRig />

      {quality !== "low" ? <Effects quality={quality} /> : null}
    </Canvas>
  );
}
