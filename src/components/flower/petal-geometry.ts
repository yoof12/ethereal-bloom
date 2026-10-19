import * as THREE from "three";

export interface PetalGeometryOptions {
  length: number;
  width: number;
  /** Depth of the cross-sectional cup. */
  cup: number;
  /** How far the petal bends away from the flower axis along its length. */
  curl: number;
  /** Total twist, in radians, from base to tip. */
  twist: number;
  /** Organic edge ripple. */
  ripple: number;
  /** Lateral sweep of the tip. */
  sweep?: number;
  seed: number;
  segmentsU?: number;
  segmentsV?: number;
  baseColor: THREE.ColorRepresentation;
  midColor: THREE.ColorRepresentation;
  tipColor: THREE.ColorRepresentation;
}

/**
 * Parametric petal surface. The base sits at the local origin and the petal
 * grows along +Y, so a mesh can be rotated around its own base like a real
 * petal hinged at the receptacle.
 */
export function createPetalGeometry(options: PetalGeometryOptions): THREE.BufferGeometry {
  const {
    length,
    width,
    cup,
    curl,
    twist,
    ripple,
    seed,
    baseColor,
    midColor,
    tipColor,
  } = options;
  const sweep = options.sweep ?? 0;
  const segmentsU = options.segmentsU ?? 26;
  const segmentsV = options.segmentsV ?? 14;
  const cols = segmentsV * 2 + 1;
  const rows = segmentsU + 1;

  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const colors = new Float32Array(rows * cols * 3);
  const indices: number[] = [];

  const base = new THREE.Color(baseColor);
  const mid = new THREE.Color(midColor);
  const tip = new THREE.Color(tipColor);
  const color = new THREE.Color();

  for (let j = 0; j < rows; j += 1) {
    const u = j / segmentsU;
    // Pointed base, broad middle, softly tapered tip.
    const shape = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.66)), 0.72);
    const halfWidth = Math.max(width * 0.045, width * 0.5 * shape);
    const bend = length * curl * (0.55 * u * u + 0.45 * Math.pow(u, 4));
    const twistAngle = twist * Math.pow(u, 1.25);
    const cosTwist = Math.cos(twistAngle);
    const sinTwist = Math.sin(twistAngle);
    const sweepOffset = sweep * length * u * u;
    const asymmetry = Math.sin(u * 3.1 + seed * 0.7) * length * 0.03 * u * u;

    for (let i = 0; i < cols; i += 1) {
      const v = i / segmentsV - 1;
      const absV = Math.abs(v);

      const x = v * halfWidth + sweepOffset + asymmetry;
      let z =
        bend +
        cup * halfWidth * (0.62 * v * v + 0.38 * Math.pow(absV, 5)) +
        width * 0.028 * (1 - v * v) * (0.4 + u);
      z +=
        ripple *
        length *
        0.03 *
        shape *
        (Math.sin(v * 3.4 + seed) * 0.6 +
          Math.sin(u * 6.2 + v * 1.7 + seed * 1.7) * 0.4);

      const rotatedX = x * cosTwist - z * sinTwist;
      const rotatedZ = x * sinTwist + z * cosTwist;

      const index = j * cols + i;
      positions[index * 3] = rotatedX;
      positions[index * 3 + 1] = u * length;
      positions[index * 3 + 2] = rotatedZ;

      uvs[index * 2] = (v + 1) * 0.5;
      uvs[index * 2 + 1] = u;

      if (u < 0.55) {
        color.copy(base).lerp(mid, u / 0.55);
      } else {
        color.copy(mid).lerp(tip, (u - 0.55) / 0.45);
      }
      color.lerp(tip, absV * 0.07 * u);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
  }

  for (let j = 0; j < segmentsU; j += 1) {
    for (let i = 0; i < segmentsV * 2; i += 1) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}
