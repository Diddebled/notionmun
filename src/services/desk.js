import ConferenceService from "./ConferenceService";
import { createBackup, restoreBackup } from "./workspace";
import { countries, historicalCountries } from "../constants";
import { dais, local } from "../utils/storage";
import { generalVoteKey, motionVoteKey, speakersKey } from "../committeeCaches";
import { randomId } from "../utils/randomId";

const LIBRARY_KEY = "notionmun-workspace-library-v1";
const RECOVERY_KEY = "notionmun-recovery-v1";
const FEEDBACK_KEY = "notionmun-feedback-v1";
const clone = (value) => JSON.parse(JSON.stringify(value));
const clean = (value, limit = 8000) => String(value ?? "").trim().slice(0, limit);
const now = () => new Date().toISOString();

export function activeDesk() {
  const committee = ConferenceService.getActiveCommittee();
  if (!committee) throw new Error("Choose a committee first.");
  if (!committee.desk || typeof committee.desk !== "object") committee.desk = {};
  for (const key of ["schedule", "announcements", "ballots", "activity", "attendanceDays", "contacts"]) {
    if (!Array.isArray(committee.desk[key])) committee.desk[key] = [];
  }
  return committee.desk;
}

export function logActivity(action, detail = "") {
  const desk = activeDesk();
  desk.activity.unshift({ id: randomId(), at: now(), action: clean(action, 160), detail: clean(detail, 500) });
  desk.activity = desk.activity.slice(0, 250);
  ConferenceService.persist();
}

export function recoverySnapshots() { return local.getJSON(RECOVERY_KEY) || []; }
export function saveRecovery(label = "Automatic recovery") {
  if (!ConferenceService.getActiveCommittee()) return null;
  const entry = { id: randomId(), label: clean(label, 120), at: now(), backup: createBackup() };
  const history = recoverySnapshots();
  if (!local.setJSON(RECOVERY_KEY, [entry, ...history].slice(0, 8))) {
    if (!local.setJSON(RECOVERY_KEY, [entry])) throw new Error("Browser storage is full. Download a backup to keep your work safe.");
  }
  return entry;
}

export function workspaceLibrary() { return local.getJSON(LIBRARY_KEY) || []; }
export function saveWorkspace(label = ConferenceService.getConferenceName()) {
  const items = workspaceLibrary();
  const conference = ConferenceService.getConference();
  if (!conference.workspaceId) { conference.workspaceId = randomId(); ConferenceService.persist(); }
  const entry = { id: conference.workspaceId, label: clean(label || "Untitled conference", 160), at: now(), backup: createBackup() };
  if (items.length >= 20 && !items.some((item) => item.id === entry.id)) throw new Error("Your library holds 20 conferences. Export and remove a saved entry before adding another.");
  if (!local.setJSON(LIBRARY_KEY, [entry, ...items.filter((item) => item.id !== entry.id)].slice(0, 20))) throw new Error("Could not save the workspace. Download a backup instead.");
  return entry;
}
export function openWorkspace(id) {
  const entry = workspaceLibrary().find((item) => item.id === id);
  if (!entry) throw new Error("Saved workspace not found.");
  saveRecovery("Before switching workspace");
  restoreBackup(clone(entry.backup));
  return entry;
}
export function deleteWorkspace(id) { local.setJSON(LIBRARY_KEY, workspaceLibrary().filter((item) => item.id !== id)); }
export function restoreRecovery(id) {
  const item = recoverySnapshots().find((entry) => entry.id === id);
  if (!item) throw new Error("Recovery point not found.");
  const backup = clone(item.backup);
  saveRecovery("Before restoring recovery point");
  restoreBackup(backup);
}

export function createConference(name, committeeName = "General Assembly") {
  if (!clean(name, 160) || !clean(committeeName, 160)) throw new Error("Enter a conference and committee name.");
  saveRecovery("Before creating a conference");
  const id = randomId();
  ConferenceService.commitConference({ name: clean(name, 160), workspaceId: randomId(), date: "", activeCommittee: id,
    committees: { [id]: { id, committee: clean(committeeName, 160), topic: "", delegates: [], chairs: [], pages: [], resolutions: [] } } });
  logActivity("Conference created", name);
  return ConferenceService.getConference();
}
export function addCommittee(name, topic = "") {
  if (!clean(name, 160)) throw new Error("Enter a committee name.");
  const id = randomId();
  ConferenceService.getConference().committees[id] = { id, committee: clean(name, 160), topic: clean(topic, 500), delegates: [], chairs: [], pages: [], resolutions: [] };
  ConferenceService.setActiveCommittee(id);
  logActivity("Committee created", name);
  return id;
}
export function removeCommittee(id) {
  const conference = ConferenceService.getConference();
  if (Object.keys(conference.committees).length <= 1) throw new Error("Keep at least one committee.");
  if (!conference.committees[id]) return;
  saveRecovery("Before deleting a committee");
  delete conference.committees[id];
  for (const key of [speakersKey(id), generalVoteKey(id), motionVoteKey(id), `notionmun-presenter-${id}`]) dais.remove(key);
  if (conference.activeCommittee === id) conference.activeCommittee = Object.keys(conference.committees)[0];
  logActivity("Committee removed");
}
export function updateConference(patch) {
  const conference = ConferenceService.getConference();
  if (!clean(patch.name, 160)) throw new Error("Enter a conference name.");
  conference.name = clean(patch.name, 160); conference.date = clean(patch.date, 20);
  ConferenceService.persist();
}
export function updateCommittee(patch) {
  const committee = ConferenceService.getActiveCommittee();
  if (!clean(patch.committee, 160)) throw new Error("Enter a committee name.");
  committee.committee = clean(patch.committee, 160); committee.topic = clean(patch.topic, 1000);
  const staff = (value, previous, role) => clean(value, 1000).split(",").map((name) => name.trim()).filter(Boolean).map((name) => ({ ...(previous || []).find((person) => person.name === name), name, role: (previous || []).find((person) => person.name === name)?.role || role }));
  committee.chairs = staff(patch.chairs, committee.chairs, "Chair");
  committee.pages = staff(patch.pages, committee.pages, "Page");
  committee.quorumPercent = Math.min(100, Math.max(1, Number(patch.quorumPercent) || 50));
  logActivity("Committee details updated", committee.committee);
}
export function saveDelegate(input) {
  const committee = ConferenceService.getActiveCommittee();
  const country = clean(input.country, 160);
  if (!country) throw new Error("A delegation name is required.");
  const existing = committee.delegates.find((item) => item.id === input.id);
  const match = [...countries, ...historicalCountries].find((item) => [item.name, ...(item.alias || [])].some((name) => name.toLowerCase() === country.toLowerCase()));
  const delegate = { ...(existing || ConferenceService.toDelegateRecord({ country, name: "" })),
    country, countryDisplay: country, countryCode: match?.code || (existing?.country === country ? existing.countryCode : null) || null,
    delegate: clean(input.delegate, 160), school: clean(input.school, 160), email: clean(input.email, 240),
    notes: clean(input.notes), observer: Boolean(input.observer), stance: clean(input.stance, 160),
  };
  if (delegate.observer) delegate.voting = false;
  if (existing) Object.assign(existing, delegate); else committee.delegates.push(delegate);
  logActivity(existing ? "Delegation updated" : "Delegation added", country);
  return delegate;
}
export function removeDelegate(id) {
  const committee = ConferenceService.getActiveCommittee();
  const delegate = committee.delegates.find((item) => item.id === id);
  if (!delegate) return;
  saveRecovery("Before removing a delegation");
  committee.delegates = committee.delegates.filter((item) => item.id !== id);
  const key = speakersKey(committee.id); const saved = dais.getJSON(key);
  if (saved) dais.setJSON(key, { ...saved, queue: (saved.queue || []).filter((item) => item.id !== id), history: (saved.history || []).filter((item) => item.id !== id) });
  // Tally caches depend on roster size; historic recorded ballots are immutable.
  dais.remove(generalVoteKey(committee.id)); dais.remove(motionVoteKey(committee.id));
  logActivity("Delegation removed", delegate.country);
}

export function captureAttendance(label) {
  const committee = ConferenceService.getActiveCommittee();
  const entry = { id: randomId(), label: clean(label || new Date().toLocaleDateString(), 160), at: now(),
    delegates: committee.delegates.map((d) => ({ id: d.id, country: d.countryDisplay || d.country, present: Boolean(d.present), voting: Boolean(d.voting) })) };
  activeDesk().attendanceDays.unshift(entry);
  activeDesk().attendanceDays = activeDesk().attendanceDays.slice(0, 60);
  logActivity("Attendance recorded", entry.label);
  return entry;
}

export function tallyBallot(committee, choices, rule = "simple", kind = "substantive") {
  const members = committee.delegates.filter((d) => !d.observer);
  const eligible = members.filter((d) => d.present);
  const counts = { For: 0, Against: 0, Abstain: 0, Pass: 0, Unrecorded: 0 };
  const invalid = [];
  for (const d of eligible) {
    const choice = choices[d.id];
    if (choice === "Abstain" && (kind === "procedural" || d.voting)) invalid.push(`${d.countryDisplay || d.country} cannot abstain in this vote.`);
    if (["For", "Against", "Abstain", "Pass"].includes(choice)) counts[choice]++; else counts.Unrecorded++;
  }
  const cast = counts.For + counts.Against;
  const required = rule === "absolute" ? Math.floor(members.length / 2) + 1
    : rule === "two-thirds" ? Math.ceil(cast * 2 / 3)
      : rule === "unanimous" ? cast : Math.floor(cast / 2) + 1;
  const quorumRequired = Math.ceil(members.length * (Math.min(100, Math.max(1, committee.quorumPercent || 50)) / 100));
  const quorum = eligible.length >= quorumRequired && members.length > 0;
  const complete = eligible.length > 0 && !counts.Unrecorded && !counts.Pass && !invalid.length;
  return { ...counts, eligible: eligible.length, members: members.length, cast, required, quorumRequired, quorum, complete, invalid,
    passed: complete && quorum && cast > 0 && counts.For >= required };
}
export function recordBallot({ title, choices, rule, kind, resolutionId, applyResolution = false }) {
  const committee = ConferenceService.getActiveCommittee();
  const result = tallyBallot(committee, choices, rule, kind);
  if (!clean(title, 160)) throw new Error("Give this vote a title.");
  if (!result.complete) throw new Error(result.invalid[0] || "Record every eligible delegation and resolve all passes before saving.");
  if (!result.quorum) throw new Error("The committee has not reached its configured quorum.");
  const entry = { id: randomId(), at: now(), title: clean(title, 160), rule, kind, resolutionId: resolutionId || null, result,
    votes: committee.delegates.filter((d) => d.present && !d.observer).map((d) => ({ id: d.id, country: d.countryDisplay || d.country, choice: choices[d.id] })) };
  activeDesk().ballots.unshift(entry);
  if (applyResolution && resolutionId) {
    const resolution = committee.resolutions?.find((r) => r.id === resolutionId);
    if (resolution) saveResolution({ ...resolution, status: result.passed ? "Adopted" : "Rejected" });
  }
  logActivity("Vote recorded", `${entry.title}: ${result.passed ? "passed" : "failed"}`);
  return entry;
}

export function saveDeskItem(collection, input) {
  if (!["schedule", "announcements", "contacts"].includes(collection)) throw new Error("Unknown organizer collection.");
  if (!clean(input.title || input.name, 180)) throw new Error("A title or name is required.");
  const desk = activeDesk();
  if (collection === "schedule" && input.start && input.end && Date.parse(input.end) <= Date.parse(input.start)) throw new Error("The end time must be after the start time.");
  const entry = { ...input, id: input.id || randomId(), updatedAt: now() };
  for (const field of ["title", "name", "body", "role", "email", "notes", "start", "end", "priority", "status"]) {
    if (entry[field] != null) entry[field] = clean(entry[field], ["body", "notes"].includes(field) ? 8000 : 240);
  }
  const existing = desk[collection].find((item) => item.id === entry.id);
  if (existing) Object.assign(existing, entry); else desk[collection].push(entry);
  logActivity(`${collection === "schedule" ? "Agenda item" : collection === "contacts" ? "Contact" : "Announcement"} saved`, entry.title || entry.name);
  return entry;
}
export function deleteDeskItem(collection, id) {
  if (!["schedule", "announcements", "contacts"].includes(collection)) return;
  activeDesk()[collection] = activeDesk()[collection].filter((item) => item.id !== id);
  logActivity("Organizer item removed");
}

export function saveResolution(input) {
  const committee = ConferenceService.getActiveCommittee();
  if (!committee.resolutions) committee.resolutions = [];
  if (!clean(input.title, 160) || !clean(input.body, 100000)) throw new Error("A title and resolution text are required.");
  if (String(input.body).length > 100000) throw new Error("Resolution text is limited to 100,000 characters. Shorten it before saving.");
  const old = committee.resolutions.find((r) => r.id === input.id);
  const next = { ...input, id: input.id || randomId(), title: clean(input.title, 160), sponsors: clean(input.sponsors, 2000),
    signatories: clean(input.signatories, 2000), body: clean(input.body, 100000), updatedAt: now(),
    status: ["Draft", "Introduced", "Adopted", "Rejected"].includes(input.status) ? input.status : "Draft",
    amendments: Array.isArray(input.amendments) ? input.amendments : [], revisions: [...(old?.revisions || [])],
  };
  if (old && ["title", "body", "sponsors", "signatories", "status"].some((key) => old[key] !== next[key])) {
    next.revisions.unshift({ at: old.updatedAt || now(), title: old.title, body: old.body, sponsors: old.sponsors || "", signatories: old.signatories || "", status: old.status });
    next.revisions = next.revisions.slice(0, 30);
  }
  committee.resolutions = old ? committee.resolutions.map((r) => r.id === next.id ? next : r) : [...committee.resolutions, next];
  logActivity("Resolution saved", next.title);
  return next;
}
export function saveAmendment(resolutionId, amendment) {
  const resolution = ConferenceService.getActiveCommittee().resolutions?.find((r) => r.id === resolutionId);
  if (!resolution) throw new Error("Save the resolution before adding amendments.");
  if (!clean(amendment.body, 10000)) throw new Error("Enter the amendment text.");
  const entry = { id: randomId(), ...amendment, body: clean(amendment.body, 10000), proposer: clean(amendment.proposer, 160), at: now(), status: "Proposed" };
  resolution.amendments = [...(resolution.amendments || []), entry];
  logActivity("Amendment proposed", resolution.title);
  return entry;
}
export function decideAmendment(resolutionId, amendmentId, decision) {
  const resolution = ConferenceService.getActiveCommittee().resolutions?.find((r) => r.id === resolutionId);
  const amendment = resolution?.amendments?.find((a) => a.id === amendmentId);
  if (!amendment || amendment.status !== "Proposed") throw new Error("This amendment has already been decided.");
  if (!["Accepted", "Rejected"].includes(decision)) throw new Error("Choose accepted or rejected.");
  if (decision === "Accepted") saveResolution({ ...resolution, body: `${resolution.body}\n\n${amendment.body}` });
  const current = ConferenceService.getActiveCommittee().resolutions.find((r) => r.id === resolutionId);
  const currentAmendment = current.amendments.find((a) => a.id === amendmentId);
  currentAmendment.status = decision; currentAmendment.decidedAt = now();
  logActivity(`Amendment ${decision.toLowerCase()}`, resolution.title);
}

export function feedbackItems() { return local.getJSON(FEEDBACK_KEY) || []; }
export function saveFeedback(input) {
  if (!clean(input.title, 160) || !clean(input.body, 8000)) throw new Error("Enter a title and message.");
  const entry = { id: randomId(), at: now(), category: clean(input.category, 40), title: clean(input.title, 160), body: clean(input.body), status: "Open" };
  if (!local.setJSON(FEEDBACK_KEY, [entry, ...feedbackItems()].slice(0, 100))) throw new Error("Could not store feedback. Download your message instead.");
  return entry;
}
export function setFeedbackStatus(id, status) { local.setJSON(FEEDBACK_KEY, feedbackItems().map((item) => item.id === id ? { ...item, status } : item)); }

export function publicPresenterState(committeeId = ConferenceService.getActiveCommitteeId(), patch = {}) {
  const key = `notionmun-presenter-${committeeId}`;
  const previous = dais.getJSON(key) || {};
  const state = { ...previous, ...patch, updatedAt: Date.now() };
  dais.setJSON(key, state);
  return state;
}
