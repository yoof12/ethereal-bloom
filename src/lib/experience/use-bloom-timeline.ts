"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import type { RefObject } from "react";
import type { ExperienceState } from "./types";

const START = {
  appear: 0,
  awake: 0,
  open: 0,
  core: 0,
  sway: 0,
  orbit: 0,
  pulse: 0,
  azimuth: -0.62,
  polar: 1.42,
  zoom: 1.45,
  targetY: -0.05,
} as const;

/**
 * Owns the one and only awakening timeline. Replaying restarts that same
 * timeline instead of stacking a new one, so animations can never double up.
 */
export function useBloomTimeline(
  state: RefObject<ExperienceState>,
  enabled: boolean,
  reducedMotion: boolean,
) {
  const replayRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;

    const s = state.current;
    gsap.killTweensOf(s);

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });

    tl.set(s, { ...START });

    // The flower itself materialises: a soft rise and a scale-up rather than
    // an abrupt cut to the scene.
    tl.to(s, { appear: 1, duration: 2.6, ease: "power2.out" }, 0);

    // Phase A — awakening: light gathers, the camera drifts closer.
    tl.to(s, { awake: 1, duration: 1.9, ease: "sine.out" }, 0);
    tl.to(s, { zoom: 1, duration: 6.1, ease: "power2.inOut" }, 0.15);
    tl.to(s, { polar: 1.28, duration: 6.3, ease: "power2.inOut" }, 0.15);
    tl.to(s, { azimuth: -0.24, duration: 6.6, ease: "sine.inOut" }, 0.15);
    tl.to(s, { targetY: 0.06, duration: 5.4, ease: "power2.inOut" }, 0.35);

    // Phase B — unfolding: outer petals lead, inner petals follow.
    tl.to(s, { open: 1, duration: 4.2, ease: "power1.inOut" }, 1.45);

    // Phase C — the golden heart, with one soft pulse and a particle wave.
    tl.to(s, { core: 1, duration: 2.1, ease: "sine.out" }, 5.0);
    tl.set(s, { pulse: 0.85 }, 5.05);
    tl.call(
      () => {
        s.burstToken += 1;
      },
      undefined,
      5.15,
    );

    // Phase D — full bloom, idle life and a very slow orbit.
    tl.to(s, { sway: 1, duration: 2.8, ease: "sine.inOut" }, 5.9);
    tl.to(s, { orbit: 1, duration: 3.2, ease: "sine.inOut" }, 6.2);

    if (reducedMotion) {
      // Reduced motion means no camera flight and no unfolding theatre:
      // the flower is simply present, with only a whisper of movement.
      tl.progress(1);
      gsap.set(s, { sway: 0.12, orbit: 0 });
    } else {
      tl.play(0);
    }

    replayRef.current = () => {
      if (reducedMotion) {
        // A gentle flash instead of a full re-animation.
        s.pulse = 1;
        s.burstToken += 1;
        return;
      }
      tl.restart(true);
    };

    return () => {
      tl.kill();
      gsap.killTweensOf(s);
      replayRef.current = () => {};
    };
  }, [enabled, reducedMotion, state]);

  return useCallback(() => replayRef.current(), []);
}
