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
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex flex-col items-start gap-2 px-3 sm:px-4">
      <aside className="bh-panel pointer-events-auto w-full max-w-xl p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="bh-field min-w-0 flex-1">
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
          <button type="button" className="bh-button bh-button-ghost shrink-0" onClick={() => navigate("/explore")}>
            Каталог
          </button>
          <button
            type="button"
            className="bh-button bh-button-ghost shrink-0"
            onClick={() => sceneApi.current?.resetView()}
          >
            Сбросить вид
          </button>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm">Скорость и чувствительность</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
      </aside>
      {!hintSeen && (
        <div className="bh-panel pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 px-3 py-2">
          <p className="text-sm leading-snug">
            WASD — полёт, Q и E — высота, мышь — взгляд. Колесо работает над сценой. Esc отпускает мышь.
          </p>
          <button type="button" className="bh-button bh-button-ghost shrink-0" onClick={dismiss}>
            Понятно
          </button>
        </div>
      )}
    </div>
  );
}
