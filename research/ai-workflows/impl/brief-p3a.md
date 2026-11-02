# Phase 3a: the turn pipeline, core and server (read brief-common.md first)

Make `POST /api/turn` handle `mode: 'workflow'` end to end, on both the Node server and the Cloudflare Worker, while the cloud path stays byte-identical. The design is PLAN.md D1–D4, D7 (the backup voice), D8 and section 4. The section 4 checklist has file and line references that were checked against this code, and the checklist is your scope.

The shared contract already in `types.ts` (don't change its existing shapes):
- `TurnRequest.mode`, `Turn.mode`, `Warning.view`;
- `SessionMemory.workflow`, `workflowTombstones`, `workflowSettings` and `estimate`;
- `WorkflowEstimateSettings`.

You may add small types next to them if the pipeline needs them.

## Files you own
- `packages/core/src/llm.ts`, `prompt.ts`, `claude.ts`, `types.ts` (additive only);
- `apps/server/src/**` and `apps/worker/src/**`;
- new or changed tests under `packages/core/test/`, `apps/server/test/` and `apps/worker/test/`.

## Files you must not edit
- `packages/core/src/workflow-prompt.ts`: another job is writing it. Import its three functions and don't pin its output text in your tests.
- `workflow.ts`, `workflow-validate.ts`, `workflow-layout.ts`, `workflow-estimate.ts`;
- the catalog JSON files;
- anything in `apps/web`, `eval/` or `research/`.

## What to build

1. **Request parsing** (`apps/server/src/request.ts`; the Worker uses it or its own copy, so check):
   - `mode` is a closed set and defaults to `cloud`;
   - `turn()` keeps `mode`;
   - `memory()` validates and bounds `workflow` (shape plus the workflow caps 40/60/8), `workflowTombstones` (its own bounded parser, separate from the cloud tombstone parser at `request.ts:158-162`), `workflowSettings` and `estimate`.
   - Define the workflow caps once and advertise them in the health response.
   - Measure the UTF-8 byte size of a large dual-document request, with Korean and Chinese text, against the 512 KiB limit. If a committed session could exceed it, add the compaction PLAN.md section 3 describes.
2. **Prompts** (`prompt.ts`):
   - the system prompt cache maps a catalog to `{ cloud, workflow }`, and alternating builds return the right one;
   - in workflow mode, the messages use `buildWorkflowSystemPrompt(catalog, models)` and `workflowUserContent(memory, ask)`;
   - repair messages in workflow mode serialise the workflow with `serializeWorkflow` and list the workflow findings;
   - **cloud mode is untouched:** the cloud prompt keeps its sha256 (`998fab22…`).
3. **The turn engine** (`llm.ts`):
   - **Generalise `streamOps`:** its context creation, validate, apply and end-of-stream flush become parameters, so workflow mode uses `validateWorkflowOp`, `applyWorkflowOp` and `endWorkflowTurn`.
   - **Seeding:** the first attempt, the whole-turn rescue, the continuation and the repair fallback all seed from the document for the mode.
   - **Repair and commit:** they use `repairWorkflow` with `memory.workflowSettings`, a deterministic workflow diff for the change line, and workflow tombstones. The commit carries `workflow`, `workflowTombstones`, `workflowSettings` and `estimate` through.
   - **Findings:** every warning from a workflow turn gets `view: 'workflow'`, and the dedupe key includes the view.
   - **Follow-up calls:** errors or truncation trigger one, as today.
   - **Unchanged:** retries, fallback, the backup rescue and status mapping keep their behaviour.
4. **The backup voice** (`claude.ts`, PLAN.md D7):
   - thread a workflow variant of the backup voice note through the streaming backup and the completion caller;
   - the variant may name the Qwen models the design uses (the step models) but never itself or its vendor;
   - cloud mode keeps today's notes byte for byte.
5. **Server and Worker:**
   - the Worker's `sharedTurnState` builds both prompts and loads the model table by bundling `packages/core/catalog/models.json` with a JSON import, as it does the catalog;
   - `executeTurn` picks the prompt by mode;
   - quota stays at one unit per turn, two when the backup ran, in both modes;
   - the hidden-backend rules are unchanged: no provider, model or reason field on the wire in either mode.

## Tests and gates (all required)
- **Unchanged cloud behaviour:**
  - every existing test, replay fixture and recorded stream passes;
  - the cloud prompt hash is unchanged;
  - a request without `mode` behaves exactly as before.
- **Round trip:** a workflow turn from a fake model stream, then commit, then the committed memory sent back in a second request. The workflow survives, and the second turn's user message contains the first turn's steps.
- **Recovery paths:** a truncated workflow turn is continued, and a workflow turn rescued by the backup is committed.
- **Leak tests:** `apps/server/test/backup.test.ts` and `apps/worker/test/backup.test.ts` also walk the workflow ops and the committed workflow in memory, for the banned keys `provider`, `model`, `servedModel`, `fallbackModel`, `reason`, `rescue` and `backup`. Add a workflow-mode leak test.
- **Isolation:** a workflow turn never changes `memory.graph`, and a cloud turn never changes `memory.workflow`.
- **Size:** the request body test described above.
