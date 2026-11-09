import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initAppTheme } from "./appTheme";
import { initializeWorkspace } from "./services/workspace";
import "./index.css";
import "./workspace.css";
import "./notion.css";

initializeWorkspace();
initAppTheme();
const Router = import.meta.env.VITE_ROUTER_MODE === "hash" ? HashRouter : BrowserRouter;
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  import("./services/prefsSync").then(({ initPrefsSync }) => initPrefsSync());
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>
);
