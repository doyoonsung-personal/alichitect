Implemented and left uncommitted.

| IDs | Status |
|---|---|
| C8 | fixed — mouse hover, click and attachment list |
| C9, Codex #8 | fixed — popover tracks geometry and closes offscreen |
| C10, C42 | fixed — removed steps no longer steal external focus |
| C11 | fixed — Follow/Fit account for the panel |
| C12 | fixed — stationary clicks preserve following |
| C13, C45 | fixed — dismissal and canvas tab order |
| C14, C15, C16, C17 | fixed — resume, centred zoom, modifiers and bounce |
| Codex #6 | fixed — follows changed steps or attachment owners |
| C30, C38 | fixed — edge copy and repeat plurals |
| C37, C46, C53 | fixed — localized popover close label |
| C40 | fixed — matching title measurement and rendering |
| C48, C49 | fixed — functional follow toggle and overview role |
| C50, C51 | fixed — collision-proof edge-layer IDs |
| C52 | fixed — unbroken-token wrapping |

Validation:

- Headless Chrome: **27/27 passed**, using port 5196; exact three-attachment resume case also passed separately.
- Targeted unit tests: **47/47 passed**.
- Root: **1,087/1,087 passed**.
- Web: **625/626 passed**. Unrelated “logos render in Chrome” timed out, including its isolated rerun.
- Worker: **276/276 passed**.
- Core, web and worker typechecks: **passed**.
- Required cloud prompt SHA-256: **unchanged**.
- Browser runs still emitted ResizeObserver warnings also observed before the fixes.

Changed files:

- `apps/web/src/canvas/`: `WorkflowNodes.tsx`, `WorkflowPopover.tsx`, `WorkflowStage.tsx`, `WorkflowTools.tsx`, `workflow.css`, `index.tsx`
- `apps/web/src/workflow/`: `camera.ts`, `camera.test.ts`, `scene.ts`, `scene.test.ts`
- `apps/web/src/i18n/strings.json`
- Created [e2e-workflow-regressions.mjs](C:/Users/mendo/ali_wt/fe-canvas/apps/web/scripts/e2e-workflow-regressions.mjs)

Decisions: render the popover directly before the canvas tools; retain the roving tab stop separately from active focus; use explicit Arial title metrics; omit unspecified loop bounds; use node order to break ties between multiple changes in one display batch. The live-update plural remains with the store job. Existing scene/edge exports retain their shapes.

The tool policy rejected cleanup of `apps/web/.workflow-cache`; that generated directory remains untracked.

Codex session ID: 01a19e30-94d8-7891-8c5d-d61f62329d4c
Resume in Codex: codex resume 01a19e30-94d8-7891-8c5d-d61f62329d4c
