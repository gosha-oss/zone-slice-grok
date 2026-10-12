import { Link } from "../../app/router";

export function ExplorePlaceholder() {
  return (
    <div className="flex h-full items-end px-4 pb-8 sm:items-center sm:justify-end sm:px-10 sm:pb-0 lg:px-14">
      <section className="bh-panel pointer-events-auto w-full max-w-md p-6 sm:p-8">
        <p className="text-xs tracking-[0.22em] text-muted uppercase">Следующий этап</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.03em]">Каталог сообщества</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Обзор открытых проектов появится здесь следующим этапом. Сейчас это заготовка маршрута, а не
          социальная сеть и не лента чужих работ.
        </p>
        <p className="mt-4 text-xs tracking-[0.14em] text-muted uppercase">
          Демонстрационный режим · локальные данные
        </p>
        <Link to="/" className="bh-button bh-button-primary mt-6">
          На стартовый экран
        </Link>
      </section>
    </div>
  );
}
