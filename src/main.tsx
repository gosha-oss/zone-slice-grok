import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyTheme, readStoredTheme } from "./theme/tokens";
import "@fontsource-variable/literata/wght.css";
import "./index.css";

applyTheme(readStoredTheme());

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
