import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MOUSE, TOUCH } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pointerDragged } from "./pointer";
import { poseFor, type SceneMode } from "./poses";
import type { SceneHandle } from "./types";

type CameraRigProps = {
  mode: SceneMode;
  compact: boolean;
  reducedMotion: boolean;
  interactive: boolean;
  sceneApi: RefObject<SceneHandle | null>;
};

export function CameraRig({ mode, compact, reducedMotion, interactive, sceneApi }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const controlsRef = useRef<OrbitControls | null>(null);
  const intro = useRef(true);
  const modeRef = useRef(mode);
  const compactRef = useRef(compact);
  const reducedRef = useRef(reducedMotion);
  const interactiveRef = useRef(interactive);
  useLayoutEffect(() => {
    const entered = modeRef.current !== mode || compactRef.current !== compact;
    modeRef.current = mode;
    compactRef.current = compact;
    reducedRef.current = reducedMotion;
    interactiveRef.current = interactive;
    if (entered) {
      intro.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
    invalidate();
  }, [compact, interactive, invalidate, mode, reducedMotion]);

  useEffect(() => {
    const element = gl.domElement;
    const controls = new OrbitControls(camera, element);
    controls.enableDamping = !reducedRef.current;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.75;
    controls.minDistance = 3.15;
    controls.maxDistance = 14;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.82;
    controls.zoomToCursor = false;
    controls.mouseButtons.LEFT = MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = null;
    controls.touches.ONE = TOUCH.ROTATE;
    controls.touches.TWO = TOUCH.DOLLY_PAN;
    controls.enabled = false;
    controlsRef.current = controls;
    element.style.touchAction = "none";

    const onChange = () => invalidate();
    const onStart = () => {
      intro.current = false;
    };
    controls.addEventListener("change", onChange);
    controls.addEventListener("start", onStart);

    let originX = 0;
    let originY = 0;
    let tracking = false;
    const onDown = (event: PointerEvent) => {
      tracking = true;
      originX = event.clientX;
      originY = event.clientY;
      pointerDragged.current = false;
    };
    const onMove = (event: PointerEvent) => {
      if (!tracking) return;
      if (Math.hypot(event.clientX - originX, event.clientY - originY) > 5) pointerDragged.current = true;
    };
    const onUp = () => {
      tracking = false;
    };
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);

    return () => {
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("start", onStart);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      controls.dispose();
      controlsRef.current = null;
      element.style.cursor = "";
    };
  }, [camera, gl, invalidate]);

  useEffect(() => {
    sceneApi.current = {
      resetView() {
        intro.current = true;
        if (controlsRef.current) controlsRef.current.enabled = false;
        invalidate();
      },
      nudge(yaw, pitch, dolly) {
        const controls = controlsRef.current;
        if (!controls || modeRef.current !== "universe" || !interactiveRef.current) return;
        intro.current = false;
        controls.enabled = true;
        const damping = controls.enableDamping;
        controls.enableDamping = false;
        if (yaw !== 0) controls.rotateLeft(yaw * 0.16);
        if (pitch !== 0) controls.rotateUp(pitch * 0.1);
        if (dolly > 0) controls.dollyIn(0.9);
        if (dolly < 0) controls.dollyOut(0.9);
        controls.enableDamping = damping;
        invalidate();
      },
    };
    return () => {
      sceneApi.current = null;
    };
  }, [invalidate, sceneApi]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const pose = poseFor(modeRef.current, compactRef.current);

    if (intro.current) {
      controls.enabled = false;
      const step = reducedRef.current ? 1 : 1 - Math.exp(-delta * 2.5);
      camera.position.lerp(pose.position, step);
      controls.target.lerp(pose.target, step);
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = damping;
      const arrived =
        camera.position.distanceTo(pose.position) < 0.03 && controls.target.distanceTo(pose.target) < 0.03;
      if (arrived || reducedRef.current) {
        camera.position.copy(pose.position);
        controls.target.copy(pose.target);
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = !reducedRef.current;
        intro.current = false;
        controls.enabled = modeRef.current === "universe" && interactiveRef.current;
      }
      invalidate();
      return;
    }

    if (modeRef.current === "landing" && !reducedRef.current) {
      const time = performance.now() / 1000;
      const driftX = pose.position.x + Math.sin(time * 0.12) * 0.55;
      const driftY = pose.position.y + Math.sin(time * 0.16) * 0.08;
      const driftZ = pose.position.z + Math.cos(time * 0.12) * 0.22;
      const blend = 1 - Math.exp(-delta * 0.65);
      camera.position.x += (driftX - camera.position.x) * blend;
      camera.position.y += (driftY - camera.position.y) * blend;
      camera.position.z += (driftZ - camera.position.z) * blend;
      controls.target.lerp(pose.target, blend);
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = damping;
      return;
    }

    controls.enabled = modeRef.current === "universe" && interactiveRef.current;
    controls.enableDamping = !reducedRef.current;
    if (controls.enabled && controls.enableDamping && controls.update()) invalidate();
  });

  return null;
}
