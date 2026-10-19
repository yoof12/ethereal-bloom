"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ExperienceState } from "./types";

const MASTER_VOLUME = 0.85;
const CHORD_SECONDS = 16;

/**
 * A slow, luminous progression in D major. The pad glides between these
 * voicings instead of retriggering, so the bed never pulses mechanically.
 */
const CHORDS = [
  [50, 57, 62, 66, 69], // Dmaj9
  [47, 54, 57, 62, 64], // Bm11
  [43, 50, 54, 59, 62], // Gmaj9
  [45, 52, 57, 62, 64], // A6/9
] as const;

/** D major pentatonic across the upper register, used for glass bells. */
const PENTATONIC = [74, 76, 78, 81, 83, 86, 88];

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface Voice {
  a: OscillatorNode;
  b: OscillatorNode;
}

interface ScoreEngine {
  ctx: AudioContext;
  master: GainNode;
  mix: GainNode;
  padGain: GainNode;
  padFilter: BiquadFilterNode;
  voices: Voice[];
  oscillators: OscillatorNode[];
  noiseBuffer: AudioBuffer;
  chordIndex: number;
  chordTimer: number;
  bellTimer: number;
  monitorTimer: number;
  lastOpen: number;
  lastSwellAt: number;
  muted: boolean;
  disposed: boolean;
}

function createReverbImpulse(ctx: AudioContext): AudioBuffer {
  const seconds = 3.4;
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
  }

  return impulse;
}

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }

  return buffer;
}

function playBell(
  engine: ScoreEngine,
  when: number,
  midi: number,
  velocity: number,
) {
  const { ctx, mix } = engine;
  const frequency = midiToHz(midi);

  const fundamental = ctx.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.value = frequency;

  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = frequency * 2.004;

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.18;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(0.1 * velocity, when + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + 3.4);

  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.2 - 0.6;

  fundamental.connect(envelope);
  overtone.connect(overtoneGain);
  overtoneGain.connect(envelope);
  envelope.connect(pan);
  pan.connect(mix);

  fundamental.start(when);
  overtone.start(when);
  fundamental.stop(when + 3.6);
  overtone.stop(when + 3.6);
}

function playBloomSwell(engine: ScoreEngine) {
  if (engine.disposed) return;

  const { ctx, mix, noiseBuffer } = engine;
  const now = ctx.currentTime;

  // One swell every few seconds at most, so replaying cannot stack them.
  if (now - engine.lastSwellAt < 4) return;
  engine.lastSwellAt = now;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.85;
  band.frequency.setValueAtTime(220, now);
  band.frequency.exponentialRampToValueAtTime(2400, now + 2.4);
  band.frequency.exponentialRampToValueAtTime(560, now + 6.6);

  const airGain = ctx.createGain();
  airGain.gain.setValueAtTime(0.0001, now);
  airGain.gain.exponentialRampToValueAtTime(0.12, now + 1.9);
  airGain.gain.exponentialRampToValueAtTime(0.0001, now + 6.9);

  const pan = ctx.createStereoPanner();
  pan.pan.value = 0;

  noise.connect(band);
  band.connect(airGain);
  airGain.connect(pan);
  pan.connect(mix);

  noise.start(now);
  noise.stop(now + 7.1);

  // A low, warm bloom underneath the air.
  const low = ctx.createOscillator();
  low.type = "sine";
  low.frequency.value = midiToHz(38);

  const lowGain = ctx.createGain();
  lowGain.gain.setValueAtTime(0.0001, now);
  lowGain.gain.exponentialRampToValueAtTime(0.055, now + 2.2);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 7);

  low.connect(lowGain);
  lowGain.connect(mix);
  low.start(now);
  low.stop(now + 7.2);
}

function scheduleNextBell(engine: ScoreEngine, state: RefObject<ExperienceState>) {
  if (engine.disposed) return;

  const open = state.current.open;
  const delay =
    open < 0.95
      ? 1000 + Math.random() * 1600
      : 2800 + Math.random() * 4200;

  if (!engine.muted && open > 0.12) {
    const midi = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    const velocity = open < 0.95 ? 0.55 + Math.random() * 0.45 : 0.35 + Math.random() * 0.45;
    playBell(engine, engine.ctx.currentTime + 0.05, midi, velocity);
  }

  engine.bellTimer = window.setTimeout(
    () => scheduleNextBell(engine, state),
    delay,
  );
}

function buildEngine(ctx: AudioContext): ScoreEngine {
  const now = ctx.currentTime;
  const oscillators: OscillatorNode[] = [];

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(MASTER_VOLUME, now + 4.2);
  master.connect(ctx.destination);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 16;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.3;
  compressor.connect(master);

  const mix = ctx.createGain();
  mix.gain.value = 1;
  mix.connect(compressor);

  const convolver = ctx.createConvolver();
  convolver.buffer = createReverbImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.42;
  mix.connect(convolver);
  convolver.connect(wet);
  wet.connect(compressor);

  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 460;
  padFilter.Q.value = 0.55;

  const padGain = ctx.createGain();
  padGain.gain.value = 0.0001;
  padFilter.connect(padGain);
  padGain.connect(mix);

  const voices: Voice[] = [];
  const voiceGainValue = 0.055;

  CHORDS[0].forEach((midi, index) => {
    const frequency = midiToHz(midi);

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.value = frequency;
    a.detune.value = -4 - index * 1.6;

    const b = ctx.createOscillator();
    b.type = "triangle";
    b.frequency.value = frequency;
    b.detune.value = 5 + index * 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(
      voiceGainValue,
      now + 5.5 + index * 0.45,
    );

    const pan = ctx.createStereoPanner();
    pan.pan.value = index % 2 === 0 ? -0.38 : 0.38;

    a.connect(gain);
    b.connect(gain);
    gain.connect(pan);
    pan.connect(padFilter);

    a.start(now);
    b.start(now);
    oscillators.push(a, b);
    voices.push({ a, b });
  });

  // Sub drone: D2 + A2.
  [38, 45].forEach((midi, index) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = midiToHz(midi);

    const gain = ctx.createGain();
    gain.gain.value = index === 0 ? 0.045 : 0.022;

    osc.connect(gain);
    gain.connect(mix);
    osc.start(now);
    oscillators.push(osc);
  });

  // A high, slowly breathing shimmer above the pad.
  const shimmer = ctx.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = midiToHz(93);

  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.012;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;

  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.008;

  shimmer.connect(shimmerGain);
  shimmerGain.connect(mix);
  lfo.connect(lfoDepth);
  lfoDepth.connect(shimmerGain.gain);

  shimmer.start(now);
  lfo.start(now);
  oscillators.push(shimmer, lfo);

  const engine: ScoreEngine = {
    ctx,
    master,
    mix,
    padGain,
    padFilter,
    voices,
    oscillators,
    noiseBuffer: createNoiseBuffer(ctx, 8),
    chordIndex: 0,
    chordTimer: 0,
    bellTimer: 0,
    monitorTimer: 0,
    lastOpen: 0,
    lastSwellAt: -100,
    muted: false,
    disposed: false,
  };

  // Glide to the next voicing before the previous one is fully gone.
  engine.chordTimer = window.setInterval(() => {
    if (engine.disposed) return;
    engine.chordIndex = (engine.chordIndex + 1) % CHORDS.length;
    const chord = CHORDS[engine.chordIndex];
    const when = ctx.currentTime + 0.05;

    engine.voices.forEach((voice, index) => {
      const frequency = midiToHz(chord[index % chord.length]);
      voice.a.frequency.setTargetAtTime(frequency, when, 2.6);
      voice.b.frequency.setTargetAtTime(frequency, when, 2.6);
    });
  }, CHORD_SECONDS * 1000);

  return engine;
}

export interface AmbientScore {
  soundOn: boolean;
  toggleSound: () => void;
}

export function useAmbientScore(
  state: RefObject<ExperienceState>,
  enabled: boolean,
): AmbientScore {
  const engineRef = useRef<ScoreEngine | null>(null);
  const soundOnRef = useRef(false);
  const [soundOn, setSoundOn] = useState(false);

  const start = useCallback(() => {
    if (!enabled) return;

    const existing = engineRef.current;
    if (existing) {
      existing.muted = false;
      void existing.ctx.resume();
      existing.master.gain.setTargetAtTime(
        MASTER_VOLUME,
        existing.ctx.currentTime,
        0.4,
      );
      soundOnRef.current = true;
      setSoundOn(true);
      return;
    }

    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioContextClass();
    } catch {
      return;
    }

    void ctx.resume();

    const engine = buildEngine(ctx);
    engine.lastOpen = state.current.open;
    engineRef.current = engine;

    if (state.current.open < 0.9) {
      playBloomSwell(engine);
    }

    scheduleNextBell(engine, state);

    engine.monitorTimer = window.setInterval(() => {
      if (engine.disposed) return;
      const s = state.current;
      const now = ctx.currentTime;
      const radiance = 1 - s.dream;

      engine.padGain.gain.setTargetAtTime(
        0.3 + s.core * 0.07 + radiance * 0.05,
        now,
        0.7,
      );
      engine.padFilter.frequency.setTargetAtTime(
        420 + s.open * 850 + s.core * 620 + radiance * 240,
        now,
        0.8,
      );

      // Replaying the bloom closes the petals; answer with a fresh swell.
      if (s.open < engine.lastOpen - 0.45) {
        playBloomSwell(engine);
      }
      engine.lastOpen = s.open;
    }, 320);

    soundOnRef.current = true;
    setSoundOn(true);
  }, [enabled, state]);

  const toggleSound = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      start();
      return;
    }

    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    engine.muted = !next;
    engine.master.gain.setTargetAtTime(
      next ? MASTER_VOLUME : 0.0001,
      engine.ctx.currentTime,
      0.35,
    );
    if (next) void engine.ctx.resume();
  }, [start]);

  // Autoplay rules require a gesture. The first tap, key press or drag starts
  // the score; the dedicated sound button handles itself.
  useEffect(() => {
    if (!enabled) return;

    const onGesture = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-sound-toggle]")) {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
        return;
      }

      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      start();
    };

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [enabled, start]);

  // Mobile Safari suspends the context when the page is backgrounded.
  useEffect(() => {
    const resume = () => {
      const engine = engineRef.current;
      if (engine && !engine.muted && engine.ctx.state === "suspended") {
        void engine.ctx.resume();
      }
    };

    window.addEventListener("pointerdown", resume, { passive: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, []);

  useEffect(
    () => () => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.disposed = true;
      window.clearInterval(engine.chordTimer);
      window.clearInterval(engine.monitorTimer);
      window.clearTimeout(engine.bellTimer);
      engine.oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // Already stopped; nothing to do.
        }
      });
      void engine.ctx.close();
      engineRef.current = null;
    },
    [],
  );

  return { soundOn, toggleSound };
}
