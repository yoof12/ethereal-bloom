import { mulberry32, range } from "@/lib/experience/random";
import type { PetalGeometryOptions } from "./petal-geometry";

export interface PetalSpec {
  id: string;
  layer: number;
  azimuth: number;
  tiltClosed: number;
  tiltOpen: number;
  radius: number;
  baseY: number;
  /** Fraction of the global opening progress before this petal starts. */
  delay: number;
  roll: number;
  phase: number;
  veinPhase: number;
  scale: number;
  tint: string;
  geometry: PetalGeometryOptions;
}

interface LayerConfig {
  count: number;
  length: number;
  width: number;
  cup: number;
  curl: number;
  twist: number;
  ripple: number;
  tiltClosed: number;
  tiltOpen: number;
  radius: number;
  baseY: number;
  delay: number;
  tint: string;
  baseColor: string;
  midColor: string;
  tipColor: string;
}

const PALETTE = {
  deep: "#3a1f8c",
  violet: "#6f4bd8",
  lilac: "#b79bff",
  pink: "#ffc0ea",
  ice: "#cfe0ff",
};

const LAYERS: LayerConfig[] = [
  {
    count: 9,
    length: 2.1,
    width: 1.16,
    cup: 0.5,
    curl: 0.62,
    twist: 0.5,
    ripple: 0.85,
    tiltClosed: 0.16,
    tiltOpen: 1.28,
    radius: 0.1,
    baseY: -0.04,
    delay: 0,
    tint: "#d6dcff",
    baseColor: PALETTE.deep,
    midColor: PALETTE.violet,
    tipColor: PALETTE.ice,
  },
  {
    count: 11,
    length: 1.74,
    width: 0.98,
    cup: 0.55,
    curl: 0.55,
    twist: 0.62,
    ripple: 0.9,
    tiltClosed: 0.12,
    tiltOpen: 1.04,
    radius: 0.095,
    baseY: 0.01,
    delay: 0.12,
    tint: "#e2c9ff",
    baseColor: PALETTE.deep,
    midColor: "#8256e8",
    tipColor: PALETTE.lilac,
  },
  {
    count: 13,
    length: 1.3,
    width: 0.82,
    cup: 0.6,
    curl: 0.48,
    twist: 0.72,
    ripple: 0.95,
    tiltClosed: 0.1,
    tiltOpen: 0.9,
    radius: 0.09,
    baseY: 0.06,
    delay: 0.24,
    tint: "#f2c9ff",
    baseColor: "#421f8f",
    midColor: "#9a5ce8",
    tipColor: PALETTE.pink,
  },
  {
    count: 12,
    length: 0.9,
    width: 0.64,
    cup: 0.64,
    curl: 0.4,
    twist: 0.82,
    ripple: 1,
    tiltClosed: 0.08,
    tiltOpen: 0.88,
    radius: 0.085,
    baseY: 0.1,
    delay: 0.36,
    tint: "#ffd2f1",
    baseColor: "#4a218f",
    midColor: "#b260e0",
    tipColor: "#ffd9f4",
  },
  {
    count: 9,
    length: 0.58,
    width: 0.42,
    cup: 0.7,
    curl: 0.32,
    twist: 0.9,
    ripple: 1,
    tiltClosed: 0.05,
    tiltOpen: 0.7,
    radius: 0.075,
    baseY: 0.13,
    delay: 0.46,
    tint: "#ffe0c4",
    baseColor: "#5b2684",
    midColor: "#c86bc0",
    tipColor: "#ffe6c8",
  },
];

const TAU = Math.PI * 2;

export function createPetalSpecs(quality: "high" | "medium" | "low"): PetalSpec[] {
  const specs: PetalSpec[] = [];
  const detailScale = quality === "high" ? 1 : quality === "medium" ? 0.75 : 0.55;

  LAYERS.forEach((layer, layerIndex) => {
    const random = mulberry32(9137 + layerIndex * 271);

    for (let i = 0; i < layer.count; i += 1) {
      const azimuth =
        (i / layer.count) * TAU + layerIndex * 0.42 + range(random, -0.055, 0.055);
      const lengthJitter = range(random, 0.93, 1.07);
      const widthJitter = range(random, 0.92, 1.08);

      specs.push({
        id: `petal-${layerIndex}-${i}`,
        layer: layerIndex,
        azimuth,
        tiltClosed: layer.tiltClosed + range(random, -0.012, 0.012),
        tiltOpen: layer.tiltOpen + range(random, -0.07, 0.07),
        radius: layer.radius + range(random, -0.012, 0.012),
        baseY: layer.baseY + range(random, -0.012, 0.012),
        delay: layer.delay + range(random, 0, 0.055),
        roll: range(random, -0.16, 0.16),
        phase: random() * TAU,
        veinPhase: random() * TAU,
        scale: range(random, 0.94, 1.05),
        tint: layer.tint,
        geometry: {
          length: layer.length * lengthJitter,
          width: layer.width * widthJitter,
          cup: layer.cup * range(random, 0.9, 1.1),
          curl: layer.curl * range(random, 0.88, 1.12),
          twist: layer.twist * range(random, 0.85, 1.15),
          ripple: layer.ripple * range(random, 0.7, 1.15),
          seed: random() * 20,
          sweep: range(random, -0.03, 0.03),
          segmentsU: Math.max(10, Math.round(26 * detailScale)),
          segmentsV: Math.max(6, Math.round(14 * detailScale)),
          baseColor: layer.baseColor,
          midColor: layer.midColor,
          tipColor: layer.tipColor,
        },
      });
    }
  });

  return specs;
}
