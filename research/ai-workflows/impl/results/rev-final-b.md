Found **9 issues**, demonstrated by commands or exact code traces. Repository files were unchanged.

1. **Medium — Corrupt saved layouts pass revival and break canvas geometry.** [sessions.ts:25](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/store/sessions.ts:25)  
   **Repro:** Save a valid one-step layout with `workflow.rowTops[0] = "broken"`, then revive and open it. Revival accepts it; the resulting card has `y: NaN` and bounds have `h: NaN`. Setting two inline cells to identical coordinates also passes and overlaps their cards.  
   **Expected:** Discard the invalid layout and reconstruct it from committed memory.  
   **Fix:** Validate persisted layout fields and rebuilt geometry, including finite coordinates and conflicting inline cells.

2. **Medium — “Use default” can reapply the value it should discard.** [WorkflowCost.tsx:77](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/panel/WorkflowCost.tsx:77)  
   **Exact trace:** With no runs/month override, type `100` and click **Use default** before blurring. The button prevents blur; reset leaves `value` undefined. Because the synchronization effect depends only on `value`, the draft remains `"100"`. Tab away and `onBlur` saves `100`.  
   **Expected:** Clear the draft and retain the default.  
   **Fix:** Explicitly clear draft and error state on successful reset.

3. **Medium — Huge estimates are accepted and persisted, but different values are calculated.** [settings.ts:22](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/workflow/settings.ts:22)  
   **Repro:** Apply `runsPerMonth: 1e100`. Validation returns success and preserves `1e100`; the estimator calculates with `1,000,000,000`. The editor and saved memory therefore disagree with the estimate.  
   **Expected:** Reject values outside supported limits, or visibly normalize them before saving.  
   **Fix:** Share the estimator’s limits with edit validation and input constraints.

4. **Medium — Per-run formatting materially understates the upper estimate.** [panel-model.ts:48](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/workflow/panel-model.ts:48)  
   **Repro:** Render `stub-workflow` with 10,000 runs/month. Actual upper cost is `$0.01476812/run`; the panel displays **`$0.01`**, while monthly cost displays **`$147.68`**. Typical remains `$0.00735`.  
   **Expected:** Comparable precision for both per-run scenarios.  
   **Fix:** Use a dedicated per-run formatter retaining meaningful sub-cent precision; keep monthly formatting separate.

5. **Medium — Tidy is lost on refresh.** [controller.ts:339](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/app/controller.ts:339)  
   **Repro:** Commit `a → b → c`, remove `b`, reconnect `a → c`, then tidy. The live layout moves `c` from column 2 to column 1. Reading the persisted session still returns column 2.  
   **Expected:** Reload preserves the explicitly tidied layout.  
   **Fix:** Save the session after a successful tidy action.

6. **Medium — Follow selects an old step instead of the newly streamed branch.** [WorkflowStage.tsx:113](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/canvas/WorkflowStage.tsx:113)  
   **Repro:** Stream trigger `a`, then steps `b` and `c`, both `after: "a"`. The target-selection code chooses `b`, because it sorts by rightmost column and then uppermost row. Newly added `c` remains outside a normal-height viewport.  
   **Expected:** “Follow new steps” reveals the newly added step. This is a target-selection defect, separate from the known branch spacing.  
   **Fix:** Track the newest changed step and follow its visible card or attachment owner.

7. **Low — Internal pricing metadata and English units reach every locale.** [WorkflowCost.tsx:57](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/panel/WorkflowCost.tsx:57)  
   **Repro:** In-memory rendering of `stub-workflow` in en, ko, and zh produces `mtok`, `NOTES Adjudicate-3`, and `reviewer hour`. Huge-value assumptions also fall through as English, e.g. `runsPerMonth: capped at 1000000000.`  
   **Expected:** Understandable, localized units and customer-facing source descriptions.  
   **Fix:** Translate structured unit/assumption identifiers and map internal references to readable source labels.

8. **Medium — Open popovers do not reposition on resize or camera movement.** [WorkflowPopover.tsx:22](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/canvas/WorkflowPopover.tsx:22)  
   **Exact trace:** Open a card’s details, then resize the window without changing the workflow. Stage size and viewport update, but the memoized card object and anchor element remain identical. The positioning effect does not rerun; the fixed-position dialog retains coordinates calculated for the old viewport.  
   **Expected:** The dialog follows its anchor and stays within current bounds.  
   **Fix:** Observe viewport, stage, panel, and popover geometry changes, or close the dialog when its anchor moves.

9. **Low — Streaming writes to the live region at display-batch frequency.** [reducer.ts:630](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/store/reducer.ts:630)  
   **Repro:** Six step/flush batches over 900 ms produce six announcements: “Workflow updated: 3 steps” through “8 steps.” Each sequence replaces the live-region child in [WorkingView.tsx:72](C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/shell/WorkingView.tsx:72).  
   **Expected:** Bounded progress announcements that leave room for other speech.  
   **Fix:** Throttle announcements independently of canvas rendering and always announce completion.

Browser verification was blocked by the sandbox denying temporary-directory creation. Consequently, actual 800 px rendering and screen-reader behavior remain unverified. No production bundle existed to scan.

Checked and found correct:

- Workflow batching, repair/continuation, commit, stop/fatal rollback, captured retry mode, mixed replay, and normal save/revival passed the selected tests.
- Committed-content export availability and separate document provenance passed.
- NaN, infinity, negative values, fractional counts, and invalid branch shares are rejected by edit validation.
- All **184 `workflow.*` entries** exist in en, ko, and zh; placeholder and plural tests pass. No literal ` ? ` appears in those strings.
- Fit/zoom-floor, directional navigation, hover timing, and initial edge-placement tests pass.
- An injected `<img … onerror=…>` label rendered as escaped text. Reviewed workflow rendering uses React text nodes, without model-controlled HTML, URL, or style insertion.

Codex session ID: 01a19d47-c060-7283-b00e-c10a21911956
Resume in Codex: codex resume 01a19d47-c060-7283-b00e-c10a21911956
