import type { Project } from "../../types/project";

export function FilesPanel({ project }: { project: Project }) {
  return (
    <div className="mt-4">
      <p className="text-xs leading-relaxed text-muted">
        Локальные демо-материалы. Загрузка в защищённое хранилище недоступна: сервера нет, файлы никуда не
        отправляются.
      </p>
      {project.files.length === 0 ? (
        <p className="mt-3 text-sm">Записей нет.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {project.files.map((file) => (
            <li key={file.id} className="border border-line p-3">
              <p className="text-sm">{file.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{file.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
