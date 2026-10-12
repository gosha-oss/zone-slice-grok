import type { Priority, TaskStatus } from "../types/project";

export type StatusTone = "good" | "accent" | "warn" | "muted";

export type StagePresence = "complete" | "active" | "pending";

export function statusTone(status: TaskStatus): StatusTone {
  switch (status) {
    case "done":
      return "good";
    case "in_progress":
      return "accent";
    case "in_review":
      return "warn";
    case "todo":
    case "backlog":
      return "muted";
  }
}

export function taskAppearance(status: TaskStatus): { wire: boolean; opacity: number; active: boolean } {
  switch (status) {
    case "done":
      return { wire: false, opacity: 1, active: false };
    case "in_review":
      return { wire: false, opacity: 1, active: false };
    case "in_progress":
      return { wire: false, opacity: 1, active: true };
    case "todo":
      return { wire: false, opacity: 0.62, active: false };
    case "backlog":
      return { wire: true, opacity: 0.5, active: false };
  }
}

export function stagePresence(tasks: readonly { status: TaskStatus }[]): StagePresence {
  if (tasks.length > 0 && tasks.every((task) => task.status === "done")) return "complete";
  if (
    tasks.some(
      (task) => task.status === "done" || task.status === "in_progress" || task.status === "in_review",
    )
  ) {
    return "active";
  }
  return "pending";
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Ожидает",
  todo: "К работе",
  in_progress: "В работе",
  in_review: "На проверке",
  done: "Готово",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const PRESENCE_LABEL: Record<StagePresence, string> = {
  complete: "Этап закрыт",
  active: "Этап в движении",
  pending: "Этап ещё не начат",
};
