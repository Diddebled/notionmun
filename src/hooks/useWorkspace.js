import { useEffect, useReducer } from "react";

export default function useWorkspace() {
  const [revision, refresh] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    const changed = (event) => {
      const key = event.detail?.key ?? event.key ?? "";
      if (/^(motion-|general-vote-|notionmun-)/.test(key)) refresh();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("notionmun:storage", changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("notionmun:storage", changed);
    };
  }, []);
  return { revision, refresh };
}
