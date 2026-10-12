import { createId } from "../lib/ids";
import type {
  NewProjectInput,
  Person,
  Priority,
  Project,
  Stage,
  Task,
  TaskDraft,
  TaskStatus,
  Visibility,
} from "../types/project";
import { demoParticipants } from "./demoPeople";
import { createSeedProject } from "./demoProject";

export const DEMO_STORE_KEY = "buildhub-demo-store";
export const MAX_STAGES = 8;
export const MAX_TASKS_PER_STAGE = 8;

const STATUSES = new Set<TaskStatus>(["backlog", "todo", "in_progress", "in_review", "done"]);
const PRIORITIES = new Set<Priority>(["low", "medium", "high"]);

export type DemoStore = {
  version: 1;
  lastProjectId: string;
  projects: Project[];
};

export function seedStore(): DemoStore {
  const project = createSeedProject();
  return { version: 1, lastProjectId: project.id, projects: [project] };
}

export function loadStore(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_STORE_KEY);
    if (!raw) return seedStore();
    return parseStore(JSON.parse(raw)) ?? seedStore();
  } catch {
    return seedStore();
  }
}

export function saveStore(store: DemoStore): string | null {
  try {
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
    return null;
  } catch {
    return "Локальные данные не записались. Изменения есть только до перезагрузки.";
  }
}

export function findProject(store: DemoStore, projectId: string | null): Project | undefined {
  if (projectId === null) {
    return store.projects.find((project) => project.id === store.lastProjectId) ?? store.projects[0];
  }
  return store.projects.find((project) => project.id === projectId);
}

export function buildProject(input: NewProjectInput): Project {
  return {
    id: createId("project"),
    name: input.name.trim(),
    summary: input.summary.trim(),
    category: input.category,
    goal: input.goal.trim(),
    projectType: input.projectType,
    visibility: input.visibility,
    participants: demoParticipants(),
    stages: [
      {
        id: createId("stage"),
        name: input.initialStage.trim(),
        tasks: [],
      },
    ],
  };
}

export function addProject(store: DemoStore, input: NewProjectInput): DemoStore & { created: Project } {
  const created = buildProject(input);
  return {
    version: 1,
    lastProjectId: created.id,
    projects: [...store.projects, created],
    created,
  };
}

export function rememberProject(store: DemoStore, projectId: string): DemoStore {
  if (!store.projects.some((project) => project.id === projectId)) return store;
  if (store.lastProjectId === projectId) return store;
  return { ...store, lastProjectId: projectId };
}

export function addStage(
  store: DemoStore,
  projectId: string,
  name: string,
): { store: DemoStore; stageId: string } | { error: string } {
  const title = name.trim();
  if (!title) return { error: "Нужно название этапа." };
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) return { error: "Проект не найден." };
  if (project.stages.length >= MAX_STAGES) {
    return { error: `Новый этап недоступен: в сцене уже ${MAX_STAGES}.` };
  }
  const stageId = createId("stage");
  return {
    stageId,
    store: mapProject(store, projectId, (current) => ({
      ...current,
      stages: [...current.stages, { id: stageId, name: title, tasks: [] }],
    })),
  };
}

export function addTask(
  store: DemoStore,
  projectId: string,
  stageId: string,
  draft: TaskDraft,
): { store: DemoStore; taskId: string } | { error: string } {
  const project = store.projects.find((item) => item.id === projectId);
  const stage = project?.stages.find((item) => item.id === stageId);
  if (!project || !stage) return { error: "Этап не найден." };
  if (stage.tasks.length >= MAX_TASKS_PER_STAGE) {
    return { error: `Новая задача недоступна: в этапе уже ${MAX_TASKS_PER_STAGE}.` };
  }
  const task = taskFromDraft(createId("task"), draft, project);
  if (!task) return { error: "Нужно название задачи." };
  return {
    taskId: task.id,
    store: mapProject(store, projectId, (current) => ({
      ...current,
      stages: current.stages.map((item) =>
        item.id === stageId ? { ...item, tasks: [...item.tasks, task] } : item,
      ),
    })),
  };
}

export function updateTask(
  store: DemoStore,
  projectId: string,
  stageId: string,
  taskId: string,
  draft: TaskDraft,
): { store: DemoStore } | { error: string } {
  const project = store.projects.find((item) => item.id === projectId);
  const stage = project?.stages.find((item) => item.id === stageId);
  const existing = stage?.tasks.find((item) => item.id === taskId);
  if (!project || !stage || !existing) return { error: "Задача не найдена." };
  const task = taskFromDraft(existing.id, draft, project);
  if (!task) return { error: "Нужно название задачи." };
  return {
    store: mapProject(store, projectId, (current) => ({
      ...current,
      stages: current.stages.map((item) =>
        item.id === stageId
          ? { ...item, tasks: item.tasks.map((entry) => (entry.id === taskId ? task : entry)) }
          : item,
      ),
    })),
  };
}

function mapProject(store: DemoStore, projectId: string, update: (project: Project) => Project): DemoStore {
  return {
    ...store,
    projects: store.projects.map((project) => (project.id === projectId ? update(project) : project)),
  };
}

function taskFromDraft(id: string, draft: TaskDraft, project: Project): Task | null {
  const title = draft.title.trim();
  if (!title) return null;
  const assigneeId =
    draft.assigneeId && project.participants.some((person) => person.id === draft.assigneeId)
      ? draft.assigneeId
      : undefined;
  const due = draft.due && /^\d{4}-\d{2}-\d{2}$/.test(draft.due) ? draft.due : undefined;
  return {
    id,
    title,
    status: draft.status,
    priority: draft.priority,
    assigneeId,
    due,
  };
}

export function parseStore(value: unknown): DemoStore | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.projects)) return null;
  const projects = value.projects.map(parseProject).filter((project): project is Project => project !== null);
  if (projects.length === 0) return null;
  const requested = typeof value.lastProjectId === "string" ? value.lastProjectId : projects[0].id;
  const lastProjectId = projects.some((project) => project.id === requested) ? requested : projects[0].id;
  return { version: 1, lastProjectId, projects };
}

function parseProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;
  if (!Array.isArray(value.stages)) return null;
  const stages = value.stages.map(parseStage).filter((stage): stage is Stage => stage !== null);
  if (stages.length === 0) return null;
  const visibility: Visibility = value.visibility === "public" ? "public" : "private";
  return {
    id: value.id,
    name: value.name,
    summary: typeof value.summary === "string" ? value.summary : "",
    category: typeof value.category === "string" ? value.category : "Продукт",
    goal: typeof value.goal === "string" ? value.goal : "",
    projectType: typeof value.projectType === "string" ? value.projectType : "Приложение",
    visibility,
    stages,
    participants: parsePeople(value.participants),
  };
}

function parseStage(value: unknown): Stage | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  const tasks = Array.isArray(value.tasks)
    ? value.tasks.map(parseTask).filter((task): task is Task => task !== null)
    : [];
  return { id: value.id, name: value.name, tasks };
}

function parseTask(value: unknown): Task | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  if (typeof value.status !== "string" || !STATUSES.has(value.status as TaskStatus)) return null;
  const priority =
    typeof value.priority === "string" && PRIORITIES.has(value.priority as Priority)
      ? (value.priority as Priority)
      : "medium";
  const due = typeof value.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.due) ? value.due : undefined;
  const assigneeId = typeof value.assigneeId === "string" ? value.assigneeId : undefined;
  return { id: value.id, title: value.title, status: value.status as TaskStatus, priority, assigneeId, due };
}

function parsePeople(value: unknown): Person[] {
  if (!Array.isArray(value)) return demoParticipants();
  const people = value.filter(isPerson);
  return people.length > 0 ? people : demoParticipants();
}

function isPerson(value: unknown): value is Person {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.role === "owner" || value.role === "admin" || value.role === "member" || value.role === "viewer")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
