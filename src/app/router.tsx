import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isKnownPath, parseLocation, RouteContext, useRoute, type AppLocation } from "./route-context";

export function Router({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<AppLocation>(() => parseLocation(window.location.pathname));

  useEffect(() => {
    if (!isKnownPath(window.location.pathname)) {
      window.history.replaceState({}, "", "/");
    }

    const onPop = () => {
      if (!isKnownPath(window.location.pathname)) {
        window.history.replaceState({}, "", "/");
        setLocation({ kind: "landing" });
        return;
      }
      setLocation(parseLocation(window.location.pathname));
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    const path = to.startsWith("/") ? to : `/${to}`;
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setLocation(parseLocation(path));
  }, []);

  return <RouteContext.Provider value={{ location, navigate }}>{children}</RouteContext.Provider>;
}

export function Link({
  to,
  className,
  children,
}: {
  to: string;
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
