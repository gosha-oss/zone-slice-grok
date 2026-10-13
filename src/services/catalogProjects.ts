import type { ParticipantPost, Project } from "../types/project";
import { demoParticipants } from "./demoPeople";

function catalogProject(input: {
  id: string;
  name: string;
  summary: string;
  category: string;
  goal: string;
  projectType: string;
  catalogStatus: Project["catalogStatus"];
  stage: string;
  taskTitle: string;
  taskStatus: Project["stages"][number]["tasks"][number]["status"];
}): Project {
  return {
    id: input.id,
    name: input.name,
    summary: input.summary,
    category: input.category,
    goal: input.goal,
    projectType: input.projectType,
    visibility: "public",
    catalogStatus: input.catalogStatus,
    participants: demoParticipants(),
    files: [],
    activity: [
      {
        id: `${input.id}-people`,
        at: "2026-10-02T09:00:00.000Z",
        kind: "participants_seeded",
        summary: "В проект подставлен локальный список участников. Приглашения не отправлялись.",
      },
    ],
    stages: [
      {
        id: `${input.id}-stage`,
        name: input.stage,
        dependsOn: [],
        tasks: [
          {
            id: `${input.id}-task`,
            title: input.taskTitle,
            status: input.taskStatus,
            priority: "medium",
          },
        ],
      },
    ],
  };
}

/** Public demo projects. They are local records, not accounts on a network. */
export function createCatalogProjects(): Project[] {
  return [
    catalogProject({
      id: "catalog-mayak",
      name: "Маяк",
      summary: "Тихий указатель для сигналов команды, без лишнего шума.",
      category: "Инструмент",
      goal: "Собрать первый контур сигналов.",
      projectType: "Приложение",
      catalogStatus: "active",
      stage: "Сигнал",
      taskTitle: "Отметить первый сигнал",
      taskStatus: "todo",
    }),
    catalogProject({
      id: "catalog-shelf",
      name: "Северная полка",
      summary: "Полевые наблюдения, разложенные по сезонам.",
      category: "Исследование",
      goal: "Собрать сезон наблюдений в одну полку.",
      projectType: "Эксперимент",
      catalogStatus: "recruiting",
      stage: "Сезон",
      taskTitle: "Разобрать зимние записи",
      taskStatus: "in_progress",
    }),
    catalogProject({
      id: "catalog-yard",
      name: "Тихий двор",
      summary: "Короткая игра про общий двор и закрытые двери.",
      category: "Игра",
      goal: "Закрыть первый дворный эпизод.",
      projectType: "Приложение",
      catalogStatus: "finished",
      stage: "Эпизод",
      taskTitle: "Закрыть первую дверь",
      taskStatus: "done",
    }),
    catalogProject({
      id: "catalog-paper",
      name: "Бумажный цех",
      summary: "Мастерская, где черновики становятся страницами продукта.",
      category: "Продукт",
      goal: "Довести черновик до первой страницы.",
      projectType: "Сайт",
      catalogStatus: "active",
      stage: "Черновик",
      taskTitle: "Собрать первую страницу",
      taskStatus: "todo",
    }),
    catalogProject({
      id: "catalog-notes",
      name: "Полевые заметки",
      summary: "Сборник коротких записей о том, как команда принимает решения.",
      category: "Другое",
      goal: "Оставить первый законченный набор заметок.",
      projectType: "Библиотека",
      catalogStatus: "finished",
      stage: "Набор",
      taskTitle: "Собрать первый набор",
      taskStatus: "done",
    }),
  ];
}

export function catalogSeedPost(): ParticipantPost {
  return {
    id: "post-shelf",
    projectId: "catalog-shelf",
    role: "Редактор",
    text: "Нужен человек, который разложит наблюдения по этапам.",
    at: "2026-10-02T10:00:00.000Z",
  };
}
