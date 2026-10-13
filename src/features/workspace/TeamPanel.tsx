import { ROLE_LABEL } from "../../services/demoPeople";
import type { Project } from "../../types/project";

export function TeamPanel({ project }: { project: Project }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-muted">
        Это заранее подготовленный список. Совместной работы нет.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {project.participants.map((person) => (
          <li key={person.id} className="flex items-baseline justify-between gap-3 border border-line px-3 py-2">
            <span className="text-sm">{person.name}</span>
            <span className="text-xs text-muted">{ROLE_LABEL[person.role]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className="bh-button bh-button-ghost" disabled>
          Пригласить
        </button>
        <p className="text-xs leading-relaxed text-muted">Недоступно без сервера. Приглашение не отправляется.</p>
        <button type="button" className="bh-button bh-button-ghost" disabled>
          Изменить доступ
        </button>
        <p className="text-xs leading-relaxed text-muted">Недоступно без сервера. Роли здесь только подписи.</p>
      </div>
    </div>
  );
}
