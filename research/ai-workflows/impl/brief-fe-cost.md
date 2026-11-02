# Frontend fix job: cost panel and estimate settings

## Items
Claude C18 to C29, C31 to C36, C41, C43 and C47 (in `rev-final-b-claude-cost.md`); Codex #2, #3, #4 and #7; and three items carried over from the backend review: C7, the UI half of C9, and C12.

- **Driver choices (C19, C20, C26, C32, C47, backend C9):**
  - `packages/core/src/workflow-estimate.ts` now exports `workflowChoiceSets`, which lists the edges that take a share and the edges that take a loop count, with their valid ranges, as the estimator uses them. Read its header comment.
  - Build the share and loop drivers, and the share validation, from it.
  - Name drivers and assumptions by edge label, or by "from → to" step labels, never by raw edge id.
- **Limits (C27, Codex #3, backend C7):** validate edits with `ESTIMATE_LIMITS` (`packages/core/src/workflow-estimate-limits.ts`) and the estimator's own caps. Reject out-of-range values with a visible error, and set the input's min and max.
- **Editing:**
  - **C18 and C43:** Escape in a driver field restores the previous value and doesn't save. It must not collapse the panel: stop propagation.
  - **C21:** an unparseable number shows an error. It doesn't delete the override.
  - **C29 and Codex #2:** "Use default" clears the draft and the error state.
- **Formatting (C22, Codex #4):** a per-run formatter that keeps meaningful sub-cent precision (about 3 significant figures), never exponent notation, with grouping for large values. Keep the monthly formatting separate.
- **Raw internal text (C23, C28, C33, C34, C35, Codex #7):**
  - map unit codes (`mtok`, `reviewer hour` and the rest) to localized labels;
  - hide internal research references from users: a source like "NOTES Adjudicate-3" becomes a short customer-facing label, or nothing;
  - map unknown unpriced reasons and limit assumptions to localized text;
  - add keys under `workflow.cost.*`.
- **Assumption text:**
  - **C24:** token-count parsing must not break on a label that contains a colon followed by a digit. Use structured fields, not regexes on text, if the estimator provides them.
  - **C25, C31 and backend C12:** no doubled period.
- **C36:** show the global-scope note once.
- **C41:** use localized punctuation for label–value pairs, such as the full-width colon in zh.

## Files you own
- `apps/web/src/panel/WorkflowCost.tsx`, `WorkflowPanel.tsx` (only where the cost section needs it) and `apps/web/src/panel/workflow.css`;
- `apps/web/src/workflow/panel-model.ts` and `settings.ts`;
- `strings.json` keys `workflow.cost.*`;
- tests next to these files.

Don't edit core files. If the estimator lacks a structured field you need, say so in your report instead.
