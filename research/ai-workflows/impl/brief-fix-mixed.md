# Repair `wf-mixed-out` deterministically

A live workflow turn on 2026-11-03, with real qwen3.8-max, gave a triage step that mixed a parallel `next` link (to `embed-query`) with an exclusive `branch` link (to `done-rejected`). The prompt forbids this, but the model's intent was plainly an either-or choice. Today `checkWorkflow` only warns (`wf-mixed-out`).

**Add a deterministic repair to `repairWorkflow`.** When a node's out-links mix `next` links with alternatives (`branch`, `loop`, `escalate`, or any link with an outcome):
- convert each of those `next` links to `kind: 'branch'`;
- when it has no label, give it the label `otherwise`;
- emit `wf-mixed-out` with severity warn and `repaired: true`, naming the node and the links converted.

**Placement:** the repair must run before the cycle repair, and it must be idempotent. After it, `checkWorkflow` must no longer report `wf-mixed-out` for that node.

## Files you own
- `packages/core/src/workflow-validate.ts`;
- `packages/core/test/workflow-checks.test.ts`.

Keep the readability style of the current file.

## Tests
- the live case, written as a graph;
- a node that has only `next` links is unchanged;
- idempotence;
- the 32 sample fixtures still produce exactly their expected codes (`packages/core/test/workflow-samples.test.ts` passes unchanged).
