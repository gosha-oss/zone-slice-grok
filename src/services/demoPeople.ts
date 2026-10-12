import type { Person, Role } from "../types/project";

/** Fixed local roster. These people are not live accounts and cannot be invited. */
export const DEMO_PEOPLE: readonly Person[] = [
  { id: "mira", name: "Мира Волкова", role: "owner" },
  { id: "lev", name: "Лев Орлов", role: "admin" },
  { id: "nina", name: "Нина Берг", role: "member" },
  { id: "timur", name: "Тимур Саде", role: "viewer" },
];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
  viewer: "Наблюдатель",
};

export function demoParticipants(): Person[] {
  return DEMO_PEOPLE.map((person) => ({ ...person }));
}
