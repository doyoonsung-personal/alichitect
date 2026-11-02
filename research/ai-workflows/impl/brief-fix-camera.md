# Fix the workflow canvas zoom and card size (live UI check, 2026-11-03)

A live check drove the real app (local server, real Qwen) through the support-email workflow: 11 inline steps in one row, plus 4 attached and branch steps. Screenshots in a 1150×800 window:
- the canvas, about 790 px wide, shows **only 1.5 cards**, each about 335×225 screen px and mostly empty (title plus product);
- at 800×800 the canvas, about 440 px wide, shows **less than one card**.

The camera zooms in to fit the height of a one-row workflow, which makes it unusable.

**Likely causes:**
- `workflowViewport` in `packages/core/src/workflow-layout.ts` uses a 1.1× zoom floor;
- `apps/web/src/workflow/layout-adapter.ts` enlarges the workflow geometry;
- the web camera (`apps/web/src/workflow/camera.ts`) fits the height.

## Required behaviour
- **Readable floor:** the smallest zoom at which card titles render at 11 screen px or more. Compute it from the actual title font size in layout units, and stop assuming 1.1×.
- **Never zoom past natural size:** the initial fit never goes above 1.0, the natural card size.
- **Fit:**
  - the whole workflow fits when it can at a zoom between the readable floor and 1.0;
  - otherwise the camera uses the readable floor and pans, keeping the newest column visible while streaming (follow).
- **Compact cards:** about the cloud card size, with the content the scene already has (title, product, model chip, badges) and no large empty areas. The cloud card geometry and the cloud view are unchanged.
- **Acceptance**, rendering the support-email fixture (`packages/core/test/fixtures/workflows/support-email-triage.json`) through the real UI path:
  - at 1150×800, at least 4 inline columns are fully visible with titles at least 11 screen px;
  - at 920×800, at least 3;
  - at 800×800, at least 2.

  Check it with a headless browser test in `apps/web/scripts/e2e-workflow.mjs` (extend it) and with unit tests on the camera maths.

## Files you own
- the `workflowViewport` part of `packages/core/src/workflow-layout.ts`, and its tests;
- `apps/web/src/workflow/camera.ts`, `layout-adapter.ts` and `scene.ts`, and their tests;
- `apps/web/src/canvas/WorkflowStage.tsx`, `WorkflowNodes.tsx` and `workflow.css`;
- `apps/web/scripts/e2e-workflow.mjs`.

Another job (the PDF) imports `scene.ts`, `layout-adapter.ts`, `glyphs.ts` and `edges.ts`. Keep their exported names and shapes; changing geometry values is fine.
