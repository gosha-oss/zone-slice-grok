import { createContext, useContext } from "react";
import type { Quality } from "../theme/tokens";

type QualityContextValue = {
  quality: Quality;
  setQuality: (quality: Quality) => void;
};

export const QualityContext = createContext<QualityContextValue | null>(null);

export function useQuality(): QualityContextValue {
  const value = useContext(QualityContext);
  if (!value) throw new Error("useQuality must be used inside QualityProvider");
  return value;
}
