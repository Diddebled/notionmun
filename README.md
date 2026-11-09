# NotionMUN.com

From Motion To Notion

An original green-and-ink committee workspace with labeled navigation, a floor
overview, a working docket and a committee-scoped chair's notebook. Built on the
user-supplied Motion-main source, with its attribution and license preserved.
The original HTML app is preserved in `legacy/`.

## Run

Requires Node 22.12+ or 24+.

```sh
npm install
npm run dev
```

For the built app, including the original roster API:

```sh
npm run build
python main.py 8001
```

Open http://127.0.0.1:8001. The Python server only binds to localhost.
`npm test` runs the imported and integration regression tests.

## Integrated workflows

- Excel conference workbooks and CSV/TSV rosters, with committee selection.
- Three-state roll call, bulk confirmation, keyboard navigation and undo.
- Speakers list with reorder, undo, drift-resistant timers and speaking statistics.
- Natural-language and structured motion entry, precedence, editable presets and voting.
- Seat-chart vote tally, simple/two-thirds/absolute majority calculations.
- Resolution editing, status, presentation, print and text download.
- Persistent local work, JSON backup/restore and CSV session reports.
- Chair's notes saved per committee and included in workspace backups.
- Light/dark/brown themes, reduced motion and configurable keyboard shortcuts.

Existing Motion workspace backups and browser storage remain compatible; internal
storage keys and the backup format identifier are intentionally unchanged.

The app opens with clearly labeled sample data on a fresh browser. Importing a
conference replaces that sample. Work is stored in this browser, not on a server;
export a backup before clearing site data or moving to another computer.

Legacy `motion-dais-state-v1` data is migrated on first launch at the same origin
(host and port). The original storage key is left untouched. Legacy delegates,
queue, active motion, resolutions and appearance are retained. Existing votes
and motion history remain accessible in the legacy app.

## GitHub Pages deployment

The GitHub Pages address is `https://diddebled.github.io/notionmun/` after the
deployment workflow succeeds. The public repository is `Diddebled/notionmun`.
In the repository's Settings > Pages, select GitHub Actions as the source.
The checked-in workflow imports the prepared source archive once, then installs,
tests, builds and publishes the source whenever `main` changes.

GitHub Pages builds set `VITE_BASE_PATH=/notionmun/` and
`VITE_ROUTER_MODE=hash`. Navigation uses addresses such as
`/notionmun/#/session`, allowing bookmarks and reloads on static hosting.
Other hosts keep their existing root-path navigation by default.

## Vercel deployment

The public application is a static Vite build. Excel/CSV import, debate tools,
notes, resolutions and backups run in the visitor's browser without a server
account. The local Python helper is not required by the deployed app.

```sh
npm ci
npm test
npm run build
npx vercel --prod
```

`vercel.json` enables direct visits to all client-side routes. A production
domain should be tested without Vercel authentication before sharing it.

Every build packages the modified source as `/notionmun-source.zip`, linked
from `/licensing`. Its source is distributed under the included CPAL-1.0.
The archive intentionally excludes secrets, environment files, runtime data,
logs, dependency folders and the generated source archive itself.

Browser data remains private to each browser and origin. Export a JSON backup
from localhost and restore it on the public site to move existing work there.
Cloud collaboration is not enabled by hosting alone.

## Optional cloud services

No Firebase credentials or telemetry are bundled. Cloud Sessions displays an
unavailable state until the `VITE_FIREBASE_*` variables from `.env.example` are
configured in `.env.local` and the app is rebuilt. Firebase authentication,
authorized domains, and Firestore rules must also be configured and tested for
your own project. Core committee workflows do not require an account.

No supplied admin endpoints, notification/email services, or deployment hooks
are enabled by this local integration.

## Source and attribution

Country and territory flags use the online-sourced Flagpack artwork by Yummygum
under MIT. `/licensing#flag-credits` provides visible credits and the complete
copyright/permission notice. `licenses/FLAG_CREDITS.md` and
`licenses/flags-manifest.json` document every flag separately from photographs
and the inherited historical illustrations.

The dashboard's reference-venue photographs come from Wikimedia Commons under
CC BY 4.0. Each includes a visible photographer credit and license link. Full
sources and change notices are on `/licensing#image-credits` and in
`licenses/IMAGE_CREDITS.md`. These image licenses remain separate from CPAL-1.0.

Original Motion code: Copyright (c) 2026 Paul Taechaaukarakul.
Powered by Motion: https://motionmun.com/licensing

The supplied CPAL-1.0 license and archived license notices are retained. Changes
in this integration include the local workspace, durable storage, legacy
migration, backup/restore, CSV imports/exports, resolutions, responsive layout,
local routing and secure static serving. Modified source is in this workspace.
