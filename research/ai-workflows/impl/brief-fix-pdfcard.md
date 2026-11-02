# Fix: workflow PDF card content overflows its card (integration seam, 2026-11-03)

Two jobs merged into `phase-1` tonight:
- **fix-camera** made workflow cards compact. `buildWorkflowScene` (`apps/web/src/workflow/scene.ts`) now sizes each card's `h` from the web card's content: title lines × px × 1.25, product 18, model chip 24, badges 18 each, hidden count 18. `normalizeWorkflowLayout` no longer scales cards ×1.6 / ×3, and titles wrap at natural size (`workflowTitle`).
- **p7b** draws the PDF workflow diagram (`apps/web/src/export/workflow-svg.ts`, `workflow-diagram.ts`). Its card drawing was written against the old tall cards. It draws more than the web card does: it adds a `c.id` line, puts title lines `px + 4` apart, uses 16 px body rows, and wraps product, model and badge text.

**Result:** in the PDF, card text and model chips are drawn below the card's rectangle. In the `workflow-svg.test.ts` output, `step-0` has rect height 60, but its id line sits at y=74. `step-1` has height 78, but its model chip runs from y=78 to 94. The same test also fails on `/&lt;review &amp; respond&gt;/`, because the title now wraps onto two lines.

## Required behaviour
- **Fit:** every piece of PDF card content lies inside its card's rect: the title lines, the body rows, the chips, the approval lock and the human-wait clock. This holds for every one of the 32 fixtures in `packages/core/test/fixtures/workflows/`, in en, ko and zh, with the real export fonts.
- **Card heights:**
  - Choose the PDF's card heights in the export path. Adjust the scene's card `h` before `planWorkflowEdges` runs, so edge ports and routing see the final heights.
  - Cards must not overlap each other, or a bracket, after the change. Add a check for that across the 32 fixtures.
  - Prefer making the PDF card show the same content as the web card over growing it. Drop the raw `c.id` row unless the PDF's step sections refer to steps by id. If they do, keep it and say so.
- **Web unchanged:** the web canvas scene and geometry stay as they are. Don't edit `scene.ts`, `layout-adapter.ts`, `camera.ts` or the canvas components. If the PDF needs different heights, derive them in the export code.
- **Escaping test:** update the test so it checks escaping across wrapped title lines. Keep it a real check that `<`, `&` and `>` are escaped.
- **Cloud unchanged:** cloud PDF output is unchanged. The existing snapshot and matrix checks still pass.
- **Visual check:** render the support-email fixture, and one long fixture, to PNG through the existing export e2e path (`apps/web/scripts/export/e2e-workflow.mjs`, or the checks script). Look at them, and report what you saw.

## Files you own
- `apps/web/src/export/workflow-svg.ts`, `workflow-diagram.ts` and `workflow-pagination.ts`, and their tests;
- `apps/web/scripts/export/e2e-workflow.mjs` and `apps/web/scripts/export/workflow-pdf.test.ts`;
- a new test file under `apps/web/src/export/` if you need one.

Don't edit `ExportButton.tsx`; another job owns it.
