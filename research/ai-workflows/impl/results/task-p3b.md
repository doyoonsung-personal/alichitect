Implemented phase 3b plumbing. Changes remain uncommitted, entirely within owned paths.

Files changed under `apps/web/src`:

- `app/`: `controller.ts`, `controller.test.ts`, `contracts.ts`, `props.ts`
- `store/`: `types.ts`, `reducer.ts`, `changes.ts`, `selectors.ts`, `sessions.ts`; added `workflow.test.ts` and `fixtures/large-dual-session.json`
- `stream/`: `events.ts`
- `replay/`: `plan.ts`, `player.ts`, `player.test.ts`; added `fixtures/stub-workflow.json` and `fixtures/stub-mixed-workflow.json`

Validation:

| Gate | Result |
|---|---|
| Root tests | 694/694 passed |
| Web tests | 437/438 passed |
| Worker tests | 269/269 passed |
| Core, web, Worker typechecks | Passed |
| Cloud prompt SHA-256 | Matches pinned hash |

The existing Chrome logo-render test timed out, including an isolated rerun. That is the remaining gate failure.

Decisions: preserve legacy cloud keys and use separate workflow provenance; retain captured mode for retry and edit/resend; use synthetic, tools-only replay fixtures. Workflow display snapshots reset on commit, restore, and revert because this worktree has no workflow layout export. Canvas/layout integration remains phase 5.

Used `npm.cmd` because PowerShell blocked `npm.ps1`. No network/model calls, deploys, or out-of-scope edits.

Codex session ID: 01a19ccf-9f7c-7852-b39a-bab3d1043ce4
Resume in Codex: codex resume 01a19ccf-9f7c-7852-b39a-bab3d1043ce4
