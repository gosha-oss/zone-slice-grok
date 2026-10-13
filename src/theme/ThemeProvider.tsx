import { useState, type ReactNode } from "react";
import { applyTheme, readStoredTheme, type ThemeId } from "./tokens";
import { ThemeContext } from "./theme-context";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme());

  const setTheme = (next: ThemeId) => {
    applyTheme(next);
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
