import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Dialog from "./Dialog";
import { WORKSPACE_PAGES, WORKSPACE_TOOLS } from "../navigation";
import ConferenceService from "../services/ConferenceService";

export default function CommandPalette() {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const navigate = useNavigate();
  useEffect(() => {
    const key = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { if (document.querySelector("dialog[open]") && !open) return; event.preventDefault(); setOpen((value) => !value); setQuery(""); } };
    const show = () => { setOpen(true); setQuery(""); };
    window.addEventListener("keydown", key); window.addEventListener("notionmun:find", show);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("notionmun:find", show); };
  }, [open]);
  if (!open) return null;
  const needle = query.toLowerCase();
  const pages = [...WORKSPACE_PAGES, ...WORKSPACE_TOOLS].filter((p) => p.label.toLowerCase().includes(needle));
  const delegates = query.trim() ? ConferenceService.searchDelegates(query).slice(0, 6) : [];
  const go = (path) => { setOpen(false); navigate(path); };
  return <Dialog title="Quick find" className="command-dialog" onClose={() => setOpen(false)}><label className="desk-search"><Search size={18} /><input autoFocus aria-label="Find a page or delegation" placeholder="Find a page or delegation…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="command-results">{pages.map(({ to, label, Icon }) => <button key={to} onClick={() => go(to)}><Icon size={18} /><strong>{label}</strong><small>Page</small></button>)}{delegates.map((d) => <button key={d.id} onClick={() => go(`/organizer?q=${encodeURIComponent(d.country)}`)}><Search size={18} /><strong>{d.countryDisplay || d.country}</strong><small>{d.delegate || "Delegation"}</small></button>)}{!pages.length && !delegates.length && <p className="desk-empty">No matching pages or delegations.</p>}</div></Dialog>;
}
