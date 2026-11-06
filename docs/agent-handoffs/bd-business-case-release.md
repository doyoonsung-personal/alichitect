# Task: Integrate BD meeting briefs and release an admin-only trial

- Status: review complete; release pending
- Coordinator: root integration agent
- Updated: 2026-11-06
- Checkout: `C:/Users/mendo/ali_catalog`, `codex/business-case`
- User scope: Merge the supplied `bd-brief-feature-files.zip` with the business-case worksheet, commit with explanations, push and publish. Both features are restricted to the owner's admin account for initial testing.

## Ownership and dependencies

| Owner | Writable scope | Responsibility |
| --- | --- | --- |
| Root | Shared registration, configuration, migrations, scripts and docs | Reconcile both modules, integration checks, commit, push and release |
| Domain agent | `packages/bd-brief/` | Validate imported domain behavior and bounded live model smoke |
| Backend agent | Both Worker feature folders and feature tests | Admin eligibility, owner scoping, migration compatibility and resource bounds |
| Web agent | BD web feature folder and BD browser verification script | User flow, keyboard/mobile behavior, source freshness and CSP-safe printing |

Imported code was three-way merged against its stated baseline `70c7594`. Existing unrelated untracked research and output artifacts remain untouched. Imported handoff test results are historical claims, not validation of this merged revision.

## Decisions and interfaces

- Preserve both independent modules; neither imports the other or writes into core sessions.
- Rename the incoming migration to `0011_bd_briefs.sql`, preserving `0009_session_titles.sql` and `0010_business_case.sql`.
- Compose one `/api/me` capability object so `businessCase` and `bdBrief` cannot overwrite each other. Parse enabled flags independently and fail closed.
- Configure both enabled flags and both `*_ADMIN_ONLY=1`; allowlist only `dysung.alicloud@gmail.com`. Check role and email on the server for every module request, including direct handler calls. Ordinary and verified accounts receive neither capability.
- Use additive migrations; preserve accounts, sessions, existing data and Worker secrets.
- Preserve source provenance: imported implementation, integration fixes and independently repeated checks will be documented in the commit body.

## Validation and review

- Full root suite: 1,284 passed; full Worker suite: 383 passed; full web suite: 809 passed. After final domain/UI refinements, both-feature Worker checks passed 79/79 and feature/account web checks passed 58/58. BD domain has 90 passing tests. These are overlapping suite counts, not a unique grand total.
- Final web and Worker typechecks, production web/PDF build, distribution checks and Worker bundle checks passed. Both lazy feature chunks are included; no test/demo tools or source maps are shipped, and the Worker bundle has no Node built-ins.
- BD browser harness passed admin-only visibility, hidden-user no-request behavior, generation/explicit save, notes review acceptance, source changes, keyboard focus, EN/KO/ZH at desktop and 390px, and actual-CSP print isolation. The existing worksheet browser suite also passed. Cross-module opening and printing were verified in both orders with both stylesheets loaded, zero CSP violations, cleanup and focus restoration. API responses were mocked; screenshots were visually inspected.
- Both independent physical removal rehearsals passed eight check groups: both typechecks, web/PDF builds, retained-module domain/web/Worker tests and existing account/pricing/proposal/MCP tests. Migration history remains intact. Temporary copies and logs are under the paths reported in `tmp/bd-integration/removal-*.log`.
- Real Flash generation: revised synthetic missing/current/stale evidence in EN/KO/ZH passed 9/9 with zero repairs, 6.2–11.1 seconds. Conflicting-note review passed all languages and accepted changes validate; English required one retry after a provider timeout. This is smoke evidence, not a production latency or semantic-quality benchmark.
- Source and evidence logs: `tmp/bd-integration/`. Korean SDLC case-study HTML was completed separately under `output/`; it describes the earlier local feature delivery and is not application release content.

## Review fixes and limits

- Preserved accepted answers, owners and dates during regeneration; changed people cannot inherit confirmation. Repairs retain the original evidence/language context. Generated answers and money are constrained; note changes must fit the destination field and retain evidence references.
- Corrected workflow-only/latest-revision source snapshots and effective approval/runtime boundaries. Added live source-change notification, async race guards, visible mobile trigger/layout, focus handling and separate named print pages.
- BD deletion no longer resets the generation ledger or frees an in-flight slot: request metadata/usage survive for seven days, deleted customer payloads are scrubbed, and late results cannot restore deleted content. Account deletion still cascades. One active request per account, four globally, twenty attempts/account/day. The worksheet's separate pool remains one/account, four globally; the one-admin trial therefore permits at most two model calls across both modules.
- BD records token usage rather than computed USD spend. Aggregate note/brief storage quotas and broader load/quality evaluation remain follow-ups before widening the trial. Every model-generated item starts unreviewed; narrow validators do not establish all semantic claims.

## Integration and release

- Not yet committed, pushed or deployed.
- Existing `origin/main` has parallel cherry-picked history. Audit found zero remote-only patches; its application tree matches local equivalent `f831399`, with differences limited to local evaluation/run-log artifacts. Preserve the validated integrated tree while joining both histories; do not force-push.
- Current production target: `https://architect.alikorea-demo.com`, Worker `alichitect`.
