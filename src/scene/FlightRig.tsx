import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, PerspectiveCamera, Vector3 } from "three";
import { readFlightSettings } from "./flightSettings";
import { WORLD_HOME_PITCH, WORLD_HOME_POSITION, WORLD_HOME_YAW } from "./poses";
import type { SceneHandle } from "./types";

const MIN_Y = 1.5;
const MAX_Y = 6.15;
const MAX_RADIUS = 8.4;
const MAX_SPEED = 2.7;
const LOOK_SPEED = 0.00215;

const euler = new Euler(0, 0, 0, "YXZ");
const forward = new Vector3();
const flatForward = new Vector3();
const right = new Vector3();
const wish = new Vector3();

type Keys = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  q: boolean;
  e: boolean;
};

function emptyKeys(): Keys {
  return { w: false, a: false, s: false, d: false, q: false, e: false };
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function soften(position: Vector3, velocity: Vector3): void {
  const margin = 0.7;
  const lowGap = position.y - MIN_Y;
  if (lowGap < margin && velocity.y < 0) velocity.y *= Math.max(0, lowGap / margin);
  const highGap = MAX_Y - position.y;
  if (highGap < margin && velocity.y > 0) velocity.y *= Math.max(0, highGap / margin);
  if (position.y < MIN_Y) {
    position.y = MIN_Y;
    if (velocity.y < 0) velocity.y = 0;
  } else if (position.y > MAX_Y) {
    position.y = MAX_Y;
    if (velocity.y > 0) velocity.y = 0;
  }

  const flat = Math.hypot(position.x, position.z);
  if (flat < 0.0001) return;
  const radialGap = MAX_RADIUS - flat;
  const nx = position.x / flat;
  const nz = position.z / flat;
  if (radialGap < margin) {
    const outward = velocity.x * nx + velocity.z * nz;
    if (outward > 0) {
      const keep = Math.max(0, radialGap / margin);
      velocity.x -= nx * outward * (1 - keep);
      velocity.z -= nz * outward * (1 - keep);
    }
  }
  if (flat > MAX_RADIUS) {
    position.x *= MAX_RADIUS / flat;
    position.z *= MAX_RADIUS / flat;
    const outward = velocity.x * nx + velocity.z * nz;
    if (outward > 0) {
      velocity.x -= nx * outward;
      velocity.z -= nz * outward;
    }
  }
}

export function FlightRig({
  active,
  reducedMotion,
  sceneApi,
}: {
  active: boolean;
  reducedMotion: boolean;
  sceneApi: RefObject<SceneHandle | null>;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const activeRef = useRef(active);
  const reducedRef = useRef(reducedMotion);
  const keys = useRef<Keys>(emptyKeys());
  const yaw = useRef(WORLD_HOME_YAW);
  const pitch = useRef(WORLD_HOME_PITCH);
  const position = useRef(WORLD_HOME_POSITION.clone());
  const velocity = useRef(new Vector3());
  const returning = useRef(false);
  const dragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, moved: false });
  const wasActive = useRef(false);
  activeRef.current = active;
  reducedRef.current = reducedMotion;

  useEffect(() => {
    const perspective = camera instanceof PerspectiveCamera ? camera : null;
    if (!active) {
      if (perspective) {
        perspective.fov = 36;
        perspective.updateProjectionMatrix();
      }
      wasActive.current = false;
      return;
    }
    if (perspective) {
      perspective.fov = 48;
      perspective.updateProjectionMatrix();
    }
    if (!wasActive.current) {
      position.current.copy(camera.position);
      const current = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
      yaw.current = current.y;
      pitch.current = clamp(current.x, -1.05, 1.05);
      returning.current = true;
      velocity.current.set(0, 0, 0);
      wasActive.current = true;
    }
    invalidate();
  }, [active, camera, invalidate]);

  useEffect(() => {
    if (!active) return;
    const api = sceneApi;
    const resetView = () => {
      returning.current = true;
      velocity.current.set(0, 0, 0);
      invalidate();
    };
    api.current = { resetView, nudge() {} };
    return () => {
      api.current = null;
    };
  }, [active, invalidate, sceneApi]);

  useEffect(() => {
    const element = gl.domElement;

    const applyLook = (dx: number, dy: number) => {
      if (!activeRef.current) return;
      const look = readFlightSettings().look;
      yaw.current -= dx * LOOK_SPEED * look;
      pitch.current = clamp(pitch.current - dy * LOOK_SPEED * look, -1.05, 1.05);
      returning.current = false;
      invalidate();
    };

    const onLockMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== element) return;
      applyLook(event.movementX, event.movementY);
    };

    let lastX = 0;
    let lastY = 0;
    const onDown = (event: PointerEvent) => {
      if (!activeRef.current || event.button !== 0) return;
      dragging.current = true;
      lastX = event.clientX;
      lastY = event.clientY;
      dragOrigin.current = { x: event.clientX, y: event.clientY, moved: false };
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging.current || document.pointerLockElement === element) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      if (Math.hypot(event.clientX - dragOrigin.current.x, event.clientY - dragOrigin.current.y) > 4) {
        dragOrigin.current.moved = true;
      }
      if (dragOrigin.current.moved) applyLook(dx, dy);
    };
    const onUp = () => {
      dragging.current = false;
    };
    const onClick = () => {
      if (!activeRef.current || dragOrigin.current.moved) return;
      if (document.pointerLockElement === element) return;
      void element.requestPointerLock();
    };
    const onLeave = () => {
      dragging.current = false;
    };
    const onWheel = (event: WheelEvent) => {
      if (!activeRef.current || event.target !== element) return;
      event.preventDefault();
      const settings = readFlightSettings();
      const step = clamp(-event.deltaY * 0.0045 * settings.speed, -1.05, 1.05);
      euler.set(pitch.current, yaw.current, 0);
      forward.set(0, 0, -1).applyEuler(euler);
      position.current.addScaledVector(forward, step);
      soften(position.current, velocity.current);
      returning.current = false;
      invalidate();
    };

    const codeKey = (code: string): keyof Keys | null => {
      if (code === "KeyW") return "w";
      if (code === "KeyA") return "a";
      if (code === "KeyS") return "s";
      if (code === "KeyD") return "d";
      if (code === "KeyQ") return "q";
      if (code === "KeyE") return "e";
      return null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (event.key === "Escape") {
        dragging.current = false;
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }
      if (isTyping(event.target) || isTyping(document.activeElement)) return;
      if (event.code === "KeyR" && !event.repeat) {
        event.preventDefault();
        returning.current = true;
        velocity.current.set(0, 0, 0);
        invalidate();
        return;
      }
      const key = codeKey(event.code);
      if (!key || event.repeat) return;
      event.preventDefault();
      keys.current[key] = true;
      returning.current = false;
      invalidate();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = codeKey(event.code);
      if (!key) return;
      keys.current[key] = false;
    };
    const onBlur = () => {
      keys.current = emptyKeys();
      dragging.current = false;
    };

    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    element.addEventListener("pointerleave", onLeave);
    element.addEventListener("click", onClick);
    element.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onLockMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("click", onClick);
      element.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onLockMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (document.pointerLockElement === element) document.exitPointerLock();
    };
  }, [gl, invalidate]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    const step = Math.min(delta, 0.05);
    const settings = readFlightSettings();

    if (returning.current) {
      const blend = reducedRef.current ? 1 : 1 - Math.exp(-step * 2.4);
      position.current.lerp(WORLD_HOME_POSITION, blend);
      yaw.current += (WORLD_HOME_YAW - yaw.current) * blend;
      pitch.current += (WORLD_HOME_PITCH - pitch.current) * blend;
      velocity.current.multiplyScalar(1 - blend);
      const arrived =
        reducedRef.current ||
        (position.current.distanceTo(WORLD_HOME_POSITION) < 0.04 &&
          Math.abs(pitch.current - WORLD_HOME_PITCH) < 0.01);
      if (arrived) {
        position.current.copy(WORLD_HOME_POSITION);
        yaw.current = WORLD_HOME_YAW;
        pitch.current = WORLD_HOME_PITCH;
        velocity.current.set(0, 0, 0);
        returning.current = false;
      }
    } else {
      flatForward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      right.set(-flatForward.z, 0, flatForward.x);
      wish.set(0, 0, 0);
      const held = keys.current;
      if (held.w) wish.add(flatForward);
      if (held.s) wish.sub(flatForward);
      if (held.d) wish.add(right);
      if (held.a) wish.sub(right);
      if (held.e) wish.y += 1;
      if (held.q) wish.y -= 1;
      if (wish.lengthSq() > 1) wish.normalize();
      wish.multiplyScalar(MAX_SPEED * settings.speed);
      const rate = wish.lengthSq() > 0 ? 2.6 : 4.8;
      velocity.current.lerp(wish, 1 - Math.exp(-step * rate));
      if (velocity.current.lengthSq() < 0.00004) velocity.current.set(0, 0, 0);
      position.current.addScaledVector(velocity.current, step);
      soften(position.current, velocity.current);
    }

    euler.set(pitch.current, yaw.current, 0);
    camera.quaternion.setFromEuler(euler);
    camera.position.copy(position.current);
    const moving = velocity.current.lengthSq() > 0 || returning.current || Object.values(keys.current).some(Boolean);
    if (moving) invalidate();
  });

  return null;
}
