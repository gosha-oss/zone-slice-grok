import { useState, type FormEvent } from "react";
import { ProgressMeter } from "../../components/ProgressMeter";
import {
  allTasks,
  blockingStageNames,
  completedCount,
  formatPercent,
  isStageComplete,
  progressPercent,
} from "../../lib/progress";
import { MAX_STAGES } from "../../services/demoStore";
import type { Project } from "../../types/project";
import { useDemoData } from "../projects/demo-data-context";

export function RoadmapPanel({ project }: { project: Project }) {
  const data = useDemoData();
  const tasks = allTasks(project);
  const [name, setName] = useState("");
  const [dependsOn, setDependsOn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const result = data.addStage(project.id, name, dependsOn ? [dependsOn] : []);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setName("");
    setDependsOn("");
    setError(null);
  };

  return (
    <div className="mt-4">
      <ProgressMeter value={progressPercent(tasks)} label={`${completedCount(tasks)} из ${tasks.length} задач`} />
      <ul className="mt-4 flex flex-col gap-3">
        {project.stages.map((stage, index) => {
          const blocked = blockingStageNames(project, stage);
          const dependency = stage.dependsOn
            .map((id) => project.stages.find((item) => item.id === id)?.name)
            .filter((item): item is string => Boolean(item));
          return (
            <li key={stage.id} className="border border-line p-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm">
                  {index + 1}. {stage.name}
                </h3>
                <span className="text-sm tabular-nums">{formatPercent(progressPercent(stage.tasks))}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {dependency.length > 0 ? `Зависит от: ${dependency.join(", ")}` : "Зависимостей нет"}
                {" · "}
                {isStageComplete(stage) ? "этап закрыт" : blocked.length > 0 ? `ждёт ${blocked.join(", ")}` : "можно вести"}
              </p>
              <label className="bh-field mt-3">
                Зависимость
                <select
                  value={stage.dependsOn[0] ?? ""}
                  onChange={(event) => {
                    const next = event.target.value ? [event.target.value] : [];
                    const result = data.setStageDependency(project.id, stage.id, next);
                    if ("error" in result) setError(result.error);
                    else setError(null);
                  }}
                >
                  <option value="">Нет</option>
                  {project.stages
                    .filter((item) => item.id !== stage.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
      {project.stages.length >= MAX_STAGES ? (
        <p className="mt-3 text-xs text-muted">Новый этап недоступен: в сцене уже {MAX_STAGES}.</p>
      ) : (
        <form className="mt-4 flex flex-col gap-2" onSubmit={add}>
          <label className="bh-field">
            Новый этап
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          </label>
          <label className="bh-field">
            Зависит от
            <select value={dependsOn} onChange={(event) => setDependsOn(event.target.value)}>
              <option value="">Нет</option>
              {project.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="bh-button bh-button-ghost">
            Добавить этап
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
