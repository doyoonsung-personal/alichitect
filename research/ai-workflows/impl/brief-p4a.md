# Phase 4a: the workflow system prompt (read brief-common.md first)

Replace the stub bodies in `packages/core/src/workflow-prompt.ts`. Keep the three exported signatures exactly as they are; phase 3a builds on them. The source is PLAN.md section 8 (budget, rules 1–14, worked example), D9 and D10, and section 3 (the contract and its semantics).

**Files you own:**
- `packages/core/src/workflow-prompt.ts`;
- create `packages/core/test/workflow-prompt.test.ts`.

## `buildWorkflowSystemPrompt(catalog, models)`

It must be byte-stable: no dates, counters or random parts. In order:

1. **Role and output contract.**
   - One JSON op per line: the workflow ops `step`, `link`, `each`, `splice`, `unstep`, plus `say`, `assume`, `ask`, `req`, `gap` and `done`. Never cloud ops.
   - The exact op shapes and field meanings from `types.ts` / PLAN.md section 3.
   - The ids rule: unique across steps, links and groups; never reuse a link id for a different link.
2. **The semantics, briefly:**
   - parallel `next` versus exclusive `branch`, and `join`;
   - repeat groups;
   - loops with `max` and an `exhausted` route;
   - human approve outcomes, where an edit goes back and is approved again;
   - inline versus attached nodes.
3. **The rules from PLAN.md section 8**, numbered. The approval rule must come from `approvalRuleText()` in `approval.ts`, not be retyped. Also include:
   - never write prices or cost figures;
   - never name the model that writes the reply.
4. **The model table:** `models.promptRows()`, with no prices.
5. **A catalog subset:**
   - **Which rows:** the rows the workflow needs, about 80, chosen by a fixed, documented rule. For example: entries whose lane is `ai`, `integration`, `storage`, `search`, `database` or `analytics`, plus a named list of runtime and messaging ids (`fc`, `agentrun`, `agentcore`, `cloudflow`, `eventbridge`, `direct-mail`, `chatapp`, `tablestore`, `dashvector`, `milvus`, `ai-guardrails`, `agent-sandbox`, `agentloop`, `sls`, `dify-on-ack` and so on).
   - **Format:** the same row format as `catalog.promptRows()`. Only recommendable entries, and none that are China-only, retired or no-new-purchases.
6. **One worked example: the support-email workflow** (PLAN.md section 8, worked example), as ops.

**Budget:** under 15,000 estimated tokens (`estimateTokens` from `catalog.ts`). The test asserts the measured size inside a band, like `prompt.test.ts` does for the cloud prompt.

## `serializeWorkflow(wf)`

A compact text form, one line per step and link, readable by the model, in id order. Look at how `prompt.ts` `serializeDiagram` does it. Include the fields the model needs to edit the workflow: kind, task, effect, ai, tool, product, runs, on, repeat, approval, max, outcome.

## `workflowUserContent(memory, ask)`

The newest user message in workflow mode, in this order:
1. pinned requirements (reuse `formatRequirements` from `prompt.ts`);
2. the session settings (`memory.workflowSettings`, default region `ap-southeast-1`);
3. the current workflow;
4. removed elements from `memory.workflowTombstones`, at most 30;
5. the current assumptions and questions (reuse `formatAssumptions` and `formatQuestions`);
6. one line noting that a cloud deployment diagram exists, if `memory.graph` has nodes;
7. the user's message.

## Tests
- byte stability (built twice, identical);
- the budget band;
- the prompt contains the approval text, the op names and each rule's key phrase, and no prices or dollar signs;
- **the worked example replays cleanly:** extract the example's op lines from the prompt, run them through `validateWorkflowOp` and `applyWorkflowOp`, then `repairWorkflow`. There must be no warning of severity warn or error, and no `wf-unknown-ref`;
- `serializeWorkflow` is deterministic, independent of key order;
- `workflowUserContent` puts the sections in order and handles an empty workflow;
- **no cloud ops in the example,** and no vendor names of the hidden backend (claude, anthropic) anywhere in the prompt.
