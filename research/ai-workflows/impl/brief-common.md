# Rules for every job (read first)

Repository: this worktree, a checkout of `C:/Users/mendo/ali_catalog` on its own branch. Background: `research/ai-workflows/PLAN.md` (the design), `research/ai-workflows/impl/phase1-spec.md` (the phase 1 contract, already built), and `packages/core/src/types.ts` (the shared contract, already pinned: TurnMode, SessionMemory.workflow/workflowTombstones/workflowSettings/estimate, WorkflowEstimateSettings, Warning.view).

1. **Never stop to ask a question.** When something is ambiguous, choose the most conservative option that keeps the cloud path unchanged, and list the decision in your final report.
2. **Strict file ownership.** Create or edit only the files your brief allows. If you need something from a file you don't own, import it if it's exported; otherwise copy the few lines you need. Never edit another job's file.
3. **The cloud path must not change.** That covers existing behaviour, prompts, op grammar, tests and fixtures.
   - `buildSystemPrompt(loadCatalog())` must keep sha256 `998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`.
   - A missing `mode` means `'cloud'` everywhere.
4. **Testing:**
   - While working, run only the tests you touch: `node --test <files>`.
   - At the end, run once:
     - `npm test` at the root, and `npm test` in `apps/web` and in `apps/worker`;
     - `node apps/web/node_modules/typescript/bin/tsc -p packages/core/tsconfig.json`;
     - `npm run typecheck` in `apps/web` and in `apps/worker`.
   - A timing-sensitive test in `prompt.test.ts` (watchdogs, hedge) can flake when the machine is busy. Re-run a failing one on its own before believing it.
5. **No network calls**, no live model calls and no deploys. Tests use the existing fakes and fixtures.
6. **Style:** match `reducer.ts` and `validate.ts`:
   - erasable TypeScript only;
   - pure functions;
   - fixed key order and no undefined optional keys;
   - short header comments, and comments only where the code alone isn't clear;
   - lines under 160 characters;
   - readable functions.
7. **Do not commit.** Leave the changes in the working tree.
8. **Final report:**
   - files created or changed;
   - test counts from each suite and the typecheck results;
   - every decision you made and every departure from the brief;
   - anything left undone.
