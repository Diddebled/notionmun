import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Dialog({ title, onClose, children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className={`workspace-dialog app-shell ${className}`} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-body">
      <header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" title="Close" onClick={onClose}><X size={20} /></button></header>
      {children}
    </div>
  </dialog>;
}
