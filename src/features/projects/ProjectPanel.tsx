import { useEffect, useState, type FormEvent } from "react";
import { RotateCcw } from "lucide-react";
import { useRoute } from "../../app/route-context";
import { ProgressMeter } from "../../components/ProgressMeter";
import { TaskForm } from "../tasks/TaskForm";
import { ParticipantList } from "../team/ParticipantList";
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
  PRIORITY_LABEL,
  PRESENCE_LABEL,
  STATUS_LABEL,
  stagePresence,
  statusTone,
  taskAppearance,
} from "../../lib/taskVisual";
import { MAX_STAGES } from "../../services/demoStore";
import type { Project, Selection, Stage, Task } from "../../types/project";
import { useDemoData } from "./demo-data-context";

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

function personName(project: Project, assigneeId: string | undefined): string | undefined {
  if (!assigneeId) return undefined;
  return project.participants.find((person) => person.id === assigneeId)?.name;
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
  const { navigate } = useRoute();
  const data = useDemoData();
  const tasks = allTasks(project);
  const progress = progressPercent(tasks);
  const completed = completedCount(tasks);
  const active = activeCount(tasks);
  const overdue = overdueTasks(tasks);
  const dated = tasks.some((task) => task.due !== undefined);
  const nearest = nearestStage(project);
  const stage = findStage(project, selection);
  const task = findTask(stage, selection);
  const [stageName, setStageName] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);
  const formStageId = stage?.id ?? project.stages[0]?.id ?? "";

  useEffect(() => {
    const node = document.getElementById("project-detail");
    node?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion, selection]);

  const hint = !webgl
    ? "WebGL нет, поэтому камера выключена. Выберите объект на схеме или в списке. Данные те же."
    : coarsePointer
      ? "Проведите пальцем, чтобы осмотреть. Сведите пальцы, чтобы изменить масштаб."
      : "Мышь вращает и приближает. Стрелки — обзор, + и − — масштаб, цифры — этапы, 0 или Esc — проект, R — общий вид.";

  const createStage = (event: FormEvent) => {
    event.preventDefault();
    const result = data.addStage(project.id, stageName);
    if ("error" in result) {
      setStageError(result.error);
      return;
    }
    setStageName("");
    setStageError(null);
    onSelect({ kind: "stage", stageId: result.stageId });
  };

  return (
    <aside className="bh-panel pointer-events-auto fixed inset-x-3 bottom-3 z-30 max-h-[min(46dvh,calc(100dvh-11rem))] overflow-y-auto p-4 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[26rem] sm:max-h-[calc(100dvh-6.5rem)] sm:p-5">
      <p className="sr-only" aria-live="polite">
        {selection.kind === "project"
          ? `Выбран проект ${project.name}. Прогресс ${formatPercent(progress)}.`
          : stage
            ? task
              ? `Выбрана задача ${task.title}. Прогресс ${formatPercent(progress)}.`
              : `Выбран этап ${stage.name}. Прогресс ${formatPercent(progress)}.`
            : `Прогресс ${formatPercent(progress)}.`}
      </p>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим</p>
      {data.projects.length > 1 && (
        <label className="bh-field mt-3">
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
      <h1 className="mt-3 font-serif text-3xl leading-none tracking-[-0.03em]">{project.name}</h1>
      <p className="mt-3 text-sm leading-relaxed">{project.summary}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">Цель: {project.goal}</p>
      <p className="mt-2 text-xs text-muted">
        {project.category} · {project.projectType} ·{" "}
        {project.visibility === "private" ? "Приватный" : "Публичный, только локально"}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Локальные данные этого браузера. Нет входа, живой модели и совместной работы.
      </p>
      {data.persistError && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {data.persistError}
        </p>
      )}

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

      <ParticipantList people={project.participants} />

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
        {project.stages.length >= MAX_STAGES ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Новый этап недоступен: в сцене уже {MAX_STAGES}.
          </p>
        ) : (
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={createStage}>
            <label className="bh-field min-w-0 flex-1">
              <span className="sr-only">Название этапа</span>
              <input
                value={stageName}
                onChange={(event) => setStageName(event.target.value)}
                placeholder="Новый этап"
                maxLength={80}
              />
            </label>
            <button type="submit" className="bh-button bh-button-ghost">
              Добавить этап
            </button>
          </form>
        )}
        {stageError && (
          <p role="alert" className="mt-2 text-sm text-bad">
            {stageError}
          </p>
        )}
      </div>

      {stage && (
        <div id="project-detail" className="mt-4 border-t border-line pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl tracking-[-0.03em]">{stage.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {formatPercent(progressPercent(stage.tasks))} · {PRESENCE_LABEL[stagePresence(stage.tasks)]}
              </p>
            </div>
            {task && (
              <button
                type="button"
                className="bh-button bh-button-ghost"
                onClick={() => onSelect({ kind: "stage", stageId: stage.id })}
              >
                К этапу
              </button>
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {stage.tasks.map((item) => {
              const tone = statusTone(item.status);
              const appearance = taskAppearance(item.status);
              const selected = task?.id === item.id;
              const late = isOverdue(item);
              const assignee = personName(project, item.assigneeId);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-2 px-2 py-2 text-left ${selected ? "bg-[color-mix(in_srgb,var(--bh-accent)_16%,transparent)]" : ""}`}
                    aria-pressed={selected}
                    onClick={() => onSelect({ kind: "task", stageId: stage.id, taskId: item.id })}
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${appearance.wire ? "border border-muted bg-transparent" : TONE_CLASS[tone]} ${appearance.active ? "ring-2 ring-accent ring-offset-2 ring-offset-transparent" : ""}`}
                      style={{ opacity: appearance.opacity }}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm">{item.title}</span>
                      <span className="text-xs text-muted">
                        {STATUS_LABEL[item.status]} · {PRIORITY_LABEL[item.priority]}
                        {assignee ? ` · ${assignee}` : ""}
                        {item.due ? ` · срок ${formatDue(item.due)}` : ""}
                        {late ? " · просрочено" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {task ? (
            <TaskForm
              project={project}
              stages={project.stages}
              stageId={stage.id}
              task={task}
              onSubmit={(stageId, draft) => {
                const result = data.updateTask(project.id, stageId, task.id, draft);
                return "error" in result ? result.error : null;
              }}
            />
          ) : (
            <TaskForm
              project={project}
              stages={project.stages}
              stageId={stage.id}
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
      )}

      {!stage && formStageId && (
        <div className="mt-4 border-t border-line pt-4">
          <TaskForm
            project={project}
            stages={project.stages}
            stageId={formStageId}
            onStageId={(stageId) => onSelect({ kind: "stage", stageId })}
            onSubmit={(stageId, draft) => {
              const result = data.addTask(project.id, stageId, draft);
              if ("error" in result) return result.error;
              onSelect({ kind: "task", stageId, taskId: result.taskId });
              return null;
            }}
          />
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
    </aside>
  );
}
