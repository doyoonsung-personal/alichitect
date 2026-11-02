Implemented the owned fixes; changes are uncommitted.

| Items | Status |
|---|---|
| C0, C1 | **Fixed** — workflow repair findings and view-aware requirement resolution |
| C2 | **Fixed** — mixed-view requirement states retain each document’s findings |
| C3 | **Fixed** — workflow gaps survive commit |
| C4, C5 | **Fixed** — highlights, pans and build marks stay view-scoped |
| C6 | **Fixed** — mid-turn edits do not save; revival clears unfinished repair state |
| C7, Codex #5 | **Fixed** — Tidy persists |
| C39 | Descriptions **fixed**; heading change **declined** because `console/Revision.tsx` is unowned. Translated heading keys are ready. |
| C44, Codex #9 | **Fixed** — announcements throttled to 2 seconds, deduplicated, with completion retained |
| D0, Codex #1 | **Fixed** — corrupt geometry and conflicting inline cells trigger fresh layout |

Validation:

- Reproduced **21 failing regressions** before fixes; targeted tests now **40/40 pass**.
- Headless Chrome adapter check: **1/1 pass**.
- Root suite: **1087/1087 pass**.
- Web suite: **637/639 pass**; PDF timing and logo-rendering timeout failed.
- Worker suite: **274/276 pass**; two authentication timing assertions failed.
- All three typechecks pass.
- Cloud prompt SHA-256 matches the required value.

Changed files under `apps/web/`:

- `src/store/{reducer,requirements,selectors,sessions,types}.ts`; added `final-review.test.ts`.
- `src/app/{controller.ts,controller.test.ts,props.ts}`.
- `src/console/logic.ts`, `src/workflow/props.ts`, `src/i18n/strings.json`.
- Added `scripts/e2e-workflow-store.mjs`.

Decisions: preserve cloud requirement lookup behavior; resolve workflow aliases through the catalog; retain repaired-product evidence from core warnings; infer pan origin without editing unowned components. Used `npm.cmd` because PowerShell blocked `npm.ps1`.

Remaining: C39’s heading wiring and the four full-suite failures above. No model calls, external network calls, deployments or commits.

Codex session ID: 01a19e30-8011-79d3-8205-6a50f16022be
Resume in Codex: codex resume 01a19e30-8011-79d3-8205-6a50f16022be
