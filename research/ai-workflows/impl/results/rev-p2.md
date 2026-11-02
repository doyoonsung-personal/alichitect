Found five demonstrated defects. The existing suites still pass: **119 workflow tests and 24 cloud-layout tests**. No files were written.

Below, `S(id, fields)` means `{t:'step', id, kind:'agent', label:id, ...fields}`, `L(id,from,to)` means a link op, and `U(id)` means an unstep op. Each sequence starts empty and lays out after every op.

1. **High — Detaching a previously inline node overlaps its host.**  
   [workflow-layout.ts:103](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-layout.ts:103)

   Input:
   ```js
   S('host')
   S('x')
   S('x', {on:'host'})
   S('x')
   ```
   **Actual:** `host` and `x` both end at `(0,0)`, with identical card rectangles. `arrival` remembers that `x` was once inline, so line 103 retains its attached cell; line 129 then skips placement.

   **Expected:** `host` stays at `(0,0)` and detached `x` receives a free inline cell, here `(200,0)`.

   **Fix:** Track the previous placement role separately from arrival history. When an attached node becomes inline, allocate its inline cell again.

2. **High — Moving a sub-agent retains invalid descendant offsets, producing overlapping cards.**  
   [workflow-layout.ts:184](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-layout.ts:184)

   Input:
   ```js
   S('host')
   S('sub')
   S('tool', {kind:'tool', on:'sub'})
   S('sibling', {kind:'tool', on:'host'})
   S('sub', {on:'host'})
   ```
   **Actual:** `sub` moves to `(0,168)`, but its child `tool` moves to `(0,84)`, exactly overlapping `sibling`. The immediate host name remains `sub`, so `priorOffset` is reused even though the subtree’s position changed.

   **Expected:** `sibling` remains at `(0,84)`, `sub` occupies `(0,168)`, and `tool` sits below it at `(0,252)`.

   **Fix:** Preserve descendant offsets relative to their parent, or invalidate and reallocate subtree offsets when its root changes placement. Check occupied positions before reusing offsets.

3. **Medium — Ordinary step arrival triggers a false splice; the move-budget gate accepts it.**  
   [workflow-layout.ts:110](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-layout.ts:110), [workflow-layout.test.ts:43](C:/Users/mendo/ali_wt/rev1/packages/core/test/workflow-layout.test.ts:43)

   Input:
   ```js
   S('a')
   S('b')
   L('ab', 'a', 'b')
   L('ab', 'a', 'x') // pending replacement
   L('xb', 'x', 'b') // pending link
   S('x')
   ```
   **Actual:** Arrival of `x` flushes both pending links. Layout infers a splice and moves existing `b` from column 1 to column 2, despite there being no splice op.

   **Expected:** Under the zero-foreign-moves rule, `b` stays at cell `(1,0)` and `x` takes `(1,1)`.

   I extracted and executed the test’s actual `budget()` helper against this sequence: **it passes every transition**, including the erroneous move. The helper trusts the layout’s own declaration that a move is a splice.

   **Fix:** Carry explicit splice provenance into layout; graph differences alone cannot distinguish these operations. Have the gate independently derive permitted movement from the operation and previous graph, rather than trusting `next.workflow.moves`.

4. **Medium — Deleted attachment slots permanently consume the visibility limit.**  
   [workflow-layout.ts:175](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-layout.ts:175)

   Input:
   ```js
   S('host')
   S('a', {kind:'tool', on:'host'})
   S('b', {kind:'tool', on:'host'})
   S('c', {kind:'tool', on:'host'})
   U('a')
   U('b')
   U('c')
   S('d', {kind:'tool', on:'host'})
   ```
   **Actual:** Only the host card is returned, with `hiddenAttached: 1`. Its sole live tool, `d`, is hidden because visibility slices the first three historical slots **before** removing deleted members.

   **Expected:** `d` is visible and `hiddenAttached` is zero; collapse applies past three live attachments.

   **Fix:** Separate visibility selection from physical slot reservations. Select up to three live attachments while retaining holes and existing card positions.

5. **Medium — Reusing a removed ID bypasses explicit splice placement.**  
   [workflow-layout.ts:110](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-layout.ts:110)

   Input:
   ```js
   S('a')
   S('b')
   L('ab', 'a', 'b')
   S('x')
   U('x')
   {t:'splice', into:'ab', id:'x', kind:'guard', label:'x'}
   ```
   **Actual:** The graph becomes `a → x → b`, but cells remain `a=(0,0)`, `b=(1,0)`, `x=(2,0)`, with no recorded shift. The retained tombstone cell makes `has(cells, e.to)` skip splice handling.

   **Expected:** `x=(1,0)` and `b=(2,0)`, with the required one-column splice translation.

   **Fix:** Distinguish live placement from tombstone reservations. An explicit splice of a reintroduced node must override its obsolete cell and perform the prescribed shift.

Checked and found correct in the exercised cases:

- All 32 fixtures replay in arrival, reverse-topological, and fixed shuffled order.
- Graph-based loop classification distinguishes late backward dependencies from loops.
- Tidy uses longest-path columns and produces nonoverlapping fixture cards.
- Repeat brackets split at gaps and row boundaries.
- Ordinary splices and flat-stack spare-row overflow meet their tested budgets.
- All nine requested viewport combinations preserve the 11 px floor and report horizontal panning.
- JSON round trips, frozen inputs, and tested object-key reorderings preserve results.
- Cloud layout tests pass. The reviewed files introduce no prompt/wire construction or backend identity lookup.

Codex session ID: 01a19cd1-ab07-7042-9c2e-1d7367e43e8e
Resume in Codex: codex resume 01a19cd1-ab07-7042-9c2e-1d7367e43e8e
