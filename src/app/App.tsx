import { QualityProvider } from "./QualityProvider";
import { Router } from "./router";
import { Shell } from "./Shell";
import { ThemeProvider } from "../theme/ThemeProvider";

export function App() {
  return (
    <ThemeProvider>
      <QualityProvider>
        <Router>
          <Shell />
        </Router>
      </QualityProvider>
    </ThemeProvider>
  );
}
