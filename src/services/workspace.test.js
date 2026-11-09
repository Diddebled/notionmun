import { beforeEach, describe, expect, it, vi } from "vitest";
import ConferenceService from "./ConferenceService";
import { convertLegacyState, createBackup, initializeWorkspace, loadSampleConference, restoreBackup } from "./workspace";
import { dais } from "../utils/storage";
import { speakersKey } from "../committeeCaches";
import { memoryStorage } from "../testUtils/memoryStorage";

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("sessionStorage", memoryStorage());
  ConferenceService.reset();
});

describe("legacy migration", () => {
  const legacy = { committee: "DISEC", topic: "Security", mode: "Moderated caucus", timer: { speakerSeconds: 90 }, delegates: [
    { id: "brazil", country: "Brazil", name: "Ana", status: "Voting", spoken: true },
    { id: "france", country: "France", name: "Jean", status: "Observer" },
  ], activeSpeaker: "brazil", queue: [{ id: "brazil" }, { id: "missing" }, { id: "france" }], resolutions: [{ id: "r1", title: "DR 1.1", sponsors: "Brazil", body: "Clause 1", status: "Draft" }] };

  it("retains delegates, resolutions and timer units without duplicate speakers", () => {
    const migrated = convertLegacyState(legacy);
    const committee = migrated.conference.committees["legacy-committee"];
    expect(committee.activeMotion.speakingTime).toBe(1.5);
    expect(committee.delegates[0]).toMatchObject({ countryCode: "BRA", hasSpoken: true, voting: true });
    expect(committee.delegates[1]).toMatchObject({ voting: false, observer: true });
    expect(migrated.queue.map((speaker) => speaker.id)).toEqual(["brazil", "france"]);
    expect(committee.resolutions[0].body).toBe("Clause 1");
  });

  it("leaves the old save intact and does not replace an existing workspace", () => {
    localStorage.setItem("motion-dais-state-v1", JSON.stringify(legacy));
    initializeWorkspace();
    expect(ConferenceService.getActiveCommittee().committee).toBe("DISEC");
    expect(localStorage.getItem("motion-dais-state-v1")).toBe(JSON.stringify(legacy));
    ConferenceService.getConference().name = "Edited";
    initializeWorkspace();
    expect(ConferenceService.getConferenceName()).toBe("Edited");
  });

  it("rejects malformed old data", () => {
    expect(convertLegacyState(null)).toBeNull();
    expect(convertLegacyState({ delegates: [null, {}] })).toBeNull();
  });
});

describe("workspace backups and durable storage", () => {
  it("restores attendance, resolutions, speaking history and queue", () => {
    loadSampleConference();
    const committee = ConferenceService.getActiveCommittee();
    committee.resolutions = [{ id: "r1", title: "Draft 1", body: "Clause", sponsors: "Brazil", status: "Draft" }];
    committee.chairNotes = "Follow up with Brazil.";
    ConferenceService.markSpoken(committee.delegates[0].id, 25);
    const original = createBackup();
    loadSampleConference(1);
    restoreBackup(JSON.parse(JSON.stringify(original)));
    expect(ConferenceService.toJSON()).toEqual(original.conference);
    expect(ConferenceService.getActiveCommittee().chairNotes).toBe("Follow up with Brazil.");
    expect(dais.getJSON(speakersKey(committee.id))).toEqual(original.caches[speakersKey(committee.id)]);
  });

  it("restores work after session storage has been cleared", () => {
    loadSampleConference();
    const before = ConferenceService.toJSON();
    sessionStorage.clear();
    ConferenceService.reset(); ConferenceService.restore();
    expect(ConferenceService.toJSON()).toEqual(before);
    expect(dais.getJSON(speakersKey(before.activeCommittee)).queue).toHaveLength(5);
  });

  it("clears persistent committee caches when a conference is replaced", () => {
    loadSampleConference();
    const key = speakersKey(ConferenceService.getActiveCommitteeId());
    loadSampleConference(1);
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("rejects invalid backups without replacing the current conference", () => {
    loadSampleConference();
    const before = ConferenceService.toJSON();
    for (const invalid of [null, {}, { format: "motion-workspace", version: 1, conference: { committees: [] } }, { format: "motion-workspace", version: 1, conference: { name: "X", committees: { A: { id: "A", delegates: [null] } } } }]) {
      expect(() => restoreBackup(invalid)).toThrow();
      expect(ConferenceService.toJSON()).toEqual(before);
    }
  });
});
