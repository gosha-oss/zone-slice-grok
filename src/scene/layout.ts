export function stagePosition(index: number, count: number): [number, number, number] {
  const safeCount = Math.max(count, 1);
  const angle = -Math.PI / 2 + (index / safeCount) * Math.PI * 2;
  const radius = 2.45 + (index % 2) * 0.22;
  const y = 0.2 + Math.sin(angle * 2) * 0.26;
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.82];
}

export function flatStagePosition(index: number, count: number): { x: number; y: number } {
  const safeCount = Math.max(count, 1);
  const angle = -Math.PI / 2 + (index / safeCount) * Math.PI * 2;
  return {
    x: 50 + Math.cos(angle) * 28,
    y: 52 + Math.sin(angle) * 22,
  };
}

export function pipOffset(index: number, count: number): [number, number, number] {
  const span = Math.min(1.15, 0.34 * Math.max(count - 1, 1));
  const start = -span / 2;
  const step = count <= 1 ? 0 : span / (count - 1);
  return [start + step * index, -0.82, 0.28];
}
