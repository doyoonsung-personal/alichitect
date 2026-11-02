# Readability pass on the phase 1 workflow modules

`packages/core/src/workflow.ts` and `packages/core/src/workflow-validate.ts` are correct and fully tested, but denser than the house style in `reducer.ts` and `validate.ts`: 19 lines over 160 characters, long closures, several statements per line.

Make them read like those files, **without changing behaviour or exports**:
- one statement per line;
- lines under 140 characters;
- the long closures in `applyWorkflowOp` and `checkWorkflow` split into named module-level functions with short doc comments;
- a short comment on every check rule saying what it protects against (PLAN.md section 5 has the reasons);
- the same function names, signatures, exported symbols, warning codes, message texts and output order.

## Files you own
- `packages/core/src/workflow.ts`;
- `packages/core/src/workflow-validate.ts`.

Do not edit their tests, except to add tests if you find untested behaviour.

## Gate
- every existing test in `packages/core/test/workflow*.test.ts` passes unchanged: the same assertions, the same counts;
- the full root suite passes;
- the core typecheck is clean.

Report how the line count and the longest function length changed.
