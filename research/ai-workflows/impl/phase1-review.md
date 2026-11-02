Found **7 concrete defects**. These are source-traced counterexamples; I did not run Node or modify files. Op sequences below start from `emptyWorkflow()` and share one context, unless specified.

1. **High — Reply protection misses untrusted inputs under sub-agents.**  
   [workflow-validate.ts:145](C:/Users/mendo/ali_catalog/packages/core/src/workflow-validate.ts:145)

   ```json
   {
     "nodes": {
       "t": {"id":"t","kind":"trigger","label":"t"},
       "a": {"id":"a","kind":"agent","label":"a","ai":"qwen3.8-max","turns":10},
       "b": {"id":"b","kind":"agent","label":"b","ai":"qwen3.8-max","turns":10,"on":"a"},
       "u": {"id":"u","kind":"knowledge","label":"u","on":"b","untrusted":true},
       "r": {"id":"r","kind":"act","label":"r","effect":"reply"},
       "h": {"id":"h","kind":"human","label":"h","task":"takeover"},
       "z": {"id":"z","kind":"end","label":"z"}
     },
     "edges": {
       "ta": {"id":"ta","from":"t","to":"a"},
       "ar": {"id":"ar","from":"a","to":"r","kind":"branch"},
       "ah": {"id":"ah","from":"a","to":"h","kind":"escalate"},
       "rz": {"id":"rz","from":"r","to":"z"},
       "hz": {"id":"hz","from":"h","to":"z"}
     },
     "groups": {}
   }
   ```

   **Wrong:** No `wf-reply-guard`. The backward walk sees `a`, but its attachment scan considers only directly attached tools/knowledge. It skips sub-agent `b` and therefore misses `u`.

   **Expected:** Warn: untrusted knowledge reaches the reply through the sub-agent and orchestrator without a guard.

   **Fix:** Traverse attachment descendants recursively with a visited set when collecting untrusted inputs. Include a regression where moving an untrusted tool under a sub-agent does not silence the warning.

2. **Medium — Removing a link leaves its pending replacement alive.**  
   [workflow.ts:109](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:109)

   ```json
   [
     {"t":"step","id":"a","kind":"trigger","label":"a"},
     {"t":"step","id":"b","kind":"end","label":"b"},
     {"t":"link","id":"e","from":"a","to":"b"},
     {"t":"link","id":"e","from":"a","to":"c"},
     {"t":"unstep","id":"e"},
     {"t":"step","id":"c","kind":"end","label":"c"}
   ]
   ```

   **Wrong:** `unstep` removes and tombstones `e: a→b`, but leaves pending `e: a→c`. Adding `c` recreates `e` without another link op.

   **Expected:** Removing `e` cancels both its materialized and pending versions. It must remain absent.

   **Fix:** Remove pending entries by ID whenever processing `unstep`, including when the ID exists only in `pending`. Keep tombstones limited to materialized elements.

3. **Medium — Pending-link flushing makes splice cap handling non-atomic.**  
   [workflow.ts:87](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:87), [workflow.ts:73](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:73)

   Use `createWorkflowCtx({maxEdges:2})`:

   ```json
   [
     {"t":"step","id":"a","kind":"trigger","label":"a"},
     {"t":"step","id":"b","kind":"end","label":"b"},
     {"t":"link","id":"e","from":"a","to":"b"},
     {"t":"link","id":"p","from":"a","to":"x"},
     {"t":"splice","into":"e","id":"x","kind":"guard","label":"x"}
   ]
   ```

   **Wrong:** The preflight sees one edge and permits the splice. Adding `x` flushes `p`, filling the cap. The reducer then changes `e` to `a→x`, but drops `x→b`. Final edges are two `a→x` links; `b` becomes unreachable.

   **Expected:** Either complete the splice or reject it without partially changing the graph and pending state.

   **Fix:** Reserve capacity for both splice halves before flushing pending links, or stage graph/context changes and commit only after the complete splice succeeds. Existing cap tests cover an already-full graph, not capacity consumed during `step()`.

4. **Medium — Collision suffixes create IDs that subsequent validation redirects to a different element.**  
   [workflow.ts:38](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:38), [workflow-validate.ts:26](C:/Users/mendo/ali_catalog/packages/core/src/workflow-validate.ts:26)

   Pass **each** op through `validateWorkflowOp` before applying:

   ```json
   [
     {"t":"each","id":"a1234567890123456789012345678901234567890","over":"items"},
     {"t":"step","id":"a1234567890123456789012345678901234567890","kind":"end","label":"node"},
     {"t":"unstep","id":"a1234567890123456789012345678901234567890-2"}
   ]
   ```

   **Wrong:** The 41-character group ID forces the node to receive the 43-character `…-2` ID. On the removal op, `normalizeId` truncates that ID back to the group ID. The **group is removed**, while the requested node survives.

   **Expected:** Generated IDs remain valid, stable references through validation.

   **Fix:** Use a shared bounded-ID allocator that reserves room for suffixes. Apply it to collision names, splice link IDs, and attachment-repair link IDs; concatenated generated link IDs have the same problem.

5. **Medium — Collision handling can consume an unrelated pending link.**  
   [workflow.ts:35](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:35), [workflow.ts:55](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:55)

   ```json
   [
     {"t":"step","id":"a","kind":"trigger","label":"a"},
     {"t":"link","id":"e","from":"a","to":"b"},
     {"t":"each","id":"e","over":"items"},
     {"t":"link","id":"e-2","from":"a","to":"c"},
     {"t":"step","id":"b","kind":"end","label":"b"},
     {"t":"step","id":"c","kind":"end","label":"c"}
   ]
   ```

   **Wrong:** Adding `b` flushes pending `e`. Because group `e` now exists, the link is renamed to `e-2`. The subsequent pending lookup finds and removes the unrelated `e-2: a→c`. Only `a→b` survives; adding `c` cannot restore its link.

   **Expected:** Both distinct link requests survive with unique IDs.

   **Fix:** Include pending links in namespace reservations. Track the specific queued entry being flushed instead of deleting whichever pending entry matches its newly allocated ID.

6. **Medium — Splicing with an endpoint’s ID changes the endpoint before discovering the invalid self-link.**  
   [workflow.ts:89](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:89)

   ```json
   [
     {"t":"step","id":"a","kind":"trigger","label":"a"},
     {"t":"step","id":"b","kind":"end","label":"b"},
     {"t":"link","id":"e","from":"a","to":"b"},
     {"t":"splice","into":"e","id":"a","kind":"guard","label":"Inserted guard"}
   ]
   ```

   **Wrong:** `step()` replaces trigger `a` with a guard. The attempted first half `a→a` is rejected, leaving original `e` intact; the second half adds another `a→b`. The operation removes the workflow’s only trigger and produces duplicate routes.

   **Expected:** Reject the impossible splice without mutation, or allocate a genuinely new insertion node.

   **Fix:** Validate the resolved insertion ID against both endpoints before upserting the node. Treat failure of either half as failure of the whole splice.

7. **Low — Removal results depend on object insertion order.**  
   [workflow.ts:104](C:/Users/mendo/ali_catalog/packages/core/src/workflow.ts:104)

   ```json
   {
     "nodes": {
       "a": {"id":"a","kind":"agent","label":"a","ai":"qwen3.8-max","turns":10},
       "b": {"id":"b","kind":"tool","label":"b","on":"a"},
       "c": {"id":"c","kind":"tool","label":"c","on":"a"}
     },
     "edges": {},
     "groups": {}
   }
   ```

   Apply `{"t":"unstep","id":"a"}`. Repeat with the identical graph serialized with node keys ordered `a,c,b`.

   **Wrong:** `removed`, `tombstones`, and `ctx.removedThisTurn` are ordered `a,b,c` versus `a,c,b`. Group-member updates and incident-edge removals similarly iterate unsorted objects.

   **Expected:** Equivalent graphs produce identically ordered change records regardless of object insertion order.

   **Fix:** Sort attachment expansion, incident-edge removal, and group-member updates by ID.

**Spec items checked and found correct by source inspection:**

- Approval policy and override precedence; missing-effect `act` defaults to `send`; waivers downgrade uncovered default-policy actions.
- Approval checks catch parallel bypasses, reject/timeout/edit routes, and producers after approval—including `tool` with `effect:"write", task:"create"`.
- Takeover gates and attached-tool `approval:"required"` follow the explicit spec.
- Inline trifecta checks include upstream attachments and ignore waivers.
- Cycle detection sorts traversal, excludes loop/edit edges, and still detects separate unbounded cycles beyond those routes.
- Ordinary node replacement preserves omitted `after`; builders omit undefined fields; graph objects are copied before changes.
- Ordinary attachment cascades preserve tombstone values; group deletion clears `repeat`; turn completion clears pending links and removal history.
- Validator aliases, reference dropping, numeric bounds, boolean/enum checks, and shared/cloud-op routing match the specified behavior. Validated prototype-key IDs are normalized safely.
- Model-table duplicate/tier/modality/role/tool-reference checks, input cloning, lookup maps, and `loadModels` wiring match the contract.
- Repair ordering and idempotence for the specified attachment, dangling-reference, agent-turn, and cycle repairs are supported by the source.
- Workflow types and warning-code additions match phase 1. Runtime tests, typechecks, and the byte-identical prompt hash remain unverified.

Codex session ID: 01a19c84-e6b7-7130-9400-d47900bbd695
Resume in Codex: codex resume 01a19c84-e6b7-7130-9400-d47900bbd695
