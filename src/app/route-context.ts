import { createContext, useContext } from "react";

export type Route = "/" | "/space" | "/explore";

type RouteContextValue = {
  route: Route;
  navigate: (to: Route) => void;
};

export const RouteContext = createContext<RouteContextValue | null>(null);

export function useRoute(): RouteContextValue {
  const value = useContext(RouteContext);
  if (!value) throw new Error("useRoute must be used inside Router");
  return value;
}

export function parseRoute(pathname: string): Route | null {
  if (pathname === "/") return "/";
  if (pathname === "/space") return "/space";
  if (pathname === "/explore") return "/explore";
  return null;
}
