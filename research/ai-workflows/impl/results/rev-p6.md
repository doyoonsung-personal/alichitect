Found four demonstrated defects. No files were changed.

1. **High — Retry-only steps disappear from the estimate.**  
   [workflow-estimate.ts:108](C:/Users/mendo/ali_wt/rev2/packages/core/src/workflow-estimate.ts:108)

   Reachability uses the DAG after removing loop links. Steps entered through those links are excluded from pricing entirely.

   Minimal graph: `trigger → check`, `check → message` (`loop`, `max:3`), `message → check`, and `check → end` (`exhausted`). Make `message` a Chat App `send`.

   **Actual:** typical `$0`, upper `$0`, no priced lines.  
   **Expected:** typical `$0.005`, upper `$0.015`: one and three retry messages.

   This affects `insurance-claims-triage.json`: the request-for-documents path disappears. Its upper subtotal is **$0.02093912 instead of $0.03092912** under the stated retry assumptions.

   **Fix:** include loop-reachable nodes and account for their bounded executions. They must not depend on reachability through non-loop edges alone.

2. **Medium — Overlapping loops multiply their shared steps beyond the permitted retry counts.**  
   [workflow-estimate.ts:137](C:/Users/mendo/ali_wt/rev2/packages/core/src/workflow-estimate.ts:137)

   Minimal graph: `a → b → c → end`, with retries `b → a` and `c → b`, each `max:3`; forward exits are marked `exhausted`. Only `b` costs money: one `$0.005` Chat App message.

   **Actual:** typical `$0.020`, upper `$0.080`—four and sixteen executions of `b`.  
   **Expected:** `$0.015` and `$0.035`—three and seven executions. Each retry link can be taken three times **per run**, so the shared step has at most `1 + 3 + 3` visits, not `4 × 4`.

   In `invoice-three-way-match.json`, this produces an upper subtotal of **$0.02918262 instead of $0.01465662**: `$291.8262` versus `$146.5662` monthly.

   **Fix:** track each loop’s remaining budget when combining paths; do not multiply overlapping cycle memberships. Add a hand-calculated overlapping-loop fixture test.

3. **High — A validator-clean graph within the documented caps exhausts memory.**  
   [workflow-estimate.ts:348](C:/Users/mendo/ali_wt/rev2/packages/core/src/workflow-estimate.ts:348)

   Concrete input: trigger `a` fans out through `next` links to nineteen decisions, `b00`–`b18`. Each decision branches equally to its own terminal `z00`–`z18`, or shared terminal `zz`. Each private terminal represents a Chat App `send`, with `approval:'skip'`.

   This is **40 nodes and 57 links**; `checkWorkflow` returns no warnings. Alphabetical processing expands all decisions before consuming their destinations, creating **524,288 distinct frontiers**.

   **Actual:** the Node reproduction with a 256 MiB heap aborts with `JavaScript heap out of memory`.  
   **Expected:** typical **$0.0475**, upper **$0.095**, computed within bounded resources.

   **Fix:** factor independent parallel choices instead of enumerating their Cartesian product. Add an explicit resource bound and diagnostic for graphs that cannot be evaluated safely.

4. **Medium — Finite but unbounded settings can hang execution or return Infinity.**  
   [workflow-estimate.ts:154](C:/Users/mendo/ali_wt/rev2/packages/core/src/workflow-estimate.ts:154), [workflow-estimate.ts:194](C:/Users/mendo/ali_wt/rev2/packages/core/src/workflow-estimate.ts:194)

   Minimal input: one `qwen3.7-plus` agent, `turns:1`, with:
   ```js
   { agents: { a: { typical: 1e308, upper: 1e308 } } }
   ```

   **Actual:** the reproduction timed out after 1.5 seconds. The loop cannot ultimately terminate: JavaScript’s counter stops advancing at `2**53`, still below `count`.

   Separately, one repeated guard with both item counts and `guardTypes` set to `1e308` returns **Infinity** in its lines and totals. All inputs pass `valid()`.

   **Expected:** reject out-of-range settings or apply a documented bounded fallback before calculation.

   **Fix:** impose domain limits on requests, tokens, items, iterations and volume; check arithmetic results for overflow. Finiteness of individual inputs is insufficient.

Checked and found correct:

- All **63 estimator tests** and **67 prompt tests** pass.
- Catalog token rates, tier selection, thinking rates, token defaults, and both specified agent-formula examples.
- Tool fees, PDF pages, temporary-free tools, Guardrails and the platform constants against `NOTES.md`.
- Ordinary parallel/branch arithmetic, isolated repeats and loops, cache eligibility, batch non-stacking, fixed-monthly separation, Global assumptions and nonnumeric latency.
- All 32 fixtures satisfy finite/nonnegative totals and `upper ≥ typical`. Independent upper-route checks found no 10× subtotal discrepancy, but exposed the loop errors above.
- Cloud prompt pinning passes; the reviewed estimator adds no serving-backend identity to prompts or wire code.

Codex session ID: 01a19cd3-0ba5-7a81-a7ad-cfa37228e60c
Resume in Codex: codex resume 01a19cd3-0ba5-7a81-a7ad-cfa37228e60c
