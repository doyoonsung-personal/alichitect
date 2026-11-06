# Task: Prepare a BD meeting before an architecture session exists

- Status: implemented and verified locally; not pushed or deployed
- Coordinator and file owner: root agent
- Updated: 2026-11-06
- Scope: The main page must offer meeting preparation without a known pain point or an architecture prompt. Preserve the existing admin-only trial and the optional module boundary.

## Decisions

- Add a separate discovery source owned by the BD module. Do not create placeholder architecture sessions or write to their schema, conversation, pricing or reports.
- Client context and the meeting label are optional. Empty context produces discovery questions and explicitly unknown needs, without an invented solution or value proposition.
- Save discovery briefs under the authenticated account and list them from the main-page entry so they remain accessible after closing or changing devices.
- Reuse the existing brief editor, notes review, confirmation, copy, print and deletion flows.
- Keep session-based preparation in the working-view header unchanged.
- Source kind, context, labels and list limits are validated server-side. Existing capability, ownership, generation quota and concurrency gates apply.
- A new migration broadens the BD source-kind constraint and preserves existing briefs, versions, notes and request accounting. No core table changes.

## Validation and release

- BD domain tests: 90 passed; Worker tests: 68 passed; web tests: 42 passed. Both application typechecks passed.
- Production web/PDF build, distribution checks and Worker bundle check passed. Existing large web chunk warnings remain.
- New browser flow passed using the real BD route handlers and SQLite persistence with a synthetic account and model response: blank creation without a model call, explicit generation/save, reload/reopen, deletion before generation, account gating, focus behavior, unchanged host session and EN/KO/ZH desktop layouts. Existing session-based BD browser regression also passed with mocked APIs.
- Separate live Flash samples in English, Korean and Chinese produced opening discovery questions from empty context without invented solutions or costs; all three validated without repair (approximately 3.4–5.4 seconds).
- Migration 0012 passed seeded-data preservation tests with foreign keys enabled, including versions, notes, cached candidates, accounting and restored deletion behavior. Wrangler applied all migrations through 0012 to isolated local D1 successfully.
- Physical removal rehearsal passed all eight check groups while retaining the business-case module and host account, architecture, pricing, proposal and MCP behavior.
- Evidence is under ignored `tmp/bd-discovery/`; browser regression screenshots are also under `tmp/bd-integration/`. No independent-agent review or production verification is claimed.
- Release requires applying `apps/worker/migrations/0012_bd_discovery.sql` before deploying the updated Worker. Keep the existing admin-only trial flags/allowlist. This migration only rebuilds the BD tables; use the normal D1 migration transaction and backup procedure. No production migration, push or deployment has been performed for this change.

## Related artifact

The separate Korean HTML redesign is at `output/agentic-sdlc-showcase-ko.html`. It now leads with seven agent handoff stages, retains the original session evidence, moves the timeline to an appendix without playback, and uses the generic label “프로젝트 작업 규약”. Desktop interaction/content/offline checks passed. The original Downloads file, `C:/Users/mendo/Downloads/d1bcc874-agentic-sdlc-showcase.html`, now contains the same corrected version; both its raw HTML and rendered rules tab were checked for the requested label replacement. A copy of the original upload is preserved at `tmp/sdlc-showcase-redesign/original-upload.html`. These local HTML artifacts are separate from the application commit.
