Fixed all four findings in:

- [workflow-estimate.ts](C:/Users/mendo/ali_wt/fix-p6/packages/core/src/workflow-estimate.ts)
- [workflow-estimate.test.ts](C:/Users/mendo/ali_wt/fix-p6/packages/core/test/workflow-estimate.test.ts)

Retry-only steps are priced, overlapping retries use additive per-link budgets, and parallel choices use bounded decision diagrams. **I checked that the exact-input regressions fail on the old code and pass on the new code.**

The 40-step/60-link benchmark’s worst observed runtime was **16.169 ms**, using 20-run batches under a **128 MiB heap limit**. Both reviewed fixture subtotals now match the expected values.

Decisions made:

- Cap requests at 50, token settings at 1,000,000, items at 10,000, iterations at 100 and each link’s maximum, monthly volume at 1 billion, and searches/detection types at 100.
- Limit each scenario to 8,192 diagram nodes and 131,072 operations; exceeding either produces a labelled conservative fallback.
- Saturate unsafe arithmetic at `Number.MAX_SAFE_INTEGER`, with a diagnostic.

Validation:

| Check | Result |
|---|---|
| Estimator | 75/75 passed |
| Root suite | 923/923 passed |
| Web suite | 437/438 passed |
| Worker suite | 268/270 passed; both timing failures passed isolated reruns |
| Core, web, worker typechecks | All passed |

The web Chrome logo-render test still timed out on its isolated rerun; that remains unresolved outside the owned files. Cloud prompt pinning passed. Only the two authorized files changed; no commit was made. The only command adjustment was using `npm.cmd` because PowerShell blocked `npm.ps1`.

Codex session ID: 01a19cdc-ee58-7cc3-b5d7-ff5b26a89b81
Resume in Codex: codex resume 01a19cdc-ee58-7cc3-b5d7-ff5b26a89b81
