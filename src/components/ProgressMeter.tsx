import { formatPercent } from "../lib/progress";

export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs tracking-[0.16em] text-muted uppercase">Прогресс</span>
        <span className="font-serif text-2xl tracking-[-0.03em]">{formatPercent(safe)}</span>
      </div>
      <div
        className="bh-meter mt-2"
        role="meter"
        aria-label="Прогресс проекта"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safe)}
        aria-valuetext={`${formatPercent(safe)}. ${label}`}
      >
        <span style={{ width: `${safe}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">{label}</p>
    </div>
  );
}
