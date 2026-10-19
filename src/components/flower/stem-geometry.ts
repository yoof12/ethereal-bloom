import * as THREE from "three";

export const STEM_HEIGHT = 3.45;
export const FLOWER_LOCAL_Y = 3.75;

export const STEM_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.11, 0.72, 0.06),
    new THREE.Vector3(-0.07, 1.52, -0.04),
    new THREE.Vector3(0.1, 2.32, 0.06),
    new THREE.Vector3(0.03, 3.14, 0.02),
    new THREE.Vector3(0, STEM_HEIGHT, 0),
  ],
  false,
  "catmullrom",
  0.5,
);

export interface StemGeometryResult {
  geometry: THREE.BufferGeometry;
  curve: THREE.CatmullRomCurve3;
}

export function createStemGeometry(): StemGeometryResult {
  const tubularSegments = 96;
  const radialSegments = 9;
  const geometry = new THREE.TubeGeometry(
    STEM_CURVE,
    tubularSegments,
    0.042,
    radialSegments,
    false,
  );

  const position = geometry.attributes.position as THREE.BufferAttribute;
  const ringSize = radialSegments + 1;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  for (let ring = 0; ring <= tubularSegments; ring += 1) {
    const t = ring / tubularSegments;
    center.set(0, 0, 0);

    for (let j = 0; j < ringSize; j += 1) {
      const index = ring * ringSize + j;
      vertex.fromBufferAttribute(position, index);
      center.add(vertex);
    }
    center.divideScalar(ringSize);

    // Thick at the base, slender at the neck.
    const taper = 1.15 - 0.72 * t;
    for (let j = 0; j < ringSize; j += 1) {
      const index = ring * ringSize + j;
      vertex.fromBufferAttribute(position, index);
      vertex.sub(center).multiplyScalar(taper).add(center);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }

  const colors = new Float32Array(position.count * 3);
  const baseColor = new THREE.Color("#0a1f1d");
  const midColor = new THREE.Color("#1d4b44");
  const tipColor = new THREE.Color("#3f8570");
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const t = THREE.MathUtils.clamp(position.getY(i) / STEM_HEIGHT, 0, 1);
    if (t < 0.6) {
      color.copy(baseColor).lerp(midColor, t / 0.6);
    } else {
      color.copy(midColor).lerp(tipColor, (t - 0.6) / 0.4);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return { geometry, curve: STEM_CURVE };
}
