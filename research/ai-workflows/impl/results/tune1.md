Implemented. Offline re-score on unchanged outputs improved from **0/43 to 36/43 passing cases**; **717/725 assertions pass (98.9%)**. Judge results remain unchanged at 34/43 sign-offs.

The prompt is **8,891 estimated tokens**, byte-stable, and passes the price/backend-name checks. The worked example replays cleanly. The cloud prompt retains the exact required SHA-256.

Changed 12 files, all within ownership:

- [workflow-prompt.ts](/C:/Users/mendo/ali_wt/tune1/packages/core/src/workflow-prompt.ts) and its test.
- [eval/workflow.ts](/C:/Users/mendo/ali_wt/tune1/eval/workflow.ts) and its test.
- [cases README](/C:/Users/mendo/ali_wt/tune1/eval/cases-workflow/README.md).
- Seven cases: code review, enterprise search, KYC, AgentBay, AgentRun low-code, hosted knowledge base, and trifecta.

Decisions are documented in the README: infer Model Studio from `ai`; recognize audio input/output capabilities; accept narrowly scoped task alternatives; drop enterprise search’s required `end`; and broaden literal mention alternatives. Human hand-off, guard and approval failures remain failures. The example now uses DashVector to match the connector guidance.

Prompt changes cover the requested misses and judge concerns, including unsupported tools, phone ingress, retrieval permissions, SQL safety, customer adapters and consequential decisions.

| Check | Result |
|---|---|
| Targeted tests | 37/37 passed |
| Root suite | 965/965 passed |
| Web suite | 443/444 passed; Chrome-render timeout persisted on isolated retry |
| Worker suite | 269/270 initially; timing failure passed on isolated retry |
| Final prompt/example replay | 17/17 passed |
| Core, web, Worker typechecks | All passed |

Execution adjustments: used `npm.cmd` because PowerShell blocked `npm.ps1`; rescored a temporary copy through the exported rescore function to preserve the supplied records.

Left outstanding: the Chrome-render timeout and your new live run to measure prompt improvements. No live model calls, deploys or commits were made.

Codex session ID: 01a19cf0-9b85-7692-8295-e6045a797017
Resume in Codex: codex resume 01a19cf0-9b85-7692-8295-e6045a797017
