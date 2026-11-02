Fixed PDF-only card sizing and placement before edge planning. Web geometry and cloud export code remain unchanged. No commit made.

Changed:
- [workflow-svg.ts](/C:/Users/mendo/ali_wt/fix-pdfcard/apps/web/src/export/workflow-svg.ts): shared measurement/drawing layout.
- [workflow-diagram.ts](/C:/Users/mendo/ali_wt/fix-pdfcard/apps/web/src/export/workflow-diagram.ts): fitted heights, overlap prevention and final-geometry routing.
- [workflow-svg.test.ts](/C:/Users/mendo/ali_wt/fix-pdfcard/apps/web/src/export/workflow-svg.test.ts): containment, overlap, ports and wrapped escaping checks.
- [e2e-workflow.mjs](/C:/Users/mendo/ali_wt/fix-pdfcard/apps/web/scripts/export/e2e-workflow.mjs): additional visual samples.

Decisions: retained IDs because PDF step headings and runtime tables reference them; used font metrics and wrapping for sizing; preserved row alignment with 24px clearance; rerouted through the local channel router when font fitting changes geometry.

| Validation | Result |
|---|---|
| Workflow tests | 98/98, including 32 fixtures × 3 languages with real fonts |
| Root suite | 986/986 |
| Web suite | 602/604 |
| Worker suite | 273/274 |
| Core/web/worker typechecks | All passed |
| Export matrix | All 9 combinations plus support-email passed |

Cloud prompt hash and diagram snapshot checks passed. Three unrelated failures persisted individually: cloud PDF timing, Chrome logo timeout, and worker auth timing. These remain unresolved outside the owned files.

Inspected [support-email](/C:/Users/mendo/ali_wt/fix-pdfcard/tmp/pdfs/workflow/support-email-triage-p04.png) and [25-step](/C:/Users/mendo/ali_wt/fix-pdfcard/tmp/pdfs/workflow/en-25-p04.png) PNGs, plus Korean/Chinese samples: text, chips, locks and clocks fit inside cards. Pagination still produces sparse and some blank detail pages; pagination was left unchanged. Generated PDFs, PNGs and logs remain under `tmp/pdfs/workflow/`.

Codex session ID: 01a19d27-137e-7fb0-a3c5-a9919d9f6ed6
Resume in Codex: codex resume 01a19d27-137e-7fb0-a3c5-a9919d9f6ed6
