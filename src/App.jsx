import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Attribution from "./components/Attribution";
import WorkspaceNav from "./components/WorkspaceNav";
import CommandPalette from "./components/CommandPalette";
import ConferenceService from "./services/ConferenceService";
import NoCommitteeModal from "./components/NoCommitteeModal";
import useWorkspace from "./hooks/useWorkspace";

const SessionPage = lazy(() => import("./pages/SessionPage"));
const RollCallPage = lazy(() => import("./pages/RollCallPage"));
const MotionPage = lazy(() => import("./pages/MotionPage"));
const GeneralVotingPage = lazy(() => import("./pages/GeneralVotingPage"));
const TimerPage = lazy(() => import("./pages/TimerPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ResolutionsPage = lazy(() => import("./pages/ResolutionDeskPage"));
const OrganizerPage = lazy(() => import("./pages/OrganizerPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const AgendaPage = lazy(() => import("./pages/AgendaPage"));
const BallotPage = lazy(() => import("./pages/BallotPage"));
const PresetsPage = lazy(() => import("./pages/PresetsPage"));
const PresenterPage = lazy(() => import("./pages/PresenterPage"));
const ToolsPage = lazy(() => import("./pages/ToolsPage"));
const CloudSessionsPage = lazy(() => import("./pages/CloudSessionsPage"));
const DelegateSessionPage = lazy(() => import("./pages/DelegateSessionPage"));
const LicensePage = lazy(() => import("./pages/LicensePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  useWorkspace();
  const { pathname } = useLocation();
  const protectedPage = (page) => ConferenceService.getActiveCommittee() ? page : <NoCommitteeModal />;
  if (pathname === "/present") return <Suspense fallback={<p className="loading-state">Loading presenter…</p>}><PresenterPage /></Suspense>;
  return (
    <div className="app-shell notion-layout">
      <WorkspaceNav />
      <CommandPalette />
      <div className="notion-main">
      <Suspense fallback={<div className="app-shell loading-state" role="status">Loading committee workspace...</div>}>
        <Routes key={ConferenceService.getActiveCommitteeId()}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/rollcall" element={<RollCallPage />} />
          <Route path="/motion" element={<MotionPage />} />
          <Route path="/vote" element={<GeneralVotingPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/resolutions" element={protectedPage(<ResolutionsPage />)} />
          <Route path="/organizer" element={<OrganizerPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/agenda" element={protectedPage(<AgendaPage />)} />
          <Route path="/ballot" element={protectedPage(<BallotPage />)} />
          <Route path="/presets" element={protectedPage(<PresetsPage />)} />
          <Route path="/help" element={<ToolsPage />} />
          <Route path="/feedback" element={<ToolsPage initialTab="feedback" />} />
          <Route path="/debug" element={<ToolsPage initialTab="diagnostics" />} />
          <Route path="/refer" element={<ToolsPage initialTab="share" />} />
          <Route path="/team" element={<ToolsPage />} />
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
