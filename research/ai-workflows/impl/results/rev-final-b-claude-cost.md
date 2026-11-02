# Claude frontend review: findings for the cost job

## C18. [high] Escape in a cost-driver input saves the typed value instead of cancelling it, and also collapses the whole panel
- **Location:** apps/web/src/panel/WorkflowCost.tsx:93 (Escape branch, no stopPropagation) + apps/web/src/panel/WorkflowPanel.tsx:30 (panel Escape handler) + apps/web/src/panel/WorkflowCost.tsx:91 (onBlur)
- **Input:** support-email-triage committed, panel open, 'Edit cost drivers' expanded. Apply 'Runs per month' = 5000. Then select the field, type 7000 and press Escape.
- **Actual:** memory.estimate becomes {"runsPerMonth":7000} and the value survives a page reload. The panel closes (#products loses data-open) and focus moves to the handle. Cause: the Driver's Escape handler only calls setDraft/setError. The keydown bubbles to the section handler, which calls setPanelOpen(false) and handle.focus(). That blurs the input synchronously, before the restore re-renders, so onBlur still sees the stale draft '7000'. '7000' !== '5000', so apply() commits it.
- **Expected:** Escape puts the field back to the stored value (5000), changes nothing in memory, and leaves the panel open. The design says 'Escape restoring the draft'.
- **Fix proposed:** In the Escape branch of the input's onKeyDown, call e.stopPropagation() (and e.preventDefault()), so the panel handler does not close the panel and blur the input. As a belt-and-braces measure, add a ref flag such as 'cancelled', set on Escape and checked in onBlur, so a blur in the same tick can never apply the stale draft.

- **Verifier notes:** The fix belongs in the Escape branch of the Driver input's onKeyDown (WorkflowCost.tsx:93). When the draft differs from the stored value (draft !== String(value ?? '')), call e.preventDefault() and e.stopPropagation() before restoring the draft. The panel handler then never blurs the input, so onBlur cannot apply the stale draft.

When there is no pending edit, let Escape bubble. A second Escape, or one on a clean field, still collapses the panel and returns focus to the handle, as the design requires (p5design.md:244). An unconditional stopPropagation would remove that path from every driver field.

Optional hardening: set a cancelledRef on Escape and check it in onBlur, so that a blur in the same tick never applies a stale draft. | In the Driver's Escape branch, when the draft differs from the stored value, call e.preventDefault() and e.stopPropagation() and restore the draft. The first Escape then cancels the edit and leaves the panel open. When the draft already equals the stored value, let the event propagate, so a second Escape still collapses the panel and returns focus to the handle, as p5design.md:244 intends. Also add a skipBlurRef that the Escape branch sets and onBlur checks and clears. A blur in the same tick, such as one from a parent handler or programmatic focus, then never applies a stale draft. Add an e2e check in scripts/e2e-workflow-panel.mjs: apply 5000, type 7000, press Escape. It should assert that memory.estimate stays {runsPerMonth:5000} and the panel stays open.

## C19. [medium] Edit-retry branches get a cost driver that does nothing, and none for the loop budget the estimator actually prices
- **Location:** apps/web/src/panel/WorkflowCost.tsx:36-43 (drivers chosen by edge.kind only); estimator retries at packages/core/src/workflow-estimate.ts:216-230 use settings.loops for outcome:'edit' edges
- **Input:** support-email-triage: edge l13 {from:'human', to:'draft', kind:'branch', outcome:'edit'}. Set 'l13 · Share of runs' to 0, 0.5 or 1.
- **Actual:** Each value is accepted and stored, but the estimate does not change (typical 0.00734937 / upper 0.01476812 every time). The estimator drops edit-retry edges from the branch choice and prices them as a loop with settings.loops.l13, defaulting to typical 1 and upper 3 extra passes. The panel only creates 'Extra loop passes' drivers for kind==='loop', so l13's budget can't be edited, though it is a large cost: loops.l13={0,0} moves upper from $0.01477 to $0.00860 (-42%) and typical from $0.00735 to $0.00632. The assumptions list still shows 'l13: assumed Typical value 1..'. 29 of 32 fixtures have edit-retry edges with no loop driver.
- **Expected:** An edit-outcome edge that forms a retry has no share driver. It gets typical and upper 'Extra loop passes' drivers that write loops[edgeId], the same as kind:'loop' edges.
- **Fix proposed:** Build the loop-driver list from the edges the estimator treats as retries: kind==='loop', or outcome==='edit' where the target reaches the source. Exporting a small helper from core keeps the two in sync. Leave those edges out of the share drivers and out of the sibling set in applyEstimateEdit.

- **Verifier notes:** Export one helper from core that returns the set of edge ids priced with a loops budget. That set is the same one workflow-estimate.ts:222 iterates: kind==='loop' edges, outcome==='edit' edges whose target reaches their source over forward edges, and DFS back links among forward edges. Use it in three places:
- WorkflowCost.tsx: build the 'Extra loop passes' typical/upper drivers for every edge in the set, not only kind==='loop'.
- WorkflowCost.tsx and settings.ts:31: give share drivers only to choice edges that are not in the set.
- settings.ts:59 (the applyEstimateEdit sibling filter): leave edges in the set out of the sibling-sum check.
Edit-outcome edges that are not retries go back into the forward DAG and feed weights(), so they must keep their share driver and stay in the sibling set. Remove only the edges that are actual retries. (Including back links in the helper is for consistency with the estimator; a back-link case was not separately demonstrated.) | Do not key the fix on `outcome==='edit'` alone. A forward (non-cyclic) edit link is an ordinary route and must keep its share driver; the core test covers this. Take the sets from the estimator instead.

1. Rebase onto phase-1, where commit 07bac45 exports `workflowChoiceSets(wf)` from packages/core/src/workflow-estimate.ts. It returns `{choices, shares, loops}` computed by the same route classification `estimateWorkflow` uses.
2. In WorkflowCost.tsx, build share drivers from `Object.keys(sets.shares)` and typical/upper "Extra loop passes" drivers from `Object.keys(sets.loops)`. The loop set covers kind:'loop' links, edit links that close a cycle, and DFS back links. This also gives escalate and outcome-link choices a share driver.
3. In settings.ts, accept `shares` only for ids in `sets.shares`, replacing the `kind!=='branch'` check at line 31. Validate the sibling sum over `sets.choices[from]` instead of the `kind==='branch'` siblings at line 59.
4. Take the loop max from `sets.loops[id].max`, so the panel and core agree on the default of 3 for unbounded edit retries.

## C20. [medium] Share validation uses a different sibling set from the estimator, so the common 'Grounded' share can only be 100% and mixed shares are renormalised away
- **Location:** apps/web/src/workflow/settings.ts:58-65 (siblings = kind==='branch' edges from the same node) vs packages/core/src/workflow-estimate.ts:414-418 (choices = all forward edges out of the node, including escalate/outcome, excluding retries)
- **Input:** support-email-triage: set 'Grounded · Share of runs' (l8, gate→human) to 0.8. Separately set l11=0.5, l12=0.2, l13=0.3 on 'human', then change l11 to 0.6.
- **Actual:** l8=0.8 and l8=0.5 are rejected with 'Branch shares must add up to 100%'. l8 is the only kind:'branch' sibling, so it must equal 1, but the estimator splits gate's runs between l8 and the escalate edge l10 'Budget spent', which has no driver. Called directly, the core accepts shares.l8=0.8 (typical 0.00801 vs 0.00735), but the UI can't reach that value. 27 nodes across the fixtures have one branch plus an escalate. On 'human', l11 .5 + l12 .2 + l13 .3 is accepted, but the estimator ignores l13 (an edit-retry) and renormalises l11/l12 to 0.714/0.286 (assumption shares:human:normalise). Once every sibling is set, any single change is rejected (l11→0.6 gives invalidShares), so the user has to reset a sibling first.
- **Expected:** Validation uses the sibling set the estimator weights: forward, non-retry out-edges of a choice node, including escalate and outcome edges. Each of those edges gets a share driver, so a user can enter 80% Grounded / 20% Budget spent.
- **Fix proposed:** Share one 'choice edges for node' helper between core and settings.ts, using the same dag and retry rules as weights(). Use it both to build the share drivers in WorkflowCost and to choose the siblings in applyEstimateEdit.

- **Verifier notes:** Export one core helper, for example `choiceEdges(wf, nodeId)`, from workflow-estimate.ts. It should return the node's DAG out-edges using the same retries/back exclusion as lines 183-198, and only when the line-416 condition holds: more than one out-edge, and at least one is branch, escalate or carries an outcome. All three places should use it:
- settings.ts:31: accept a share for any edge in the choice set, instead of requiring kind==='branch'.
- settings.ts:59: use the choice set as the sibling list.
- WorkflowCost.tsx:~37: build share drivers over choice edges. That gives escalate edges such as l10 a driver, and removes the inert driver from edit-retry edges such as l13.

Edit-retry edges, meaning anything in the core's retries or back set (not only kind==='loop'), should get typical/upper loop drivers instead, since applyEstimateEdit already accepts loops.l13. Keep the exact-sum rule as it is. Its "reset a sibling first" behaviour is a separate UX question. | Export one helper from core, e.g. choiceEdges(wf, nodeId), built from the same rules that build `dag` in workflow-estimate.ts:169-198. It drops kind 'loop' edges, retry edits (outcome 'edit' that reaches back to its source) and DFS back edges. It returns the out-edges only when one of them is a branch, escalate or outcome-typed link. Use it in three places:
1. settings.ts:59, to choose the siblings: sum must be ≤ 1, and must equal 1 only when every edge in the choice set has a share.
2. settings.ts:31, to allow shares on any edge in that choice set instead of only `kind==='branch'`.
3. WorkflowCost.tsx:36-38, to render share drivers for exactly those edges. Escalate and outcome alternatives such as 'Budget spent' gain a driver; retry-edit branches such as l13, whose share the estimator ignores, lose theirs.

Keep the existing rule that rejects a single edit once every sibling is set. It is a separate UX question and the fix above does not address it.

## C21. [medium] An unparseable number silently deletes an existing override instead of showing an error
- **Location:** apps/web/src/panel/WorkflowCost.tsx:80 (nextDraft === '' treated as reset) with :91 onBlur / :92 Enter
- **Input:** Runs per month override = 5000. Select the field, type '1e' or '--5', then Tab away (or press Enter).
- **Actual:** For badInput, <input type=number> reports value ''. The draft becomes '', and apply() treats '' as 'use default', so the override is deleted (stored {} instead of {runsPerMonth:5000}). No error is shown and aria-invalid stays false.
- **Expected:** Malformed text shows 'Enter a valid value within the allowed range.' and keeps the stored 5000. Only an empty field, or the 'Use default' button, resets.
- **Fix proposed:** In onChange, onBlur and the Enter handler, read e.currentTarget.validity.badInput. If it is true, setError('workflow.cost.invalid') and don't apply. Only treat '' as a reset when badInput is false.

- **Verifier notes:** Track bad input separately from the draft. In onChange, use `setDraft(e.target.value); setBad(e.target.validity.badInput)`. In apply(), when the call is not a reset and `bad` (or the input's ref.current.validity.badInput) is true, call setError('workflow.cost.invalid') and return before treating '' as a reset. The onBlur guard also needs to fire when the input is bad, so use `if (bad || draft !== String(value ?? '')) apply()`. Escape should clear `bad`. This covers onBlur, Enter and the Apply button in one place. Only the 'Use default' button (apply(true)) or a truly empty field with badInput=false should reset. | Add a ref on the number input and make one check at the top of apply(): if (!reset && inputRef.current?.validity.badInput) { setError('workflow.cost.invalid'); return; }. This covers blur, Enter and the Apply button. The Apply button's onClick has no input event to read validity from, so per-handler checks would miss it. Checking in onChange instead would flash the error mid-typing, for example on "1e" on the way to "1e3".

Also, when "Use default" or Escape runs while the input is badInput, clear the DOM text explicitly (inputRef.current.value = ''), or remount the input with a key. setDraft('') does not re-render when the draft is already '', so the malformed text stays on screen otherwise.

For the separate Escape defect, call e.stopPropagation() in the Escape branch of onKeyDown. Also skip the blur commit right after an Escape, using a ref flag, so the old draft is not saved.

## C22. [medium] usd() switches precision at $0.01: it understates values by up to a third, prints exponent notation, and has no grouping
- **Location:** apps/web/src/workflow/panel-model.ts:47-48
- **Input:** support-email-triage defaults (estimate upper.perRunUsd = 0.01476812, typical = 0.00734937). The EventBridge line is 8.2e-7, and runsPerMonth is 2e9 (capped at 1e9).
- **Actual:** Below $0.01 the formatter uses 3 significant figures; at $0.01 and above it uses 2 decimals. Typical shows '$0.00735' but upper shows '$0.01', which is 32% low. Upper therefore reads as 1.36x typical instead of 2.0x, and $0.01 x 10,000 = $100 doesn't match the '$147.68' per-month figure beside it. The same cliff hits 15+ fixtures: e.g. code-review line 0.0256 → '$0.03' beside 0.008 → '$0.00800'. Values under 1e-6 come out in exponent form: 'Email webhook … event | $8.20e-7 | $8.20e-7'. Large figures have no thousands separator and ignore the locale ('$9910.13', '$216044370.00'), while runs per month uses toLocaleString(lang) ('10,000').
- **Expected:** One rule for every amount: the same number of significant figures (e.g. 3) for amounts under $1 and cents above, with no exponent notation and locale grouping. The displayed per-run figure × runs should then reconcile with per-month.
- **Fix proposed:** Replace usd() with Intl.NumberFormat(lang, {style:'currency', currency:'USD', maximumSignificantDigits:3}) for amounts under $1 and {minimumFractionDigits:2, maximumFractionDigits:2} at $1 and above. Pass lang from the panel props, and keep the '$0.00' handling for exact zero.

- **Verifier notes:** The proposed fix (style:'currency') changes the symbol. In ko and zh, Intl renders USD as "US$" (checked in node: ko gives "US$0.0148" and "US$216,044,370.00"), unlike the "$" the panel shows today. Keep the literal "$" prefix and use decimal-style Intl instead:

```ts
export function usd(value: number, lang = 'en'): string {
  if (value === 0) return '$0.00';
  return '$' + new Intl.NumberFormat(lang, value < 1
    ? { maximumSignificantDigits: 3 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
```

This gives "$0.0148" for 0.01477, "$0.00000082" for 8.2e-7 and "$9,910.13" for 9910.13. The existing test `usd(0.000001) !== '$0.00'` still passes.

Make lang optional with default 'en': export/pdf.ts (out of scope) also calls usd() and keeps working untouched. WorkflowCost.tsx should pass p.lang at lines 52, 58 and 60.

Add a test that no amount under $1 shows fewer than 3 significant digits (e.g. usd(0.0147681) === '$0.0148'), and one that usd(0.009999) does not print '$0.0100'. | In panel-model.ts, use `usd(value: number, lang: string = 'en')`:
- If value === 0, return '$0.00'.
- Otherwise call `new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', ...(value < 1 ? { maximumSignificantDigits: 3 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }).format(value)`.

This gives one rule below $1, so $0.0148 sits beside $0.00735, with no exponent form, plus grouping above $1. narrowSymbol avoids "US$" in ko and zh. Pass p.lang from WorkflowCost.tsx. Keep lang optional so export/pdf.ts, which another job owns, still compiles, and tell that job so the PDF can adopt it.

Add tests for these cases:
- usd(0.01476812) === '$0.0148'
- usd(8.2e-7) contains no 'e'
- usd(9910.13) === '$9,910.13'

## C23. [medium] Cost rows show raw internal unit codes and research-log references, untranslated in ko and zh
- **Location:** apps/web/src/panel/WorkflowCost.tsx:57-58, 60, 62 (render l.unit and l.source verbatim); units come from packages/core/src/workflow-estimate.ts:28-35 (FEES), 250, 307 ('mtok'), 313, 327, 361, 374 and model/tool price units; sources come from FEES (NOTES = 'research/ai-workflows/verify/NOTES.md') and packages/core/catalog/models.json 'source'
- **Input:** Open the panel for support-email-triage in Korean (ab.lang=ko).
- **Actual:** The priced-lines table shows unit codes 'mtok', 'detection call', 'event' and 'message'. Each step name carries a source line such as 'NOTES Adjudicate-3', 'NOTES Adjudicate-2 (cache); Batch 6 (inputs); Adjudicate-4 (tools)' or 'research/ai-workflows/verify/NOTES.md Batch 3; Adjudicate-1: AI Guardrails', which are internal repo paths and research-log section names. Unpriced and fixed rows show English units in the Korean UI: 'CU-second', 'reviewer hour', 'GB-month / capacity', 'document tokens', 'compute CU', 'compute second', 'instance-month', 'control-plane hour', '10k-chars', 'image', 'call', 'page'. They also show the English label suffix 'indexing and ingestion'. The 'workflow.cost.source' key ('Price source' / '가격 출처') exists but is never rendered, and strings.json has no unit keys.
- **Expected:** Units are user-facing and localized, e.g. 'per 1M tokens' / '100만 토큰당', 'per detection call', 'per event'. Internal research references are not shown, or are replaced by a user-facing source (a pricing page name or link) under the 'Price source' label.
- **Fix proposed:** In the panel (leave the core strings alone because the export uses them), map each unit code to a 'workflow.unit.<code>' i18n key, with en/ko/zh entries for every code listed. Stop rendering l.source verbatim: drop it, or map known sources to a user-facing name or link shown under t('workflow.cost.source'). Localize the 'indexing and ingestion' suffix by building the label in the panel from the line id suffix ':indexing'.

- **Verifier notes:** Keep every change in apps/web/src/panel/WorkflowCost.tsx and strings.json; core and export are out of scope, and the PDF uses the core strings.

1. **Units:** add a helper `unitText(code) = t('workflow.unit.' + code)` that falls back to the raw code when no key exists, so a new catalog unit never renders blank. Add en/ko/zh entries for the codes the estimator emits: mtok (e.g. 'per 1M tokens' / '100만 토큰당' / '每百万 token'), detection call, event, message, transition, CU-second, compute CU, compute second, reviewer hour, GB-month / capacity, document tokens, instance-month, control-plane hour, call, page, model usage, plus the catalog fee/price units (10k-chars, image, …).
2. **Sources:** stop rendering l.source verbatim at :57 and :60. Either drop the <small>, or map known sources to a user-facing pricing-page name or link and show it under t('workflow.cost.source').
3. **Indexing label:** for unpriced ids ending in ':indexing', build the label in the panel as `node.label + ': ' + t('workflow.cost.indexing')` instead of using core's English suffix. | In apps/web/src/workflow/panel-model.ts, add a UNITS map beside REASONS, following the same pattern as unpricedReason.
- Map each known unit code to a 'workflow.unit.<code>' key, with en/ko/zh entries in strings.json: mtok ('per 1M tokens' / '100만 토큰당' / '每百万 token'), detection call, event, message, transition, CU-second, reviewer hour, GB-month / capacity, document tokens, compute CU, compute second, instance-month, control-plane hour, 10k-chars, image, call, page.
- Export a unitText(unit, t) that falls back to the raw string. Tool units come from catalog data (tool.fee?.unit), so unknown codes have to keep working.
- Use it at WorkflowCost.tsx:58, 60 and 62.

For sources:
- Stop rendering l.source verbatim in the <small> at lines 57 and 60.
- Show only https:// sources, or mapped user-facing pricing-page names, under t('workflow.cost.source'), and drop the internal 'NOTES …' and 'research/…' references. pdf.ts already separates https sources from the rest.

For the ':indexing' unpriced line, build the label in the panel from the id suffix plus a new i18n key, rather than using core's English 'indexing and ingestion'.

Leave the core strings unchanged. The PDF export prints the s

## C24. [medium] An assumption shows the wrong token count when the step label contains a colon followed by a digit
- **Location:** apps/web/src/workflow/panel-model.ts:60-61
- **Input:** An AI step with label 'Escalate: tier 2', task classify, ai qwen3.8-flash (any model-generated label with a digit after a colon).
- **Actual:** Raw assumption 'Escalate: tier 2: 700 input tokens (PLAN section 9).' renders as 'Escalate: tier 2: assume 2 input tokens.' Output shows 'assume 2 output tokens' (actual 40) and prefix shows 'static prefix 2 tokens' (actual 400). detail = text after the first ':' (inside the label), so /\d[\d,]*/ matches the label's '2'.
- **Expected:** 'Escalate: tier 2: assume 700 input tokens.' (and 40 / 400).
- **Fix proposed:** Parse after the label rather than after the first colon: detail = a.text.slice(step.length + 1) when a.text starts with the node label. Better still, have core expose the numeric value on the assumption (e.g. {key, text, value}) and stop scraping the English text.

- **Verifier notes:** Best fix: core's assume() should carry the number as structured data, e.g. {key, text, value}, set at workflow-estimate.ts:269-276. The panel then reads a.value and stops scraping English text.

Minimal web-only fix in panel-model.ts: strip the known label prefix before matching. For example: `const head = step + ': '; const detail = a.text.startsWith(head) ? a.text.slice(head.length) : a.text.slice(a.text.indexOf(':') + 1);`. This works because step is the same n.label that core used. Or anchor the regex to core's own phrasing, e.g. /(\d[\d,]*) (?:input|output) tokens|static prefix (\d[\d,]*) tokens|= (\d[\d,]*)/, which also covers the agent forms 'base prompt B = 2000' and 'final answer a = 250'. Add a panel-model test that uses a label with a colon and a digit after it. | Minimal fix in panel-model.ts:60: skip the label before parsing, e.g. `const detail = a.text.startsWith(step + ':') ? a.text.slice(step.length + 1) : a.text.slice(a.text.lastIndexOf(':') + 1);`. lastIndexOf alone also works, because none of the three core templates (input, output, prefix) contains a colon after the label separator. Robust fix: have estimateWorkflow return the numeric value on the assumption (e.g. {key, text, value}) and render from that, rather than reading numbers back out of English text. A regression test should use a label such as 'Escalate: tier 2' on an ai step and on an agent step.

## C25. [low] Default-count assumptions render with a doubled period ('1..', '1.을(를)')
- **Location:** apps/web/src/workflow/panel-model.ts:70
- **Input:** Any fixture with a loop, repeat group or agent at defaults, e.g. support-email-triage (loops l9/l13), in en and ko.
- **Actual:** Core text 'loops:l13:typical: typical assumes 1.' matches /assumes ([\d,.]+)/, which captures '1.' including the sentence period. The panel shows 'l13: assumed Typical value 1..' and in Korean 'l13: 일반 시나리오 값으로 1.을(를) 가정합니다.' This appears in every fixture with loops, groups or agents (231 assumption rows).
- **Expected:** '… value 1.' / '… 1을(를) 가정합니다.'
- **Fix proposed:** Use /assumes (\d[\d,]*(?:\.\d+)?)/ so a trailing period is never captured, or have core pass the number separately.

- **Verifier notes:** In apps/web/src/workflow/panel-model.ts:70, change the regex to /assumes (\d[\d,]*(?:\.\d+)?)/. A decimal point is then captured only when digits follow it, so the sentence period is left out while values like 0.5 and 1,000 still parse. A sturdier option is to have core expose the default number on the assumption entry (for example a `value` field), so the UI stops parsing English prose. Add a panel-model test that checks the result for 'x: typical assumes 1.' does not contain '..'. | In apps/web/src/workflow/panel-model.ts:70, change the regex to /assumes (\d[\d,]*(?:\.\d+)?)/. It never captures the trailing sentence period and still accepts a decimal such as 0.5. Add a test to panel-model.test.ts: assumptionText({key:'loops:l1:typical', text:'loops:l1: typical assumes 1.'}, wf, makeT('en')) should not contain '..'. Separately, and not part of this finding: for loops the {step} shown is the raw edge id ('l13') rather than a readable label.

## C26. [low] Loop and share drivers and loop assumptions show raw edge ids (l9, l13) instead of edge labels
- **Location:** apps/web/src/panel/WorkflowCost.tsx:40 (loop driver label uses edge.id), :37 (share falls back to edge.id); apps/web/src/workflow/panel-model.ts:58 (step name lookup ignores workflow.edges)
- **Input:** support-email-triage: l9 has label 'Revise'; l11/l12/l13 have no label but outcomes approve/reject/edit.
- **Actual:** Drivers read 'l9 · Extra loop passes · Typical' although l9 is labelled 'Revise', plus 'l11 · Share of runs', 'l12 · Share of runs' and 'l13 · Share of runs'. Assumptions read 'l13: unbounded retries assume at most 3 extra passes.' and 'l9: counts are extra passes after the initial execution.', because assumptionText finds the id in workflow.edges but names the step from nodes or groups only.
- **Expected:** Use the edge label ('Revise'). With no label, use a readable name such as the from→to node labels or the localized outcome (e.g. 'Approve exact email → Send approved email').
- **Fix proposed:** Add an edgeName(edge, workflow, t) helper (label, else '<from label> → <to label>'). Use it at WorkflowCost.tsx:37 and :40, and in assumptionText: step = nodes[id]?.label ?? groups[id]?.over ?? (edges[id] ? edgeName(edges[id]) : id).

- **Verifier notes:** Add one helper in panel-model.ts: `edgeName(edge, workflow, t)`. It returns edge.label if there is one. Otherwise it returns the localized outcome when edge.outcome is set, or else `${nodes[from].label} → ${nodes[to].label}`. Use it in three places: WorkflowCost.tsx:37 (branch), WorkflowCost.tsx:40 (loop), and panel-model.ts:58 (`?? (workflow.edges[id] ? edgeName(workflow.edges[id], workflow, t) : id)`). That gives the panel and export/pdf.ts one source for these names. pdf.ts already calls assumptionText, so the PDF picks up the fix automatically. The 'value 1..' double period in the default-assumption rows is a separate cosmetic issue and is outside this finding. | Add a helper that names an edge from the same source the canvas uses (scene.ts:61), so the panel and the diagram agree: edgeName(edge, workflow, t) = edge.label ?? (edge.outcome ? `${nodes[edge.from]?.label ?? edge.from} → ${t('workflow.outcome.' + edge.outcome)}` : `${nodes[edge.from]?.label ?? edge.from} → ${nodes[edge.to]?.label ?? edge.to}`). Use it in three places:
- WorkflowCost.tsx:37, replacing (edge.label ?? edge.id)
- WorkflowCost.tsx:40, replacing edge.id
- panel-model.ts:58: step = nodes[id]?.label ?? groups[id]?.over ?? (edges[id] ? edgeName(edges[id], workflow, t) : id)

For this fixture that gives 'Revise', 'Approve exact email → Approved' and 'Approve exact email → Edit requested'. Showing the outcome alone ('Approved · Share of runs') would be ambiguous when two approval steps exist. Add a panel-model test that asserts no assumption or driver text starts with a raw edge id.

## C27. [low] Values above the estimator's caps are accepted and shown in the field, while the estimate silently uses the cap and prints raw internal text
- **Location:** apps/web/src/workflow/settings.ts:18-57 (no upper limits) vs packages/core/src/workflow-estimate.ts:47,141-145 (LIMITS, `${key}: capped at ${limit}.`); fallthrough at apps/web/src/workflow/panel-model.ts:74
- **Input:** Runs per month = 2000000000; Intent and urgency · Input tokens = 5000000; Screen injection · detection types = 500.
- **Actual:** applyEstimateEdit accepts all three, and the fields keep showing them. The estimate uses 1,000,000,000 runs, 1,000,000 tokens and 100 types, and the assumptions list shows untranslated internal keys in every language: 'runsPerMonth: capped at 1000000000.', 'route:input: capped at 1000000.', 'guard:guard-types: capped at 100.'.
- **Expected:** The edit is rejected with a range error naming the maximum, or else a localized cap note that uses the step label. A value the estimate ignores should not be accepted silently.
- **Fix proposed:** Export LIMITS from core and enforce them in applyEstimateEdit (runsPerMonth ≤ volume, tokens ≤ tokens, items ≤ items, guardTypes/searches ≤ calls, agent requests ≤ min(turns, requests)). Also add a 'limit' suffix branch to assumptionText with a localized key.

- **Verifier notes:** 1. Export LIMITS from packages/core/src/workflow-estimate.ts. In applyEstimateEdit, return a range error that names the maximum for each over-cap value:
   - runsPerMonth > volume
   - steps inTokens/outTokens and agents resultTokens > tokens
   - items > items
   - guardTypes and agents searchesPerRequest > calls
   - agents typical/upper > requests (already bounded by turns)
   Also set a matching `max` on the input (WorkflowCost.tsx:90) so the browser flags the value before apply.

2. If cap notes can still arise, for example from model-supplied node fields such as turns or loop max, add a `limit` branch to assumptionText with a localized key. Take the value from /capped at (\d+)/. 'runsPerMonth:limit' needs its own branch that uses t('workflow.cost.runs') as the label, because its parts[0] is not a node, group or edge, and the generic step lookup would render the raw key. For node keys, resolve the step label and the field label: input, output, guard-types, results, searches. | Keep the fix inside apps/web/src; do not export core LIMITS or enforce them in applyEstimateEdit, since the design does not require it.
1. In assumptionText (panel-model.ts), before the final fallback, add a branch for suffix === 'limit'. Take the step from the earlier key parts using the same id lookup; for 'runsPerMonth' use t('workflow.cost.runs'), and for items keys use groups[id].over. Take the value from /capped at ([\d,]+)/.
2. Add workflow.assumption.limit ('{step}: capped at {value}.') to strings.json in en, ko and zh.
3. Optionally add a max attribute to the matching Driver inputs as a hint.

## C28. [low] An unrecognized unpriced reason (MCP tool) is shown as raw English in every language
- **Location:** apps/web/src/workflow/panel-model.ts:88-90 (unpricedReason falls back to the raw string); source packages/core/src/workflow-estimate.ts:313 passes tool.note as the reason
- **Input:** An agent with an attached tool step {kind:'tool', tool:'mcp'}, in Korean.
- **Actual:** The Not priced row shows 'MCP server · call: Tokens plus whatever each server charges. SSE servers only, at most 10 per request, on listed models.' This is the models.json note, in English, and not in the REASONS map.
- **Expected:** A localized reason, such as the existing 'workflow.cost.reason.tool' or a new MCP-specific key.
- **Fix proposed:** In unpricedReason, map any reason for a ':tool' line that isn't in REASONS to t('workflow.cost.reason.tool'), or add a dedicated key for mcp. Also localize the unit, as in the units finding.

- **Verifier notes:** Keep the MCP-specific meaning instead of falling back to the generic "No confirmed tool fee."

1. Add a `workflow.cost.reason.mcp` key to apps/web/src/i18n/strings.json in en, ko and zh. Example en text: "Model tokens plus whatever each MCP server charges; server fees are not priced." The key-parity test will require all three languages.
2. Add the exact models.json mcp note string to REASONS in apps/web/src/workflow/panel-model.ts, mapped to 'mcp'.
3. Add a guard test. For every tool in models.json with no fee and no freeUntilNotice, assert that `unpricedReason(tool.note, makeT('ko')) !== tool.note`. REASONS is keyed on exact English text, so without this test an edit to the catalog note would silently undo the localization.

Alternatively, have core emit a stable reason sentence for unfeed tools, rather than the free-form catalog note, and map that sentence instead. | Add a dedicated key, `workflow.cost.reason.mcp`, in en, ko and zh. In English it would read "Model tokens plus whatever each MCP server charges.", with ko and zh translations. Map the MCP case to it in unpricedReason: either add the exact models.json note string to REASONS, or better, have the estimator emit a stable reason or key for `${id}:tool` lines where tool.id === 'mcp' instead of the free-text note. Falling back to the generic 'workflow.cost.reason.tool' ("No confirmed tool fee.") would also fix the language, but it drops the useful "each server charges" detail. Add a panel-model test that checks the ko output for an mcp step is not the English note. The PDF export at export/pdf.ts:477 calls the same function, so it gets the fix automatically.

## C29. [low] 'Use default' leaves a rejected value in the field when no override exists
- **Location:** apps/web/src/panel/WorkflowCost.tsx:77 (draft only re-syncs when value changes) and :95
- **Input:** Runs per month with no override. Type -5, press Enter (error shown), then click 'Use default'.
- **Actual:** The error clears and aria-invalid becomes false, but the input still shows '-5'. value stays undefined, so the useEffect never resets the draft. The next blur (Tab) runs apply() again and the error comes back.
- **Expected:** After 'Use default' the field is empty, showing the 'Use default' placeholder, and has no error.
- **Fix proposed:** In apply(), when reset is true (or the input is ''), also call setDraft('') after a successful result, and keep the useEffect for external changes.

- **Verifier notes:** The draft has to be cleared on a successful reset, because `value` does not change in this case and the [value] effect never fires. In Driver.apply: `if (!result.ok) { setError(result.key); return; } setError(null); if (input === undefined) setDraft(''); p.actions.setWorkflowEstimate(result.value);`. Keep the [value] effect so changes made elsewhere still re-sync the field. | In Driver.apply() (WorkflowCost.tsx:79-84), clear the draft on a successful reset: `if (!result.ok) { setError(result.key); return; } setError(null); if (reset) setDraft(''); p.actions.setWorkflowEstimate(result.value);`. Keep the useEffect on line 77 for changes made elsewhere.

After a reset, the blur check on line 91 compares '' with '', so blur no longer re-applies a stale draft, which also fixes S2. If the reset itself fails (for example, a paired typical/upper check on items, loops or agents), the draft is kept, which is correct.

## C31. [medium] Default-scenario assumptions end in a doubled period ('4..', '4.을(를)', '4.。')
- **Location:** apps/web/src/workflow/panel-model.ts:70
- **Input:** Any workflow with an agent, a loop or a repeat group, with no cost overrides. For example support-email-triage, where loops l9 and l13 have default typical/upper values.
- **Actual:** The cost panel assumption list in the browser. en: 'l9: assumed Typical value 1..' and 'Research agent: assumed Upper value 8..'. ko: 'l9: 일반 시나리오 값으로 1.을(를) 가정합니다.' zh: 'l9：假设典型场景值为 1.。'. The regex /assumes ([\d,.]+)/ also captures the sentence-final '.' of core's text '…: typical assumes 1.'.
- **Expected:** 'l9: assumed typical value 1.' / '…1을(를) 가정합니다.' / '…为 1。'
- **Fix proposed:** Use /assumes (\d[\d,]*(?:\.\d+)?)/, or strip a trailing '.' from the capture. While there, the 'Typical'/'Upper' capital mid-sentence in en reads oddly. Consider lowercase scenario words, or naming the quantity (requests, items, loop passes) in the key.

- **Verifier notes:** In apps/web/src/workflow/panel-model.ts:70, change the regex to /assumes (\d[\d,]*(?:\.\d+)?)/. It still matches decimals such as 1.5 and drops the sentence-final period. Add a panel-model unit test asserting that assumptionText({key:'loops:l9:typical', text:'loops:l9: typical assumes 1.'}, ...) returns 'l9: assumed Typical value 1.' in en, with matching cases for ko and zh. A sturdier option for later: have core expose the numeric value on the assumption so the UI does not parse English text. | The minimal fix is in panel-model.ts:70: use /assumes (\d[\d,]*(?:\.\d+)?)/ so a decimal is still captured but the sentence-final period is not. The equivalent alternative is /assumes ([\d,.]*\d)/. Add a panel-model.test.ts case asserting that assumptionText({key:'loops:l9:typical', text:'loops:l9: typical assumes 1.'}, ...) gives 'l9: assumed Typical value 1.' in en. A sturdier fix is for core to expose the numeric default structurally on the assumption (for example a value field), so the UI stops parsing English prose. That would be a contract change in packages/core/src/types.ts, so it is optional. The capitalised 'Typical'/'Upper' mid-sentence in en is a separate copy nit and not part of this defect.

## C32. [medium] Cost assumptions and editable cost drivers name links by internal id (l9, l11, lr)
- **Location:** apps/web/src/workflow/panel-model.ts:57-58; apps/web/src/panel/WorkflowCost.tsx:37,40
- **Input:** support-email-triage in any language. Open 'Steps and why', then the cost section and 'Edit cost drivers'.
- **Actual:** Assumptions: 'l9: counts are extra passes after the initial execution.', 'l13: unbounded retries assume at most 3 extra passes.' (ko/zh: 'l9: 횟수는…', 'l13：…'). The step lookup checks only nodes[id].label and groups[id].over, then falls back to the raw id, so edges always show their id. Driver legends: 'l9 · Extra loop passes · Typical'. Line 40 uses edge.id unconditionally, even though l9 has the label 'Revise'. Also 'l11 · Share of runs', 'l12 · …', 'l13 · …': line 37 falls back to the id for outcome-only branches. Users cannot tell which branch share they are editing.
- **Expected:** 'Revise: counts are extra passes…', 'Revise · Extra loop passes · Typical', 'Approved · Share of runs' (or 'Approve exact email → Send approved email').
- **Fix proposed:** Add one edgeName(edge, workflow, t) helper: label, else the outcome text, else '<from label> → <to label>'. Use it in WorkflowCost.tsx:37 and :40. In assumptionText, resolve workflow.edges[id] through the same helper before falling back to the id.

- **Verifier notes:** Add a shared edgeName(edge, workflow, t) in panel-model.ts that matches the canvas label logic in scene.ts:60-64. Return edge.label, else t('workflow.outcome.' + edge.outcome) when an outcome is set ('Approved', 'Edit requested', 'Rejected' already exist in en/ko/zh), else '<from label> → <to label>'. Use it in WorkflowCost.tsx:37 and :40. In assumptionText line 58, add `?? (workflow.edges[id] && edgeName(workflow.edges[id], workflow, t))` before the `?? id` fallback. Separately, tighten the value regex on line 70 to `/assumes ([\d,]+(?:\.\d+)?)/` so the sentence-ending period is not captured. | Add one helper, `edgeName(edge, workflow, t)`, in workflow/panel-model.ts. It uses the same naming as the canvas (scene.ts:61 and WorkflowPopover.tsx:41-42), in this order:
1. `edge.label`
2. the localized outcome, `t('workflow.outcome.' + edge.outcome)`
3. `nodes[from].label + ' → ' + nodes[to].label`
4. `edge.id`, as a last resort

Use it in WorkflowCost.tsx at line 37 (branch shares) and line 40 (loop passes).

In assumptionText at line 58, resolve the name as:

```
workflow.nodes[id]?.label ?? workflow.groups[id]?.over ?? (workflow.edges[id] ? edgeName(workflow.edges[id], workflow, t) : id)
```

That also corrects the PDF, which calls assumptionText at export/pdf.ts:479.

Separately, change the regex at panel-model.ts:70 to `/assumes (\d[\d,]*(?:\.\d+)?)/` so it stops capturing the final period.

## C33. [low] Above-limit cost inputs produce raw English internal-key assumptions in every language
- **Location:** apps/web/src/workflow/panel-model.ts:51-74 (falls through to `return a.text` at :74); apps/web/src/workflow/settings.ts:22-24
- **Input:** In 'Edit cost drivers', set a step's Input tokens to 5000000, or Runs per month to 2000000000.
- **Actual:** applyEstimateEdit accepts both: probe output {ok:true,value:{steps:{draft:{inTokens:5000000}}}} and {ok:true,value:{runsPerMonth:2000000000}}. The core estimator then emits keys '<id>:input:limit' and 'runsPerMonth:limit'. assumptionText has no 'limit' branch, so the list shows core's raw text in en, ko and zh alike: 'draft:input: capped at 1000000.' and 'runsPerMonth: capped at 1000000000.'. These include internal field keys. 'arithmetic:limit' and 'resources' fall through the same way.
- **Expected:** Either applyEstimateEdit rejects values above core LIMITS with 'workflow.cost.invalid', whose copy already says 'within the allowed range', or a localized line such as '{step}: capped at {value}.'
- **Fix proposed:** Mirror core LIMITS (tokens 1e6, volume 1e9, items 1e4, calls 100, requests 50) in applyEstimateEdit and return 'workflow.cost.invalid' when exceeded. Also add a 'workflow.assumption.limit' key in en/ko/zh and map suffix 'limit' to it.

- **Verifier notes:** Do both. (1) In applyEstimateEdit, enforce the same upper bounds as core for each map and field, and return 'workflow.cost.invalid' when a value is above them: steps.inTokens/outTokens and agents.resultTokens up to 1e6 (tokens), runsPerMonth up to 1e9 (volume), items up to 1e4, agents.typical/upper up to 50 (requests), agents.searchesPerRequest and guardTypes up to 100 (calls), loops up to 100 (iterations). Better still, export LIMITS from @ali/core/workflow-estimate.ts so the two cannot drift apart. Add max={limit} to the number input as well. (2) In assumptionText, add a 'limit' branch so settings saved before this change, and any other path, still produce localized text. Add 'workflow.assumption.limit' ("{step}: capped at {value}.") in en, ko and zh. Resolve {step} as today; use t('workflow.assumption.runsPerMonth')'s subject (or t('workflow.cost.runs')) for runsPerMonth. Take {value} from /capped at (\d+)/ and format it with toLocaleString. | 1. Add `workflow.assumption.limit`, "{step}: capped at {value}.", to en, ko and zh in apps/web/src/i18n/strings.json with identical placeholders. The parity test in i18n/t.test.ts requires all three.
2. In assumptionText (apps/web/src/workflow/panel-model.ts), add this branch before `return a.text` at :74:

```ts
if (suffix === 'limit') {
  const value = /capped at (\d+)/.exec(a.text)?.[1];
  const label = a.key === 'runsPerMonth:limit' ? t('workflow.cost.runs') : step;
  if (value) return t('workflow.assumption.limit', { step: label, value: Number(value).toLocaleString() });
}
```

Node and group ids already resolve to the node label or the group's `over` through the existing `parts.find`.
3. Optionally, append the field label (workflow.cost.inTokens, workflow.cost.items and so on) so the line says which driver was capped.

Rejecting values above LIMITS in applyEstimateEdit is optional UX polish, not the fix: the design leaves capping to core.

## C34. [low] Cost tables render untranslated core English (units, labels, MCP reason) in ko/zh
- **Location:** apps/web/src/panel/WorkflowCost.tsx:57-62; apps/web/src/workflow/panel-model.ts:77-90
- **Input:** ko or zh UI, support-email-triage. To see the MCP case, also add an agent with an attached {kind:'tool', tool:'mcp'} step.
- **Actual:** ko and zh show English. Units: 'CU-second', 'reviewer hour', 'GB-month / capacity', 'document tokens', 'call', 'mtok', 'compute CU', 'instance-month'. Labels: 'Retrieve help centre: indexing and ingestion · document tokens: 문서 수…'. Unpriced reason: 'CRM lookup · call: Tokens plus whatever each server charges. SSE servers only, at most 10 per request, on listed models.' REASONS maps only the 9 core sentences; models.json tool.note for mcp is passed through verbatim.
- **Expected:** Units, the indexing suffix and the MCP reason translated in ko and zh, like the other cost.reason.* strings.
- **Fix proposed:** Add 'workflow.cost.unitName.<unit>' keys and 'workflow.cost.reason.mcp' in all three languages. Map l.unit through them with an English fallback. Have core emit the indexing line with a separate kind, not an English label suffix, or strip and translate the suffix in the web layer.

- **Verifier notes:** Keep the change to apps/web/src/panel/WorkflowCost.tsx, apps/web/src/workflow/panel-model.ts and apps/web/src/i18n/strings.json. No core contract change is needed, and export/** belongs to another job.

1. **Units:** add a helper `unitText(unit, t)` that looks up `workflow.cost.unitName.<unit>` and falls back to the raw unit. The unit set is open-ended (FEES, model `price.unit`, `tool.fee.unit` such as 'page'), so the fallback is required. Use it at WorkflowCost.tsx:58, :60 and :62. Add ko and zh entries for:
   - mtok
   - detection call
   - event
   - message
   - transition
   - call
   - page
   - reviewer hour
   - CU-second
   - compute second
   - compute CU
   - GB-month / capacity
   - document tokens
   - instance-month
   - control-plane hour
   - model usage

2. **Indexing suffix:** for unpriced rows whose id ends in ':indexing', render `workflow.nodes[owner].label + ': ' + t('workflow.cost.indexing')` instead of the core label.

3. **MCP:** for a ':tool' row whose node has `tool === 'mcp'`, use an optional `workflow.cost.reason.mcp` key. Do not match on the note text. Alternatively, accept the catalog-English convention for this one row. | The fix stays in the web layer, without touching core.

1. **Unit names.** Add `workflow.cost.unitName.*` keys in en, ko and zh for the closed set the estimator and models.json emit:
   - mtok, call, page, message, event, transition
   - detection call, control-plane hour, instance-month
   - CU-second, compute CU, compute second
   - GB-month / capacity, document tokens, reviewer hour, model usage
   - 10k-chars, image

   Add a `unitName(unit, t)` helper in panel-model.ts beside `unpricedReason`. It maps the string to a key and falls back to the raw text. Use it for `l.unit` at WorkflowCost.tsx:58, 60 and 62. Keeping 'mtok' and 'CU-' as technical terms inside the translations is acceptable.

2. **Indexing label.** For unpriced items whose id ends in ':indexing', rebuild the label in the web layer as `workflow.nodes[nodeId].label + ': ' + t('workflow.cost.indexing')`. This uses the same id-suffix keying `assumptionText` already uses. Do not render the core label verbatim.

3. **MCP reason (optional polish).** The current fallback is acceptable. If wanted, add `workflow.cost.reason.mcp`, selected when the unpriced id ends in ':tool' and the node's `tool` is 'mcp'. Otherwise keep th

## C35. [low] Price source column shows internal research file paths to end users
- **Location:** apps/web/src/panel/WorkflowCost.tsx:57,60
- **Input:** Any workflow with priced lines or a fixed item, e.g. one that uses DashVector or AgentCore. Open the cost section in any language.
- **Actual:** <small>{l.source}</small> renders core's source strings verbatim: 'research/ai-workflows/verify/NOTES.md Batch 6; Adjudicate-3: instance sizing required', 'NOTES Adjudicate-3; Batch 7', 'NOTES Adjudicate-2 (cache); Batch 6 (inputs); Adjudicate-4 (tools)'.
- **Expected:** A customer-facing citation, for example the Alibaba Cloud pricing page name or URL, or no source.
- **Fix proposed:** Map internal source ids to public citation text or URLs in a localized table, or hide the internal reference and keep it for the PDF/audit only.

- **Verifier notes:** Expose a public citation from core next to the internal audit id, for example a sourceUrl or source key, using the Alibaba Cloud international pricing page for each product or model. In apps/web/src/panel/WorkflowCost.tsx:57 and :60, render it as a link under the localized t('workflow.cost.source') label, or render nothing when no public citation exists. Keep the NOTES.md references for internal audit only. Until then, a minimal fix is to drop <small>{l.source}</small> from both lines. | Give the panel the rule export/pdf.ts:483 already uses. At WorkflowCost.tsx:57 and :60, render `l.source` only when it matches `/^https:\/\//`. Render it as a link labelled with `t('workflow.cost.source')`; for a non-URL source, render nothing. The NOTES provenance stays in core and its tests for audit. This matches the design's "source links where supplied", stays out of export/**, and needs no NOTES-id mapping table to maintain. Once public pricing-page URLs are added to FEES or models.json, the panel and the PDF both show them with no further change.

## C36. [low] Global-scope note is shown twice in the cost section
- **Location:** apps/web/src/panel/WorkflowCost.tsx:63-64
- **Input:** Set Scope to Global in the header session settings, then open the cost section.
- **Actual:** The note appears twice in all three languages. It appears once as an assumption <li> (assumptionText maps 'scope:global' to workflow.cost.globalNote) and again as the <p> at line 64. Browser: en/ko/zh each list two matches, e.g. 'LI:价格采用国际范围，全球范围通常更低。' and 'P:价格采用国际范围，全球范围通常更低。'.
- **Expected:** The note appears once.
- **Fix proposed:** Delete line 64, or skip the 'scope:global' assumption when rendering the list.

- **Verifier notes:** Delete WorkflowCost.tsx:64. The 'scope:global' assumption already produces the note through assumptionText. pdf.ts:479 renders assumptions the same way and has no separate globalNote line, so this deletion leaves the panel and the PDF each showing the note once. | Delete WorkflowCost.tsx:64 (`{e.scope === 'global' && <p>{t('workflow.cost.globalNote')}</p>}`). The assumption list already shows the note in the user's language through assumptionText. The same assumption list also feeds other consumers of estimate.assumptions, such as the export, which is out of scope here, so the <li> should stay. A small render or unit test should check that the note appears exactly once when scope is 'global'.

## C41. [low] Hard-coded ASCII ': ' in workflow JSX mixes with full-width '：' in zh
- **Location:** apps/web/src/panel/WorkflowCost.tsx:48,60,62; apps/web/src/canvas/WorkflowPopover.tsx:35
- **Input:** zh UI, open the cost section or a popover of a step with approval set.
- **Actual:** '每月运行次数: 10,000' (screenshot 800-zh-cost.png) and 'CRM lookup · call: Tokens…', while strings.json uses '：' throughout zh (e.g. '{step}：…', '分支：{condition}').
- **Expected:** '每月运行次数：10,000'
- **Fix proposed:** Move these into templates, e.g. 'workflow.cost.runsValue': '{label}: {value}' (en/ko) and '{label}：{value}' (zh). Alternatively add a 'punct.colon' string and use it in place of the literal.

- **Verifier notes:** Add one shared template key instead of one key per site, for example 'workflow.labelValue': '{label}: {value}' in en and ko and '{label}：{value}' in zh. Render each of the four sites through it, e.g. t('workflow.labelValue', { label: t('workflow.cost.runs'), value: e.runsPerMonth.toLocaleString(p.lang) }). For lines 60 and 62, pass label = l.label + ' · ' + l.unit. Some cost-line labels come from the estimator itself, such as 'Check evidence: Function Compute (FC)'. Those also carry an ASCII colon and need a separate look if zh typography matters there. | Fix the two lines that are fully localised, WorkflowCost.tsx:48 and WorkflowPopover.tsx:35. Add new keys to strings.json in en, ko and zh with identical placeholders, because the i18n/t.test.ts parity check requires it:

- `workflow.cost.runsValue`: en 'Runs per month: {value}', ko '월간 실행 횟수: {value}', zh '每月运行次数：{value}'
- `workflow.pop.approvalValue`: en 'Approval: {state}', ko '승인: {state}', zh '审批：{state}'

Then use them in the components:

- `t('workflow.cost.runsValue', { value: e.runsPerMonth.toLocaleString(p.lang) })`
- `t('workflow.pop.approvalValue', { state: t(...) })`

Use `{value}` and `{state}` rather than `{n}` to stay out of the plural lookup path. Keep `workflow.cost.runs`, which the driver label at WorkflowCost.tsx:10 still uses.

Lines 60 and 62 get only partial benefit, since their label and unit are English strings from core that already contain ASCII ': ' (workflow-estimate.ts:358, 361, 374). Leave them unless core labels are localised.

## C43. [high] Escape in a cost-driver field commits the edited value and collapses the panel instead of restoring the draft
- **Location:** apps/web/src/panel/WorkflowCost.tsx:93 (Escape branch, no stopPropagation) with :91 (onBlur apply) and apps/web/src/panel/WorkflowPanel.tsx:30
- **Input:** Load support-email-triage. Open the panel and the "cost drivers" disclosure. Focus the "Runs per month" spinbutton, type 5000 and press Escape.
- **Actual:** Escape bubbles to the section handler, which closes the panel and moves focus to the handle. The input's blur handler then runs apply() with the stale draft '5000'. The store gets session.memory.estimate = {runsPerMonth: 5000}, the panel shows "Runs per month: 5,000", the live region says "Cost estimate updated.", and the panel is collapsed with focus on "Show steps and why each one is here". Control without Escape: estimate stays null and the panel shows 10,000.
- **Expected:** p5design.md:271 says "Escape restoring the draft". Escape should revert the field to its stored value, apply nothing, and leave the panel open with focus in the input.
- **Fix proposed:** In the Driver Escape branch, call e.preventDefault() and e.stopPropagation() so the panel handler does not close the panel. Also guard onBlur against a cancelled edit, for example with a ref that is set on Escape, or compare e.currentTarget.value with the stored value instead of the closure `draft`.

- **Verifier notes:** In the input's Escape branch in WorkflowCost.tsx:93, cancel only when there is something to cancel, and stop the event there:

if (e.key === 'Escape' && (draft !== String(value ?? '') || error)) { e.preventDefault(); e.stopPropagation(); setDraft(value === undefined ? '' : String(value)); setError(null); }

Focus then stays in the input, so the blur commit never runs. The next render makes draft equal the stored value, so a later blur applies nothing. A second Escape on an unchanged field still bubbles up and closes the panel, as expected.

For robustness, the onBlur check could also read e.currentTarget.value instead of the closure draft. With the stopPropagation fix it is no longer needed for this path. | Change the Escape branch at WorkflowCost.tsx:93 so it handles a pending edit itself:

```
if (e.key === 'Escape') {
  const stored = value === undefined ? '' : String(value);
  if (draft !== stored) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(stored);
    setError(null);
  }
}
```

- With an edit pending, the panel handler never runs and focus stays in the input. There is no blur, so the stale draft is never committed.
- A second Escape, with no edit pending, still bubbles and closes the panel, which matches p5design.md:244.
- Don't compare e.currentTarget.value in onBlur. At blur time the controlled input's DOM still holds "5000", so that check guards nothing.
- If you want extra safety, a cancelled ref set on Escape and checked in onBlur is optional.

## C47. [medium] Cost-driver fields for loops and unlabelled branches are named by raw edge ids
- **Location:** apps/web/src/panel/WorkflowCost.tsx:37 (edge.label ?? edge.id) and :40 (edge.id for loops)
- **Input:** Load support-email-triage, open the panel and open the cost drivers.
- **Actual:** The spinbuttons and their fieldset legends are named "l9 · Extra loop passes · Typical", "l9 · Extra loop passes · Upper", "l11 · Share of runs", "l12 · Share of runs" and "l13 · Share of runs". l9 has the label "Revise", which is ignored. l11, l12 and l13 are the approve, reject and edit outcomes of "Approve exact email", and nothing distinguishes them. Every one of the 32 core fixtures has unlabelled branches.
- **Expected:** Names that identify the path (WCAG 2.4.6), for example "Revise · Extra loop passes · Typical" and "Approve exact email → Send approved email (Approved) · Share of runs".
- **Fix proposed:** Build the edge label from edge.label, then the outcome text (t('workflow.outcome.' + outcome)), then the step labels nodes[from].label → nodes[to].label. Use it for both branches and loops and never fall back to edge.id.

- **Verifier notes:** Add one helper in WorkflowCost.tsx (or panel-model.ts) and use it for both branches and loops: `edgeName(edge) = [edge.label, edge.outcome && t('workflow.outcome.' + edge.outcome), (nodes[edge.from]?.label ?? edge.from) + ' → ' + (nodes[edge.to]?.label ?? edge.to)]`. Join the parts that are present, so you get for example "Approve exact email → Send approved email (Approved)", and keep edge.label first when it exists ("Revise"). Never fall back to the bare edge.id. Including the from → to pair keeps the names unique even when two branches share an outcome or label. | Add one shared helper in apps/web/src/workflow/panel-model.ts, `edgeName(edge, workflow, t)`. It joins these parts with ' · ', dropping any that are empty, and never returns the bare id:
1. `nodes[edge.from].label + ' → ' + nodes[edge.to].label`
2. `edge.label`
3. the translated outcome, `t('workflow.outcome.' + edge.outcome)`

Use it in three places:
- WorkflowCost.tsx:37 (branch shares)
- WorkflowCost.tsx:40 (loop passes)
- `assumptionText`, when the matched id is an edge (panel-model.ts:58-59, `step = ...`)

Also replace `?? id` with this helper wherever an id could otherwise reach the screen.

The from→to part matters. Sibling branches can share a label, or have only an outcome, and the endpoint labels are what keep their names unique.

Optionally, group each source step's sibling share inputs in a fieldset whose legend is that step's label.
