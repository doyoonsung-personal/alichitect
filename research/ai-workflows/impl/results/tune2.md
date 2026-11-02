Implemented and left uncommitted. The prompt is **9,591 estimated tokens**, deterministic and price/backend-name free. Worked examples replay cleanly; the cloud hash is unchanged.

Offline results reflect **eval corrections only**:

| Measure | Before | After |
|---|---:|---:|
| Passing conversations | 93/129 | 103/129 |
| pass@1 | 72.1% | 79.8% |
| pass@3 | 88.4% | 90.7% |
| Passing checks | 2,123/2,175 | 2,130/2,169 |

Changed:
- `packages/core/src/workflow-prompt.ts` and its test.
- `eval/workflow.ts` and `eval/test/workflow.test.ts`.
- Seven case JSONs: listing enrichment, shopping, invoice, hosted KB, phone, Slack and trifecta.
- [README with every diagnosis, decision and eval correction](C:/Users/mendo/ali_wt/tune2/eval/cases-workflow/README.md).

Accepted equivalent capabilities, effects and wording; retained structural safety failures and ambiguous capability misses. No production checker changes or extra full worked examples.

Validation:
- Focused tests: **41/41**
- Root: **981/981**
- Worker: **274/274**
- Web: **488/489**; Chrome logo-rendering timeout also failed alone.
- Core, web and worker typechecks: **passed**

Used `npm.cmd` because PowerShell blocked `npm.ps1`. Only owned files changed. No external calls, deployments or commits. Remaining limits: the unrelated Chrome timeout and prompt improvement unmeasured without a live run.

Codex session ID: 01a19d09-84c5-7610-a04e-8dd301b56c0f
Resume in Codex: codex resume 01a19d09-84c5-7610-a04e-8dd301b56c0f
