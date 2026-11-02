Fixed all five findings. I checked that each finding’s regression failed on the old code and passed on the new code, including server and Worker reproductions for findings 2 and 3.

- Workflow constraints now trigger repair with `view: 'workflow'`.
- Departing exchanges are summarized before removal. Failed summaries preserve history or produce `memory-budget` without committing.
- Admission and commits reserve UTF-8 space for the maximum next ask.
- Stored references use the model table and catalog; unknown references are dropped.
- Stored workflow IDs must match `normalizeId`, including references, tombstones, and estimate maps.

Changed files:
- `packages/core/src/{llm,workflow-constraints}.ts` — constraint helper is new.
- `apps/server/src/{request,turn}.ts`
- `packages/core/test/workflow-turn.test.ts`
- `apps/server/test/workflow-request.test.ts`
- New `apps/server/test/turn-regressions{,-fixture}.ts`
- New `apps/worker/test/turn-regressions.test.ts`

Validation:

| Check | Result |
|---|---|
| Root suite | 940/940 passed |
| Worker suite | 274/274 passed |
| Web suite | 443/444 passed |
| Focused tests | 26/26 passed |
| Final server/Worker regressions | 10/10 passed |
| Core, web, Worker typechecks | All passed |

The web Chrome logo-rendering test timed out again in isolation; that remains unresolved. The Node backup suite passed.

Decisions: reject noncanonical IDs rather than rewrite stored records; reject oversized documents rather than alter them; share the executor fix with Worker; retain cloud-only behavior and the pinned prompt hash.

Execution departures: used `npm.cmd` because PowerShell blocked `npm.ps1`; repeated the web suite and typechecks after output truncation obscured results. Neither `workflow-validate.ts` nor `constraints.ts` was edited. No commits, deployments, or live-model calls.

Codex session ID: 01a19ce4-8d2f-7442-913e-a082d76cc864
Resume in Codex: codex resume 01a19ce4-8d2f-7442-913e-a082d76cc864
