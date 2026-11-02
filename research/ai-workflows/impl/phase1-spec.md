# Phase 0b and 1 implementation spec

The design is `research/ai-workflows/PLAN.md` sections 3 (contract), 5 (checks) and D9 (approval). This file pins what phase 0b and phase 1 build, so the code can be written and reviewed against it. Nothing here touches the cloud path.

## Hard constraints

- **Additive only.**
  - Don't change any existing behaviour, prompt text, op grammar, test or fixture in the cloud path.
  - `buildSystemPrompt(catalog)` must return byte-identical output.
  - All existing tests must pass unchanged: `npm test` at the root, `npm test` in `apps/web` and in `apps/worker`.
- All three typechecks must stay clean. `npm test` runs under type stripping and won't catch a type error, so run them explicitly:
  - `apps/web/node_modules/.bin/tsc -p packages/core/tsconfig.json`
  - `npm run typecheck` in `apps/web`
  - `npm run typecheck` in `apps/worker`
- **The same style as `reducer.ts` and `validate.ts`:**
  - erasable TypeScript only (Node type stripping): no enums, namespaces or parameter properties;
  - browser-safe: no Node APIs outside `*-node.ts`;
  - pure functions that never mutate their inputs;
  - fixed key order on built objects, and no `undefined` optional keys;
  - comments only where the code alone isn't clear.
- **No new dependencies.**

## Files

| File | What |
|---|---|
| `packages/core/src/types.ts` | Add a `// ---------- Workflow ----------` section (types below). Extend `WarningCode` with the `wf-*` codes. Nothing existing changes. |
| `packages/core/catalog/models.json` | Phase 0b data (written by Claude, not generated). |
| `packages/core/src/models.ts` | `createModelTable(file)`: the indexed table; pure. |
| `packages/core/src/catalog-node.ts` | Add `loadModels()`, next to `loadCatalog()`. |
| `packages/core/src/approval.ts` | The D9 table and `needsApproval()`. |
| `packages/core/src/workflow.ts` | The reducer: `emptyWorkflow`, `createWorkflowCtx`, `applyWorkflowOp`, `endWorkflowTurn`, `makeStep`, `makeLink`. |
| `packages/core/src/workflow-validate.ts` | `validateWorkflowOp`, `checkWorkflow`, `repairWorkflow`. |
| `packages/core/test/models.test.ts`, `approval.test.ts`, `workflow.test.ts`, `workflow-checks.test.ts` | Tests (below). |
| `packages/core/test/fixtures/workflows/*.json` | Canonical sample graphs (second job). |

## Types (`types.ts`)

```ts
export type WorkflowNodeKind = 'trigger' | 'ai' | 'agent' | 'decide' | 'guard' | 'human' | 'act' | 'tool' | 'knowledge' | 'memory' | 'end';
export type Effect = 'read' | 'write' | 'reply' | 'notify' | 'send' | 'publish' | 'pay' | 'delete' | 'admin' | 'decide';
export type WorkflowTask =
  | 'classify' | 'extract' | 'retrieve' | 'rerank' | 'generate' | 'check' | 'plan' | 'summarise'
  | 'translate' | 'transcribe' | 'speak' | 'see' | 'create'
  | 'approve' | 'review' | 'takeover';
export type WorkflowEdgeKind = 'next' | 'branch' | 'loop' | 'escalate';
export type WorkflowOutcome = 'approve' | 'edit' | 'reject' | 'timeout' | 'exhausted';

export interface WorkflowNode {
  id: string; kind: WorkflowNodeKind; label: string;
  task?: WorkflowTask; after?: string; on?: string;
  product?: string;   // catalog id of the service the step calls
  runs?: string;      // catalog id where the step's code runs, or 'customer'
  ai?: string;        // models.json model id
  tool?: string;      // models.json built-in tool id (web_search, web_search_image, web_extractor, code_interpreter, mcp, pdf_parse) for tool steps
  turns?: number;     // agent: maximum model requests per run, 1..50
  effect?: Effect;
  untrusted?: boolean; private?: boolean;
  approval?: 'required' | 'skip';
  subject?: string;   // human approve step: id of the step whose output it approves
  join?: 'all' | 'any';
  repeat?: string;    // repeat-group id
  why?: string;
}
export interface WorkflowEdge { id: string; from: string; to: string; kind?: WorkflowEdgeKind; label?: string; max?: number; outcome?: WorkflowOutcome }
export interface WorkflowGroup { id: string; over: string; parallel?: boolean }
export interface WorkflowGraph { nodes: Record<string, WorkflowNode>; edges: Record<string, WorkflowEdge>; groups: Record<string, WorkflowGroup> }

export type WorkflowOp =
  | { t: 'step'; id: string; kind: WorkflowNodeKind; label: string; /* every optional WorkflowNode field */ }
  | { t: 'link'; id: string; from: string; to: string; kind?: WorkflowEdgeKind; label?: string; max?: number; outcome?: WorkflowOutcome }
  | { t: 'each'; id: string; over: string; parallel?: boolean }
  | { t: 'splice'; into: string; id: string; kind: WorkflowNodeKind; label: string; /* same optional fields as step */ }
  | { t: 'unstep'; id: string };

export interface WorkflowSettings {
  region?: string;          // pinned region id; default 'ap-southeast-1'
  approvalOff?: Effect[];   // the user waived approval for these effects
  approvalOn?: Effect[];    // the user asked for approval on these effects
}
```

**Writing the step and splice op types.** Spell out every optional field in the TS type, rather than using a comment.

**The `tool` field** is an addition to PLAN §3. Tool steps need to name a built-in tool, so the estimator can add its fee and `wf-ai-mismatch` can check the model's tool support. A tool step may have `tool` (built-in), `product` (a catalog service such as an API gateway or the customer's MCP host), or both.

**New `WarningCode` members** are exactly the check codes below, plus these validator codes:
- `wf-bad-op`;
- `wf-unknown-ref` (an unknown product, runs, ai or tool reference: the field is dropped, the step kept);
- `wf-id-collision`;
- `wf-cloud-op` (a cloud-only op in a workflow turn, such as `rec` or `node`: dropped);
- `wf-dangling-ref` (`after`, `subject` or `repeat` names something that doesn't exist: the field is dropped by the repair, info).

## models.json (phase 0b, Claude writes it)

```json
{ "version": "2026-11-02", "scope": "international", "models": [ModelEntry...], "tools": [ToolEntry...] }
```

**`ModelEntry`:**

```ts
{
  id, name,
  family: 'qwen',
  tier: 'small' | 'mid' | 'large',
  in: Modality[], out: Modality[],   // Modality = 'text' | 'image' | 'video' | 'audio'
  roles: WorkflowTask[],             // the tasks it is meant for
  functions: boolean | null,         // function calling in Singapore; null = not established
  tools: string[] | null,            // built-in tool ids documented in Singapore; null = not established
  batch: boolean | null,
  regions: string[],
  status: Lifecycle,
  price?: { unit: 'mtok' | 'image' | '10k-chars', tiers: PriceTier[] },  // absent = not confirmed
  use: string,                       // at most 16 words
  note?: string,
  verified: 'YYYY-MM-DD',
  source: string                     // a NOTES.md section
}
```

`PriceTier = { upTo?: number /* input tokens per request */, in?, out?, thinkingOut?, cacheHit?, cacheRead?, cacheWrite?, audioIn?, audioOut?, perUnit? }`

**`ToolEntry`:**

```ts
{
  id, name,
  fee?: { usd: number; per: number; unit: 'call' | 'page' },   // absent = free for now
  freeUntilNotice?: boolean,
  note?,
  verified, source
}
```

**`createModelTable(file)`** returns:
- `version`;
- `models`;
- `byId: Map`;
- `tools: Map`;
- `model(id)`;
- `tool(id)`;
- `promptRows()`, one line per model: `id | tier | in>out | roles | note`.

It throws on a duplicate id, an unknown tier, modality or role, or a tool id named by a model but missing from `tools`.

## approval.ts

```ts
export const APPROVAL_POLICY: Readonly<Record<Effect, { approval: boolean; text: string }>>;
// approval true for send, publish, pay, delete, admin and decide; false for read, write, reply and notify. `text` is the
// example wording from D9.
export function needsApproval(node: WorkflowNode, settings?: WorkflowSettings): boolean;
// order: node.approval ('required' -> true, 'skip' -> false), then approvalOn, then approvalOff, then APPROVAL_POLICY[effect].
// A node without an effect needs no approval, except an act node, which counts as 'send' (wf-act-effect).
export function waived(node: WorkflowNode, settings?: WorkflowSettings): boolean; // true when the policy says yes but the user turned it off
export function approvalRuleText(): string; // one paragraph listing the effects that need approval, for the phase-4 prompt
```

## Reducer (`workflow.ts`)

The cloud `reducer.ts` is the model:
- **`WorkflowLimits`**: `{ maxNodes: 40, maxEdges: 60, maxGroups: 8, maxPending: 60 }`.
- **`WorkflowCtx`**: `{ pending: WorkflowEdge[]; removedThisTurn: string[]; limits }`.
- **`applyWorkflowOp(wf, op, ctx) → WorkflowApplyResult`**, which returns `{ workflow, added, updated, removed, tombstones, warnings }`. The input is never mutated, and the same object is returned when nothing changed.

**Ops:**

- **`step`: upsert by id.**
  - The new node replaces the old one wholesale, except that `after` is kept when the new op omits it.
  - When the id is taken by a link or a group, rename it deterministically to `<id>-2` (then `-3` …), and warn `wf-id-collision` (info).
  - Over the cap: drop it and warn `cap-exceeded`.
  - After adding a node, flush any pending links whose endpoints now exist.
- **`link`: add or replace by id.**
  - The same collision rule applies against nodes and groups.
  - When an endpoint doesn't exist yet, push the link to `pending` (capped) and report nothing added.
  - A link from a node to itself is dropped (`wf-bad-op`, warn).
- **`each`: upsert a group**, with the same collision rule.
- **`splice`:**
  - When link `into` exists, from A to B: add the node; replace `into` with A → X, keeping its id, kind, label, outcome and max; add X → B as `next`, with a free id `<X>-<B>` (suffix `-2` …).
  - When `into` doesn't exist: apply it as a plain `step` and warn `unknown-id` (info).
- **`unstep`:**
  - On a **node**: remove it, its links, and its attached nodes recursively (nodes whose `on` points to a removed node), with tombstones for each.
  - On a **link**: remove the link.
  - On a **group**: remove the group and clear `repeat` on its member steps (they count as updated).
  - On an **unknown id**: warn `unknown-id` (info), unless it is in `removedThisTurn`.
- **`endWorkflowTurn(ctx)`:** clears pending links (each becomes `dangling-edge`, warn) and `removedThisTurn`. It returns the warnings.

## Validator (`workflow-validate.ts`)

```ts
export function validateWorkflowOp(raw: unknown, catalog: Catalog, models: ModelTable, ctx?: ValidateCtx):
  { op?: WorkflowOp | Op; warnings: Warning[] }
```

**Shared ops.** `say`, `plan`, `req`, `assume`, `ask`, `gap` and `done` are delegated to `validateOp` (`validate.ts`) unchanged. `rec`, `node`, `edge`, `group`, `insert`, `move` and `remove` are dropped with `wf-cloud-op` (info).

**`step` and `splice`:**
- **Ids:** normalise with `normalizeId`.
- **Kind:** accept aliases, for example `llm` and `model` → `ai`; `approval`, `approve` and `hitl` → `human` with task `approve`; `condition`, `router` and `branch` → `decide`; `rag` and `retrieval` → `knowledge` with task `retrieve`; `action` → `act`; `start` → `trigger`; `finish` → `end`. Drop on an unknown kind.
- **Task:** drop an unknown task with a warning.
- **Text:** label and why use `TEXT_LIMITS` from `validate.ts`; a missing label falls back to the id.
- **References:**
  - `product` and `runs` resolve through `resolveProduct`; `runs: 'customer'` is kept as-is.
  - `ai` resolves against the model table, and `tool` against its tools.
  - An unresolved reference drops that field with `wf-unknown-ref` (warn) and keeps the step.
- **Numbers and flags:**
  - `turns` is clamped to an integer in 1..50; a non-numeric value is dropped;
  - `effect`, `join`, `approval` and the booleans are checked against their sets;
  - `after`, `on`, `subject` and `repeat` are normalised ids.

**`link`:** normalise ids. Kind aliases: `edge`, `default` and `then` → `next`; `condition` → `branch`; `retry` → `loop`. `max` is an integer in 1..20; `outcome` is checked against its set.

**`each`:** id plus `over` (a label-length text); `parallel` is a boolean.

### `checkWorkflow` and `repairWorkflow`

```ts
export function checkWorkflow(wf: WorkflowGraph, catalog: Catalog, models: ModelTable, settings?: WorkflowSettings): Warning[]
export function repairWorkflow(wf: WorkflowGraph, catalog: Catalog, models: ModelTable, settings?: WorkflowSettings):
  { workflow: WorkflowGraph; warnings: Warning[] }
```

`repairWorkflow` applies the deterministic repairs, then returns the repaired graph plus `checkWorkflow` on it, with the repair warnings first and marked `repaired: true`. It is idempotent: running it again changes nothing and repeats no repair warning.

**Definitions:**
- **Inline step:** a node without `on`.
- **Attached node:** a node with `on`.
- **Content producer:** an `ai` or `agent` node, or a `tool` whose effect is `write` and whose task is `generate` or `create`.
- **Pass-through nodes:** `guard`, `decide`, `knowledge`, `memory`, `act` with effect read or write, `tool` with effect read or none, and `trigger`, which is where a walk ends.
- **Gated action:** an inline `act` or `tool`, or an attached `tool`, for which `needsApproval` is true.
- **Gate**, as seen by a backward walk that arrives at a human node H over H's out-link L:
  - when H's task is `approve`, it is a gate only if L has outcome `approve`;
  - arriving over a `reject`, `timeout` or `edit` link, or a link with no outcome, makes H a pass-through, and the walk continues;
  - when H's task is `takeover`, every out-link counts as a gate.

  So "approve: timeout → send anyway" and "reject → send" both fail the check. That is deliberate.

**The checks**, with their codes, severities and repairs:

| Code | Rule | Severity / repair |
|---|---|---|
| `wf-no-trigger` | there are nodes but no trigger | error |
| `wf-unreachable` | an inline node can't be reached from any trigger over links. Attached nodes are reachable when their host is. | error |
| `wf-ai-missing` | an `ai` or `agent` node without `ai`, or with an `ai` not in the table. A `knowledge` node with `ai` set to an unknown id is also flagged. | error |
| `wf-attach-form` | `on` set on a kind other than tool, knowledge, memory or agent; or the host is missing or isn't an agent (or isn't an agent or ai, for a tool); or attachments form a cycle | repair: drop `on`, set `after` = the old host if it exists, and add a `next` link host → node if the node has no incoming link (free id `<host>-<node>`); warn, repaired |
| `wf-dead-end` | an inline non-`end` node with no outgoing link | warn |
| `wf-cycle` | a directed cycle over inline links that contains no `loop` link and no `edit` outcome link. Find it by depth-first search from the triggers in id order; never use positions. | repair: the closing back link becomes `kind: 'loop'`, `max: 3`; warn, repaired |
| `wf-loop-exit` | a `loop` link without `max`, or whose `from` node has no outgoing link with outcome `exhausted` | warn |
| `wf-agent-turns` | an agent without `turns` | repair: `turns: 10`; info, repaired |
| `wf-act-effect` | an act without `effect` | warn (the approval check treats it as `send`) |
| `wf-approval` | **Inline gated action:** walk backwards over links from its predecessors, with a visited set. A walk that reaches a content producer or a trigger without first passing a gate is a violation. **Attached gated tool:** a violation unless `approval: 'required'`. | warn when `waived` is false, info when waived. The message offers "approve at call" or "move the action inline after an approve step". |
| `wf-mixed-out` | a node whose out-links mix `next` with any of `branch`, `loop`, `escalate`, or a link with an outcome | warn |
| `wf-human-outcomes` | a human approve node without an outgoing link with outcome `approve` and one with outcome `reject` | warn |
| `wf-reply-guard` | a node with effect `reply` that can be reached from an untrusted node (a trigger, or an inline or attached tool or knowledge with `untrusted`) on a path that passes no `guard`; or a workflow with a `reply` but no `escalate` link to a human node | warn |
| `wf-trifecta` | an egress step: effect `send` or `publish`, inline or attached. **Upstream set:** a backward closure over links from it, plus the attachments of every node in that set and of the egress step's host. It fires when that set holds an untrusted node and a private node, and the backward walk to the last content producer passes no gate. It ignores `waived`. | warn |
| `wf-decision-review` | a node with effect `decide` | info |
| `wf-ai-region` | `settings.region` (default `ap-southeast-1`) is not in the model's `regions` | warn |
| `wf-ai-mismatch` | a model that doesn't fit its step: `transcribe` needs audio in; `see` needs image or video in; `speak` needs audio out; `create` needs image or video out; an agent's model has `functions === false`; an agent or ai step has an attached tool with a `tool` id not in its model's `tools` | warn. **Not established:** when the model's `tools` or `functions` is `null`, give info instead ("tool support for <model> is not established; confirm before relying on it"). |
| `wf-dangling-ref` | `after`, `subject` or `repeat` names a node or group that doesn't exist, or `subject` names a non-content-producing step | repair: drop the field; info, repaired |
| `wf-gated-product` | `product` or `runs` resolves to an entry that `checkLifecycle` (`catalog.ts`) flags: restricted, no-new-purchases, retired or china-only. The message names the successor when there is one. | warn |

`wf-deploy-stale` and `wf-product-missing` are phase 8 and not built now.

**Messages:** plain English, naming the step labels and ids, and saying what to do. Look at how `validate.ts` words its warnings.

## Tests

### `models.test.ts`
- the file loads;
- ids are unique;
- every `tools` reference exists;
- prices are positive numbers;
- every `verified` is a date;
- no model id is from a family other than qwen;
- `promptRows()` names no prices.

### `approval.test.ts`
- the policy table, effect by effect;
- the override order;
- `waived`.

### `workflow.test.ts` (reducer)
- upsert, including keeping `after`;
- id collisions across nodes, links and groups;
- pending links flushed when the endpoint arrives, and dropped at end of turn;
- splice keeps the first half's kind and outcome;
- unstep cascades to attached nodes and their tombstones;
- unstep of a group clears `repeat`;
- the caps;
- no input mutation (deep-freeze the input);
- the same object back on a no-op.

### `workflow-checks.test.ts`
- **Each check fires on a minimal seeded fault and stays quiet on a minimal clean graph.**
- **The false negatives from the contract walk and the review:**
  - an upstream approval doesn't cover a translation after it;
  - an attached `send` tool without `approval: 'required'` fires;
  - an approve step whose `timeout` link leads to a send fires;
  - an approve step whose `reject` link leads to a send fires.
- **`repairWorkflow`:** idempotent, and leaves no error on the repaired fixtures.

**The prompt is unchanged.** Claude checks this by hand after the change, not in a committed test, because the next legitimate catalog fix would break such a test. The sha256 of `buildSystemPrompt(loadCatalog())` must still be `998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`. The phase-0b catalog edits touch only `note`, `price` and `verified`, which `promptRow` doesn't read.

## Canonical samples (second job)

**What to convert.** All 32 workflows in `research/ai-workflows/usecases/*.json` become `packages/core/test/fixtures/workflows/<id>.json`, each holding:

```
{ id, title, ask, oneRun, settings, ops: WorkflowOp[], expect: { codes: WarningCode[] } }
```
- `oneRun`: what one run means, e.g. "one inbound support email";
- `ops`: the ops that build it, in order;
- `expect.codes`: the warning codes `checkWorkflow` should give after `repairWorkflow`, each as `{ code, why }`. The default is an empty list.
  - Each listed code needs a one-line reason tied to the source sketch, for example `wf-decision-review` because the claims workflow denies claims.
  - **Never fill `expect` from what the checker happens to emit.** When a sample raises an unexpected code, either the graph is wrong (fix the ops) or the checker is wrong. In the second case, report it and **do not change checker code** in this job.
  - **Independent cross-check.** `research/ai-workflows/review/contract-walk.md` has hand-written ops for six samples (support email triage, multilingual marketing localisation, SRE incident triage, sales prospect outreach, claims processing, WhatsApp/LINE chat agent). Convert those six consistently with it, and list any place your conversion differs.

**How to convert:**
- **Semantics:** use the contract's semantics: parallel `next` versus exclusive branches; repeat groups; loops with `max` and an `exhausted` route; `effect` on every act and side-effecting tool; `untrusted` and `private` where they apply; approve steps with `approve` and `reject` (and `edit` when the sample has one).
- **Billable calls:** each model-backed task is its own step with an `ai` from the model table.
- **Role mapping:**
  - reason → plan;
  - draft → generate;
  - ocr → extract on `qwen-vl-ocr`;
  - asr → transcribe;
  - tts → speak;
  - embed and rerank → `knowledge` with task `retrieve` or `rerank`, and `ai` `text-embedding-v4` or `qwen3-rerank`.
- **Products:** fix trap violations as NOTES rules:
  - no AgentBay; use agent-sandbox;
  - no Model Studio knowledge base for new accounts; use Tablestore or DashVector;
  - email arrives by webhook into EventBridge;
  - qwen3.5-ocr becomes qwen-vl-ocr.

**The test** (`workflow-samples.test.ts`) replays each fixture through `validateWorkflowOp` and `applyWorkflowOp`, then runs `repairWorkflow`. It asserts:
- the expected codes;
- no errors;
- no `wf-unknown-ref`;
- the node and link counts are within the caps.
