import { formatPercent, nearestStage, progressPercent, allTasks } from "../../lib/progress";
import type { Project } from "../../types/project";
import { ParticipantList } from "../team/ParticipantList";

export function OverviewPanel({ project }: { project: Project }) {
  const stage = nearestStage(project);
  const recent = project.activity.slice(0, 5);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <h2 className="text-xs tracking-[0.16em] text-muted uppercase">Описание</h2>
        <p className="mt-2 text-sm leading-relaxed">{project.summary}</p>
      </div>
      <div>
        <h2 className="text-xs tracking-[0.16em] text-muted uppercase">Цель</h2>
        <p className="mt-2 text-sm leading-relaxed">{project.goal}</p>
      </div>
      <div>
        <h2 className="text-xs tracking-[0.16em] text-muted uppercase">Текущий этап</h2>
        <p className="mt-2 text-sm">
          {stage ? `${stage.name} · ${formatPercent(progressPercent(stage.tasks))}` : "Все этапы закрыты"}
        </p>
        <p className="mt-1 text-xs text-muted">
          Весь проект: {formatPercent(progressPercent(allTasks(project)))}
        </p>
      </div>
      <ParticipantList people={project.participants} />
      <div>
        <h2 className="text-xs tracking-[0.16em] text-muted uppercase">Последние изменения</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Изменений пока нет.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {recent.map((event) => (
              <li key={event.id} className="text-sm leading-relaxed">
                {event.summary}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
