import { useState, type FormEvent } from "react";
import { useRoute } from "../../app/route-context";
import type { Visibility } from "../../types/project";
import { useDemoData } from "./demo-data-context";

const CATEGORIES = ["Продукт", "Инструмент", "Исследование", "Игра", "Другое"];
const TYPES = ["Приложение", "Сайт", "Библиотека", "Эксперимент"];

export function CreateProjectForm() {
  const { navigate } = useRoute();
  const { createProject, persistError } = useDemoData();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [goal, setGoal] = useState("");
  const [projectType, setProjectType] = useState(TYPES[0]);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [initialStage, setInitialStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !summary.trim() || !goal.trim() || !initialStage.trim()) {
      setError("Заполните название, описание, цель и начальный этап.");
      return;
    }
    const project = createProject({
      name,
      summary,
      category,
      goal,
      projectType,
      visibility,
      initialStage,
    });
    navigate(`/space/${project.id}`);
  };

  return (
    <div className="pointer-events-auto h-full overflow-y-auto px-4 py-4 sm:px-8">
      <form className="bh-panel mx-auto flex w-full max-w-lg flex-col gap-4 p-5 sm:p-7" onSubmit={submit}>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Демонстрационный режим</p>
        <h1 className="font-serif text-4xl tracking-[-0.03em]">Новый проект</h1>
        <p className="text-sm leading-relaxed text-muted">
          После создания откроется его пространство. Запись останется в этом браузере. Аккаунта нет, и данные
          никуда не отправляются.
        </p>
        <label className="bh-field">
          Название
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
        </label>
        <label className="bh-field">
          Краткое описание
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
            maxLength={280}
            rows={3}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="bh-field">
            Категория
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="bh-field">
            Тип проекта
            <select value={projectType} onChange={(event) => setProjectType(event.target.value)}>
              {TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="bh-field">
          Цель
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} required maxLength={280} rows={2} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">Видимость</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            Приватный
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            Публичный
          </label>
          <p className="text-xs leading-relaxed text-muted">
            Публичный проект попадает в каталог этого браузера. Приватный в каталог не попадает. Отправки в сеть
            нет.
          </p>
        </fieldset>
        <label className="bh-field">
          Начальный этап
          <input
            value={initialStage}
            onChange={(event) => setInitialStage(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        {persistError && (
          <p role="alert" className="text-sm text-bad">
            {persistError}
          </p>
        )}
        <button type="submit" className="bh-button bh-button-primary">
          Создать и открыть
        </button>
      </form>
    </div>
  );
}
