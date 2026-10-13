import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, type BufferAttribute } from "three";
import type { Quality, ScenePalette } from "../theme/tokens";

type Vec3 = readonly [number, number, number];

const NEAR_PIERS: readonly { position: Vec3; size: Vec3 }[] = [
  { position: [-2.05, 2.15, 2.85], size: [0.85, 4.3, 1.15] },
  { position: [2.15, 1.9, 3.35], size: [0.95, 3.8, 1.35] },
  { position: [-1.15, 0.7, 1.7], size: [1.5, 1.4, 0.7] },
];

const MIDDLE_PIERS: readonly { position: Vec3; size: Vec3 }[] = [
  { position: [-4.15, 3.15, -3.35], size: [1.45, 6.3, 1.45] },
  { position: [4.35, 2.85, -4.15], size: [1.25, 5.7, 1.7] },
  { position: [-2.2, 4.15, -7.4], size: [0.7, 5.2, 1.8] },
  { position: [3.1, 3.4, -8.2], size: [1.8, 4.4, 0.75] },
];

const FAR_JAMBS: readonly { position: Vec3; size: Vec3 }[] = [
  { position: [-3.55, 3.5, -14.6], size: [1.55, 7, 1.35] },
  { position: [3.7, 3.7, -14.9], size: [1.35, 7.4, 1.45] },
  { position: [0.15, 6.55, -15.2], size: [8.4, 0.7, 1.15] },
];

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function Dust({ color, motion }: { color: string; motion: boolean }) {
  const base = useMemo(() => {
    const random = mulberry32(0x0a11ce);
    const count = 36;
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      array[index * 3] = (random() - 0.5) * 14;
      array[index * 3 + 1] = 1.2 + random() * 5.4;
      array[index * 3 + 2] = 4 - random() * 18;
    }
    return array;
  }, []);
  const positions = useMemo(() => new Float32Array(base), [base]);
  const attribute = useRef<BufferAttribute>(null);

  useFrame(({ clock }) => {
    const current = attribute.current;
    if (!current || !motion) return;
    const time = clock.elapsedTime;
    const count = base.length / 3;
    for (let index = 0; index < count; index += 1) {
      current.setY(index, base[index * 3 + 1] + Math.sin(time * 0.12 + index * 0.37) * 0.05);
    }
    current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={attribute} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.04} sizeAttenuation transparent opacity={0.4} depthWrite={false} />
    </points>
  );
}

function Mist({ color, quality }: { color: string; quality: Quality }) {
  const texture = useMemo(() => {
    const size = quality === "high" ? 256 : 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const next = new CanvasTexture(canvas);
    if (context) {
      const radius = size / 2;
      const gradient = context.createRadialGradient(radius, radius, radius * 0.02, radius, radius, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      next.needsUpdate = true;
    }
    return next;
  }, [color, quality]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -8]}>
      <circleGeometry args={[9, quality === "high" ? 40 : 20]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Mass({
  position,
  size,
  color,
  roughness,
  metalness,
}: {
  position: Vec3;
  size: Vec3;
  color: string;
  roughness: number;
  metalness: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/**
 * Three depths along the flight path: near piers, a middle gate, and a far portal.
 * Masses stay off the center line so forward flight does not pass through stone.
 * Project objects are intentionally absent until a later stage.
 */
export function AbyssWorld({
  palette,
  quality,
  reducedMotion,
}: {
  palette: ScenePalette;
  quality: Quality;
  reducedMotion: boolean;
}) {
  const high = quality === "high";
  const mass = Math.min(1, palette.roughness + 0.08);
  const edge = Math.max(0.28, palette.roughness - 0.08);

  return (
    <group>
      <pointLight position={[-5.5, 6.4, 5.5]} intensity={22} distance={28} decay={2} color={palette.key} />
      <pointLight position={[4.2, 4.8, -2]} intensity={10} distance={18} decay={2} color={palette.key} />
      <pointLight position={[0, 4.2, -13.5]} intensity={14} distance={20} decay={2} color={palette.accent} />

      <Mass position={[0.2, 0.22, 2.7]} size={[7.2, 0.44, 2.6]} color={palette.filament} roughness={0.72} metalness={0.22} />
      <Mass position={[-0.4, 0.38, -5.2]} size={[8.6, 0.42, 3.4]} color={palette.metal} roughness={0.78} metalness={0.28} />
      <Mass position={[0.1, 0.48, -13.6]} size={[9.2, 0.5, 3.8]} color={palette.filament} roughness={0.7} metalness={0.24} />
      <Mist color={palette.mist} quality={quality} />

      {NEAR_PIERS.map((pier) => (
        <Mass
          key={`near-${pier.position.join(":")}`}
          position={pier.position}
          size={pier.size}
          color={palette.metal}
          roughness={mass}
          metalness={0.48}
        />
      ))}
      <mesh position={[0.05, 3.85, 2.15]}>
        <boxGeometry args={[4.6, 0.32, 0.42]} />
        <meshStandardMaterial color={palette.filament} roughness={edge} metalness={0.58} />
      </mesh>

      {MIDDLE_PIERS.map((pier) => (
        <Mass
          key={`mid-${pier.position.join(":")}`}
          position={pier.position}
          size={pier.size}
          color={palette.metal}
          roughness={mass}
          metalness={0.52}
        />
      ))}
      <mesh position={[0.1, 5.55, -3.7]}>
        <boxGeometry args={[10.2, 0.55, 0.7]} />
        <meshStandardMaterial color={palette.filament} roughness={edge} metalness={0.6} />
      </mesh>
      <mesh position={[0, 3.05, -6.1]}>
        <torusGeometry args={[2.55, 0.2, 12, high ? 48 : 28]} />
        <meshStandardMaterial color={palette.filament} roughness={edge} metalness={0.64} />
      </mesh>

      {FAR_JAMBS.map((pier) => (
        <Mass
          key={`far-${pier.position.join(":")}`}
          position={pier.position}
          size={pier.size}
          color={palette.metal}
          roughness={mass}
          metalness={0.5}
        />
      ))}
      <mesh position={[0, 3.45, -16.2]}>
        <torusGeometry args={[6.1, 0.55, 16, high ? 72 : 36]} />
        <meshStandardMaterial
          color={palette.filament}
          roughness={Math.max(0.3, edge - 0.04)}
          metalness={0.7}
          emissive={palette.accent}
          emissiveIntensity={0.06}
        />
      </mesh>
      <mesh position={[0, 3.45, -17.4]}>
        <torusGeometry args={[3.15, 0.12, 10, high ? 48 : 24]} />
        <meshStandardMaterial color={palette.accent} roughness={0.42} metalness={0.4} />
      </mesh>

      {high && <Dust color={palette.dust} motion={!reducedMotion} />}
    </group>
  );
}
