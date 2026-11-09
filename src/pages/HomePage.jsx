import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, ClipboardCheck, FileSpreadsheet, FileText, Gavel, Mic, MoreHorizontal, NotebookPen, RotateCcw, Upload } from "lucide-react";
import Flag from "../components/Flag";
import AppTopBar from "../components/AppTopBar";
import Dialog from "../components/Dialog";
import VenuePhoto from "../components/VenuePhoto";
import BrandQuote from "../components/BrandQuote";
import ConferenceService from "../services/ConferenceService";
import { createBackup, downloadFile, loadSampleConference, restoreBackup } from "../services/workspace";
import { dais } from "../utils/storage";
import { motionVoteKey, speakersKey } from "../committeeCaches";
import { BRAND } from "../brand";

export default function HomePage() {
  const fileInput = useRef(null);
  const backupInput = useRef(null);
  const [revision, refresh] = useState(0);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [samplePicker, setSamplePicker] = useState(false);
  const [notesStatus, setNotesStatus] = useState("");
  const conference = ConferenceService.getConference();
  const committee = ConferenceService.getActiveCommittee();
  const stats = ConferenceService.getStatistics();
  const session = dais.getJSON(speakersKey(committee?.id));
  const queue = Array.isArray(session?.queue) ? session.queue : [];
  const motionWork = dais.getJSON(motionVoteKey(committee?.id));
  const motionCount = Array.isArray(motionWork?.motionLog) ? motionWork.motionLog.length : 0;
  const documents = committee?.resolutions || [];
  const attendance = stats.delegates ? Math.round(stats.present / stats.delegates * 100) : 0;

  async function importConference(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Workbooks are limited to 10 MB.");
      const next = await ConferenceService.parseConference(file);
      if (!Object.keys(next.committees).length) throw new Error("No delegates were found in this workbook.");
      setPending(next);
    } catch (err) { setError(err.message || "The workbook could not be imported."); }
    finally { setBusy(false); }
  }

  async function importBackup(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setMessage("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Backups are limited to 10 MB.");
      const data = JSON.parse(await file.text());
      if (!window.confirm("Replace the current workspace with this backup?")) return;
      restoreBackup(data); refresh((n) => n + 1); setMessage("Workspace restored.");
    } catch (err) { setError(err.message || "This backup could not be restored."); }
  }

  function exportBackup() {
    downloadFile(`${BRAND.filePrefix}-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(createBackup(), null, 2));
    setMessage("Workspace backup exported.");
  }

  return <div className="app-shell workspace-home notion-overview">
    <AppTopBar />
    <main className="workspace-content">
      <input hidden ref={fileInput} type="file" accept=".xlsx,.csv,.tsv" onChange={importConference} aria-label="Import conference workbook" />
      <input hidden ref={backupInput} type="file" accept=".json" onChange={importBackup} aria-label="Restore workspace backup" />
      <div className="overview-utility-row"><span className="section-kicker">The chair's workspace</span><div className="workspace-actions">
        <button className="quiet-button" onClick={exportBackup}><ArrowDownToLine size={15} />Backup</button>
        <button className="icon-button" title="Restore workspace" aria-label="Restore workspace" onClick={() => backupInput.current.click()}><Upload size={17} /></button>
        <button className="icon-button" title="Sample conferences" aria-label="Sample conferences" onClick={() => setSamplePicker(true)}><MoreHorizontal size={20} /></button>
      </div></div>
      {error && <p role="alert" className="notice error">{error}</p>}
      {message && <p role="status" className="notice"><Check size={16} />{message}</p>}
      <section className="committee-heading">
        <div><h1>{committee?.committee || "Your committee"}</h1><div className="conference-meta"><span>{conference.name}</span>{conference.sample && <span className="sample-tag">Sample conference</span>}</div></div>
        <button className="primary-button" disabled={busy} onClick={() => fileInput.current.click()}><FileSpreadsheet size={16} />{busy ? "Importing..." : "Import conference"}</button>
      </section>
      <section className="session-meta-band">
        <label>Committee<select aria-label="Active committee" value={committee?.id || ""} onChange={(event) => { ConferenceService.setActiveCommittee(event.target.value); setNotesStatus(""); refresh((n) => n + 1); }}>
          {ConferenceService.getCommittees().map((item) => <option key={item.id} value={item.id}>{item.committee}</option>)}
        </select></label>
        <label className="agenda-field">On the agenda<input key={`${committee?.id}:${revision}`} aria-label="Committee agenda" defaultValue={committee?.topic || ""} placeholder="Committee agenda" onBlur={(event) => { committee.topic = event.target.value; ConferenceService.persist(); }} /></label>
      </section>
      <section className="overview-metrics" aria-label="Committee statistics">
        <div><span>In the room</span><strong>{String(stats.present).padStart(2, '0')}<small>/ {stats.delegates}</small></strong><div className="attendance-meter" role="meter" aria-label="Attendance" aria-valuenow={stats.present} aria-valuemin={0} aria-valuemax={stats.delegates}><i style={{ width: `${attendance}%` }} /></div></div>
        <div><span>Present & voting</span><strong>{String(committee?.delegates.filter((d) => d.voting).length || 0).padStart(2, '0')}</strong><span className="metric-footnote">delegations</span></div>
        <div><span>Waiting to speak</span><strong>{String(Math.max(queue.length - 1, 0)).padStart(2, '0')}</strong><span className="metric-footnote">on the list</span></div>
        <div><span>On the record</span><strong>{String(stats.spoken).padStart(2, '0')}</strong><span className="metric-footnote">delegations heard</span></div>
      </section>

      <div className="notion-desk-grid">
        <section className="floor-desk">
          <div className="desk-section-heading"><h2><Mic size={17} />The floor</h2><Link to="/session" title="Open floor" aria-label="Open floor"><ArrowRight size={18} /></Link></div>
          <div className="floor-band">
            <div className="floor-band-meta"><span>Current speaker</span><span className="floor-mode">{committee?.activeMotion?.motion || "Open floor"}</span></div>
            <div className="floor-delegation"><Flag countryCode={queue[0]?.countryCode} className="floor-flag" /><h2>{queue[0]?.country || "The floor is open"}</h2></div>
            <div className="floor-band-bottom"><span>{queue[0] ? 'Next voice, new perspective.' : 'Ready for a delegation.'}</span><Link className="floor-open-button" to="/session">Open speakers list<ArrowRight size={16} /></Link></div>
          </div>
          <div className="queue-heading"><h3>Speaking order</h3><Link to="/session">{Math.max(queue.length - 1, 0)} waiting<ChevronRight size={14} /></Link></div>
          <ol className="dashboard-queue">{queue.slice(1, 6).map((speaker, index) => <li key={speaker.id}><span className="queue-position">{String(index + 1).padStart(2, '0')}</span><Flag countryCode={speaker.countryCode} /><span>{speaker.country}</span><span className="queue-state">Waiting</span></li>)}</ol>
          {queue.length < 2 && <p className="empty-note">No delegations are waiting.</p>}
          <div className="desk-quick-actions"><Link to="/rollcall"><ClipboardCheck size={16} />Take attendance</Link><Link to="/motion"><Gavel size={16} />Manage motions</Link><Link to="/resolutions"><FileText size={16} />Resolution desk</Link></div>
        </section>
        <aside className="notion-notebook">
          <VenuePhoto committeeLabel={committee?.committee} />
          <section className="chair-notes"><div className="desk-section-heading"><h2><NotebookPen size={17} />Chair's notebook</h2><span className="notes-dot" /></div>
            <textarea key={`${committee?.id}:${revision}`} aria-label="Chair's notes" maxLength={8000} defaultValue={committee?.chairNotes || ''} placeholder="Session notes" onChange={(event) => { committee.chairNotes = event.target.value; ConferenceService.persist(); setNotesStatus('Saved locally'); }} />
            <div className="notes-save-state" role="status">{notesStatus || 'Committee notes'}{notesStatus && <Check size={12} />}</div>
          </section>
          <section className="working-docket"><div className="desk-section-heading"><h2>Working docket</h2></div>
            <Link to="/motion"><Gavel size={16} /><span>Motions on record</span><strong>{String(motionCount).padStart(2, '0')}</strong><ChevronRight size={14} /></Link>
            <Link to="/resolutions"><FileText size={16} /><span>Draft resolutions</span><strong>{String(documents.filter((d) => d.status !== 'Adopted' && d.status !== 'Rejected').length).padStart(2, '0')}</strong><ChevronRight size={14} /></Link>
            <Link to="/stats"><ClipboardCheck size={16} /><span>Committee report</span><ArrowRight size={15} /></Link>
          </section>
          <div className="notebook-signoff"><span>nM.</span><p>{BRAND.tagline}</p></div>
          <BrandQuote />
        </aside>
      </div>
    </main>
    {pending && <Dialog title="Choose a committee" onClose={() => setPending(null)}><p className="muted">{pending.name}</p><div className="picker-list">{Object.values(pending.committees).map((item) => <button key={item.id} onClick={() => { ConferenceService.commitConference(pending, item.id); setPending(null); refresh((n) => n + 1); setMessage('Conference imported.'); }}><span>{item.committee}</span><span>{item.delegates.length} delegates<ChevronRight size={16} /></span></button>)}</div></Dialog>}
    {samplePicker && <Dialog title="Load sample conference" onClose={() => setSamplePicker(false)}><div className="picker-list">{['United Nations Security Council', 'SOCHUM'].map((name, index) => <button key={name} onClick={() => { if (!window.confirm('Replace the current workspace with sample data?')) return; loadSampleConference(index); setSamplePicker(false); refresh((n) => n + 1); }}><span>{name}</span><RotateCcw size={16} /></button>)}</div></Dialog>}
  </div>;
}
