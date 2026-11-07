# Task: Let owners see and revoke their MCP keys; cap active keys at three

- Status: done; pushed and deployed to production
- Coordinator and file owner: root agent (Claude session); implementation by one Codex worker in an isolated worktree
- Updated: 2026-11-07T22:36:00+09:00
- Scope: The owner reported that, after creating MCP keys, they could not see how many were active and so could not disable them. They also asked for a limit of three keys per person.

## Finding

Listing and revoking already worked server-side. On `/account/keys` the key list and its Revoke buttons rendered roughly 1,750–2,150 px down the page, below the three long client setup guides, with no count of active keys. The controls existed but were effectively out of sight.

## Decisions

- `MAX_ACTIVE_KEYS` is 3, enforced by the existing atomic `INSERT … WHERE (active count) < ?` in `apps/worker/src/mcp-keys.ts`, not only in the UI.
- People who already hold more than three active keys keep them; nothing is revoked automatically. They cannot issue another key until they are below three.
- The keys page opens with "N of 3 active keys", then each active key (name, masked id, scope, created, expiry, last used) with a confirmed Revoke. Revoked and expired keys move to a collapsed history section. The setup guides follow.
- At the cap the create control is disabled with a localized message to revoke a key first. After issuing, the secret is shown once alongside the updated list and count.
- Owner scoping on list and revoke is unchanged; a revoked key stops authenticating immediately. New strings are `mcp.*` keys in en, ko and zh in `apps/worker/src/pages/strings.ts`.

## Validation

- Worker tests 393/393 on Windows (CI on Linux runs 390, without the Windows PowerShell deploy-script group) and Worker typecheck passed; root tests passed; web build passed; `check:bundle` passed (5,530 KiB, no Node built-in imports).
- New tests: `apps/worker/test/mcp-keys.test.ts` (cap at three, existing user above three, owner scoping, count and history rendering) and `apps/worker/test/mcp-keys.browser.mjs` (headless Chrome against a local Worker with synthetic test accounts: issue three keys, cancel one revoke, confirm another).
- Rendered pages were inspected at 1150 and 390 px in English and Korean with three active and two revoked keys: count and Revoke buttons visible on the first screen, no secret shown.

## Integration and release

- Commit: `b8feea9` "Show active MCP keys first and cap each person at three", pushed to `origin/main` and `origin/codex/business-case`.
- Migration: none.
- Deployment: the user authorized this release on 2026-11-07. GitHub Actions run `42377305944` (Deploy, `main` at `b8feea9`) passed preflight, the web build and 390/390 Worker tests, including all seven new key tests. D1 reported no migrations to apply. Worker `alichitect` version `eb817c03-0153-44f3-bf08-1b650de64e2a` serves 100% of traffic since 2026-11-07T13:32:06Z.
- Post-deploy checks: `/api/health` returned 200 `{"ok":true}`; signed out, `/account/keys` redirects to `/login?next=%2Faccount%2Fkeys`, and `/api/me` and `/mcp` return 401. No signed-in production view of the keys page is claimed; the signed-in page was verified locally only.
- Rollback: previous Worker version `1d4afe65-0b56-44af-be65-7b40ec0f4344` (2026-11-06T02:05Z). No data change to undo.
- Remaining work: none for this request.
