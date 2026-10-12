export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export type Priority = "low" | "medium" | "high";

export type Visibility = "private" | "public";

export type Role = "owner" | "admin" | "member" | "viewer";

export type Person = {
  id: string;
  name: string;
  role: Role;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
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
  category: string;
  goal: string;
  projectType: string;
  visibility: Visibility;
  stages: Stage[];
  participants: Person[];
};

export type Selection =
  | { kind: "project" }
  | { kind: "stage"; stageId: string }
  | { kind: "task"; stageId: string; taskId: string };

export type TaskDraft = {
  title: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  due?: string;
};

export type NewProjectInput = {
  name: string;
  summary: string;
  category: string;
  goal: string;
  projectType: string;
  visibility: Visibility;
  initialStage: string;
};
