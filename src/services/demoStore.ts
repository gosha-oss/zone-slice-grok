import { createId } from "../lib/ids";
import { isStageComplete } from "../lib/progress";
import { STATUS_LABEL } from "../lib/taskVisual";
import type {
  ActivityEvent,
  ActivityKind,
  CatalogStatus,
  DemoFile,
  Interest,
  JoinRequest,
  NewProjectInput,
  ParticipantPost,
  Person,
  Priority,
  Project,
  Stage,
  Task,
  TaskDraft,
  TaskStatus,
  Visibility,
} from "../types/project";
import { catalogSeedPost, createCatalogProjects } from "./catalogProjects";
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
  interests: Interest[];
  joinRequests: JoinRequest[];
  posts: ParticipantPost[];
};

export function seedStore(): DemoStore {
  const project = createSeedProject();
  return {
    version: 1,
    lastProjectId: project.id,
    projects: [project, ...createCatalogProjects()],
    interests: [],
    joinRequests: [],
    posts: [catalogSeedPost()],
  };
}

export function loadStore(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_STORE_KEY);
    if (!raw) return seedStore();
    return mergeCatalog(parseStore(JSON.parse(raw)) ?? seedStore());
  } catch {
    return seedStore();
  }
}

export function mergeCatalog(store: DemoStore): DemoStore {
  const ids = new Set(store.projects.map((project) => project.id));
  const extra = createCatalogProjects().filter((project) => !ids.has(project.id));
  const seedPost = catalogSeedPost();
  const posts = store.posts.some((post) => post.id === seedPost.id) ? store.posts : [seedPost, ...store.posts];
  if (extra.length === 0 && posts === store.posts) return store;
  return { ...store, projects: [...store.projects, ...extra], posts };
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
    catalogStatus: "active",
    participants: demoParticipants(),
    files: [
      {
        id: createId("file"),
        name: "Заметка.md",
        note: "Локальная демо-запись. Файл не загружался в хранилище.",
      },
    ],
    activity: [],
    stages: [
      {
        id: createId("stage"),
        name: input.initialStage.trim(),
        dependsOn: [],
        tasks: [],
      },
    ],
  };
}

export function addProject(store: DemoStore, input: NewProjectInput): DemoStore & { created: Project } {
  const created = buildProject(input);
  const stage = created.stages[0];
  created.activity = [
    makeEvent("stage_created", stage ? `Создан этап «${stage.name}».` : "Создан начальный этап."),
    makeEvent("participants_seeded", "В проект подставлен локальный список участников. Приглашения не отправлялись."),
  ];
  return {
    ...store,
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
  dependsOn: string[] = [],
): { store: DemoStore; stageId: string } | { error: string } {
  const title = name.trim();
  if (!title) return { error: "Нужно название этапа." };
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) return { error: "Проект не найден." };
  if (project.stages.length >= MAX_STAGES) {
    return { error: `Новый этап недоступен: в сцене уже ${MAX_STAGES}.` };
  }
  const stageId = createId("stage");
  const dependencyError = dependencyErrorFor(project.stages, stageId, dependsOn);
  if (dependencyError) return { error: dependencyError };
  return {
    stageId,
    store: mapProject(store, projectId, (current) => ({
      ...current,
      activity: [makeEvent("stage_created", `Создан этап «${title}».`), ...current.activity],
      stages: [...current.stages, { id: stageId, name: title, dependsOn, tasks: [] }],
    })),
  };
}

export function setStageDependency(
  store: DemoStore,
  projectId: string,
  stageId: string,
  dependsOn: string[],
): { store: DemoStore } | { error: string } {
  const project = store.projects.find((item) => item.id === projectId);
  const stage = project?.stages.find((item) => item.id === stageId);
  if (!project || !stage) return { error: "Этап не найден." };
  const dependencyError = dependencyErrorFor(project.stages, stageId, dependsOn);
  if (dependencyError) return { error: dependencyError };
  const same = stage.dependsOn.length === dependsOn.length && stage.dependsOn.every((id, index) => id === dependsOn[index]);
  if (same) return { store };
  return {
    store: mapProject(store, projectId, (current) => ({
      ...current,
      stages: current.stages.map((item) => (item.id === stageId ? { ...item, dependsOn } : item)),
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
  const wasComplete = isStageComplete(stage);
  const nextTasks = [...stage.tasks, task];
  return {
    taskId: task.id,
    store: mapProject(store, projectId, (current) => ({
      ...current,
      activity: activityAfterTaskChange(current.activity, {
        createdTitle: task.title,
        stageName: stage.name,
        wasComplete,
        isComplete: isStageComplete({ tasks: nextTasks }),
      }),
      stages: current.stages.map((item) => (item.id === stageId ? { ...item, tasks: nextTasks } : item)),
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
  const wasComplete = isStageComplete(stage);
  const nextTasks = stage.tasks.map((entry) => (entry.id === taskId ? task : entry));
  return {
    store: mapProject(store, projectId, (current) => ({
      ...current,
      activity: activityAfterTaskChange(current.activity, {
        stageName: stage.name,
        wasComplete,
        isComplete: isStageComplete({ tasks: nextTasks }),
        statusChange:
          existing.status === task.status
            ? undefined
            : { title: task.title, from: existing.status, to: task.status },
      }),
      stages: current.stages.map((item) => (item.id === stageId ? { ...item, tasks: nextTasks } : item)),
    })),
  };
}

function activityAfterTaskChange(
  activity: ActivityEvent[],
  change: {
    createdTitle?: string;
    stageName: string;
    wasComplete: boolean;
    isComplete: boolean;
    statusChange?: { title: string; from: TaskStatus; to: TaskStatus };
  },
): ActivityEvent[] {
  const next = [...activity];
  if (change.createdTitle) {
    next.unshift(makeEvent("task_created", `Создана задача «${change.createdTitle}» в этапе «${change.stageName}».`));
  }
  if (change.statusChange) {
    const { title, from, to } = change.statusChange;
    next.unshift(makeEvent("status_changed", `«${title}»: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}.`));
  }
  if (!change.wasComplete && change.isComplete) {
    next.unshift(makeEvent("stage_completed", `Этап «${change.stageName}» закрыт: все его задачи готовы.`));
  }
  return next;
}

function makeEvent(kind: ActivityKind, summary: string): ActivityEvent {
  return { id: createId("event"), at: new Date().toISOString(), kind, summary };
}

function dependencyErrorFor(stages: Stage[], stageId: string, dependsOn: string[]): string | null {
  if (dependsOn.includes(stageId)) return "Этап не может зависеть от себя.";
  if (dependsOn.some((id) => !stages.some((stage) => stage.id === id))) return "Такого этапа-зависимости нет.";
  if (hasCycle(stages, stageId, dependsOn)) return "Такая зависимость замыкает цикл.";
  return null;
}

function hasCycle(stages: Stage[], stageId: string, dependsOn: string[]): boolean {
  const links = new Map(stages.map((stage) => [stage.id, stage.dependsOn]));
  links.set(stageId, dependsOn);
  const visiting = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    visiting.add(id);
    for (const next of links.get(id) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(id);
    return false;
  };
  return visit(stageId);
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
  return {
    version: 1,
    lastProjectId,
    projects,
    interests: parseInterests(value.interests),
    joinRequests: parseJoinRequests(value.joinRequests),
    posts: parsePosts(value.posts),
  };
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
    catalogStatus: parseCatalogStatus(value.catalogStatus),
    stages,
    participants: parsePeople(value.participants),
    activity: parseActivity(value.activity, value.id),
    files: parseFiles(value.files, value.id),
  };
}

function parseStage(value: unknown): Stage | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  const tasks = Array.isArray(value.tasks)
    ? value.tasks.map(parseTask).filter((task): task is Task => task !== null)
    : [];
  const dependsOn = Array.isArray(value.dependsOn)
    ? value.dependsOn.filter((id): id is string => typeof id === "string")
    : defaultDependency(value.id);
  return { id: value.id, name: value.name, tasks, dependsOn };
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

function parseCatalogStatus(value: unknown): CatalogStatus {
  if (value === "recruiting" || value === "finished" || value === "active") return value;
  return "active";
}

function parseInterests(value: unknown): Interest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.projectId !== "string" || typeof item.at !== "string") return [];
    return [{ projectId: item.projectId, at: item.at }];
  });
}

function parseJoinRequests(value: unknown): JoinRequest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.projectId !== "string") return [];
    if (typeof item.message !== "string" || typeof item.at !== "string") return [];
    return [{ id: item.id, projectId: item.projectId, message: item.message, at: item.at }];
  });
}

function parsePosts(value: unknown): ParticipantPost[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.projectId !== "string") return [];
    if (typeof item.role !== "string" || typeof item.text !== "string" || typeof item.at !== "string") return [];
    return [{ id: item.id, projectId: item.projectId, role: item.role, text: item.text, at: item.at }];
  });
}

export function expressInterest(store: DemoStore, projectId: string): { store: DemoStore } | { error: string } {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project || project.visibility !== "public") return { error: "В каталоге нет этого открытого проекта." };
  if (store.interests.some((item) => item.projectId === projectId)) return { store };
  return {
    store: {
      ...store,
      interests: [{ projectId, at: new Date().toISOString() }, ...store.interests],
    },
  };
}

export function saveJoinRequest(
  store: DemoStore,
  projectId: string,
  message: string,
): { store: DemoStore } | { error: string } {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project || project.visibility !== "public") return { error: "В каталоге нет этого открытого проекта." };
  const text = message.trim();
  if (!text) return { error: "Напишите, чем хотите помочь." };
  if (store.joinRequests.some((item) => item.projectId === projectId)) return { store };
  return {
    store: {
      ...store,
      joinRequests: [
        { id: createId("join"), projectId, message: text, at: new Date().toISOString() },
        ...store.joinRequests,
      ],
    },
  };
}

export function publishParticipantPost(
  store: DemoStore,
  projectId: string,
  role: string,
  text: string,
): { store: DemoStore } | { error: string } {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project || project.visibility !== "public") return { error: "Запрос можно сохранить только для открытого проекта." };
  const roleText = role.trim();
  const body = text.trim();
  if (!roleText || !body) return { error: "Нужны роль и текст запроса." };
  const post: ParticipantPost = {
    id: createId("post"),
    projectId,
    role: roleText,
    text: body,
    at: new Date().toISOString(),
  };
  return {
    store: {
      ...store,
      posts: [post, ...store.posts],
      projects: store.projects.map((item) =>
        item.id === projectId && item.catalogStatus === "active" ? { ...item, catalogStatus: "recruiting" } : item,
      ),
    },
  };
}

function defaultDependency(stageId: string): string[] {
  if (stageId === "structure") return ["foundation"];
  if (stageId === "signal") return ["structure"];
  if (stageId === "horizon") return ["signal"];
  return [];
}

function parseActivity(value: unknown, projectId: string): ActivityEvent[] {
  if (!Array.isArray(value)) {
    return [
      {
        id: `participants-${projectId}`,
        at: "2026-10-01T09:00:00.000Z",
        kind: "participants_seeded",
        summary: "В проект подставлен локальный список участников. Приглашения не отправлялись.",
      },
    ];
  }
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.at !== "string" || typeof item.summary !== "string") {
      return [];
    }
    if (
      item.kind !== "task_created" &&
      item.kind !== "status_changed" &&
      item.kind !== "stage_completed" &&
      item.kind !== "stage_created" &&
      item.kind !== "participants_seeded"
    ) {
      return [];
    }
    return [{ id: item.id, at: item.at, kind: item.kind, summary: item.summary }];
  });
}

function parseFiles(value: unknown, projectId: string): DemoFile[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.note !== "string") {
        return [];
      }
      return [{ id: item.id, name: item.name, note: item.note }];
    });
  }
  if (projectId === "lumen-archive") return createSeedProject().files;
  return [];
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
