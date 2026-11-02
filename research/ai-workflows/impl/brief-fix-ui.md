# Fix: four workflow UI review findings (phase 5 review, 2026-11-03)

An extra-high review of the phase 5 UI found these. Its full text is below. Reproduce each one before fixing it. Then add a regression test that uses the exact input from the reproduction: it must fail before your fix and pass after.

The review ran in another worktree, so its line numbers may have moved a little. Files in this worktree carry the same names.

## Finding 1, medium: splice operations lose their layout semantics
`apps/web/src/store/reducer.ts` (around line 782).

**Reproduction:** start with `a → b`. Then stream `{t:"splice",into:"ab",id:"x",kind:"human",label:"Review"}` and flush.
- The reducer produced `a=(0,0), b=(1,0), x=(1,1)`.
- Calling the layout API with the same operation produced the expected `a=(0,0), x=(1,0), b=(2,0)`.

The store calls `layoutWorkflow` without `{op}`, and the splice shift needs that op to authorise it. So the inserted step appears beside its successor instead of between the two original steps.

**Fix:** keep each operation's provenance through batching, and apply the splice-aware layout transitions in order. The streaming path, replay and session revival must all give the same cells as the layout API.

## Finding 2, medium: empty workflows strand retained cloud content
`apps/web/src/shell/Header.tsx` (around line 34) and `apps/web/src/export/ExportButton.tsx` (around line 60).

**Reproduction:** in a mixed session, select the workflow view and remove its last step. The cloud nodes remain. The actual predicates returned:
- `canExport: true`
- `exportButtonDisabled: true`
- `diagramSelectorVisible: false`

`productCount` follows the selected mode, so Export counts the empty workflow twice. The selector disappears because it requires workflow nodes.

There is a second problem in the same area: a mixed session that has cloud recommendations but no cloud nodes never gets a cloud option.

**Expected:** retained cloud content stays selectable and exportable.

**Fix:**
- use the committed `canExport` for export availability;
- build the diagram choices from both documents, including cloud recommendations;
- keep a way out of an emptied active view.

## Finding 3, medium: boolean cost edits are discarded on blur or mode change
`apps/web/src/panel/WorkflowCost.tsx` (around line 86).

**Trace:** with no `steps.draft.thinking` override, select "Enabled" and Tab away. The select's handler only calls `setDraft("true")`. It has neither the numeric input's blur handler nor its Enter handler, so no controller action runs and `memory.estimate` stays unchanged. Switching views unmounts the editor, and the displayed choice is lost.

**Expected:** applying or blurring persists the edit, as the design specifies.

**Fix:** give boolean selects the same commit on blur and Enter, or persist their changes immediately. Choose one, and say which.

## Finding 8, low: repeated estimate updates are not announced
`apps/web/src/store/reducer.ts` (around line 262) and `apps/web/src/shell/WorkingView.tsx` (around line 72).

**Reproduction:** dispatch estimate updates for 100 runs/month and then 200 runs/month. Both produce "Cost estimate updated.", and only `seq` changes, from 1 to 2. The shell renders only `live.text`, so the DOM text doesn't change and the second update is never announced.

**Expected:** each successful estimate update is announced.

**Fix:** either use the sequence number to trigger a fresh announcement, or put the changed value in the announcement. If the string changes, update en, ko and zh.

## Files you own
- `apps/web/src/store/**` (reducer, selectors, controller) and its tests;
- `apps/web/src/shell/Header.tsx` and `WorkingView.tsx`, and their tests;
- `apps/web/src/export/ExportButton.tsx` and its tests. Don't edit any other `export/` file; another job owns them;
- `apps/web/src/panel/WorkflowCost.tsx` and its tests;
- the i18n string files, only for strings these fixes need.

**Finally, run the UI e2e check** (`node apps/web/scripts/e2e-workflow.mjs`, which uses headless Chrome) after your changes, and report the result.
