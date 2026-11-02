Implemented all seven fixes in the four requested files. Existing tests, public signatures, and warning codes remain unchanged. No project code, tests, or builds were run; no commit was made.

| Finding | Change | Regression test added |
|---|---|---|
| 1 | Recursively collects attachment inputs with a visited set for reply and trifecta checks. | `reply and trifecta checks include nested attachment inputs with cycle protection` |
| 2 | `unstep` cancels pending versions, including pending-only links, without creating tombstones for them. | `unstep cancels materialized and pending versions of a link` |
| 3 | Reserves splice capacity before flushing pending links; stages changes and rolls back either-half failures. | `splice reserves both halves before flushing pending links and rolls back failures` |
| 4 | Shares one bounded, normalization-stable allocator across collision, splice, and repair IDs. | `the literal overlong collision reference retains its normalization behavior` and `generated ids round-trip through validation and removal deletes only the named element` |
| 5 | Reserves pending IDs and removes the exact queued entry by reference. | `pending ids reserve the namespace and flushing preserves unrelated requests` |
| 6 | Rejects either resolved endpoint ID before mutation with `wf-bad-op` at warning severity. | `splice rejects either endpoint before changing the graph or pending queue` |
| 7 | Sorts attachment removals, incident edges, member updates, and pending flushes by ID. | `removal records are sorted independently of graph insertion order` |

Finding 1’s test is in [workflow-checks.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/workflow-checks.test.ts:259); the reducer tests are in [workflow.test.ts](C:/Users/mendo/ali_catalog/packages/core/test/workflow.test.ts:115). Finding 4 retains the literal normalization sequence as agreed.

Codex session ID: 01a19c8d-26ce-7401-b450-83789e723544
Resume in Codex: codex resume 01a19c8d-26ce-7401-b450-83789e723544
