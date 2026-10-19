"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import gsap from "gsap";
import { detectEnvironment } from "./environment";
import { useBloomTimeline } from "./use-bloom-timeline";
import type { EnvironmentInfo, ExperienceMode, ExperienceState } from "./types";

interface ExperienceContextValue {
  state: RefObject<ExperienceState>;
  env: EnvironmentInfo | null;
  ready: boolean;
  mode: ExperienceMode;
  announcement: string;
  setMode: (mode: ExperienceMode) => void;
  replay: () => void;
  pulse: () => void;
  markReady: () => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function createInitialState(): ExperienceState {
  return {
    appear: 0,
    awake: 0,
    open: 0,
    core: 0,
    sway: 0,
    orbit: 0,
    pulse: 0,
    burstToken: 0,
    dream: 1,
    parallaxX: 0,
    parallaxY: 0,
    azimuth: -0.62,
    polar: 1.42,
    zoom: 1.45,
    targetY: -0.05,
    dragDistance: 0,
  };
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const state = useRef<ExperienceState>(createInitialState());
  const [env, setEnv] = useState<EnvironmentInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<ExperienceMode>("dream");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Device capabilities and media queries can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(detectEnvironment());
  }, []);

  const replay = useBloomTimeline(
    state,
    Boolean(env?.webgl),
    Boolean(env?.reducedMotion),
  );

  // Mode changes are tweened on the shared state so lighting, bloom and
  // particle speed all cross-fade together.
  useEffect(() => {
    if (!env) return;
    const tween = gsap.to(state.current, {
      dream: mode === "dream" ? 1 : 0,
      duration: 1.9,
      ease: "sine.inOut",
      // "auto" only replaces conflicting tweens; `true` would kill the
      // awakening timeline because it shares the same state object.
      overwrite: "auto",
    });
    return () => {
      tween.kill();
    };
  }, [env, mode]);

  const setMode = useCallback((next: ExperienceMode) => {
    setModeState(next);
  }, []);

  const pulse = useCallback(() => {
    state.current.pulse = 1;
    state.current.burstToken += 1;
  }, []);

  const handleReplay = useCallback(() => {
    replay();
    setAnnouncement("The bloom begins again.");
  }, [replay]);

  const markReady = useCallback(() => {
    setReady(true);
  }, []);

  const value = useMemo<ExperienceContextValue>(
    () => ({
      state,
      env,
      ready,
      mode,
      announcement,
      setMode,
      replay: handleReplay,
      pulse,
      markReady,
    }),
    [env, ready, mode, announcement, setMode, handleReplay, pulse, markReady],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceContextValue {
  const value = useContext(ExperienceContext);
  if (!value) {
    throw new Error("useExperience must be used inside <ExperienceProvider>.");
  }
  return value;
}
