# apps/web

The Alibaba Cloud architecture builder: a landing prompt that becomes a revision console, a canvas that Qwen draws as it streams, and a products panel under the canvas. Vite 8, React 19, TypeScript 6 (strict, erasable), `@xyflow/react` 12 for the canvas builder.

Design truth: `PRODUCT.md`, `.impeccable/surfaces/app.md` (direction), `.impeccable/spec/app-spec.md` (build spec), `tokens.css`, `strings.json`.

## Commands (run in `apps/web`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite on **5174** (strict), `/api` proxied to `http://127.0.0.1:8787` (`API_TARGET` overrides) |
| `npm run typecheck` | strict `tsc` |
| `npm test` | `node:test` over `src/**` and `scripts/**` (the alias hook `scripts/alias.mjs` maps `@ali/core` for Node) |
| `npm run build` | production build to `dist/` |
| `npm run replay:build` | rebuilds `src/replay/fixtures/*.json` from `eval/results` and `research/probes/streams.json` (read-only) |
| `npm run icons:ui` | regenerates `src/shell/ui-icons.generated.ts` from `.qwen/icons.json` |
| `npm run shots` | headless-Chrome screenshots of every state to `screenshots/` (own Vite on a free port in 5185-5199) |

Open `http://127.0.0.1:5174/?replay=<id>&speed=1x|4x|instant&lang=en|ko|zh` to play a recorded conversation with no server.

## Replay fixtures

`ecommerce` (F plus "oh i also want waf"), `ecommerce-k8s`, `ha`, `residency` (4 revisions, pinned region), `ai-agent` (solution map), `korean`, `chinese`, `chinese-fix` (repair turn), and the synthetic `stub-fallback`, `stub-fatal`, `stub-filtered`, `stub-network`, `stub-summary`. `src/replay/fixtures/index.json` lists them with titles and notes.

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
