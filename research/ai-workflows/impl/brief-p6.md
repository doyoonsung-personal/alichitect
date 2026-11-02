# Phase 6: the cost estimate (read brief-common.md first)

Build `estimateWorkflow`, the app's own arithmetic: PLAN.md D6 and section 9, which define the inputs, the defaults, the agent formula, the fees, the discounts, how steps combine, and the output.

**Files you own:**
- create `packages/core/src/workflow-estimate.ts`;
- create `packages/core/test/workflow-estimate.test.ts`.

## API

`estimateWorkflow(wf: WorkflowGraph, models: ModelTable, catalog: Catalog, settings?: WorkflowEstimateSettings): WorkflowEstimate`

`WorkflowEstimateSettings` is already in `types.ts`. Define and export `WorkflowEstimate` in your file:
- **Scenarios:** `typical` and `upper`, each `{ perRunUsd, monthlyUsd }`.
- **Inputs:** `runsPerMonth`, `oneRun` (the step ids on the main path, so the panel can say what one run means), and `scope`.
- **Lines:** one per priced item, as `{ id, label, kind: 'model' | 'tool' | 'guardrails' | 'platform', unit, typical, upper, source }`.
- **Unpriced:** `{ id, label, unit, why }` for items with no firm price: time-based compute, Tablestore, Agent Sandbox, AgentCore compute, indexing, human review.
- **Fixed:** monthly items, for example the AgentCore control plane at $0.60 an hour, listed apart and never divided per run.
- **Assumptions:** `{ key, text }` for every default used.
- **Coverage:** one line saying what is priced and what isn't.

## Rules

- **Model prices:**
  - from `models.json`, picking the tier by input tokens (`upTo`);
  - thinking output uses `thinkingOut` when present;
  - a model without a price, or a model missing from the table, becomes an unpriced line, never zero.
- **Default tokens per task:** the PLAN.md section 9 table, labelled as assumptions.
- **Agent loops:**
  - sum the input per request: B + S + (i−1)(c + r), for i = 1..N;
  - output is (N−1)·c + a;
  - N includes the final answer request;
  - typical N is half the agent's `turns` (rounded up), upper N is `turns`;
  - per-agent overrides come from `settings.agents`;
  - defaults: B = 2,000; S = 150 per attached tool; c = 150; r = 800; a = 250.
  - Unit test: N = 10, one tool, r = 16,000 gives 748,250 input tokens; r = 800 gives 64,250.
- **Tool fees:**
  - per call, from the `models.json` tools (`fee.usd / fee.per`);
  - an agent with an attached `web_search` tool makes one search per request unless a setting says otherwise;
  - `pdf_parse` is per page, with an assumed 5 pages per run;
  - a free-for-now tool costs $0 and says so.
- **AI Guardrails:** $6 per 10,000 calls × enabled types (default 2) × guard steps passed.
- **Platform fees counted from the graph:**
  - CloudFlow, when a step `runs` on `cloudflow`: one transition per step passed, $0.25 per 10,000 (reference);
  - EventBridge: one $0.82-per-1M event per trigger whose product is `eventbridge`;
  - Direct Mail: one message per `send` on `direct-mail`, at $0.29 per 1,000;
  - Chat App Message Service: one message per reply or send on `chatapp`, at $0.005.
  - Put these constants in one table with their `verify/NOTES.md` sources.
- **Combining steps:**
  - parallel `next` links add up;
  - exclusive `branch` links: typical weights by `settings.shares`, or an equal split; upper takes the most expensive branch;
  - repeat groups multiply by items (typical 3, upper 10, or the settings);
  - loops multiply the steps on the cycle by iterations (typical 1 extra pass, upper `max`);
  - human steps cost nothing.
- **Cache:** implicit cache-hit price on the static prefix, at 50% hits typical and 0% upper, only where the prefix is at least 1,024 tokens.
- **Batch:** only for offline steps whose model has `batch === true`. Batch and cache don't stack.
- **Scope:** if `settings.scope` is `global`, keep the International prices and add an assumption saying Global is usually lower.
- **No numeric latency.** Return `{ modelStepsOnLongestPath, humanWaits }` instead, where `humanWaits` lists the human step labels.

## Tests
- every rule above;
- each of the 32 fixtures in `packages/core/test/fixtures/workflows/` produces a finite, non-negative estimate, with `upper >= typical` and no NaN;
- two fixtures checked against a hand calculation in the test, written out in comments.
