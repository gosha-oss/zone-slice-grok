import type { RefObject } from "react";
import type { Project, Selection } from "../types/project";
import type { Quality, ThemeId } from "../theme/tokens";
import type { SceneMode } from "./poses";

export type SceneHandle = {
  resetView: () => void;
  nudge: (yaw: number, pitch: number, dolly: number) => void;
};

export type AbyssSceneProps = {
  mode: SceneMode;
  theme: ThemeId;
  quality: Quality;
  reducedMotion: boolean;
  compact: boolean;
  interactive: boolean;
  project: Project;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  sceneApi: RefObject<SceneHandle | null>;
  webgl: boolean;
};
