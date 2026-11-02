# Claude frontend review: findings for the canvas job

## C8. [high] Workflow cards never receive pointer events: hovering does nothing, clicking opens nothing, and the +N attachment list cannot be reached with a mouse
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:165 (card nodes are created with selectable:false and draggable:false, and ReactFlow gets no node mouse handlers); handlers that never fire are at apps/web/src/canvas/WorkflowNodes.tsx:27
- **Input:** Stream the support-email-triage fixture plus 6 attachments on step b, commit, then at 800x600 or 1150x800 move the mouse over a card for 450-500 ms, or click it.
- **Actual:** No #cv-pop appears on hover or on click. elementFromPoint at the centre of every card returns 'react-flow__pane'. The computed pointer-events chain is none on .wf-card, on .react-flow__node-workflowCard and on .react-flow__nodes. React Flow 12.12 sets pointerEvents:'none' on a node unless it is selectable, draggable or has node mouse handlers (@xyflow/react: hasPointerEvents = isSelectable || isDraggable || onClick || onMouseEnter...). Only keyboard focus opens the popover. The '3 more attachments' list (Tool 3-5) cannot be reached with a mouse.
- **Expected:** Hover opens the details popover after 300 ms and a click opens it, as the hover machine and the onPointerEnter/onClick handlers intend. The CSS already sets .wf-card[data-ghost]{pointer-events:none}, which shows live cards were meant to receive pointer events.
- **Fix proposed:** Give live card nodes pointer events, either with style:{pointerEvents:'all'} on the workflowCard node objects or with `.wf-card{pointer-events:auto}` in workflow.css (ghosts keep none). Also add the class `nopan` to .wf-card so a press on a card does not start a pane gesture (see the click-pause finding).

- **Verifier notes:** Mirror the cloud canvas fix in apps/web/src/canvas/workflow.css with `.wf-card { pointer-events: auto; }`, which I confirmed works in the browser. Alternatively, set `pointerEvents: 'all'` in the workflowCard node style object at WorkflowStage.tsx:145, next to `transition`. The existing `.wf-card[data-ghost] { pointer-events: none; }` rule is more specific, so ghost cards keep receiving no events. Adding `nopan` to the button className is optional, so that a press on a card does not start a pane gesture (and the pause that comes with it); it is a separate issue from this one. | Option 1, in WorkflowStage.tsx:145: put pointer events in the node style, for example `style: { pointerEvents: scene.byId.has(card.id) ? 'all' : 'none', transition: ... }`. node.style is spread after React Flow's own pointerEvents, so this overrides it.

Option 2, in workflow.css: add `.wf-card { pointer-events: auto; }`. A child's own pointer-events value overrides the none it would inherit. The existing `.wf-card[data-ghost] { pointer-events: none }` is more specific, so ghosts stay inert.

With either option, also add `nopan` to the button's className (`wf-card nodrag nopan`). Otherwise a mousedown on a card bubbles to the d3-zoom pane: it starts a pan gesture, onMoveStart fires with isTrusted, and the camera stops following on every card click.

Also add a mouse-driven case to scripts/e2e-workflow.mjs (page.hover or page.mouse.click on a card, then wait for #cv-pop) so this does not come back.

## C9. [medium] The workflow popover does not track the camera: after a pan, follow or focus-reveal it is stranded, covers its card, or points at a card that is off-screen
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:13-22 (it is placed only when [p.anchor, p.card] change); apps/web/src/canvas/WorkflowStage.tsx:171 (onMoveStart never closes the popover, unlike the cloud canvas at canvas/index.tsx:620-622, which calls closeNow())
- **Input:** (a) Open the popover on 'route' by keyboard focus, then wheel deltaX 200 over the canvas. (b) While streaming, focus 'in', press Enter, then send 8 more ops; follow moves the camera. (c) At 800x600 with the committed 3-step workflow, focus card 'a' and then card 'c'; the focus reveal pans 54 px.
- **Actual:** (a) The card moves from x 698 to 598 while the popover stays at x 388..688, so it now overlaps the card. (b) The card moves to x=-735, off the stage, and the popover stays open at x=556 with focus inside it. (c) The popover lands at {388,233} and covers card c (644..776 x 246..293). Placing it against the card's current rect gives {484,303, side:'below'}.
- **Expected:** The popover either closes when the viewport moves, as in the cloud canvas, or is re-placed against the anchor's current rect after every viewport change.
- **Fix proposed:** In onMoveStart call hover.closeNow() for every move except the reveal the popover's own card triggered, or pass `viewport` into WorkflowPopover and add it to the useLayoutEffect dependencies so the popover is re-placed after each camera change, including after the focus reveal.

- **Verifier notes:** Re-place the popover after every viewport change; don't close it on every move start. The focus reveal is itself a programmatic move that fires onMoveStart, as the existing isTrusted/programmatic guard shows. A blanket hover.closeNow() there would close every focus-opened popover as soon as it opens.

Two ways to do it:
- Pass the stage's `viewport` (and `size`) into WorkflowPopover and add them to the useLayoutEffect dependencies. onMove already calls setViewport, so the effect re-runs once the reveal or follow transform has applied.
- More robust: compute the anchor rect from the scene card (card.x*zoom+vx+stage.x and so on) instead of getBoundingClientRect, so it never reads DOM from before the pan.

Additionally, close the popover with hover.closeNow() only for trusted user pans (event?.isTrusted && !programmatic.current), matching the cloud canvas. When the anchored card is entirely outside the stage after a follow move, close the popover and return focus to the card, rather than clamping it to the stage edge. | This fix is untested. There are two traps:
1. **Closing on every move would close the focus-opened popover.** The card's focus handler runs reveal() before hover.focus() (WorkflowStage.tsx:153), so a plain hover.closeNow() in onMoveStart could close the popover that focus just opened. Any close-on-move rule needs the same isTrusted / programmatic.current split that pause() already uses.
2. **Adding `viewport` to WorkflowPopover's layout-effect deps may still measure too early.** getBoundingClientRect() can run before React Flow applies the new transform after setView/rf.setViewport.

A safer shape:
- In onMoveStart, call hover.closeNow() for user-originated moves: event?.isTrusted && !programmatic.current. This matches the cloud canvas.
- For programmatic moves (reveal, follow, fit), re-place the popover from computed geometry rather than the DOM rect. Pass the target viewport and the card's flow box, and compute the anchor as stageRect.x + card.x*zoom + vx, stageRect.y + card.y*zoom + vy, with size card.w*zoom by card.h*zoom.
- Close the popover, or move focus back to the card, when the computed anchor falls outside the stage. This covers the streaming follow case.
- Also re-place

## C10. [medium] Removing a step that had keyboard focus at any earlier time steals focus from the composer or the panel and swallows keystrokes
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:136-137 (the `focus` state is never cleared on blur; the effect calls element(stop)?.focus() whenever that id leaves the scene)
- **Input:** Focus card 'kb', press Escape, start a revision turn, focus the composer textarea (it stays enabled during a turn; typing 'abc' works) or the panel handle, then stream {t:'unstep', id:'kb'}.
- **Actual:** Focus jumps to the first card (card:in). The same thing happens from the panel handle. The camera reveal fires, and the keystrokes typed next ('def') are lost to the canvas, where 'f' runs fit. Control: unstep('gate'), which was never focused, leaves focus in the composer.
- **Expected:** Focus is restored to a neighbouring card only when focus was inside the canvas, meaning the deleted card was document.activeElement or focus fell to body.
- **Fix proposed:** Clear `focus` in the card's onBlur when focus leaves the stage, or guard the effect: only refocus when document.activeElement is body or root.current.contains(document.activeElement).

- **Verifier notes:** In the effect at WorkflowStage.tsx:136, keep the setFocus(stop) bookkeeping so the roving tabindex stays valid. Only call element(stop)?.focus() when focus was in the canvas: `const a = document.activeElement; if (stop && (!a || a === document.body || root.current?.contains(a))) element(stop)?.focus();`. When the focused card is removed from the DOM, Chrome drops activeElement to body, so that case still gets restored. The alternative of clearing `focus` in onBlur would also lose the roving-stop memory needed to Tab back into the canvas, so the guard is the smaller and safer change. | Keep setFocus(stop) so the roving tab stop is still remembered. Guard only the DOM focus call, at WorkflowStage.tsx:136:

`const a = document.activeElement; if (stop && (!a || a === document.body || root.current?.contains(a))) element(stop)?.focus();`

Use the containment check, not just the body check. With motion enabled, a removed card stays mounted as a ghost button inside the stage, so focus may still sit on that ghost instead of falling to body.

Do not clear `focus` in onBlur. That would throw away the roving-tabindex memory, so Tab back into the canvas would land on the first card instead of the last one visited.

## C11. [medium] Follow and Fit ignore the open products panel, so streamed steps, and after commit every step, are placed under the panel
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:102-105 (fittedView uses size.height-160) and :115-116 (the follow visible rect is {y:110, h:size.height-160} whatever p.open is)
- **Input:** At 1150x800 start a workflow turn, open the Steps panel (#products .pp__handle), then stream ops 2-12 of support-email-triage and commit.
- **Actual:** The panel covers 356..800 of the 106..748 stage. While following, every newest card (gate, human, log, manual, send) has its centre under #products (elementFromPoint). After commit, the fitted view puts all visible cards (in, guard, route, kb, rank) under the panel. The visible canvas shows only the toolbar and the overview strip.
- **Expected:** Follow and Fit use the unoccluded part of the stage, as reveal() at :129 already does and as design note p5design.md asks ('Reuse occlusion-aware reveal'), so the newest step stays visible above the open panel.
- **Fix proposed:** Compute occludedBottom = max(0, stage.bottom - products.top) when p.open, as canvas/index.tsx:267 does. Use height = size.height - 110 - max(50, occludedBottom) in fittedView and in the follow visible rect, and add p.open to the follow effect's dependencies.

- **Verifier notes:** In WorkflowStage, measure occlusion the way canvas/index.tsx:267 does:

occludedBottom = p.open ? max(0, stageRect.bottom - document.getElementById('products').getBoundingClientRect().top) : 48

Then:
- In the follow effect, use the visible rect {x:0, y:110, w:size.width, h:max(0, size.height - 110 - max(50, occludedBottom))}.
- Add p.open to the follow effect's dependencies (:118), so opening the panel mid-stream re-places the newest step.
- Optionally, keep Fit's zoom computed on the full stage (as cloud fitCamera does), but shift its vertical offset into the unoccluded band. Fitting zoom to a band of about 147px would drop the view to minZoom.
- Also make reveal() at :129 use stage.bottom - panel.top rather than the panel's full height, so it matches the cloud occludedBottom. | Change only the streaming-follow rect, and leave fittedView and the commit refit as they are (cloud parity).

1. When p.open, compute the open-state occlusion. Do not read the live products.top: the panel slides with a 280 ms translateY, so an effect fired on the p.open flip would measure mid-slide. Use the untransformed geometry instead, for example `occluded = Math.max(0, stageRect.bottom - (slotRect.bottom - products.offsetHeight))` from the panel's untransformed container. Equivalently, use the panel's offsetHeight minus the part below the stage (the 52px bar); this gives about 403px at 1150x800.
2. Pass `{ x: 0, y: 110, w: size.width, h: Math.max(0, size.height - 110 - Math.max(50, occluded)) }` to workflowFollowViewport. That leaves a band about 140px high, which workflowFollowViewport can fit a 47-96px card into.
3. Add p.open to the follow effect's dependencies. Inside the effect, apply the new rect only when p.streaming && following, so opening the panel after commit does not trigger a refit.

Treat the Fit and commit half as a cross-mode design choice (spec 7.26). If wanted, change it in both canvases.

## C12. [medium] A click without any drag on the canvas, including on a card, pauses following
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:171 (onMoveStart pauses on any trusted d3-zoom 'start', which fires on mousedown before any movement)
- **Input:** While streaming with following on, click once on an empty area of the canvas (no mouse movement), or click a card. Then stream another batch.
- **Actual:** `following` becomes false after a stationary click, and the next batch leaves the newest columns off-stage (draft/check/gate at x 1151..1465, beyond the stage's right edge at 1150). This still happens once cards receive pointer events: with the pointer-events style injected, 'click c opens true following false'.
- **Expected:** Only an actual user pan or zoom pauses follow (design: 'A user-originated move pauses follow'). A plain click does not.
- **Fix proposed:** Record the viewport in onMoveStart and pause in onMove or onMoveEnd only when the trusted gesture actually changed x, y or zoom beyond a small epsilon. Add `nopan` to .wf-card.

- **Verifier notes:** Move the pause out of onMoveStart and into onMove. d3-zoom sends 'zoom' events only when the transform actually changes, so a stationary click never triggers it. Use `onMove={(event, v) => { if (event?.isTrusted && !programmatic.current) pause(); setViewport(v); }}`. If needed, also compare against the viewport saved at move start, with a small epsilon, to ignore sub-pixel jitter. Separately, the cards currently get pointer-events: none from the React Flow node wrapper, because the nodes have no RF-level handlers. Once cards are made clickable, give the card wrapper a `nopan` class (for example `className: 'nopan'` on the card nodes), so a press on a card does not start a d3-zoom gesture. | In WorkflowStage.tsx, pause only when a trusted gesture actually changes the viewport:
- Keep a ref, `const moveStart = useRef<Viewport | null>(null)`.
- onMoveStart: `(e, v) => { moveStart.current = e?.isTrusted && !programmatic.current ? v : null; }`
- onMove: `(_, v) => { setViewport(v); const s = moveStart.current; if (s && (Math.abs(v.x - s.x) > 1 || Math.abs(v.y - s.y) > 1 || Math.abs(v.zoom - s.zoom) > 1e-3)) { moveStart.current = null; pause(); } }`
- onMoveEnd: `() => { moveStart.current = null; }`. This keeps a stale start viewport from a stationary click from being compared against a later follow-driven move.

Leave out the suggested `nopan` on .wf-card. With the delta check it is unnecessary, and once cards get pointer events it would also block a drag-pan that starts on a card.

Cards not receiving pointer events at all is a separate defect. The node wrapper is pointer-events: none, so click and hover cannot open the popover. It should be tracked on its own: give .wf-card `pointer-events: auto`, or pass node-level handlers.

## C13. [low] The popover stays open after keyboard focus leaves it, and Escape outside it does not close it
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:26 (onBlur only calls releaseHold()); the cloud Popover's onFocusOut calls releaseHold() then closeNow() (canvas/index.tsx:720-723)
- **Input:** Focus card b, which has 3 hidden attachments, press Enter, then press Tab 6 times.
- **Actual:** Focus goes: popover button, 3 list items, BODY, then the page's skip link. The popover stays open throughout, and Escape pressed on the skip link leaves it open. Because cards ignore pointer events, it can only be dismissed by Tabbing back into it.
- **Expected:** The popover closes when focus leaves it, as in the cloud canvas.
- **Fix proposed:** onBlur: if relatedTarget is outside the popover, call p.machine.releaseHold() and then p.machine.closeNow().

- **Verifier notes:** In WorkflowPopover.tsx:26, change onBlur to `if (!e.currentTarget.contains(e.relatedTarget)) { p.machine.releaseHold(); p.machine.closeNow(); }`. This matches the cloud Popover. Focus moving from the card into the popover on Enter is unaffected, because that blur happens on the card, where `held` is already true. Focus moving back to the card via close() also stays correct, because escape() has already cleared the popover. | The proposed fix is fine as is: in WorkflowPopover.tsx:26, when relatedTarget is outside the popover, call p.machine.releaseHold() and then p.machine.closeNow(), as Popover.tsx:57-58 and canvas/index.tsx:720-723 do. A regression check belongs in e2e-workflow.mjs: after Enter, Tab past the last popover item and assert that #cv-pop is gone.

## C14. [low] 'Resume following' does not return to the follow or fit view; it reveals the bottom attachment and leaves the main row under the overview strip
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:178-179 (resume reveals ordered.at(-1), the lowest card in the rightmost column, attachments included). The follow effect at :112-113 uses inline cards, and it does not re-run on resume because `following` is not in its dependencies.
- **Input:** Commit a 3-step workflow whose end step c has 3 attachments (t0..t2), wheel deltaX -300 (follow pauses), then click 'Resume following'.
- **Actual:** The view changes from paused {x:299.9, y:134} to {x:299.9, y:27.9}. x keeps the user's pan (the fitted x is 149.9), and the main row a, b, c sits at stage-relative y 28, under the .wf-overview strip, according to elementFromPoint.
- **Expected:** Resume shows the same view follow would compute: fittedView() plus workflowFollowViewport on the newest inline card, or the fitted view when nothing is streaming.
- **Fix proposed:** In resume(), run the follow effect's computation (extract it as a function) instead of reveal(ordered.at(-1)).

- **Verifier notes:** Pull the follow effect's body (WorkflowStage.tsx:112-116) into a followView() helper: fittedView(), plus workflowFollowViewport on the newest inline card while p.streaming. Then:
- Call it from both the effect and resume, e.g. `resume={() => { setFollowing(true); setStatus(...); if (scene.cards.length) setView(followView()); }}`.
- Do not call reveal(ordered.at(-1)). If reveal is kept anywhere, pick the target from inline cards only (`!c.node.on`), as the follow effect does, never from attachments. | Add `following` to the follow effect's dependency array (WorkflowStage.tsx:118) and delete `reveal(ordered.at(-1))` from `resume` (:178-179). The guard `!started.current || following` already makes the transition to false a no-op. On the transition to true, the effect recomputes the follow view while streaming (`workflowFollowViewport` on the newest inline card) or the fitted view after a commit, which is the report's expected result. Changing reveal to target the rightmost inline card is not enough: it would still keep the user's x pan and differ from follow. Optionally, have the button do nothing when `following` is already true.

## C15. [low] The zoom +/- buttons zoom about the world origin instead of the visible centre, so the steps in view jump away
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:175-177 (setView({...viewport, zoom}) keeps x and y)
- **Input:** Stream the 40-step linear workflow; follow ends at the newest steps. Press '+'.
- **Actual:** Visible steps change from s35..s39 to s32..s34. x stays at -5494.57 while zoom goes from 0.7857 to 0.8857, so content shifts by worldX x 0.1, about 800 px at the far end. On the support fixture a single '+' moves the centre point about 70 px.
- **Expected:** Zoom keeps the point at the visible centre fixed, as the cloud canvas does with zoomAbout(v, z, centre) at canvas/index.tsx:546.
- **Fix proposed:** Use zoomAbout(viewport, z, {x: size.width/2, y: visibleHeight/2}) from canvas/camera.ts, clamped to [minZoom, 1.5], before setView.

- **Verifier notes:** In WorkflowStage.tsx at the `zoom={(delta) => ...}` handler, clamp first to the stage's own range, then keep the visible-centre anchor fixed by doing the anchor maths inline:

```ts
const v = viewport;
const z = Math.max(minZoom, Math.min(1.5, v.zoom + delta));
const ax = size.width / 2, ay = 110 + Math.max(0, size.height - 160) / 2;
pause();
setView({ x: ax - (ax - v.x) / v.zoom * z, y: ay - (ay - v.y) / v.zoom * z, zoom: z });
```

The anchor is the visible band that fittedView uses. Do not call camera.ts `zoomAbout` directly. It clamps with clampZoom to [ZOOM_MIN 0.5, ZOOM_MAX 1.25 (GEOMETRY.maxZoom)], which differs from this stage's [minZoom, 1.5]. setView would then raise zoom to minZoom without moving x and y, so the drift would come back at the zoom-out limit. | In WorkflowStage.tsx:175-177, clamp with the workflow's own range first, then keep the centre of the visible area fixed with inline arithmetic. zoomAbout would cap the zoom at the cloud maximum of 1.25.

```ts
zoom={(delta) => { pause();
  const v = rf.getViewport();
  const z = Math.max(minZoom, Math.min(1.5, v.zoom + delta));
  const a = { x: size.width / 2, y: 110 + Math.max(0, size.height - 160) / 2 };
  const wx = (a.x - v.x) / v.zoom, wy = (a.y - v.y) / v.zoom;
  setView({ x: a.x - wx * z, y: a.y - wy * z, zoom: z }); }}
```

The anchor matches the visible band that fittedView and the follow logic use (110 px of toolbar and overview on top, 48 px of sheet at the bottom). Another option is to give zoomAbout optional min and max bounds and pass [minZoom, 1.5]. Add a unit test that the world point under the anchor stays put.

## C16. [low] The card key handler ignores modifier keys: Ctrl+F on a focused card blocks the browser's Find and fits the view
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:156-164 (no altKey/ctrlKey/metaKey guard, unlike canvas/index.tsx:561)
- **Input:** Pan the canvas, focus a card, then press Ctrl+F.
- **Actual:** The keydown reaches window with defaultPrevented=true, so the browser's Find is suppressed, and fit() runs (x changed 21.86 to 171.86). Alt+Arrow keys go through the same unguarded path.
- **Expected:** Modified keys pass through untouched.
- **Fix proposed:** Begin the handler with `if (e.altKey || e.ctrlKey || e.metaKey) return;`.

- **Verifier notes:** The reported fix is right. Make the first line of the `key` handler in apps/web/src/canvas/WorkflowStage.tsx (line 156) `if (e.altKey || e.ctrlKey || e.metaKey) return;`. That matches the cloud canvas guard at canvas/index.tsx:561, which also checks `e.defaultPrevented`. Leave Shift out of the check so Shift+F still fits the view. | Copy the cloud handler's guard as the first line of the `key` callback in WorkflowStage.tsx:156: `if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;`. This keeps plain F, the arrows and Escape working, and passes browser shortcuts (Ctrl/Cmd+F, Alt+Left/Right) through. The `e.defaultPrevented` part matches index.tsx:561. Add a modified-key case to e2e-workflow.mjs: press Ctrl+F on a focused card and check that the viewport does not change.

## C17. [low] While following, the camera bounces about 13 px vertically and back on every batch
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:80 (setRoutes({}) clears routes on every plan change), :91-92 (bounds include route label boxes) and :118 (the follow effect re-runs on bounds changes)
- **Input:** Stream support-email-triage in batches of 3 ops with following on, sampling the .react-flow__viewport transform on every animation frame.
- **Actual:** Each link batch produces two camera moves with no net change: y 285 to 272 when routes are cleared and the label boxes vanish, then 272 back to 285 when the routes arrive. These moves are instant jumps, not animated.
- **Expected:** At most one camera move per batch; an unchanged layout leaves the camera still.
- **Fix proposed:** Keep the previous routes until the new result arrives instead of setRoutes({}), or drive the follow/fit effect from plan.bounds or scene.bounds only, not route-dependent label boxes.

- **Verifier notes:** Change the camera without blanking the drawing. Remove setRoutes({}) at WorkflowStage.tsx:80 so the previous routes stay until accept() replaces them. drawWorkflowEdges already iterates only plan.semantics, so edges that were just added simply have no route yet. Stale routes for existing edges last at most one routing budget, and during link batches the cards do not move anyway. For the follow and fit effect, also take its bounds from plan.bounds or scene.bounds, or from bounds that only grow during a stream, rather than from route-dependent label boxes. That way a route round-trip can never move the camera. The first change also removes the 76-207 ms flash where all routed edges disappear on every batch, which this probe showed as well. | Never render an empty-routes frame. In the effect at WorkflowStage.tsx:80, replace `setRoutes({})` with a synchronous seed for the new plan: `setRoutes(checkedWorkflowRoutes(plan, {}))`.
- `checkedWorkflowRoutes` already runs `routeChannels` synchronously for every edge without a clear route, so each edge in the current plan has valid geometry at once.
- The libavoid or late answer then swaps in through `accept`.
- `routeWithBudget` already runs the channel router on the main thread after the timeout, so the cost is not new.

This removes the camera bounce and the edge flicker together. The camera still moves only when the routed label geometry actually differs.

A minimal alternative mirrors the cloud canvas: drop the clear and keep the previous routes until the new result is applied. Stale ids are harmless, because `drawWorkflowEdges` only iterates `plan.semantics`.

## C30. [medium] Workflow popover edge list shows the raw placeholder 'Branch: {condition}' and 'Repeat, up to 0 extra passes'
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:41
- **Input:** Open the popover of any approval step, for example Enter on the 'human' card of packages/core/test/fixtures/workflows/support-email-triage.json, whose outgoing links are branches with an outcome and no label (l11/l12/l13). Also a loop link with no max, e.g. {t:'link',id:'lr',from:'check',to:'draft',kind:'loop'}, which is allowed: it only raises a wf-loop-exit warning, and the estimator assumes 3.
- **Actual:** Headless Chrome at 800 px. en: 'Branch: {condition} · Approved → Send approved email' (likewise for Rejected and Edit requested). ko: '분기: {condition} · 승인됨 → …'. zh: '分支：{condition} · 已批准 → …'. Check-step popover: 'Repeat, up to 0 extra passes → Draft grounded answer', ko '최대 0회 추가 반복', zh '最多额外执行 0 次'. Line 41 calls t('workflow.edge.'+kind, { n: e.max ?? 0 }) and never passes {condition}. Same root cause: a labelled loop shows only 'Revise', while the canvas (scene.ts:60-64) shows 'Revise · Repeat, up to 2 extra passes'. A labelled escalate edge loses its 'Escalate' word.
- **Expected:** An outcome-only branch reads 'Approved → Send approved email'. A loop with no max shows no bound, or 'up to 3', which matches the estimate. The popover text matches the canvas edge label.
- **Fix proposed:** Factor scene.ts:60-64 into an edgeText(e, t) helper and use it at WorkflowPopover.tsx:41. The helper joins the label, the outcome text, the loop bound only when max is defined, and the escalate word with ' · '. When all of those are empty, fall back to t('workflow.edge.next'). Use t('workflow.edge.branch', { condition }) only with a real condition string.

- **Verifier notes:** Move the edge-label logic from scene.ts:60-64 into a shared helper, edgeText(e, t, isLoop), and export it. It joins these parts with ' · ':
- the label
- the outcome text
- the loop bound, only when max is defined
- the escalate word

When every part is empty, it falls back to t('workflow.edge.next'). In WorkflowPopover.tsx:41, replace the e.label ?? t('workflow.edge.'+kind, {n: e.max ?? 0}) expression with that helper, and remove the separate outcome line at :42 so the outcome is not shown twice. Either drop 'workflow.edge.branch' or call it only with a real condition string. For a loop with no max, either omit the bound or show 3, the assumption at settings.ts:53. | Export a helper from workflow/scene.ts, `edgeText(e, isLoop, t)`. It joins, with ' · ', every non-empty part of: the label, the outcome text, the loop bound (only when `max` is defined), and the escalate word. Use it to build `edgeLabels` in scene.ts. The popover can then read `p.card`'s scene `edgeLabels[e.id]` directly (pass `scene.edgeLabels` through `view`), and fall back to `t('workflow.edge.' + kind)` only for kinds without placeholders (next) when the joined text is empty. Never call `workflow.edge.branch` without a `condition` value.

## C37. [low] Workflow popover close button says 'Hide products'
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:28
- **Input:** Open any workflow step's popover (Enter on a card).
- **Actual:** The button's text and accessible name are t('panel.collapse'): 'Hide products' / '제품 숨기기' / '隐藏产品'. That is the cloud panel's collapse copy, and the workflow view has no products panel.
- **Expected:** 'Close' / '닫기' / '关闭'
- **Fix proposed:** Add 'workflow.pop.close' (en 'Close', ko '닫기', zh '关闭') and use it at line 28.

- **Verifier notes:** Add a key such as `workflow.pop.close` to all three language blocks in strings.json: en "Close", ko "닫기", zh "关闭". The i18n test requires identical key sets across en, ko and zh. Use the new key at WorkflowPopover.tsx:28. Optionally also give the button an explicit aria-label that names the step, e.g. "Close Email webhook", so screen-reader users know which popover it closes. | Add "workflow.pop.close" to all three locales in apps/web/src/i18n/strings.json: en "Close", ko "닫기", zh "关闭". All three are needed so the typed t() keys and any locale-parity test still pass. Then change WorkflowPopover.tsx:28 to `<button type="button" onClick={p.close}>{t('workflow.pop.close')}</button>`.

## C38. [low] Missing plural forms: 'Repeat, up to 1 extra passes' and 'Workflow updated: 1 steps.'
- **Location:** apps/web/src/i18n/strings.json:305,359 (en), 763/817 (ko), 1221/1275 (zh); used at apps/web/src/workflow/scene.ts:62, canvas/WorkflowPopover.tsx:41, store/reducer.ts:630
- **Input:** A loop link with max:1 (valid range 1..20). Separately, the first streamed workflow step.
- **Actual:** t('en','workflow.edge.loop',{n:1}) returns 'Repeat, up to 1 extra passes'. The live region read 'Workflow updated: 1 steps.' on the first flush in the browser run.
- **Expected:** 'Repeat, up to 1 extra pass' and 'Workflow updated: 1 step.'
- **Fix proposed:** In all three tables, delete the bare keys 'workflow.edge.loop' and 'workflow.live.updated' and add '.one'/'.other' forms. ko and zh may reuse the same text for both. t.ts only consults the plural forms when the bare key is missing. StringKey collapses the pair, so call sites stay unchanged.

- **Verifier notes:** The reported fix is correct. In en, ko and zh, delete the bare 'workflow.edge.loop' and 'workflow.live.updated' and add these forms:
- en: 'workflow.edge.loop.one': 'Repeat, up to {n} extra pass' and '.other': 'Repeat, up to {n} extra passes'
- en: 'workflow.live.updated.one': 'Workflow updated: {n} step.' and '.other': 'Workflow updated: {n} steps.'
- ko and zh: reuse the current text for both forms.
Add both forms to all three tables so the keysOf parity tests stay green. No call-site changes are needed because StringKey collapses the pair to the base key. | The fix as reported works. Edit apps/web/src/i18n/strings.json in all three tables:
- Replace "workflow.edge.loop" with:
  - "workflow.edge.loop.one": "Repeat, up to {n} extra pass"
  - "workflow.edge.loop.other": "Repeat, up to {n} extra passes"
- Replace "workflow.live.updated" with:
  - "workflow.live.updated.one": "Workflow updated: {n} step."
  - "workflow.live.updated.other": "Workflow updated: {n} steps."

In ko and zh, give .one and .other the same text, as the other workflow.*.count pairs already do.

StringKey's StripPlural collapses the pair back to the base key, and all call sites pass a numeric n. So scene.ts:62, reducer.ts:630 and WorkflowPopover.tsx:41 (which uses a cast key) need no change. Adding a t.test.ts case for n=1 on both keys would stop this coming back.

## C40. [low] zh: English step titles re-wrap past the pre-measured lines and overflow the card
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:39 (makeMeasurer('sans-serif')) with apps/web/src/canvas/measure.ts:33 and apps/web/src/canvas/workflow.css:7
- **Input:** zh UI, insurance-claims-triage fixture (English labels 'Draft missing-document request', 'Approve evidence request'), any viewport.
- **Actual:** Titles are pre-broken using canvas metrics for '500 14px sans-serif', which ignore the document language. With html lang='zh' the DOM's generic sans-serif resolves to the CJK default font, whose Latin glyphs are wider. 'Approve evidence' and 'missing-documen' each wrap to two line boxes. Card scrollHeight is 79 against clientHeight 70 ('request-review') and 120 against 112 ('request'). The title collides with 'Model Studio', and the model line spills over the card's bottom border. en and ko do not overflow.
- **Expected:** Title lines fit the card in every UI language.
- **Fix proposed:** Measure and render with the same explicit font: give .wf-card__heading strong a concrete family stack and pass that exact stack to makeMeasurer. Alternatively set white-space: nowrap on the pre-broken title spans so the DOM cannot re-wrap them.

- **Verifier notes:** Make the measurer lang-aware so the canvas resolves fonts the way the DOM does.

In apps/web/src/canvas/measure.ts:
- makeMeasurer(family, lang) sets `c.lang = lang` (CanvasRenderingContext2D.lang, Chrome 155 honours it) before `c.font = ...`.
- Include lang in the cache key.
- Where `lang` is not supported, append a hidden canvas to the document so it inherits the html lang.

In WorkflowStage.tsx:39, change to `useMemo(() => makeMeasurer('sans-serif', p.lang), [p.lang])` so a language switch drops cached widths.

The cloud canvas also uses makeMeasurer with fitTitle (canvas/scene.ts:197) and probably has the same exposure.

Optionally also add `white-space: nowrap` to `.wf-card__heading strong span` as a guard. A 1px mismatch then overhangs sideways instead of adding a line box and pushing the model line over the card border. | Make the measured font and the rendered font the same explicit stack, and key the measurer on language, as the cloud stage does.

1. workflow.css:7: change `.wf-card__heading strong` to `font-family: var(--font-ui)`, or drop the rule and inherit.
2. WorkflowStage.tsx:39: use `makeMeasurer(getComputedStyle(document.body).fontFamily)`, memoised on `[p.lang, fontEpoch]`, mirroring canvas/index.tsx:164. That means listening for `document.fonts` loadingdone, as the cloud stage does.
3. As a backstop against sub-pixel differences, add `white-space: nowrap` to `.wf-card__heading strong span`, mirroring `.cv-card__title > span` at canvas.css:151.
4. Optionally extend scripts/e2e-workflow.mjs to run a real fixture with long English labels under ko and zh UI. Its existing `clipped` check would then catch this.

## C42. [high] A streamed revision that removes the last keyboard-focused step pulls focus out of the composer, and typed keys are lost
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:136 (blur at :153 never clears `focus`)
- **Input:** Load support-email-triage. Tab to the canvas stop and ArrowRight to the "Write trace" card (id log). Press Escape. Use the "Skip to message box" link and type in the composer. A revision turn streams {t:'unstep', id:'log'} and is flushed. Then type "fix".
- **Actual:** After the flush, document.activeElement moves from the composer TEXTAREA to the card "Email webhook. Trigger". The "fix" keystrokes go to the card: the textarea value stays "remove the trace step and ". Control: the same steps with unstep 'manual' leave focus in the textarea.
- **Expected:** Focus stays in the composer. The roving stop should only be re-targeted (setFocus) when the user is not on the canvas. Focus should move only if it was on the removed card or inside the stage.
- **Fix proposed:** In the :136 effect, always setFocus(stop) and hover.closeNow(). Call element(stop)?.focus() only when root.current?.contains(document.activeElement) or document.activeElement === document.body, that is, when focus was on the removed card or ghost.

- **Verifier notes:** In the :136 effect, always call setFocus(stop) and hover.closeNow(). Call element(stop)?.focus() only when focus was on the canvas: `const a = document.activeElement; if (stop && (!a || a === document.body || root.current?.contains(a))) element(stop)?.focus();`. A removed card that lingers as a ghost is still inside root, and a card that has been fully removed leaves activeElement on body, so both cases are still re-targeted. Optionally also add a regression check to e2e-workflow-panel.mjs: visit a card, move to the composer, unstep that card, and assert that activeElement is still the textarea. | In WorkflowStage.tsx:136, keep setFocus(stop) and hover.closeNow() unconditional, and guard only the DOM focus move:

```ts
const active = document.activeElement;
if (stop && (active === document.body || (active && root.current?.contains(active)))) element(stop)?.focus();
```

Why both checks are needed:
- **`contains`:** the removed card stays in the DOM as a ghost (tabIndex -1) while its exit animates. During that time document.activeElement is the ghost inside the stage.
- **`body`:** with reduced motion the node is gone at once, and focus falls to body.

Do not clear `focus` on blur. That would lose the roving stop's memory, and Tab back would no longer return to the last card visited.

## C45. [medium] Workflow popover lets focus leave the canvas and stays open after focus has gone
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:23 (portal to end of document.body) and :26 (onBlur only releases the hold)
- **Input:** Focus the canvas stop card "Email webhook" and press Enter. Focus lands on the popover button. Press Tab, Tab, or Shift+Tab. Then press Escape.
- **Actual:** Tab moves focus to BODY and then the "Skip to message box" link at the top of the page. Shift+Tab jumps to the panel handle "Show steps and why each one is here" instead of the card. In both cases the popover (#cv-pop) stays open. Escape pressed after tabbing out does not close it, and it is still open 1.5 s later.
- **Expected:** When focus leaves the popover, it should close and focus should return to the anchor card, or the popover should sit in DOM order right after the stage so Tab continues to the canvas tools. Escape should never leave an orphaned open popover.
- **Fix proposed:** In onBlur, when relatedTarget is outside the popover and is not the anchor, call p.close() or machine.closeNow(). On Tab or Shift+Tab out of the last or first element, call p.close(), which refocuses the anchor card. Alternatively, portal into .wf-stage after the cards rather than document.body.

- **Verifier notes:** Mirror the cloud popover. At WorkflowPopover.tsx:26, use:

onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { p.machine.releaseHold(); p.machine.closeNow(); } }}

No exception for the anchor is needed: if focus returns to the card, its onFocus calls hover.focus and reopens the popover by design. A null relatedTarget (tabbing off the end of the document) also closes it, which is correct.

Do not use the alternative of calling p.close() on Tab or Shift+Tab. That forces focus back to the card and hijacks Tab order in a non-modal dialog. | Only one change is needed, in apps/web/src/canvas/WorkflowPopover.tsx:26. Make it match the cloud popover's focus-out (canvas/index.tsx:720-723):

`onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { p.machine.releaseHold(); p.machine.closeNow(); } }}`

This does not break the close button or Escape. close() in WorkflowStage.tsx:138 runs escape(), then focuses the card, then runs escape() again. The popover's blur fires while open is already null, so its closeNow() does nothing, and the second escape() cancels the card's focus re-open. The popover stays closed.

Keep the document.body portal. It matches the design (p5design.md:183) and the cloud Popover. Do not add focus-return on Tab or move the portal into .wf-stage.

## C46. [medium] Workflow popover close button is labelled "Hide products"
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:28
- **Input:** Press Enter on any workflow card, for example "Email webhook".
- **Actual:** The focused button inside the step dialog has the accessible name and visible text "Hide products" (ko "제품 숨기기"). That is the cloud panel's collapse string (panel.collapse) and describes a different control.
- **Expected:** A close label for the step details, for example "Close" or "Close details for Email webhook".
- **Fix proposed:** Add a workflow.pop.close key (en, ko, zh), optionally with {step}, and use it instead of t('panel.collapse').

- **Verifier notes:** Add a "workflow.pop.close" key to the en, ko and zh blocks of strings.json, for example en "Close", ko "닫기", zh "关闭". Use it at WorkflowPopover.tsx:28, and give the button an aria-label that names the step, for example a "workflow.pop.closeFor" key ("Close details for {step}") called with { step: n.label }. The visible text can stay short. The ui-icons set already has a "close" glyph if an icon button is preferred. | Add a `workflow.pop.close` key to C:/Users/mendo/ali_wt/rev-final-b/apps/web/src/i18n/strings.json in en, ko and zh: "Close", "닫기", "关闭". Use it at WorkflowPopover.tsx:28: `<button type="button" onClick={p.close}>{t('workflow.pop.close')}</button>`.

Optionally, add `aria-label={t('workflow.pop.closeFor', { step: n.label })}` with a matching key ("Close details for {step}" and its ko and zh forms). If you do, keep the visible text inside the accessible name so WCAG 2.5.3 Label in Name still holds.

Do not reuse `dialog.close` or `overlay.close`. They live in export/strings.json, a separate table that is out of scope, and src/i18n/strings.json has no generic close key today.

## C48. [low] "Follow new steps" has aria-pressed but cannot be un-pressed, and its label changes with state
- **Location:** apps/web/src/canvas/WorkflowTools.tsx:16 (with resume at WorkflowStage.tsx:178)
- **Input:** Click "Follow new steps" while it reports aria-pressed=true.
- **Actual:** It stays aria-pressed=true. resume() always sets following to true, so the toggle can never be turned off. After a pause, the same button is renamed "Resume following" with pressed=false.
- **Expected:** A toggle button flips state and keeps a constant name. If the control can only resume, it should be a plain button without aria-pressed.
- **Fix proposed:** Either remove aria-pressed and disable or hide the button while following, or make it a real toggle with a constant label ("Follow new steps") that turns following off when pressed.

- **Verifier notes:** Either fix works.

**Option 1:** make it a real toggle with a constant name. Render `aria-pressed={p.following}` with a fixed label `p.t('workflow.canvas.follow')`. On click, if following, call pause(); otherwise run the current resume body. This keeps scripts/e2e-workflow.mjs's `.wf-tools [aria-pressed]` follow probe valid.

**Option 2:** make it a plain action button. Drop aria-pressed and show it, labelled "Resume following", only while paused (hidden or disabled while following). The "Following paused" / "Following new steps." live-region status already announces the state. With this option, update the e2e probe to read the following state some other way. | Make it a plain action button, which matches the design. Do not turn it into a real toggle that pauses following, because that adds a manual pause the design does not ask for.

1. **Remove the toggle role.** In WorkflowTools.tsx:16, drop `aria-pressed`.
2. **While following:** either disable the button or replace it with a non-interactive status saying "Following new steps".
3. **While paused:** show an enabled "Resume following" button, and optionally the unused `workflow.canvas.paused` indicator next to it.
4. **Keep a state hook for the e2e check.** `scripts/e2e-workflow.mjs:93` reads the follow state from `.wf-tools [aria-pressed]`, and line 100 fails unless it is `true`. Expose the state another way, for example `data-following={p.following}` on `.wf-tools` or on the button, and update the probe to read that attribute.

## C49. [low] Overview container's aria-label sits on a role-less div
- **Location:** apps/web/src/canvas/WorkflowTools.tsx:19
- **Input:** Load any workflow and read the accessibility tree around the canvas tools.
- **Actual:** The AX tree shows role 'generic' with name "Workflow overview". ARIA 1.2 prohibits naming generic, and screen readers do not announce it, so the 13 "Show column N" buttons have no announced grouping.
- **Expected:** A named container that is exposed, for example role="group" with aria-label "Workflow overview".
- **Fix proposed:** Add role="group" (or render a fieldset or nav) on .wf-overview so the label is exposed.

- **Verifier notes:** At WorkflowTools.tsx:19, add role="group" to the .wf-overview div (`<div className="wf-overview" role="group" aria-label={...}>`) so the name is exposed and the column buttons are announced as a group. Separately, the overview svg comes through as an unnamed "image". Either give it aria-hidden="true" (the column buttons already provide keyboard navigation) or give it an accessible name. | Add `role="group"` to the overview div at WorkflowTools.tsx:19, matching Tools.tsx:21: `<div className="wf-overview" role="group" aria-label={p.t('workflow.canvas.overview')}>`. Use group rather than nav or fieldset: the strip is a set of related controls, not site navigation, and a fieldset would need a legend and would change the styling.

## C50. [medium] Cloud canvas: a node with id 'edges' replaces the fixed edge-layer node, so every connection disappears
- **Location:** apps/web/src/canvas/index.tsx:414 (outside the narrow workflow file list, but inside apps/web/src)
- **Input:** Cloud turn ops: {t:'node',id:'users',product:'users',...}, {t:'node',id:'edges',product:'esa',label:'ESA',group:null}, {t:'node',id:'dns',product:'dns',...}, {t:'edge',id:'e1',from:'users',to:'edges'}, {t:'edge',id:'e2',from:'users',to:'dns',kind:'resolve'}. core validateOp accepts id 'edges' with no warning; normalizeId reserves nothing.
- **Actual:** The ReactFlow node list holds two nodes with id 'edges', the edge layer (line 414) and the card. The DOM keeps only 'edges:card'. There is no react-flow__node-edges, edge paths drop to 0, and no error or warning appears. Arrows and edge labels vanish from the whole diagram.
- **Expected:** All cards plus the edge layer render. Control run with the same ops and the id 'esa': nodes 'edges:edges', users, dns and esa render, with 3 edge paths.
- **Fix proposed:** Give the edge-layer node an id that normalizeId can never produce, for example 'f:edges' or '~edges'. normalizeId turns ':' into '-' and drops '~', so either is safe. Frames ('f:'), ghosts ('ghost:') and workflow brackets ('repeat:') already use this pattern. Update any lookups of the 'edges' node id to match.

- **Verifier notes:** Give the edge-layer node an id that normalizeId can never produce, for example 'f:edges' (normalizeId maps ':' to '-' and its output must match [a-z0-9-]). Change apps/web/src/canvas/index.tsx:414, and also the CSS selector at apps/web/src/canvas/canvas.css:25 (.cv .react-flow__node[data-id='edges'] { pointer-events: none; }). Otherwise the layer loses pointer-events: none and blocks clicks. While the collision lasts, that rule also gives the colliding 'edges' card pointer-events: none.

Related, not reproduced: apps/web/src/canvas/WorkflowStage.tsx:140 uses the fixed id 'wf-edges', which also matches ID_PATTERN. A workflow item with that id would likely collide the same way, so give it a ':'-prefixed id too. | Rename the edge-layer node to an id that normalizeId can never produce and that does not use the frame prefix. '~edges' works, because normalizeId drops '~'.

Do not use the reporter's 'f:edges'. Frames are 'f:' plus the frame id (index.tsx:412). Group frames take the bare group id (core/src/layout.ts:558-559 and 782), and group ids also pass through normalizeId. A group with id 'edges' would then produce frame 'f:edges' and collide again.

Update the selector at apps/web/src/canvas/canvas.css:25 to match: `.react-flow__node[data-id='~edges']`, or select on the type with `.react-flow__node-edges`.

The workflow canvas has the same pattern; I traced this but did not run it. WorkflowStage.tsx:140 uses the fixed id 'wf-edges'. Workflow card ids are the raw workflow node ids (workflow/scene.ts:50), and workflow-validate.ts:192 accepts any id that normalizeId accepts, so a workflow node with id 'wf-edges' would replace the workflow edge layer. Give that one a '~' id too, for example '~wf-edges'.

## C51. [low] Workflow canvas: a step with id 'wf-edges' replaces the fixed edge-layer node, so all arrows and edge labels disappear
- **Location:** apps/web/src/canvas/WorkflowStage.tsx:140
- **Input:** Workflow ops: step in (trigger), step 'wf-edges' (kind ai, label 'Classify email'), step end, link l1 in->wf-edges, link l2 wf-edges->end labelled 'Classified'. All pass validateWorkflowOp unchanged. The user can force it with a prompt such as 'name the classify step wf-edges'.
- **Actual:** ReactFlow gets two nodes with id 'wf-edges'. Only 'wf-edges:workflowCard' renders. svg.wf-edges count is 0, edge paths 0 and edge labels []. The canvas shows three unconnected cards, with no console error.
- **Expected:** Edge layer plus three cards. Control run with id 'classify': 'wf-edges:workflowEdges' is present, 1 svg.wf-edges, 2 paths, and label 'Classified'.
- **Fix proposed:** Rename the layer node to an id outside normalizeId's range, for example 'wf:edges', as the bracket ids already do ('repeat:...'). Card ids then cannot collide.

- **Verifier notes:** At WorkflowStage.tsx:140, change the layer node id to one that normalizeId can never produce, such as 'wf:edges'. ':' lies outside [a-z0-9-], the same reason the 'repeat:...' bracket ids are safe. No core change is needed. Optionally add a scene test that a step with id 'wf-edges' still renders the workflowEdges node. | At apps/web/src/canvas/WorkflowStage.tsx:140, change the layer node id from 'wf-edges' to one that contains a character normalizeId always rewrites, for example 'wf:edges'. normalizeId replaces ':' with '-', so no document id can ever equal it, and ReactFlow already handles ':' ids (the 'repeat:...' brackets).

Leave the CSS class 'wf-edges' on the <svg> as it is. It is a className, not the node id (WorkflowNodes.tsx:48, workflow.css:20-21).

Optionally, add a render test: a workflow whose step id is 'wf-edges' should still produce one svg.wf-edges plus its card.

## C52. [low] Workflow popover does not wrap long unbroken tokens; the label heading and the why text run past the 300px box
- **Location:** apps/web/src/canvas/workflow.css:30 (.wf-pop); content at apps/web/src/canvas/WorkflowPopover.tsx:28 (h3 label) and :30 (why)
- **Input:** Step label of 40 characters with no break opportunity, such as 'Supercalifragilisticexpialidociousnessx…' (the core cap), or a why containing an 80-character run with no spaces such as 'WWW…W xxx…'. Open the card's popover with Enter.
- **Actual:** Label: the h3 measures scrollWidth 300 against clientWidth 266, and the popover 316 against 298, so the title is cut at the popover edge. Why: the <p> measures scrollWidth 982 against clientWidth 266, and the popover 998 against 298. Most of the text sits behind a horizontal scroll inside the 300px popover (screenshot pop-guard.png). The products/steps panel wraps the same strings correctly (no overflow measured). The bracket label 'For each <40 chars>' also overflows its box, scrollHeight 48 against clientHeight 23 (.wf-bracket, workflow.css:19, overflow visible).
- **Expected:** Popover text wraps inside 300px, as the panel does.
- **Fix proposed:** Add overflow-wrap: anywhere (or word-break: break-word) to .wf-pop, at least to its h3, p and li. For .wf-bracket, clamp to one line with white-space: nowrap; overflow: hidden; text-overflow: ellipsis, and add a title attribute, or let the box grow.

- **Verifier notes:** In apps/web/src/canvas/workflow.css, add `.wf-pop h3, .wf-pop p, .wf-pop li { overflow-wrap: anywhere; }`. Adding overflow-wrap: anywhere on .wf-pop itself works too. I verified this removes the overflow: popover scrollWidth 298 equals clientWidth 298 for both cases. Also add `:root:lang(ko) .wf-pop p { word-break: keep-all; }` to match the cloud .cv-pop__why and the panel.

For .wf-bracket, adding overflow-wrap: anywhere stops the long token spilling sideways. The bracket's height and padding are a separate issue: every label already spills vertically (a one-line label measures 28 tall in a 23px box), so a nowrap plus ellipsis clamp alone would not keep the text inside the box. That should be adjusted separately and not folded into this finding. | Popover: add overflow-wrap: anywhere to .wf-pop in apps/web/src/canvas/workflow.css:30. This is the convention panel/workflow.css already uses, and the Korean `p` keep-all rule in base.css still applies alongside it.

Bracket: in workflow.css:19, change `.wf-bracket` to padding: 4px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis. Pass title={b.label} in apps/web/src/canvas/WorkflowNodes.tsx:44. Even a single line spills today (sh 28 against ch 23), because the 24px border-box has 8px vertical padding. Truncating loses nothing, since the products/steps panel lists the full repeat group.

Alternative: have core reserve height for the wrapped label so it stays inside the obstacle and bounds rect. That change is in packages/core, outside this web scope.

## C53. [low] (Outside this dimension: UI copy) The workflow popover's close button reads 'Hide products'
- **Location:** apps/web/src/canvas/WorkflowPopover.tsx:28
- **Input:** Focus any workflow card and press Enter (or click it).
- **Actual:** The popover's first control is a button labelled t('panel.collapse'): 'Hide products' / '제품 숨기기' / '隐藏产品'. It closes the step popover, not the products panel. Every popover innerText starts with 'Hide products'.
- **Expected:** A close label for the popover, such as 'Close', in a new workflow.pop.close key for en/ko/zh.
- **Fix proposed:** Add a 'workflow.pop.close' string (en/ko/zh) and use it for the button, with an aria-label if it becomes an icon.

- **Verifier notes:** Add a "workflow.pop.close" key: "Close" for en, "닫기" for ko, "关闭" for zh. Use it at apps/web/src/canvas/WorkflowPopover.tsx:28: `<button onClick={p.close} aria-label={t('workflow.pop.close')}>{t('workflow.pop.close')}</button>`. Also consider moving the button after the h3 so the dialog's reading order starts with the step title. | Add a "workflow.pop.close" key to strings.json for en/ko/zh ("Close" / "닫기" / "关闭"). In WorkflowPopover.tsx:28 change it to `<button type="button" onClick={p.close}>{t('workflow.pop.close')}</button>`. If the button becomes an icon, put the same string in aria-label. Optionally add an assertion in scripts/e2e-workflow.mjs that the first #cv-pop button text does not equal t('panel.collapse').
