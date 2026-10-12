import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BackSide,
  BufferAttribute,
  CanvasTexture,
  Quaternion,
  Vector3,
  type Group,
} from "three";
import { allTasks, isOverdue, progressPercent } from "../lib/progress";
import { stagePresence, statusTone, taskAppearance, type StatusTone } from "../lib/taskVisual";
import type { Quality, ScenePalette } from "../theme/tokens";
import type { Selection, Stage as StageData, Task } from "../types/project";
import { pipOffset, stagePosition } from "./layout";
import { pointerDragged } from "./pointer";

const BUDGET = {
  high: { dust: 72, rings: 7, pillars: 5 },
  low: { dust: 22, rings: 4, pillars: 3 },
} as const;

const PILLARS: readonly { position: readonly [number, number, number]; height: number; thickness: number }[] = [
  { position: [-4.8, 0, -1.1], height: 3.6, thickness: 0.16 },
  { position: [-3.1, 0, 2.8], height: 2.3, thickness: 0.11 },
  { position: [5.1, 0, 0.6], height: 4.1, thickness: 0.14 },
  { position: [2.6, 0, -3.5], height: 2.7, thickness: 0.1 },
  { position: [-0.8, 0, -4.6], height: 1.9, thickness: 0.12 },
];

function ignoreRaycast() {
  return undefined;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createDust(count: number): Float32Array {
  const random = mulberry32(0x51a7);
  const array = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 1.8 + random() * 7.2;
    const angle = random() * Math.PI * 2;
    array[index * 3] = Math.cos(angle) * radius;
    array[index * 3 + 1] = (random() - 0.45) * 5.5;
    array[index * 3 + 2] = Math.sin(angle) * radius * 0.78;
  }
  return array;
}

function toneColor(tone: StatusTone, palette: ScenePalette): string {
  if (tone === "good") return palette.good;
  if (tone === "accent") return palette.accent;
  if (tone === "warn") return palette.warn;
  return palette.muted;
}

function makeLabelTexture(text: string, color: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  if (!context) return texture;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "500 64px 'Literata Variable', Palatino, serif";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 68);
  texture.needsUpdate = true;
  return texture;
}

function Pickable({
  interactive,
  onPick,
  children,
}: {
  interactive: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  const gl = useThree((state) => state.gl);
  const pick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!interactive || pointerDragged.current) return;
    onPick();
  };
  return (
    <group
      onClick={pick}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!interactive) return;
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

function Spinning({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!ref.current || speed === 0) return;
    ref.current.rotation.y += delta * speed;
  });
  return <group ref={ref}>{children}</group>;
}

function Dust({ count, color, motion }: { count: number; color: string; motion: boolean }) {
  const base = useMemo(() => createDust(count), [count]);
  const positions = useMemo(() => new Float32Array(base), [base]);
  const attribute = useRef<BufferAttribute>(null);

  useFrame(({ clock }) => {
    const current = attribute.current;
    if (!current || !motion) return;
    const time = clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      current.setY(index, base[index * 3 + 1] + Math.sin(time * 0.18 + index) * 0.07);
    }
    current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false} raycast={ignoreRaycast}>
      <bufferGeometry>
        <bufferAttribute ref={attribute} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.04} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

function Mist({ color, quality }: { color: string; quality: Quality }) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    const size = quality === "high" ? 256 : 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const next = new CanvasTexture(canvas);
    if (context) {
      const radius = size / 2;
      const gradient = context.createRadialGradient(radius, radius, radius * 0.08, radius, radius, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      next.needsUpdate = true;
    }
    setTexture(next);
    return () => next.dispose();
  }, [color, quality]);

  if (!texture) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.28, 0]} raycast={ignoreRaycast}>
      <circleGeometry args={[8, quality === "high" ? 48 : 24]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Well({ color, rings }: { color: string; rings: number }) {
  return (
    <group>
      {Array.from({ length: rings }, (_, index) => (
        <mesh
          key={index}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -1.02 - index * 0.2, 0]}
          raycast={ignoreRaycast}
        >
          <torusGeometry args={[1.35 + index * 0.62, 0.008, 6, rings > 4 ? 64 : 32]} />
          <meshBasicMaterial color={color} transparent opacity={Math.max(0.05, 0.32 - index * 0.04)} />
        </mesh>
      ))}
    </group>
  );
}

function Pillars({
  color,
  roughness,
  count,
}: {
  color: string;
  roughness: number;
  count: number;
}) {
  return (
    <group>
      {PILLARS.slice(0, count).map((pillar) => (
        <mesh
          key={`${pillar.position[0]}-${pillar.position[2]}`}
          position={[pillar.position[0], pillar.height / 2 - 1.2, pillar.position[2]]}
          raycast={ignoreRaycast}
        >
          <boxGeometry args={[pillar.thickness, pillar.height, pillar.thickness]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function Filament({
  end,
  color,
  opacity,
}: {
  end: readonly [number, number, number];
  color: string;
  opacity: number;
}) {
  const placement = useMemo(() => {
    const start = new Vector3(0, 0.15, 0);
    const finish = new Vector3(end[0], end[1], end[2]);
    const direction = finish.clone().sub(start);
    const length = Math.max(direction.length(), 0.001);
    const midpoint = start.clone().lerp(finish, 0.5);
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w] as [
        number,
        number,
        number,
        number,
      ],
      length,
    };
  }, [end]);

  return (
    <mesh
      position={placement.position}
      quaternion={placement.quaternion}
      scale={[1, placement.length, 1]}
      raycast={ignoreRaycast}
      frustumCulled={false}
    >
      <cylinderGeometry args={[0.012, 0.012, 1, 5]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function StageLabel({
  text,
  color,
  epoch,
  position,
}: {
  text: string;
  color: string;
  epoch: number;
  position: [number, number, number];
}) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    const next = makeLabelTexture(text, color);
    setTexture(next);
    return () => next.dispose();
  }, [color, epoch, text]);

  if (!texture) return null;
  return (
    <sprite position={position} scale={[1.2, 0.3, 1]} frustumCulled={false}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} opacity={0.92} />
    </sprite>
  );
}

function TaskPip({
  task,
  position,
  palette,
  interactive,
  selected,
  onPick,
}: {
  task: Task;
  position: [number, number, number];
  palette: ScenePalette;
  interactive: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const appearance = taskAppearance(task.status);
  const color = toneColor(statusTone(task.status), palette);
  const late = isOverdue(task);
  const radius = appearance.active ? 0.085 : appearance.wire ? 0.045 : 0.058;

  return (
    <Pickable interactive={interactive} onPick={onPick}>
      <group position={position}>
        <mesh raycast={ignoreRaycast}>
          <sphereGeometry args={[radius, 12, 12]} />
          {appearance.wire ? (
            <meshBasicMaterial color={color} wireframe transparent opacity={appearance.opacity} />
          ) : (
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={appearance.active ? 0.55 : selected ? 0.45 : 0.16}
              roughness={0.42}
              transparent
              opacity={appearance.opacity}
            />
          )}
        </mesh>
        {appearance.active && (
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <torusGeometry args={[0.13, 0.012, 8, 24]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>
        )}
        <mesh>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {late && (
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <torusGeometry args={[0.11, 0.008, 6, 18]} />
            <meshBasicMaterial color={palette.bad} />
          </mesh>
        )}
      </group>
    </Pickable>
  );
}

function StageObject({
  stage,
  position,
  palette,
  interactive,
  reducedMotion,
  selected,
  selection,
  showLabel,
  fontEpoch,
  onSelect,
}: {
  stage: StageData;
  position: [number, number, number];
  palette: ScenePalette;
  interactive: boolean;
  reducedMotion: boolean;
  selected: boolean;
  selection: Selection;
  showLabel: boolean;
  fontEpoch: number;
  onSelect: (selection: Selection) => void;
}) {
  const percent = progressPercent(stage.tasks);
  const presence = stagePresence(stage.tasks);
  const hasActiveTask = stage.tasks.some((item) => item.status === "in_progress");
  const radius = 0.34 + Math.min(stage.tasks.length, 4) * 0.03;
  const scale = presence === "complete" ? 1.08 : presence === "pending" ? 0.9 : 1;
  const speed = reducedMotion ? 0 : presence === "active" ? 0.28 : presence === "complete" ? 0.1 : 0;
  const horizontal = Math.hypot(position[0], position[2]) || 1;
  const labelPosition: [number, number, number] = [
    (position[0] / horizontal) * 0.62,
    0.64,
    (position[2] / horizontal) * 0.38,
  ];

  return (
    <group position={position} scale={scale}>
      <Pickable interactive={interactive} onPick={() => onSelect({ kind: "stage", stageId: stage.id })}>
        <Spinning speed={speed}>
          <mesh>
            <octahedronGeometry args={[radius, 0]} />
            {presence === "pending" ? (
              <meshBasicMaterial color={palette.accent} wireframe transparent opacity={selected ? 0.95 : 0.62} />
            ) : (
              <meshStandardMaterial
                color={palette.metal}
                metalness={0.7}
                roughness={palette.roughness}
                emissive={presence === "complete" ? palette.good : palette.accent}
                emissiveIntensity={selected ? 0.28 : hasActiveTask ? 0.24 : presence === "complete" ? 0.16 : 0.05}
              />
            )}
          </mesh>
        </Spinning>
        <mesh raycast={ignoreRaycast}>
          <sphereGeometry args={[radius + 0.16, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
          <torusGeometry args={[radius + 0.28, 0.006, 6, 40]} />
          <meshBasicMaterial color={palette.filament} transparent opacity={0.35} />
        </mesh>
        {percent > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <torusGeometry args={[radius + 0.28, 0.014, 8, 48, (percent / 100) * Math.PI * 2]} />
            <meshBasicMaterial color={presence === "complete" ? palette.good : palette.accent} />
          </mesh>
        )}
        {selected && (
          <mesh rotation={[Math.PI / 2.4, 0.4, 0]} raycast={ignoreRaycast}>
            <torusGeometry args={[radius + 0.46, 0.01, 8, 40]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.85} />
          </mesh>
        )}
      </Pickable>
      {stage.tasks.map((task, index) => (
        <TaskPip
          key={task.id}
          task={task}
          position={pipOffset(index, stage.tasks.length)}
          palette={palette}
          interactive={interactive}
          selected={selection.kind === "task" && selection.taskId === task.id}
          onPick={() => onSelect({ kind: "task", stageId: stage.id, taskId: task.id })}
        />
      ))}
      {showLabel && (
        <StageLabel text={stage.name} color={palette.ink} epoch={fontEpoch} position={labelPosition} />
      )}
    </group>
  );
}

function CoreObject({
  progress,
  palette,
  selected,
  reducedMotion,
  interactive,
  onPick,
}: {
  progress: number;
  palette: ScenePalette;
  selected: boolean;
  reducedMotion: boolean;
  interactive: boolean;
  onPick: () => void;
}) {
  return (
    <group position={[0, 0.15, 0]}>
      <Pickable interactive={interactive} onPick={onPick}>
        <Spinning speed={reducedMotion ? 0 : 0.12}>
          <mesh>
            <icosahedronGeometry args={[0.62, 1]} />
            <meshStandardMaterial
              color={palette.metal}
              metalness={0.82}
              roughness={palette.roughness}
              emissive={palette.accent}
              emissiveIntensity={selected ? 0.22 : palette.coreEmissive}
            />
          </mesh>
          <mesh raycast={ignoreRaycast}>
            <icosahedronGeometry args={[0.68, 1]} />
            <meshBasicMaterial color={palette.accent} wireframe transparent opacity={selected ? 0.72 : 0.28} />
          </mesh>
        </Spinning>
        <mesh raycast={ignoreRaycast}>
          <sphereGeometry args={[0.9, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2.35, 0.35, 0.15]} raycast={ignoreRaycast}>
          <torusGeometry args={[1.16, 0.008, 8, 64]} />
          <meshBasicMaterial color={palette.filament} transparent opacity={0.4} />
        </mesh>
        {progress > 0 && (
          <mesh rotation={[Math.PI / 2.35, 0.35, 0.15]} raycast={ignoreRaycast}>
            <torusGeometry args={[1.16, 0.016, 8, 80, (progress / 100) * Math.PI * 2]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>
        )}
        {selected && (
          <mesh rotation={[Math.PI / 3, 0, 0.4]} raycast={ignoreRaycast}>
            <torusGeometry args={[1.38, 0.01, 8, 64]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.75} />
          </mesh>
        )}
      </Pickable>
    </group>
  );
}

export function ProjectField({
  project,
  palette,
  quality,
  reducedMotion,
  interactive,
  selection,
  onSelect,
  showLabels,
}: {
  project: import("../types/project").Project;
  palette: ScenePalette;
  quality: Quality;
  reducedMotion: boolean;
  interactive: boolean;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  showLabels: boolean;
}) {
  const budget = BUDGET[quality];
  const progress = progressPercent(allTasks(project));
  const layout = useMemo(
    () =>
      project.stages.map((stage, index) => ({
        stage,
        position: stagePosition(index, project.stages.length),
      })),
    [project],
  );
  const [fontEpoch, setFontEpoch] = useState(0);

  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) setFontEpoch(1);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <group>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          if (!interactive || pointerDragged.current) return;
          onSelect({ kind: "project" });
        }}
      >
        <sphereGeometry args={[26, 12, 12]} />
        <meshBasicMaterial side={BackSide} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Mist color={palette.mist} quality={quality} />
      <Well color={palette.filament} rings={budget.rings} />
      <Pillars color={palette.metal} roughness={Math.min(1, palette.roughness + 0.2)} count={budget.pillars} />
      <mesh position={[0, -0.95, 0]} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.008, 0.008, 2.15, 6]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.28} />
      </mesh>
      <Dust count={budget.dust} color={palette.dust} motion={!reducedMotion} />
      {layout.map(({ stage, position }) => (
        <Filament
          key={`${stage.id}-tie`}
          end={position}
          color={palette.filament}
          opacity={0.38 + (progressPercent(stage.tasks) / 100) * 0.45}
        />
      ))}
      {layout.map(({ stage, position }) => (
        <StageObject
          key={stage.id}
          stage={stage}
          position={position}
          palette={palette}
          interactive={interactive}
          reducedMotion={reducedMotion}
          selected={selection.kind !== "project" && selection.stageId === stage.id}
          selection={selection}
          showLabel={showLabels}
          fontEpoch={fontEpoch}
          onSelect={onSelect}
        />
      ))}
      <CoreObject
        progress={progress}
        palette={palette}
        selected={selection.kind === "project"}
        reducedMotion={reducedMotion}
        interactive={interactive}
        onPick={() => onSelect({ kind: "project" })}
      />
    </group>
  );
}
