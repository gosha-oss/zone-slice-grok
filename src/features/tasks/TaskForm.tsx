import { useEffect, useState, type FormEvent } from "react";
import { PRIORITY_LABEL, STATUS_LABEL } from "../../lib/taskVisual";
import type { Priority, Project, Stage, Task, TaskDraft, TaskStatus } from "../../types/project";

const STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

export function TaskForm({
  project,
  stages,
  stageId,
  task,
  onStageId,
  onSubmit,
}: {
  project: Project;
  stages: Stage[];
  stageId: string;
  task?: Task;
  onStageId?: (stageId: string) => void;
  onSubmit: (stageId: string, draft: TaskDraft) => string | null;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [due, setDue] = useState(task?.due ?? "");
  const [chosenStage, setChosenStage] = useState(stageId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setStatus(task?.status ?? "todo");
    setPriority(task?.priority ?? "medium");
    setAssigneeId(task?.assigneeId ?? "");
    setDue(task?.due ?? "");
    setError(null);
  }, [task]);

  useEffect(() => {
    if (!task) setChosenStage(stageId);
  }, [stageId, task]);

  const draft = (): TaskDraft => ({
    title,
    status,
    priority,
    assigneeId: assigneeId || undefined,
    due: due || undefined,
  });

  const submit = (event: FormEvent, nextStatus?: TaskStatus) => {
    event.preventDefault();
    const message = onSubmit(task ? stageId : chosenStage, {
      ...draft(),
      status: nextStatus ?? status,
    });
    setError(message);
    if (!message && !task) {
      setTitle("");
      setStatus("todo");
      setPriority("medium");
      setAssigneeId("");
      setDue("");
    }
  };

  return (
    <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => submit(event)}>
      <h3 className="text-xs tracking-[0.16em] text-muted uppercase">
        {task ? "Изменить задачу" : "Новая задача"}
      </h3>
      <label className="bh-field">
        Название
        <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
      </label>
      {!task && (
        <label className="bh-field">
          Этап
          <select
            value={chosenStage}
            onChange={(event) => {
              setChosenStage(event.target.value);
              onStageId?.(event.target.value);
            }}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="bh-field">
          Статус
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="bh-field">
          Приоритет
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {PRIORITY_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="bh-field">
        Исполнитель
        <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
          <option value="">Не назначен</option>
          {project.participants.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label className="bh-field">
        Срок
        <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="bh-button bh-button-primary">
          {task ? "Сохранить" : "Создать задачу"}
        </button>
        {task && task.status !== "done" && (
          <button type="button" className="bh-button bh-button-ghost" onClick={(event) => submit(event, "done")}>
            Отметить готовой
          </button>
        )}
      </div>
    </form>
  );
}
