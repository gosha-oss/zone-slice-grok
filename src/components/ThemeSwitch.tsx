import { THEME_ORDER, THEME_TOKENS } from "../theme/tokens";
import { useTheme } from "../theme/theme-context";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tracking-[0.16em] text-muted uppercase">Тема</span>
      <div role="radiogroup" aria-label="Тема оформления" className="bh-segment">
        {THEME_ORDER.map((id) => {
          const selected = theme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(id)}
            >
              {THEME_TOKENS[id].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
