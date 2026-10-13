import { TaskForm } from "../tasks/TaskForm";
import { PRIORITY_LABEL, STATUS_LABEL, statusTone, taskAppearance } from "../../lib/taskVisual";
import { formatDue, isOverdue } from "../../lib/progress";
import type { Project, Selection } from "../../types/project";
import { useDemoData } from "../projects/demo-data-context";

const TONE_CLASS = {
  good: "bg-good",
  accent: "bg-accent",
  warn: "bg-warn",
  muted: "bg-muted",
} as const;

export function TasksPanel({
  project,
  selection,
  onSelect,
}: {
  project: Project;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}) {
  const data = useDemoData();
  const selectedStageId = selection.kind === "project" ? project.stages[0]?.id : selection.stageId;
  const selectedTaskId = selection.kind === "task" ? selection.taskId : undefined;
  const stage = project.stages.find((item) => item.id === selectedStageId);
  const task = stage?.tasks.find((item) => item.id === selectedTaskId);

  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-1">
        {project.stages.flatMap((item) =>
          item.tasks.map((entry) => {
            const appearance = taskAppearance(entry.status);
            const pressed = task?.id === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`flex w-full items-start gap-2 px-2 py-2 text-left ${pressed ? "bg-[color-mix(in_srgb,var(--bh-accent)_16%,transparent)]" : ""}`}
                  aria-pressed={pressed}
                  onClick={() => onSelect({ kind: "task", stageId: item.id, taskId: entry.id })}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${appearance.wire ? "border border-muted bg-transparent" : TONE_CLASS[statusTone(entry.status)]} ${appearance.active ? "ring-2 ring-accent" : ""}`}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-sm">{entry.title}</span>
                    <span className="text-xs text-muted">
                      {item.name} · {STATUS_LABEL[entry.status]} · {PRIORITY_LABEL[entry.priority]}
                      {entry.due ? ` · ${formatDue(entry.due)}` : ""}
                      {isOverdue(entry) ? " · просрочено" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          }),
        )}
      </ul>
      {stage && task ? (
        <TaskForm
          project={project}
          stages={project.stages}
          stageId={stage.id}
          task={task}
          onSubmit={(_stageId, draft) => {
            const result = data.updateTask(project.id, stage.id, task.id, draft);
            return "error" in result ? result.error : null;
          }}
        />
      ) : (
        <TaskForm
          project={project}
          stages={project.stages}
          stageId={selectedStageId ?? ""}
          onStageId={(stageId) => onSelect({ kind: "stage", stageId })}
          onSubmit={(stageId, draft) => {
            const result = data.addTask(project.id, stageId, draft);
            if ("error" in result) return result.error;
            onSelect({ kind: "task", stageId, taskId: result.taskId });
            return null;
          }}
        />
      )}
    </div>
  );
}
