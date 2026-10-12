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
    participants: demoParticipants(),
    stages: [
      {
        id: "foundation",
        name: "Основа",
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
