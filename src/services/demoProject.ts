import type { Project } from "../types/project";
import { demoParticipants } from "./demoPeople";

/** Fresh copy of the seeded project. Mutations must not touch this template. */
export function createSeedProject(): Project {
  return {
    id: "lumen-archive",
    name: "Архив Люмен",
    summary: "Карта решений команды: каждое решение остаётся на своём месте, а не в переписке.",
    category: "Продукт",
    goal: "Собрать первую версию, где этап и его задачи видны как один объект.",
    projectType: "Приложение",
    visibility: "private",
    catalogStatus: "active",
    participants: demoParticipants(),
    files: [
      { id: "lumen-map", name: "Карта решений.md", note: "Локальная демо-запись. Файл не загружался в хранилище." },
      { id: "lumen-notes", name: "Заметки к цели.txt", note: "Локальная демо-запись. Файл не загружался в хранилище." },
    ],
    activity: [
      {
        id: "lumen-people",
        at: "2026-10-01T09:00:00.000Z",
        kind: "participants_seeded",
        summary: "В проект подставлен локальный список участников. Приглашения не отправлялись.",
      },
    ],
    stages: [
      {
        id: "foundation",
        name: "Основа",
        dependsOn: [],
        tasks: [
          {
            id: "goal",
            title: "Сформулировать цель продукта",
            status: "done",
            priority: "high",
            assigneeId: "mira",
          },
          {
            id: "frame",
            title: "Собрать каркас пространства",
            status: "done",
            priority: "medium",
            assigneeId: "lev",
          },
        ],
      },
      {
        id: "structure",
        name: "Структура",
        dependsOn: ["foundation"],
        tasks: [
          {
            id: "stages",
            title: "Разложить работу на этапы",
            status: "done",
            priority: "medium",
            assigneeId: "lev",
          },
          {
            id: "link",
            title: "Связать задачи с объектами",
            status: "in_progress",
            priority: "high",
            assigneeId: "nina",
          },
          {
            id: "meter",
            title: "Показать прогресс на сцене",
            status: "todo",
            priority: "medium",
          },
        ],
      },
      {
        id: "signal",
        name: "Сигнал",
        dependsOn: ["structure"],
        tasks: [
          {
            id: "review",
            title: "Отметить проверку решений",
            status: "in_review",
            priority: "medium",
            assigneeId: "lev",
          },
          {
            id: "overdue",
            title: "Закрыть просроченный контур",
            status: "todo",
            priority: "high",
            assigneeId: "nina",
            due: "2026-09-28",
          },
        ],
      },
      {
        id: "horizon",
        name: "Горизонт",
        dependsOn: ["signal"],
        tasks: [
          {
            id: "access",
            title: "Подготовить общий доступ",
            status: "backlog",
            priority: "low",
          },
        ],
      },
    ],
  };
}
