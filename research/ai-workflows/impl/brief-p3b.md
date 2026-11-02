# Phase 3b: browser state and persistence

Make the web app's state layer carry the workflow document and the turn mode. This is plumbing only; the canvas and visible UI are phase 5. The design is PLAN.md D1, D2 and section 4 ("Browser" and "Replay and eval" items, with file and line references). Phase 3a, the server side, is being built in parallel in another worktree, so build against the shared contract already in `packages/core/src/types.ts`:
- `TurnRequest.mode`, `Turn.mode` and `Warning.view`;
- the `SessionMemory` workflow fields.

The server will accept `mode` and return the workflow fields in the commit's memory. Use fakes for the server in tests.

## Files you own
- `apps/web/src/store/**`, `apps/web/src/stream/**` and `apps/web/src/replay/**`;
- `apps/web/src/app/controller.ts`, `contracts.ts` and `props.ts`;
- their tests.

Do not edit `canvas/`, `landing/`, `panel/`, `console/`, `shell/`, `export/`, `i18n/`, `styles/` or `App.tsx`, or anything outside `apps/web`.

## Build

1. **Session mode:** the session stores the active `mode` (`cloud` | `workflow`), defaulting to `cloud`.
   - **Requests:** the controller sends `mode` on every request (`controller.ts:178-182`).
   - **Turn start:** a turn captures the mode it started with, and its revision and retry keep it. Today a retry recovers only the ask (`controller.ts:218-221`).
   - **Switching:** expose an action to switch the active mode, which the phase 5 header toggle will call.
2. **Streaming:**
   - `TurnWork` holds a second raw document and its apply context;
   - `onOp` routes workflow ops (`step`, `link`, `each`, `splice`, `unstep`) to the workflow reducer (`applyWorkflowOp` in `@ali/core`);
   - stop, revert and restore relayout or reset the right document (`reducer.ts:260`, `677`).
3. **Commit and history** (`reducer.ts:574-637`):
   - the commit stores the workflow fields;
   - auto-fix dedupe keys on view, code and ids (`reducer.ts:196-205`);
   - change keys, provenance and revision cards carry the view (`changes.ts`), including historical hover;
   - a workflow turn never alters cloud provenance, and the reverse.
4. **Selectors:** they expose the active document, its node count for the header, and whether export is available (true when either document has content).
5. **Sessions** (`sessions.ts`):
   - `reviveSession` revives `mode` and the workflow fields, and accepts legacy records without them;
   - a large dual-document session fixture tests the localStorage quota path, which evicts the oldest sessions.
6. **Replay:** each replay turn takes an optional `mode` (`replay/plan.ts`, `player.ts`). Add one recorded workflow-mode replay fixture, built from a fake stream of the support-email sample (`packages/core/test/fixtures/workflows/support-email-triage.json`), and a mixed cloud-then-workflow session.

## Gates
- every existing web test passes unchanged;
- new tests cover:
  - the mode round trip through save and reload;
  - a workflow commit;
  - a revert across views;
  - a retry keeping its mode;
  - auto-fix dedupe by view;
  - the replay of the workflow fixture.
