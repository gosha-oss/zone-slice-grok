import type { CatalogStatus, Project } from "../../types/project";

export const CATALOG_STATUS_LABEL: Record<CatalogStatus, string> = {
  active: "В работе",
  recruiting: "Ищет участников",
  finished: "Завершён",
};

export const CATALOG_CATEGORIES = ["Продукт", "Инструмент", "Исследование", "Игра", "Другое"] as const;

export function publicProjects(projects: readonly Project[]): Project[] {
  return projects.filter((project) => project.visibility === "public");
}

export function filterCatalog(
  projects: readonly Project[],
  query: string,
  category: string,
  status: string,
): Project[] {
  const needle = query.trim().toLowerCase();
  return publicProjects(projects).filter((project) => {
    if (category !== "all" && project.category !== category) return false;
    if (status !== "all" && project.catalogStatus !== status) return false;
    if (!needle) return true;
    return project.name.toLowerCase().includes(needle) || project.summary.toLowerCase().includes(needle);
  });
}
