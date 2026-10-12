import type { Project } from "../types/project";

/**
 * One local project. The scene, the progress math, and the panel all read this object.
 * There is no account, no sync, and no second project in this slice.
 */
export const demoProject: Project = {
  id: "lumen-archive",
  name: "Архив Люмен",
  summary: "Карта решений команды: каждое решение остаётся на своём месте, а не в переписке.",
  goal: "Собрать первую версию, где этап и его задачи видны как один объект.",
  stages: [
    {
      id: "foundation",
      name: "Основа",
      tasks: [
        { id: "goal", title: "Сформулировать цель продукта", status: "done" },
        { id: "frame", title: "Собрать каркас пространства", status: "done" },
      ],
    },
    {
      id: "structure",
      name: "Структура",
      tasks: [
        { id: "stages", title: "Разложить работу на этапы", status: "done" },
        { id: "link", title: "Связать задачи с объектами", status: "in_progress" },
        { id: "meter", title: "Показать прогресс на сцене", status: "todo" },
      ],
    },
    {
      id: "signal",
      name: "Сигнал",
      tasks: [
        { id: "review", title: "Отметить проверку решений", status: "in_review" },
        {
          id: "overdue",
          title: "Закрыть просроченный контур",
          status: "todo",
          due: "2026-09-28",
        },
      ],
    },
    {
      id: "horizon",
      name: "Горизонт",
      tasks: [{ id: "access", title: "Подготовить общий доступ", status: "backlog" }],
    },
  ],
};
