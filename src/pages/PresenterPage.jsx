import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize, MonitorUp } from "lucide-react";
import Logo from "../components/Logo";
import Attribution from "../components/Attribution";
import Flag from "../components/Flag";
import { local } from "../utils/storage";
import { useAnchoredCountdown } from "../hooks/useAnchoredCountdown";
import { formatTime } from "../utils/formatTime";
import useWorkspace from "../hooks/useWorkspace";

function RoomTimer({ timer }) {
  const anchor = useMemo(() => timer ? { time: timer.time, value: timer.value } : null, [timer?.time, timer?.value]);
  const value = useAnchoredCountdown(anchor, Boolean(timer?.running));
  return <div className={`presenter-countdown ${timer?.overtime || value < 0 ? "overtime" : ""}`}><strong>{formatTime(Math.ceil(value ?? timer?.value ?? 0))}</strong><span>{timer ? timer.running ? value < 0 ? "Overtime" : "Remaining" : "Paused" : "Timer ready at the chair's desk"}</span></div>;
}

export default function PresenterPage() {
  useWorkspace(); const [clock, setClock] = useState(new Date()); const [selected, setSelected] = useState(""); const [documentId, setDocumentId] = useState(""); const [error, setError] = useState("");
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(timer); }, []);
  const conference = local.getJSON("motion-conference-session");
  const committee = conference?.committees?.[selected || conference?.activeCommittee];
  const live = committee ? local.getJSON(`notionmun-presenter-${committee.id}`) : null;
  const cached = committee ? local.getJSON(`motion-speakers-${committee.id}`) : null;
  const queue = live?.queue || cached?.queue || [];
  const speaker = live?.currentSpeaker || queue[0];
  const announcements = (committee?.desk?.announcements || []).filter((a) => a.status === "Published").sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 3);
  const agenda = [...(committee?.desk?.schedule || [])].filter((a) => a.status !== "Done").sort((a, b) => (a.start || "z").localeCompare(b.start || "z")).slice(0, 4);
  const resolution = committee?.resolutions?.find((r) => r.id === documentId);
  return <div className="app-shell presenter-page">
    <header className="presenter-toolbar"><Link to="/" aria-label="Return to the workspace"><Logo /></Link><div className="desk-actions"><select aria-label="Presenter committee" value={selected} onChange={(e) => { setSelected(e.target.value); setDocumentId(""); }}><option value="">Follow active committee</option>{Object.values(conference?.committees || {}).map((c) => <option key={c.id} value={c.id}>{c.committee}</option>)}</select><select aria-label="Presenter document" value={documentId} onChange={(e) => setDocumentId(e.target.value)}><option value="">Floor & queue</option>{(committee?.resolutions || []).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select><button className="quiet-button" onClick={() => { if (!document.documentElement.requestFullscreen) { setError("Fullscreen is unavailable in this browser. Use its fullscreen shortcut instead."); return; } document.documentElement.requestFullscreen().catch(() => setError("Your browser could not enter fullscreen.")); }}><Maximize size={16} />Fullscreen</button></div></header>
    {error && <p role="alert" className="notice error">{error}</p>}
    <main className="presenter-content"><div className="presenter-masthead"><div><span className="section-kicker">{conference?.name || "Presenter display"}</span><h1>{committee?.committee || "Open the workspace on this device to begin"}</h1><p>{committee?.topic || ""}</p></div><time>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
      {committee && (resolution ? <article className="presenter-resolution"><span className="desk-badge">{resolution.status}</span><h2>{resolution.title}</h2><p>Sponsors: {resolution.sponsors || "Not specified"}</p>{resolution.signatories && <p>Signatories: {resolution.signatories}</p>}<pre>{resolution.body}</pre></article> : <div className="presenter-grid"><section className="presenter-floor"><span className="section-kicker">{live?.activeMotionLabel || committee.activeMotion?.motion || "The floor"}</span><div className="presenter-speaker"><Flag countryCode={speaker?.countryCode} /><h2>{speaker?.country || "The floor is open"}</h2></div><RoomTimer timer={live?.timer} /><div className="presenter-attendance"><strong>{committee.delegates.filter((d) => d.present).length} / {committee.delegates.length}</strong> delegations present <span>·</span> <strong>{Math.max(queue.length - 1, 0)}</strong> waiting to speak</div></section><aside className="presenter-queue"><h2>Coming to the floor</h2><ol>{queue.slice(1, 9).map((item, i) => <li key={item.id}><span>{String(i + 1).padStart(2, "0")}</span><Flag countryCode={item.countryCode} /><strong>{item.country}</strong></li>)}</ol>{queue.length < 2 && <p>The speakers list is open.</p>}</aside></div>)}
      <div className="presenter-bottom-grid"><section><h2><MonitorUp size={18} />Committee bulletin</h2>{announcements.length ? announcements.map((a) => <article key={a.id} className={a.priority === "Urgent" ? "presenter-urgent" : ""}><strong>{a.title}</strong><p>{a.body}</p></article>) : <p>No published announcements.</p>}</section><section><h2>On the agenda</h2>{agenda.length ? agenda.map((a) => <article key={a.id}><span className="desk-badge">{a.status}</span><strong>{a.title}</strong>{a.start && <time>{new Date(a.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</article>) : <p>No upcoming agenda items.</p>}</section></div>
      <p className="presenter-device-note">This room display follows the chair's workspace in another tab on this device. Cloud broadcast is available separately for other devices.</p>
    </main><Attribution />
  </div>;
}
