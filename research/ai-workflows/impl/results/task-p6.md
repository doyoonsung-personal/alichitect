Implemented in two new files:

- [workflow-estimate.ts](C:/Users/mendo/ali_wt/p6/packages/core/src/workflow-estimate.ts)
- [workflow-estimate.test.ts](C:/Users/mendo/ali_wt/p6/packages/core/test/workflow-estimate.test.ts)

Validation:
- Estimator: **63/63**, covering all 32 fixtures and two hand calculations.
- Root: **757/757**.
- Worker: **269/269**.
- Web: **1 failure**, Chrome logo rendering timed out; isolated retry also failed **0/1**. Full-suite pass count wasn’t retained in the trimmed output.
- All three typechecks passed.
- Cloud prompt SHA-256 matches the required value.

Decisions recorded as assumptions:
- Missing task sizes, including `check` and `translate`, use generate defaults.
- Cache uses documented static prefixes; unknown non-agent prefixes receive no discount.
- Unbounded edit/retry cycles assume one extra typical pass and three upper passes.
- Missing route shares split remaining probability; invalid totals normalize. Escalation routes are exclusive alternatives.
- Multiple triggers are alternatives; partial graphs without triggers use source steps.
- Attached sub-agents run once per host pass; inherited repeat groups aren’t multiplied twice.
- AgentCore fixed capacity assumes one control plane for 730 hours/month. Unsized gateway/DashVector costs remain unknown.
- Voice/image/video usage stays unpriced. `oneRun` lists reachable inline steps, including alternate routes.
- Upper settings below typical are raised to typical.

Only the owned files changed. No commits, network calls, or deploys. Estimator work is complete; the existing Chrome test timeout remains unresolved.

Codex session ID: 01a19cc5-1372-7af3-8c56-7d0782380513
Resume in Codex: codex resume 01a19cc5-1372-7af3-8c56-7d0782380513
