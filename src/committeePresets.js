import { local } from "./utils/storage";
import { randomId } from "./utils/randomId";
import ConferenceService from "./services/ConferenceService";
import { addCommittee, logActivity, saveRecovery } from "./services/desk";

const KEY = "notionmun-committee-presets-v1";
export const BUILTIN_COMMITTEE_PRESETS = [
  { id: "ga", name: "General Assembly", committee: "General Assembly", topic: "International cooperation and sustainable development", speechSeconds: 90, quorumPercent: 50, defaultRule: "simple", description: "A flexible starting point for a large deliberative committee." },
  { id: "disec", name: "DISEC", committee: "Disarmament and International Security", topic: "International peace, security and disarmament", speechSeconds: 90, quorumPercent: 50, defaultRule: "two-thirds", description: "Organize security debate and substantive resolution votes." },
  { id: "unsc", name: "Security Council", committee: "United Nations Security Council", topic: "Maintenance of international peace and security", speechSeconds: 90, quorumPercent: 50, defaultRule: "simple", description: "A small-council workspace. Apply your conference's veto and voting rules separately." },
  { id: "ecosoc", name: "ECOSOC", committee: "Economic and Social Council", topic: "Inclusive economic and social development", speechSeconds: 90, quorumPercent: 50, defaultRule: "simple", description: "A policy and development focused committee template." },
  { id: "hrc", name: "Human Rights Council", committee: "Human Rights Council", topic: "Promotion and protection of human rights", speechSeconds: 60, quorumPercent: 50, defaultRule: "simple", description: "A starting agenda for human rights debate." },
  { id: "who", name: "World Health Organization", committee: "World Health Organization", topic: "Strengthening global public health cooperation", speechSeconds: 60, quorumPercent: 50, defaultRule: "simple", description: "Structure health policy debate, draft recommendations and track votes." },
  { id: "crisis", name: "Crisis committee", committee: "Crisis Committee", topic: "Responding to emerging developments", speechSeconds: 45, quorumPercent: 50, defaultRule: "simple", description: "Shorter speeches with a bulletin board for crisis updates." },
];
export function committeePresets() { return [...BUILTIN_COMMITTEE_PRESETS, ...(local.getJSON(KEY) || [])]; }
export function saveCommitteePreset(name) {
  const committee = ConferenceService.getActiveCommittee();
  if (!name?.trim() || !committee) throw new Error("Enter a template name and choose a committee.");
  if ((local.getJSON(KEY) || []).length >= 30) throw new Error("You have 30 custom templates. Remove one before saving another.");
  const preset = { id: randomId(), custom: true, name: name.trim().slice(0, 160), committee: committee.committee, topic: committee.topic || "", speechSeconds: Math.round((committee.activeMotion?.speakingTime || 1.5) * 60), quorumPercent: committee.quorumPercent || 50, defaultRule: committee.defaultRule || "simple", description: "Your saved committee setup and delegation list.", delegations: committee.delegates.map((d) => ({ country: d.country, countryCode: d.countryCode, observer: Boolean(d.observer) })) };
  if (!local.setJSON(KEY, [preset, ...(local.getJSON(KEY) || [])].slice(0, 30))) throw new Error("Could not save the template. Download a backup to preserve your work.");
  return preset;
}
export function removeCommitteePreset(id) { local.setJSON(KEY, (local.getJSON(KEY) || []).filter((p) => p.id !== id)); }
export function applyCommitteePreset(id, createNew = true) {
  const preset = committeePresets().find((p) => p.id === id);
  if (!preset) throw new Error("Committee template not found.");
  saveRecovery("Before applying a committee template");
  if (createNew) addCommittee(preset.committee, preset.topic);
  const committee = ConferenceService.getActiveCommittee();
  committee.committee = preset.committee; committee.topic = preset.topic;
  committee.quorumPercent = preset.quorumPercent; committee.defaultRule = preset.defaultRule;
  committee.activeMotion = { motion: "General Speakers List", speakingTime: preset.speechSeconds / 60 };
  if (createNew && preset.delegations) committee.delegates = preset.delegations.map((d) => ({ ...ConferenceService.toDelegateRecord({ country: d.country, countryCode: d.countryCode }), observer: Boolean(d.observer) }));
  logActivity("Committee template applied", preset.name);
  return committee;
}
