Fixed all four findings. Each exact reproduction failed before its fix and passed afterward.

Decisions:
- Apply workflow layout transitions in operation order before batching; persist committed layout for revival and rollback.
- Use committed `canExport`; include cloud recommendations and preserve the emptied active view’s selector.
- Save boolean cost choices **immediately**.
- Key live-region content by sequence number; no translation changes needed.

Changed files under `apps/web/src`:
- `store/reducer.ts`, `sessions.ts`, `types.ts`, `workflow.test.ts`
- `shell/Header.tsx`, `WorkingView.tsx`
- `export/ExportButton.tsx`
- `panel/WorkflowCost.tsx`
- Added `shell/workflow-review.test.ts`

| Validation | Result |
|---|---|
| Root suite | 986/986 passed |
| Web suite | 543/546 passed; all new regressions passed |
| Worker suite | 274/274 passed |
| Core, web, worker typechecks | Passed |
| Required UI e2e | **30/30 passed** |
| Cloud prompt SHA-256 | Matches required hash |
| Diff whitespace check | Passed |

Web failures: PDF timing passed on isolated rerun. The Chrome logo timeout and workflow SVG text assertion still fail; both are outside ownership and remain untouched.

Used `npm.cmd` because PowerShell blocked `npm.ps1`; isolated failure rechecks followed the full suites. No production scope departures, external network/model calls, deploys, or commits. Generated e2e artifacts were removed.

Codex session ID: 01a19d27-2156-7100-b244-3d577567bbc2
Resume in Codex: codex resume 01a19d27-2156-7100-b244-3d577567bbc2
