Implemented. The real UI fixture check shows **5 / 3 / 2 fully visible columns** at **1150 / 920 / 800 px**, with 11 px titles.

Changed 12 owned files:
- Core: `workflow-layout.ts` and its test.
- Workflow: `camera.ts`, `layout-adapter.ts`, `scene.ts`, and their tests.
- Canvas: `WorkflowStage.tsx`, `WorkflowNodes.tsx`, `workflow.css`.
- Browser: `e2e-workflow.mjs`.

Decisions:
- Use 14 px wrapping titles: readable zoom floor **11/14**.
- Fit both dimensions, capped at **1.0**; retain manual zoom.
- Restore 168 px card width, size heights to content, and reserve vertical spacing for attachments.
- Ellipsize product/model text; expose full model text by tooltip.
- Follow the newest inline column while streaming; genuine user movement pauses follow.
- For raw core titles below 11 px, prioritize the natural-size cap. Rendered workflow titles avoid this conflict.
- Preserve existing exports and cloud geometry.

Validation:
- Root: **978/978 passed**.
- Web: **493/494 passed**; unrelated Chrome logo test timed out again in isolation.
- Worker: **274/274 passed**.
- Browser: **30/30 passed**.
- Core, web, Worker typechecks: **passed**.
- Cloud prompt SHA-256 matches the pinned value exactly.

No live model calls, deployments, or commits. The Chrome logo timeout remains unresolved.

Automatic approval review blocked deletion of generated `.workflow-cache/` and four `.workflow-*.png` screenshots with “blocked by policy”; these remain untracked.

Codex session ID: 01a19d0e-c0c8-7e90-b75b-82b6b3a7d0c7
Resume in Codex: codex resume 01a19d0e-c0c8-7e90-b75b-82b6b3a7d0c7
