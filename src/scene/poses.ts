import { Vector3 } from "three";

export type SceneMode = "landing" | "world" | "universe";

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

export const LANDING_POSE = pose([0.8, 3.6, 15.5], [0, 2.2, -4]);
export const LANDING_COMPACT_POSE = pose([0.2, 4.4, 17.5], [0, 1.8, -2]);
export const UNIVERSE_POSE = pose([5.15, 2.7, 6.55], [-0.62, 0.26, 0]);
export const UNIVERSE_COMPACT_POSE = pose([4.2, 2.35, 6.6], [0, -0.85, 0]);

/** Free-flight start. Yaw 0 looks down -Z, toward the far gate. */
export const WORLD_HOME_POSITION = new Vector3(0, 2.55, 5.6);
export const WORLD_HOME_YAW = 0;
export const WORLD_HOME_PITCH = -0.08;

export function poseFor(mode: SceneMode, compact: boolean): Pose {
  if (mode === "universe") return compact ? UNIVERSE_COMPACT_POSE : UNIVERSE_POSE;
  if (mode === "world") return compact ? LANDING_COMPACT_POSE : LANDING_POSE;
  return compact ? LANDING_COMPACT_POSE : LANDING_POSE;
}
