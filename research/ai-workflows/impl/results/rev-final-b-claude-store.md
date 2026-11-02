# Claude frontend review: findings for the store job

## C0. [medium] Workflow repair turn never records its constraint findings, so the fix block reads Fixed while the commit still breaks the requirement
- **Location:** apps/web/src/store/reducer.ts:584-593 (onStatus workflow branch); decision at reducer.ts:671
- **Input:** Workflow turn: req {avoid:['eventbridge']} (or regions:['ap-southeast-1']), step 'in' using eventbridge (or a step labelled 'Write to Frankfurt bucket'), status {code:'repair'} with no constraint warn events (the server never streams them), then a commit whose warnings still contain constraint-avoid / constraint-region with view 'workflow'.
- **Actual:** fix.constraint stays [] at repair start, so onCommit sets fix.state 'fixed'. With a region constraint the console shows a 'Fixed' fix block while the requirement list shows 'broken'. Cloud mode in the same sequence gives fix.state 'failed'.
- **Expected:** fix.constraint holds the findings that triggered the repair, as the cloud branch does at reducer.ts:601-613. A commit that still carries them gives fix.state 'failed' and the FixBlock sentences name the requirement.
- **Fix proposed:** In the workflow branch of onStatus, when follow === 'repair' and r.fix.constraint is empty and work.constraints is non-empty, run checkWorkflowConstraints(rep.workflow, main says, work.constraints, deps.catalog) inside try/catch, filter out severity 'info', and set fix.constraint, mirroring reducer.ts:604-613.

- **Verifier notes:** The fix needs a reducer change plus a separate change in requirements.ts.

1. Reducer: in the workflow branch of onStatus (reducer.ts:584-593), when follow === 'repair':
   - Read `found` from the last revision's fix.constraint.
   - If it is empty and work.constraints is non-empty, build `says` from work.sayOrder keys starting with 'main:'.
   - Set `found = checkWorkflowConstraints(rep.workflow, says, work.constraints, deps.catalog).filter(w => w.severity !== 'info')` inside try/catch.
   - Patch `fix: { ...r.fix, state: 'fixing', constraint: found }`.
   - Call checkWorkflowConstraints directly rather than deps.checkConstraints or defaultConstraintChecker, which mirrors the server at llm.ts:1507.

2. requirements.ts: the reducer change alone does not fix the 'workflow avoid … requirement: held' result. At store/requirements.ts:39, productOf looks only in mem.graph.nodes. For a workflow node id such as 'in' it falls back to the raw id, so concerns() returns false for constraint-avoid. That happens for both commitWarnings and fix.constraint, so a broken or repaired avoid requirement reads 'held'. When the warning has view 'workflow' (or session.mode is 'workflow'), productOf shoul | In the workflow branch of onStatus (reducer.ts:584-593), when follow === 'repair', take the current last-revision fix.constraint. If it is empty and work.constraints is non-empty:
1. Collect the main says: `work.sayOrder.filter(k => k.startsWith('main:')).map(k => work.says[k])`.
2. Run `checkWorkflowConstraints(rep.workflow, says, work.constraints, deps.catalog)` from '@ali/core/workflow-constraints.ts', wrapped in try/catch with [] on error.
3. Filter out severity 'info'.
4. Set `fix: { ...r.fix, state: 'fixing', constraint: found }`.

Call checkWorkflowConstraints directly. Do not route it through deps.checkConstraints, which takes a cloud graph.

This mirrors the server, which checks the repaired workflow (llm.ts:1519-1531). My probe shows this call returns the same constraint-region error that started the repair.

Add a store test: a workflow repair that commits with a constraint warning should give fix.state 'failed', and one that commits clean should give 'fixed', with a non-empty fix.constraint.

## C1. [medium] Workflow avoid requirement reads Held although the workflow commit carries a constraint-avoid error
- **Location:** apps/web/src/store/requirements.ts:38 (productOf), used at :46, :53, :58
- **Input:** Workflow turn pins {text:'Do not use EventBridge', avoid:['eventbridge']} and adds step 'in' with product eventbridge. The commit carries checkWorkflowConstraints' warning {code:'constraint-avoid', ids:['in'], severity:'error', view:'workflow'}.
- **Actual:** requirementViews returns state 'held'. productOf resolves the workflow step id against mem.graph.nodes, the cloud document: it is undefined in a workflow-only session, or the wrong product when the ids collide (the mixed fixture reuses 'in'). concerns() is therefore false. The mid-turn 'checking' state misses for the same reason. The same scenario in cloud mode reads 'broken'.
- **Expected:** 'broken' (Not met), matching the commit warning and the live 'reqBroken' announcement the reducer emits.
- **Fix proposed:** Make the lookup view-aware. For w.view === 'workflow', read mem.workflow?.nodes[id] and treat the warning as concerning c when c.avoid includes either node.product or node.runs. Keep mem.graph for cloud warnings, where view is absent or 'cloud'.

- **Verifier notes:** Make the lookup depend on the view and on the turn phase, and never fall back to the other document:
- **Workflow warnings** (w.view === 'workflow'): look up the step id in the workflow document. Use mem.workflow for committed revisions and work.rawWorkflow for the in-flight revision. Count the warning as concerning c when c.avoid includes node.product or node.runs. checkWorkflowConstraints emits the same node id for either field.
- **Cloud warnings** (view absent or 'cloud'): look up the id in mem.graph for committed revisions and in work.raw for the in-flight revision. Reading the in-flight graph also fixes the mode-independent mid-turn Checking miss.
- **No cross-document fallback:** never let a workflow id fall through to mem.graph. As the collide run shows, a cloud node with the same id but an avoided product would give a false 'broken'.
- **Aliases:** to match the core checker exactly, resolve product ids through the catalog (entryOf) before comparing. Without this, a product stored under an alias would still be missed. | Make the lookup in requirements.ts depend on the warning. Pass `w` into the resolver and return a list. For w.view === 'workflow', read `mem.workflow?.nodes[id]` and use `[node.product, node.runs]` without the empty ones. Otherwise keep reading `mem.graph.nodes[id]?.product`. In concerns(), match when any resolved product is in c.avoid, and keep the fallback to the raw id for recs, whose ids are products. Add a reducer test for a workflow commit carrying a view:'workflow' constraint-avoid error that expects 'broken', with one case for `product` and one for `runs`. The mid-turn 'checking' gap for newly added nodes is a separate issue that affects both modes: it would need the streaming document (work.raw / work.rawWorkflow) rather than committed memory.

## C2. [medium] Requirement state in a mixed session comes from the newest revision of either view, so a workflow turn clears a broken cloud requirement
- **Location:** apps/web/src/store/requirements.ts:34 (doneRev = newest done revision regardless of r.mode)
- **Input:** A cloud turn pins avoid eventbridge and commits node 'bus' (eventbridge) with a constraint-avoid error, so the requirement reads 'broken'. Then a workflow turn commits a step with no warnings and leaves the cloud graph unchanged. Switch back to the Deployment view.
- **Actual:** The requirement flips to 'held' after the workflow turn and stays 'held' in the Deployment view, while memory.graph.nodes.bus.product is still 'eventbridge'. The server's workflow-mode commit checks only the workflow document (llm.ts checkC with workflowMode), so its empty warnings say nothing about the cloud graph.
- **Expected:** The requirement stays 'broken' while the cloud document still violates it. A turn on one view must not clear findings about the other, unchanged view.
- **Fix proposed:** Take the newest done revision per view, using (r.mode ?? 'cloud'). Evaluate each one's commitWarnings and fix.constraint, keeping only warnings whose (w.view ?? 'cloud') matches that view. Combine the results so that broken outranks atRisk, which outranks repaired, which outranks held. Use the matching revision's n for stateRev.

- **Verifier notes:** In requirements.ts, find the newest done revision per view, using (r.mode ?? 'cloud'), and evaluate each one:
- Use only the warnings whose (w.view ?? 'cloud') matches that view.
- Merge the states with this precedence: broken over atRisk, atRisk over repaired, repaired over held.
- Take stateRev from the revision that produced the winning state.

Also make concerns() resolve ids against the matching document. For workflow-view warnings, look the id up in mem.workflow.nodes[id] and check both .product and .runs, not mem.graph.nodes. Without this, the workflow half of the per-view fix can never produce 'broken' for an avoid violation: probe3 shows a workflow constraint-avoid error on step 'act' (direct-mail) leaving the requirement 'held'.

Keep the fix on the client. Making the server's workflow-mode commit also check the cloud graph would mix the two views' findings into one commit and into the repair loop. | The fix has two parts in apps/web/src/store/requirements.ts.

1. **Pick the newest done revision per view.** Use `(r.mode ?? 'cloud')`, one for 'cloud' and one for 'workflow'. For each view:
   - evaluate only that revision's `commitWarnings` and `fix.constraint` entries whose `(w.view ?? 'cloud')` matches the view;
   - combine the two results so that broken outranks atRisk, which outranks repaired, which outranks held;
   - take `stateRev` from the revision that decided the state.

   Apply the same view filter to the in-flight 'checking' branch.

2. **Make `concerns()` view-aware.** On its own, part 1 still leaves workflow avoid violations reading Held, as the v9-reverse probe shows. For a warning with `view === 'workflow'`, resolve each id against `session.memory.workflow?.nodes[id]` (or `work.rawWorkflow` in flight). Treat the warning as concerning `c` when either that step's `product` or its `runs` is in `c.avoid`, because `checkWorkflowConstraints` emits a warning for both fields under the step id. Keep using `mem.graph.nodes[id]?.product` for cloud warnings.

Add a reducer test with two cases:
- a broken cloud commit, then a clean workflow commit: the requirement stays brok

## C3. [medium] Gap lines from a workflow turn disappear at commit
- **Location:** apps/web/src/store/reducer.ts:662-666 (onCommit workflow branch)
- **Input:** Workflow turn streams a step, then {t:'gap', need:'Browser sandbox for the agent', note:'AgentBay access is gated...'}, then commits. The workflow prompt tells the model to emit gap (workflow-prompt.ts:28, :160, :188), and reducer.ts:506 deliberately lets gap through in workflow mode.
- **Actual:** The gap line shows while streaming, but onCommit replaces r.changes and r.fix.changes wholesale with workflowChanges(before, after), so the committed revision has no gap line. Cloud mode keeps it (reconcileChanges keeps kind 'gap', changes.ts:253). As a consequence, export/model.ts:324, which collects gaps from rev.changes, gets none for workflow revisions.
- **Expected:** The committed workflow revision keeps its gap lines, as a cloud revision does.
- **Fix proposed:** In the workflow branch, append r.changes.filter(l => l.kind === 'gap') to changes and r.fix.changes.filter(l => l.kind === 'gap') to fixChanges, tagging them view: 'workflow'. Optionally tag gap lines with the turn's view when they are created in onOp.

- **Verifier notes:** Fix the workflow branch of onCommit in apps/web/src/store/reducer.ts. After the wfLines partition, carry the streamed gap lines forward:

```ts
const changes = workflow
  ? [...wfLines.filter((l) => !repairKeys.has(l.key)), ...r.changes.filter((l) => l.kind === 'gap')]
  : ...;
const fixChanges = workflow
  ? [...wfLines.filter(...).map(...), ...r.fix.changes.filter((l) => l.kind === 'gap')]
  : ...;
```

Gap lines have keys `gap:N`, which never collide with `workflow:*` keys, so repairKeys partitioning is unaffected. Optionally tag them `view: 'workflow'` when they are created in onOp, so highlight and view logic treats them as workflow lines. Add a regression test to apps/web/src/store/workflow.test.ts that streams a gap and asserts the committed revision still has it. | In onCommit's workflow branch (reducer.ts:662-666), keep the streamed gap lines and add them to the rebuilt lists: `const keepGaps = (ls) => ls.filter((l) => l.kind === 'gap').map((l) => ({ ...l, view: 'workflow' as const }));` then `changes = [...wfLines.filter(...), ...keepGaps(r.changes)]` and `fixChanges = [...wfLines.filter(...).map(...), ...keepGaps(r.fix.changes)]`. Also add a reducer test: a workflow turn with a gap op, then a commit, should still have one 'gap' line.

## C4. [low] Highlights and pans from the other view's record leak onto the Deployment canvas and panel
- **Location:** apps/web/src/app/props.ts:111 and :147 (raw ui.highlight passed to cloud Canvas and Panel); ui/panTo has no view (reducer.ts:333-334, props.ts:112; WorkflowStage.tsx:135 has the reverse case)
- **Input:** Mixed session from stub-mixed-workflow (cloud node 'in', workflow step 'in'), plus a cloud node 'db'. Stay on the Deployment view, then hover the tag or a change line of workflow revision 2 in the record, or click that line.
- **Actual:** ui.highlight is {view:'workflow', cards:['in']} and activeHighlight() is null. The cloud canvas, however, receives the raw ui.highlight: litCards (canvas/index.tsx:338) lights the unrelated cloud card 'in' and dims 'db' (:415-424). A click sends ui/panTo {ids:['in']} with no view, and the cloud canvas pans to the cloud card (index.tsx:495-497). In the Workflow view, a cloud line click reveals the same-id workflow card.
- **Expected:** A highlight or pan made in one view's record does nothing on the other view's canvas and panel. activeHighlight already filters correctly for the workflow view.
- **Fix proposed:** In useCanvasProps and usePanelProps, pass activeHighlight(state) instead of ui.highlight. Give the panTo action a view, inferred from the line or revision the same way ui/highlight infers it, and drop a pan whose view differs from session.mode (or switch the view first).

- **Verifier notes:** 1. In useCanvasProps and usePanelProps, pass activeHighlight(state) instead of ui.highlight.
2. Give the ui/panTo action and state an optional view. In the reducer, infer it the same way ui/highlight already does: from the revision with matching cards, or from the change line (line.view, defaulting to 'cloud'). Alternatively, have Revision.tsx and ChangeList.tsx pass r.mode or l.view explicitly.
3. Have both the cloud Canvas and WorkflowStage ignore a pan whose view differs from session.mode. Selecting this in props, so each stage only receives its own view's pans, is the simplest place to do it. | 1. In useCanvasProps and usePanelProps, pass activeHighlight(state) instead of ui.highlight. This also stops the panel from dimming every row on a foreign hover.
2. Give the ui/panTo action an optional view, and stamp it in the reducer the way ui/highlight infers one: from the clicked line's view, or from the revision's mode. ChangeList and Revision can also pass it directly.
3. In useCanvasProps and useWorkflowProps, pass panTo only when (panTo.view ?? 'cloud') === (session.mode ?? 'cloud').
4. Extend the existing workflow.test.ts case so it also asserts on the values the hooks feed to each view, not only on the selector.

## C5. [low] Build marks from a turn in one view are drawn on same-id cards of the other view
- **Location:** apps/web/src/store/selectors.ts:14-18 (buildMarks ignores work.mode); apps/web/src/workflow/props.ts:21 (building: s.work?.built unfiltered)
- **Input:** Mixed session (cloud 'in', workflow 'in'). Start a workflow turn that updates step 'in', flush, and switch the header select to Deployment mid-turn. Or the reverse: start a cloud turn that touches node 'in' and switch to Workflow.
- **Actual:** buildMarks(state) returns ['in'] for the cloud canvas during the workflow turn. In the reverse case the workflow canvas gets building ['in'] from the cloud turn.
- **Expected:** No build marks when work.mode differs from the view on screen.
- **Fix proposed:** buildMarks returns [] unless s.work.mode is 'cloud' (useCanvasProps must then pass the mode in). workflow/props.ts uses s.work?.mode === 'workflow' ? s.work.built : [].

- **Verifier notes:** No change to useCanvasProps is needed, because TurnWork.mode is required and app/props.ts:95 already passes work. In apps/web/src/store/selectors.ts:16, use `if (!s.work || !l || (s.work.mode ?? 'cloud') !== 'cloud') return [];`. In apps/web/src/workflow/props.ts:21, use `building: s.work?.mode === 'workflow' ? s.work.built : []`. The existing reducer.test.ts:59 assertion should still hold, since play() starts turns with no mode and those default to cloud. Add a regression test to workflow.test.ts covering three steps: start a workflow turn that touches 'in', switch session/mode to cloud, and assert buildMarks(state) is empty; then repeat in reverse for the workflow props. | - **Cloud side (`store/selectors.ts:16`):** change the guard to `if (!s.work || !l || s.work.mode === 'workflow') return [];`.
- **Hook:** `useCanvasProps` needs no change, because it already passes `work`. This corrects the reporter's claim that `useCanvasProps` must pass the mode in.
- **Workflow side (`workflow/props.ts:21`):** use `building: s.work?.mode === 'workflow' ? s.work.built : []`.
- **Test:** `reducer.test.ts:59` replays the cloud `ha` fixture, so it stays green.
- **Regression test:** add one to `store/workflow.test.ts`. Replay `stub-mixed-workflow`, start a workflow turn that re-emits step `in`, flush, switch to cloud, then assert `deepEqual(buildMarks(s), [])`.

## C6. [low] Switching the view mid-turn saves the in-flight revision, and after a refresh it shows a permanent 'Fixing' block and an open uncommitted question
- **Location:** apps/web/src/app/controller.ts:340-343 (setMode saves while work is set); apps/web/src/store/sessions.ts:53 (revive clears only changes and statusLine)
- **Input:** In a live workflow turn that has streamed a say, an ask op (q1 'Which payment provider?') and status repair, use the header select to switch to Deployment, then refresh (boot with resumeId).
- **Actual:** The stored record gains the streaming revision. reviveSession turns it into 'stopped' but keeps fix.state 'fixing', the asks, reqs, lifecycle and assumes. After the refresh the console shows a stopped revision with a 'Fixing…' FixBlock and an open question with quick replies that never reached memory. Stop in the same state clears all of these (failedRevision).
- **Expected:** A revived unfinished revision matches what Stop leaves: fix reset, and asks, assumes, reqs and lifecycle emptied. Alternatively, nothing is persisted mid-turn.
- **Fix proposed:** In reviveSession, map waiting and streaming revisions through the same clearing as reducer failedRevision: status 'stopped', fix reset, and reqs, lifecycle, assumes and asks emptied, truncated false, finishing removed. This also covers the existing unpin-mid-turn save. Optionally skip saveSession in setMode while st().work is set.

- **Verifier notes:** The main fix goes in apps/web/src/store/sessions.ts:53. When reviveSession meets a 'waiting' or 'streaming' revision, reset it the same way reducer failedRevision does:
- status 'stopped', error null, statusLine null
- changes, reqs, lifecycle, assumes and asks emptied
- truncated false and finishing deleted
- fix reset to { autoFixes: [], constraint: [], state: 'none', note: '', changes: [] }

Ideally export one shared helper from the reducer and call it from both places. Then add a `if (st().work) return` guard (or skip saveSession while st().work is set) to controller.unpin, setMode and undoUnpin. The unpin button, not the header select, is the live mid-turn trigger at this head. Optionally disable the unpin button while a turn is streaming. Also correct the reported trigger: the select cannot be switched mid-turn in a live session yet, because no live session can hold both diagrams, and the option is labelled "Cloud architecture", not "Deployment". | Primary fix: in reviveSession, map waiting and streaming revisions to the same shape failedRevision produces. Export a shared helper from the reducer, or mirror its fields: status 'stopped', error null, statusLine null, changes [], reqs [], lifecycle [], assumes [], asks [], truncated false, finishing deleted, fix { autoFixes: [], constraint: [], state: 'none', note: '', changes: [] }. revive has no `now`, so keep the stored durationMs. This also covers a tab closed mid-stream and any other mid-turn save. Secondary fix: skip saveSession in setMode while st().work is set. The commit or the next save persists the mode anyway. This alone is not enough, because any other mid-turn save would reopen the gap. Add a sessions.test.ts case where a streaming revision with fix.state 'fixing' and asks revives with fix reset and asks [].

## C7. [low] Tidy is not persisted, so a refresh brings back the pre-tidy layout
- **Location:** apps/web/src/app/controller.ts:339 (tidyWorkflowView dispatches workflow/tidy but never calls saveSession)
- **Input:** Commit a workflow whose arrival order differs from its topological order (end, b, a, then links a->b->end). Press Tidy, then refresh (boot with resumeId).
- **Actual:** session.workflowLayout and the screen hold the tidied cells, but storage keeps the committed ones. After the refresh the canvas shows the pre-tidy layout again.
- **Expected:** Tidy is saved like the other session edits (settings, estimate, mode), so it survives a refresh.
- **Fix proposed:** tidyWorkflowView() { d({ type: 'workflow/tidy' }); if (!st().replay) saveSession(); }. Optionally also bump session.updatedAt in the workflow/tidy reducer case.

- **Verifier notes:** In apps/web/src/app/controller.ts:339, guard like the settings and estimate methods do, then save:
`tidyWorkflowView() { if (st().work || st().replay) return; d({ type: 'workflow/tidy' }); saveSession(); },`
Optionally, have the workflow/tidy action carry `now` and set session.updatedAt in reducer.ts:267, so the session list orders the session by its last edit. | Mirror the other session setters, including their guard, so a refused tidy (mid-stream or in replay) never triggers a save in the middle of a turn: `tidyWorkflowView() { if (st().work || st().replay) return; d({ type: 'workflow/tidy' }); saveSession(); },` in apps/web/src/app/controller.ts:339. The reported fix only checks `!st().replay`, so pressing Tidy mid-stream would still save the half-streamed session even though the reducer refuses the tidy. Optionally bump `session.updatedAt` in the workflow/tidy reducer case (that needs a `now` on the action) and add a controller.test.ts case: commit a reverse-arrival workflow, tidy, boot a second controller with resumeId, and check the cells are the tidied ones.

## C39. [low] Workflow repairs are reported as cloud 'placement fixes applied by the catalog rules'
- **Location:** apps/web/src/console/logic.ts:359-374 (FIX_KEY); routed by apps/web/src/store/reducer.ts:589,655
- **Input:** A workflow turn whose graph needs a deterministic workflow repair. Codes: wf-mixed-out (a step with both a next link and a loop, as in the probe's 'check' step), wf-cycle, wf-agent-turns (an agent without turns), wf-attach-form, wf-dangling-ref.
- **Actual:** The console fix block heading reads '1 placement fix applied by the catalog rules' / '카탈로그 규칙에 따른 배치 수정 1건' / '按目录规则自动修正了 1 处位置' (visible in the 800 px screenshots). Expanded, every wf-* code maps to fix.generic: 'A placement issue was corrected.' Yet the repair converted links into branches or bounded a loop, which are not placements.
- **Expected:** Workflow wording, e.g. '1 workflow repair applied', with one line per code (e.g. 'A loop was limited to 3 extra passes.', 'An agent was limited to 10 model requests.').
- **Fix proposed:** Add fix.wf* keys in en/ko/zh for the five repair codes, plus a workflow heading key. Choose by AutoFix.view === 'workflow', which is already set at reducer.ts:589/655.

- **Verifier notes:** In apps/web/src/i18n/strings.json, add for en, ko and zh a workflow heading key (for example rec.autoFixesWorkflow.one/.other: "1 workflow repair applied") and five line keys: fix.wfMixedOut, fix.wfCycle ("A loop was limited to 3 extra passes."), fix.wfAgentTurns ("An agent was limited to 10 model requests."), fix.wfAttachForm and fix.wfDanglingRef. In console/logic.ts, map these codes in FIX_KEY. In Revision.tsx FixBlock, pick the heading key from whether every autoFix has view === 'workflow' (or from session mode). Also consider following PLAN.md: wf-cycle and wf-agent-turns are listed there as "assumption", so they could be shown with the assumptions instead of as repairs. | Make the fix block aware of the view, because each AutoFix already carries it.

1. In console/logic.ts, add these FIX_KEY entries:
   - 'wf-mixed-out' -> 'fix.wfMixedOut' ("Parallel next links beside a branch or loop were turned into branches.")
   - 'wf-cycle' -> 'fix.wfCycle' ("A loop with no limit was capped at 3 passes.")
   - 'wf-agent-turns' -> 'fix.wfAgentTurns' ("An agent was limited to 10 model requests.")
   - 'wf-attach-form' -> 'fix.wfAttachForm' ("A step that could not attach was placed inline after its host.")
   - 'wf-dangling-ref' -> 'fix.wfDanglingRef' ("A reference to a missing step was removed.")
   Optionally add 'wf-bad-op' -> 'fix.wfTruncated'. Give en, ko and zh strings for each in strings.json.
2. Add 'fix.wfGeneric' ("A workflow issue was corrected."). In autoFixLines, use it as the fallback when f.view === 'workflow', and keep fix.generic for cloud.
3. In Revision.tsx:194, show a heading key 'rec.autoFixesWorkflow.one/other' ("{n} workflow repair(s) applied automatically") when every autoFix has view 'workflow'.
   - If a revision could mix views, split the count by view or use a neutral heading.

Per PLAN.md:424-426, wf-cycle and wf-agent-turns are meant 

## C44. [medium] Live region floods during workflow streaming with one polite announcement per 180 ms batch, many of them identical
- **Location:** apps/web/src/store/reducer.ts:627-630 (flush() calls live() on every workflow batch); apps/web/src/i18n/strings.json:359
- **Input:** Workflow mode, controller.submit(...) with /api/turn stubbed to stream the 29 support-email-triage ops 400 ms apart through the real controller and scheduleFlush path. Also ?replay=stub-workflow&speed=1x.
- **Actual:** There were 29 polite announcements in about 11.7 s. Sixteen in a row read the same "Workflow updated: 13 steps." while only links were arriving. The first reads "Workflow updated: 1 steps." WorkingView keys the span by seq, so every repeat is re-announced. The shipped replay gives 5 updates in 1.8 s, three of them identical "13 steps". Cloud mode (replay 'ha') announces once mid-stream and once at commit.
- **Expected:** p5design.md:575 says "no live-region flood". Announce only meaningful changes (for example when the step count changes, throttled to a few seconds, or at start and commit as cloud mode does), and use correct plurals.
- **Fix proposed:** In flush(), call live() only when Object.keys(work.rawWorkflow.nodes).length differs from the last announced count (store it on work), and/or throttle. Split workflow.live.updated into .one and .other forms in en, ko and zh.

- **Verifier notes:** In the workflow branch of flush() in reducer.ts, announce only when the step count has changed since the last announcement. Store the last announced count and the time of the last announcement on TurnWork (for example work.announcedSteps and work.announcedAt).

Also throttle the announcement: at most one every 2-3 s, carrying the latest count. Gating on the count alone still gives about 13 announcements in about 5 s at real cadence. The commit's live.drawn line can stay the final summary.

Keep the display update and the version bump on every batch; gate only the live() call.

For plurals, replace the English base key "workflow.live.updated" with "workflow.live.updated.one" ("Workflow updated: {n} step.") and "workflow.live.updated.other" ("Workflow updated: {n} steps."). In ko and zh, rename the key to "workflow.live.updated.other". t() picks the form from vars.n. | 1. **Keep `key={live?.seq}`** in WorkingView.tsx:72. It is the fix for brief-fix-ui.md Finding 8, which needs repeated identical "Cost estimate updated." messages to be re-announced. shell/workflow-review.test.ts:88-101 asserts this, so removing the key would break that test and reintroduce the bug.
2. **Gate the announcement in reducer.ts flush().** Keep the last workflow announcement's text and time on TurnWork. Call live() only when the new text differs from the last one and at least about 2–3 s have passed since it was announced. Keep the display update itself unconditional. Do not gate on the step count alone: links-only batches are still workflow changes under p5design.md:281. They are simply not re-announced verbatim at batch rate.
3. **Completion needs no new code.** onCommit's "Revision N drawn" announcement already covers it, and the controller clears the flush timer on commit.
4. **Fix the plural.** Replace en "workflow.live.updated" with "workflow.live.updated.one" ("Workflow updated: 1 step.") and ".other" ("Workflow updated: {n} steps."). Rename the ko and zh entries to ".other" so the key sets match: Intl.PluralRules gives "other" for both, and t.ts falls back to .ot

## D0. [low] Revival accepts corrupt workflowLayout values that rebuild to NaN card positions or overlapping cards
- **Location:** apps/web/src/store/sessions.ts:20-28 (savedWorkflowLayout only checks that rebuilt cells are finite)
- **Input:** A stored record (stub-mixed-workflow committed) whose workflowLayout has one of: workflow.rowTops = 'x'; one node's cell row moved outside the bands (row 7 or -1); two nodes given the same cell.
- **Actual:** The layout is kept. session/open then produces non-finite y for the cards (rowTops lookup is undefined or NaN), NaN layout width and height, or two cards at the same x and y.
- **Expected:** Such a layout is discarded and the workflow is laid out afresh, as already happens for missing roles or rowTops.
- **Fix proposed:** In savedWorkflowLayout, also reject when any rebuilt card x, y, w or h is non-finite, when rebuilt.width or height is non-finite, or when two inline nodes (roles 'inline') share a cell.

- **Verifier notes:** In `savedWorkflowLayout`, after `const rebuilt = layoutWorkflow(memory.workflow, layout)`, also return undefined when any of these holds:
- any value in `Object.values(rebuilt.cards)` has a non-finite x, y, w or h
- `rebuilt.width` or `rebuilt.height` is non-finite
- two ids with `rebuilt.workflow.roles[id] === 'inline'` have the same column and row in `rebuilt.workflow.cells`

This checks the rebuilt result rather than each stored field, so it covers string `rowTops`, rows outside the bands and future shape drift with one check. | This is optional hardening, not a defect fix. In savedWorkflowLayout, after the rebuild, also return undefined in these cases:
- any rebuilt card has a non-finite x, y, w or h;
- rebuilt.width or rebuilt.height is non-finite;
- two nodes whose rebuilt.workflow.roles value is 'inline' share the same column and row in rebuilt.workflow.cells.

The two cheapest additions are the card-geometry and bounds finiteness checks, because they cover any future NaN path. The inline-overlap check is cheap too, but it must skip attached nodes, which share their host's cell by design.

- **Disputed on intent:** The mechanics reproduce. savedWorkflowLayout (apps/web/src/store/sessions.ts:20-28) only checks that the rebuilt cells are finite, so it keeps a stored layout that has: a string rowTops, a cell row outside the bands, or two inline nodes in one cell. After session/open, those layouts give NaN card y values and bounds, or overlapping cards.

Under the intent lens, though, this is not a defect a user can reach.

1. **The app never writes these values.** Every writer of session.workflowLayout goes through core: tidyWorkflow at reducer.ts:266, and layoutWorkflow at reducer.ts:588, 704, 789 and 814.
