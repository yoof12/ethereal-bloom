"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "@/lib/experience/ExperienceProvider";

const MIN_ZOOM = 0.76;
const MAX_ZOOM = 1.42;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Custom camera controller: drag to orbit, wheel or pinch to zoom, pointer to
 * parallax. The awakening sequence drives the same spherical coordinates via
 * GSAP, so there is no second camera system fighting for control.
 */
export function CameraRig() {
  const { state, env } = useExperience();
  const { camera, gl, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  const input = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    lastX: 0,
    lastY: 0,
    pinchDistance: 0,
    zoomStart: 1,
    targetParallaxX: 0,
    targetParallaxY: 0,
  });

  useEffect(() => {
    const element = gl.domElement;
    element.style.touchAction = "none";

    // The camera belongs to the opening choreography until the bloom settles;
    // taking control earlier would fight the GSAP tween.
    const canOrbit = () =>
      Boolean(env?.reducedMotion) || state.current.sway >= 0.45;

    const onPointerDown = (event: PointerEvent) => {
      const i = input.current;
      i.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      state.current.dragDistance = 0;

      if (i.pointers.size === 1) {
        i.lastX = event.clientX;
        i.lastY = event.clientY;
      } else if (i.pointers.size === 2) {
        const points = Array.from(i.pointers.values());
        i.pinchDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        i.zoomStart = state.current.zoom;
      }

      element.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const i = input.current;
      const rect = element.getBoundingClientRect();
      i.targetParallaxX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      i.targetParallaxY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      if (!i.pointers.has(event.pointerId)) return;
      i.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (i.pointers.size === 2) {
        const points = Array.from(i.pointers.values());
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );

        if (i.pinchDistance > 0 && canOrbit()) {
          state.current.zoom = clamp(
            i.zoomStart / (distance / i.pinchDistance),
            MIN_ZOOM,
            MAX_ZOOM,
          );
        }
        return;
      }

      const dx = event.clientX - i.lastX;
      const dy = event.clientY - i.lastY;
      i.lastX = event.clientX;
      i.lastY = event.clientY;

      if (!canOrbit()) return;

      state.current.dragDistance += Math.abs(dx) + Math.abs(dy);
      state.current.azimuth -= dx * 0.005;
      state.current.polar = clamp(state.current.polar - dy * 0.0035, 0.62, 1.5);
    };

    const onPointerUp = (event: PointerEvent) => {
      input.current.pointers.delete(event.pointerId);
      if (input.current.pointers.size < 2) input.current.pinchDistance = 0;
    };

    const onPointerLeave = () => {
      input.current.targetParallaxX = 0;
      input.current.targetParallaxY = 0;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!canOrbit()) return;
      state.current.zoom = clamp(
        state.current.zoom + event.deltaY * 0.0009,
        MIN_ZOOM,
        MAX_ZOOM,
      );
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("pointerleave", onPointerLeave);
    element.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("wheel", onWheel);
    };
  }, [env?.reducedMotion, gl, state]);

  useFrame((_, delta) => {
    const s = state.current;
    const i = input.current;
    const smooth = Math.min(1, delta * 3.2);

    s.parallaxX += (i.targetParallaxX - s.parallaxX) * smooth;
    s.parallaxY += (i.targetParallaxY - s.parallaxY) * smooth;

    // A barely-there autonomous orbit keeps the scene alive without turning
    // the flower into a turntable.
    if (!env?.reducedMotion && s.orbit > 0) {
      s.azimuth += delta * 0.026 * s.orbit;
    }

    const aspect = size.width / Math.max(1, size.height);
    const portrait = aspect < 0.95;
    const baseDistance = portrait ? 11.9 : aspect > 1.35 ? 7.7 : 8.8;
    const fov = portrait ? 46 : 38;

    const perspective = camera as THREE.PerspectiveCamera;
    if (Math.abs(perspective.fov - fov) > 0.01) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }

    const distance = baseDistance * s.zoom;
    const azimuth = s.azimuth + s.parallaxX * 0.055;
    const polar = clamp(s.polar + s.parallaxY * 0.025, 0.6, 1.55);
    // Portrait screens give the bloom the whole width and centre it
    // vertically, leaving the lower edge free for the controls.
    const targetY = s.targetY + (portrait ? 0.34 : 0);

    target.set(0, targetY, 0);

    camera.position.set(
      Math.sin(polar) * Math.sin(azimuth) * distance,
      targetY + Math.cos(polar) * distance,
      Math.sin(polar) * Math.cos(azimuth) * distance,
    );
    camera.lookAt(target);
  });

  return null;
}
