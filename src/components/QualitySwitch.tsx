import { useQuality } from "../app/quality-context";

export function QualitySwitch() {
  const { quality, setQuality } = useQuality();
  const simplified = quality === "low";

  return (
    <button
      type="button"
      className="bh-button bh-button-ghost"
      aria-pressed={simplified}
      aria-label={simplified ? "Вернуть высокую графику" : "Упростить графику"}
      onClick={() => setQuality(simplified ? "high" : "low")}
    >
      {simplified ? "Графика проще" : "Графика высокая"}
    </button>
  );
}
