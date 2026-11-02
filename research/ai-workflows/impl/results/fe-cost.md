Implemented all assigned cost fixes. Changes are uncommitted. Two unrelated tests still fail in isolation.

| IDs | Status |
|---|---|
| C18, C43 | fixed — Escape cancels edits without saving or collapsing |
| C19, C20, C26, C32, C47; backend C9 UI | fixed — estimator choice sets and readable path names |
| C21 | fixed — malformed numbers preserve overrides and show errors |
| C22; Codex #4 | fixed — precise per-run formatting, separate monthly formatting |
| C23, C28, C33, C34, C35; Codex #7 | fixed — localized units, reasons and assumptions; hidden internal citations |
| C24 | fixed — token parsing skips the complete step label |
| C25, C31; backend C12 | fixed — no doubled punctuation |
| C27; Codex #3; backend C7 | fixed — validated limits and matching input bounds |
| C29; Codex #2 | fixed — reset clears draft and error |
| C36 | fixed — global note appears once |
| C41 | fixed — localized punctuation in the owned cost section |

Changed files:

- [WorkflowCost.tsx](C:/Users/mendo/ali_wt/fe-cost/apps/web/src/panel/WorkflowCost.tsx)
- [panel-model.ts](C:/Users/mendo/ali_wt/fe-cost/apps/web/src/workflow/panel-model.ts)
- [settings.ts](C:/Users/mendo/ali_wt/fe-cost/apps/web/src/workflow/settings.ts)
- [strings.json](C:/Users/mendo/ali_wt/fe-cost/apps/web/src/i18n/strings.json) — only `workflow.cost.*`
- Added [cost-regressions.test.ts](C:/Users/mendo/ali_wt/fe-cost/apps/web/src/workflow/cost-regressions.test.ts)
- Added [e2e-workflow-cost.mjs](C:/Users/mendo/ali_wt/fe-cost/apps/web/scripts/e2e-workflow-cost.mjs)

Validation:

| Check | Result |
|---|---|
| Root suite | 1,087/1,087 passed |
| Web full suite | 626/629 passed |
| Worker full suite | 274/276 passed |
| Final cost + localization tests | 19/19 passed |
| Headless Chrome cost cases | 24/24 passed |
| Core, web, worker typechecks | All passed |
| Cloud prompt hash | Matches required hash |
| `git diff --check` | Passed |

The web localization failure was fixed and verified. PDF timing and worker jitter failures passed isolated reruns. **Chrome logo rendering still times out, and the worker authentication timing-floor test still fails.** Both are outside the owned files and remain unchanged.

Implementation decisions and limitations:

- Core assumptions expose only `{key, text}`. C24 therefore uses label-aware parsing; structured numeric fields remain unavailable.
- Private estimator caps are mirrored locally; exported admission limits and choice ranges are imported. Core files were untouched.
- Clean-field Escape still closes the panel; pending-edit Escape cancels first.
- Complete sibling shares must still total 100%. Unknown units/reasons receive localized fallback text; only HTTPS price sources are displayed.
- Used `npm.cmd` because PowerShell blocked `npm.ps1`. Also ran neighboring regression tests and isolated failing checks.
- No external network calls, model calls, deployments, or commits.

Codex session ID: 01a19e30-aed5-78e0-902e-949b38af0843
Resume in Codex: codex resume 01a19e30-aed5-78e0-902e-949b38af0843
