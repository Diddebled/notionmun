import { useEffect, useState } from "react";
import { Download, RefreshCw, Wifi, WifiOff } from "lucide-react";

export default function WorkspaceStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false); const [waiting, setWaiting] = useState(null); const [install, setInstall] = useState(null);
  const [temporary, setTemporary] = useState(false);
  useEffect(() => {
    const connected = () => setOnline(navigator.onLine);
    const storageWarning = () => setTemporary(true);
    const prompt = (e) => { e.preventDefault(); setInstall(e); };
    window.addEventListener("online", connected); window.addEventListener("offline", connected); window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("notionmun:temporary-storage", storageWarning);
    let alive = true;
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).then((registration) => {
        if (!alive) return;
        if (registration.active) setReady(true);
        if (registration.waiting) setWaiting(registration.waiting);
        const watchInstallation = () => {
          const worker = registration.installing;
          const changed = () => {
            if (!alive) return;
            if (worker.state === "installed") { if (navigator.serviceWorker.controller) setWaiting(worker); else setReady(true); }
          };
          if (worker) { worker.addEventListener("statechange", changed); changed(); }
        };
        registration.addEventListener("updatefound", watchInstallation);
        watchInstallation();
      }).catch(() => { /* app remains usable online */ });
    }
    return () => { alive = false; window.removeEventListener("online", connected); window.removeEventListener("offline", connected); window.removeEventListener("beforeinstallprompt", prompt); window.removeEventListener("notionmun:temporary-storage", storageWarning); };
  }, []);
  return <div className="workspace-status">{temporary && <span role="alert">Storage is full. Download a backup before closing this tab.</span>}<span title={ready ? "The website is cached for offline use. Conference data stays on this device." : "Conference data stays on this device. Offline files are prepared after your first online visit."}>{online ? <Wifi size={12} /> : <WifiOff size={12} />}{online ? ready ? "Offline ready" : "Local workspace" : "Working offline"}</span>{waiting && <button onClick={() => { navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true }); waiting.postMessage({ type: "ACTIVATE" }); }}><RefreshCw size={12} />Update ready</button>}{install && <button onClick={async () => { await install.prompt(); setInstall(null); }}><Download size={12} />Install app</button>}</div>;
}
