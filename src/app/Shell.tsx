import { useEffect, useRef, useState } from "react";
import { Catalog } from "../features/community/Catalog";
import { PublicProjectPage } from "../features/community/PublicProjectPage";
import { CreateProjectForm } from "../features/projects/CreateProjectForm";
import { Landing } from "../features/projects/Landing";
import { ProjectUniverse } from "../features/projects/ProjectUniverse";
import { useDemoData } from "../features/projects/demo-data-context";
import { useMediaQuery, usePrefersReducedMotion } from "../lib/useMediaQuery";
import { AbyssScene } from "../scene/AbyssScene";
import type { SceneHandle } from "../scene/types";
import { useWebGLSupport } from "../scene/webgl";
import { findProject } from "../services/demoStore";
import { useTheme } from "../theme/theme-context";
import type { Selection } from "../types/project";
import { QualitySwitch } from "../components/QualitySwitch";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { Wordmark } from "../components/Wordmark";
import { useQuality } from "./quality-context";
import { Link } from "./router";
import { useRoute } from "./route-context";

export function Shell() {
  const { location } = useRoute();
  const data = useDemoData();
  const { theme } = useTheme();
  const { quality } = useQuality();
  const reducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery("(max-width: 700px)");
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const webgl = useWebGLSupport();
  const sceneApi = useRef<SceneHandle | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "project" });
  const explicitId = location.kind === "space" ? location.projectId : null;
  const project =
    location.kind === "space"
      ? findProject(
          {
            version: 1,
            lastProjectId: data.lastProjectId,
            projects: data.projects,
            interests: data.interests,
            joinRequests: data.joinRequests,
            posts: data.posts,
          },
          explicitId,
        )
      : undefined;
  const exploreProject =
    location.kind === "explore" && location.projectId
      ? data.projects.find((item) => item.id === location.projectId && item.visibility === "public")
      : undefined;
  const missingProject = location.kind === "space" && explicitId !== null && !project;
  const projectKey = project?.id ?? "";
  const [seenProject, setSeenProject] = useState(projectKey);
  if (projectKey !== seenProject) {
    setSeenProject(projectKey);
    setSelection({ kind: "project" });
  }

  useEffect(() => {
    if (projectKey) data.remember(projectKey);
  }, [data, projectKey]);

  useEffect(() => {
    const title =
      location.kind === "create"
        ? "Новый проект — BuildHub"
        : location.kind === "explore"
          ? exploreProject
            ? `${exploreProject.name} — Каталог`
            : "Каталог — BuildHub"
          : project
            ? `${project.name} — BuildHub`
            : "BuildHub";
    document.title = title;
  }, [exploreProject, location.kind, project]);

  const resetView = () => {
    sceneApi.current?.resetView();
    setSelection({ kind: "project" });
  };

  const sceneProject = project ?? data.projects[0];
  const showUniverse = location.kind === "space" && project !== undefined;

  return (
    <div className="relative h-dvh overflow-hidden text-ink">
      <AbyssScene
        mode={showUniverse ? "universe" : "landing"}
        theme={theme}
        quality={quality}
        reducedMotion={reducedMotion}
        compact={compact}
        interactive={showUniverse}
        project={sceneProject}
        selection={selection}
        onSelect={setSelection}
        sceneApi={sceneApi}
        webgl={webgl}
      />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        {location.kind === "landing" && <div className="landing-scrim absolute inset-0" />}
        {(location.kind === "explore" || location.kind === "create" || missingProject) && (
          <div className="explore-scrim absolute inset-0" />
        )}
        {showUniverse && <div className="top-fade absolute inset-x-0 top-0 h-28" />}
        <header className="relative z-40 flex flex-col gap-2 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center justify-between gap-3">
            {location.kind === "landing" ? (
              <span className="inline-flex items-center gap-2 text-xs tracking-[0.22em] text-muted uppercase">
                Вход
              </span>
            ) : (
              <Link to="/" className="pointer-events-auto">
                <Wordmark />
              </Link>
            )}
            <p className="text-xs tracking-[0.14em] text-muted uppercase">
              <span className="sm:hidden">{webgl ? "Демо" : "Без WebGL"}</span>
              <span className="hidden sm:inline">{webgl ? "Демонстрационный режим" : "Демо · без WebGL"}</span>
            </p>
          </div>
          <div className="bh-toolbar pointer-events-auto">
            <Link to="/new" className="bh-button bh-button-ghost">
              Новый проект
            </Link>
            <ThemeSwitch />
            <QualitySwitch />
          </div>
        </header>
        <main className="relative min-h-0 flex-1">
          {location.kind === "landing" && <Landing />}
          {location.kind === "explore" && location.projectId === null && <Catalog />}
          {location.kind === "explore" && location.projectId !== null && (
            <PublicProjectPage projectId={location.projectId} />
          )}
          {location.kind === "create" && <CreateProjectForm />}
          {missingProject && (
            <div className="pointer-events-auto flex h-full items-end px-4 pb-8 sm:items-center sm:justify-end sm:px-10">
              <section className="bh-panel w-full max-w-md p-6">
                <h1 className="font-serif text-3xl">Проект не найден</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  В локальных данных этого браузера нет такого проекта.
                </p>
                <Link to="/space" className="bh-button bh-button-primary mt-5">
                  Открыть сохранённый проект
                </Link>
              </section>
            </div>
          )}
          {showUniverse && project && (
            <ProjectUniverse
              project={project}
              selection={selection}
              onSelect={setSelection}
              onReset={resetView}
              webgl={webgl}
              quality={quality}
              coarsePointer={coarsePointer}
              sceneApi={sceneApi}
            />
          )}
        </main>
      </div>
    </div>
  );
}
