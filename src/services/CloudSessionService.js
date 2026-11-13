import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import { getFirebaseDb } from "../firebase";

// Country name is the one thing stable across a re-upload of the same (or a
// day-2) workbook, unlike ConferenceService's delegate.id, which is a fresh
// crypto.randomUUID() on every parse. Mirrors the identity anchor
// ConferenceService.validateConference() already uses for its own dedup check.
export function stableDelegateKey(countryName) {
  return (
    String(countryName ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

// Formats a Date as its calendar date (Y-M-D) inside a given IANA timezone -
// used instead of raw offset math since it sidesteps DST entirely: two
// timestamps are "the same calendar day in that timezone" iff this string
// matches, no matter what the zone's UTC offset is on either date.
function calendarDateInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

// Day count is derived, not stored - it's just "how many local midnights
// have passed since this session was created", computed fresh whenever it's
// displayed rather than incremented by any button or write.
export function dayNumberForSession(session) {
  if (!session?.createdAt?.toDate || !session.timezone) return null;

  const startDateStr = calendarDateInZone(session.createdAt.toDate(), session.timezone);
  const nowDateStr = calendarDateInZone(new Date(), session.timezone);
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const now = new Date(`${nowDateStr}T00:00:00Z`);

  return Math.round((now - start) / 86400000) + 1;
}

// Reserved attendance-doc id tracking which day attendance was last taken
// for - lowercase-hyphen-only stableDelegateKey output can never collide
// with it.
const DAY_MARKER_ID = "_dayMarker";

async function deleteInChunks(db, references) {
  for (let at = 0; at < references.length; at += 450) {
    const batch = writeBatch(db);
    references.slice(at, at + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export function attendanceForDay(documents, currentDay) {
  const marker = documents.find((item) => item.id === DAY_MARKER_ID)?.data()?.day ?? 1;
  return Object.fromEntries(documents.filter((item) => item.id !== DAY_MARKER_ID && (currentDay == null || (item.data().day ?? marker) === currentDay))
    .map((item) => [item.id, item.data().status]));
}

class CloudSessionService {
  // Starts as just [ownerId]; collaborators are appended via addCollaborator.
  // firestore.rules keys every access check off this one list, so an owner is
  // a member who also satisfies the extra owner-only checks.
  async createSession({ title, committeeId, ownerId }) {
    const db = getFirebaseDb();
    const ref = await addDoc(collection(db, "sessions"), {
      title,
      committeeId,
      ownerId,
      memberIds: [ownerId],
      createdAt: serverTimestamp(),
      // Captured once at creation - the day count is computed against this
      // fixed zone for the session's whole lifetime, not whatever zone
      // whoever's viewing happens to be in later.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return ref.id;
  }

  // Firestore doesn't cascade-delete subcollections, so attendance docs are
  // batch-deleted first - otherwise they'd be orphaned (inert, since
  // isSessionMember's get() on the now-gone parent would fail either way,
  // but there's no reason to leave dead docs behind when it's this cheap).
  async deleteSession(sessionId) {
    const db = getFirebaseDb();
    const attendanceSnap = await getDocs(collection(db, "sessions", sessionId, "attendance"));
    await deleteDoc(doc(db, "sessions", sessionId, "live", "state"));
    await deleteInChunks(db, attendanceSnap.docs.map((snapshot) => snapshot.ref));
    await deleteDoc(doc(db, "sessions", sessionId));
  }

  // Sorts client-side by createdAt instead of an orderBy+where composite
  // index - not worth it at this app's ~2-conference scale.
  async listMySessions(uid) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, "sessions"), where("memberIds", "array-contains", uid)));
    const sessions = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    return sessions.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  }

  async addCollaborator(sessionId, collaboratorUid) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "sessions", sessionId), { memberIds: arrayUnion(collaboratorUid) });
  }

  async removeCollaborator(sessionId, collaboratorUid) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "sessions", sessionId), { memberIds: arrayRemove(collaboratorUid) });
  }

  async setAttendance(sessionId, delegateKey, status) {
    const db = getFirebaseDb();
    const parent = await getDoc(doc(db, "sessions", sessionId));
    const day = dayNumberForSession(parent.exists() ? parent.data() : null) ?? 1;
    const ref = doc(db, "sessions", sessionId, "attendance", delegateKey);
    await setDoc(ref, { status, day }, { merge: true });
  }

  async setAttendanceBatch(sessionId, entries) {
    const db = getFirebaseDb();
    const parent = await getDoc(doc(db, "sessions", sessionId));
    const day = dayNumberForSession(parent.exists() ? parent.data() : null) ?? 1;
    for (let at = 0; at < entries.length; at += 450) {
      const batch = writeBatch(db);
      entries.slice(at, at + 450).forEach(({ key, status }) => batch.set(doc(db, "sessions", sessionId, "attendance", key), { status, day }, { merge: true }));
      await batch.commit();
    }
  }

  subscribeAttendance(sessionId, callback, onError = () => {}) {
    const db = getFirebaseDb(); let stopped = false; let documents = null; let parent = null;
    const emit = () => { if (!stopped && documents && parent) callback(attendanceForDay(documents, dayNumberForSession(parent))); };
    getDoc(doc(db, "sessions", sessionId)).then((snapshot) => { if (stopped) return; if (!snapshot.exists()) throw new Error("This cloud session no longer exists."); parent = snapshot.data(); emit(); }).catch((error) => { if (!stopped) onError(error); });
    const unsubscribe = onSnapshot(collection(db, "sessions", sessionId, "attendance"), (snapshot) => { documents = snapshot.docs; emit(); }, onError);
    const timer = setInterval(emit, 60000);
    return () => { stopped = true; unsubscribe(); clearInterval(timer); };
  }

  // Previous days remain stored but are not carried into today's roll call.
  // Reading never deletes a different chair's in-flight attendance write.
  async listAttendance(sessionId) {
    const db = getFirebaseDb();
    const attendanceCol = collection(db, "sessions", sessionId, "attendance");
    const snap = await getDocs(attendanceCol);

    const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
    const session = sessionSnap.exists() ? { id: sessionSnap.id, ...sessionSnap.data() } : null;
    const currentDay = dayNumberForSession(session);

    // Day-tagged records avoid a destructive midnight reset racing another chair.
    return attendanceForDay(snap.docs, currentDay);
  }
}

const cloudSessionService = new CloudSessionService();
export default cloudSessionService;
