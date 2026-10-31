# src/export

"Export proposal": one click in the header downloads a PDF with the diagram, each product's role and its official documentation link. It is built in the browser tab (no server, no headless Chrome, no print dialog), so it moves to serverless hosting unchanged.

## What is in the PDF

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
| `ExportButton.tsx`, `export.css` | The header control and its small dialog. |
| `strings.json`, `strings.ts` | The document's words in English, Korean and Chinese (Korean and Chinese drafted by Qwen against the app's own wording, then checked). |
| `tokens.ts` | The PDF's colours; `tokens.test.ts` fails if they drift from `src/styles/tokens.css`. |

## Checks

- `npm test`: model, SVG structure (every card, badge, frame and edge, plus a snapshot in `__snapshots__`; refresh with `UPDATE_SNAPSHOTS=1`), typesetting, fonts, file names, token drift, and `scripts/export/pdf.test.ts`, which generates PDFs in Node and reads them back with pdf.js (pages, text, link annotations, vector diagram, speed).
- `npm run export:samples`: English, Korean, Chinese and a product-need sample, checked and rendered to PNG in `screenshots/export/samples/`, plus the 25-plus-card speed run.
- `node scripts/export/e2e-browser.mjs`, `e2e-perf.mjs`, `e2e-header.mjs`: the real app in headless Chrome against your own Vite port (see the script headers).

## Known limits

- The catalog is English only, so product purposes and notes stay English in Korean and Chinese proposals (the words around them are translated).
- A character no Noto slice covers (an emoji) is replaced by `?`; an arrow by `->`.
- The font files add about 16 MB to `dist/` as lazy assets (about 880 files); none loads until a proposal needs it.
