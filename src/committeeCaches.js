// Per-committee dais state kept in browser storage, keyed by sheet id. A newly
// loaded workbook can reuse a sheet id ("UNSC"), so ConferenceService clears
// all of these whenever it switches conferences.
const PREFIXES = ["motion-vote-", "general-vote-", "motion-speakers-", "notionmun-presenter-"];

export const motionVoteKey = (committeeId) => `motion-vote-${committeeId}`;
export const generalVoteKey = (committeeId) => `general-vote-${committeeId}`;
export const speakersKey = (committeeId) => `motion-speakers-${committeeId}`;

export function clearCommitteeCaches() {
  try {
    for (const storage of [globalThis.sessionStorage, globalThis.localStorage]) {
      if (!storage) continue;
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
      for (const key of keys) {
        if (PREFIXES.some((prefix) => key?.startsWith(prefix))) storage.removeItem(key);
      }
    }
  } catch {
    // storage unavailable - nothing was cached
  }
}
