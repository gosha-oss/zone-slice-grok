import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, DoubleSide, type Group, type BufferAttribute } from "three";
import type { Quality, ScenePalette } from "../theme/tokens";

const PIERS: readonly { position: readonly [number, number, number]; size: readonly [number, number, number] }[] = [
  { position: [-10.4, 3.8, 2.2], size: [1.15, 7.6, 1.35] },
  { position: [10.6, 3.1, 0.4], size: [0.9, 6.2, 2.4] },
  { position: [-9.8, 4.8, -8.6], size: [1.2, 9.6, 1.2] },
  { position: [9.4, 2.6, -11.5], size: [2.6, 5.2, 0.7] },
  { position: [-4.2, 5.4, -15.2], size: [0.85, 10.8, 0.85] },
  { position: [6.8, 4.2, -15.6], size: [0.7, 8.4, 1.8] },
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
    const count = 42;
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.2 + random() * 14;
      const angle = random() * Math.PI * 2;
      array[index * 3] = Math.cos(angle) * radius * 0.72;
      array[index * 3 + 1] = 0.6 + random() * 6.2;
      array[index * 3 + 2] = -4 + Math.sin(angle) * radius * 0.55;
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
      current.setY(index, base[index * 3 + 1] + Math.sin(time * 0.12 + index * 0.37) * 0.06);
    }
    current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={attribute} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.045} sizeAttenuation transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

function Wash({ color, quality }: { color: string; quality: Quality }) {
  const texture = useMemo(() => {
    const size = quality === "high" ? 256 : 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const next = new CanvasTexture(canvas);
    if (context) {
      const radius = size / 2;
      const gradient = context.createRadialGradient(radius, radius, radius * 0.05, radius, radius, radius);
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -2]}>
      <circleGeometry args={[11, quality === "high" ? 48 : 24]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * The open Digital Abyss court. Project objects stay out of this space until a later stage.
 * Forms sit outside the flight bounds so the camera moves through the volume, not through the stone.
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
  const gate = useRef<Group>(null);
  const high = quality === "high";
  const stone = {
    color: palette.metal,
    roughness: Math.min(1, palette.roughness + 0.18),
    metalness: 0.62,
  };

  useFrame((_, delta) => {
    if (!gate.current || reducedMotion) return;
    gate.current.rotation.y += delta * 0.025;
  });

  return (
    <group>
      <pointLight position={[1.5, 7.2, 6]} intensity={26} distance={40} decay={2} color={palette.key} />
      <pointLight position={[0, 3.4, -11]} intensity={9} distance={24} decay={2} color={palette.accent} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]}>
        <ringGeometry args={[2.4, high ? 24 : 20, high ? 72 : 36]} />
        <meshStandardMaterial color={palette.filament} roughness={0.88} metalness={0.18} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.5]}>
        <circleGeometry args={[7.2, high ? 48 : 24]} />
        <meshStandardMaterial color={palette.metal} roughness={0.96} metalness={0.08} />
      </mesh>
      <Wash color={palette.mist} quality={quality} />

      <group ref={gate} position={[0, 4.6, -16]}>
        <mesh>
          <torusGeometry args={[6.6, 0.11, 12, high ? 80 : 36]} />
          <meshStandardMaterial
            color={palette.filament}
            roughness={0.34}
            metalness={0.72}
            emissive={palette.accent}
            emissiveIntensity={0.08}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.7, 0.03, 8, high ? 64 : 28]} />
          <meshStandardMaterial color={palette.accent} roughness={0.4} metalness={0.45} />
        </mesh>
      </group>

      <mesh position={[-2.2, 1.35, -3.4]} rotation={[0.15, 0.5, 0.08]}>
        <torusGeometry args={[4.4, 0.035, 8, high ? 56 : 28, Math.PI * 1.2]} />
        <meshStandardMaterial color={palette.filament} roughness={0.42} metalness={0.66} />
      </mesh>
      <mesh position={[7.5, 3.1, -9]} rotation={[0.4, -0.3, 0.2]}>
        <torusGeometry args={[3.1, 0.028, 8, high ? 40 : 20, Math.PI * 0.85]} />
        <meshStandardMaterial color={palette.metal} roughness={0.5} metalness={0.58} />
      </mesh>

      {PIERS.map((pier) => (
        <mesh key={pier.position.join(":")} position={pier.position}>
          <boxGeometry args={[pier.size[0], pier.size[1], pier.size[2]]} />
          <meshStandardMaterial {...stone} />
        </mesh>
      ))}

      <mesh position={[0.2, 6.6, -7.4]}>
        <boxGeometry args={[18, 0.18, 0.55]} />
        <meshStandardMaterial color={palette.filament} roughness={0.46} metalness={0.58} />
      </mesh>
      <mesh position={[-6.4, 7.15, -4]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[8.5, 0.14, 0.4]} />
        <meshStandardMaterial color={palette.accent} roughness={0.42} metalness={0.32} />
      </mesh>
      <mesh position={[4.8, 1.15, -6.5]}>
        <boxGeometry args={[5.5, 0.28, 2.2]} />
        <meshStandardMaterial {...stone} />
      </mesh>

      {high && <Dust color={palette.dust} motion={!reducedMotion} />}
    </group>
  );
}
