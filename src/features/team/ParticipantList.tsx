import { ROLE_LABEL } from "../../services/demoPeople";
import type { Person } from "../../types/project";

export function ParticipantList({ people }: { people: readonly Person[] }) {
  return (
    <section className="mt-5">
      <h2 className="text-xs tracking-[0.16em] text-muted uppercase">Участники</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Локальный список. Это не совместная работа и не приглашения между аккаунтами.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {people.map((person) => (
          <li key={person.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span>{person.name}</span>
            <span className="text-xs text-muted">{ROLE_LABEL[person.role]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
