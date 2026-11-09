import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Attribution from "./components/Attribution";
import WorkspaceNav from "./components/WorkspaceNav";

const SessionPage = lazy(() => import("./pages/SessionPage"));
const RollCallPage = lazy(() => import("./pages/RollCallPage"));
const MotionPage = lazy(() => import("./pages/MotionPage"));
const GeneralVotingPage = lazy(() => import("./pages/GeneralVotingPage"));
const TimerPage = lazy(() => import("./pages/TimerPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ResolutionsPage = lazy(() => import("./pages/ResolutionsPage"));
const CloudSessionsPage = lazy(() => import("./pages/CloudSessionsPage"));
const DelegateSessionPage = lazy(() => import("./pages/DelegateSessionPage"));
const LicensePage = lazy(() => import("./pages/LicensePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <div className="app-shell notion-layout">
      <WorkspaceNav />
      <div className="notion-main">
      <Suspense fallback={<div className="app-shell loading-state" role="status">Loading committee workspace...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/rollcall" element={<RollCallPage />} />
          <Route path="/motion" element={<MotionPage />} />
          <Route path="/vote" element={<GeneralVotingPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/resolutions" element={<ResolutionsPage />} />
          <Route path="/cloud" element={<CloudSessionsPage />} />
          <Route path="/s/:sessionId" element={<DelegateSessionPage />} />
          <Route path="/licensing" element={<LicensePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Attribution />
      </div>
    </div>
  );
}
