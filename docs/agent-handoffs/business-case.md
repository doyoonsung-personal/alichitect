# Task: Independent customer business-case module

- Status: done
- Coordinator: Codex root; workers communicate through collaboration messages
- Updated: 2026-11-06T00:13:00+09:00
- Branch / checkout: `codex/business-case`, `C:/Users/mendo/ali_catalog`
- Scope: Start now independently of the proposed BD module; deterministic scenarios, customer assumptions, saved versions, optional AI questions, standalone print view. No deployment requested.

## Ownership and dependencies

| Owner | Writable files | Outcome |
| --- | --- | --- |
| Domain agent | `packages/business-case/` | Pure validation/calculation contract and tests |
| Backend agent | `apps/worker/src/features/business-case/`, `apps/worker/test/business-case.test.ts`, `apps/worker/migrations/0010_business_case.sql` | Owner-scoped storage, bounded AI explanation, endpoint tests |
| Web agent | `apps/web/src/features/business-case/` | Own worksheet, history, API adapter, print surface, localization and UI tests |
| Root | Shared integration files, docs, browser verification | Account capability, header entry, Worker dispatch/env, full integration and commit |

All implementation and browser harness ownership has returned to root. Domain agent reviewed backend and web read-only; fixes were made by their owners. Root completed integration, review and printed layout refinements.

## Decisions and interfaces

- `packages/business-case/src/types.ts` is the agreed contract. Use relative imports and browser-safe pure code.
- Default-off `BUSINESS_CASE_ENABLED=1`; optional `/api/me` field `features.businessCase` is true only when enabled. No new session fields or chat-turn consumption.
- Authenticated prefix `/api/features/business-case`: GET `?sessionId=...` returns `{records: BusinessCaseRecord[]}` (newest first, maximum 20); POST body `{document}` saves an immutable version and returns `{record}`; DELETE `/:id` removes an owned version; POST `/explain` body `{document,lang}` returns `{explanation}`. GET `/versions` returns up to 200 owned metadata rows `{id,sessionId,title,createdAt}` so old versions can be deleted after a browser session disappears. Standard error envelope `{error: string}` with appropriate HTTP status. No model output stored automatically.
- Host integration remains root-owned. Backend exports `handleBusinessCase(request, env, user)` and `businessCaseEnabled(env)`; consumes `BUSINESS_CASE_ENABLED?: string`.
- Web exports `BusinessCaseEntry` from `entry.tsx`. It reads a host snapshot and account capability without changing core state. Current source estimates only; explicit cost overrides require a reason. Explicit refresh retains customer inputs and replaces the source snapshot.
- Unknown monetary fields stay null. Initial efficiency scenarios are editable illustrative assumptions; zero payroll realization means released staff capacity is not cash saved. Other benefits must exclude already-counted savings.
- No imports from BD; existing architecture, pricing, proposal and MCP flows must run with the module disabled or removed.

## Validation and release

- Domain: 15 focused tests pass, including unknown/zero propagation, capacity versus cash, scenario formulas, bounds and supported timestamps.
- Worker: initial full suite had 315 passing and one old account-shape assertion failure. Keeping `/api/me` exactly unchanged while disabled resolved it; all 51 route/module checks then passed. Expanded module suite now has 13 passing tests, including cross-session metadata cleanup.
- Web: full suite had 766 passing and one existing PDF latency check miss under simultaneous build/test load (3048 ms versus 3000 ms threshold). Isolated rerun of that entire PDF file passed all 17 tests. Current module suite has 8 passing tests.
- Root core/eval/server suite: 1193 tests passed before the additional timestamp regression (covered in focused domain rerun).
- Both application typechecks, production web/PDF build, dist checks and Worker dry-run bundle check passed. No Node built-ins in the Worker bundle.
- Physical removal rehearsal passed in `C:/Users/mendo/AppData/Local/Temp/alichitect-business-case-removal-UYF5FZ`: both typechecks, production web and proposal renderer builds, and 77 host account/pricing/proposal/MCP tests. It removes actual module directories in a disposable copy and retains migration history. Repeat with `node scripts/check-business-case-removal.mjs`.
- Real Flash explanation smoke after qualitative evidence refinement passed EN/KO/ZH in about 5–7 seconds, using synthetic input. Local evidence: `tmp/business-case/live-smoke.json`. The earlier full-number evidence prompt yielded one invalid response; the validator rejected it, and the writer now receives qualitative calculation classifications.
- Final browser QA: all 13 checks passed using the real SPA with mocked API responses, including orphan-version cleanup, exact scenario arithmetic, save/reload, no host session writes, stale-source refresh/history, AI invalidation, EN/KO/ZH, 390px overflow, Escape/focus, hosted-CSP printing and cleanup. Root inspected the screenshots and all three rendered Korean PDF pages. The scenario table stays together across pages and print headings omit worksheet input-step numbers. Evidence: `tmp/business-case/browser-results.json`, `tmp/business-case/business-case-ko.pdf` and adjacent PNGs (local-only).
- Final focused web/account checks: 17 passed. Final web and Worker typechecks, web/PDF build and Worker bundle check passed after the cleanup and printing changes. Run browser verification with `node apps/web/scripts/e2e-business-case.mjs http://127.0.0.1:5179`; add `--pdf` when intentionally generating the test artifact under the PDF skill.

## Integration and release

- Implementation is in the commit containing this record, titled **Add an isolated customer business-case worksheet**. Find its hash with `git log -1 -- docs/agent-handoffs/business-case.md`.
- No push or production deployment performed. The feature is disabled by default. A later release must apply migration `0010_business_case.sql` and set `BUSINESS_CASE_ENABLED=1` to expose it. The checkout also contains earlier unreleased changes and migration `0009`; review the full release scope in the usual deployment process.
- Migration is additive; confirm numbering before merging with future BD migrations. The BD module is still a proposal in this checkout; no merge with another implementation has been performed. See `docs/BUSINESS_CASE.md` for the five small shared integration points and removal instructions.
- No remaining implementation blockers. Manual CRUD frequency has no extra module-specific throttle; storage and model usage are bounded. The calculation is an undiscounted, steady monthly comparison, not a financial forecast. Source snapshots and customer evidence are user-supplied.
- Existing Vite server at `http://127.0.0.1:5179` was reused; this task started no persistent service. Unrelated untracked research and output artifacts were preserved and excluded from the commit.
