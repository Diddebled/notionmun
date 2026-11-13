import { beforeEach, describe, expect, it, vi } from "vitest";
import ConferenceService from "./ConferenceService";
import { memoryStorage } from "../testUtils/memoryStorage";
import { dais, local } from "../utils/storage";
import { speakersKey, generalVoteKey } from "../committeeCaches";
import { activeDesk, addCommittee, captureAttendance, createConference, decideAmendment, openWorkspace, recordBallot, removeCommittee, removeDelegate, restoreRecovery, saveAmendment, saveDelegate, saveDeskItem, saveRecovery, saveResolution, saveWorkspace, tallyBallot, updateCommittee, workspaceLibrary } from "./desk";
import { createBackup, restoreBackup } from "./workspace";
import { applyCommitteePreset, saveCommitteePreset } from "../committeePresets";

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage()); vi.stubGlobal("sessionStorage", memoryStorage()); ConferenceService.reset();
  createConference("Chair workflow", "DISEC");
});

function roster() {
  return ["Brazil", "France", "Japan"].map((country) => saveDelegate({ country, delegate: `Delegate ${country}` }));
}

describe("chair records and recovery", () => {
  it("preserves attendance and speaking records when editing a delegation", () => {
    const [d] = roster(); ConferenceService.setAttendanceState(d.id, "voting"); ConferenceService.markSpoken(d.id, 32);
    saveDelegate({ ...d, delegate: "Updated delegate", notes: "Follow up" });
    expect(ConferenceService.getDelegate(d.id)).toMatchObject({ delegate: "Updated delegate", present: true, voting: true, speakingTime: 32, countryCode: "BRA" });
    saveDelegate({ ...d, observer: true }); expect(d.voting).toBe(false);
  });
  it("retains imported staff metadata while updating committee details", () => {
    const c = ConferenceService.getActiveCommittee(); c.chairs = [{ name: "Alex", email: "chair@example.org", school: "School", role: "Head chair" }];
    updateCommittee({ committee: "Council", chairs: "Alex, Sam", pages: "Page", quorumPercent: 60 });
    expect(c.chairs[0]).toMatchObject({ email: "chair@example.org", role: "Head chair", school: "School" }); expect(c.chairs[1].name).toBe("Sam");
  });
  it("removes a delegate from active caches and can recover the prior roster", () => {
    const [a, b] = roster(); const c = ConferenceService.getActiveCommittee();
    dais.setJSON(speakersKey(c.id), { queue: [{ id: a.id }, { id: b.id }], history: [{ id: a.id }] }); dais.setJSON(generalVoteKey(c.id), { votes: 2 });
    removeDelegate(a.id); expect(dais.getJSON(speakersKey(c.id)).queue).toEqual([{ id: b.id }]); expect(dais.getJSON(generalVoteKey(c.id))).toBeNull();
    const point = local.getJSON("notionmun-recovery-v1")[0]; restoreRecovery(point.id); expect(ConferenceService.getDelegate(a.id)).toBeTruthy();
  });
  it("protects the final committee and switches after deleting an active committee", () => {
    expect(() => removeCommittee(ConferenceService.getActiveCommitteeId())).toThrow(/at least one/);
    const id = addCommittee("WHO"); removeCommittee(id); expect(ConferenceService.getActiveCommittee().committee).toBe("DISEC");
  });
  it("stores attendance snapshots independently of later changes", () => {
    const [a] = roster(); ConferenceService.setAttendanceState(a.id, "voting"); const snapshot = captureAttendance("Day 1"); ConferenceService.setAttendanceState(a.id, "absent");
    expect(snapshot.delegates[0]).toMatchObject({ present: true, voting: true });
  });
  it("opens a saved conference with its queue and creates a recovery point", () => {
    const [a] = roster(); const id = ConferenceService.getActiveCommitteeId(); dais.setJSON(speakersKey(id), { queue: [{ id: a.id }], history: [] });
    const saved = saveWorkspace(); createConference("Other"); openWorkspace(saved.id);
    expect(ConferenceService.getConferenceName()).toBe("Chair workflow"); expect(dais.getJSON(speakersKey(id)).queue[0].id).toBe(a.id); expect(workspaceLibrary()).toHaveLength(1);
  });
  it("refuses to silently evict the twenty-first saved conference", () => {
    local.setJSON("notionmun-workspace-library-v1", Array.from({ length: 20 }, (_, i) => ({ id: `${i}` })));
    expect(() => saveWorkspace()).toThrow(/20 conferences/); expect(workspaceLibrary()).toHaveLength(20);
  });
  it("rejects reversed agenda times without adding an item", () => {
    expect(() => saveDeskItem("schedule", { title: "Debate", start: "2026-11-11T12:00", end: "2026-11-11T11:00" })).toThrow(/after/); expect(activeDesk().schedule).toHaveLength(0);
  });
});

describe("recorded voting", () => {
  function setup() { const members = roster(); ConferenceService.setAllAttendanceState("present"); return { c: ConferenceService.getActiveCommittee(), members }; }
  it("excludes observers and absent members from the roll call", () => {
    const { c, members: [a, b, d] } = setup(); d.observer = true; b.present = false;
    expect(tallyBallot(c, { [a.id]: "For", [d.id]: "Against" })).toMatchObject({ eligible: 1, members: 2, For: 1, Against: 0, passed: true });
  });
  it("blocks pending passes and unrecorded votes", () => {
    const { c, members: [a, b] } = setup(); const result = tallyBallot(c, { [a.id]: "For", [b.id]: "Pass" });
    expect(result).toMatchObject({ complete: false, Pass: 1, Unrecorded: 1, passed: false });
    expect(() => recordBallot({ title: "Draft", choices: { [a.id]: "For" } })).toThrow(/every eligible/);
  });
  it("prevents procedural abstentions and present-and-voting abstentions", () => {
    const { c, members } = setup(); const choices = Object.fromEntries(members.map((d) => [d.id, "Abstain"]));
    expect(tallyBallot(c, choices, "simple", "procedural").invalid).toHaveLength(3);
    members[0].voting = true; expect(tallyBallot(c, choices).invalid).toHaveLength(1);
  });
  it("applies simple, two-thirds, absolute and unanimous thresholds", () => {
    const { c, members: [a, b, d] } = setup(); let choices = { [a.id]: "For", [b.id]: "For", [d.id]: "Against" };
    expect(tallyBallot(c, choices, "two-thirds")).toMatchObject({ required: 2, passed: true }); expect(tallyBallot(c, choices, "unanimous").passed).toBe(false);
    choices = { [a.id]: "For", [b.id]: "Against", [d.id]: "Abstain" }; expect(tallyBallot(c, choices).passed).toBe(false);
    choices[b.id] = "Abstain"; expect(tallyBallot(c, choices).passed).toBe(true); expect(tallyBallot(c, choices, "absolute").passed).toBe(false);
  });
  it("requires configured quorum even with all present votes recorded", () => {
    const { c, members: [a, b, d] } = setup(); c.quorumPercent = 100; b.present = false; d.present = false;
    expect(tallyBallot(c, { [a.id]: "For" })).toMatchObject({ complete: true, quorum: false, passed: false });
    expect(() => recordBallot({ title: "Draft", choices: { [a.id]: "For" } })).toThrow(/quorum/);
  });
  it("records an immutable roll call and updates a linked resolution", () => {
    const { members } = setup(); const r = saveResolution({ title: "DR1", body: "Clause" }); const choices = Object.fromEntries(members.map((d) => [d.id, "For"]));
    const ballot = recordBallot({ title: "DR1 vote", choices, rule: "simple", kind: "substantive", resolutionId: r.id, applyResolution: true });
    choices[members[0].id] = "Against"; members[0].countryDisplay = "Changed";
    expect(ballot.votes[0]).toMatchObject({ country: "Brazil", choice: "For" }); expect(ConferenceService.getActiveCommittee().resolutions[0].status).toBe("Adopted");
  });
});

describe("resolution drafting and reusable setup", () => {
  it("keeps versions, accepts amendments once, and round-trips the full desk", () => {
    roster(); let r = saveResolution({ title: "DR1", body: "First clause", signatories: "Japan" }); r = saveResolution({ ...r, body: "Revised clause" });
    const a = saveAmendment(r.id, { body: "Additional clause", proposer: "France" }); decideAmendment(r.id, a.id, "Accepted");
    expect(() => decideAmendment(r.id, a.id, "Accepted")).toThrow(/already/);
    const latest = ConferenceService.getActiveCommittee().resolutions[0]; expect(latest.revisions).toHaveLength(2); expect(latest.body).toContain("Additional clause");
    activeDesk().resolutionDraft = { ...latest, body: "Unsaved draft text" }; captureAttendance("Day one"); saveDeskItem("announcements", { title: "Break", body: "Return at 2", published: true });
    const backup = createBackup(); createConference("Other"); restoreBackup(backup);
    expect(ConferenceService.getActiveCommittee().resolutions[0]).toEqual(latest); expect(activeDesk().resolutionDraft.body).toBe("Unsaved draft text"); expect(activeDesk().attendanceDays).toHaveLength(1); expect(activeDesk().announcements[0].published).toBe(true);
  });
  it("saves a template without personal data and restores it through a backup", () => {
    roster(); const preset = saveCommitteePreset("My DISEC"); expect(JSON.stringify(preset)).not.toContain("Delegate Brazil");
    const backup = createBackup(); local.remove("notionmun-committee-presets-v1"); restoreBackup(backup); const c = applyCommitteePreset(preset.id);
    expect(c.delegates).toHaveLength(3); expect(c.delegates[0].delegate).toBe(""); expect(c.activeMotion.speakingTime).toBe(1.5);
  });
  it("backs up all current preferences and strips malformed draft collections", () => {
    local.set("app-shortcut-overrides", '{"next":"N"}'); local.set("app-reduced-motion", "true"); saveRecovery();
    const backup = createBackup(); backup.conference.committees[backup.conference.activeCommittee].desk = { schedule: [{ id: "s", title: "Safe" }, null], resolutionDraft: { title: 23 }, ballotDraft: { choices: { a: "Oops", b: "For" } } };
    local.remove("app-shortcut-overrides"); restoreBackup(backup);
    expect(local.get("app-shortcut-overrides")).toBe('{"next":"N"}'); expect(activeDesk().schedule).toHaveLength(1); expect(activeDesk().resolutionDraft).toBeNull(); expect(activeDesk().ballotDraft.choices).toEqual({ b: "For" });
  });
});
