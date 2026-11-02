Implemented workflow evaluation, recording, judging, and rescoring.

Changed `eval/{records,lib,run,judge,summarize,check-cases}.ts`. Added `eval/workflow.ts`, `eval/test/workflow.test.ts`, and 43 cases plus documentation under `eval/cases-workflow/`.

Validation:

| Check | Result |
|---|---|
| Eval tests | 175 passed |
| Root tests | 927 passed |
| Worker tests | 270 passed |
| Web tests | 420 passed, 1 failed |
| Final focused tests | 22 passed |
| Core/web/worker/eval typechecks | Passed |
| Case validation | 152 cases valid |
| Workflow dry run | 43 cases listed |
| Cloud prompt hash | Unchanged |

The web failure is the existing Chrome logo-rendering timeout; it also failed in isolation.

Decisions: expectations avoid exact fixture topology; AgentRun’s code runtime remains allowed; channel/subfeature distinctions use narration checks and judging; five workflow judge scores also map into existing compatibility fields. Approval assertions reject informational waivers unless explicitly disabled. Details are in [README.md](C:/Users/mendo/ali_wt/p4b/eval/cases-workflow/README.md).

Used `npm.cmd` because PowerShell blocked `npm.ps1`. No live model calls, deployments, commits, or edits outside `eval/`. Nothing remains undone except the unresolved web test failure.

Codex session ID: 01a19cd9-a35f-7ad2-b374-9d5eb869f83b
Resume in Codex: codex resume 01a19cd9-a35f-7ad2-b374-9d5eb869f83b
