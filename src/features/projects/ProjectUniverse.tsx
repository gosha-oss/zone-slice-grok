import { useEffect, type RefObject } from "react";
import type { SceneHandle } from "../../scene/types";
import type { Project, Selection } from "../../types/project";
import { Workspace } from "../workspace/Workspace";

export function ProjectUniverse({
  project,
  selection,
  onSelect,
  onReset,
  webgl,
  quality,
  coarsePointer,
  sceneApi,
}: {
  project: Project;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onReset: () => void;
  webgl: boolean;
  quality: "high" | "low";
  coarsePointer: boolean;
  sceneApi: RefObject<SceneHandle | null>;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        sceneApi.current?.nudge(1, 0, 0);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        sceneApi.current?.nudge(-1, 0, 0);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        sceneApi.current?.nudge(0, 1, 0);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        sceneApi.current?.nudge(0, -1, 0);
        return;
      }
      if (event.code === "Equal" || event.code === "NumpadAdd") {
        event.preventDefault();
        sceneApi.current?.nudge(0, 0, 1);
        return;
      }
      if (event.code === "Minus" || event.code === "NumpadSubtract") {
        event.preventDefault();
        sceneApi.current?.nudge(0, 0, -1);
        return;
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        onReset();
        return;
      }
      if (event.code === "Escape" || event.code === "Digit0" || event.code === "Numpad0") {
        event.preventDefault();
        onSelect({ kind: "project" });
        return;
      }
      if (event.code.startsWith("Digit")) {
        const index = Number(event.code.slice(5)) - 1;
        const stage = project.stages[index];
        if (!stage) return;
        event.preventDefault();
        onSelect({ kind: "stage", stageId: stage.id });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onReset, onSelect, project, sceneApi]);

  return (
    <Workspace
      project={project}
      selection={selection}
      onSelect={onSelect}
      onReset={onReset}
      webgl={webgl}
      quality={quality}
      coarsePointer={coarsePointer}
    />
  );
}
