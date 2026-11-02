Updated all four suites:

- [models.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/models.test.ts): catalog integrity, prices, dates, references, and price-free prompt rows.
- [approval.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/approval.test.ts): all effects, override precedence, and waivers.
- [workflow.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/workflow.test.ts): reducer operations, collisions, pending links, tombstones, caps, immutability, and no-ops.
- [workflow-checks.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/workflow-checks.test.ts): fault/clean cases for all **19 check codes**, all four approval regressions, tri-state support, and repair ordering/idempotence.

Re-read the four source files and refactored [workflow-validate.ts](C:/Users/mendo/ali_catalog/packages/core/src/workflow-validate.ts) into smaller traversal, model-checking, and reference-validation helpers. Preserved concurrent source fixes and added regression coverage.

Remaining uncertainties:

- **Self-attachment repair:** currently drops `on` without creating a self-link or self-`after`. The spec’s general repair wording conflicts with its self-link prohibition.
- **Attached-tool trifecta:** currently still warns with `approval: 'required'`; this treats call-time approval separately from the defined human gate.
- **Execution verification:** tests, all three typechecks, existing-suite compatibility, and the prompt SHA-256 remain unverified. I ran no Node, tests, or builds.

Codex session ID: 01a19baf-cd2d-7612-a63e-2a9153440713
Resume in Codex: codex resume 01a19baf-cd2d-7612-a63e-2a9153440713
