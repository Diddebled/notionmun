# NotionMUN feature status

Updated 2026-11-11. The uploaded Motion code was treated as reference source;
its documents did not grant instructions or access to its original services.

| Workflow | Available behavior |
| --- | --- |
| Delegate import | XLSX workbooks with multiple committees; CSV and TSV; preview and committee selection; country aliases and historical delegations |
| Attendance | Absent, present, present and voting; bulk actions, undo, observers and attendance snapshots |
| General Speakers List | Search, add, reorder, remove and undo; per-speaker timer, overtime, time adjustments and speaking history |
| Motions | Natural language parser and structured entry, precedence, editable motion presets, motion log and voting |
| Voting | Quick tally and individual roll-call ballots, passes, observer exclusion, abstention restrictions, configurable quorum, four decision rules, immutable results and CSV |
| Committee presets | Seven editable starting templates; custom templates with delegation names and no personal contact information |
| Resolutions | Draft autosave, sponsors and signatories, status, revisions, amendments, duplication, presenter display, text and Markdown export, browser print/PDF, linked voting |
| Conference tools | Conference and committee creation/editing, roster editing, staff, agenda, calendar export, overlap warning, directory CSV import/export, registration status, bulletin templates |
| Reports | Attendance and speaking metrics, participation coverage, all-committee overview/export, multi-session attendance snapshots, recorded ballots and organizer activity |
| Recovery | Named workspace library, rolling recovery points, recovery before replacing work, JSON transfer with queue, votes, drafts, notes and preferences |
| Offline | Local persistence; installed service worker caches all application routes/assets after the first successful online load; install/update controls where supported |
| Presenter | Read-only floor, queue, timer, documents, published bulletin and agenda; follows another tab at the same browser origin on the same device |
| Preferences | Light/dark/brown themes, reduced motion, custom keyboard shortcuts and quick find |
| Feedback and sharing | Local feedback notebook with status/export; website QR/link sharing, optional campaign labels; diagnostic parser playground |
| Optional Firebase | Authentication, cloud session members, shared attendance between chairs, private preference sync, public read-only floor/queue/timer broadcast |

## Scope and configuration

No cloud service is required for the chair workflows. Firebase-dependent features
are disabled until the site owner supplies their own project configuration,
enables authentication, configures authorized domains and deploys `firestore.rules`.
No live Firebase project was supplied, so multi-device cloud behavior requires an
integration test against the owner's project before conference use.

Shared attendance is explicitly connected to the current local committee. Co-chairs
must import the same roster. It synchronizes attendance and broadcasts the floor;
full collaborative editing of resolutions, agendas and speaker queues is not included.
Independent browsers remain independent workspaces. Use JSON backup/restore to
transfer work or combine conference reports by importing the appropriate workbook.

The directory, registration list, announcements and feedback notebook replace the
uploaded source's server-dependent admin, subscriber and feedback screens with
functional device-local tools. They do not send email, Discord notifications,
waitlist requests or referrals to the original Motion infrastructure. Directory
roles do not grant cloud account permissions. There is no payment or telemetry.

Templates provide editable starting procedures, not official rules of procedure.
Special council veto rules must be adjudicated by the chair.

Browser storage has finite capacity. The library holds 20 named conferences, custom
templates 30, recovery 8 snapshots, attendance history 60 snapshots, organizer activity
250 entries and resolution history 30 versions. Existing named entries are not silently
evicted when the library is full. Export regular backups, particularly before clearing
browser data, changing devices or origins. Feedback is exported separately from a
conference backup. Offline availability depends on a successful initial cache install;
private browser modes and storage restrictions can prevent durable saving.

## Validation

`npm test` runs regression checks for imports, attendance, queue/timer math, parser,
voting, recorded ballots, recovery, resolution changes, presets, calendar exports,
cloud day filtering and source packaging. Production builds support root hosting
and GitHub Pages with hash routing. Browser QA exercises the connected chair flow;
it does not substitute for a real conference rehearsal or a configured cloud test.

The original CPAL license, developer attribution and source download are retained.
