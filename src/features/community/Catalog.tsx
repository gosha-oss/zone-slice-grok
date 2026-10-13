import { useState, type FormEvent } from "react";
import { Link } from "../../app/router";
import { useDemoData } from "../projects/demo-data-context";
import { CATALOG_CATEGORIES, CATALOG_STATUS_LABEL, filterCatalog } from "./catalog";

export function Catalog() {
  const data = useDemoData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("");
  const [postText, setPostText] = useState("");
  const [postProjectId, setPostProjectId] = useState("");
  const [postError, setPostError] = useState<string | null>(null);
  const open = data.projects.filter((project) => project.visibility === "public");
  const results = filterCatalog(data.projects, query, category, status);
  const chosenProject = postProjectId || open[0]?.id || "";

  const publish = (event: FormEvent) => {
    event.preventDefault();
    const result = data.publishPost(chosenProject, role, postText);
    if ("error" in result) {
      setPostError(result.error);
      return;
    }
    setRole("");
    setPostText("");
    setPostError(null);
  };

  return (
    <div className="pointer-events-auto h-full overflow-y-auto px-4 pt-2 pb-10 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <section className="bh-panel p-5 sm:p-6">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим</p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">Открытые проекты</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Каталог этого браузера. Закрытые проекты сюда не попадают. Это не сеть и не чужие аккаунты.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="bh-field sm:col-span-3">
              Поиск по названию и описанию
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название или фраза" />
            </label>
            <label className="bh-field">
              Категория
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">Все</option>
                {CATALOG_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="bh-field">
              Статус
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Все</option>
                {Object.entries(CATALOG_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="self-end text-sm text-muted">{results.length} в выборке</p>
          </div>
          {results.length === 0 ? (
            <p className="mt-4 text-sm">Ничего не найдено среди открытых проектов.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {results.map((project) => (
                <li key={project.id}>
                  <Link to={`/explore/${project.id}`} className="block border border-line p-3 no-underline">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-2xl tracking-[-0.03em]">{project.name}</span>
                      <span className="text-xs text-muted">{CATALOG_STATUS_LABEL[project.catalogStatus]}</span>
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed">{project.summary}</span>
                    <span className="mt-2 block text-xs text-muted">{project.category}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bh-panel p-5 sm:p-6">
          <h2 className="font-serif text-2xl tracking-[-0.03em]">Запросы участников</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Демо-данные этого браузера, не публикация в сети. Запросы никому не отправляются.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {data.posts.map((post) => {
              const project = results.find((item) => item.id === post.projectId);
              if (!project) return null;
              return (
                <li key={post.id} className="border border-line p-3">
                  <p className="text-sm">{project.name}</p>
                  <p className="mt-1 text-sm">
                    {post.role}. {post.text}
                  </p>
                  <Link to={`/explore/${project.id}`} className="mt-2 inline-flex text-sm">
                    Открыть проект
                  </Link>
                </li>
              );
            })}
          </ul>
          <form className="mt-4 flex flex-col gap-3" onSubmit={publish}>
            <label className="bh-field">
              Открытый проект
              <select value={chosenProject} onChange={(event) => setPostProjectId(event.target.value)}>
                {open.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="bh-field">
              Роль
              <input value={role} onChange={(event) => setRole(event.target.value)} maxLength={80} />
            </label>
            <label className="bh-field">
              Текст запроса
              <textarea value={postText} onChange={(event) => setPostText(event.target.value)} rows={3} maxLength={280} />
            </label>
            {postError && (
              <p role="alert" className="text-sm text-bad">
                {postError}
              </p>
            )}
            <button type="submit" className="bh-button bh-button-primary">
              Сохранить запрос в каталог
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
