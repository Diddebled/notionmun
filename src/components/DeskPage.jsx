import AppTopBar from "./AppTopBar";
import ConferenceService from "../services/ConferenceService";

export default function DeskPage({ title, eyebrow = "Committee workspace", description, actions, children }) {
  return <div className="app-shell desk-page">
    <AppTopBar committeeLabel={ConferenceService.getActiveCommittee()?.committee} />
    <main className="workspace-content desk-content">
      <header className="desk-page-heading"><div><span className="section-kicker">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="desk-actions">{actions}</div>}</header>
      {children}
    </main>
  </div>;
}

export function DeskNotice({ error, message }) {
  return <>{error && <p role="alert" className="notice error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}</>;
}
