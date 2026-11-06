# First-meeting discovery

The main page offers **Prepare a first meeting** / **첫 고객 미팅 준비** before the user has an architecture session, design prompt or known client pain point. The existing session-based meeting control remains in the working-view header.

This is part of the optional BD module and uses the same admin-only trial capability, server flag and email allowlist. It adds no account tier and does not change business-case eligibility.

## User flow

1. Choose the first-meeting entry on the main page.
2. Optionally name the client/meeting and enter known background. Both fields can remain blank.
3. Create the meeting. This saves a module-owned container and makes no model call.
4. Optionally add a meeting objective/attendees and generate a brief. With no client evidence, the writer prepares opening discovery questions, leaves the problem and business impact unknown, and proposes no solution or costs.
5. Review and save the generated content. Later, reopen it from the same entry's saved-meetings list, add notes and review proposed updates using the existing brief workflow.

Saved discovery meetings belong to the authenticated account and can be reopened from another browser. They do not depend on local architecture-session history. Empty containers can be deleted without generating first. The library allows 50 independent meetings per account; creation enforces this bound atomically, and retries for an existing source still succeed at the cap.

Notes and context remain in the BD module. Starting an architecture design from the findings is still an explicit user action through the normal architecture input; this feature does not automatically send notes to architecture, pricing, reports or MCP.

## Integration and data

- The only new host composition point is `Landing.tsx`, with the same gated, lazy `BdBriefEntry` using its `discovery` variant.
- `DiscoveryDialog.tsx` owns the account library and optional input form. `discovery.ts` creates a bounded snapshot without consulting the host session.
- `BriefDialog.tsx` reuses its existing controller, notes review, explicit-save, print and delete paths. Independent meetings inject their saved snapshot; browser sessions continue using the read-only host adapter.
- `BriefSourceKind` additionally accepts `discovery`. Its snapshots require revision zero, no design and missing pricing. Existing browser-session requests keep their previous default lookup.
- `GET /api/features/bd-brief/discovery-briefs` returns the owner's bounded list. Creation uses the existing `POST /briefs`, with an optional title. A source lookup can specify `sourceKind=discovery`.
- `bd_briefs.discovery_title` and `discovery_snapshot` retain independent input. These fields are null for browser sessions. Generation checks the incoming source fingerprint against the saved discovery context before claiming a model request.
- Generation quotas, concurrency, ownership and deletion accounting use the existing BD rules. Creating or opening a meeting does not consume architecture turns or make a model call.

## Migration and release

Apply `0012_bd_discovery.sql` before deploying the new Worker. It widens the BD source-kind check and adds discovery columns. SQLite requires a table rebuild for that constraint change: the migration preserves existing briefs, versions and notes in temporary migration tables, rebuilds only those BD tables, restores the rows, indexes and delete-scrubbing trigger, then removes the migration tables. The generation ledger is kept in place. No host or business-case table changes.

Run the entire file through the normal migration runner, in one transaction. The implementation was checked with foreign keys enabled and existing rows/cached candidates seeded, and with Wrangler's local D1 migration runner. See [Cloudflare's foreign-key behavior](https://developers.cloudflare.com/d1/sql-api/foreign-keys/) and [migration reference](https://developers.cloudflare.com/d1/reference/migrations/).

Rolling back code hides the new discovery entry while retaining its data. Do not reverse migration history or drop tables to roll back. Disabling the existing BD flag hides both meeting entry points. For physical removal, remove the Header and Landing imports/elements and follow the existing BD removal checklist; `scripts/check-business-case-removal.mjs bd-brief` covers both seams and preserves the business-case module.

## Verification

`apps/web/scripts/e2e-bd-discovery.mjs` exercises the real SPA, BD route handler and SQLite-backed D1 adapter, with synthetic account/health and model responses. It checks empty creation, generation and explicit save, unchanged architecture state, reload/reopen, deletion before generation, account gates, focus containment and EN/KO/ZH desktop layouts.

Domain/Worker/web regressions and real-model empty-context samples are recorded in the [task handoff](agent-handoffs/bd-discovery-entry.md). Browser verification is local; it is not evidence of a production deployment.
