import { progressPercent } from "../lib/progress";
import { stagePresence, statusTone, taskAppearance } from "../lib/taskVisual";
import type { AbyssSceneProps } from "./types";
import { flatStagePosition } from "./layout";

const TONE_COLOR = {
  good: "var(--bh-good)",
  accent: "var(--bh-accent)",
  warn: "var(--bh-warn)",
  muted: "var(--bh-muted)",
} as const;

export function FallbackDiagram({
  mode,
  project,
  selection,
  onSelect,
  interactive,
  quality,
}: AbyssSceneProps) {
  if (mode === "world") {
    return (
      <div className="relative h-full w-full" style={{ background: "var(--bh-bg, #08090d)" }}>
        <p className="absolute top-28 right-4 left-4 text-center text-sm leading-relaxed text-muted sm:top-24">
          WebGL недоступен. Полёт по пространству не включается. Проекты и каталог открываются как прежде.
        </p>
      </div>
    );
  }

  const progress = progressPercent(project.stages.flatMap((stage) => stage.tasks));
  const safe = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  const rings = quality === "high" ? 4 : 2;

  return (
    <div className="relative h-full w-full" style={{ background: "var(--bh-bg, #08090d)" }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: rings }, (_, index) => (
          <circle
            key={index}
            cx="50"
            cy="52"
            r={16 + index * 10}
            fill="none"
            stroke="var(--bh-line)"
            strokeWidth="0.25"
          />
        ))}
        {project.stages.map((stage, index) => {
          const point = flatStagePosition(index, project.stages.length);
          const percent = progressPercent(stage.tasks);
          return (
            <line
              key={stage.id}
              x1="50"
              y1="52"
              x2={point.x}
              y2={point.y}
              stroke="var(--bh-accent)"
              strokeWidth="0.35"
              opacity={0.25 + (percent / 100) * 0.6}
            />
          );
        })}
      </svg>
      <p className="absolute top-24 right-4 left-4 text-center text-xs leading-relaxed text-muted sm:top-6 sm:left-auto sm:max-w-xs sm:text-right">
        WebGL недоступен. Показана плоская схема тех же данных: объекты выбираются нажатием.
      </p>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {interactive ? (
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-full border border-line"
            style={{
              background: `conic-gradient(var(--bh-accent) ${safe}%, color-mix(in srgb, var(--bh-ink) 12%, transparent) ${safe}%)`,
            }}
            aria-pressed={selection.kind === "project"}
            aria-label={`Проект ${project.name}`}
            onClick={() => onSelect({ kind: "project" })}
          >
            <span className="h-8 w-8 rounded-full" style={{ background: "var(--bh-bg)" }} />
          </button>
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border border-line"
            style={{
              background: `conic-gradient(var(--bh-accent) ${safe}%, color-mix(in srgb, var(--bh-ink) 12%, transparent) ${safe}%)`,
            }}
            aria-hidden="true"
          >
            <span className="h-8 w-8 rounded-full" style={{ background: "var(--bh-bg)" }} />
          </div>
        )}
      </div>
      {project.stages.map((stage, index) => {
        const point = flatStagePosition(index, project.stages.length);
        const pressed = selection.kind !== "project" && selection.stageId === stage.id;
        const presence = stagePresence(stage.tasks);
        return (
          <div
            key={stage.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {interactive ? (
              <button
                type="button"
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border"
                style={{
                  borderColor: pressed ? "var(--bh-accent)" : "var(--bh-line)",
                  background: presence === "pending" ? "transparent" : "var(--bh-surface)",
                }}
                aria-pressed={pressed}
                aria-label={`Этап ${stage.name}`}
                onClick={() => onSelect({ kind: "stage", stageId: stage.id })}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: presence === "complete" ? "var(--bh-good)" : "var(--bh-accent)",
                    opacity: presence === "pending" ? 0.4 : 1,
                  }}
                />
              </button>
            ) : (
              <div
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-line"
                aria-hidden="true"
              >
                <span className="h-3 w-3 rounded-full bg-accent" />
              </div>
            )}
            <span className="mt-1 block text-center text-xs">{stage.name}</span>
            <span className="mt-1 flex justify-center gap-1">
              {stage.tasks.map((task) => {
                const appearance = taskAppearance(task.status);
                const selected = selection.kind === "task" && selection.taskId === task.id;
                const dot = (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: appearance.wire ? "transparent" : TONE_COLOR[statusTone(task.status)],
                      border: "1px solid var(--bh-muted)",
                      opacity: appearance.opacity,
                      outline: selected ? "1px solid var(--bh-accent)" : undefined,
                    }}
                  />
                );
                if (!interactive) return <span key={task.id}>{dot}</span>;
                return (
                  <button
                    key={task.id}
                    type="button"
                    className="flex h-6 w-6 items-center justify-center"
                    aria-label={task.title}
                    aria-pressed={selected}
                    onClick={() => onSelect({ kind: "task", stageId: stage.id, taskId: task.id })}
                  >
                    {dot}
                  </button>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
