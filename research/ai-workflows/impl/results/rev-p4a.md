1. **Medium — Approval wording contradicts the shared policy.**  
   [workflow-prompt.ts:106](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-prompt.ts:106) says “Gate inline actions on every path,” without limiting this to actions requiring approval. Line 108 exempts `read`, `write`, `reply` and `notify`.

   **Concrete input:** `trigger → act(effect:"write", label:"Update ticket") → end`, with default settings.  
   **Wrong:** Following line 106 adds human approval to an ordinary ticket update.  
   **Expected:** No approval gate; running `checkWorkflow` on this graph returned `[]`. This matches D9.  
   **Fix:** Say “Gate inline actions whose effective approval policy requires approval.” Add cases covering exempt effects and explicit overrides.

2. **Medium — The prompt omits model capabilities needed to satisfy its own rules and checker.**  
   [workflow-prompt.ts:179](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-prompt.ts:179) includes only id, tier, modalities, roles and notes. Region allowlists and structured tool support never reach the model, although rule 7 requires matching tool support.

   **Concrete inputs, demonstrated with `checkWorkflow`:**
   - `trigger → ai(task:"classify", ai:"qwen3.8-flash") → end`, with `workflowSettings.region:"ap-southeast-5"`, produces **`wf-ai-region`**. Every current model lists only `ap-southeast-1`, but the prompt never states this restriction.
   - `trigger → agent(ai:"qwen3.8-max", task:"plan", turns:10) → end`, with attached `tool:"pdf_parse"`, produces **`wf-ai-mismatch`**. Both identifiers are advertised; their incompatibility is omitted.

   **Expected:** The model can identify unsupported combinations before recommending them and explain region conflicts.  
   **Fix:** Keep `models.promptRows()`, but supplement it with price-free region, function-calling and tool-support metadata, including the meaning of unknown support. Test these concrete combinations.

3. **Low — The contract explicitly calls `ai` optional without stating its conditional requirement.**  
   [workflow-prompt.ts:44](C:/Users/mendo/ali_wt/rev1/packages/core/src/workflow-prompt.ts:44) lists only `id/kind/label` as required for steps, then says all other fields are optional.

   **Concrete input:** Between a trigger and an end:
   ```json
   {"t":"step","id":"work","kind":"ai","label":"Classify","task":"classify","runs":"fc"}
   ```
   **Wrong:** This follows the advertised field requirements and passes `validateWorkflowOp` without warnings, but `checkWorkflow` returns **`wf-ai-missing`**, severity **error**.  
   **Expected:** The prompt explicitly requires a valid `ai` on every `ai` and `agent` step, consistent with PLAN.md section 3.  
   **Fix:** Distinguish optional schema fields from requirements conditional on step kind, and test those requirements.

Checked and correct: all **144 tests** across the prompt, cloud-prompt, workflow-checker and reducer suites passed. The workflow prompt measures **7,581 estimated tokens**; byte stability, section ordering, shared approval-text inclusion, catalog filtering, serialization determinism, empty-workflow handling and the 30-tombstone limit pass. The worked example validates and replays without warnings or repairs, contains no cloud ops, and the generated system prompt contains neither dollar signs nor the banned backend names. No files were changed.

Codex session ID: 01a19cd1-af49-73a0-b612-2764e150ccd0
Resume in Codex: codex resume 01a19cd1-af49-73a0-b612-2764e150ccd0
