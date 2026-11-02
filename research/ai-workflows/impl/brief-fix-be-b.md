# Fix round B: workflow semantics, estimator and eval gates (final review, 2026-11-03)

Two independent final reviews of the integrated backend reported defects. Both reports are in `research/ai-workflows/impl/review-input/` in this worktree:
- `rev-final-a.md`: Codex. Its findings are numbered #1 to #11;
- `rev-final-a-claude.md`: Claude. Its confirmed findings are C0 to C18, and the ones disputed on intent are D0 to D9.

Each finding gives an exact input.

**For every item you fix:**
1. Reproduce the bug first.
2. Add a regression test using the exact input from the report. It must fail before your fix and pass after.
3. In your final report, list each item ID with "fixed", "not reproduced" (say why), or "declined" (say why).

Another job (round A) is fixing the turn path at the same time, in `llm.ts`, `claude.ts`, the proposal files, the prompts, `apps/server` and `apps/worker`. Don't edit those files.

## The design decisions are already made (`research/ai-workflows/PLAN.md`)
- **Line 258:** `effect` belongs only on act, tool and memory steps.
- **Line 304:** only tool, knowledge, memory and agent steps may be attached.
- **Line 305:** attached nodes are **not part of the control flow**; they are reachable when their host is.
- **Line 307:** an attached tool whose effect needs approval carries `approval: 'required'`, which is approval at call time.
- An `edit` outcome is a person sending work back. It belongs on links out of a human approve step.

## Items

### 1. Effects on other kinds (Codex #2; Claude C6, C14), high
`effect` on ai, agent, guard, knowledge, decide, human, trigger or end steps escapes the approval check, though the diagram badge says approval is needed.

**Fix:**
- Validation drops `effect` from kinds that can't carry one, with a warning.
- Repair does the same for stored and streamed graphs.
- The approval check considers any node whose effect needs approval, as defence in depth.

### 2. Links out of or into attached nodes (Codex #3; Claude C5, C15), high
A link out of an attached node bypasses `wf-approval` and `wf-trifecta` with no warning.

**Fix:**
- Validation rejects a link whose `from` or `to` is attached.
- Ops stream in any order: a link can arrive before the step that sets `on`. So repair and check must also handle such links in the final graph: remove them with a warning, or report an error.
- Make `hasUngatedPath` and `reachedNodes` agree either way.

### 3. Edit outcomes out of non-human steps (Claude C17), medium
An `edit` outcome on a link from a non-human step exempts an automatic cycle from the loop-bound check. Restrict the exemption, and the outcome itself, to links out of human steps.

### 4. Repair stays within the caps (Codex #4), medium
Attachment repair can add edges beyond the 60-edge cap, which leaves a workflow that admission rejects. Repair must never exceed `DEFAULT_WORKFLOW_LIMITS`. When it can't add an edge, leave a warning instead.

### 5. Estimator (Claude C10, C11, D7)
- **C10:** agent request overrides must be capped at the step's `turns`.
- **C11:** an agent without a task row must be priced the way its assumption says.
- **D7:** a thinking step whose `outTokens` override is invalid must keep the ×3 thinking factor.
- **C9:** the share and loop drivers don't match the estimator's choice set. Edit-retry shares are ignored, retry passes can't be tuned, and branch and escalate splits accept only 100%. The UI half is being fixed in another job. Here, make the estimator's choice set explicit and exported: a pure function listing, for a workflow, which edges take a share and which take a loop count, with their valid ranges. The panel will import it. Document it in the function's header comment.

### 6. Eval gates (Codex #11; Claude C16, C18, D8, D9)
- **C16:** a required approve or takeover task must be satisfied only by a human step.
- **C18:** language-check workflow step labels and why text (`whyLang` reads only cloud ops). Use the same share threshold as the cloud check. Product and model names don't count as letters of the wrong language: strip catalog and model-table names before measuring.
- **D8:** `askLang` must fail when there are zero letters.
- **D9:** "products model-studio" and the voice-task inference must credit `ai` only on kinds that call a model (ai, agent, knowledge with a model).
- **Codex #11:** narrow the loop-gate claim to automated loops, since unbounded human revision is intended. Rename the assertion, and update the README.

After the eval changes, **re-score the stored runs offline**:
- `node eval/run.ts --rescore <dir>` for `eval/results/*workflow-tuned-2` and `*workflow-i18n-2`;
- the results are in `research/ai-workflows/impl/review-input/eval-results/` in this worktree, so copy them to a temp folder if rescore writes beside them.

Report how the pass rates move, and why.

### 7. The fixture sweep
Run all 32 fixtures in `packages/core/test/fixtures/workflows/` and the stored eval outputs through the new validator and checker. List every fixture or stored design whose warnings change, with the reason. Fix the fixtures only where the new rule shows the fixture itself was wrong under PLAN.

## Files you own
- `packages/core/src/`: `workflow-validate.ts`, `workflow.ts`, `workflow-estimate.ts`, `approval.ts`, and a new estimator choice-set export if you put it in its own file;
- their tests and fixtures under `packages/core/test/`;
- `eval/workflow.ts`, `eval/lib.ts`, `eval/check-cases.ts`, `eval/cases-workflow/README.md` and `eval/test/**`.
