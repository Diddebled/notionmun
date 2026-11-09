import { useLocation } from "react-router-dom";
import { ChevronRight, Keyboard } from "lucide-react";
import { WORKSPACE_PAGES, WORKSPACE_TOOLS } from "../navigation";

export default function AppTopBar({ committeeLabel, linked = true, onShowShortcuts, current }) {
  const { pathname } = useLocation();
  const page = [...WORKSPACE_PAGES, ...WORKSPACE_TOOLS].find((item) => item.to === (current || pathname));
  return <header className="notion-context-bar">
    <div><span>Workspace</span><ChevronRight size={13} /><strong>{page?.label || "Overview"}</strong></div>
    <div>{committeeLabel && <span className="context-committee">{committeeLabel}</span>}
      {linked && onShowShortcuts && <button className="icon-button" onClick={onShowShortcuts} title="Keyboard shortcuts" aria-label="Keyboard shortcuts"><Keyboard size={17} /></button>}
    </div>
  </header>;
}
