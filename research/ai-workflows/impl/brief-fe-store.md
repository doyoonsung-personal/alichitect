# Frontend fix job: store and requirements

## Items
Claude C0, C1, C2, C3, C4, C5, C6, C7, C39, C44 and D0 (in `rev-final-b-claude-store.md`), and Codex #1, #5 and #9.

- **C0 and C1:**
  - a workflow repair records its constraint findings, as the cloud branch does: call `checkWorkflowConstraints` directly, like the server;
  - `requirements.ts` resolves a workflow warning's ids through `memory.workflow.nodes[id].product` (or `.runs`) when the warning's view is workflow.
- **C2:** in a mixed session, a requirement's state comes from the newest revision that concerns it, not from the newest revision of either view.
- **C3:** gap lines from a workflow turn survive commit.
- **C4 and C5:** highlights, pans and build marks apply only to the view they came from.
- **C6:** switching views mid-turn never persists the in-flight revision.
- **C7 and Codex #5:** Tidy is saved.
- **C39:** workflow repairs are described in workflow terms, not as cloud "placement fixes applied by the catalog rules". Add `workflow.fix.*` keys.
- **C44 and Codex #9:**
  - throttle workflow streaming announcements, independently of rendering: at most one about every 2 s, plus always one at completion;
  - don't announce an identical text twice in a row.
- **D0 and Codex #1:** revival rejects a corrupt or mismatched persisted `workflowLayout` (non-finite geometry, or conflicting inline cells) and lays out from committed memory instead. The review disputed this on intent as low severity, but it is cheap and safe.

## Files you own
- `apps/web/src/store/**`;
- `apps/web/src/app/controller.ts` and `apps/web/src/app/props.ts`;
- `apps/web/src/console/logic.ts`, only for the workflow fix keys;
- `apps/web/src/workflow/props.ts`;
- `strings.json` keys `workflow.live.*` and `workflow.fix.*`;
- tests next to these files.

Don't edit `canvas/**`, `panel/**`, `workflow/settings.ts` or `workflow/panel-model.ts`.
