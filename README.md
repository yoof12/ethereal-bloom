# Ethereal Bloom

An immersive, real-time 3D flower: translucent iridescent petals with golden
veins unfolding around a luminous heart, floating in a midnight botanical
garden.

Built with Next.js, TypeScript, React Three Fiber, Three.js, GSAP and
Framer Motion. Every flower element is procedural — there are no external
models or textures to download.

## Running it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
npx tsc --noEmit
```

## Experience

- **Opening (≈9s):** the flower materialises, the camera drifts in, petals
  unfold layer by layer, then the golden heart awakens with a pulse.
- **Idle:** gentle stem sway, independent petal oscillation, breathing core,
  travelling vein pulses, drifting particles and a very slow orbit.
- **Interaction:** pointer parallax, drag to orbit, wheel / pinch to zoom,
  hover to highlight a petal, click or tap the bloom for a light pulse.
- **Bloom Again** replays the opening; **Dream / Radiance** cross-fade the
  lighting, core intensity and particle energy.
- **Sound:** an original ambient score generated with the Web Audio API —
  a D-major pad that glides between voicings, a sub drone, glass bells that
  thin out after the bloom, and an airy swell timed to the unfolding. It starts
  on the first tap (browser autoplay rules) and can be muted from the speaker
  button in the top-right corner.
- Reduced motion is respected, and a static SVG flower is shown when WebGL is
  unavailable.

## Structure

```
src/
  app/                       layout, page, global styles
  components/
    BloomExperience.tsx      canvas mount, error boundary, fallback
    flower/
      Flower.tsx             plant assembly, sway, shared uniform driver
      PetalLayer.tsx         one draw group of animated petals
      petal-geometry.ts      parametric curved petal surface
      petal-material.ts      physical material + vein/glow shader injection
      petal-layout.ts        layers, delays, palette, natural variation
      Core.tsx               golden heart, florets, filaments, glow, light
      Stem.tsx               tapered stem, leaves, calyx
      stem-geometry.ts       curved tube with vertex-colour gradient
    scene/
      Scene.tsx              renderer, environment, lighting, composition
      CameraRig.tsx          intro framing, orbit, zoom, parallax, touch
      Effects.tsx            bloom + vignette post-processing
      Particles.tsx          instanced/point bioluminescent dust
      GlowBurst.tsx          radial particle wave
      LightShafts.tsx        volumetric-looking background beams
      Lighting.tsx           mood lighting cross-fades
      Atmosphere.tsx         gradient dusk sphere
    ui/
      Overlay.tsx            wordmark and minimal controls
      FallbackFlower.tsx     no-WebGL SVG fallback
  lib/experience/
    ExperienceProvider.tsx   shared mutable state + mode/replay API
    use-bloom-timeline.ts    the single GSAP awakening timeline
    use-ambient-score.ts     generative Web Audio score + sound control
    environment.ts           quality tier, touch, reduced motion, WebGL probe
```

## Sharing to a phone

The production server listens on port 3000:

```bash
npm run build
npm run start
```

Expose it with ngrok (a free ngrok account and authtoken are required):

```bash
ngrok config add-authtoken <YOUR_TOKEN>
ngrok http 3000
```

If you do not have an ngrok account, Cloudflare Quick Tunnel works without
signing up:

```bash
cloudflared tunnel --url http://localhost:3000
```

Both tools print a public HTTPS URL that can be opened on a phone. Keep the
server and the tunnel running while you use it.

### Performance notes

- One shared animation state object is mutated per frame; React never
  re-renders during the render loop.
- Petals share generated geometries per layer and use a single shader program
  with per-petal uniforms.
- Particle counts, petal tessellation, transmission, DPR and post-processing
  scale with a device quality tier.
- The WebGL capability probe releases its context immediately so repeated
  navigation cannot exhaust the browser's context limit.
