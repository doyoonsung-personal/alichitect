# Phase 4 tuning, round 1: the workflow eval and prompt

The first live workflow eval ran on real qwen3.8-max: 43 cases, one run each. Its records and the judge outputs are in `research/ai-workflows/impl/eval-input/2026-11-02T15-39-14-workflow-baseline-1/`: `runs.jsonl` holds every turn's ops, workflow, assertions and judge notes, and `summary.md` holds the totals.

**Results:**
- 92% of the 726 checks pass, and the judge signs off 34 of 43 designs;
- but every case fails one group:
  - **all 43:** "workflow products model-studio" (an eval artifact);
  - **4:** "required checks clean", all `wf-reply-guard`;
  - **2:** "every approval-needing effect gated on every path";
  - **a few:** task and kind expectations;
  - **3:** mention regexes.

Also read the "Live workflow smoke tests" section of `research/ai-workflows/impl/eval-input/overnight.md`. It covers three earlier live turns and the model misses they showed.

## Part A: the eval's correctness
Fix only where the eval is wrong, not the model.

- **Model Studio:** a design uses Model Studio whenever any step has an `ai` model id. Infer it in `eval/workflow.ts` instead of requiring `product: 'model-studio'`.
- **Mention regexes:** the rule cases should also accept the model's natural wording, for example "unavailable", "closed to new customers" and "not offered".
- **Transcription:** a voice case's transcription requirement is met by any model-backed step whose model takes audio input (a realtime or omni model), not only `task: 'transcribe'`.
- **Other expectations:** review every failing expectation in `runs.jsonl` the same way. When the design was actually acceptable and the expectation over-specifies the topology, relax the expectation and say why in `eval/cases-workflow/README.md`.

## Part B: the prompt
Tune `packages/core/src/workflow-prompt.ts` so the model stops making the misses in the records and the smoke notes:
- **Hand-offs:** a hand-off to a person is a `human` step with task `takeover`, reached by an `escalate` link. It is not an `act` that notifies.
- **Replies:** every `reply` needs a guard step between untrusted input and the reply, and an `escalate` path to a human step.
- **Effects:** `effect` belongs only on act, tool and memory steps, never on a trigger.
- **Untrusted:** inbound channels (email, chat apps, uploads, web) are marked `untrusted`.
- **The customer's own systems** (order systems, CRMs, ERPs) are a `tool` or `act` with `runs: 'customer'` and the right effect. They are not a built-in web tool.
- **Approval:** sends, publishes and pull requests need approval as the D9 policy says. Look at the two cases that failed this.
- **Judge notes:** address whatever the judge's "no" sign-offs in `runs.jsonl` point to.

Prefer short, concrete wording and one extra example line over long rules. Keep:
- the prompt under 15,000 estimated tokens; update the budget band in `workflow-prompt.test.ts`;
- the worked example replaying cleanly;
- the prompt byte-stable, with no prices and no backend vendor names;
- the cloud prompt hash unchanged.

## Files you own
- `packages/core/src/workflow-prompt.ts` and `packages/core/test/workflow-prompt.test.ts`;
- `eval/workflow.ts`, `eval/cases-workflow/**` and `eval/test/workflow.test.ts`.

**Offline re-score:** re-score the stored records offline with the eval's rescore path (`node eval/run.ts --rescore <dir>`, or the equivalent). Report how many cases pass with the corrected assertions on the same model outputs. That separates eval fixes from prompt fixes. The prompt changes are measured by a new live run, which I will do.
