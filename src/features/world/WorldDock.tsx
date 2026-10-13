import { useState, type RefObject } from "react";
import { useRoute } from "../../app/route-context";
import {
  readFlightSettings,
  readWorldHintSeen,
  writeFlightSettings,
  writeWorldHintSeen,
  type FlightSettings,
} from "../../scene/flightSettings";
import type { SceneHandle } from "../../scene/types";
import type { Project } from "../../types/project";

export function WorldDock({
  projects,
  sceneApi,
}: {
  projects: readonly Project[];
  sceneApi: RefObject<SceneHandle | null>;
}) {
  const { navigate } = useRoute();
  const [settings, setSettings] = useState<FlightSettings>(() => readFlightSettings());
  const [hintSeen, setHintSeen] = useState(() => readWorldHintSeen());

  const change = (next: FlightSettings) => {
    writeFlightSettings(next);
    setSettings(readFlightSettings());
  };

  const dismiss = () => {
    writeWorldHintSeen();
    setHintSeen(true);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col gap-3 px-4 sm:px-6">
      <aside className="bh-panel pointer-events-auto w-full max-w-sm p-4">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Цифровая бездна</p>
        <p className="mt-2 text-sm leading-relaxed">Свободный полёт. Проекты открываются отдельно, каталог остаётся списком.</p>
        <div className="mt-3 flex flex-col gap-2">
          <label className="bh-field">
            Открыть проект
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) navigate(`/space/${event.target.value}`);
              }}
            >
              <option value="">Выберите сохранённый проект</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="bh-button bh-button-ghost" onClick={() => navigate("/explore")}>
            Каталог
          </button>
          <button type="button" className="bh-button bh-button-ghost" onClick={() => sceneApi.current?.resetView()}>
            Сбросить вид
          </button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm">Скорость и чувствительность</summary>
          <div className="mt-3 flex flex-col gap-3">
            <label className="bh-field">
              Скорость
              <input
                type="range"
                min={0.45}
                max={1.7}
                step={0.05}
                value={settings.speed}
                onChange={(event) => change({ ...settings, speed: Number(event.target.value) })}
              />
            </label>
            <label className="bh-field">
              Чувствительность взгляда
              <input
                type="range"
                min={0.35}
                max={1.8}
                step={0.05}
                value={settings.look}
                onChange={(event) => change({ ...settings, look: Number(event.target.value) })}
              />
            </label>
          </div>
        </details>
        <p className="mt-3 text-xs leading-relaxed text-muted">Esc отпускает мышь. Колесо двигает камеру только над сценой.</p>
      </aside>
      {!hintSeen && (
        <div className="bh-panel pointer-events-auto flex w-full max-w-xl items-start justify-between gap-3 p-4">
          <p className="text-sm leading-relaxed">
            WASD — полёт, Q и E — высота, мышь — взгляд. Колесо приближает, когда указатель на сцене. Esc отпускает мышь.
          </p>
          <button type="button" className="bh-button bh-button-ghost shrink-0" onClick={dismiss}>
            Понятно
          </button>
        </div>
      )}
    </div>
  );
}
