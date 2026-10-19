import type { EnvironmentInfo, QualityTier } from "./types";

export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (!gl) return false;

    // Release the probe context immediately: browsers cap the number of live
    // WebGL contexts and a leaked probe counts against that budget.
    (gl as WebGLRenderingContext)
      .getExtension("WEBGL_lose_context")
      ?.loseContext();

    return true;
  } catch {
    return false;
  }
}

function detectQuality(touch: boolean): QualityTier {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const dpr = window.devicePixelRatio || 1;
  const narrow = window.innerWidth < 820;

  if (cores <= 3 || memory <= 2) return "low";
  if (touch || narrow || cores <= 5 || dpr > 2.5) return "medium";
  return "high";
}

export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === "undefined") {
    return { quality: "high", reducedMotion: false, touch: false, webgl: false };
  }

  const touch = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    quality: detectQuality(touch),
    reducedMotion,
    touch,
    webgl: supportsWebGL(),
  };
}
