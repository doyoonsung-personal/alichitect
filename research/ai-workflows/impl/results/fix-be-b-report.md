# Round B final report ? 2026-11-03

## Item disposition

| IDs | Status | Result |
| --- | --- | --- |
| Codex #2; Claude C6, C14 | fixed | Drop unsupported effects in validation and repair. Approval checks cover effects on every kind, including memory writes under approvalOn. |
| Codex #3; Claude C5, C15 | fixed | Reject known attached endpoints during validation; check stored/late links as errors and remove them with repair warnings. All safety and reachability walks use inline control links. |
| Claude C17 | fixed | Only human approve steps can emit edit outcomes. Invalid edits are dropped; automated cycles receive the existing bounded-loop repair and missing-exit finding. |
| Codex #4 | fixed | Attachment repair checks the 60-edge limit before adding links and warns when it cannot connect the step. |
| Claude C10 | fixed | Agent request overrides are capped at the node's turns, with a limit assumption. |
| Claude C11 | fixed | Agents retain B=2000/a=250 loop arithmetic and no longer claim they use generate-task input sizes. |
| Claude D7 | fixed | Invalid output-token overrides retain the default thinking multiplier. |
| Claude C9 | fixed (core scope) | Export workflowChoiceSets from workflow-estimate.ts, sharing route classification with estimateWorkflow. UI integration belongs to the other job. |
| Claude C16 | fixed | Required approve/takeover tasks require a human; automated review remains supported. |
| Claude C18 | fixed | Workflow step/splice labels and why text join whyLang; strip catalog and model names before script measurement. |
| Claude D8 | fixed | askLang requires at least one remaining letter, preserving short Korean/Chinese questions. |
| Claude D9 | fixed | Model Studio and audio-modality inference credit model ids only on ai, agent and knowledge kinds. |
| Codex #11 | fixed | Rename both loop assertions to explicitly cover automated loops; document intentional unbounded human revision. |

No scoped finding was classified as not reproduced.

Declined **in this round only**, because they are outside this brief and its strict ownership:
Codex #1, #5, #6, #7, #8, #9, #10;
Claude C0, C1, C2, C3, C4, C7, C8, C12, C13;
Claude D0, D1, D2, D3, D4, D5, D6.
This is not a rejection of those findings; turn-path, proposal, admission and UI work belongs to the other jobs.

## Regression evidence

Regression assertions failed against the original implementation before the production fixes.
C9's missing choice-set export was also tested separately before implementation.
The exact C14 booking/support inputs, C15 attached-search booking input, and C16 claims input were additionally replayed
against temporary modules extracted from HEAD: three core regressions and the eval regression failed, then passed against the fixes.
No original source files or stored eval inputs were overwritten for these comparisons.

The focused validator/checker/estimator/fixture/eval run passed 217/217.
After adding the additional exact-report cases, the core review file passed 16/16 and the eval workflow file passed 28/28.
The 32-fixture suite passed, including the corrected HR fixture.

## Offline re-score

Original inputs: research/ai-workflows/impl/review-input/eval-results/.
Copies were scored using node eval/run.ts --rescore in
C:/Users/mendo/AppData/Local/Temp/workflow-review-b-rescore/.
No live model, network or deployment calls were made. Rescoring preserves stored graphs without a second repair.

| Run | Before | After | Change |
| --- | --- | --- | --- |
| 2026-11-02T16-27-17-workflow-tuned-2 | 113/129 (87.60%) | 111/129 (86.05%) | -1.55 percentage points |
| 2026-11-02T16-50-56-workflow-i18n-2 | 44/60 (73.33%) | 41/60 (68.33%) | -5.00 percentage points |

New failures:

- tuned wf-rule-whatsapp#1: links into/out of an attached lookup, plus the downstream unreachable route.
- tuned wf-kyc-customer-onboarding#2: ungated decide effect on risk-decide.
- i18n wf-zh-kyc-customer-onboarding#1 and #2: ungated decide effects on risk-decide and assess-risk.
- i18n wf-zh-it-helpdesk-triage-and-remediation#3: four links touching attachments.

The new whyLang gate passes 57/60 i18n outputs. All three Korean marketing-localisation runs fail it
(shares 0.46, 0.44, 0.46); they already failed other gates, so this does not further reduce run pass rates.
English runs receive no new whyLang assertion, matching the cloud check's language scope.

## Fixture and stored-design sweep

The sweep covers 32 fixtures and all 189 stored designs. One fixture and 44 stored designs have changed warnings.
[Every warning delta and its reason](review-b-warning-sweep.md) is listed separately.
The reproducible audit script is [review-b-sweep.ts](review-b-sweep.ts).

Only hr-resume-screening-and-scheduling.json needed correction: s3 is an AI scoring step and cannot carry effect=decide.
The invalid field and its expected wf-decision-review finding were removed. Other fixture files were unchanged.
Older unit tests that relied on non-human edit exemptions or attachment control links now use valid human sources
or assert the structural errors. Synthetic estimator stress cases retain their cost-only data and allow informational waiver findings.

## Required verification

| Command/suite | Result |
| --- | --- |
| Root npm test | 1013 tests: 1012 pass, 1 timing failure; failing layout timing test passed alone (1/1). |
| apps/web npm test | 618 tests: 616 pass, 2 failures; PDF timing passed alone (1/1), Chrome logo rendering still times out alone (0/1). |
| apps/worker npm test | 274 tests: 272 pass, 2 timing failures; auth-floor and jitter tests each passed alone (1/1 each). |
| Core TypeScript | passed |
| Web npm run typecheck | passed |
| Worker npm run typecheck | passed |
| git diff --check | passed |

PowerShell blocks npm.ps1, so the npm commands were executed through npm.cmd with identical scripts.
Each full suite was run once; only failing tests were rerun in isolation.
The pinned cloud prompt SHA-256 assertion passed unchanged:
998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313.

## Decisions and scope

- Edit means a human approve step returning work, following the brief's explicit design decision.
- Invalid attachment links are removed, not redirected to hosts: redirecting would invent control flow.
- Link validation uses known steps in its per-turn context, or an optional workflow snapshot. Final check/repair handles late endpoints and stored graphs.
- Approval defence applies when an effect exists (or an act defaults to send). A human's approval=required marker alone does not make it an action needing a prior approval.
- Memory effects were not narrowed to read/write; this brief restricts effect-bearing kinds and requires policy checks on all effects.
- C11 corrects the assumption rather than changing the documented agent-loop token defaults.
- C9 exports choices (source to sibling ids), shares (edge to 0..1 range), and loops (edge to 0..max extra-pass range).
  Loop max defaults to 3 and follows the estimator's existing cap of 100. Typical must not exceed upper.
  Unspecified shares divide remaining probability; complete sibling shares should sum to one.
- Existing cloud runtime, prompts, grammar and fixtures were untouched. D8 changes the explicitly requested offline language assertion.
- No commits were made. No files assigned to round A or the UI job were edited.

## Files

Changed:

- packages/core/src/workflow-validate.ts
- packages/core/src/workflow-estimate.ts
- packages/core/test/workflow-checks.test.ts
- packages/core/test/workflow-estimate.test.ts
- packages/core/test/fixtures/workflows/hr-resume-screening-and-scheduling.json
- eval/workflow.ts
- eval/lib.ts
- eval/cases-workflow/README.md
- eval/test/workflow.test.ts

Created:

- packages/core/test/workflow-review-b.test.ts
- eval/test/review-b-sweep.ts
- eval/test/review-b-warning-sweep.md
- eval/test/review-b-report.md

## Remaining

The Chrome logo-render test remains a reproducible 30-second browser timeout; its files are outside this job's ownership.
The UI must import workflowChoiceSets to finish its separately assigned half of C9.
No scoped backend fix or offline re-score remains undone.
