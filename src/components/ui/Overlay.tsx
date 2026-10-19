"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import { useAmbientScore } from "@/lib/experience/use-ambient-score";
import { ReplayIcon } from "./ReplayIcon";
import { SoundIcon } from "./SoundIcon";
import styles from "./overlay.module.css";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Overlay({ staticPreview }: { staticPreview: boolean }) {
  const { state, mode, setMode, replay, announcement } = useExperience();
  const reduceMotion = useReducedMotion();
  const isStaticPreview = staticPreview;
  const { soundOn, toggleSound } = useAmbientScore(state, !isStaticPreview);

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 10, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: {
      delay: reduceMotion ? 0 : delay,
      duration: reduceMotion ? 0.01 : 1.6,
      ease: EASE,
    },
  });

  return (
    <div className={styles.overlay}>
      {isStaticPreview ? null : (
        <motion.button
          type="button"
          data-sound-toggle="true"
          className={`${styles.soundButton} ${soundOn ? styles.soundOn : ""}`}
          onClick={toggleSound}
          aria-label={soundOn ? "Mute ambient score" : "Play ambient score"}
          aria-pressed={soundOn}
          {...reveal(0.9)}
        >
          <SoundIcon muted={!soundOn} />
        </motion.button>
      )}

      {isStaticPreview ? null : (
        <motion.div className={styles.controls} {...reveal(1.6)}>
          <button
            type="button"
            className={styles.bloomButton}
            onClick={replay}
            aria-label="Replay the opening bloom"
          >
            <ReplayIcon />
            <span>Bloom Again</span>
          </button>

          <div className={styles.modes} role="group" aria-label="Atmosphere">
            <button
              type="button"
              className={`${styles.mode} ${mode === "dream" ? styles.modeActive : ""}`}
              aria-pressed={mode === "dream"}
              onClick={() => setMode("dream")}
            >
              Dream
            </button>
            <span className={styles.separator} aria-hidden="true" />
            <button
              type="button"
              className={`${styles.mode} ${mode === "radiance" ? styles.modeActive : ""}`}
              aria-pressed={mode === "radiance"}
              onClick={() => setMode("radiance")}
            >
              Radiance
            </button>
          </div>
        </motion.div>
      )}

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
