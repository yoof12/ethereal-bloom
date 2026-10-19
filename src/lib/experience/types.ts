export type ExperienceMode = "dream" | "radiance";

export type QualityTier = "high" | "medium" | "low";

/**
 * Mutable state shared between the DOM interface, the GSAP timeline and the
 * render loop. It is intentionally *not* React state: the scene writes to it
 * every frame and must never trigger a re-render.
 */
export interface ExperienceState {
  /** The flower materialising into the scene at the very beginning. */
  appear: number;
  /** Phase A: particles, bud light, stem visibility. */
  awake: number;
  /** Phase B: petal unfolding, 0 (closed bud) → 1 (full bloom). */
  open: number;
  /** Phase C: golden heart reveal. */
  core: number;
  /** Phase D: idle motion amplitude. */
  sway: number;
  /** Slow autonomous camera orbit gate. */
  orbit: number;
  /** Decaying click / interaction flash. */
  pulse: number;
  /** Token that asks the burst system to retrigger. */
  burstToken: number;
  /** 1 = Dream, 0 = Radiance. Tweened so mode switches never pop. */
  dream: number;
  /** Smoothed pointer position in [-1, 1]. */
  parallaxX: number;
  parallaxY: number;
  /** Camera spherical coordinates (radians) and distance multiplier. */
  azimuth: number;
  polar: number;
  zoom: number;
  targetY: number;
  /** Pixels travelled during the current drag, used to suppress clicks. */
  dragDistance: number;
}

export interface EnvironmentInfo {
  quality: QualityTier;
  reducedMotion: boolean;
  touch: boolean;
  webgl: boolean;
}
