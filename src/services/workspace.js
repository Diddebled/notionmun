import ConferenceService from "./ConferenceService";
import demoConferences from "../data/demoConferences";
import { countries } from "../constants";
import { generalVoteKey, motionVoteKey, speakersKey } from "../committeeCaches";
import { dais, local } from "../utils/storage";
import { initAppTheme } from "../appTheme";

const text = (value) => typeof value === "string" ? value : "";
export const WORKSPACE_PREF_KEYS = ["app-theme", "app-reduced-motion", "app-motion-input-mode", "app-motion-presets", "app-shortcut-overrides", "notionmun-committee-presets-v1"];

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
      sponsors: text(r.sponsors),
      ...(r.signatories != null ? { signatories: text(r.signatories) } : {}),
      ...(r.updatedAt != null ? { updatedAt: text(r.updatedAt) } : {}),
      ...(Array.isArray(r.amendments) ? { amendments: r.amendments.filter((a) => a && typeof a.body === "string").slice(0, 200).map((a, i) => ({ id: text(a.id) || `amendment-${i}`, body: a.body.slice(0, 10000), proposer: text(a.proposer), at: text(a.at), status: ["Proposed", "Accepted", "Rejected"].includes(a.status) ? a.status : "Proposed", ...(a.decidedAt ? { decidedAt: text(a.decidedAt) } : {}) })) } : {}),
      ...(Array.isArray(r.revisions) ? { revisions: r.revisions.filter((v) => v && typeof v.body === "string").slice(0, 30).map((v) => ({ title: text(v.title), body: v.body.slice(0, 100000), sponsors: text(v.sponsors), signatories: text(v.signatories), status: text(v.status) || "Draft", at: text(v.at) })) } : {}),
      status: ["Draft", "Introduced", "Adopted", "Rejected"].includes(r.status) ? r.status : "Draft" })) : [];
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
  const preferences = {};
  for (const key of WORKSPACE_PREF_KEYS) {
    const value = local.get(key); if (value != null) preferences[key] = value;
  }
  return { format: "motion-workspace", application: "NotionMUN", version: 1, exportedAt: new Date().toISOString(), conference, caches, preferences };
}

export function restoreBackup(data) {
  // Work on a copy so validation never partially mutates the caller's backup.
  data = data == null ? data : JSON.parse(JSON.stringify(data));
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
    if (committee.desk != null) committee.desk = sanitizeDesk(committee.desk);
  }
  const active = ids.includes(conference.activeCommittee) ? conference.activeCommittee : ids[0];
  ConferenceService.commitConference(conference, active);
  for (const id of ids) {
    for (const key of [speakersKey(id), generalVoteKey(id), motionVoteKey(id)]) {
      if (data.caches?.[key] != null) dais.setJSON(key, data.caches[key]);
    }
  }
  for (const key of WORKSPACE_PREF_KEYS) {
    if (typeof data.preferences?.[key] === "string") local.set(key, data.preferences[key]);
    else if (data.preferences && typeof data.preferences === "object") local.remove(key);
  }
  if (typeof document !== "undefined") initAppTheme();
  return ConferenceService.getConference();
}

export function sanitizeDesk(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  const simpleRows = (items, mainKey, max = 1000) => Array.isArray(items) ? items.filter((item) => item && typeof item.id === "string" && typeof item[mainKey] === "string").slice(0, max).map((item) => Object.fromEntries(Object.entries(item).filter(([, v]) => ["string", "number", "boolean"].includes(typeof v)))) : [];
  result.schedule = simpleRows(source.schedule, "title");
  result.announcements = simpleRows(source.announcements, "title");
  result.contacts = simpleRows(source.contacts, "name", 5000);
  result.activity = simpleRows(source.activity, "action", 250);
  result.attendanceDays = Array.isArray(source.attendanceDays) ? source.attendanceDays.filter((item) => item && typeof item.id === "string" && typeof item.label === "string" && Array.isArray(item.delegates)).slice(0, 60).map((item) => ({ id: item.id, label: item.label, at: text(item.at), delegates: item.delegates.filter((d) => d && typeof d.id === "string").map((d) => ({ id: d.id, country: text(d.country), present: Boolean(d.present), voting: Boolean(d.voting) })) })) : [];
  result.ballots = Array.isArray(source.ballots) ? source.ballots.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && item.result && typeof item.result.passed === "boolean" && Array.isArray(item.votes)).map((item) => ({ ...item, votes: item.votes.filter((v) => v && typeof v.id === "string" && typeof v.country === "string" && ["For", "Against", "Abstain", "Pass"].includes(v.choice)) })) : [];
  result.resolutionDraft = sanitizeResolutions([source.resolutionDraft])[0] || null;
  if (source.ballotDraft && typeof source.ballotDraft === "object") result.ballotDraft = {
    title: text(source.ballotDraft.title), kind: source.ballotDraft.kind === "procedural" ? "procedural" : "substantive", rule: ["simple", "two-thirds", "absolute", "unanimous"].includes(source.ballotDraft.rule) ? source.ballotDraft.rule : "simple", resolutionId: text(source.ballotDraft.resolutionId), recordedId: text(source.ballotDraft.recordedId),
    choices: source.ballotDraft.choices && typeof source.ballotDraft.choices === "object" && !Array.isArray(source.ballotDraft.choices) ? Object.fromEntries(Object.entries(source.ballotDraft.choices).filter(([, v]) => ["For", "Against", "Abstain", "Pass"].includes(v))) : {},
  };
  return result;
}

export function downloadFile(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
