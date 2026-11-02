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

The 20 `wf-ko-*` and `wf-zh-*` cases (category `i18n`) translate ten canonical asks into
Korean and Chinese (Qwen Flash drafts, checked by hand). They keep the structural
expectations and drop the English mention regexes; `lang` makes the runner check that
say and ask text come back in the ask's language.

Expectations deliberately omit optional persistence, exact step counts, node IDs,
edge topology, and incidental runtime choices. Required kinds and tasks describe
capabilities requested by the user. All canonical cases require Model Studio;
WhatsApp also requires Chat App Message Service. A task can be implemented by an
AI step or an agent. Tier requirements are explicit only where the task warrants a
hard constraint (the small-model ticket classifier); other tier choices are judged.

`expect.workflow` accepts:

- `kinds`, `tasks`, `effects`: each listed value must occur.
- `effectsAny`: arrays of any-of effect groups. Each group must match a declared
  effect; this does not change approval policy or infer effects from labels.
- `tasksAny`: arrays of any-of task groups. Each group must match a step.
  `transcribe` also accepts a model with audio input; `speak` also accepts a model
  with audio output, including a single realtime step handling both capabilities.
  `extract` also accepts an explicit `tool` step using `pdf_parse`.
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

## Final tuning, round 2

Reviewed failed assertions, graphs, emitted ops and judge defects in all three runs
of `2026-11-02T16-00-04-workflow-tuned-1` (43 cases, 129 conversations).
The production checker, shared matcher, cloud cases and judge outputs are unchanged.

### Prompt diagnosis

- Approval: KYC routes low/medium risk around a required gate; RFP assembly and
  document localisation create new content after review; PR creation/comments
  precede approval; helpdesk drafts a new outbound message after production approval.
  Other runs put `required` on an ungated teacher notification, model carrier
  transfer as `send`/`decide`, or invent an effectless `act` just to join memos
  (which conservatively counts as send). The prompt now shows approve/action/outcome
  ops, demands approval of final assembly on every path, and distinguishes joins,
  notifications and takeover from consequential actions.
- Takeover: all three policy-chatbot runs merely notify HR. Voice runs draw a
  carrier transfer action instead of the person. The prompt shows a human
  `takeover` step and an `escalate` link, explicitly distinguishing notification.
- Loops: helpdesk has an ordinary escalation rather than an exhausted outcome;
  RFP runs put a failure label on a branch without `outcome: exhausted`, including
  a repair that claims to add exhaustion but does not. Supply-chain approval
  returns to its agent over a loop without an exhausted exit. Paired link examples
  put `max` and `exhausted` on routes from the same deciding step.
- Voice: realtime audio is treated as implicit delivery, leaving a guard dangling
  or optional; some runs put `reply` on the agent, trigger or ingress media instead.
  The prompt shows a separate delivery act with `effect: reply` after the guard.
- Reply guards: phone lacks a guarded delivery path and human target; WhatsApp
  uses a branch to its human and puts a reply effect on its unguarded trigger.
  The prompt reinforces effect placement, mandatory on-path guards and `escalate`.
- Mentions: carrier details often appear only in assumptions/why; AgentBay is
  replaced without explaining its access gate. Explicit narration guidance now
  covers phone ingress, AgentBay access and the untrusted/private/outbound risk.

The four compact op patterns are replay-tested with their stated context, including
all six approval-needing effects. No additional full worked example was added.
The support-email worked example still replays without repairs. The prompt is
9,591 estimated tokens (test band 9,500–9,999), deterministic, price-free and free
of hidden-backend names. The cloud SHA-256 remains
`998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`.

### Every eval correction

- `wf-ecommerce-product-listing-enrichment`: remove the mandatory `translate`
  task. Generating directly for each language is equivalent to generating once
  then translating. Extraction, generation, approval and publishing remain;
  multilingual coverage is still a judge concern. Stored run 1 uses a language
  repeat group, although its English-only step label is misleading.
- `wf-ecommerce-shopping-assistant`: accept `write` or `pay` via `effectsAny`.
  Applying an approved coupon to a cart need not charge money. Run 1 has both the
  checkout approve outcome and `approval: required` on the write.
- `wf-invoice-three-way-match`: accept `write` or `pay` via `effectsAny`, since
  ERP posting can be a ledger write or a financial commitment. Run 2 explicitly
  gates its pay action. The canonical exact-match write remains exempt by default;
  no blanket approval requirement is added to routine writes or file storage.
- `eval/workflow.ts`: an explicit `tool` with `tool: pdf_parse` meets `extract`,
  fixing invoice run 1. Merely naming extraction in a label, setting `task: plan`,
  or putting `pdf_parse` on an agent does not establish a parser tool. The new
  `effectsAny` schema validates nonempty groups of allowed effects; approval
  findings are still computed from the unchanged production policy and graph.
- `wf-rule-knowledge-base`: remove mandatory `end`. Run 3 terminates at its
  delivery act, which is a valid outcome for this product-availability case.
  Retrieval, the alternative product and availability explanation remain required.
- `wf-rule-phone`: accept `customer carrier` and `customer-provided phone ingress`
  as equivalents of CCaaS/telephony/partner. All three mention failures disappear;
  all three conversations still fail their structural assertions.
- `wf-rule-slack`: accept `FC webhook ingress` and `webhook into Function Compute`
  instead of demanding the literal adjective `custom`. The independent webhook
  mention and guarded-reply checks remain. This fixes runs 2 and 3.
- `wf-rule-trifecta`: accept `screens it with a guard`, `screens output via
  guardrails` and `screens for leaks`. All three runs describe screening the
  combined private/public report before human approval. The independent private
  data mention and `wf-trifecta` check remain; screening is not proof of safety.

No approval, loop, human/takeover, reply-effect or reply-guard assertion is waived.
AgentBay's two failures remain: “not in the catalog” or “excluded per platform
rules” does not explain gated access. Conservatively retained enterprise search
run 2's missing generation task and supply-chain run 2's missing extraction task:
the former only declares retrieval, and the latter puts `pdf_parse` on an agent
without declaring a parser tool. Neither is treated as implicit capability from
prose alone. Other warnings and judge defects are not repaired during rescoring.

### Offline rescore (eval changes only)

Used the exported `rescore` function with `loadCases('eval/cases-workflow')` and
`loadCatalog()` on a temporary copy of the stored `runs.jsonl`. It retains the
original as `runs.orig.jsonl` and scores the final stored graphs without repair.
Deep comparison verified every field except assertions/pass unchanged, and the
source file byte-identical to the original scoring copy. Temporary files were
removed; no live model or judge calls were made.

| Measure | Before | After |
| --- | ---: | ---: |
| Passing conversations / pass@1 (mean case pass rate) | 93/129 (72.1%) | 103/129 (79.8%) |
| pass@3 (at least one passing run) | 38/43 (88.4%) | 39/43 (90.7%) |
| All three runs pass | 22/43 (51.2%) | 28/43 (65.1%) |
| Passing assertions | 2,123/2,175 (97.6%) | 2,130/2,169 (98.2%) |
| Failed assertions | 52 | 39 |

Six checks disappear because translate and end each occurred in three runs.
Ten conversations newly pass: listing #1, shopping #1, invoice #1/#2,
Slack #2/#3, trifecta #1/#2/#3 and hosted-KB #3. No passing conversation regresses.
These numbers measure eval corrections only; prompt improvement remains unmeasured
without another live run. The 43 stored judge results are unchanged.

Validation: focused tests 41/41; root suite 981/981; worker suite 274/274;
web suite 488/489. The existing `the logos render in Chrome` test timed out
waiting 30 seconds and failed identically in an isolated rerun (0/1). No web
files were changed. Core, web and worker TypeScript checks all passed.
Used `npm.cmd` because PowerShell blocks `npm.ps1`; each full suite ran once.
No commits, external calls or deployments were made. The remaining verification
limits are the Chrome test timeout and the deliberately unmeasured live effect
of the prompt changes.
