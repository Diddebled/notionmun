import { saveRecovery } from "./desk";

export function initRecovery() {
  let timer = null;
  const changed = (event) => {
    if ((event.detail?.key ?? event.key) !== "motion-conference-session" || timer) return;
    timer = setTimeout(() => {
      timer = null;
      try { saveRecovery("Automatic recovery"); } catch { /* manual export remains available */ }
    }, 30000);
  };
  window.addEventListener("notionmun:storage", changed);
  return () => { clearTimeout(timer); window.removeEventListener("notionmun:storage", changed); };
}
