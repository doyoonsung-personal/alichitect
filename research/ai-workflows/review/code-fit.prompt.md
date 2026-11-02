Review task. Read-only: do not edit or create files. You are in the repository C:/Users/mendo/ali_catalog (a live Alibaba Cloud architecture builder: chat on the left, a diagram Qwen draws as it streams on the right; shared code in packages/core, contract in packages/core/src/types.ts, server in apps/server, Cloudflare Worker in apps/worker, web app in apps/web, evals in eval/).

Read research/ai-workflows/PLAN.md: a plan to add a second focus, an "AI and agents" workflow view, beside the cloud architecture view.

Act as an adversarial senior engineer on this codebase. Check the plan against the actual code:
1. Verify every file:line reference and code claim in the plan (for example validate.ts:436-442, validate.ts:1304-1313, request.ts:113, request.ts:222-247, llm.ts:607-703, llm.ts:1445-1545, llm.ts:1531-1545, llm.ts:1177, layout.ts:416-419, layout.ts:444-447, index.tsx:218, proposal.ts:414, proposal.ts:718, model.ts:246-251, pdf.ts:38, prompt.test.ts:181-182, apps/server/test/backup.test.ts:151, claude.ts:125, proposal-prompt.ts:38-39 and :45, apps/web/src/store/reducer.ts:622, apps/worker/src/turn.ts:43-51). Say for each whether it is right, and correct it if not.
2. Find touch points the plan misses: places that rebuild, serialise, validate, persist, cap, diff, replay or display SessionMemory, ops, warnings, highlights, change lines, sessions, D1 storage, quotas or evals, that would silently drop or mishandle a second document (memory.workflow) or a turn mode.
3. Find contract problems: op names that collide with existing ops or keys, id namespace collisions, fields that clash with leak tests (banned keys), caps and body limits, anything that breaks existing tests or recorded fixtures.
4. Judge the phase order and sizes.

Return Markdown: a table of findings (severity high/medium/low, plan section, finding, evidence as file:line, suggested change), then a short list of what the plan gets right. Be concrete; no generic advice.
