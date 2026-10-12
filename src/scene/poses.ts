import { Vector3 } from "three";

export type SceneMode = "landing" | "universe";

export type Pose = {
  position: Vector3;
  target: Vector3;
};

function pose(position: [number, number, number], target: [number, number, number]): Pose {
  return {
    position: new Vector3(...position),
    target: new Vector3(...target),
  };
}

export const LANDING_POSE = pose([-1.45, 1.9, 8.5], [0.9, 0.2, 0]);
export const LANDING_COMPACT_POSE = pose([0.2, 2.35, 9.1], [0, 0.4, 0]);
export const UNIVERSE_POSE = pose([5.15, 2.7, 6.55], [-0.62, 0.26, 0]);
export const UNIVERSE_COMPACT_POSE = pose([4.2, 2.35, 6.6], [0, -0.85, 0]);

export function poseFor(mode: SceneMode, compact: boolean): Pose {
  if (mode === "universe") return compact ? UNIVERSE_COMPACT_POSE : UNIVERSE_POSE;
  return compact ? LANDING_COMPACT_POSE : LANDING_POSE;
}
