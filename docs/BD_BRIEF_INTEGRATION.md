# BD brief module — integration handoff record

## Current integrated release (2026-11-06)

The supplied implementation is now integrated alongside the independent business-case
worksheet. The sections below retain the original agent's implementation and review
record; their old counts and rollout status are historical, not claims about the merged
revision. Current validation and deployment evidence is maintained in
[`agent-handoffs/bd-business-case-release.md`](agent-handoffs/bd-business-case-release.md).

- The incoming, unapplied migration `0009_bd_briefs.sql` is now
  `0011_bd_briefs.sql`; existing session-title `0009` and worksheet `0010` migrations
  are preserved. Applied migrations must never be renamed or removed.
- Both modules have their own entries, capability keys and route namespaces. They do
  not import one another or write into core session records.
- The user authorized push and production deployment, restricted to their admin account.
  Production configuration sets `BD_BRIEF_ENABLED=1`, `BD_BRIEF_ADMIN_ONLY=1`, and
  `BD_BRIEF_ALLOWLIST=dysung.alicloud@gmail.com`. The worksheet has equivalent trial
  settings. Server-side role and email checks guard discovery and every module request;
  ordinary/verified accounts and other admins are excluded.
- The current removal rehearsal preserves migration history and removes either module
  while retaining the other: `node scripts/check-business-case-removal.mjs bd-brief`
  or omit the argument to remove the worksheet. It operates only in a temporary copy.
- Integration review additionally fixed confirmation inheritance, original-context repair,
  monetary/answer safeguards, stale-source races, workflow evidence, mobile/focus behavior
  and cross-module print isolation. Deleting a brief preserves quota/lease accounting for
  seven days while scrubbing customer payloads. BD now admits at most four global model
  requests, one per account, with twenty attempts per account per UTC day. Actual measured
  checks and remaining trial limitations are in the current release record linked above.

## Imported implementation record

Working record for the implementation of `BD_MEETING_BRIEF_PLAN.md`. It states what the
coordinating agent already wired, which exports each owner must ship, and how to verify
and remove the module. It is not the design document; read the plan for intent.

## Frozen contracts

`packages/bd-brief/src/types.ts` is the single contract source. It is frozen for the
duration of the parallel work: an owner that finds a gap works around it inside its own
module and reports the gap instead of editing the contract. `packages/bd-brief/src/fixtures.ts`
holds the shared examples (thin context, rich context with current pricing, contradictory
notes) used by all three test suites.

## Already wired by the coordinator (do not re-edit inside owner tasks)

| File | Change | Removal step |
| --- | --- | --- |
| `package.json` (root) | test glob `packages/bd-brief/test/**/*.test.ts` | delete the glob |
| `apps/web/vite.config.ts` | `@ali/bd-brief` → `packages/bd-brief/src` alias | delete the const and alias entry |
| `apps/web/tsconfig.json` | `@ali/bd-brief/*` path + `include` entry | delete both |
| `apps/web/scripts/alias.mjs` | `@ali/bd-brief/` prefix mapping | delete the line |
| `apps/web/src/stream/account.ts` | optional `features?: { bdBrief?: boolean }`, parsed leniently | delete the field and the parse line |
| `apps/web/src/stream/account.test.ts` | capability-flag tolerance test | delete that test |
| `apps/web/src/shell/Header.tsx` | `BdBriefEntry` import + one element after `<ExportButton />` | delete both lines |
| `apps/worker/src/env.ts` | `BD_BRIEF_ENABLED`, `BD_BRIEF_ALLOWLIST`, `BD_BRIEF_MODEL`, `BD_BRIEF_DEADLINE_MS`, `BD_BRIEF_MAX_PER_USER_DAY` | delete the block |
| `apps/worker/wrangler.jsonc` | `BD_BRIEF_ENABLED: "0"` in prod vars, `"1"` in `env.dev.vars` | delete both entries |
| `apps/worker/src/index.ts` | `bdBriefEligible` + `handleBdBrief` + `BD_BRIEF_API_PREFIX` imports, capability spread in `/api/me`, one route line before the `/api/` 404 catch-all | delete the three imports, the spread and the route line |
| `docs/BD_MEETING_BRIEF_PLAN.md`, this file | documentation | delete |

Every one of those edits is additive. None changes an existing control flow, schema field,
quota counter or export path, which is what makes plan §12 (disable and remove) a delete
operation rather than a refactor.

## Pinned exports each owner must ship

Domain/engine — `packages/bd-brief/src`:

```ts
// evidence.ts
canonicalJson(v: unknown): string
snapshotFingerprint(s: BriefSnapshot): string   // excludes capturedAt
evidenceIds(snapshot: BriefSnapshot, notes: BriefNote[]): Set<string>
normalizeSnapshot(v: unknown): BriefSnapshot | null

// validate.ts — each returns { ok: true; value: T } | { ok: false; issues: string[] }
validateSnapshot(v) validateContent(v, evidence) validateModelContent(v, evidence)
validateChanges(v, evidence, baseContent) validateGenerateRequest(v) validatePatchRequest(v, evidence)
validateAddNoteRequest(v) validateCreateBriefRequest(v)

// prompt.ts
buildGeneratePrompt(input: GenerateInput): { system: string; user: string }
buildRepairPrompt(previous: string, issues: string[]): { system: string; user: string }

// engine.ts
type EngineOutcome = { ok: true; result: GenerateResult }
  | { ok: false; reason: 'timeout' | 'model' | 'validation'; partialUsage: ModelUsage | null }
generateBrief(input: GenerateInput, opts: { signal?: AbortSignal; deadlineMs?: number }, deps: EngineDeps): Promise<EngineOutcome>

// changes.ts
applyChanges(content, changes, acceptances, deps: { ids: IdFactory; clock: Clock }): ApplyChangesResult
interface ApplyChangesResult { content: BriefContent; appliedIds: string[]; skippedIds: string[] }
```

Web — `apps/web/src/features/bd-brief/entry.tsx` must export `BdBriefEntry()` returning
`ReactElement | null`; it renders nothing unless `account?.features?.bdBrief === true`.

Worker — `apps/worker/src/features/bd-brief/`:

```ts
// policy.ts
bdBriefEnabled(env: Env): boolean
bdBriefEligible(env: Env, user: { email: string }): boolean
bdBriefModel(env) bdBriefDeadlineMs(env) bdBriefGenerationsPerUserDay(env)

// routes.ts
handleBdBrief(request: Request, env: Env, ctx: ExecutionContextLike, me: UserRow, url: URL, deps?: BdBriefDeps): Promise<Response>

// model.ts
createBdBriefModel(env: Env, deps?: { fetchImpl?: typeof fetch }): ModelAdapter
```

`handleBdBrief` must be safe to call even when the feature is disabled or the `bd_` tables
do not exist: it returns a structured `not-available`/`internal` JSON response and never
throws into the caller, because `index.ts` dispatches to it unconditionally once registered.

## Verification commands

```bash
node --test "packages/bd-brief/test/**/*.test.ts"     # domain contracts, engine, boundary check
npm test                                              # root: core + bd-brief + eval + server
cd apps/web && npm test && npx tsc -p tsconfig.json --noEmit && npm run build
cd apps/worker && npm test && npx tsc -p tsconfig.json --noEmit && npm run check:bundle
```

`packages/bd-brief/test/boundary.test.ts` is the import-boundary gate from plan §11: it
rejects any `bd-brief` import from core design, pricing, report, MCP or server code and
allows only the module directories plus the host composition points listed above.

### Recorded results (2026-11-06, main tree at 70c7594 + this change, Windows / Node v22.23.3)

Two rounds were run: after the parallel implementation, and again after the independent
review's findings were fixed. The post-fix figures are the authoritative ones.

| Check | Round 1 | Round 2 (post-fix) |
| --- | --- | --- |
| `packages/bd-brief` tests | 75/75 pass | **83/83 pass** |
| Root `npm test` (core + bd-brief + eval + server) | 1232/1232 pass | **1240/1240 pass** |
| `apps/web` tests | 767 pass / 0 fail / 1 skip | **772 pass / 0 fail / 1 skip** |
| `apps/web` typecheck | clean | **clean** |
| `apps/web` production build | green | **green; BD dialog still its own lazily imported chunk (`BriefDialog-*.js` + `.css`), loaded via `import()` only when the entry opens** |
| `apps/worker` tests | 345/345 pass | **354/354 pass** |
| `apps/worker` typecheck | clean | **clean** |
| `apps/worker` `check:bundle` | green | **green — bd-brief modules bundled, no Node built-ins, Workers-compatible** |

The worker suites include `bd-brief-seam.test.ts`, which drives the real `worker.fetch`
dispatch: feature off/on, the server-side allowlist, sign-in and approval gates answering
before the feature route, cross-owner not-found, missing-tables isolation and MCP
unaffected. The single web skip is pre-existing and unrelated ("the logos render in
Chrome" needs puppeteer-core under `spikes/canvas/node_modules`, not installed here).

Note: `apps/worker` `check:bundle` and `test/mcp.test.ts` require `apps/web/dist` and
`apps/worker/build/pdf/renderer.js` from a prior `npm run build` in `apps/web`; without it
they fail identically at the pristine baseline commit. That build is also what turned
`test/mcp.test.ts` green here, so its earlier failure was a missing artifact, not a
regression.

### Removal rehearsal (plan §10 step 6, §12) — PASS, run twice

Performed once after the initial implementation and again after the review fixes, each
time in a full copy of the tree with `packages/bd-brief/`, both feature directories, the
worker bd-brief test files, migration `0009` and the two docs deleted, and all eleven seam
files restored byte-for-byte from HEAD:

- `grep -r "bd-brief|bdBrief|bd_brief|BdBrief"` over all source, tests, migrations and
  wiring files: zero residue in both runs.
- Round 2: root 1157/1157; worker 294/294 with typecheck clean and `check:bundle` green
  (bundle 5348 KiB without the feature vs 5421 KiB with it); web typecheck clean and the
  rebuilt `dist` has 913 files with no BD chunk (916 with the feature).
- The one web failure in the copy is `workflow/edges.test.ts` comparing page counts
  against `git show HEAD:`, which cannot run without `.git`; it references no BD code and
  passes in the real tree.
- No session-data migration or restoration was needed at any point: existing sessions,
  design, pricing, proposals and MCP behaved identically with the module absent.

### Independent review and the fixes it produced

A reviewer that wrote none of this code re-ran every check above (all figures reproduced,
no discrepancies), cleared the highest-risk areas outright — tenancy and owner scoping,
the single server-side eligibility gate, route placement behind the origin/sign-in/
approval checks, prompt-injection framing, log and error leakage, isolation, removability,
migration 0009, the trilingual string tables, print bounds and payload sizes — and found
one blocker plus three majors, all now fixed with the missing regression tests:

- **B1 (blocker)** the web controller only recognized a `{ state: 'failed' }` body the
  worker never sends; real failures arrive as HTTP 504/502/422, so a retry reused a dead
  requestId, got 409, and re-poisoned itself until the dialog closed — breaking plan §8's
  required retry-after-timeout. The old tests passed by driving the phantom shape. Now any
  non-abort generate error (and cancel, whose lease dies server-side) marks the attempt
  failed so the next one mints a fresh requestId; reuse is confined to the in-progress
  poll, which re-sends a byte-identical body.
- **M1** committing a notes review adopted the fingerprint of the worker's deliberately
  empty synthesized review snapshot, leaving a permanent spurious "source changed" banner
  clearable only by a paid regenerate. The controller now keeps the brief's own
  fingerprint in that mode, asserted by a test.
- **M2** the daily quota check raced the claim insert, and `maxConcurrentGenerations` was
  declared but enforced nowhere. The claim is now one conditional insert gated on both the
  UTC-day count and live in-progress leases (expired leases excluded), returning 429 when
  either is exhausted; covered by burst and concurrency tests.
- **M3** regeneration re-minted every item id and reset review state, silently discarding
  BD confirmations and edits. In `regenerate` mode only, items the model echoes verbatim
  now inherit the base item's id, review, origin and edited flag (each base item matches
  at most once), with the prompt contradiction removed; plan §11's required regression
  test now exists.
- Minors also fixed: the dead in-progress poll that stranded the dialog in `generating`;
  the priority-question cap now clamped during normalization instead of producing a
  paid-but-unsavable candidate; generation failure `reason` surfaced to the user in all
  three languages; a named stakeholder can no longer be anchored by a reserved
  whole-object evidence id alone; review-notes must use the brief's language; note dedup
  now compares text plus meeting date plus source; language-switch and sign-out
  stale-guard paths tested; a missing index for the lease-expiry scan; the unlabeled
  value-point case documented and given a localized fallback.
- **Policy hardened beyond the review's minimum**: an enabled server with an empty or
  unset `BD_BRIEF_ALLOWLIST` now makes NOBODY eligible (previously every approved
  account). A trial therefore requires an explicit address list; `[env.dev]` carries the
  dev admin address so local development still exercises the full flow.

Review items deliberately left as behavior, now documented: failed generations still
consume daily quota (anti-abuse; twenty timeouts lock an account out for the day), and
`expireStaleRequests` remains the only non-owner-scoped query, over transient lease state.

### Coordinator reconciliation notes (cross-owner fixes after the parallel phase)

Three agents built the package, the web feature and the worker feature in parallel against
a frozen `types.ts`, so the seams between them needed reconciling afterwards:

- `snapshotFingerprint` excludes `objective` and `lang` (BD-side inputs, not source
  evidence): the staleness re-capture runs without the stored objective, so hashing it
  would have made every brief prepared with an objective permanently stale. Pinned by a
  regression test in `evidence.test.ts`.
- `changes.ts` `listOf` returns `MutableListItem` (widened `BriefItemBase`) instead of
  casting through `unknown`, fixing two TS2352 errors under the web tsconfig.
- `apps/worker/test/helpers.ts` gained `makeD1Without(...migrationPrefixes)` (additive;
  `makeD1` refactored over a shared `d1Over` helper) so the missing-tables isolation
  check can simulate an older deployment.

### Not yet done (needs a live environment or human judgment)

- Plan §10 step 5: live-model evaluation of real writing quality and latency in EN/KO/ZH
  with labeled example customers (missing/conflicting/current/stale evidence), and legibility
  of print output on paper. The Flash profile is unmeasured against real meetings.
- Plan §10 step 7: deployment — additive `wrangler d1 migrations apply`, deploy with the
  flag off, then enable for an explicit allowlist. Not started; requires authorization.
- Plan §11: representative baseline browser checks (Puppeteer flows) and a modest
  concurrency comparison of existing-route latency under BD load.
- The UI-level behaviors that unit tests cannot cover in this repo (no DOM test
  environment): focus return, screen-reader flow, mobile scrolling and CJK line wrapping
  need a manual browser pass.

## Open product/configuration decisions (plan §13)

Defaults chosen for this implementation, all reversible by configuration:

1. Trial participation: global flag off (`BD_BRIEF_ENABLED: "0"` in production vars) AND
   fail-closed allowlist — with `BD_BRIEF_ALLOWLIST` empty or unset, an enabled server
   still admits nobody, so enabling the trial requires an explicit address list.
   `[env.dev]` sets the flag to `"1"` with the dev admin address listed.
2. Limits: `LIMITS` in `types.ts` — 20 generations per account per UTC day, 10 retained
   accepted versions, 7 days for transient request records, 30 s generation deadline.
3. Model profile: Qwen3.8 Flash with thinking disabled for preparation and notes review;
   no deeper-refinement stage in this release. Quality on real meetings is unmeasured.
4. Printing: browser Print / Save as PDF on a dedicated surface; proposal export untouched.
