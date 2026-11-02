# Phase 7a: proposals for workflow designs (core, drafting and export text)

A workflow-only session, or a mixed one, should draft and export a proposal that explains each step for business readers. The design is PLAN.md D7 and section 10. The estimator (`workflow-estimate.ts`) and the prompt (phase 4a) are merged. The turn pipeline (phase 3a, which owns `apps/server`, `apps/worker`, `claude.ts`, `llm.ts` and `prompt.ts`) is being built in parallel, so don't edit those. The PDF diagram slot and the PDF table layout are phase 7b, not this job.

## Files you own
- `packages/core/src/proposal.ts` and `proposal-prompt.ts`;
- `packages/core/src/types.ts`, proposal types only;
- `apps/web/src/export/draft-flow.ts`, `draft-client.ts`, `ExportButton.tsx`, `model.ts` and `strings.json` / `strings.ts`;
- their tests.

Do not edit `pdf.ts`, `svg.ts`, `diagram.ts`, `generate.ts`, `claude.ts`, `llm.ts` or `prompt.ts`, or anything under `apps/web/src` outside `export/`.

## Build (PLAN.md section 10)

1. **Step sections:** a new `ProposalSection` kind `{ k: 'step', id, text }`, and a `steps` map in `ProposalDraft` keyed by workflow node id. It covers:
   - the union;
   - sanitising and the gate;
   - missing-section detection;
   - assembly;
   - the prompt instructions;
   - the draft client and draft flow.

   A workflow-only draft is complete when it has its exec, needs and a step section for every inline step that is not a trigger or end. Relax `proposal.ts:718` accordingly; the cloud rules are unchanged for cloud designs.
2. **Products:** both `designProducts` implementations take the union of cloud and workflow products, including `runs`:
   - core, `proposal-prompt.ts:85`;
   - browser, `draft-flow.ts:180-181`.
3. **Lint:**
   - the exact model ids the workflow uses (`ai` fields) are allowed in the narrative, added to the lint context next to the product names (`proposal.ts:89-104`);
   - rule 6 also allows product and model names in step sections;
   - jargon rules are relaxed in step sections only (RAG, API, webhook).
4. **Leak rules:** narrow `PROPOSAL_SYSTEM` rule 8. The `HIDDEN` pattern in the server and Worker proposal tests (`apps/server/test/proposal.test.ts:27`, `apps/worker/test/proposal.test.ts:20`) is outside your files: list the exact change those tests need in your report, and I will apply it:
   - a model named by a step may appear;
   - the writer still never says who wrote the text;
   - the vendor names of the hidden backend never appear.
5. **Generated, not drafted.** The export model builds these from data and never asks the writer for them:
   - the cost table, from `estimateWorkflow`: typical and upper per run and per month, plus the coverage line and the unpriced items;
   - the step-to-runtime table, from `runs` and `product`;
   - the open questions, from the session assumptions plus the data-boundary questions in PLAN.md section 10.

   Add them to the export model (`model.ts`) as data the PDF can render. 7b does the PDF layout.
6. **Export availability:** `ExportButton` is enabled when either document has content.

## Gates
- all existing proposal tests (core, server, Worker, web) pass, with the leak tests narrowed as described;
- new tests cover:
  - a workflow-only draft completing;
  - step sections assembling;
  - model names allowed in steps but not as the writer's self-reference;
  - the cost, mapping and open-question data in the export model.
