import { useEffect, useState } from "react";
import AuthService from "../services/AuthService";
import CloudSessionService, { stableDelegateKey } from "../services/CloudSessionService";
import ConferenceService from "../services/ConferenceService";
import { session } from "../utils/storage";
import { getDelegateState } from "../utils/attendance";

const KEY = "notionmun-cloud-attendance-link";
export function linkCloudAttendance(sessionId, committeeId, userId) {
  session.setJSON(KEY, { sessionId, committeeId, userId });
}
export function unlinkCloudAttendance() { session.remove(KEY); }

export default function useCloudAttendance(committee) {
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [status, setStatus] = useState(""); const [error, setError] = useState("");
  useEffect(() => AuthService.subscribe(setUser), []);
  const link = session.getJSON(KEY);
  const connected = Boolean(AuthService.isConfigured() && user?.uid === link?.userId && committee?.id === link?.committeeId);
  useEffect(() => {
    if (!connected) return undefined;
    let cancelled = false;
    setStatus("Connecting to shared attendance…");
    const unsubscribe = CloudSessionService.subscribeAttendance(link.sessionId, (map) => {
      if (cancelled) return;
      let changed = false;
      for (const delegate of committee.delegates) {
        const state = map[stableDelegateKey(delegate.countryDisplay || delegate.country)] || "absent";
        const present = state !== "absent"; const voting = state === "present_and_voting" && !delegate.observer;
        if (delegate.present !== present || delegate.voting !== voting) { delegate.present = present; delegate.voting = voting; changed = true; }
      }
      if (changed) ConferenceService.persist();
      setError(""); setStatus("Shared attendance connected");
    }, (err) => { if (!cancelled) { setError(err.message); setStatus("Shared attendance unavailable"); } });
    return () => { cancelled = true; unsubscribe(); };
  }, [connected, link?.sessionId, committee?.id, user?.uid]);
  async function sync(ids) {
    if (!connected || AuthService.getCurrentUser()?.uid !== link.userId) return;
    setStatus("Syncing shared attendance…");
    try {
      await CloudSessionService.setAttendanceBatch(link.sessionId, committee.delegates.filter((d) => ids.includes(d.id)).map((d) => ({ key: stableDelegateKey(d.countryDisplay || d.country), status: getDelegateState(d) === "voting" ? "present_and_voting" : getDelegateState(d) })));
      setStatus("Shared attendance connected"); setError("");
    } catch (err) { setError(err.message); setStatus("Attendance sync needs attention"); }
  }
  return { sync, connected, status, error, disconnect: () => { unlinkCloudAttendance(); setStatus("Using local attendance"); setError(""); } };
}
