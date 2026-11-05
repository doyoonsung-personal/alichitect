# Optional business-case worksheet

This module helps an SA and customer discuss whether a proposed solution is worth validating. It combines a read-only snapshot of the design and estimate with operational assumptions supplied during the meeting. It does not infer budgets, buying intent or guaranteed savings.

## Use

With the module enabled, open an existing design and select **Business case** in the header. Fill in the current non-labor operating spend, the portion that would actually be retired, manual work hours and loaded hourly cost. Add implementation and recurring costs outside the saved solution estimate. Enter an explicit zero when no such cost is expected; a blank field means unknown.

The three scenarios start with illustrative efficiency assumptions. Adjust them with the customer and record the basis in the evidence field. Payroll realization starts at zero: work hours released for other tasks are capacity, not a payroll saving. Enter incremental benefits only when the customer can explain their basis, excluding savings already counted elsewhere.

The worksheet calculates cash effects immediately. **Prepare discussion** requests a short AI explanation and questions to investigate; the AI cannot change the calculation inputs. Saving creates an immutable version. Loading a version restores that snapshot and its assumptions. Refreshing the source is explicit and retains the operational inputs. The module has a separate printable view for browser Print / Save as PDF; existing client and Alibaba proposal exports are unchanged. History holds up to twenty versions per session and two hundred per account. **Manage all saved versions** lets the user delete old versions even when the original browser session is gone.

All amounts are USD. The first release uses a constant monthly run rate over a chosen horizon, without discounting, tax, financing, ramp-up or FX conversion. Unproven benefits should be validated in a PoC before using the worksheet for a commitment.

## Calculation contract

For each scenario:

- Released hours = manual hours × efficiency fraction.
- Capacity value = released hours × loaded hourly cost.
- Labor cash saving = capacity value × the explicitly supplied payroll realization fraction.
- Monthly cash benefit = retired non-labor spend + labor cash saving + incremental benefit.
- Monthly solution spend = imported or overridden recurring estimate + additional recurring cost.
- Upfront investment = imported or overridden one-time estimate + additional implementation cost.
- Net monthly cash = monthly cash benefit − monthly solution spend.
- Horizon net cash = net monthly cash × horizon months − upfront investment.
- Payback = upfront investment ÷ positive net monthly cash; unknown or nonpositive returns have no demonstrated payback.
- Horizon ROI compares total benefits with upfront and recurring solution spend across that horizon; a zero denominator has no defined ROI.
- Break-even efficiency is the manual-work reduction needed to cover recurring spend and upfront investment spread over the horizon, after the other supplied benefits. A threshold over one hundred percent cannot be reached by labor savings alone. With no avoidable labor cash, this threshold may be unavailable.

The sensitivity view varies the expected scenario: efficiency down ten percentage points, monthly solution spend up twenty percent, and incremental benefits down twenty percent. These are discussion tests, not probability forecasts. Intermediate calculations retain precision; presentation formats the final amounts.

Missing costs never silently become zero. A stale or absent pricing snapshot supplies no amounts; a user can instead provide explicit cost overrides with a reason. Saved source timestamps, estimate caveats and evidence remain visible in the worksheet and print view.

## Boundaries and storage

| Layer | Location | Responsibility |
| --- | --- | --- |
| Domain | `packages/business-case/` | Pure types, strict validation, deterministic calculations |
| Browser | `apps/web/src/features/business-case/` | Read-only source adapter, worksheet, history, localized copy and print |
| Worker | `apps/worker/src/features/business-case/` | Authenticated routes, owner-scoped persistence and bounded explanation calls |
| Migration | `apps/worker/migrations/0010_business_case.sql` | Independent `bc_` tables; no changes to design, session or pricing records |

No dependency on the planned BD meeting brief exists. The module adds nothing to `ab.sessions.v1`, the design controller, the pricing conversation, proposal authoring or MCP tools. A later BD integration should explicitly import selected, attributed information through a small adapter; neither module should import the other's storage or UI.

The approved account cookie and existing same-origin checks protect every route. API keys remain MCP-only. Each saved version is scoped to its owner. The client submits the source snapshot because browser sessions are local; this is user-provided evidence, not a server-certified quote. HTML renders as text. Saved versions remain until explicitly deleted or the owning account is deleted. The optional account-wide history endpoint returns only owned metadata for cleanup, not all stored customer documents.

AI discussion uses Qwen 3.8 Flash with thinking disabled and a thirty-second deadline. Admission is atomic: one concurrent call per account, four globally, ten per account per UTC day and two hundred globally per UTC day. Attempts and known or unknown costs are recorded in the module's own ledger; failed attempts still count. The writer receives qualitative calculation findings and customer evidence, and its output cannot supply numerical results. It remains an advisory writing aid, not semantic verification of customer assumptions. Manual record requests are size- and storage-bounded, but have no additional module-specific frequency quota.

## Enable and merge

The default is disabled. The server advertises `features.businessCase` from `/api/me`; older servers and malformed capabilities leave the entry hidden. Disabled routes return not found without accessing the module tables or making a model call.

For a release, follow the repository's deployment procedure, apply the additive migration, then set Worker variable `BUSINESS_CASE_ENABLED` to the literal string `1`. Unset it or use `0` to disable the feature. No production setting has been changed by this implementation. Existing accounts need only reload the application after a future enablement.

The branch starts at `d29f490` and is intended to merge independently of BD work. Shared integration points are small:

1. One optional feature entry in `apps/web/src/shell/Header.tsx`.
2. One optional capability in `apps/web/src/stream/account.ts` and its parser test.
3. One feature flag type in `apps/worker/src/env.ts`.
4. A policy import, additive capability field and bounded route dispatch in `apps/worker/src/index.ts`.
5. The domain test glob in the root `package.json` and documentation links.

When resolving a later BD merge, preserve both entries, both capability keys and both disjoint route prefixes. If another unshipped migration also uses `0010`, renumber one before either is applied. Never rename a migration already applied in an environment.

## Disable or remove

Disabling requires only the flag. It preserves saved versions for a later re-enable and leaves other features usable. The module's fixed request budgets and lease are independent of chat turn limits, but hosting, D1 and the model provider are still shared infrastructure.

For physical removal, remove the five additive integration points above and the three module directories plus their dedicated test. Retain the migration history and stored tables until an explicit data-retention decision permits cleanup. No core session migration or restoration is required. Run `node scripts/check-business-case-removal.mjs` to verify this in a disposable copy, without changing the active checkout. The script rebuilds existing assets before testing PDF paths and retains its temporary copy for inspection.

This release does not add CRM synchronization, automatic actions, MCP exposure, BD imports or inclusion in existing proposal PDFs. The optional explanation is generated on request and is not saved as an approved customer statement.
