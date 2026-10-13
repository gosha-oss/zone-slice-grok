import { useState, type FormEvent } from "react";
import { Link } from "../../app/router";
import { allTasks, formatPercent, progressPercent } from "../../lib/progress";
import { useDemoData } from "../projects/demo-data-context";
import { CATALOG_STATUS_LABEL } from "./catalog";

export function PublicProjectPage({ projectId }: { projectId: string }) {
  const data = useDemoData();
  const project = data.projects.find((item) => item.id === projectId && item.visibility === "public");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="pointer-events-auto flex h-full items-end px-4 pb-8 sm:items-center sm:px-10">
        <section className="bh-panel w-full max-w-lg p-6">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим</p>
          <h1 className="mt-2 font-serif text-3xl">В открытом каталоге этого проекта нет</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">Закрытые проекты здесь не показываются.</p>
          <Link to="/explore" className="bh-button bh-button-primary mt-5">
            К каталогу
          </Link>
        </section>
      </div>
    );
  }

  const interest = data.interests.some((item) => item.projectId === project.id);
  const request = data.joinRequests.find((item) => item.projectId === project.id);
  const posts = data.posts.filter((item) => item.projectId === project.id);
  const progress = progressPercent(allTasks(project));

  const join = (event: FormEvent) => {
    event.preventDefault();
    const result = data.requestJoin(project.id, message);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessage("");
    setError(null);
  };

  return (
    <div className="pointer-events-auto h-full overflow-y-auto px-4 pt-2 pb-10 sm:px-8">
      <article className="bh-panel mx-auto w-full max-w-2xl p-5 sm:p-7">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим · открытый проект</p>
        <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">{project.name}</h1>
        <p className="mt-3 text-sm leading-relaxed">{project.summary}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">Цель: {project.goal}</p>
        <p className="mt-2 text-xs text-muted">
          {project.category} · {project.projectType} · {CATALOG_STATUS_LABEL[project.catalogStatus]} ·{" "}
          {formatPercent(progress)}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="bh-button bh-button-primary"
            aria-pressed={interest}
            onClick={() => data.expressInterest(project.id)}
          >
            {interest ? "Интерес сохранён" : "Мне интересно"}
          </button>
          <Link to="/explore" className="bh-button bh-button-ghost">
            К каталогу
          </Link>
        </div>
        {interest && (
          <p className="mt-2 text-xs text-muted">Интерес сохранён в этом браузере и никому не отправлен.</p>
        )}
        <h2 className="mt-6 font-serif text-2xl">Запрос на участие</h2>
        {request ? (
          <div className="mt-3 border border-line p-3">
            <p className="text-sm">{request.message}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Запрос сохранён локально и не доставлен другому аккаунту.
            </p>
          </div>
        ) : (
          <form className="mt-3 flex flex-col gap-3" onSubmit={join}>
            <label className="bh-field">
              Чем хотите помочь
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={280} />
            </label>
            {error && (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            )}
            <button type="submit" className="bh-button bh-button-ghost">
              Сохранить запрос
            </button>
            <p className="text-xs text-muted">Запрос останется в этом браузере и не будет доставлен.</p>
          </form>
        )}
        {posts.length > 0 && (
          <div className="mt-6">
            <h2 className="font-serif text-2xl">Запрос участников</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {posts.map((post) => (
                <li key={post.id} className="border border-line p-3 text-sm">
                  {post.role}. {post.text}
                  <p className="mt-1 text-xs text-muted">Демо-данные этого браузера, не публикация в сети.</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}
