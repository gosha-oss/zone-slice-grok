import { useState } from "react";
import type { Project } from "../../types/project";
import { DEMO_ASSISTANT_COMMANDS, createDemoAssistant } from "./demoProvider";
import type { AssistantReply } from "./types";

const assistant = createDemoAssistant();

export function AssistantPanel({ project, selectedTaskTitle }: { project: Project; selectedTaskTitle?: string }) {
  const [command, setCommand] = useState<string>(DEMO_ASSISTANT_COMMANDS[4]);
  const [reply, setReply] = useState<AssistantReply | null>(null);

  const ask = (text: string) => {
    setCommand(text);
    setReply(assistant.reply({ command: text, project, selectedTaskTitle }));
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-muted">
        Демонстрационный режим. Ответ пишется целиком по сценарию и не идёт из подключённой модели.
      </p>
      <label className="bh-field">
        Команда
        <input value={command} onChange={(event) => setCommand(event.target.value)} />
      </label>
      <button type="button" className="bh-button bh-button-primary" onClick={() => ask(command)}>
        Спросить
      </button>
      <div className="flex flex-col gap-2">
        {DEMO_ASSISTANT_COMMANDS.map((item) => (
          <button key={item} type="button" className="bh-button bh-button-ghost justify-start text-left" onClick={() => ask(item)}>
            {item}
          </button>
        ))}
      </div>
      {reply && (
        <article className="border border-line p-3">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный ответ</p>
          <p className="mt-1 text-xs text-muted">Не подключённая модель. Текст не печатается потоком.</p>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{reply.text}</p>
        </article>
      )}
    </div>
  );
}
