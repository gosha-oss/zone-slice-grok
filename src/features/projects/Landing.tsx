import { ArrowRight } from "lucide-react";
import { Link } from "../../app/router";
import { AbyssMark } from "../../components/AbyssMark";

export function Landing() {
  return (
    <div className="flex h-full flex-col justify-end px-5 pb-10 sm:justify-center sm:px-10 sm:pb-16 lg:max-w-[38rem] lg:px-14">
      <AbyssMark className="h-9 w-9 text-accent" />
      <p className="mt-5 text-xs tracking-[0.28em] text-muted uppercase">Цифровая бездна</p>
      <h1 className="mt-3 font-serif text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.88] tracking-[-0.045em]">
        BuildHub
      </h1>
      <p className="mt-5 max-w-[28rem] text-lg leading-snug">
        Пространство, в котором продукт собирается из этапов и задач.
      </p>
      <div className="pointer-events-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <Link to="/space" className="bh-button bh-button-primary w-full sm:w-auto">
          Войти в пространство
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link to="/explore" className="bh-button bh-button-ghost w-full sm:w-auto">
          Исследовать проекты
        </Link>
      </div>
      <p className="mt-8 max-w-[26rem] text-sm leading-relaxed text-muted">
        Проект — не список в таблице. Его прогресс виден в самом пространстве.
      </p>
      <p className="mt-3 text-xs tracking-[0.14em] text-muted uppercase">
        Демонстрационный режим · локальные данные
      </p>
    </div>
  );
}
