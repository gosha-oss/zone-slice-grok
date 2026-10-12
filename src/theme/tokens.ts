export type ThemeId = "abyss" | "light" | "graphite";

export type Quality = "high" | "low";

export const THEME_STORAGE_KEY = "buildhub-theme";
export const QUALITY_STORAGE_KEY = "buildhub-quality";

type CssVars = {
  "--bh-bg": string;
  "--bh-ink": string;
  "--bh-muted": string;
  "--bh-accent": string;
  "--bh-on-accent": string;
  "--bh-line": string;
  "--bh-good": string;
  "--bh-warn": string;
  "--bh-bad": string;
  "--bh-surface": string;
  "--bh-shadow": string;
};

export type ScenePalette = {
  background: string;
  fog: string;
  fogDensity: number;
  metal: string;
  roughness: number;
  accent: string;
  filament: string;
  dust: string;
  mist: string;
  good: string;
  warn: string;
  bad: string;
  muted: string;
  ink: string;
  key: string;
  rim: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambient: number;
  keyIntensity: number;
  rimIntensity: number;
  coreEmissive: number;
  exposure: number;
};

export type ThemeTokens = {
  id: ThemeId;
  label: string;
  css: CssVars;
  scene: ScenePalette;
};

/**
 * Theme registry. A later custom theme is another ThemeId plus a token set here.
 * UI colors and the 3D palette live together so a theme changes both.
 */
export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  abyss: {
    id: "abyss",
    label: "Abyss",
    css: {
      "--bh-bg": "#08090d",
      "--bh-ink": "#ebe6dc",
      "--bh-muted": "#a39c91",
      "--bh-accent": "#d6b07a",
      "--bh-on-accent": "#1c140c",
      "--bh-line": "rgba(235, 230, 220, 0.16)",
      "--bh-good": "#8fbfa3",
      "--bh-warn": "#e0b15c",
      "--bh-bad": "#e08a78",
      "--bh-surface": "rgba(12, 14, 18, 0.92)",
      "--bh-shadow": "0 24px 60px rgba(0, 0, 0, 0.45)",
    },
    scene: {
      background: "#08090d",
      fog: "#08090d",
      fogDensity: 0.052,
      metal: "#2a303a",
      roughness: 0.42,
      accent: "#d6b07a",
      filament: "#8d8478",
      dust: "#d2c4ae",
      mist: "rgba(214, 176, 122, 0.22)",
      good: "#8fbfa3",
      warn: "#e0b15c",
      bad: "#e08a78",
      muted: "#a39c91",
      ink: "#ebe6dc",
      key: "#f4f0e8",
      rim: "#d6b07a",
      hemiSky: "#a7b0b8",
      hemiGround: "#08090d",
      hemiIntensity: 0.38,
      ambient: 0.16,
      keyIntensity: 2.2,
      rimIntensity: 0.5,
      coreEmissive: 0.07,
      exposure: 1.12,
    },
  },
  light: {
    id: "light",
    label: "Light",
    css: {
      "--bh-bg": "#e5dfd3",
      "--bh-ink": "#1c1915",
      "--bh-muted": "#5c564c",
      "--bh-accent": "#7a4b28",
      "--bh-on-accent": "#f7f2ea",
      "--bh-line": "rgba(28, 25, 21, 0.16)",
      "--bh-good": "#1c6a44",
      "--bh-warn": "#8a5a10",
      "--bh-bad": "#9c3d34",
      "--bh-surface": "rgba(247, 242, 234, 0.94)",
      "--bh-shadow": "0 18px 44px rgba(72, 52, 28, 0.14)",
    },
    scene: {
      background: "#e5dfd3",
      fog: "#e5dfd3",
      fogDensity: 0.038,
      metal: "#2a2622",
      roughness: 0.58,
      accent: "#7a4b28",
      filament: "#8a8176",
      dust: "#6a6158",
      mist: "rgba(48, 36, 24, 0.2)",
      good: "#1c6a44",
      warn: "#8a5a10",
      bad: "#9c3d34",
      muted: "#5c564c",
      ink: "#1c1915",
      key: "#fffaf3",
      rim: "#c4a27a",
      hemiSky: "#fff8ee",
      hemiGround: "#cfc6b6",
      hemiIntensity: 0.9,
      ambient: 0.42,
      keyIntensity: 1.45,
      rimIntensity: 0.4,
      coreEmissive: 0.03,
      exposure: 1,
    },
  },
  graphite: {
    id: "graphite",
    label: "Graphite",
    css: {
      "--bh-bg": "#15171a",
      "--bh-ink": "#eceae6",
      "--bh-muted": "#a8adb4",
      "--bh-accent": "#ddd6c8",
      "--bh-on-accent": "#17181b",
      "--bh-line": "rgba(236, 234, 230, 0.16)",
      "--bh-good": "#9dceb4",
      "--bh-warn": "#e2c48a",
      "--bh-bad": "#e3a094",
      "--bh-surface": "rgba(24, 26, 30, 0.94)",
      "--bh-shadow": "0 24px 50px rgba(0, 0, 0, 0.38)",
    },
    scene: {
      background: "#15171a",
      fog: "#15171a",
      fogDensity: 0.046,
      metal: "#3e444c",
      roughness: 0.74,
      accent: "#ddd6c8",
      filament: "#8e949c",
      dust: "#c9c6c1",
      mist: "rgba(221, 214, 200, 0.14)",
      good: "#9dceb4",
      warn: "#e2c48a",
      bad: "#e3a094",
      muted: "#a8adb4",
      ink: "#eceae6",
      key: "#f3f1ec",
      rim: "#b7bdc6",
      hemiSky: "#b7bcc4",
      hemiGround: "#121316",
      hemiIntensity: 0.48,
      ambient: 0.24,
      keyIntensity: 1.75,
      rimIntensity: 0.32,
      coreEmissive: 0.04,
      exposure: 1.02,
    },
  },
};

export const THEME_ORDER: readonly ThemeId[] = ["abyss", "light", "graphite"];

export function isThemeId(value: string | null): value is ThemeId {
  return value === "abyss" || value === "light" || value === "graphite";
}

export function readStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(value)) return value;
  } catch {
    // Storage can be blocked. The session still starts in Abyss.
  }
  return "abyss";
}

export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  const tokens = THEME_TOKENS[theme];
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  for (const [key, value] of Object.entries(tokens.css)) {
    root.style.setProperty(key, value);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tokens.css["--bh-bg"]);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this visit.
  }
}

export function readStoredQuality(): Quality | null {
  try {
    const value = localStorage.getItem(QUALITY_STORAGE_KEY);
    if (value === "high" || value === "low") return value;
  } catch {
    return null;
  }
  return null;
}

export function defaultQuality(): Quality {
  const stored = readStoredQuality();
  if (stored) return stored;
  const cores = navigator.hardwareConcurrency || 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || coarse || cores <= 2) return "low";
  return "high";
}

export function storeQuality(quality: Quality): void {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, quality);
  } catch {
    // Memory state is enough for this visit.
  }
}
