Implemented and left uncommitted. Temporary PDFs, PNGs, and logs were deleted.

Visual review:
- **Support-email:** five diagram pages → **one**, meeting the 11 pt title floor. “Resolve manually” now sits close beneath the main row.
- **En-25:** eleven diagram pages → **three**: a legible overview and two balanced detail pages. Every detail contains whole cards; references point forward; the last has no continuation note.

Decisions: compact PDF rows with conservative 44-unit label clearance; preserve horizontal order and attachment slots; use ordered strips for wide diagrams; balance detail strips across sheets; reuse the panel’s ordering and committed layout. Existing expansion remains available when unusually tall fitted content would otherwise overlap. Panel and cloud behavior were not changed.

Validation:

| Check | Result |
|---|---|
| Targeted tests | 117 passed |
| Root suite | 988/988 passed |
| Web suite | 616/618 passed |
| Worker suite | 272/274 passed |
| Core, web, worker typechecks | All passed |
| Workflow render matrix | All 9 cases passed |
| Cloud snapshot and pinned prompt hash | Passed |

Isolated reruns cleared the worker password-timing failure. Three failures remain in unchanged code: cloud PDF speed threshold, Chrome logo timeout, and worker jitter bound. These prevent reporting fully green suites.

Changed files:
- `apps/web/src/export/`: `generate.ts`, `model.ts`, `pdf.ts`, `workflow-data.ts`, `workflow-data.test.ts`, `workflow-diagram.ts`, `workflow-pagination.ts`, `workflow-pagination.test.ts`, `workflow-svg.ts`, `workflow-svg.test.ts`.
- `apps/web/scripts/export/workflow-pdf.test.ts`.
- `apps/web/src/workflow/panel-model.test.ts` — TODO replaced with passing parity checks across all 32 fixtures.

No files outside the allowed ownership were changed; no network calls or deployments were made.

Codex session ID: 01a19d47-0f8f-7b91-bd67-f4e54d6492e0
Resume in Codex: codex resume 01a19d47-0f8f-7b91-bd67-f4e54d6492e0
