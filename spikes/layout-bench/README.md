# Layout replay bench

The bench replays stored model output through the core pipeline and judges a layout on it. The inputs are the eval runs (`final`, `baseline`, `heldout-baseline`, `heldout-final`), the recorded probe streams and the canvas spike's synthetic streams.

The pipeline works like this:
- It parses each turn's content with `createLineParser`.
- It runs `validateOp` and `applyOp` with one ctx per session.
- During a turn it draws the core display rule over `repairGraph(working)`.
- At turn end it commits `repairGraph`'s result.

The bench lays out every frame with the layout under test. It measures stability, size and rendered text size, truncation, frame fill, routes and layout time, and it renders SVG and PNG snapshots.

## Run

```bash
node spikes/layout-bench/bench.ts --layout core
node spikes/layout-bench/bench.ts --layout spikes/layout-bench/variants/<name>.ts
node spikes/layout-bench/bench.ts --quick          # final run only, turn-end routing, no render
node spikes/layout-bench/bench.ts --reconcile      # also replays the final run the reviewer's way
```

```text
  --layout core|<variant.ts>   layout under test (default core)
  --sources a,b                final,baseline,heldout-baseline,heldout-final,probes (default all)
  --batch op|turn|both         batching for stability (default both; size, text and routes use op)
  --routes batch|turn|none     route every frame or turn-end states only (default batch)
  --no-avoid                   skip libavoid-js (channel router only)
  --no-render                  skip SVG and PNG snapshots and the browser text check
  --no-png                     write SVG snapshots but no PNG
  --reconcile                  also replay the final run the reviewer's way and print the reconciliation
  --quick                      final run only, turn-end routing, no render (a fast check while iterating)
  --out <dir>                  output root (default spikes/layout-bench/out)
  --dpr <n>                    PNG device pixel ratio (default 1: the canvas's real pixels)
```

A full run takes about 35 s on this machine, and `--quick` takes about 3 s. A run prints a table and writes these files:
- `out/<layout>/metrics.json`: every number, by canvas size, source and router.
- `out/<layout>/text-verify.json`: the truncation estimate against Chrome's layout, per string.
- `out/<layout>/render/`: an SVG and a PNG per state and canvas size, plus `index.html`, a contact sheet.

## Write a variant

A variant is a module that exports this interface:

```ts
// Required. opts = { canvas: { w, h } }. Returns the LayoutState shape of packages/core/src/layout.ts.
export function layoutGraph(graph, catalog, prev, opts): LayoutState;
// Required. Type sizes in px at zoom 1, and the card size. textW is optional (default cardW - 60).
export const METRICS = { titlePx, subtitlePx, frameLabelPx, cardW, cardH };
// Optional. Replaces the canvas text rule (node label, then short name, full name or lane).
export function cardText(card, display, catalog): { title, subtitle };
```

Cards need `slot` and `frame`, because the stability metric reuses `blockOf` and `unrelatedMoves` from core. Start by copying `variants/example-core.ts`. It wraps the core layout and reproduces `--layout core` exactly.

## What it measures

- **Stability.** It classifies moved cards per batch (moved means more than 0.5 px) as unrelated, same-block or re-slotted. It reports first turns and follow-ups separately, with a px histogram and the worst cases. It runs with batches of one op and of one turn.
- **Size.** It reports the bounding box and aspect ratio, and the fit zoom at 880x720, 1040x800 and 1520x940 (24 px padding, max zoom 1.25). From the zoom it computes rendered title, subtitle and frame-label px, and the share of states below 11 and 12 px, by card count.
- **Text.** It estimates truncation from Inter advance widths in `data/inter-advances.json`. A render run checks the estimate in Chrome on a sample of strings.
- **Frames.** It reports the empty share of zone frames and card coverage by frame kind.
- **Routes.** It runs the channel router and libavoid-js. It reports card hits, overlap, near-parallel segments under 10 px apart and length along frame borders (within 6 px). It also reports the detour ratio against the shortest side-midpoint elbow, crossings, the churn of routes whose endpoints did not move, and time. Routes are measured at 1040x800 only.
- **Layout time** per call.

## Files

- `bench.ts`: the CLI.
- `src/`: `inputs`, `trace` (the replay), `display`, `layouts` (the loader), `runner`, `aggregate`, `metrics/`, `render/`, and `routing/` (copied from `spikes/canvas/src/routing`).
- `scripts/inter-widths.ts`: regenerates the advance table in Chrome.
- `variants/`: layout variants, including `example-core.ts`.
- `test/`: run `node --test` inside `spikes/layout-bench`.
- `tsconfig.json`: type checks the bench with `../canvas/node_modules/.bin/tsc -p tsconfig.json`.

## Notes

- `src/display.ts` takes the display rule from `packages/core/src/display.ts`. The spike's copy, `spikeDisplay`, is kept for an equivalence test.
- PNGs are rendered at device pixel ratio 1 unless you pass `--dpr`.
- The bench finds Chrome the same way `spikes/canvas/scripts/measure.mjs` does. If it does not find it, set `CHROME_PATH`.
- puppeteer-core, libavoid-js and the Inter font are read from `spikes/canvas/node_modules`. The bench never writes there.
- The renders use the app's own glyphs and palette. They contain no vendor icons, logos or brand colours.
