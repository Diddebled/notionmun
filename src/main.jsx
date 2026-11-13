import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initAppTheme } from "./appTheme";
import { initializeWorkspace } from "./services/workspace";
import { initRecovery } from "./services/recovery";
import "./index.css";
import "./workspace.css";
import "./notion.css";
import "./desk.css";

initializeWorkspace();
initRecovery();
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
