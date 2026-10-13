import { createContext, useContext } from "react";

export type AppLocation =
  | { kind: "landing" }
  | { kind: "world" }
  | { kind: "explore"; projectId: string | null }
  | { kind: "create" }
  | { kind: "space"; projectId: string | null };

type RouteContextValue = {
  location: AppLocation;
  navigate: (to: string) => void;
};

export const RouteContext = createContext<RouteContextValue | null>(null);

export function useRoute(): RouteContextValue {
  const value = useContext(RouteContext);
  if (!value) throw new Error("useRoute must be used inside Router");
  return value;
}

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function parseLocation(pathname: string): AppLocation {
  const path = normalizePath(pathname);
  if (path === "/" || path === "") return { kind: "landing" };
  if (path === "/world") return { kind: "world" };
  if (path === "/explore") return { kind: "explore", projectId: null };
  if (path.startsWith("/explore/")) {
    const id = decodeURIComponent(path.slice("/explore/".length));
    if (id && !id.includes("/")) return { kind: "explore", projectId: id };
  }
  if (path === "/new") return { kind: "create" };
  if (path === "/space") return { kind: "space", projectId: null };
  if (path.startsWith("/space/")) {
    const id = decodeURIComponent(path.slice("/space/".length));
    if (id && !id.includes("/")) return { kind: "space", projectId: id };
  }
  return { kind: "landing" };
}

export function isKnownPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/" || path === "/world" || path === "/explore" || path === "/new" || path === "/space") return true;
  if (path.startsWith("/explore/")) {
    const exploreId = path.slice("/explore/".length);
    return exploreId.length > 0 && !exploreId.includes("/");
  }
  if (!path.startsWith("/space/")) return false;
  const id = path.slice("/space/".length);
  return id.length > 0 && !id.includes("/");
}
