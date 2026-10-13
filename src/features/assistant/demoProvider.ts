import { allTasks, blockingStageNames, nearestStage } from "../../lib/progress";
import { STATUS_LABEL } from "../../lib/taskVisual";
import type { Project, Task } from "../../types/project";
import type { AssistantProvider, AssistantRequest } from "./types";

const COMMANDS = [
  "Разбей идею на этапы",
  "Составь техническое задание",
  "Создай список задач для первой версии",
  "Предложи улучшения интерфейса",
  "Найди незакрытые задачи",
  "Подготовь план следующей итерации",
  "Объясни, как реализовать выбранную функцию",
] as const;

export { COMMANDS as DEMO_ASSISTANT_COMMANDS };

export function createDemoAssistant(): AssistantProvider {
  return {
    id: "demo-script",
    label: "Демонстрационный сценарий",
    reply(request) {
      return { mode: "demo", text: scriptedReply(request) };
    },
  };
}

function scriptedReply(request: AssistantRequest): string {
  const command = normalize(request.command);
  const project = request.project;
  if (!command) return unknown(project);
  if (command.includes("разбей идею")) return splitIdea(project);
  if (command.includes("техническое задание") || command.includes("составь тз")) return brief(project);
  if (command.includes("список задач")) return firstVersionTasks(project);
  if (command.includes("улучшен")) return interfaceNotes(project);
  if (command.includes("незакрыт")) return openTasks(project);
  if (command.includes("итерац")) return nextIteration(project);
  if (command.includes("реализовать") || command.includes("выбранную функцию")) {
    return explainSelection(project, request.selectedTaskTitle);
  }
  return unknown(project);
}

function splitIdea(project: Project): string {
  const names = project.stages.map((stage, index) => `${index + 1}. ${stage.name}`).join("\n");
  return [
    `Идея «${project.name}» уже разложена на этапы, которые есть в проекте:`,
    names || "Этапов пока нет.",
    `Цель: ${project.goal || "не задана"}.`,
    "Новые этапы я не создаю: это демонстрационный ответ, а не изменение данных.",
  ].join("\n");
}

function brief(project: Project): string {
  const tasks = allTasks(project)
    .map((task) => `- ${task.title} (${STATUS_LABEL[task.status]})`)
    .join("\n");
  return [
    `Техническое задание для «${project.name}».`,
    `Описание: ${project.summary || "нет"}.`,
    `Цель: ${project.goal || "нет"}.`,
    `Текущий этап: ${currentStageName(project)}.`,
    "Задачи:",
    tasks || "- задач нет",
  ].join("\n");
}

function firstVersionTasks(project: Project): string {
  const open = allTasks(project).filter((task) => task.status !== "done");
  if (open.length === 0) return `В «${project.name}» для первой версии не осталось незакрытых задач.`;
  const lines = open.map((task) => {
    const stage = project.stages.find((item) => item.tasks.some((entry) => entry.id === task.id));
    return `- ${task.title} — ${stage?.name ?? "без этапа"}, ${STATUS_LABEL[task.status]}`;
  });
  return [`Список незакрытых задач первой версии «${project.name}»:`, ...lines].join("\n");
}

function interfaceNotes(project: Project): string {
  return [
    `Заметки по интерфейсу «${project.name}», из цели «${project.goal || "цель не задана"}».`,
    "- Держать прогресс и сцену на одних и тех же задачах.",
    "- Не прятать текущий этап: он уже виден в обзоре и на дорожной карте.",
    "- Панели оставлять поверх сцены, а не вместо неё.",
    "Это демонстрационный список, данные проекта я не меняю.",
  ].join("\n");
}

function openTasks(project: Project): string {
  const open = allTasks(project).filter((task) => task.status !== "done");
  if (open.length === 0) return `Незакрытых задач в «${project.name}» нет.`;
  return ["Незакрытые задачи:", ...open.map((task) => `- ${task.title} — ${STATUS_LABEL[task.status]}`)].join("\n");
}

function nextIteration(project: Project): string {
  const stage = nearestStage(project);
  if (!stage) return `Все этапы «${project.name}» закрыты. Следующую итерацию можно начать с нового этапа.`;
  const blocked = blockingStageNames(project, stage);
  const open = stage.tasks.filter((task) => task.status !== "done");
  const lines = [
    `Следующая итерация держится за этап «${stage.name}».`,
    blocked.length > 0 ? `Он ждёт: ${blocked.join(", ")}.` : "Зависимости этого этапа уже закрыты или их нет.",
  ];
  if (open.length === 0) lines.push("В этапе нет открытых задач.");
  else lines.push(...open.map((task) => `- ${task.title}`));
  return lines.join("\n");
}

function explainSelection(project: Project, selectedTaskTitle: string | undefined): string {
  const task = selectedTask(project, selectedTaskTitle);
  if (!task) {
    return `Выбранной задачи нет. Текущий этап — «${currentStageName(project)}». Откройте задачу в списке, и я разберу её.`;
  }
  const stage = project.stages.find((item) => item.tasks.some((entry) => entry.id === task.id));
  return [
    `Как подойти к «${task.title}».`,
    `Этап: ${stage?.name ?? "не найден"}. Статус: ${STATUS_LABEL[task.status]}.`,
    `Это часть цели «${project.goal || "цель не задана"}».`,
    "Сначала зафиксируйте результат задачи в данных проекта, затем сцена покажет новый статус. Я не подключаюсь к модели и ничего не записываю сам.",
  ].join("\n");
}

function unknown(project: Project): string {
  return [
    "Я отвечаю только на заранее известные команды. Это не подключённая модель.",
    `Проект «${project.name}». Цель: ${project.goal || "не задана"}. Текущий этап: ${currentStageName(project)}.`,
  ].join("\n");
}

function currentStageName(project: Project): string {
  return nearestStage(project)?.name ?? "все этапы закрыты";
}

function selectedTask(project: Project, title: string | undefined): Task | undefined {
  if (!title) return undefined;
  return allTasks(project).find((task) => task.title === title);
}

function normalize(command: string): string {
  return command.toLowerCase().replaceAll("ё", "е").replaceAll("«", "").replaceAll("»", "").trim();
}

