# Workflow evaluation cases

Run offline checks from the repository root:

```sh
node eval/check-cases.ts
node eval/run.ts --dry --cases-dir eval/cases-workflow
node --test eval/test/workflow.test.ts
```

The 32 `wf-<fixture-id>` cases preserve each canonical fixture's English ask. The
11 `wf-rule-*` cases cover product gates, inbound channels, the lethal trifecta,
reversible automation, and paired chat/email approval policies. References identify
the canonical source. Tests validate every source graph and score it against its case.

Expectations deliberately omit optional persistence, exact step counts, node IDs,
edge topology, and incidental runtime choices. Required kinds and tasks describe
capabilities requested by the user. All canonical cases require Model Studio;
WhatsApp also requires Chat App Message Service. A task can be implemented by an
AI step or an agent. Tier requirements are explicit only where the task warrants a
hard constraint (the small-model ticket classifier); other tier choices are judged.

`expect.workflow` accepts:

- `kinds`, `tasks`, `effects`: each listed value must occur.
- `tasksAny`: arrays of any-of task groups. Each group must match a step.
  `transcribe` also accepts a model with audio input; `speak` also accepts a model
  with audio output, including a single realtime step handling both capabilities.
- `tiers`: task to allowed tier array (`small`, `mid`, `large`). Every step of that
  task must name a model of an allowed tier, and the task must exist.
- `products`, `runtimes`: arrays of any-of groups, matched separately against
  `product` and `runs`. Any step with an `ai` id also uses Model Studio, without
  requiring a redundant `product`. Runtime groups can include `customer`.
- `forbiddenProducts`: checked against both service and runtime fields, including inferred Model Studio use.
- `forbiddenKinds`, `forbiddenTasks`: used to catch unnecessary approval.
- `approvals`, `boundedLoops`, `international`: default true.
- `noWarnings`: named workflow findings that must be absent in the final graph.

Approval and loop assertions rerun the production `checkWorkflow` on the repaired
workflow. Any `wf-approval` finding fails, including an informational waiver; cases
intentionally testing a waiver can disable `approvals`. Loops must have bounds and
exhausted exits, and agents must have numeric turn limits. International checks
reject unknown, China-only, restricted, legacy, retired and closed products. The
usual `noErrors` setting also checks fresh core findings and stored post-repair errors.

AgentRun's code runtime is available even though its low-code builder is gated.
Its rule case therefore requires a usable runtime and an explanation of the gate,
with product correctness also evaluated by the judge. It does not ban AgentRun.
Channel wording and product-subfeature distinctions are checked in narration and by
the judge, because the workflow contract has no dedicated connector/subfeature field.

Records store mode, before/after workflows, workflow settings and estimate inputs.
Older records without mode remain cloud records. Workflow bases use a `workflow`
graph beside the optional cloud `graph`, with optional `workflowSettings` and
`estimate`. Rescoring preserves the stored graph (no second repair), reruns the
checks, and retains `runs.orig.jsonl` as the original scoring source. Supply
`--cases-dir` when rescoring a directory whose metadata does not record it.

The workflow judge scores pattern choice, human approval, model tier fit,
international product correctness and clarity separately. Scores are retained under
`scores.workflow` and reported in summary JSON/Markdown. Compatibility fields map
pattern to completeness, product correctness to accuracy, the rounded mean of
approval/tier fit to rationality, and clarity to readability, so existing comparison
tools continue working. Cloud rubric text and parsing remain unchanged.

## Baseline tuning, round 1

Reviewed every failed assertion in the 43 stored baseline runs. Corrections are
capability checks, not repairs to those model outputs:

- Model Studio is implied by `ai` on any step. This fixes all 43 redundant-service
  failures; it does not infer a runtime or excuse an invalid model id.
- Voice understanding and speaking can share a realtime model. Audio input meets
  `transcribe` and audio output meets `speak`; omni/ASR with text output cannot
  satisfy speaking. This fixes the voice-support and phone task assertions without
  excusing their ingress, routing or guard defects.
- Code review accepts `check` or `review`: the baseline review agent explicitly
  reviews code and runs attached sandbox tests. A separate check task is unnecessary.
- KYC accepts `extract` or `check`: vision-based ID verification can consume the ID
  directly without a separate extraction step. This does not approve its low-risk
  decision path; that remains a prompt/judge concern.
- Enterprise search no longer requires an `end` kind: its terminal owner notification
  completes the requested work. The exact terminal-node topology was over-specified;
  retrieval and generation requirements remain.
- Availability wording accepts `unavailable`, `closed to new customers` and
  `not offered` in AgentBay, AgentRun low-code and hosted-KB explanations. These
  are literal mention alternatives (the shared matcher does not use regexes).
- The trifecta explanation accepts `guarded drafting`, `screen combined output`
  or `data leak` as well as the original safety terms. The baseline explicitly
  describes guarded drafting with private retrieval and final human approval;
  the independent private-data mention and `wf-trifecta` check remain.

Retained the missing human/takeover expectations for the policy chatbot: notifying
HR is not a hand-off. Retained all four `wf-reply-guard` failures (chat, Slack,
WhatsApp and phone), and both approval failures. Creating a PR before approval is
an ungated publish; using `send` with `approval: skip` for a live reply misstates
the effect policy. Judge sign-offs do not override those production checks.

Offline rescore of `2026-11-02T15-39-14-workflow-baseline-1` using the exported
`rescore` path: **36/43 cases pass (83.7%), 717/725 assertions pass (98.9%)**.
The seven remaining cases are the policy chatbot, four guarded-reply rule cases,
social listening and WhatsApp/LINE. There is one fewer assertion because enterprise
search no longer requires `end`. Rescoring used a temporary copy; all original
record fields other than assertions/pass were verified unchanged. The original
34/43 judge sign-offs were not rerun. This measures assertion fixes only; prompt
quality still needs a new live run.
