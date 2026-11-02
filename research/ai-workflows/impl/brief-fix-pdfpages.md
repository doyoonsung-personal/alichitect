# Fix: workflow PDF vertical space, pagination and step order (2026-11-03)

The workflow PDF now draws cards that fit, and a cycle-detection fix (`fecea04`) gives a proper left-to-right overview. Rendering `support-email-triage` and the en-25 sample shows three remaining problems. Render them yourself with `node --import ./scripts/alias.mjs scripts/export/e2e-workflow.mjs --render` from `apps/web`. The output goes to `tmp/pdfs/workflow/` at the repo root; delete it when you're done.

1. **Empty vertical space.**
   - The core layout reserves each row's attachment slots: `rowHeights` is 360 units per row, even when a row has no attachment host. That is how the live canvas streams without moving cards.
   - The web adapter scales y by 2.5, so a branch row lands 900 units below row 0. In support-email, the one branch card ("Resolve manually") sits about four card-heights below the main row. The overview is mostly white, and the detail tiles are mostly empty.
   - `fitWorkflowPdfScene` (`apps/web/src/export/workflow-diagram.ts`) only ever pushes rows down.
2. **Broken pagination** (`workflow-pagination.ts`):
   - detail page 4 of 4 holds only two edge stubs and labels;
   - detail page 2 of 4 is mostly bare vertical lines;
   - detail page 4 of 4 says "Continues on page 6" while it is page 7, so it points backwards;
   - the last tile still carries a continuation note.
3. **Step order:**
   - the "Steps and why" panel (`apps/web/src/workflow/panel-model.ts`, merged on this branch) orders steps by layout column and lane, with attachments right after their host and repeat groups together;
   - the PDF step sections use insertion order, which differs on 18 of 32 fixtures;
   - `panel-model.test.ts` records the difference as a TODO test.

## Required behaviour
- **Compact rows, PDF only.** A PDF never streams, so it doesn't need the live reserve.
  - In the export path, pull each row up so its top sits just below the lowest content above it in overlapping columns, plus clearance for edge labels (at least 24 units plus a label line where a label sits between the rows).
  - Keep each row's cards aligned with each other, and keep the left-to-right order.
  - Attachments stay under their host, in slot order.
  - Reroute edges after compaction, as the font-fitting pass already does. No edge may cross through a card, and labels stay readable.
- **Pagination:**
  - every detail page holds at least one whole card;
  - no page is only edge stubs;
  - continuation notes name the next page that continues the drawing, and the last tile has none;
  - page numbers count correctly when the steps, tables and questions sections follow;
  - keep the 11 pt title floor;
  - prefer fewer, fuller tiles. If the whole diagram fits one landscape page at the floor, use no detail tiles at all.
- **Step order:** PDF step sections, and any PDF table listing steps, use the same order as the panel. Import the ordering from `panel-model.ts` if it's exported; otherwise move the ordering into a shared, pure helper in `apps/web/src/workflow/` that both import, and keep panel-model's behaviour identical. Turn the TODO test into a passing parity test on all 32 fixtures.
- **Cloud unchanged:** cloud PDF output is unchanged, and its snapshot and matrix checks still pass.
- **Acceptance**, on support-email and en-25:
  - the overview is legible;
  - every detail page has a whole card;
  - continuation references point forward;
  - no page is mostly blank;
  - the overview drawing uses a sensible share of its page, not a thin strip at the top above whitespace.

  Look at the rendered PNGs, and describe what you saw.
- **Tests:** add unit tests for the compaction (no overlap; rows only move up; attachment order kept), for pagination (forward references; every tile holds a card), and for order parity.

## Files you own
- `apps/web/src/export/**`, except `ExportButton.tsx`;
- `apps/web/scripts/export/**`;
- `apps/web/src/workflow/panel-model.ts` and its test, only to export or extract the ordering without changing its result;
- a new pure helper file under `apps/web/src/workflow/` if you extract the ordering.

Don't edit the core layout, `layout-adapter.ts`, `scene.ts`, the canvas components or `store/**`.
