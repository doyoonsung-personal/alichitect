Fixed findings 4–7 in:

- [proposal.ts](C:/Users/mendo/ali_wt/fix-proposal/packages/core/src/proposal.ts)
- [proposal-prompt.ts](C:/Users/mendo/ali_wt/fix-proposal/packages/core/src/proposal-prompt.ts)
- [proposal.test.ts](C:/Users/mendo/ali_wt/fix-proposal/packages/core/test/proposal.test.ts)

Added one regression per finding. **All four failed on the old code and pass now.**

Decisions: keep new checks workflow-only; compare exact model tokens; scope attribution to document authorship; reject monetary figures, including quotes, regardless of catalog pricing; remap forbidden IDs with collision-safe aliases while preserving references and completeness.

| Check | Result |
|---|---|
| Proposal tests | 55/55 passed |
| Root suite | 981/981 passed |
| Web suite | 488/489 passed |
| Worker suite | 274/274 passed |
| Core, web, worker typechecks | All passed |
| Cloud prompt hash | Matches required hash |

The web Chrome logo-rendering test timed out again in isolation; it remains unresolved outside ownership.

No scope departures. Used `npm.cmd` because PowerShell blocked `npm.ps1`. Only the three owned files changed; no commit, deploy, or live-model call.

Codex session ID: 01a19d11-dbc4-7953-8938-7c10e474a93e
Resume in Codex: codex resume 01a19d11-dbc4-7953-8938-7c10e474a93e
