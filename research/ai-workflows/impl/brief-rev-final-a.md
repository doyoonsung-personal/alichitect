# Final adversarial review, part A: the workflow backend end to end (read-only)

Read-only: don't edit or create files in the repository. Never stop to ask a question.

Repository: this worktree, a checkout of `C:/Users/mendo/ali_catalog` at the integrated `phase-1` head. To demonstrate a finding, you may run `node --test <files>` or `node -e` / `node <script>` scripts. Write files only under your system temp folder.

## The feature
This is the first release of an "AI and agents" workflow mode beside the existing cloud-architecture mode. It is designed in `research/ai-workflows/PLAN.md`, and `research/ai-workflows/impl/phase1-spec.md` is the contract. Several earlier reviews each covered one phase. This review covers the **integrated** feature across module boundaries.

## In scope
- **Core:** `packages/core/src/`, especially:
  - `workflow*.ts`, `llm.ts`, `prompt.ts`, `claude.ts`, `approval.ts`, `models.ts`;
  - `proposal.ts` and `proposal-prompt.ts`;
  - the workflow parts of `types.ts`.
- **The local server:** `apps/server/src/`.
- **The Worker:** `apps/worker/src/`, covering request admission, mode routing, streaming, the backup voice, proposals and the bundled `models.json`.
- **The eval harness's workflow path:** `eval/workflow.ts` and `eval/run.ts`. Look only for false gates, where an assertion passes without checking what it claims.

**Out of scope:** `apps/web/**`. Other jobs are changing it now.

## Hunt for
1. **Hidden-backend leaks** in workflow mode. The backup model's vendor and name must never reach the browser: not in SSE events, errors, warnings, proposal text, or step ids and labels echoed back. Trace the backup path (`claude.ts`) and every error path. Also check prompt-injection text in a step label, a why or a req that tries to make the model name its backend.
2. **Prompt injection through stored memory.** `serializeWorkflow` and `workflowUserContent` echo user- and model-authored strings: labels, why, assume and ask text, group `over`. Check whether one can close the `<user_message>` fence, forge a `REPLY LANGUAGE`, `PINNED REQUIREMENTS` or `SESSION SETTINGS` line, or inject newline-led sections.
3. **Admission and limits:**
   - the 512 KiB request rule (`workflow-constraints.ts`, `request.ts`);
   - the workflow size caps;
   - ops per turn;
   - assume and ask limits;
   - hostile JSON: deep nesting, huge strings, prototype keys such as `__proto__` and `constructor` as node ids, and ids that collide with edge or group ids.

   Look for crashes, hangs (anything superlinear), and state corruption.
4. **Mode isolation:**
   - a cloud turn must never see or change workflow memory, and a workflow turn never the cloud graph (except the "a deployment diagram exists" hint);
   - a missing `mode` means `cloud` everywhere;
   - the cloud prompt keeps sha256 `998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`.
5. **The approval invariant:** every effect that needs approval under the shared policy, on every path, is gated after repair. Look for a reachable graph (built through valid ops) where `checkWorkflow` reports clean but an ungated `send`, `publish` or `pay` path exists.
6. **The estimator** (`workflow-estimate.ts`): NaN or Infinity, negative or huge settings, loops and nested repeats, unpriced models, and determinism.
7. **The server and the Worker agree:** the same request gets the same admission, the same events and the same errors on both. Diff the two code paths.
8. **Proposal leaks:**
   - backend names;
   - invented prices in workflow narratives;
   - step-id remapping bypasses;
   - the writer-identity filter.

## For each finding
- severity (high, medium or low);
- file:line;
- a minimal concrete input, with the wrong result and the expected result;
- the fix.

Report only findings you demonstrated, either by running a command or by an exact trace. Finish with the items you checked and found correct.
