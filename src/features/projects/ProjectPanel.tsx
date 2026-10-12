import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { ProgressMeter } from "../../components/ProgressMeter";
import {
  activeCount,
  allTasks,
  completedCount,
  formatDue,
  formatPercent,
  isOverdue,
  nearestStage,
  overdueTasks,
  progressPercent,
} from "../../lib/progress";
import {
  PRESENCE_LABEL,
  STATUS_LABEL,
  stagePresence,
  statusTone,
  taskAppearance,
} from "../../lib/taskVisual";
import type { Project, Selection, Stage, Task } from "../../types/project";

const TONE_CLASS = {
  good: "bg-good",
  accent: "bg-accent",
  warn: "bg-warn",
  muted: "bg-muted",
} as const;

function findStage(project: Project, selection: Selection): Stage | undefined {
  if (selection.kind === "project") return undefined;
  return project.stages.find((stage) => stage.id === selection.stageId);
}

function findTask(stage: Stage | undefined, selection: Selection): Task | undefined {
  if (!stage || selection.kind !== "task") return undefined;
  return stage.tasks.find((task) => task.id === selection.taskId);
}

function announcement(project: Project, selection: Selection): string {
  if (selection.kind === "project") return `Выбран проект ${project.name}`;
  const stage = findStage(project, selection);
  if (!stage) return `Выбран проект ${project.name}`;
  if (selection.kind === "stage") return `Выбран этап ${stage.name}`;
  const task = findTask(stage, selection);
  return task ? `Выбрана задача ${task.title}` : `Выбран этап ${stage.name}`;
}

export function ProjectPanel({
  project,
  selection,
  onSelect,
  onReset,
  webgl,
  quality,
  coarsePointer,
  reducedMotion,
}: {
  project: Project;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onReset: () => void;
  webgl: boolean;
  quality: "high" | "low";
  coarsePointer: boolean;
  reducedMotion: boolean;
}) {
  const tasks = allTasks(project);
  const progress = progressPercent(tasks);
  const completed = completedCount(tasks);
  const active = activeCount(tasks);
  const overdue = overdueTasks(tasks);
  const dated = tasks.some((task) => task.due !== undefined);
  const nearest = nearestStage(project);
  const stage = findStage(project, selection);
  const task = findTask(stage, selection);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    detailRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [reducedMotion, selection]);

  const hint = !webgl
    ? "WebGL нет, поэтому камера выключена. Выберите объект на схеме или в списке. Данные те же."
    : coarsePointer
      ? "Проведите пальцем, чтобы осмотреть. Сведите пальцы, чтобы изменить масштаб. Этапы можно выбрать в списке."
      : "Мышь вращает и приближает. Стрелки — обзор, + и − — масштаб, 1–4 — этапы, 0 или Esc — проект, R — общий вид.";

  return (
    <aside className="bh-panel pointer-events-auto fixed inset-x-3 bottom-3 z-30 max-h-[min(40dvh,calc(100dvh-11rem))] overflow-y-auto p-4 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[23.5rem] sm:max-h-[calc(100dvh-6.5rem)] sm:p-5">
      <p className="sr-only" aria-live="polite">
        {announcement(project, selection)}
      </p>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим</p>
      <h1 className="mt-2 font-serif text-3xl leading-none tracking-[-0.03em]">{project.name}</h1>
      <p className="mt-3 text-sm leading-relaxed">{project.summary}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">Цель: {project.goal}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Локальные данные одного проекта: без входа, без живой модели и без совместной работы.
      </p>

      <div className="mt-5">
        <ProgressMeter value={progress} label={`${completed} из ${tasks.length} задач`} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Завершено</dt>
          <dd className="mt-1 text-lg">{completed}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Активные</dt>
          <dd className="mt-1 text-lg">{active}</dd>
          <dd className="text-xs text-muted">в работе и на проверке</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Ближайший этап</dt>
          <dd className="mt-1">{nearest ? nearest.name : "Все этапы закрыты"}</dd>
        </div>
        {dated && (
          <div>
            <dt className="text-xs text-muted">Просрочено</dt>
            <dd className={`mt-1 text-lg ${overdue.length > 0 ? "text-bad" : ""}`}>{overdue.length}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5">
        <h2 className="text-xs tracking-[0.16em] text-muted uppercase">Этапы</h2>
        <ul className="mt-2 flex flex-col">
          {project.stages.map((item, index) => {
            const percent = progressPercent(item.tasks);
            const pressed = selection.kind !== "project" && selection.stageId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 px-2 py-2 text-left ${pressed ? "bg-[color-mix(in_srgb,var(--bh-accent)_16%,transparent)]" : ""}`}
                  aria-pressed={pressed}
                  onClick={() => onSelect({ kind: "stage", stageId: item.id })}
                >
                  <span>
                    <span className="block text-sm">
                      {index + 1}. {item.name}
                    </span>
                    <span className="text-xs text-muted">
                      {completedCount(item.tasks)} из {item.tasks.length}
                      {nearest?.id === item.id ? " · ближайший" : ""}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums">{formatPercent(percent)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {stage && (
        <div ref={detailRef} className="mt-4 border-t border-line pt-4">
          <h2 className="font-serif text-2xl tracking-[-0.03em]">{stage.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {formatPercent(progressPercent(stage.tasks))} · {PRESENCE_LABEL[stagePresence(stage.tasks)]}
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {stage.tasks.map((item) => {
              const tone = statusTone(item.status);
              const appearance = taskAppearance(item.status);
              const selected = task?.id === item.id;
              const late = isOverdue(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-2 px-2 py-2 text-left ${selected ? "bg-[color-mix(in_srgb,var(--bh-accent)_16%,transparent)]" : ""}`}
                    aria-pressed={selected}
                    onClick={() => onSelect({ kind: "task", stageId: stage.id, taskId: item.id })}
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${appearance.wire ? "border border-muted bg-transparent" : TONE_CLASS[tone]}`}
                      style={{ opacity: appearance.opacity }}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm">{item.title}</span>
                      <span className="text-xs text-muted">
                        {STATUS_LABEL[item.status]}
                        {item.due ? ` · срок ${formatDue(item.due)}` : ""}
                        {late ? " · просрочено" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Менять задачи в этой сборке нельзя. Сцена показывает уже посчитанные данные.
          </p>
        </div>
      )}

      {quality === "low" && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Упрощённая графика: меньше частиц, колец и света. Картина проекта та же.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">{hint}</p>
      <button type="button" className="bh-button bh-button-ghost mt-3" onClick={onReset}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        Общий вид
      </button>
      <span className="sr-only">
        {reducedMotion ? "Анимация сокращена системной настройкой." : ""}
      </span>
    </aside>
  );
}
