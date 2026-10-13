import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRoute } from "../../app/route-context";
import { formatPercent, allTasks, progressPercent } from "../../lib/progress";
import type { Project, Selection } from "../../types/project";
import { AssistantPanel } from "../assistant/AssistantPanel";
import { useDemoData } from "../projects/demo-data-context";
import { ActivityPanel } from "./ActivityPanel";
import { FilesPanel } from "./FilesPanel";
import { OverviewPanel } from "./OverviewPanel";
import { RoadmapPanel } from "./RoadmapPanel";
import { TasksPanel } from "./TasksPanel";
import { TeamPanel } from "./TeamPanel";

const PANELS = [
  { id: "overview", label: "Обзор" },
  { id: "tasks", label: "Задачи" },
  { id: "roadmap", label: "Карта" },
  { id: "files", label: "Файлы" },
  { id: "team", label: "Команда" },
  { id: "activity", label: "События" },
  { id: "assistant", label: "Помощник" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

export function Workspace({
  project,
  selection,
  onSelect,
  onReset,
  webgl,
  quality,
  coarsePointer,
}: {
  project: Project;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onReset: () => void;
  webgl: boolean;
  quality: "high" | "low";
  coarsePointer: boolean;
}) {
  const { navigate } = useRoute();
  const data = useDemoData();
  const [panel, setPanel] = useState<PanelId>("overview");
  const progress = progressPercent(allTasks(project));
  const selectedTask =
    selection.kind === "task"
      ? project.stages.flatMap((stage) => stage.tasks).find((task) => task.id === selection.taskId)
      : undefined;

  useEffect(() => {
    if (selection.kind === "task") setPanel("tasks");
    if (selection.kind === "stage") setPanel("roadmap");
  }, [selection]);

  const hint = !webgl
    ? "WebGL нет, схема плоская. Данные те же."
    : coarsePointer
      ? "Палец вращает сцену, щипок меняет масштаб."
      : "Мышь вращает сцену. Стрелки — обзор, цифры — этапы, R — общий вид.";

  return (
    <aside className="bh-panel pointer-events-auto fixed inset-x-3 bottom-3 z-30 flex max-h-[min(52dvh,calc(100dvh-10.5rem))] flex-col overflow-hidden p-4 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[26rem] sm:max-h-[calc(100dvh-6.5rem)] sm:p-5">
      <p className="shrink-0 text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим</p>
      <div className="mt-3 flex shrink-0 items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl leading-none tracking-[-0.03em]">{project.name}</h1>
        <p className="text-sm tabular-nums">{formatPercent(progress)}</p>
      </div>
      {data.projects.length > 1 && (
        <label className="bh-field mt-3 shrink-0">
          Проекты в этом браузере
          <select value={project.id} onChange={(event) => navigate(`/space/${event.target.value}`)}>
            {data.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="bh-tabs mt-3 shrink-0" role="tablist" aria-label="Панели проекта">
        {PANELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={panel === item.id}
            onClick={() => setPanel(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {panel === "overview" && <OverviewPanel project={project} />}
        {panel === "tasks" && <TasksPanel project={project} selection={selection} onSelect={onSelect} />}
        {panel === "roadmap" && <RoadmapPanel project={project} />}
        {panel === "files" && <FilesPanel project={project} />}
        {panel === "team" && <TeamPanel project={project} />}
        {panel === "activity" && <ActivityPanel project={project} />}
        {panel === "assistant" && <AssistantPanel project={project} selectedTaskTitle={selectedTask?.title} />}
      </div>
      {data.persistError && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {data.persistError}
        </p>
      )}
      {quality === "low" && <p className="mt-2 text-xs text-muted">Упрощённая графика. Данные те же.</p>}
      <p className="mt-2 shrink-0 text-xs leading-relaxed text-muted">{hint}</p>
      <button type="button" className="bh-button bh-button-ghost mt-2 shrink-0" onClick={onReset}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        Общий вид
      </button>
      <button type="button" className="bh-button bh-button-ghost mt-2 shrink-0" onClick={() => navigate("/world")}>
        К пространству
      </button>
    </aside>
  );
}
