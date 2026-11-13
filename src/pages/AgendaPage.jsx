import { useState } from "react";
import { CalendarDays, Download, Megaphone, Pencil, Plus, Trash2, Users } from "lucide-react";
import Papa from "papaparse";
import DeskPage, { DeskNotice } from "../components/DeskPage";
import Dialog from "../components/Dialog";
import { activeDesk, deleteDeskItem, saveDeskItem } from "../services/desk";
import { downloadFile } from "../services/workspace";
import useWorkspace from "../hooks/useWorkspace";
import { scheduleToCalendar } from "../utils/calendar";

const ANNOUNCEMENTS = [
  ["Session opening", "Welcome to committee. Please take your seats and prepare for roll call."],
  ["Break", "Committee is in recess. Please return at the announced time."],
  ["Voting procedure", "Voting procedure is beginning. Please remain seated and follow the chair's instructions."],
  ["Crisis update", "New developments have been received. The chair will introduce the update to committee."],
];
const tabOptions = [["schedule", "Session agenda", CalendarDays], ["announcements", "Bulletin board", Megaphone], ["contacts", "Directory", Users]];

function ItemForm({ type, initial, onSave }) {
  const [draft, setDraft] = useState({ title: "", name: "", body: "", start: "", end: "", priority: "Info", status: type === "schedule" ? "Planned" : type === "contacts" ? "Confirmed" : "Draft", role: "Delegate", email: "", notes: "", ...initial });
  const field = (key) => ({ value: draft[key] || "", onChange: (e) => setDraft({ ...draft, [key]: e.target.value }) });
  return <form className="desk-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); }}>
    {type === "contacts" ? <><label>Name<input required autoFocus maxLength={180} {...field("name")} /></label><div className="form-two-columns"><label>Email<input type="email" {...field("email")} /></label><label>Role<input maxLength={100} list="contact-roles" {...field("role")} /><datalist id="contact-roles">{["Secretary-General", "Chair", "Co-chair", "Page", "Delegate", "Observer", "Subscriber"].map((r) => <option key={r}>{r}</option>)}</datalist></label></div><label>Status<select {...field("status")}>{["Confirmed", "Invited", "Waitlisted", "Declined"].map((s) => <option key={s}>{s}</option>)}</select></label><label>Notes<textarea rows={3} {...field("notes")} /></label></>
      : <><label>Title<input required autoFocus maxLength={180} {...field("title")} /></label>{type === "announcements" && <label>Start from a template<select defaultValue="" onChange={(e) => { const item = ANNOUNCEMENTS[Number(e.target.value)]; if (item) setDraft({ ...draft, title: item[0], body: item[1] }); }}><option value="" disabled>Choose a template</option>{ANNOUNCEMENTS.map(([title], i) => <option key={title} value={i}>{title}</option>)}</select></label>}<label>{type === "schedule" ? "Chair notes / description" : "Announcement"}<textarea required={type === "announcements"} rows={4} maxLength={8000} {...field("body")} /></label>
        {type === "schedule" ? <div className="form-two-columns"><label>Starts<input type="datetime-local" {...field("start")} /></label><label>Ends<input type="datetime-local" {...field("end")} /></label></div> : <label>Priority<select {...field("priority")}>{["Info", "Important", "Urgent"].map((s) => <option key={s}>{s}</option>)}</select></label>}
        <label>Status<select {...field("status")}>{(type === "schedule" ? ["Planned", "Live", "Done"] : ["Draft", "Published", "Archived"]).map((s) => <option key={s}>{s}</option>)}</select></label>
      </>}
    <button className="primary-button">Save {type === "schedule" ? "agenda item" : type === "contacts" ? "contact" : "announcement"}</button>
  </form>;
}

export default function AgendaPage() {
  useWorkspace(); const desk = activeDesk();
  const [tab, setTab] = useState("schedule"); const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [importOpen, setImportOpen] = useState(false); const [csv, setCsv] = useState("Name,Email,Role,Status\n");
  const items = [...desk[tab]].filter((item) => [item.title, item.name, item.body, item.email, item.role].join(" ").toLowerCase().includes(query.toLowerCase())).sort((a, b) => tab === "schedule" ? (a.start || "z").localeCompare(b.start || "z") : String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const run = (fn, text) => { try { fn(); setError(""); setMessage(text); return true; } catch (e) { setError(e.message); return false; } };
  const overlapping = tab === "schedule" && items.some((a, i) => a.start && a.end && items.some((b, j) => j > i && b.start && b.end && a.start < b.end && b.start < a.end));
  return <DeskPage title="Agenda & announcements" description="Plan the session, brief the room, and keep the conference directory together." actions={<button className="primary-button" onClick={() => setEditing({})}><Plus size={16} />Add {tab === "schedule" ? "agenda item" : tab === "contacts" ? "contact" : "announcement"}</button>}>
    <DeskNotice error={error} message={message} />
    <div className="desk-tabs" role="tablist" aria-label="Organizer sections">{tabOptions.map(([key, label, Icon]) => <button role="tab" aria-selected={tab === key} key={key} onClick={() => { setTab(key); setQuery(""); }}><Icon size={16} />{label}<span>{desk[key].length}</span></button>)}</div>
    <section className="desk-card"><div className="desk-filter-row"><input aria-label={`Search ${tab}`} placeholder="Search this section" value={query} onChange={(e) => setQuery(e.target.value)} />
      {tab === "schedule" ? <button className="quiet-button" onClick={() => downloadFile("notionmun-agenda.ics", scheduleToCalendar(desk.schedule), "text/calendar")}><Download size={15} />Export calendar</button> : <button className="quiet-button" onClick={() => downloadFile(`notionmun-${tab}.csv`, Papa.unparse(desk[tab], { escapeFormulae: true }), "text/csv")}><Download size={15} />Export CSV</button>}
      {tab === "contacts" && <button className="quiet-button" onClick={() => setImportOpen(true)}>Import CSV</button>}
    </div>{tab === "announcements" && <p className="desk-hint">Published announcements appear in the presenter view on this device. Exporting creates a file; it does not send email.</p>}{tab === "contacts" && <p className="desk-hint">A local conference directory and registration list. Roles here describe responsibilities; cloud account access is managed separately.</p>}{tab === "schedule" && <p className="desk-hint">Times use this device's timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>}
      {overlapping && <p className="notice">Some agenda items overlap. Review their start and end times.</p>}
      <div className="desk-agenda-list">{items.map((item) => <article key={item.id} className={`desk-agenda-item ${item.status === "Live" || item.priority === "Urgent" ? "desk-emphasis" : ""}`}>
        <div className="desk-agenda-time">{tab === "schedule" ? <><strong>{item.start ? new Date(item.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</strong><small>{item.start ? new Date(item.start).toLocaleDateString() : "Unscheduled"}</small></> : tab === "contacts" ? <Users size={21} /> : <Megaphone size={21} />}</div>
        <div className="desk-agenda-copy"><div className="desk-inline-heading"><h3>{item.title || item.name}</h3><span className="desk-badge">{item.status}</span>{item.priority && <span className="desk-badge">{item.priority}</span>}</div><p>{item.body || item.notes || item.email || ""}</p>{item.role && <small>{item.role}{item.email ? ` · ${item.email}` : ""}</small>}{item.end && <small>Ends {new Date(item.end).toLocaleString()}</small>}</div>
        <div className="desk-actions">{tab === "schedule" && item.status !== "Done" && <button className="quiet-button" onClick={() => run(() => saveDeskItem(tab, { ...item, status: item.status === "Planned" ? "Live" : "Done" }), "Agenda updated.")}>{item.status === "Planned" ? "Start" : "Complete"}</button>}{tab === "announcements" && item.status === "Draft" && <button className="quiet-button" onClick={() => run(() => saveDeskItem(tab, { ...item, status: "Published" }), "Announcement published to the local bulletin board.")}>Publish</button>}<button className="icon-button" aria-label={`Edit ${item.title || item.name}`} onClick={() => setEditing(item)}><Pencil size={15} /></button><button className="icon-button" aria-label={`Delete ${item.title || item.name}`} onClick={() => { if (window.confirm("Remove this item?")) run(() => deleteDeskItem(tab, item.id), "Item removed."); }}><Trash2 size={15} /></button></div>
      </article>)}</div>{!items.length && <p className="desk-empty">Nothing here yet. Add your first {tab === "schedule" ? "agenda item" : tab === "contacts" ? "contact" : "announcement"}.</p>}
    </section>
    {editing && <Dialog title={`${editing.id ? "Edit" : "Add"} ${tab === "schedule" ? "agenda item" : tab === "contacts" ? "contact" : "announcement"}`} onClose={() => setEditing(null)}><DeskNotice error={error} /><ItemForm type={tab} initial={editing} onSave={(draft) => { if (run(() => saveDeskItem(tab, draft), "Item saved.")) setEditing(null); }} /></Dialog>}
    {importOpen && <Dialog title="Import conference directory" onClose={() => setImportOpen(false)}><form className="desk-form" onSubmit={(e) => { e.preventDefault(); run(() => {
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: "greedy" });
      if (parsed.errors.length || !parsed.meta.fields?.includes("Name")) throw new Error("Use a CSV with a Name column; Email, Role and Status are optional.");
      if (parsed.data.length > 1000) throw new Error("Import up to 1,000 contacts at a time.");
      const normalized = parsed.data.map((row) => ({ name: String(row.Name || "").trim(), email: String(row.Email || "").trim(), role: row.Role || "Delegate", status: ["Confirmed", "Invited", "Waitlisted", "Declined"].includes(row.Status) ? row.Status : "Confirmed" }));
      if (normalized.some((row) => !row.name)) throw new Error("Every contact needs a name.");
      for (const row of normalized) { const existing = desk.contacts.find((c) => row.email && c.email?.toLowerCase() === row.email.toLowerCase()); if (!existing) saveDeskItem("contacts", row); }
      setImportOpen(false);
    }, "Directory imported. Existing email addresses were left unchanged."); }}><label>CSV data<textarea rows={9} value={csv} onChange={(e) => setCsv(e.target.value)} /></label><DeskNotice error={error} /><button className="primary-button">Import contacts</button></form></Dialog>}
  </DeskPage>;
}
