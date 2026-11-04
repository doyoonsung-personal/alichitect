# src/export

**Export proposal** sends the committed design and its optional pricing interview to `POST /api/proposal`. Qwen3.8 Max uses private high-effort reasoning to write a recommendation, the design rationale, trade-offs, next steps and an interpretation of the estimate. The browser lays out the PDF from the same session snapshot. When the writer is unavailable, the user can download the basic PDF with the diagrams and pricing evidence. Stop cancels the export.

The solution price breakdown separates monthly and one-time subtotals and prints quantities, rates, sources, assumptions and unpriced items. If the user has reviewed the current estimate, the writer also receives the saved review observations. If the design has changed since pricing, the PDF asks the reader to refresh the estimate before relying on it.

## What is in the PDF

With a narrative, the business reader comes first: cover, **Executive summary** (lead paragraph, then the outcomes as titled blocks, then **What we propose next**: the first two next steps), **What you told us, and how the design answers it** (or, when fewer than half of the needs are the customer's own words, **What businesses like yours usually need, and how the design answers it**; each need with its source: the customer's words in quotation marks, marked "(original wording)" when they are in another language than the document, "Implied by what you described", or "Typical for businesses like yours"; then the answer and the products involved), the diagram, components led by **Why it's here** (a construct such as users or a mobile app has no documentation row), recommendations (with the drafted why), **Considerations and next steps** (trade-offs with how each is handled, numbered next steps, and a prompt to open the price breakdown when the catalog alone cannot size the solution), then the summary renamed **Design record** (its first chat reply titled **Architect's first notes**), connections and revision history.

The basic version (no narrative):

1. **Cover**: Alibaba Cloud logo (English or Chinese file from `public/brand`), the title (the first ask, editable in the dialog), the customer (optional), a ruled title block (date, revisions, products, catalog date), "Prepared with Architecture Builder" and the AI-generated line.
2. **Summary**: the first revision's narration, pinned requirements with their state, constraints (pinned regions, ruled-out products), assumptions with their alternative, open questions.
3. **Architecture diagram**: landscape, with the legend. Vector. A4; a diagram that would have to shrink below 0.62 moves to an A3 sheet instead.
4. **Components**: one entry per product: official icon, name, label, "Role in this design" (the node's why), "What it does" (catalog purpose), lifecycle and availability note, dated price, and a clickable link to the catalog's `docs`. A product without one says "Documentation link not yet available"; a URL is never invented.
5. **Recommendations** (product-need answers only): fit, why, dated price, link.
6. **Connections**: from, to, what it carries, type.
7. **Revision history**: each ask and its change set, with the console's marks.

Every page has "Page n of N" and "Catalog checked <date>". File name: `<title>-architecture-proposal-<yyyy-mm-dd>.pdf`, safe on Windows.

## How it is built

| File | Job |
|---|---|
| `model.ts` | Pure. Session, drawn graph and catalog to `ProposalModel`. Reuses the panel model, the console's change lines and requirement states, and the canvas's caution text. |
| `diagram.ts`, `svg.ts` | The diagram as SVG from the canvas's own scene (`buildScene`), routes (`planEdges` plus libavoid, channel router as fallback) and edge drawing model (`drawEdges`). Cards, frames, badges, edges, labels and the official icons are paths and text. |
| `fonts.ts`, `woff.ts`, `fonts-web.ts`, `fonts-node.ts` | Noto Sans KR and SC (SIL OFL 1.1) from the `@fontsource` packages. Only the unicode-range slices that hold the document's characters are fetched, so an English proposal loads three Latin faces (about 50 KB) and a Chinese one under 1 MB. pdfkit then embeds just the glyphs drawn. WOFF is inflated with `DecompressionStream`; WOFF2 is not used because pdfkit's subsetter garbles a woff2-decoded face. |
| `typeset.ts` | Line breaking for Latin, Korean (at spaces) and Chinese (between characters, with the punctuation rules), and drawing one text call per font face. |
| `pdf.ts` | The pages. Runs twice: a dry pass on `stub.ts` lets the font set learn which glyphs are needed, then the real pass. |
| `generate.ts` | The pipeline. `browser.ts` is the browser end (Vite font source, libavoid worker, logo fetch, download) and is loaded with `import()` on the first click, so none of this is in the app's first load. |
| `worker.ts` | The MCP entry. The web build also bundles the renderer for Cloudflare Workers. It reads the same fonts and logo through the static assets binding, uses the channel router, and accepts the IDE's narrative for a pinned design revision. |
| `ExportButton.tsx`, `export.css` | The header control and its small dialog; it runs the draft, the overlay and the layout. |
| `draft-client.ts` | `POST /api/proposal`: builds the `ProposalRequest`, reads the NDJSON `ProposalEvent`s with the turn client's line reader, and ends in the `ProposalDraft` or a typed `DraftError` (fatal with the server's message, unavailable, network, incomplete, aborted). |
| `draft-flow.ts` | Pure: the overlay's state machine (steps from the sections that arrived, the calm latest line, the quiet slow note, failure, the basic version). |
| `DraftOverlay.tsx`, `overlay.css` | The modal overlay that draws it: steps, elapsed time, latest line, Stop; on failure, Download basic version, Try again and Close. The workspace is inert behind it. |
| `strings.json`, `strings.ts` | The document's words in English, Korean and Chinese (Korean and Chinese drafted by Qwen against the app's own wording, then checked). |
| `tokens.ts` | The PDF's colours; `tokens.test.ts` fails if they drift from `src/styles/tokens.css`. |

## Checks

- `npm test`: model, SVG structure (every card, badge, frame and edge, plus a snapshot in `__snapshots__`; refresh with `UPDATE_SNAPSHOTS=1`), typesetting, fonts, file names, token drift, and `scripts/export/pdf.test.ts`, which generates PDFs in Node and reads them back with pdf.js (pages, text, link annotations, vector diagram, speed).
- `npm run export:samples`: English, Korean, Chinese and a product-need sample, checked and rendered to PNG in `screenshots/export/samples/`, plus the 25-plus-card speed run.
- `node scripts/export/e2e-browser.mjs`, `e2e-perf.mjs`, `e2e-header.mjs`: the real app in headless Chrome against your own Vite port (see the script headers). `e2e-browser.mjs` runs a replay, so it downloads the basic version.
- `node --import ./scripts/alias.mjs scripts/export/e2e-overlay.mjs [url]`: the overlay with `/api/health` and `/api/proposal` stubbed in the page; screenshots in `screenshots/export/overlay/` (in progress, failed, quota, slow, unavailable; light and dark; 1440x900 and 1040x800; en and ko) and behaviour checks (modal and inert, Escape does not stop, Stop downloads nothing, a finished draft downloads twice in a row, a replay offers the basic version).
- Draft fixtures: `scripts/export/drafts/*.json` (en, ko, zh and one long), drafted by Qwen from the recorded sessions, checked against the contract and edited by hand. `npm run export:samples` renders each sample with and without one; `checks.ts` checks the section order, every need, quote and reason, no text past the margins or into the footer, no orphaned sub-heading, and no hidden word.

## Known limits

- The catalog is English only, so product purposes and notes stay English in Korean and Chinese proposals (the words around them are translated).
- A character no Noto slice covers (an emoji) is replaced by `?`; an arrow by `->`.
- The font files add about 16 MB to `dist/` as lazy assets (about 880 files); none loads until a proposal needs it.
