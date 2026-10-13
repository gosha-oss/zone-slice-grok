import type { Project } from "../../types/project";

export function ActivityPanel({ project }: { project: Project }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-muted">
        История пишется из сохранённых действий в этом браузере.
      </p>
      {project.activity.length === 0 ? (
        <p className="mt-3 text-sm">Событий пока нет.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {project.activity.map((event) => (
            <li key={event.id} className="border-l border-line pl-3">
              <p className="text-xs text-muted">{formatWhen(event.at)}</p>
              <p className="mt-1 text-sm leading-relaxed">{event.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}
