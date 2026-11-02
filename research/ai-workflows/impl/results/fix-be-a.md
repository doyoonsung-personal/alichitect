Implemented round A. Changes are uncommitted; round B files are untouched.

| Review IDs | Status |
|---|---|
| Codex #1; Claude D0, D1, D2 | **Fixed** in cloud and workflow modes. Backup text is sanitized before reduction; references share ID aliases; raw warning excerpts and filter finish reasons are withheld. Qwen text remains unchanged. |
| Codex #8, #9, #10; Claude C0 | **Fixed**: shared normalized identity matcher, word-written prices, and writer attribution filters. |
| Claude C1, C13 | **Fixed**: proposal rescue receives workflow mode. |
| Codex #5; Claude C7, C8 | **Fixed**: narration clipping, stale-estimate pruning, and invalid numeric-field dropping. |
| Claude C2, D4 | **Fixed**: stable fence stripping and workflow memory-as-data instruction. |
| Codex #7; Claude C3, C4, D5 | **Fixed**: disjoint IDs, localized budget errors, incremental compaction, and BOM acceptance. |
| Codex #6; Claude D3 | **Declined**, explicitly deferred. |
| Codex #2–#4, #11; Claude C5, C6, C9–C12, C14–C18, D6–D9 | **Declined for this round**, outside the assigned scope. Codex #4 is reproduced and marked as a pending invariant test. |

Regression tests failed before their corresponding fixes and passed afterward. All **32 workflow fixtures and 466 cloud replay turns** commit admissible memory. The cloud prompt retains SHA-256 `998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`; the workflow prompt remains within its existing token band.

| Verification | Result |
|---|---|
| Root | 1,057 passed, 0 failed, 1 TODO (#4) |
| Web | 616 passed, 2 failed; PDF timing passed individually, Chrome logo timeout persisted |
| Worker | 275 passed, 1 failed; jitter timing bound also failed individually |
| Final targeted tests | 123 passed, 0 failed, 1 TODO |
| Core, web, Worker typechecks | All passed |

Decisions: backup narration waits for complete lines to prevent split-token leaks; product-name exceptions apply to prose, while IDs use stricter matching. Budget errors are localized server-side, requiring no web change. Both hosts accept BOMs. Compaction uses exact incremental byte accounting. Windows required `npm.cmd` because PowerShell blocked `npm.ps1`.

Files created or changed:

- Core source: `identity-matcher.ts` **(new)**, `llm.ts`, `claude.ts`, `proposal.ts`, `proposal-prompt.ts`, `prompt.ts`, `workflow-prompt.ts`.
- Core tests: `identity-matcher.test.ts` **(new)**, `proposal.test.ts`.
- Server source: `request.ts`, `turn.ts`, `messages.ts`, `server.ts`.
- Server tests: `final-a.test.ts` **(new)**, `workflow-request.test.ts`, `server.test.ts`.
- Worker tests: `turn.test.ts`, `proposal.test.ts`.

Remaining: round B’s edge-cap repair and the unrelated Chrome/Worker timing failures. No live-model calls or deployments were made.

Codex session ID: 01a19d6a-e602-7640-bf6e-10fed7b3e666
Resume in Codex: codex resume 01a19d6a-e602-7640-bf6e-10fed7b3e666
