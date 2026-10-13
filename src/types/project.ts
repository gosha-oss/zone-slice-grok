export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export type Priority = "low" | "medium" | "high";

export type Visibility = "private" | "public";

export type CatalogStatus = "active" | "recruiting" | "finished";

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
  /** Ids of stages that must be complete before this one. Empty means no dependency. */
  dependsOn: string[];
};

export type ActivityKind = "task_created" | "status_changed" | "stage_completed" | "stage_created" | "participants_seeded";

export type ActivityEvent = {
  id: string;
  at: string;
  kind: ActivityKind;
  summary: string;
};

export type DemoFile = {
  id: string;
  name: string;
  note: string;
};

export type Project = {
  id: string;
  name: string;
  summary: string;
  category: string;
  goal: string;
  projectType: string;
  visibility: Visibility;
  catalogStatus: CatalogStatus;
  stages: Stage[];
  participants: Person[];
  activity: ActivityEvent[];
  files: DemoFile[];
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

export type Interest = {
  projectId: string;
  at: string;
};

export type JoinRequest = {
  id: string;
  projectId: string;
  message: string;
  at: string;
};

export type ParticipantPost = {
  id: string;
  projectId: string;
  role: string;
  text: string;
  at: string;
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
