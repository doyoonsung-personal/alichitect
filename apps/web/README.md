# apps/web

The Alibaba Cloud architecture builder: a landing prompt that becomes a revision console, a canvas that Qwen draws as it streams, and a products panel under the canvas. Vite 8, React 19, TypeScript 6 (strict, erasable), `@xyflow/react` 12 for the canvas builder.

Design truth: `PRODUCT.md`, `.impeccable/surfaces/app.md` (direction), `.impeccable/spec/app-spec.md` (build spec), `tokens.css`, `strings.json`.

## Commands (run in `apps/web`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite on **5174** (strict), `/api` proxied to `http://127.0.0.1:8787` (`API_TARGET` overrides) |
| `npm run typecheck` | strict `tsc` |
| `npm test` | `node:test` over `src/**` and `scripts/**` (the alias hook `scripts/alias.mjs` maps `@ali/core` for Node) |
| `npm run build` | production build to `dist/` (what the Worker serves), then `check:dist` |
| `npm run check:dist` | fails if a test or demo tool is in `dist/`; prints the file count and size against the Workers static-asset limits |
| `vite build --mode review` | the same app with the tools on, for the screenshot and check scripts (`flow.mjs` and `motion/*` build this way) |
| `npm run replay:build` | rebuilds `src/replay/fixtures/*.json` from `eval/results` and `research/probes/streams.json` (read-only) |
| `npm run replay:asks` | rewrites only the four `asks-*` fixtures and their manifest entries (no eval results needed) |
| `npm run icons:ui` | regenerates `src/shell/ui-icons.generated.ts` from `.qwen/icons.json` |
| `npm run shots` | headless-Chrome screenshots of every state to `screenshots/` (own Vite on a free port in 5185-5199) |
| `node scripts/motion/strips.mjs` | frame strips of the motion grammar (see Motion below) |
| `node scripts/motion/perf.mjs` | frame rate while a 25-card diagram streams |
| `node scripts/motion/reduced.mjs` | the reduced-motion check |
| `node scripts/finish/live.mjs <url>` | the finish check against a live turn server: real Qwen turns (e-commerce, follow-up, AI agent, Korean), a refresh, three exports; prints the transcript as JSON lines |
| `node scripts/finish/extra.mjs <url>` | per viewport: assume and ask chips (en, ko), the export dialog (open, working, saved, failed), error states, the popover; writes `report.json` with header overlaps, clipped text and dialog bounds |
| `node --import ./scripts/alias.mjs scripts/finish/render-pdf.ts <pdf> <dir>` | renders an exported proposal's pages to PNG with pdf.js and prints page sizes |
| `node scripts/finish/sheet.mjs <out.png> <cols> <width> <png>...` | a contact sheet of screenshots, to review many in one look |

Open `http://127.0.0.1:5174/?replay=<id>&speed=1x|4x|instant&lang=en|ko|zh` to play a recorded conversation with no server (development and review builds only, see below).

## Production build and the test tools

`npm run build` is the build the Worker serves at architect.alikorea-demo.com. `src/app/tools.ts` reads `__AB_TOOLS__`, which `vite.config.ts` sets to true for `vite` and `vite build --mode review`, and to false for the production build. Behind it, and so absent from `dist/`:

- `window.__ab` (the store and controller) and `window.__abCanvas` (the routing log);
- the `?replay=` and `?speed=` URL switches;
- the synthetic replay sessions (`stub-*`, `asks-*`) and `chinese-fix`.

The seven real recordings stay (`ecommerce`, `ecommerce-k8s`, `ha`, `residency`, `ai-agent`, `korean`, `chinese`, about 200 kB, each its own chunk loaded only on click) because the offline notice's "Replay a recorded session" button plays them: when the drawing service does not answer, a presenter still has a drawing to show. `scripts/check-dist.mjs` runs after every `npm run build` and fails it if any of the tools is found.

## The hosted Worker

Only `apps/worker` has these routes; the local turn server has none of them and the app behaves as before.

- **Account control** (`src/shell/AccountMenu.tsx`, the same `Menu` as Sessions): GET `/api/me` once at boot and again after each turn. It shows the name (else the address), today's turns against the quota (admins: no limit, with the reset time in the person's own zone), Account settings, Admin (admins only) and Sign out (a form POST to the address `/api/me` names). It is in the working header and at the top right of the landing. When `/api/me` fails or is not JSON in the Worker's shape, nothing renders.
- **The session ends mid-turn** (`src/app/controller.ts`, `src/stream/account.ts`): a fatal `signed-out` (401, or a 401 with no body) sends the page to `/login?next=<this path>`, and `not-approved` to `/pending`. The ask is kept in `sessionStorage` (`ab.pending.ask`) and put back in the composer, or the landing box, after sign-in. A `{ ok: true }` answer from `/api/health` (the Worker is up but no longer knows this browser) does the same when Try again is pressed. One trip to the same page in 15 s at most, so a Worker that disagreed with itself could not loop the tab.
- **Every other fatal code** (`quota-exceeded`, `user-busy`, `rate-limited`, any unknown code) shows the server's own message, already in the person's language, in the failed revision.

## Replay fixtures

`ecommerce` (F plus "oh i also want waf"), `ecommerce-k8s`, `ha`, `residency` (4 revisions, pinned region), `ai-agent` (solution map), `korean`, `chinese`, `chinese-fix` (repair turn), the synthetic `asks-shop` and `asks-vague` (each also as `-ko`: assume and ask ops, until the model emits them), and the synthetic `stub-fallback`, `stub-fatal`, `stub-filtered`, `stub-network`, `stub-summary`. `src/replay/fixtures/index.json` lists them with titles and notes.

## Sessions and refresh

A session is saved in `localStorage` (`ab.sessions.v1`) at each commit. The tab remembers which session it shows in `sessionStorage` (`ab.tab.session`), so a refresh reopens that session (the record, the diagram and the requirements, with the "Session restored" toast) and a new tab starts on the landing. A refresh in the middle of a turn returns to the last committed state; the unfinished ask is not kept. Replay URLs never resume.

## Layers

- `src/store`: the one source of truth. `types.ts` (state), `reducer.ts` (pure; every stream event goes through it), `changes.ts` (op events to change lines), `requirements.ts`, `lifecycle.ts`, `sessions.ts` (localStorage `ab.sessions.v1`), `selectors.ts`, `react.tsx` (hooks).
- `src/stream`: the NDJSON client, `display.ts` (the one `displayGraph` call), `cursor.ts` (the Cursor timer).
- `src/canvas/layout.ts`: the one `layoutGraph` call, and `fitCamera`.
- `src/replay`: fixture timing (`plan.ts`), player (`player.ts`), registry.
- `src/app`: `controller.ts` (every side effect), `contracts.ts` (what the builders implement), `props.ts` (fills the props from the store), `App.tsx`.
- `src/shell`, `src/landing`, `src/brand`: the landing, header, menus, offline notice, handoff.
- `src/console` (the revision record and composer), `src/canvas` (React Flow with our own frames, cards, edge layer and popover; `src/routing` is the libavoid router), `src/panel` (the products table under the canvas). Each takes one props interface from `src/app/contracts.ts`.

## Contracts

Read `src/app/contracts.ts`. Console, canvas and panel render props and call `actions`; they never import the store. Copy comes from `t(key, vars)` (keys live in `src/i18n/strings.json` in en, ko and zh; canvas-only words are in `src/canvas/labels.ts`). Tokens only: no raw colours.

- Console: `data-flip="composer"` on the composer's box (the landing handoff lands there). The shell renders the polite live region.
- Canvas: fits with `fitCamera` when `display.refit` and `display.version` change and reports the stage size with `actions.setSize`.
- Panel: the shell gives it a container as tall as the open panel, pinned to the stage bottom, with `pointer-events: none`.

## Checking the whole flow

Run `node scripts/flow.mjs` in `apps/web`. The script builds the app once into a temporary folder and serves it via `vite preview` on a free port between 5185 and 5199 (never 5173). This prevents external edits from triggering reloads during execution. It starts a fake drawing service that streams a recorded fixture ("residency", four turns) at 2x speed, requiring no API keys or Qwen access.

The tool captures numbered PNGs for viewports 1280x720, 1366x768, 1440x900, 1536x864, and 1920x1080 under `screenshots/flow/<size>/`. These images cover states including landing, typing, IME composition, handoff, card rendering, streaming, panel interactions, hovers, popovers, follow-ups, change lines, revisions, and long sessions. In replay mode, it also saves solution maps, error states, filtered messages, and localized views. A check for 390x844 ensures no horizontal scroll occurs.

A `report.json` file is generated alongside the images, recording zoom levels, minimum card title pixel sizes, card counts, horizontal scroll status, and IME behavior per viewport. Use `--sizes` to limit viewports, `--out` to set the directory, `--no-390` to skip mobile checks, `--no-build` to reuse the previous build, and `--dist` to specify the build directory.

## Motion

"Live but calm": the diagram grows in place and never reshuffles what the reader has already read. Motion explains what changed and points at it. Timings live in `src/styles/tokens.css` (the spec's tokens, unchanged) and `src/styles/motion.css` (the added ones); `src/canvas/motion.ts` mirrors the canvas values for its clock, and `motion.test.ts` checks they agree.

| Moment | What moves | Timing |
|---|---|---|
| Landing handoff | The brief box travels to the composer, its words fly up into revision 1's ask (`src/shell/flight.ts`), the lockup docks in the header, the sheet slides in | 420 ms |
| Follow-up | The composer's words rise into the new revision's ask | 320 ms |
| Narration | Words that just arrived come in light and settle behind the Cursor | 180 ms |
| Card enters | Fades up 6 px in request-path order (by column, then top to bottom), 30 ms apart, at most 6 steps; waits 100 ms while its frame is still moving; the Cursor bar draws itself under it | 240 ms |
| Edge | Draws from source to target (`stroke-dashoffset`) once its later end has landed; the arrowhead and label arrive as the line reaches them; a removed edge fades | 320 ms, fade 160 ms |
| Card moves | Glides | 300 ms |
| Card removed | Its content fades, then the dashed ghost collapses | 160 + 160 ms |
| Badge (WAF on ALB) | Drops onto its host once the host has landed | 200 ms |
| Commit | The revision tags stamp on in request-path order while the Cursor bars retract; the record's tag presses on and the closing line arrives | 240 ms, 360 ms |
| Change-line hover | A blue ring closes in on the cards, the rest dims | 160 ms, 120 ms |
| Products panel | Rises, its first 12 rows cascade 16 ms apart; new rows arrive with a soft blue ground (only while open); the count ticks; the ^ handle turns over | 280 ms |
| Export | A 2 px blue bar sweeps on the dialog's top edge while the PDF is made, then fills | while it works |
| Questions, assumption chips | Arrive one after another | 240 ms, 60 ms apart |

- **Interrupts:** a clock (`createMotionClock` in `src/canvas/motion.ts`) keeps every running entrance, glide, ghost and edge draw going when the next 180 ms batch lands. A new op retargets a moving card from where it is; nothing waits in a queue; a re-routed edge resumes its draw where it was.
- **Properties:** transform and opacity, plus `stroke-dashoffset` on a drawing edge. No layout properties, except the existing frame box and the pinned-requirement row.
- **Reduced motion:** no travel, scale or draw; meaningful changes stay as fades of 120 to 200 ms; no word flight; the Cursor holds still.

Checking it (each script starts its own servers on free ports in 5185-5199 and a fake drawing service; no key):

- `node scripts/motion/strips.mjs --label after [--reduced]`: frame strips from a CDP screencast at 1440x900 (0, 100, 200, 400 and 800 ms) into `screenshots/motion/<label>/`.
- `node scripts/motion/perf.mjs [--runs 3] [--throttle 4] [--dev] [--reduced] [--out file.json]`: frame intervals and long animation frames (Performance API) while a 25-card diagram streams.
- `node scripts/motion/reduced.mjs`: samples `document.getAnimations()` with and without reduced motion; fails on any movement under reduced motion.
