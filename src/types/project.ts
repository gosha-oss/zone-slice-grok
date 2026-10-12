export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  due?: string;
};

export type Stage = {
  id: string;
  name: string;
  tasks: Task[];
};

export type Project = {
  id: string;
  name: string;
  summary: string;
  goal: string;
  stages: Stage[];
};

export type Selection =
  | { kind: "project" }
  | { kind: "stage"; stageId: string }
  | { kind: "task"; stageId: string; taskId: string };
