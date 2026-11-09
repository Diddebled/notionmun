import { useState } from "react";
import { Download, FileText, Maximize, Plus, Printer, Save, Trash2 } from "lucide-react";
import AppTopBar from "../components/AppTopBar";
import Dialog from "../components/Dialog";
import ConferenceService from "../services/ConferenceService";
import { downloadFile } from "../services/workspace";
import { randomId } from "../utils/randomId";

const newDraft = () => ({ id: randomId(), title: "", sponsors: "", status: "Draft", body: "" });

export default function ResolutionsPage() {
  const committee = ConferenceService.getActiveCommittee();
  const [documents, setDocuments] = useState(committee?.resolutions || []);
  const [draft, setDraft] = useState(() => ({ ...(committee?.resolutions?.[0] || newDraft()) }));
  const [dirty, setDirty] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [message, setMessage] = useState("");
  const hasDocument = Boolean(draft.title.trim() && draft.body.trim());
  function update(key, value) { setDraft((previous) => ({ ...previous, [key]: value })); setDirty(true); setMessage(""); }
  function persist(next) { committee.resolutions = next; ConferenceService.persist(); setDocuments(next); }
  function save(event) {
    event.preventDefault();
    if (!hasDocument) return;
    const next = { ...draft, title: draft.title.trim(), sponsors: draft.sponsors.trim(), body: draft.body.trim() };
    persist(documents.some((item) => item.id === next.id) ? documents.map((item) => item.id === next.id ? next : item) : [...documents, next]);
    setDraft(next); setDirty(false); setMessage("Resolution saved.");
  }
  function select(item) {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDraft({ ...item }); setDirty(false); setMessage("");
  }
  function remove() {
    if (!window.confirm(`Delete ${draft.title || "this draft"}?`)) return;
    const next = documents.filter((item) => item.id !== draft.id); persist(next);
    setDraft({ ...(next[0] || newDraft()) }); setDirty(false); setMessage("Resolution deleted.");
  }
  const content = `${draft.title}\n${committee?.committee || ""}\nSponsors: ${draft.sponsors}\nStatus: ${draft.status}\n\n${draft.body}\n`;
  return <div className="app-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <AppTopBar committeeLabel={committee?.committee} />
    <main className="workspace-content resolutions-workspace">
      <div className="page-title-row"><div><span className="section-kicker">Resolution desk</span><h1>Drafts & resolutions</h1></div><button className="primary-button" onClick={() => select(newDraft())}><Plus size={16} />New resolution</button></div>
      <div className="resolution-layout">
        <aside aria-label="Resolution documents"><h2>Documents <span>{documents.length}</span></h2>
          {documents.map((item) => <button key={item.id} className={`resolution-item ${item.id === draft.id ? 'selected' : ''}`} onClick={() => select(item)}><FileText size={18} /><span><strong>{item.title}</strong><small>{item.status}</small></span></button>)}
          {!documents.length && <p className="empty-note">No resolutions yet.</p>}
        </aside>
        <form className="resolution-form" onSubmit={save}>
          <div className="section-heading"><h2>{documents.some((item) => item.id === draft.id) ? "Edit resolution" : "New draft"}</h2><span className="muted">{dirty ? "Unsaved changes" : ""}</span></div>
          <label>Title<input required maxLength={160} aria-label="Resolution title" placeholder="Draft resolution 1.1" value={draft.title} onChange={(e) => update('title', e.target.value)} /></label>
          <div className="form-two-columns"><label>Sponsors<input aria-label="Sponsors" placeholder="Brazil, Ghana, Japan" value={draft.sponsors} onChange={(e) => update('sponsors', e.target.value)} /></label><label>Status<select aria-label="Resolution status" value={draft.status} onChange={(e) => update('status', e.target.value)}>{['Draft', 'Introduced', 'Adopted', 'Rejected'].map((status) => <option key={status}>{status}</option>)}</select></label></div>
          <label>Resolution text<textarea required aria-label="Resolution text" rows={13} placeholder="The committee, ..." value={draft.body} onChange={(e) => update('body', e.target.value)} /></label>
          <div className="resolution-toolbar"><button type="submit" className="primary-button"><Save size={16} />Save resolution</button><button type="button" className="quiet-button" disabled={!hasDocument} onClick={() => setPresenting(true)}><Maximize size={16} />Present</button><button type="button" className="icon-button" title="Download resolution" aria-label="Download resolution" disabled={!hasDocument} onClick={() => downloadFile(`${draft.title.replace(/[^a-z0-9-]/gi, '-')}.txt`, content, 'text/plain')}><Download size={18} /></button><button type="button" className="icon-button danger-button" title="Delete resolution" aria-label="Delete resolution" onClick={remove}><Trash2 size={18} /></button></div>
          {message && <p role="status" className="notice">{message}</p>}
        </form>
      </div>
    </main>
    {presenting && <Dialog title="Resolution display" className="presentation-dialog" onClose={() => setPresenting(false)}><div className="presentation-actions"><button className="quiet-button" onClick={() => window.print()}><Printer size={16} />Print</button></div><article className="presented-resolution"><span className="section-kicker">{committee?.committee} / {draft.status}</span><h1>{draft.title}</h1><p className="resolution-sponsors">Sponsors: {draft.sponsors || 'Not specified'}</p><div>{draft.body}</div></article></Dialog>}
  </div>;
}
