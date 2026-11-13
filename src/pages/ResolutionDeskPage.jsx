import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Download, FileText, History, Maximize, Plus, Printer, Save, Trash2, Vote } from "lucide-react";
import DeskPage, { DeskNotice } from "../components/DeskPage";
import Dialog from "../components/Dialog";
import ConferenceService from "../services/ConferenceService";
import { activeDesk, decideAmendment, logActivity, saveAmendment, saveRecovery, saveResolution } from "../services/desk";
import { downloadFile } from "../services/workspace";
import { randomId } from "../utils/randomId";
import useWorkspace from "../hooks/useWorkspace";

const emptyDraft = () => ({ id: randomId(), title: "", sponsors: "", signatories: "", status: "Draft", body: "", amendments: [], revisions: [] });
const statuses = ["Draft", "Introduced", "Adopted", "Rejected"];

export default function ResolutionDeskPage() {
  useWorkspace(); const navigate = useNavigate(); const committee = ConferenceService.getActiveCommittee(); const desk = activeDesk();
  const documents = committee.resolutions || [];
  const [draft, setDraft] = useState(() => ({ ...emptyDraft(), ...(desk.resolutionDraft || documents[0] || {}) }));
  const [dirty, setDirty] = useState(Boolean(desk.resolutionDraft));
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const [presenting, setPresenting] = useState(false); const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendment, setAmendment] = useState({ proposer: "", body: "" });
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [autoSaved, setAutoSaved] = useState(false);
  const savedDocument = documents.find((item) => item.id === draft.id);
  const editorRef = useRef({ draft, dirty });
  editorRef.current = { draft, dirty };
  const hasDocument = Boolean(draft.title.trim() && draft.body.trim());
  useEffect(() => {
    if (!dirty) return undefined;
    const persistDraft = () => { desk.resolutionDraft = draft; ConferenceService.persist(); };
    const timer = setTimeout(() => { persistDraft(); setAutoSaved(true); }, 650);
    return () => clearTimeout(timer);
  }, [draft, dirty]);
  useEffect(() => {
    const flush = () => { if (editorRef.current.dirty) { desk.resolutionDraft = editorRef.current.draft; ConferenceService.persist(); } };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);
  function update(key, value) { setDraft((old) => ({ ...old, [key]: value })); setDirty(true); setAutoSaved(false); setMessage(""); }
  function save(event) {
    event?.preventDefault();
    try { const next = saveResolution(draft); editorRef.current.dirty = false; setDraft(next); setDirty(false); desk.resolutionDraft = null; ConferenceService.persist(); setError(""); setMessage("Resolution saved. Earlier versions are retained below."); return next; } catch (e) { setError(e.message); return null; }
  }
  function select(item) {
    if (dirty && !window.confirm("Switch documents? The current editor draft will be replaced. Save the resolution first to keep it in the document list.")) return;
    editorRef.current.dirty = false; desk.resolutionDraft = null; ConferenceService.persist(); setDraft({ ...emptyDraft(), ...item }); setDirty(false); setMessage(""); setError("");
  }
  function remove() {
    if (!window.confirm(`Delete ${draft.title || "this draft"}? A recovery point will be saved first.`)) return;
    try { saveRecovery("Before deleting a resolution"); editorRef.current.dirty = false; committee.resolutions = documents.filter((r) => r.id !== draft.id); desk.resolutionDraft = null; logActivity("Resolution deleted", draft.title); setDraft({ ...emptyDraft(), ...(committee.resolutions[0] || {}) }); setDirty(false); setMessage("Resolution removed; a recovery point is available in Workspaces."); } catch (e) { setError(e.message); }
  }
  function duplicate() {
    try {
      const next = saveResolution({ ...draft, id: randomId(), title: `${draft.title} — copy`, status: "Draft", revisions: [] });
      editorRef.current.dirty = false; desk.resolutionDraft = null; ConferenceService.persist(); setDraft(next); setDirty(false); setMessage("Resolution duplicated."); setError("");
    } catch (err) { setError(err.message); }
  }
  function restoreVersion(revision) {
    if (!window.confirm(`Restore this version? ${dirty ? "Your unsaved editor changes will be replaced. " : ""}The current saved text will become an earlier version.`)) return;
    try {
      const next = saveResolution({ ...savedDocument, ...revision, id: savedDocument.id });
      editorRef.current.dirty = false; desk.resolutionDraft = null; ConferenceService.persist(); setDraft(next); setDirty(false); setMessage("Earlier version restored."); setError("");
    } catch (err) { setError(err.message); }
  }
  function decide(id, decision) {
    if (dirty) { setError("Save the resolution before deciding an amendment."); return; }
    if (decision === "Accepted" && !window.confirm("Accept this amendment and append its text to the resolution? An earlier version will be kept.")) return;
    try { decideAmendment(draft.id, id, decision); setDraft({ ...committee.resolutions.find((r) => r.id === draft.id) }); setMessage(`Amendment ${decision.toLowerCase()}.`); setError(""); } catch (e) { setError(e.message); }
  }
  const content = `${draft.title}\n${committee.committee}\nSponsors: ${draft.sponsors || "Not specified"}\nSignatories: ${draft.signatories || "Not specified"}\nStatus: ${draft.status}\n\n${draft.body}\n`;
  return <DeskPage title="Drafts & resolutions" eyebrow="Resolution desk" description="Develop drafts, track amendments and versions, then take the text to a recorded vote." actions={<button className="primary-button" onClick={() => select(emptyDraft())}><Plus size={16} />New resolution</button>}>
    <DeskNotice error={error} message={message} />
    <div className="resolution-layout desk-resolution-layout">
      <aside className="desk-card" aria-label="Resolution documents"><h2>Documents <span className="desk-count">{documents.length}</span></h2><div className="desk-form"><input aria-label="Search resolutions" placeholder="Search title or text" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter resolution status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
        {documents.filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || r.status === status)).map((r) => <button key={r.id} className={`resolution-item ${r.id === draft.id ? "selected" : ""}`} onClick={() => select(r)}><FileText size={18} /><span><strong>{r.title}</strong><small>{r.status} · {(r.amendments || []).length} amendments</small></span></button>)}{!documents.length && <p className="desk-empty">Create a draft to get started.</p>}
      </aside>
      <section className="desk-card"><form className="desk-form resolution-form" onSubmit={save}>
        <div className="section-heading"><h2>{savedDocument ? "Edit resolution" : "New draft"}</h2><span className="desk-hint" role="status">{dirty ? autoSaved ? "Editor draft saved locally" : "Saving editor draft…" : savedDocument ? "Resolution saved" : "New draft"}</span></div>
        <label>Title<input required maxLength={160} aria-label="Resolution title" placeholder="Draft resolution 1.1" value={draft.title} onChange={(e) => update("title", e.target.value)} /></label>
        <div className="form-two-columns"><label>Sponsors<input aria-label="Sponsors" maxLength={2000} value={draft.sponsors} onChange={(e) => update("sponsors", e.target.value)} /></label><label>Signatories<input aria-label="Signatories" maxLength={2000} value={draft.signatories || ""} onChange={(e) => update("signatories", e.target.value)} /></label></div>
        <div className="form-two-columns"><label>Status<select aria-label="Resolution status" value={draft.status} onChange={(e) => update("status", e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label><label>Template<select value="" onChange={(e) => { if (!e.target.value) return; if (draft.body && !window.confirm("Replace the editor text with the committee resolution template?")) return; update("body", `The ${committee.committee},\n\nRecalling the purposes and principles of the United Nations,\nRecognizing the need for cooperation on ${committee.topic || "the committee's agenda"},\n\n1. Calls upon Member States to strengthen cooperation;\n2. Encourages relevant organizations to provide technical support;\n3. Requests a review of progress at the next session.`); }}><option value="">Start from a template</option><option value="standard">Committee resolution</option></select></label></div>
        <label>Resolution text<textarea required aria-label="Resolution text" maxLength={100000} rows={16} value={draft.body} placeholder="The committee, …" onChange={(e) => update("body", e.target.value)} /></label>
        <div className="desk-editor-meta"><span>{draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0} words · {draft.body.length.toLocaleString()} characters</span><span>{(savedDocument?.revisions || []).length} earlier versions</span></div>
        <div className="resolution-toolbar"><button className="primary-button"><Save size={16} />Save resolution</button><button type="button" className="quiet-button" disabled={!hasDocument} onClick={() => setPresenting(true)}><Maximize size={16} />Present</button><button type="button" className="quiet-button" disabled={!savedDocument || dirty} onClick={() => navigate(`/ballot?resolution=${encodeURIComponent(draft.id)}`)}><Vote size={16} />Record a vote</button><button type="button" className="icon-button" aria-label="Download resolution" title="Download text" disabled={!hasDocument} onClick={() => downloadFile(`${draft.title.replace(/[^a-z0-9-]/gi, "-")}.txt`, content, "text/plain")}><Download size={18} /></button><button type="button" className="quiet-button" disabled={!hasDocument} onClick={() => downloadFile("notionmun-resolution.md", `# ${draft.title}\n\n**${committee.committee}**\n\n**Sponsors:** ${draft.sponsors}\n\n**Signatories:** ${draft.signatories || ""}\n\n${draft.body}\n`, "text/markdown")}>Markdown</button><button type="button" className="icon-button" aria-label="Duplicate resolution" title="Duplicate" disabled={!hasDocument} onClick={duplicate}><Copy size={17} /></button><button type="button" className="icon-button danger-button" aria-label="Delete resolution" title="Delete resolution" onClick={remove}><Trash2 size={18} /></button></div>
      </form>
      {savedDocument && <section className="desk-subsection"><div className="section-heading"><h2>Amendments <span className="desk-count">{(savedDocument.amendments || []).length}</span></h2><button className="quiet-button" disabled={dirty} onClick={() => { setAmendment({ proposer: "", body: "" }); setAmendmentOpen(true); }}><Plus size={15} />Propose amendment</button></div><p className="desk-hint">Accepted amendments are appended to the text and create an earlier version. Use the editor for clause replacement or deletion.</p>
        {(savedDocument.amendments || []).map((a) => <article className="desk-amendment" key={a.id}><div className="desk-inline-heading"><strong>{a.proposer || "Amendment"}</strong><span className="desk-badge">{a.status}</span></div><p>{a.body}</p>{a.status === "Proposed" && <div className="desk-actions"><button className="quiet-button" onClick={() => decide(a.id, "Accepted")}>Accept & append</button><button className="quiet-button" onClick={() => decide(a.id, "Rejected")}>Reject</button></div>}</article>)}
      </section>}
      {savedDocument?.revisions?.length > 0 && <section className="desk-subsection"><h2><History size={17} />Earlier versions</h2><div className="desk-history-list">{savedDocument.revisions.map((revision, i) => <details key={`${revision.at}-${i}`}><summary><strong>{revision.title}</strong><span>{new Date(revision.at).toLocaleString()}</span></summary><pre className="desk-document-text">{revision.body}</pre><button className="quiet-button" onClick={() => restoreVersion(revision)}>Restore this version</button></details>)}</div></section>}
      </section>
    </div>
    {amendmentOpen && <Dialog title="Propose an amendment" onClose={() => setAmendmentOpen(false)}><form className="desk-form" onSubmit={(e) => { e.preventDefault(); try { saveAmendment(draft.id, amendment); setDraft({ ...committee.resolutions.find((r) => r.id === draft.id) }); setAmendmentOpen(false); setMessage("Amendment added for consideration."); setError(""); } catch (err) { setError(err.message); } }}><label>Proposing delegation<input value={amendment.proposer} onChange={(e) => setAmendment({ ...amendment, proposer: e.target.value })} /></label><label>Text to append if accepted<textarea required rows={7} maxLength={10000} value={amendment.body} onChange={(e) => setAmendment({ ...amendment, body: e.target.value })} /></label><DeskNotice error={error} /><button className="primary-button">Save proposed amendment</button></form></Dialog>}
    {presenting && <Dialog title="Resolution display" className="presentation-dialog" onClose={() => setPresenting(false)}><div className="presentation-actions"><button className="quiet-button" onClick={() => window.print()}><Printer size={16} />Print / save PDF</button></div><article className="presented-resolution"><span className="section-kicker">{committee.committee} / {draft.status}</span><h1>{draft.title}</h1><p className="resolution-sponsors">Sponsors: {draft.sponsors || "Not specified"}</p>{draft.signatories && <p className="resolution-sponsors">Signatories: {draft.signatories}</p>}<div>{draft.body}</div></article></Dialog>}
  </DeskPage>;
}
