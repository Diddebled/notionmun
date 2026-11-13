import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getDoc: vi.fn(), getDocs: vi.fn(), writeBatch: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn() }));
vi.mock("../firebase", () => ({ getFirebaseDb: () => ({}) }));
vi.mock("firebase/firestore", () => ({
  ...mock, doc: (_db, ...path) => path.join("/"), collection: (_db, ...path) => path.join("/"),
  addDoc: vi.fn(), updateDoc: vi.fn(), query: vi.fn(), where: vi.fn(), serverTimestamp: vi.fn(), arrayUnion: vi.fn(), arrayRemove: vi.fn(), onSnapshot: vi.fn(),
}));
import CloudSessionService, { attendanceForDay, dayNumberForSession, stableDelegateKey } from "./CloudSessionService";
const entry = (id, data) => ({ id, ref: `ref/${id}`, data: () => data });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("shared attendance day boundaries", () => {
  it("counts conference-local midnights rather than elapsed 24-hour periods", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-11T17:01:00Z"));
    expect(dayNumberForSession({ timezone: "Asia/Bangkok", createdAt: { toDate: () => new Date("2026-11-11T16:59:00Z") } })).toBe(2);
  });
  it("filters previous days without destructive resets, including legacy marker records", () => {
    const docs = [entry("_dayMarker", { day: 2 }), entry("brazil", { status: "present" }), entry("france", { status: "present_and_voting", day: 3 }), entry("japan", { status: "absent", day: 1 })];
    expect(attendanceForDay(docs, 3)).toEqual({ france: "present_and_voting" }); expect(attendanceForDay(docs, 2)).toEqual({ brazil: "present" });
    expect(attendanceForDay([entry("brazil", { status: "present" })], 1)).toEqual({ brazil: "present" });
  });
  it("uses a reproducible country key across roster imports", () => {
    expect(stableDelegateKey(" Côte d’Ivoire ")).toBe("cote-d-ivoire"); expect(stableDelegateKey("Brazil")).toBe(stableDelegateKey(" BRAZIL ")); expect(stableDelegateKey("_dayMarker")).not.toBe("_dayMarker");
  });
  it("chunks large shared attendance writes under the Firestore batch limit", async () => {
    mock.getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) }); const commits = []; const sets = [];
    mock.writeBatch.mockImplementation(() => { const set = vi.fn(); const commit = vi.fn().mockResolvedValue(); sets.push(set); commits.push(commit); return { set, commit }; });
    await CloudSessionService.setAttendanceBatch("session", Array.from({ length: 901 }, (_, i) => ({ key: `d${i}`, status: "present" })));
    expect(sets.map((set) => set.mock.calls.length)).toEqual([450, 450, 1]); expect(commits.every((commit) => commit.mock.calls.length === 1)).toBe(true); expect(sets[0]).toHaveBeenCalledWith("sessions/session/attendance/d0", { status: "present", day: 1 }, { merge: true });
  });
  it("removes public broadcast and all attendance before deleting a session", async () => {
    mock.getDocs.mockResolvedValue({ docs: Array.from({ length: 501 }, (_, i) => entry(`${i}`, {})) }); const batches = [];
    mock.writeBatch.mockImplementation(() => { const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue() }; batches.push(batch); return batch; }); mock.deleteDoc.mockResolvedValue();
    await CloudSessionService.deleteSession("session"); expect(batches.map((b) => b.delete.mock.calls.length)).toEqual([450, 51]); expect(mock.deleteDoc.mock.calls.map(([path]) => path)).toEqual(["sessions/session/live/state", "sessions/session"]);
  });
});
