Implemented p7b. Changes are uncommitted and confined to the authorized files.

Changed `export/pdf.ts`, `generate.ts`, `browser.ts`, and `scripts/export/checks.ts`. Added the workflow SVG, diagram, data, pagination and localization modules; four unit-test files; `workflow-fixtures.ts`; and the PDF test/e2e scripts.

Workflow-only and mixed exports now include vector diagrams, steps, runtime mapping, costs, coverage, unpriced items and questions. Cloud export snapshots pass unchanged.

| Validation | Result |
|---|---|
| New tests | 45/45 passed |
| Root suite | 976/977; timing failure passed alone |
| Web suite | 533/534 |
| Worker suite | 274/274 passed |
| Core/web/worker typechecks | All passed |
| PDF matrix | All 9 language/size combinations passed |

English, Korean and Chinese samples were rendered and visually sampled.

Material decisions:
- Mixed sessions export only the workflow diagram.
- Export uses committed memory; mismatched workflow input is rejected.
- Basic exports omit absent narrative.
- Workflow assumptions/questions appear in the paginated generated section, avoiding duplicate legacy-summary overflow.
- Long diagrams use overlapping A3 detail tiles with an 11-point title floor.
- Estimator amounts remain unchanged; unknown text retains its supplied fallback.
- Unresolved routes fail explicitly.

Remaining: the existing Chrome logo-render test still times out when retried alone. The e2e script checks PDFs through Node/pdf.js; the UI viewport/theme browser matrix was not run.

Codex session ID: 01a19d09-6e6e-7311-9eae-67bc648b1d25
Resume in Codex: codex resume 01a19d09-6e6e-7311-9eae-67bc648b1d25
