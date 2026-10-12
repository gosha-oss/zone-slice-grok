import { useEffect, useRef, useState } from "react";
import { ExplorePlaceholder } from "../features/projects/ExplorePlaceholder";
import { Landing } from "../features/projects/Landing";
import { ProjectUniverse } from "../features/projects/ProjectUniverse";
import { useMediaQuery, usePrefersReducedMotion } from "../lib/useMediaQuery";
import { demoProject } from "../services/demoProject";
import { AbyssScene } from "../scene/AbyssScene";
import type { SceneHandle } from "../scene/types";
import { useWebGLSupport } from "../scene/webgl";
import { useTheme } from "../theme/theme-context";
import type { Selection } from "../types/project";
import { QualitySwitch } from "../components/QualitySwitch";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { Wordmark } from "../components/Wordmark";
import { useQuality } from "./quality-context";
import { Link } from "./router";
import { useRoute } from "./route-context";

export function Shell() {
  const { route } = useRoute();
  const { theme } = useTheme();
  const { quality } = useQuality();
  const reducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery("(max-width: 700px)");
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const webgl = useWebGLSupport();
  const sceneApi = useRef<SceneHandle | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "project" });
  const [seenRoute, setSeenRoute] = useState(route);
  if (route !== seenRoute) {
    setSeenRoute(route);
    if (route === "/space") setSelection({ kind: "project" });
  }

  useEffect(() => {
    document.title =
      route === "/space" ? `${demoProject.name} — BuildHub` : route === "/explore" ? "Каталог — BuildHub" : "BuildHub";
  }, [route]);

  const resetView = () => {
    sceneApi.current?.resetView();
    setSelection({ kind: "project" });
  };

  return (
    <div className="relative h-dvh overflow-hidden text-ink">
      <AbyssScene
        mode={route === "/space" ? "universe" : "landing"}
        theme={theme}
        quality={quality}
        reducedMotion={reducedMotion}
        compact={compact}
        interactive={route === "/space"}
        project={demoProject}
        selection={selection}
        onSelect={setSelection}
        sceneApi={sceneApi}
        webgl={webgl}
      />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        {route === "/" && <div className="landing-scrim absolute inset-0" />}
        {route === "/explore" && <div className="explore-scrim absolute inset-0" />}
        {route === "/space" && <div className="top-fade absolute inset-x-0 top-0 h-28" />}
        <header className="relative z-40 flex flex-col gap-2 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center justify-between gap-3">
            {route === "/" ? (
              <span className="inline-flex items-center gap-2 text-xs tracking-[0.22em] text-muted uppercase">
                Вход
              </span>
            ) : (
              <Link to="/" className="pointer-events-auto" aria-label="BuildHub, на стартовый экран">
                <Wordmark />
              </Link>
            )}
            <p className="text-xs tracking-[0.14em] text-muted uppercase">
              <span className="sm:hidden">{webgl ? "Демо" : "Без WebGL"}</span>
              <span className="hidden sm:inline">{webgl ? "Демонстрационный режим" : "Демо · без WebGL"}</span>
            </p>
          </div>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <ThemeSwitch />
            <QualitySwitch />
          </div>
        </header>
        <main className="relative min-h-0 flex-1">
          {route === "/" && <Landing />}
          {route === "/explore" && <ExplorePlaceholder />}
          {route === "/space" && (
            <ProjectUniverse
              project={demoProject}
              selection={selection}
              onSelect={setSelection}
              onReset={resetView}
              webgl={webgl}
              quality={quality}
              coarsePointer={coarsePointer}
              reducedMotion={reducedMotion}
              sceneApi={sceneApi}
            />
          )}
        </main>
      </div>
    </div>
  );
}
