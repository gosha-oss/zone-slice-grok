import type { Project, Stage, Task, TaskStatus } from "../types/project";

export function localISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Progress = completed tasks / total tasks × 100. No tasks → 0, never NaN. */
export function progressPercent(tasks: readonly { status: TaskStatus }[]): number {
  const total = tasks.length;
  if (total === 0) return 0;
  const completed = tasks.filter((task) => task.status === "done").length;
  const value = (completed / total) * 100;
  return Number.isFinite(value) ? value : 0;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value >= 100) return "100%";
  const rounded = Math.round(value * 10) / 10;
  if (rounded >= 100) return "100%";
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function allTasks(project: Project): Task[] {
  return project.stages.flatMap((stage) => stage.tasks);
}

export function completedCount(tasks: readonly Task[]): number {
  return tasks.filter((task) => task.status === "done").length;
}

/** Active means work in progress or in review, not the backlog or the to-do pile. */
export function activeCount(tasks: readonly Task[]): number {
  return tasks.filter((task) => task.status === "in_progress" || task.status === "in_review").length;
}

export function isOverdue(task: Task, now = new Date()): boolean {
  return task.status !== "done" && task.due !== undefined && task.due < localISODate(now);
}

export function overdueTasks(tasks: readonly Task[], now = new Date()): Task[] {
  return tasks.filter((task) => isOverdue(task, now));
}

export function nearestStage(project: Project): Stage | undefined {
  return project.stages.find((stage) => progressPercent(stage.tasks) < 100);
}

export function formatDue(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}
