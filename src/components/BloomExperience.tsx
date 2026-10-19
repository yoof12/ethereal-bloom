"use client";

import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useExperience } from "@/lib/experience/ExperienceProvider";
import { Scene } from "@/components/scene/Scene";
import { FallbackFlower } from "@/components/ui/FallbackFlower";
import { Overlay } from "@/components/ui/Overlay";
import styles from "./bloom.module.css";

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Ethereal Bloom could not start the 3D scene.", error, info);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function BloomExperience() {
  const { env, ready } = useExperience();
  const [sceneFailed, setSceneFailed] = useState(false);
  const staticPreview = Boolean(env && (!env.webgl || sceneFailed));

  return (
    <div className={styles.root}>
      <div
        className={`${styles.canvas} ${ready && !sceneFailed ? styles.canvasReady : ""}`}
        aria-hidden="true"
      >
        {env?.webgl && !sceneFailed ? (
          <SceneBoundary onError={() => setSceneFailed(true)}>
            <Scene />
          </SceneBoundary>
        ) : null}
      </div>

      {staticPreview ? <FallbackFlower /> : null}

      <p className="sr-only">
        An interactive three-dimensional flower made of translucent violet
        petals around a glowing golden heart. Move the pointer or drag to orbit
        the flower, scroll to change the distance, and select Bloom Again to
        replay the opening sequence.
      </p>

      <Overlay staticPreview={staticPreview} />
    </div>
  );
}
