import { useState, type ReactNode } from "react";
import { defaultQuality, storeQuality, type Quality } from "../theme/tokens";
import { QualityContext } from "./quality-context";

export function QualityProvider({ children }: { children: ReactNode }) {
  const [quality, setQualityState] = useState<Quality>(() => defaultQuality());

  const setQuality = (next: Quality) => {
    storeQuality(next);
    setQualityState(next);
  };

  return <QualityContext.Provider value={{ quality, setQuality }}>{children}</QualityContext.Provider>;
}
