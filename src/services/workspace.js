import ConferenceService from "./ConferenceService";
import demoConferences from "../data/demoConferences";
import { countries } from "../constants";
import { generalVoteKey, motionVoteKey, speakersKey } from "../committeeCaches";
import { dais, local } from "../utils/storage";

const text = (value) => typeof value === "string" ? value : "";

export function convertLegacyState(legacy) {
  if (!Array.isArray(legacy?.delegates) || !legacy.delegates.length) return null;
  const delegates = legacy.delegates.filter((d) => text(d?.country)).map((d, index) => {
    const match = countries.find((c) => [c.name, ...(c.alias ?? [])].some((name) => name.toLowerCase() === d.country.toLowerCase()));
    return {
      id: text(d.id) || `legacy-${index}`, country: d.country, countryDisplay: d.country,
      countryCode: match?.code ?? null, delegate: text(d.name), school: "", email: "",
      present: true, voting: d.status !== "Observer", hasSpoken: Boolean(d.spoken), speakingTime: 0,
      notes: "", observer: d.status === "Observer",
    };
  });
  if (!delegates.length) return null;
  const id = "legacy-committee";
  const conference = {
    name: "NotionMUN Committee", activeCommittee: id, date: "",
    committees: { [id]: {
      id, committee: text(legacy.committee) || "DISEC", topic: text(legacy.topic),
      chairs: [], pages: [], delegates,
      activeMotion: { motion: text(legacy.mode) || "General Speakers List", speakingTime: (Number(legacy.timer?.speakerSeconds) || 90) / 60 },
      resolutions: sanitizeResolutions(legacy.resolutions),
    } },
  };
  const ids = [legacy.activeSpeaker, ...(legacy.queue ?? []).map((q) => q?.id)];
  const seen = new Set();
  const queue = ids.map((key) => delegates.find((d) => d.id === key)).filter((d) => {
    if (!d || seen.has(d.id)) return false;
    seen.add(d.id); return true;
  }).map((d) => ({ id: d.id, country: d.countryDisplay, countryCode: d.countryCode }));
  return { conference, queue };
}

export function sanitizeResolutions(items) {
  return Array.isArray(items) ? items.filter((r) => r && typeof r.title === "string" && typeof r.body === "string")
    .map((r, index) => ({ id: text(r.id) || `resolution-${index}`, title: r.title, body: r.body,
      sponsors: text(r.sponsors), status: ["Draft", "Introduced", "Adopted", "Rejected"].includes(r.status) ? r.status : "Draft" })) : [];
}

export function initializeWorkspace() {
  if (ConferenceService.isLoaded()) {
    const conference = ConferenceService.getConference();
    if (conference.sample && /^(Motion Demo:|notionMUN\s*\/)/.test(conference.name)) {
      conference.name = `NotionMUN / ${ConferenceService.getActiveCommittee()?.committee || 'Sample conference'}`;
      ConferenceService.persist();
    }
    return;
  }
  const legacy = local.getJSON("motion-dais-state-v1");
  const migrated = convertLegacyState(legacy);
  if (migrated) {
    ConferenceService.commitConference(migrated.conference);
    dais.setJSON(speakersKey(migrated.conference.activeCommittee), { queue: migrated.queue, history: [] });
    if (!local.get("app-theme")) local.set("app-theme", legacy.theme === "dark" ? "dark" : "light");
    if (legacy.reducedMotion) local.set("app-reduced-motion", "true");
    return;
  }
  loadSampleConference();
}

export function loadSampleConference(index = 0) {
  ConferenceService.loadDemoConference(demoConferences[index]);
  ConferenceService.getConference().sample = true;
  ConferenceService.setAllAttendanceState("voting");
  ConferenceService.setActiveMotion({ motion: "General Speakers List", speakingTime: 1.5 });
  const committee = ConferenceService.getActiveCommittee();
  dais.setJSON(speakersKey(committee.id), { queue: committee.delegates.slice(0, 5).map((d) => ({ id: d.id, country: d.countryDisplay, countryCode: d.countryCode })), history: [] });
  return ConferenceService.getConference();
}

export function createBackup() {
  const conference = ConferenceService.toJSON();
  const caches = {};
  for (const id of Object.keys(conference.committees)) {
    for (const key of [speakersKey(id), generalVoteKey(id), motionVoteKey(id)]) caches[key] = dais.getJSON(key);
  }
  return { format: "motion-workspace", application: "NotionMUN", version: 1, exportedAt: new Date().toISOString(), conference, caches };
}

export function restoreBackup(data) {
  const conference = data?.conference;
  if (data?.format !== "motion-workspace" || data.version !== 1 || !conference || !conference.committees || Array.isArray(conference.committees)) {
    throw new Error("This is not a compatible NotionMUN workspace backup.");
  }
  const ids = Object.keys(conference.committees);
  if (!ids.length || typeof conference.name !== "string" || ids.length > 100) throw new Error("The backup contains no usable conference.");
  for (const id of ids) {
    const committee = conference.committees[id];
    if (!committee || committee.id !== id || typeof committee.committee !== "string" || !Array.isArray(committee.delegates)
      || committee.delegates.some((d) => !d || typeof d.id !== "string" || typeof d.country !== "string")) {
      throw new Error("The backup contains an invalid committee.");
    }
    committee.delegates = committee.delegates.map((d) => ConferenceService.restoreDelegate(d));
    committee.resolutions = sanitizeResolutions(committee.resolutions);
  }
  const active = ids.includes(conference.activeCommittee) ? conference.activeCommittee : ids[0];
  ConferenceService.commitConference(conference, active);
  for (const id of ids) {
    for (const key of [speakersKey(id), generalVoteKey(id), motionVoteKey(id)]) {
      if (data.caches?.[key] != null) dais.setJSON(key, data.caches[key]);
    }
  }
  return ConferenceService.getConference();
}

export function downloadFile(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
