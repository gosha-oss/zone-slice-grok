export const FLIGHT_SETTINGS_KEY = "buildhub-flight";
export const WORLD_HINT_KEY = "buildhub-world-hint";

export type FlightSettings = {
  speed: number;
  look: number;
};

const DEFAULTS: FlightSettings = { speed: 1, look: 1 };

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeFlightSettings(value: Partial<FlightSettings> | null | undefined): FlightSettings {
  return {
    speed: clamp(value?.speed ?? DEFAULTS.speed, 0.45, 1.7),
    look: clamp(value?.look ?? DEFAULTS.look, 0.35, 1.8),
  };
}

let current = loadFlightSettings();

export function readFlightSettings(): FlightSettings {
  return current;
}

export function writeFlightSettings(next: FlightSettings): void {
  current = normalizeFlightSettings(next);
  try {
    localStorage.setItem(FLIGHT_SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // The sliders still apply until reload.
  }
}

function loadFlightSettings(): FlightSettings {
  try {
    const raw = localStorage.getItem(FLIGHT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return normalizeFlightSettings(JSON.parse(raw) as Partial<FlightSettings>);
  } catch {
    return { ...DEFAULTS };
  }
}

export function readWorldHintSeen(): boolean {
  try {
    return localStorage.getItem(WORLD_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeWorldHintSeen(): void {
  try {
    localStorage.setItem(WORLD_HINT_KEY, "1");
  } catch {
    // The hint can return next visit if storage is blocked.
  }
}
