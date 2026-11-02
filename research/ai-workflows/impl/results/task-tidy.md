Refactored only the two owned files into documented module-level helpers, preserving exports, signatures, warning text, and output order. Every check rule now explains its purpose.

| File | Lines | Longest function |
|---|---:|---:|
| [workflow.ts](/C:/Users/mendo/ali_wt/tidy/packages/core/src/workflow.ts) | 160 → 262 | 113 → 32 |
| [workflow-validate.ts](/C:/Users/mendo/ali_wt/tidy/packages/core/src/workflow-validate.ts) | 310 → 572 | 79 → 41 |

`applyWorkflowOp`: 113 → 20 lines. `checkWorkflow`: 52 → 31. Maximum line widths are 129 and 139 characters.

Validation:

- Workflow tests: **110/110**, unchanged.
- Root: **694/694**.
- Worker: **269/269**.
- Web: **420/421**. Chrome logo rendering timed out; isolated retry also timed out.
- Core, web, worker typechecks: **clean**.
- Cloud-prompt SHA-256 matches the required value; `git diff --check` passes.

Decision: also extracted validator field normalization to keep functions short. No tests changed, files created, or commits made. Only outstanding issue is the unrelated web Chrome test timeout.

Codex session ID: 01a19ccf-a495-7792-88bd-4afb7a219023
Resume in Codex: codex resume 01a19ccf-a495-7792-88bd-4afb7a219023
