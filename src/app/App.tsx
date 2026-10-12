import { DemoDataProvider } from "../features/projects/DemoDataProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { QualityProvider } from "./QualityProvider";
import { Router } from "./router";
import { Shell } from "./Shell";

export function App() {
  return (
    <ThemeProvider>
      <QualityProvider>
        <Router>
          <DemoDataProvider>
            <Shell />
          </DemoDataProvider>
        </Router>
      </QualityProvider>
    </ThemeProvider>
  );
}
