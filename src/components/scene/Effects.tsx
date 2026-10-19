"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import type { QualityTier } from "@/lib/experience/types";

export function Effects({ quality }: { quality: QualityTier }) {
  const { state } = useExperience();
  const bloom = useRef<BloomEffect>(null);

  useFrame(() => {
    if (!bloom.current) return;
    const s = state.current;
    bloom.current.intensity =
      0.34 +
      s.core * 0.72 +
      s.pulse * 0.45 +
      (1 - s.dream) * 0.24 +
      s.awake * 0.1;
  });

  return (
    <EffectComposer multisampling={quality === "low" ? 0 : quality === "medium" ? 2 : 4}>
      <Bloom
        ref={bloom}
        mipmapBlur
        intensity={0.5}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.32}
        levels={quality === "low" ? 5 : 7}
      />
      <Vignette eskil={false} offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}
