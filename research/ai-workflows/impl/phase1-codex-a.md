Implementation task in the repository C:/Users/mendo/ali_catalog (Node 24, erasable TypeScript run by type stripping; no build step for packages/core).

Read `research/ai-workflows/impl/phase1-spec.md` and implement everything in it **except the "Canonical samples (second job)" section**. The design background is in `research/ai-workflows/PLAN.md` (sections 3, 5 and D9), but the spec is authoritative where they differ.

Already written; read them, do not edit them:
- `packages/core/catalog/models.json` (the model and tool table your `models.ts` loads and validates).
- `packages/core/catalog/products.json` and `offerings.json`.

Do not edit:
- `packages/core/src/prompt.ts`, `reducer.ts`, `validate.ts` (import from them; if you need a helper they keep private, copy the few lines rather than changing their exports, unless exporting an existing function is the only change);
- any existing test or fixture;
- anything under `research/`, `apps/`, `eval/`.

You may edit `packages/core/src/types.ts` (additive workflow section and new WarningCode members only) and `packages/core/src/catalog-node.ts` (add `loadModels`). Create the new files the spec lists.

Style: copy the conventions of `packages/core/src/reducer.ts` and `validate.ts` (pure functions, fixed key order, no undefined optional keys, short comments only where the code is not obvious, plain-English warning messages). Tests use `node:test` and `node:assert/strict` like `packages/core/test/*.test.ts`.

Before you finish, run all of these and make them pass:
- `npm test` at the repository root
- `npm test` in `apps/web` and in `apps/worker`
- `apps/web/node_modules/.bin/tsc -p packages/core/tsconfig.json`
- `npm run typecheck` in `apps/web` and in `apps/worker`

Do not commit. Finish with a short report: files created or changed, the test counts from each suite, every place you departed from the spec and why, and any spec ambiguity you resolved.
