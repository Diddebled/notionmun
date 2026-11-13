import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Papa from "papaparse";
import DeskPage, { DeskNotice } from "../components/DeskPage";
import Dialog from "../components/Dialog";
import Flag from "../components/Flag";
import ConferenceService from "../services/ConferenceService";
import { addCommittee, captureAttendance, createConference, removeCommittee, removeDelegate, saveDelegate, saveWorkspace, updateCommittee, updateConference } from "../services/desk";
import { downloadFile } from "../services/workspace";
import useWorkspace from "../hooks/useWorkspace";
import { countries } from "../constants";

function CommitteeForm({ committee, onSave }) {
  const [draft, setDraft] = useState({ committee: committee.committee, topic: committee.topic || "", chairs: (committee.chairs || []).map((p) => p.name).join(", "), pages: (committee.pages || []).map((p) => p.name).join(", "), quorumPercent: committee.quorumPercent || 50 });
  const field = (key) => ({ value: draft[key], onChange: (e) => setDraft({ ...draft, [key]: e.target.value }) });
  return <form className="desk-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); }}>
    <label>Committee name<input required maxLength={160} {...field("committee")} /></label>
    <label>Agenda topic<textarea rows={2} maxLength={1000} {...field("topic")} /></label>
    <div className="form-two-columns"><label>Chairs, separated by commas<input {...field("chairs")} /></label><label>Pages, separated by commas<input {...field("pages")} /></label></div>
    <label>Quorum (% of member delegations)<input type="number" min="1" max="100" {...field("quorumPercent")} /></label>
    <p className="desk-hint">This is your committee's configured attendance threshold for recorded votes.</p>
    <button className="primary-button">Save committee</button>
  </form>;
}

function DelegateForm({ initial, onSave }) {
  const [draft, setDraft] = useState({ country: "", delegate: "", school: "", email: "", stance: "", notes: "", observer: false, ...initial });
  const field = (key) => ({ value: draft[key] || "", onChange: (e) => setDraft({ ...draft, [key]: e.target.value }) });
  return <form className="desk-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); }}>
    <label>Delegation<input required autoFocus list="delegation-options" aria-label="Delegation name" maxLength={160} {...field("country")} /></label>
    <datalist id="delegation-options">{countries.map((country) => <option key={country.code} value={country.name} />)}</datalist>
    <div className="form-two-columns"><label>Delegate name<input maxLength={160} {...field("delegate")} /></label><label>School / organization<input maxLength={160} {...field("school")} /></label></div>
    <div className="form-two-columns"><label>Email (optional)<input type="email" {...field("email")} /></label><label>Position / stance<input maxLength={160} {...field("stance")} /></label></div>
    <label>Private chair notes<textarea rows={3} maxLength={8000} {...field("notes")} /></label>
    <label className="desk-checkbox"><input type="checkbox" checked={draft.observer} onChange={(e) => setDraft({ ...draft, observer: e.target.checked })} />Observer (excluded from recorded ballots)</label>
    <button className="primary-button">Save delegation</button>
  </form>;
}

export default function OrganizerPage() {
  const { refresh } = useWorkspace();
  const conference = ConferenceService.getConference();
  const committee = ConferenceService.getActiveCommittee();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filter, setFilter] = useState("all");
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conferenceName, setConferenceName] = useState(conference.name);
  const [date, setDate] = useState(conference.date || "");
  const [newName, setNewName] = useState("");
  const [newCommittee, setNewCommittee] = useState("General Assembly");
  const run = (fn, text) => { try { fn(); setError(""); setMessage(text); refresh(); return true; } catch (e) { setError(e.message); return false; } };
  const delegates = (committee?.delegates || []).filter((d) => [d.country, d.delegate, d.school, d.email].join(" ").toLowerCase().includes(query.toLowerCase()) && (filter === "all" || (filter === "present" ? d.present : filter === "absent" ? !d.present : d.observer)));
  const issues = ConferenceService.validateConference();
  return <DeskPage title="Conference organizer" description="Create your conference, shape each committee, and keep the roster current."
    actions={<><button className="quiet-button" onClick={() => run(() => saveWorkspace(), "Current conference saved to the workspace library.")}>Save workspace</button><button className="primary-button" onClick={() => { setNewName(""); setDialog({ type: "conference" }); setError(""); }}><Plus size={16} />New conference</button></>}>
    <DeskNotice error={error} message={message} />
    <div className="desk-two-column">
      <section className="desk-card"><h2>Conference details</h2><form className="desk-form" onSubmit={(e) => { e.preventDefault(); run(() => updateConference({ name: conferenceName, date }), "Conference details saved."); }}>
        <label>Conference name<input required maxLength={160} value={conferenceName} onChange={(e) => setConferenceName(e.target.value)} /></label><label>Conference date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="quiet-button">Save details</button>
      </form></section>
      <section className="desk-card"><div className="section-heading"><h2>Committees</h2><button className="quiet-button" onClick={() => { setNewName(""); setDialog({ type: "committee" }); }}><Plus size={15} />Add committee</button></div>
        <div className="desk-committee-list">{ConferenceService.getCommittees().map((item) => <div key={item.id}><button className={committee?.id === item.id ? "desk-selected" : ""} onClick={() => { ConferenceService.setActiveCommittee(item.id); refresh(); }}><strong>{item.committee}</strong><small>{item.delegates.length} delegations</small></button><button className="icon-button" aria-label={`Delete ${item.committee}`} disabled={ConferenceService.getCommittees().length < 2} onClick={() => { if (window.confirm(`Delete ${item.committee}? A recovery point will be saved first.`)) run(() => removeCommittee(item.id), "Committee removed; recovery point saved."); }}><Trash2 size={15} /></button></div>)}</div>
      </section>
    </div>
    {committee && <>
      <section className="desk-card"><h2>Committee setup</h2><CommitteeForm key={committee.id} committee={committee} onSave={(patch) => run(() => updateCommittee(patch), "Committee setup saved.")} /></section>
      <section className="desk-card"><div className="section-heading"><div><h2>Delegations <span className="desk-count">{committee.delegates.length}</span></h2><p className="desk-hint">Attendance, speaking records and notes stay attached to each delegation.</p></div><div className="desk-actions"><button className="quiet-button" onClick={() => {
        downloadFile("notionmun-roster.csv", Papa.unparse(committee.delegates.map((d) => ({ Country: d.countryDisplay || d.country, Delegate: d.delegate, School: d.school, Email: d.email, Observer: d.observer ? "Yes" : "No" })), { escapeFormulae: true }), "text/csv");
      }}><Download size={15} />Export roster</button><button className="primary-button" onClick={() => setDialog({ type: "delegate", draft: {} })}><Plus size={16} />Add delegation</button></div></div>
        <div className="desk-filter-row"><label className="desk-search"><Search size={16} /><input aria-label="Search delegations" placeholder="Search delegation, name or school" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Filter delegations" value={filter} onChange={(e) => setFilter(e.target.value)}>{["all", "present", "absent", "observer"].map((item) => <option key={item} value={item}>{item === "all" ? "All delegations" : item[0].toUpperCase() + item.slice(1)}</option>)}</select><Link className="quiet-button" to="/">Import workbook / CSV</Link></div>
        <div className="desk-table-wrap"><table className="desk-table"><thead><tr><th>Delegation</th><th>Delegate</th><th>School</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{delegates.map((d) => <tr key={d.id}><td><span className="desk-country"><Flag countryCode={d.countryCode} />{d.countryDisplay || d.country}</span></td><td>{d.delegate || "—"}</td><td>{d.school || "—"}</td><td><span className="desk-badge">{d.observer ? "Observer" : d.present ? d.voting ? "Present & voting" : "Present" : "Absent"}</span></td><td><div className="desk-actions"><button className="icon-button" aria-label={`Edit ${d.country}`} onClick={() => setDialog({ type: "delegate", draft: d })}><Pencil size={15} /></button><button className="icon-button" aria-label={`Remove ${d.country}`} onClick={() => { if (window.confirm(`Remove ${d.country}? A recovery point will be saved.`)) run(() => removeDelegate(d.id), "Delegation removed."); }}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!delegates.length && <p className="desk-empty">No matching delegations. Add one or import a roster.</p>}</div>
      </section>
      <section className="desk-card"><div className="section-heading"><h2>Roster checks</h2><button className="quiet-button" onClick={() => { const value = window.prompt("Attendance record label", "Day 1 — opening session"); if (value !== null) run(() => captureAttendance(value || "Attendance record"), "Attendance snapshot saved to Reports."); }}>Record attendance snapshot</button></div>{issues.length ? <ul className="desk-issue-list">{issues.slice(0, 20).map((issue, i) => <li key={i}>{issue}</li>)}</ul> : <p className="desk-hint">No missing delegation names, duplicate entries, or empty committees detected.</p>}</section>
    </>}
    {dialog && <Dialog title={dialog.type === "delegate" ? dialog.draft.id ? "Edit delegation" : "Add delegation" : dialog.type === "conference" ? "Create a conference" : "Add a committee"} onClose={() => setDialog(null)}>
      <DeskNotice error={error} />
      {dialog.type === "delegate" ? <DelegateForm initial={dialog.draft} onSave={(draft) => { if (run(() => saveDelegate(draft), "Delegation saved.")) setDialog(null); }} /> : <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (run(() => dialog.type === "conference" ? createConference(newName, newCommittee) : addCommittee(newName), dialog.type === "conference" ? "Conference created." : "Committee added.")) { setDialog(null); setConferenceName(ConferenceService.getConferenceName()); setDate(ConferenceService.getConference().date || ""); } }}>
        <label>{dialog.type === "conference" ? "Conference name" : "Committee name"}<input required autoFocus maxLength={160} value={newName} onChange={(e) => setNewName(e.target.value)} /></label>{dialog.type === "conference" && <><label>First committee<input required maxLength={160} value={newCommittee} onChange={(e) => setNewCommittee(e.target.value)} /></label><p className="desk-hint">The current workspace is saved as a recovery point before creating a new conference.</p></>}<button className="primary-button">Create {dialog.type}</button>
      </form>}
    </Dialog>}
  </DeskPage>;
}
