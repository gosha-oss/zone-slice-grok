import { useCallback, useEffect, useState, type ReactNode } from "react";
import { parseRoute, RouteContext, useRoute, type Route } from "./route-context";

export function Router({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname) ?? "/");

  useEffect(() => {
    if (parseRoute(window.location.pathname) === null) {
      window.history.replaceState({}, "", "/");
    }

    const onPop = () => {
      const next = parseRoute(window.location.pathname);
      if (next === null) {
        window.history.replaceState({}, "", "/");
        setRoute("/");
        return;
      }
      setRoute(next);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: Route) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, "", to);
    }
    setRoute(to);
  }, []);

  return <RouteContext.Provider value={{ route, navigate }}>{children}</RouteContext.Provider>;
}

export function Link({
  to,
  className,
  children,
}: {
  to: Route;
  className?: string;
  children: ReactNode;
}) {
  const { navigate } = useRoute();
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
