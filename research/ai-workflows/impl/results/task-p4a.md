Implemented in [workflow-prompt.ts](C:/Users/mendo/ali_wt/p4a/packages/core/src/workflow-prompt.ts) and created [workflow-prompt.test.ts](C:/Users/mendo/ali_wt/p4a/packages/core/test/workflow-prompt.test.ts). All three exported signatures remain unchanged.

The prompt measures **7,581 estimated tokens**, includes **80 catalog rows**, and its example replays without warnings, errors or repair changes.

| Check | Result |
|---|---|
| New tests | 10/10 passed |
| Root suite | 704/704 passed |
| Web suite | 420/421 passed |
| Worker suite | 269/269 passed |
| Core, web, worker typechecks | All passed |
| Cloud prompt hash | Exact match |

Decisions:
- The documented catalog filter also excludes restricted and announced entries.
- Serialization includes repeat groups and all edit fields, sorted globally by id.
- Tombstones retain the newest 30 distinct removed elements, excluding restored elements.
- The example uses a prompt chain with separate retrieval/reranking and explicit approval, rejection and editing.
- Used `npm.cmd` because PowerShell blocked the `npm.ps1` launcher.

The web Chrome logo-rendering test timed out after 30 seconds and failed identically when retried alone. That unrelated failure remains unresolved; no files outside ownership were changed. No commits, network calls or deployments.

Codex session ID: 01a19cc5-1ada-7cb2-9b63-cd215c4f6396
Resume in Codex: codex resume 01a19cc5-1ada-7cb2-9b63-cd215c4f6396
