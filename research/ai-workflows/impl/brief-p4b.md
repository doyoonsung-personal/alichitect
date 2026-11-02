# Phase 4b: the evaluation harness for workflow mode

Extend `eval/` so workflow-mode turns can be run, scored, judged and rescored. The design is PLAN.md section 11. The pipeline (phase 3a), the workflow prompt (phase 4a), the validator and checks (phase 1) and the estimator (phase 6) are merged.

## Files you own
- `eval/**`, except `eval/results/**`. You may add `eval/cases-workflow/`.
- `eval/test/**`.

Do not edit `packages/`, `apps/` or `research/`.

## Build

1. **Records and runner** (`eval/records.ts`, `lib.ts`, `run.ts`):
   - a case can say `mode: 'workflow'`;
   - the runner sends it;
   - the records store the mode and the workflow before and after each turn;
   - the base loading, the rescore path and the summary handle both modes;
   - the existing cloud cases and stored results keep working unchanged.
2. **`Expect.workflow` assertions:**
   - required step kinds and tasks;
   - a model tier per task (from `models.json` tiers);
   - required products and runtimes;
   - **every approval-needing effect gated on every path.** Reuse `checkWorkflow` from `@ali/core` and assert that it raises no `wf-approval` warning;
   - loops bounded (no `wf-loop-exit` or `wf-cycle`);
   - forbidden products (China-only, legacy, gated);
   - no error-severity finding after repair.
3. **Cases:** `eval/cases-workflow/*.json`, built from the 32 canonical fixtures in `packages/core/test/fixtures/workflows/`.
   - Each fixture's `ask` becomes a one-turn case. Its expectations come from the fixture's graph: kinds, the products a correct answer must use, and gated effects.
   - Keep the expectations to what any correct design must have, not this fixture's exact shape.
   - Add the rule-testing cases PLAN.md section 11 lists:
     - each gated product (the knowledge base for a new account, AgentBay, low-code AgentRun);
     - each inbound channel (email via webhook, WhatsApp, Slack via custom webhook, a phone line);
     - a lethal-trifecta setup;
     - "just automate it" for internal reversible actions;
     - a chat agent whose `reply` needs no approval, next to an email agent whose `send` does.
   - English only for now.
4. **The judge:** a workflow rubric beside the cloud one (`eval/judge.ts`). It scores:
   - pattern choice (workflow versus agent);
   - where humans approve;
   - model tier fit;
   - product correctness for international customers;
   - clarity.
5. **Dry run:** `node eval/run.ts --dry --cases-dir eval/cases-workflow` lists the cases without network calls. Make sure it works. Do not run live: no network calls.

## Gates
- `eval/test` passes, with new tests for the workflow assertions (pass and fail on hand-built graphs) and for rescoring a stored workflow record;
- `node eval/check-cases.ts`, or its equivalent, validates the new cases.
