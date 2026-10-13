import { Component, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { THEME_TOKENS } from "../theme/tokens";
import { AbyssWorld } from "./AbyssWorld";
import { CameraRig } from "./CameraRig";
import { FallbackDiagram } from "./FallbackDiagram";
import { FlightRig } from "./FlightRig";
import { ProjectField } from "./ProjectField";
import type { SceneMode } from "./poses";
import type { AbyssSceneProps } from "./types";

type BoundaryProps = { children: ReactNode; fallback: ReactNode };
type BoundaryState = { failed: boolean };

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("BuildHub scene failed", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function Exposure({ value }: { value: number }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

function CanvasLabel({ mode, projectName }: { mode: SceneMode; projectName: string }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.domElement.setAttribute(
      "aria-label",
      mode === "universe"
        ? `Пространство проекта ${projectName}. Выберите объект мышью или пальцем.`
        : mode === "world"
          ? "Пространство Digital Abyss. WASD перемещает камеру, мышь поворачивает взгляд, Esc отпускает мышь."
          : "Живая сцена Digital Abyss",
    );
  }, [gl, mode, projectName]);
  return null;
}

function FrameWatcher({ token }: { token: string }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, token]);
  return null;
}

function SceneWorld(props: AbyssSceneProps) {
  const palette = THEME_TOKENS[props.theme].scene;
  const token = `${props.theme}:${props.quality}:${props.mode}:${props.selection.kind}:${props.compact ? "c" : "w"}`;
  const fogDensity = props.mode === "universe" ? palette.fogDensity : palette.fogDensity * 0.48;

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fogExp2 attach="fog" args={[palette.fog, fogDensity]} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={[5.5, 7.2, 3.4]} intensity={palette.keyIntensity} color={palette.key} />
      {props.quality === "high" && (
        <directionalLight position={[-6, 2.4, -3.2]} intensity={palette.rimIntensity} color={palette.rim} />
      )}
      {props.mode === "universe" ? (
        <ProjectField
          project={props.project}
          palette={palette}
          quality={props.quality}
          reducedMotion={props.reducedMotion}
          interactive={props.interactive}
          selection={props.selection}
          onSelect={props.onSelect}
          showLabels
        />
      ) : (
        <AbyssWorld palette={palette} quality={props.quality} reducedMotion={props.reducedMotion} />
      )}
      <CameraRig
        mode={props.mode}
        compact={props.compact}
        reducedMotion={props.reducedMotion}
        interactive={props.interactive}
        sceneApi={props.sceneApi}
      />
      <FlightRig active={props.mode === "world"} reducedMotion={props.reducedMotion} sceneApi={props.sceneApi} />
      <Exposure value={palette.exposure} />
      <CanvasLabel mode={props.mode} projectName={props.project.name} />
      <FrameWatcher token={token} />
    </>
  );
}

/** The only WebGL owner in the app. Landing, free flight, and a project share this canvas. */
export function AbyssScene(props: AbyssSceneProps) {
  const scene = props.webgl ? (
    <SceneErrorBoundary fallback={<FallbackDiagram {...props} />}>
      <Canvas
        dpr={props.quality === "high" ? [1, 1.6] : 1}
        frameloop={props.reducedMotion && props.mode !== "world" ? "demand" : "always"}
        gl={{ antialias: true, alpha: false, powerPreference: "default" }}
        camera={{ fov: 36, near: 0.1, far: 120, position: [0.8, 3.6, 15.5] }}
        style={{ width: "100%", height: "100%" }}
      >
        <SceneWorld {...props} />
      </Canvas>
    </SceneErrorBoundary>
  ) : (
    <FallbackDiagram {...props} />
  );

  return (
    <div className={`absolute inset-0 z-0 ${props.interactive ? "" : "pointer-events-none"}`}>{scene}</div>
  );
}
