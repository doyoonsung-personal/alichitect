Fixed all three findings in only:

- [workflow-prompt.ts](C:/Users/mendo/ali_wt/fix-p4a/packages/core/src/workflow-prompt.ts)
- [workflow-prompt.test.ts](C:/Users/mendo/ali_wt/fix-p4a/packages/core/test/workflow-prompt.test.ts)

Approval gating now follows the effective policy. Price-free capabilities derive from ModelTable, preserving unknown support. Every `ai` and `agent` step explicitly requires a valid model ID.

Checked that all six new regression tests fail on the old code and pass on the new code, covering every concrete review input.

| Validation | Result |
|---|---|
| Prompt tests | 16 passed |
| Root tests | 917 passed |
| Worker tests | 270 passed |
| Web tests | 420 passed, 1 failed |
| Core/web/worker typechecks | All passed |

Prompt size: **8,136 estimated tokens**; budget band updated to 8,000–8,500. Byte stability passes; cloud SHA-256 matches the required hash.

Decisions: retained checker behavior and original model rows; distinguished unknown support from unsupported. Used `npm.cmd` because PowerShell blocked `npm.ps1`. No other departures, files created, or commits.

Remaining limitation: the existing Chrome logo-rendering test timed out again when rerun alone; left unchanged because it is outside ownership.

Codex session ID: 01a19cda-38c4-71c2-b62a-f1a08dc8e5b6
Resume in Codex: codex resume 01a19cda-38c4-71c2-b62a-f1a08dc8e5b6
