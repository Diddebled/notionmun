import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, Sprout } from "lucide-react";
import Logo from "./Logo";
import Dialog from "./Dialog";
import { WORKSPACE_PAGES, WORKSPACE_TOOLS } from "../navigation";
import { BRAND } from "../brand";

function Navigation({ onNavigate }) {
  return <>
    <span className="nav-section-label">Committee</span>
    <nav aria-label="Committee navigation">
      {WORKSPACE_PAGES.map(({ to, label, Icon }) => <NavLink key={to} to={to} end onClick={onNavigate}
        className={({ isActive }) => `notion-nav-link ${isActive ? 'active' : ''}`}>
        <Icon size={18} strokeWidth={1.7} /><span>{label}</span>
      </NavLink>)}
    </nav>
    <span className="nav-section-label tools-label">Workspace</span>
    <nav aria-label="Workspace tools">
      {WORKSPACE_TOOLS.map(({ to, label, Icon }) => <NavLink key={to} to={to} onClick={onNavigate}
        className={({ isActive }) => `notion-nav-link ${isActive ? 'active' : ''}`}>
        <Icon size={18} strokeWidth={1.7} /><span>{label}</span>
      </NavLink>)}
    </nav>
  </>;
}

export default function WorkspaceNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const page = [...WORKSPACE_PAGES, ...WORKSPACE_TOOLS].find((item) => item.to === pathname);
  return <>
    <aside className="notion-sidebar">
      <Link to="/" className="sidebar-brand" aria-label={`${BRAND.name} home`}><Logo /></Link>
      <div className="sidebar-workspace"><span className="workspace-symbol"><Sprout size={16} /></span><div><strong>Committee workspace</strong><span>Chair's edition</span></div></div>
      <Navigation />
      <div className="sidebar-bottom"><span className="sidebar-rule" /><p>{BRAND.tagline}</p><Link to="/licensing">Credits & license<ArrowUpRight size={13} /></Link></div>
    </aside>
    <header className="notion-mobile-header"><Link to="/" aria-label={`${BRAND.name} home`}><Logo /></Link><span>{page?.label || "Workspace"}</span><button className="icon-button" title="Open navigation" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={21} /></button></header>
    {open && <Dialog title="Your workspace" className="navigation-dialog" onClose={() => setOpen(false)}><Logo /><Navigation onNavigate={() => setOpen(false)} /></Dialog>}
  </>;
}
