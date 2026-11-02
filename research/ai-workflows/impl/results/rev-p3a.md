Found five demonstrated defects. Reproductions used `8f1f923`’s versions of the two dependencies changed later in this worktree. No files were written.

1. **High — Workflow turns bypass pinned constraints.** [llm.ts:1504](C:/Users/mendo/ali_wt/rev3/packages/core/src/llm.ts:1504)

   **Input:** Pin `{text:"Never use Direct Mail", avoid:["direct-mail"]}`. Stream a connected `trigger → act → end` workflow, with the act specifying `product:"direct-mail", effect:"send", approval:"skip"`, followed by `done`.

   **Observed:** One model call; the forbidden product commits while the exclusion remains pinned. No constraint finding or repair call occurs. `checkC` explicitly returns nothing for workflow mode; the workflow checker receives no pinned constraints.

   **Expected:** A constraint violation triggers the existing follow-up mechanism, as required by the plan’s reused product checks.

   **Fix:** Check workflow `product`/`runs` references and narration against pinned constraints, tag findings as workflow findings, and feed violations into repair.

2. **Medium — Compaction deletes exchanges before they can be summarized.** [turn.ts:181](C:/Users/mendo/ali_wt/rev3/apps/server/src/turn.ts:181)

   **Input:** Ten workflow exchanges, each user and assistant text containing 6,000 Korean characters; prepend `Remember blue:` to the first user turn. Include a cloud graph with 150 nodes using 40-character labels and 160-character explanations, 100 labeled edges, eight labeled groups, and a two-step workflow. Send a 6,000-character Chinese ask; the model returns only `done`.

   **Observed:** The accepted request was **498,866 bytes**. The commit retained 20 turns, deleted the first exchange, and contained no summary. Only one model call occurred. Compaction reduced the history back to ten exchanges before `historyOverflows` ran, suppressing summarization.

   **Expected:** The departing exchange survives in the rolling summary before deletion.

   **Fix:** Determine and summarize departing exchanges from the uncompacted history. Preserve unsummarized exchanges if summarization fails.

3. **Medium — Compaction can return memory that exceeds the next-request budget.** [turn.ts:97](C:/Users/mendo/ali_wt/rev3/apps/server/src/turn.ts:97)

   **Input:** Empty history/tombstones; two cloud nodes; 400 edges with 400-character Korean labels; six VPC groups with 400-character Chinese labels; a connected two-step workflow.

   **Observed:** The parser accepts the **509,377-byte** request. Compaction returns **509,319 bytes** of memory unchanged. Adding a valid 6,000-character Korean ask produces **527,373 bytes**, exceeding the **524,288-byte** transport limit. The next request receives 413 by the body-reader’s size check.

   **Expected:** Committed memory fits the advertised budget including the next ask.

   **Fix:** Enforce the retained-document budget at admission and before commit; handle an exhausted compaction budget explicitly. Extend the size test to cover documents alone exceeding the reserved budget.

4. **Medium — Stored workflow references bypass the model allowlist and reach prompts and commits.** [request.ts:341](C:/Users/mendo/ali_wt/rev3/apps/server/src/request.ts:341)

   **Input:** A connected `start → end` workflow whose trigger contains `ai:"claude-opus-5-5"`; ask to keep it; model returns `done`.

   **Observed:** Parsing succeeds, the backend name appears in the outgoing user prompt, and the committed workflow preserves it with **zero warnings**. This is acceptance of a client-supplied forbidden reference, not disclosure of a server secret.

   **Expected:** Structured model references are restricted to the design’s model table, including restored memory and tombstones.

   **Fix:** Validate `ai` and `tool` against their respective allowlists before prompt construction. Add seeded-memory leak tests; current tests exercise streamed fields.

5. **Medium — Accepted prototype-name IDs cannot be edited consistently.** [request.ts:332](C:/Users/mendo/ali_wt/rev3/apps/server/src/request.ts:332)

   **Input:** `workflow.nodes.constructor = {id:"constructor", kind:"trigger", label:"Start"}`. Stream `{"t":"unstep","id":"constructor"}`, then `done`.

   **Observed:** Parsing succeeds. The streamed operation becomes `unstep("constructor-id")`; `constructor` remains, and the change line says `no workflow changes`.

   **Expected:** Accepted stored IDs and operation IDs address the same element.

   **Fix:** Reject reserved/noncanonical IDs consistently across workflow records, references, tombstones, and estimate maps. Test `constructor` alongside `__proto__`.

Checked and found correct in the focused **209-test passing run**:

- Cloud prompt hash, omitted-mode behavior, recorded-stream replay, retries, fallback, continuation, repair, and tombstones.
- Alternating prompt selection, workflow round trips, document isolation, deterministic diffs, and warning view tags.
- Workflow backup rescue, continuation with repair disabled, and streaming/completion voice selection.
- Worker quota accounting: two units with backup, one without.
- Tested wrong types, numeric/count bounds, and `__proto__` rejection.

The Node server backup suite could not start because the sandbox denied creation of its temporary log directory; I do not claim that suite passed.

Codex session ID: 01a19cda-9dce-7ba1-a450-4a01bef3797e
Resume in Codex: codex resume 01a19cda-9dce-7ba1-a450-4a01bef3797e
