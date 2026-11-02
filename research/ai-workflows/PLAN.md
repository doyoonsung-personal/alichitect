# Agentic workflow view: plan

Date: 2026-11-02. Status: **draft, revised after two adversarial reviews.** One review checked the plan against the code; the other attacked the design. Section 15 records what each changed. The recommended first release is in section 12.

**Research behind it** (section 14):
- 15 Qwen deep-research reports;
- 4 GPT research reports;
- about 900 claims checked by GPT against the cited pages;
- settled rulings in `verify/NOTES.md`.

## 1. Goal

Today the app draws cloud architectures. We are adding a second focus, **AI and agents**. A user can type "I want an agentic workflow that reads our support emails, answers the routine ones from our help articles and sends the rest to a person with a draft". The chat stays on the left as it does today. On the right, the app draws:

- the trigger;
- the steps, each typed: classify, extract, retrieve, generate, decide, act, approve or notify;
- the tools and knowledge each step uses;
- the model each AI step runs on;
- human approval, branches and loops.

Each part names the Alibaba Cloud product behind it and where it runs. The app also shows a priced usage subtotal per run, with typical and upper scenarios, that it calculates itself. Two follow-ups:

- **Where it runs:** a step → runtime table in the first release. Later (phase 8), one click draws the matching cloud deployment with the existing builder.
- **Proposal:** the export explains each step for business readers.

**Out of scope:**
- **Running the workflow.** The app designs workflows; it never runs one.
- **Model Studio's own no-code app builder.** It is closed to new international accounts, so designs are built from Model Studio's model APIs on AgentCore, AgentRun, Dify on ACK, or the customer's own code on Function Compute or ACS.

## 2. Decisions

### D1. A separate workflow document, beside the cloud graph

`SessionMemory` gets an optional `workflow: WorkflowGraph` beside `graph`. The workflow has its own ops, reducer, checks and layout. It shares the chat, the streaming parser, the retries and backup, memory, requirements, assumptions and questions.

**Why:** six code readers mapped the subsystems a workflow touches. All six chose this option over adding step kinds to the one graph.

**Every layer around the reducer assumes a node is a catalog product:**
- `validateOp` turns a node without a product into a gap (`validate.ts:436-442`).
- `repairGraph` deletes it (`validate.ts:1304-1313`).
- The request parser rejects a node without a valid product id (`request.ts:109-115`).
- The repairs place nodes by scope, lane, rank, groups and attach rules (for example `validate.ts:1024`, `1278`, `1460-1476`). They would move a step into a VPC or create one for it.
- The layout never reads edges. Its order is the catalog's lane and rank (`layout.ts:444-447`), and it drops its previous state when its layout mode changes (`layout.ts:416-422`).

**Mixing steps into the one graph would mean:**
- guarding every one of those sites;
- making `GraphNode.product` optional, which is not an additive change;
- keeping prompts, recorded streams and the 109 eval cases byte-stable behind the guards.

**A separate document leaves the cloud path untouched by this feature:** same prompt, same memory shape, same op grammar. The phase-0a catalog fixes do change the cloud prompt's catalog rows, so the cloud eval is re-baselined once, after phase 0a (section 12). The new risk sits behind one switch.

**The cost is plumbing, and its failure mode is silent loss.** These places drop the second document or the turn mode without an error:

| Where | What it does |
|---|---|
| `request.ts:222-247` (`memory()`) | rebuilds memory from named fields |
| `llm.ts:1531-1545` (commit) | rebuilds memory from named fields |
| `request.ts:165-172` (`turn()`) | rebuilds each stored turn as role, text and changes |
| `controller.ts:178-182` | builds the request as session id, ask and memory, with no mode |
| `prompt.ts:398-405` (`finalUserContent`) and the repair messages (`llm.ts:1230-1232`) | serialise only `memory.graph`, so a follow-up workflow turn would never see the current workflow |
| `sessions.ts:18-50` | revives a stored session; it validates only the cloud graph's shape and rebuilds the record from named fields |

The browser commit (`reducer.ts:622`) passes memory through whole and loses nothing. But its diffs, provenance, change cards and auto-fix records are keyed for the cloud graph only (section 4).

Tests for this:
- a round trip of a workflow through a turn, the commit, a save and reload, and a proposal;
- a second workflow turn that must see the first one's steps;
- a truncated workflow turn that is continued.

### D2. The focus is chosen on the landing prompt and travels with every turn

The landing prompt gets a two-way choice: **Cloud architecture** or **AI and agents**. The choice is stored on the session, sent as `mode: 'cloud' | 'workflow'` on `POST /api/turn`, and kept for follow-ups. A missing `mode` means `cloud`, so existing clients, sessions and fixtures keep working.

**Which view a turn edits:**
- **The displayed view and the turn's mode are one setting.** The header toggle switches between **Workflow** and **Deployment**, and the next turn edits the view on screen. The input says which one ("Editing the workflow").
- **The mode is captured when a turn starts.** It is stored on that turn and its revision, so a stopped, failed or retried turn keeps its mode. Today a retry recovers only its ask (`controller.ts:218-221`).

**What a workflow turn changes:**
- **System prompt:** it uses its own system prompt (section 8) and its own op vocabulary.
- **Cloud prompt:** untouched by this feature. It stays inside its pinned band of more than 14,500 and less than 15,000 tokens (`prompt.test.ts:181-182`).
- **Transport:** it reuses `/api/turn`: the quota, the per-user slot, redaction, the backup and commit. A separate route like `/api/proposal` would duplicate the status, fatal-error and leak-check plumbing.

### D3. The deployment view is a second, explicit turn

**Where it runs** sends a cloud-mode turn. Its ask is a **deployment brief** the server builds deterministically from the workflow:
- each step's runtime (`runs`, section 3) and the services it calls (`product`);
- the models it uses, all on Model Studio;
- the trigger's source and the links between steps;
- the pinned region.

The cloud model turns the brief into its normal `plan`, `node` and `edge` ops, and the current, well-tested cloud builder draws them. (`plan` itself seeds nothing: it is a non-mutating announcement (`reducer.ts:552-554`), and the request has no field for injecting ops.) Both documents then live in memory, and the header toggle switches between **Workflow** and **Deployment**.

**Why not one reply with both op sets:**
- One stream would need two validators.
- It would double the length of every workflow turn.
- It would mix two vocabularies the model can confuse.

A pure function that maps step products to cloud nodes was also considered. It would draw a worse cloud diagram than the builder and could drift from what the user has already edited.

**The cost:** a second call, only when the user asks for it. It books a turn of quota, and two if the backup ran (`apps/worker/src/turn.ts:305`).

**Keeping the two views in step:**
- **Mapping table.** The panel shows step → runtime → services, from `runs` and `product`. It needs no model call, so it ships before the deployment turn does.
- **Stale marking.** The deployment records the workflow revision it was drawn from. When the workflow changes afterwards, the Deployment toggle shows "drawn from an earlier workflow" and offers to redraw.
- **Cross-view check.** Every runtime and service a step names should appear in the deployment, or be flagged.

### D4. A closed model table, with steps referring to it as `ai`

New file `packages/core/catalog/models.json`: the Model Studio models a step may name (section 6). Each entry gives:
- the id, family and tier;
- the input and output kinds (text, image, audio);
- international regions, status and price;
- a short "use for".

**What the table is for:**
- **Allowlist:** `validateWorkflowOp` checks each step's `ai` field against it, the same way `resolveProduct` checks products.
- **Pricing and region checks:** it feeds the cost estimate and the "model not in region" check.

**The field is named `ai`, not `model`.** `apps/server/test/backup.test.ts:151-157` bans the keys `provider`, `model`, `servedModel`, `fallbackModel`, `reason`, `rescue` and `backup` in the events that reach the browser. The walk stops at `memory`, so the test is extended to walk workflow ops and the committed workflow too.

**The table lists only models customers can buy on Model Studio.** It never lists the backup model's family, so a backup reply cannot write its own name into a diagram. The web bundle's `check-dist.mjs` scan for vendor names keeps passing.

### D5. A sticky layered layout, left to right, that pans

A new pure `layoutWorkflow(wf, catalog, prev?, opts)` returns the same `LayoutState` shape, with `mode: 'workflow'`. Three helpers move out of `layout.ts` into a shared module:
- `orderSlot` and `orderFrames`;
- a `stickyTop` factory.

`layoutDiff`, `bystanderMoves` and the replay gate harness are reused. Section 7 gives the algorithm.

**The camera keeps titles readable and pans.** A typical workflow is about 7 columns, and past 5 columns, titles at 920 px wide fall under the 11 px legibility floor.
- **Readable zoom:** the camera never zooms out below the floor.
- **Pan:** it pans on both axes.
- **Overview strip:** it shows all columns, so the user can see the whole workflow.
- **Follow:** it follows the newest column while streaming, until the user pans. After that it stays put.

Wrapping onto a second row was rejected, because inserts would re-flow across rows.

### D6. The app computes cost, never the model

The estimate is the app's arithmetic, from three inputs:
- the model table's prices;
- default token counts for each step kind (section 9);
- **estimate settings** stored in memory: volume, per-step overrides, item counts, branch shares and guard types (section 9).

**This is a new rule.** Today's proposal rules forbid invented numbers but allow catalog prices (`proposal-prompt.ts:38-39`). For workflows, the model writes no figure at all; the cost table is generated, not drafted.

**How it's shown:**
- a **priced usage subtotal** with two scenarios, **typical** and **upper**, each with its assumptions;
- what is not priced is listed beside it, so the subtotal never reads as a total.

### D7. Proposals get step sections; the leak tests are scoped

**Proposal content:**
- **Step sections:** a new `step` section kind explains each step. The product-keyed `why` can't: three steps on `model-studio` would share one product-level explanation (`proposal.ts:414`, `model.ts:246-251`).
- **Second diagram, with the deployment view (phase 8):** the PDF's single diagram slot becomes a list (`pdf.ts:38`).
- **Cost table:** it comes from D6.

**Leak rules to scope:** `PROPOSAL_SYSTEM` rule 8 and the `HIDDEN` pattern in both proposal tests forbid "qwen" anywhere in the output, which conflicts with a design that names a model per step. Both are narrowed:
- A model named by a step in the design may appear in the narrative.
- The writer still never says who wrote the text.
- The wire never names the serving provider.

**Letting the design's models be named:**
- **Lint allowlist.** Proposal lint allows a model name only if it appears in the customer's words or the catalog text (`proposal.ts:89-104`), so it would reject the design's own model names. Its context gains the exact `ai` ids the workflow uses, and rule 6, which allows product names only in `why`, also allows them in step sections.
- **Backup voice.** The backup's "never name an AI model" note gets a workflow variant. `claudeRequest` has a `voice` parameter (`claude.ts:125`), but the streaming backup never passes one, and proposal completion always passes `BACKUP_TEXT_VOICE_NOTE` (`claude.ts:378-383`). The variant is threaded through the backup interfaces and both callers. It may name the design's step models, never itself.

### D8. Hidden-backend rules stay as they are

**Nothing on the wire changes:**
- No new field names the serving provider.
- Statuses stay calm and vendor-free.
- New warning, status and fatal codes are added to the vendor-free assertions in `apps/server/test/backup.test.ts`, `apps/worker/test/backup.test.ts` and `claude.test.ts`.

**One extra test:** a leak test for a workflow-mode turn.

### D9. One approval policy, shared by the prompt and the checks

**The problem.** "A human before every external send" would put approval in front of every chatbot reply, which defeats a chat agent. Approval everywhere also breeds rubber-stamping (AWS AGENTSEC04-BP02). So approval follows the **effect** of an action, from a single table in `packages/core`. The workflow prompt's rule text and the `wf-approval` check are both generated from it, so they can't disagree.

| Effect | Example | Approval by default |
|---|---|---|
| `read` | look up an order, search the web | no |
| `write` | update a ticket field, add a CRM note | no |
| `reply` | answer inside a live conversation the user is in (chat, voice) | no; a guard step and an `escalate` path to a person instead (`wf-reply-guard`) |
| `notify` | page the on-call engineer, post to an internal channel | no |
| `send` | email or message a third party outside the conversation | **yes** |
| `publish` | post public content or social replies | **yes** |
| `pay` | refund, payout, booking or any financial commitment | **yes** |
| `delete` | irreversible removal | **yes** |
| `admin` | production change, access rights, rollback | **yes** |
| `decide` | a decision with legal or similar effect on a person: deny a claim, reject a candidate | **yes**; also flagged for PIPA and EU AI Act review |

**Email is `send`, even as an answer.** An email response, even to the person who wrote in, leaves the conversation and can't be taken back. So it is `send`, and the support-email workflow gets its approval step by default. `reply` is reserved for live chat and voice, where a person can be pulled in mid-conversation.

**Overriding the default, in both directions:**
- **Per effect.** The user can switch approval off ("send routine confirmations automatically") or on ("a person checks every chat answer about refunds"). The setting is stored as a structured session setting, not inferred from free text.
- **Per step.** `approval: 'required' | 'skip'` overrides the effect default for one step. It is used when the user asks for a gate the table wouldn't add, or waives one for a single route.

The check follows the overrides, and drops to info where the user has waived approval.

### D10. Where the plan departs from the notation research, and why

The `diagram-notation` digest recommends three things this plan handles differently. Each departure is a deliberate trade-off:

| The research recommends | The plan does | Why |
|---|---|---|
| tools as inline steps | **both forms**: a tool, knowledge or memory step can sit on the main path (the code calls it) or be attached under an agent (the agent chooses it) | Inline matches Model Studio's and AgentRun's canvases. Attached marks what the model decides, which the AWS orchestration guidance asks to show. Both are needed. |
| loop containers with a sub-canvas | `loop` links with a numeric `max`, an agent's `turns`, and **repeat groups** | A nested canvas can't keep its cells stable while it streams (section 7). A repeat group binds several steps to one item without a container. |
| collapsible sub-workflows | deferred | Not needed for the first release's workflows. Sub-agents attach to an orchestrator agent. |

The 3-to-5 sub-agent figure and the 4× and 15× token multipliers are examples from one vendor's measurements. The prompt and proposal treat them as examples, not rules.

## 3. Workflow contract

The vocabulary draws on the builders customers already know: Model Studio's and AgentRun's own canvases, Dify, n8n, LangGraph, Copilot Studio and Bedrock Flows. D10 lists where it departs from them. It builds two research findings into the structure, so the model can't draw them wrong:

- **Code decides the path; the model decides only inside an agent.**
  - Steps on the main path are joined by links. Code decides them, and they are drawn solid.
  - What an agent may choose is attached under it through `on`: tools, knowledge, memory and sub-agents. The model decides those, and the connectors are drawn dashed. This is the AWS distinction between static workflow edges and agent-chosen routes (digest `patterns`).
- **Every repetition has a numeric bound:**
  - an agent's own loop: `turns`;
  - a refine-or-retry cycle: a `loop` link with `max`, plus an `exhausted` route for what happens after the last try;
  - per-item work: a repeat group with an item count in the estimate settings.

These are design semantics only. Nothing here runs a workflow.

```ts
type WorkflowNodeKind =
  | 'trigger'   // what starts a run: webhook, chat message, schedule, file upload, event, phone call
  | 'ai'        // one model call with a task (classify, extract, draft ...); shows its model
  | 'agent'     // a model loop that chooses among its attached nodes until done; shows its model and turn limit
  | 'decide'    // an exclusive choice: a rule or a classifier's result picks exactly one branch
  | 'guard'     // a safety check without a model of its own: AI Guardrails, moderation, injection filter
  | 'human'     // approve, review or take over; a wall-clock wait, not compute
  | 'act'       // calls a business system without a model; its effect says what kind of action
  | 'tool'      // inline (the code calls it) or attached (an agent may call it): search, API, MCP server, sandbox
  | 'knowledge' // inline retrieve step or attached: documents plus retrieval (vector store or search service)
  | 'memory'    // inline (load or save) or attached: conversation or long-term memory
  | 'end';      // the outcome: reply sent, ticket closed, report delivered

type Effect = 'read' | 'write' | 'reply' | 'notify' | 'send' | 'publish' | 'pay' | 'delete' | 'admin' | 'decide'; // D9

interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  label: string;          // business wording: "Classify the email", not "LLM call"
  task?: 'classify' | 'extract' | 'retrieve' | 'rerank' | 'generate' | 'check' | 'plan' | 'summarise'
       | 'translate' | 'transcribe' | 'speak' | 'see' | 'create'   // model tasks (see: image or video in; create: image or video out)
       | 'approve' | 'review' | 'takeover';                        // human tasks
  after?: string;         // predecessor on the main path; keeps the layout stable when links arrive late (section 7)
  on?: string;            // attached form: the host agent (or ai step, for a tool)
  product?: string;       // the service the step calls: tablestore, direct-mail, chatapp, ai-guardrails ...
  runs?: string;          // where the step's own code runs: fc, agentrun, agentcore, cloudflow, dify-on-ack, or 'customer'
  ai?: string;            // models.json id for ai and agent steps, and for model-backed retrieve or rerank (never "model", D4)
  tool?: string;          // tool steps: a built-in tool id from models.json (web_search, web_search_image, web_extractor, code_interpreter, mcp, pdf_parse)
  turns?: number;         // agent: maximum model requests per run
  effect?: Effect;        // act, tool and memory steps; required on act and on memory (read or write)
  untrusted?: boolean;    // trigger, tool, knowledge: content from outside the customer (inbound email, web, uploads)
  private?: boolean;      // knowledge, memory, tool: customer or personal data (CRM, orders, claims); help articles are not private
  approval?: 'required' | 'skip'; // overrides the D9 default for this step
  subject?: string;       // human approve step: the step whose output it approves (default in Semantics)
  join?: 'all' | 'any';   // a step reached by parallel links: wait for all of them (the default) or the first
  repeat?: string;        // repeat-group id: steps sharing it run once per item, bound to the same item
  why?: string;           // one sentence for hover, the panel and the proposal
}

type WorkflowEdgeKind = 'next' | 'branch' | 'loop' | 'escalate';
interface WorkflowEdge {
  id: string; from: string; to: string;
  kind?: WorkflowEdgeKind;   // default 'next'
  label?: string;            // branch: the condition; loop: shown limit; escalate: the trigger ("confidence < 0.7")
  max?: number;              // loop: maximum iterations
  outcome?: 'approve' | 'edit' | 'reject' | 'timeout' | 'exhausted';
}

interface WorkflowGroup { id: string; over: string; parallel?: boolean } // repeat group: "each locale", "each attachment"
interface WorkflowGraph { nodes: Record<string, WorkflowNode>; edges: Record<string, WorkflowEdge>; groups: Record<string, WorkflowGroup> }
```

### Semantics

- **Fan-out and choice:**
  - A step's out-links are either all `next` (they run in **parallel**) or all alternatives (`branch`, `loop`, `escalate` and outcome-typed links), of which exactly one is taken.
  - Mixing the two on one step is a validation warning (`wf-mixed-out`).
  - Alternatives are tried in this order: outcome-typed links, `branch` conditions in link order, `escalate`, `loop` while its count allows, then `exhausted`.
- **Fan-in:** a step reached by parallel links waits for all of them unless `join: 'any'`. A step where exclusive branches merge proceeds on whichever arrives.
- **Approval:**
  - An approve step counts as approval only for paths that leave it by its `approve` link. A `timeout`, `reject` or `edit` route out of it is not approved, so "approve: timeout → send anyway" fails the check.
  - A human step with `task: 'approve'` approves its `subject`'s output. By default the subject is the nearest step upstream that produces content: an ai or agent step, or a tool that creates a document. `guard`, `decide` and `read` steps between them pass that output through unchanged.
  - Its out-links carry `outcome`: `approve` and `reject` are required; `edit` and `timeout` are optional.
  - An `edit` link goes back to the step that produced the output, and the approval repeats. Approving one draft never covers a later, changed one.
- **Takeover:** `task: 'takeover'` hands a live conversation to a person. It has no approve or reject outcomes.
- **Retry and refine:**
  - A `loop` link closes a cycle and carries `max`: the most times the loop link is taken in one run. Inside a repeat group, the count is per item.
  - The step that decides whether to go round again also has an `exhausted` link: where the run goes after the last try (a person, a larger model, or an end).
  - An agent may also have an `exhausted` link, taken when it uses up its `turns` without finishing.
  - `escalate` is used for a jump to a person or a larger model on a condition.
- **Repeat groups:**
  - Entering the group's first step starts one pass per item, in parallel unless the group has `parallel: false`.
  - The first step after the group waits for every item's pass to finish. An item that ends at an `end` step inside the group is simply done.
  - The estimate counts items from the settings (section 9).
- **Attached nodes:**
  - **Allowed forms:** tool, knowledge, memory and agent steps may be attached (`on`); everything else is inline only. An attached agent is a sub-agent.
  - **Reachability:** attached nodes are not part of the control flow; they are reachable when their host is.
  - **Side effects:** an attached tool's `effect` counts as if the host performed it.
  - **Approval at call time.** An approve step before the agent would approve earlier content, not what the tool later sends. So an attached tool whose effect needs approval carries `approval: 'required'`: the runtime pauses the agent at that call for a person to approve (the pause-and-resume pattern of AgentCore and CloudFlow callbacks). It is drawn as a lock on the tool and satisfies `wf-approval`. Sales outreach (an attached `send`) and the SRE agent (an attached rollback, `admin`) need this.

### What the vocabulary leaves out, and why

- **No `model` or `llm` kind.** A model is a property of a step (its `ai` chip), so every model-backed step carries the id its token estimate attaches to.
- **No loop or sub-workflow container** (see D10).
- **No data-flow metadata in the first release.** Which fields leave the customer boundary, which identity reads which store, and retention are deferred (section 12). The proposal lists them as open security questions instead. A `guard` step is shown as one control, never as proof that the design is safe.

### Ops

The shared ops keep their meaning in both modes:
- `say`, `plan`, `req`, `assume`, `ask`, `gap`, `done`;
- **except `rec`:** it writes to the cloud graph (`reducer.ts:552-577`), so a workflow turn drops it with an info warning.

Workflow-only ops have their own names, so the model can't put a step in the wrong document:

| Op | Meaning |
|---|---|
| `{t:'step', id, kind, label, task?, after?, on?, product?, runs?, ai?, turns?, effect?, untrusted?, join?, repeat?, why?}` | upsert a workflow node |
| `{t:'link', id, from, to, kind?, label?, max?, outcome?}` | add or replace a workflow link |
| `{t:'each', id, over, parallel?}` | add or replace a repeat group (not `group`, which is the cloud grouping op) |
| `{t:'splice', into, id, kind, label, ...the same optional fields as step}` | insert a step into link `into`: from → id → to. The first half keeps the old link's kind, label, outcome and `max`, and the second half is `next`, so a splice into an approval or retry link keeps its meaning. |
| `{t:'unstep', id}` | remove a workflow node (with its links and attached nodes), a link, or a repeat group |

**IDs:**
- **One namespace.** Ids are unique across a workflow's nodes, links and groups together, so `unstep` is never ambiguous. A new id that collides is renamed deterministically (suffix `-2`), and an info warning says so. Ids are normalised before the check, so two raw ids that normalise alike collide.
- **View-tagged UI keys.** Change lines, provenance, highlights and auto-fix records carry the view, because they are keyed by raw id today (section 4).

**Tombstones.** Removed workflow steps go to a separate bounded list, `memory.workflowTombstones`. The current parser reads a tombstone with `product` as a cloud node and one without it as a group (`request.ts:158-162`).

**Caps.**
- **Per workflow:** 40 nodes, 60 links and 8 repeat groups. Pending links have their own cap, and the advertised health limits include the workflow caps.
- **Body size:** the 512 KiB request limit is checked by measuring the UTF-8 bytes of a full dual-document request: history, tombstones and Korean or Chinese text included. Before a committed session would exceed it, compaction drops the oldest turns' change text first.

## 4. Turn pipeline

The code-fit review traced every place a second document or a turn mode must pass through. The list below is the checklist for phases 3a and 3b.

**Contract (`types.ts`):**
- `TurnRequest.mode`, `Turn.mode`, `Revision.mode`;
- `SessionMemory.workflow`, `workflowTombstones` and `estimate`;
- the workflow graph and ops;
- a `view` tag on `Warning`, with the cloud default for old records. Findings from two documents would otherwise collide in the dedupe key `code|severity|ids|msg` (`llm.ts:1177`).

**Prompt (`prompt.ts`):**
- **Current document.** `finalUserContent` (`398-405`) and the repair messages (`llm.ts:1230-1232`) serialise the current document by mode. A workflow turn sends the current workflow and its tombstones, plus a one-line note that a deployment exists.
- **System prompt cache.** The cache is a `WeakMap<Catalog, string>` (`196-202`), which would return whichever prompt was built first. It becomes catalog → `{ cloud, workflow }`, with a test that alternates builds on one catalog instance.

**Turn engine (`llm.ts`):**
- **`streamOps`** (`607-703`) takes as parameters:
  - context creation and validate and apply;
  - raw product extraction and first-node timing;
  - its end-of-stream flush, which calls the cloud `endTurn` (`736`).
- **Seeding.** The first attempt, the whole-turn rescue, the continuation and the repair fallback all seed with `memory.graph` today (`1303-1305`, `1365`, `1400`). They take the document by mode.
- **Repair and commit.** The repair, diff, tombstone and commit block (`1445-1545`) works on either document and carries `workflow`, `workflowTombstones` and `estimate` through the commit. A follow-up call is triggered by an error *or* by truncation (`1453-1458`). The rescue continuation can run with normal repair off.
- **Backup voice.** It is threaded per D7.

**Server and Worker:**
- **`request.ts`:**
  - `memory()` (`222-247`) validates and bounds the new fields;
  - `turn()` (`165-172`) keeps `mode`;
  - the request (`259`) takes `mode` as a closed set, defaulting to `cloud`;
  - workflow tombstones get their own parser.
- **Caps and health:** caps are defined in one place (`request.ts:9-31`, `reducer.ts:18-43`, `apps/worker/src/turn.ts:85`), and the browser's health type is updated with them (`apps/web/src/stream/events.ts:46`).
- **Worker:** `sharedTurnState` (`apps/worker/src/turn.ts:43-51`) holds both prompts.
- **Quota:** a turn books one unit, and two when the backup ran, in all three call types (architecture, deployment and proposal).

**Browser:**
- **Requests:** `controller.ts:178-182` sends `mode`. Retry (`218-221`) restores the mode along with the ask.
- **Streaming:**
  - `TurnWork` holds a second raw document and apply context;
  - `onOp` routes by op type;
  - stop, revert and restore relayout the right document (`reducer.ts:260`, `677`).
- **Commit and history** (`reducer.ts:574-637`):
  - auto-fix dedupe (`196-205`) keys on view, code and ids;
  - change keys, provenance and revision cards (`changes.ts:47`, `141`, `193`, `225-227`; `reducer.ts:613-616`) carry the view, including historical hover.
- **Header and export:** selectors and header props (`selectors.ts:27-29`, `props.ts:129`) count the view on screen, and export availability considers both documents.
- **Sessions:**
  - `reviveSession` (`sessions.ts:18-50`) revives `mode`, the workflow's shape and legacy records with no workflow;
  - a fixture of a large dual-document session tests the localStorage quota path, which evicts the oldest sessions (`sessions.ts:97-113`).

**Replay and eval:**
- **Replay:** each replay turn carries an optional `mode` (`replay/plan.ts`, `player.ts:59`), with mixed-view and rescued workflow recordings.
- **Eval:**
  - records store the mode and the workflow before and after (`eval/records.ts:16`, `lib.ts:209`, `run.ts:121-224`);
  - the scorer, judge inputs and rescore read them.

**Persistence boundary:**
- **Design sessions** live in the browser's localStorage.
- **D1** holds sign-in sessions, usage and locks only (`apps/worker/migrations/0001_init.sql`), so there is no D1 migration. Usage rows could record the mode later, if reporting needs it.

**Cache cost:** the backup's cache breakpoint covers the system text actually sent (`claude.ts:131-137`). A workflow prompt is a second prefix: cold on first use, then reused.

## 5. Checks and repair

**Reused unchanged on products a step names** (the product-only checks):
- unknown product and resolving an alias;
- lifecycle checks: retired, legacy, China-only, restricted;
- avoid constraints;
- region text checks.

**Reused structural checks:** dangling link, duplicate id, caps, text and id normalisation.

**New workflow checks.** There are three tiers:
- **structural:** errors that break the drawing; they trigger the one repair turn;
- **feasibility:** warnings about the solution;
- **advisory:** info.

Nothing that needs a customer decision is an error, because a model repair would decide it for them.

| Code | Rule | Severity |
|---|---|---|
| `wf-no-trigger` | a workflow with steps has no trigger | error |
| `wf-unreachable` | an inline step can't be reached from a trigger; an attached node counts as reachable when its host is | error |
| `wf-ai-missing` | an ai or agent step has no `ai`, or names one not in models.json | error |
| `wf-attach-form` | `on` is set on a kind that can't attach, or points at a host that can't hold it, or attachments form a cycle | repaired: `on` dropped, the step placed inline after its host; warn |
| `wf-dead-end` | an inline step other than `end` has no outgoing link | warn |
| `wf-cycle` | a cycle (found by search over the links, never from screen columns) has no `loop` link | repaired: the closing link becomes `loop` with `max: 3`; assumption |
| `wf-loop-exit` | a loop has no `max`, or its deciding step has no `exhausted` route | warn |
| `wf-agent-turns` | an agent has no `turns` | repaired to 10; assumption |
| `wf-act-effect` | an act step has no `effect` | warn; treated as `send` by the approval check until set |
| `wf-approval` | inline: an action that needs approval (D9 and its overrides) has a path back to a content-producing step or a trigger that passes no approve step. Attached: a tool whose effect needs approval lacks `approval: 'required'` (approve at call time) | warn, offering "approve at call" or "move the action inline after an approve step"; info where the user waived approval |
| `wf-mixed-out` | a step mixes parallel `next` links with alternatives | warn |
| `wf-reply-guard` | a `reply` can be reached from an untrusted source without passing a guard step, or the workflow has no `escalate` path to a person | warn |
| `wf-decision-review` | a step has effect `decide` | info: name the PIPA and EU AI Act review points (D9) |
| `wf-human-outcomes` | an approve step lacks an `approve` or `reject` link | warn |
| `wf-trifecta` | content from an untrusted source and from a `private` store both reach a `send` or `publish` with no approve step after the last content-producing step, across agent boundaries | warn |
| `wf-ai-region` | the model isn't offered in the pinned region | warn (a region change is the customer's call) |
| `wf-ai-mismatch` | the model doesn't fit the step: input or output kinds, or a tool it has no documented support for | warn |
| `wf-gated-product` | a step names something new international accounts can't use: `model-studio-apps` (the knowledge base and zero-code apps), `agentbay`, AgentRun's low-code builder | warn, with the successor |
| `wf-deploy-stale` | the deployment was drawn from an earlier workflow revision | info |
| `wf-product-missing` | a step's runtime or service isn't in the deployment | info |

**Where the rules come from:**
- **`wf-approval`:** OpenAI's agent guide gates on "sensitive, irreversible or high-stakes" actions, and AWS recommends risk-tiered approval. The policy is the D9 table. The check walks backwards from each gated action. Every path must meet an approve step before it meets a step that produces or changes the content, or a trigger. So an approval far upstream doesn't cover a translation, draft or edit made after it, and one human on another path doesn't count. (The first draft's check removed approve steps and tested reachability. The contract walk showed that test misses a changed artifact after an upstream approval.)
- **`wf-trifecta`:** the "lethal trifecta" of private data, untrusted content and outbound comms (Simon Willison; Anthropic's containment research). It follows the data path across agents, so splitting one agent in two doesn't silence it. The message offers three controls: a human approve step before the egress, a narrower tool scope, and a guard step. It says a guard step reduces the risk but doesn't remove it.
- **`wf-gated-product`:** reuses the catalog lifecycle check. Its message names the successor:
  - the knowledge base → Tablestore Knowledge Storage or DashVector;
  - AgentBay → Agent Sandbox;
  - low-code AgentRun → AgentRun code-first.

**Repair:** a follow-up call is triggered by an error or by a truncated reply (`llm.ts:1453-1458`). Each adds model spend, so the error set stays small. The browser runs the same deterministic workflow repair, so follow-up ops land on the same ids.

## 6. The model table and the catalog

### models.json

**Scope:**
- Only models a new international account can call in Singapore. A model found only on the China site, in Beijing, or in Global scope is left out.
- Prices are International-scope list prices in USD per 1M tokens unless a unit is given. Limited-time discounts are ignored.
- Every price comes from `verify/NOTES.md`, checked against the live pricing pages on 2026-11-02.

**Row shape:**
- `id`, `family`, `tier` (`small` | `mid` | `large`), `in` / `out` kinds, `roles`;
- `price`: `{ scope, tiers: [{ upTo, in, out, thinkingOut?, cacheHit?, cacheWrite? }], unit }`;
- `batch`, `tools` (function calling, web search), `status`, `verified`.

The price key is the model plus scope, input tier and thinking mode, because those three move the price (NOTES batch 6).

| id | tier | Use for | Input / output | Notes |
|---|---|---|---|---|
| `qwen3.8-max` | large | planning, orchestrators, hard reasoning, agents with many tools | $2 / $6; cache hit $0.25 implicit, $0.17 explicit read | Web search works in Singapore. No text batch or fine-tuning in Singapore. |
| `qwen3.7-plus` | mid | default agent model; vision with tool calls; long documents | $0.40 / $1.60 at ≤256K, $1.20 / $4.80 above; cache hit $0.08 implicit, $0.04 explicit read, $0.50 explicit write | Model Studio's own agent recommendation. 1M context. Function calling and batch are supported on this alias; thinking output costs the same. |
| `qwen3.8-flash` | small | classify, route, extract, summarise, translate, short drafts | $0.15 / $0.47; cache write $0.20, hit $0.016 | Text, image and video in. No batch in Singapore. |
| `qwen-flash` | small | very high-volume classification | $0.05 / $0.40 at ≤256K; cache hit $0.01 | Cheapest text model. An alias, so it gets a `verified` date like the rest. |
| `qwen3-coder-flash` | mid | code generation and review steps | $0.30 / $1.50 at ≤32K | Rises with input tier. |
| `qwen3-vl-plus` | mid | image and document understanding without tool calls | $0.20 / $1.60 at ≤32K | No function calling or batch in Singapore; use `qwen3.7-plus` when the step calls tools. |
| `qwen-vl-ocr` | small | OCR of scans and photos | $0.07 / $0.16 | The international OCR model. `qwen3.5-ocr` shows only a Beijing price, so it's left out. |
| `qwen3.8-omni-flash` | small | audio and video understanding over HTTP | not confirmed | Text output only. The $0.15 / $0.47 figure came from the report, not a checked page, so the row ships without a price. |
| `qwen-audio-3.1-realtime-flash` | mid | real-time voice agents with tool calls | text in $0.23, audio in $0.93, text out $0.70, audio out $1.87 | WebSocket on the workspace host. |
| `qwen-audio-3.1-asr-flash` | small | transcribing recorded audio and files | $0.15 / $0.47 | |
| `qwen-audio-3.1-asr-flash-streaming` | small | live transcription | $0.93 / $0.70 | The two readings that looked like a conflict were these two models. |
| `qwen-audio-3.1-tts-plus` | small | speech output | $0.30 per 10,000 characters | |
| `text-embedding-v4` | small | indexing and retrieval | $0.07 | 64–2,048 dimensions. No Batch Inference. |
| `qwen3-rerank` | small | reranking retrieved chunks | $0.10 | Text only. `qwen3-vl-rerank` has no Singapore price, so it's left out. |
| `qwen-image-2.0` / `-pro` | mid | image creation | $0.035 / $0.075 per image | |

**Left out on purpose:**
- `qwen3.5-plus` and its snapshots: they retire on 2027-01-19.
- `qwen-long` and `qwen3.7-max`: legacy.
- `qwen-mt-uni` and CosyVoice v3.5: China site only.
- `gte-rerank`: retired.
- `qwen3-vl-flash`: its pages redirect, and it has no Singapore price row.
- `qwen3.5-ocr`: Singapore availability isn't established.
- Video generation: the only price source is a blog post. It's added once the pricing page lists it.
- Third-party models on Model Studio, such as DeepSeek v4: they have International prices, some with half-price idle hours from 22:00 to 08:00 UTC+8. They're a later addition; the first table is Qwen only, so tiers and tool support stay uniform.

**Built-in tool fees.** These sit beside the models because steps name them, and the cost estimate adds them per call:

| Tool | Fee |
|---|---|
| `web_search` | $10 per 1,000 calls in Singapore, plus the tokens it adds |
| `web_search_image` | $8 per 1,000 calls |
| PDF understanding | $0.0033 per parsed page in Singapore, plus model tokens |
| `web_extractor`, `code_interpreter` | free for a limited time, plus tokens; shown as "currently free" |
| MCP servers | tokens, plus whatever each server charges |
| AI Guardrails | $6 per 10,000 calls for **each** enabled detection type (content compliance, sensitive content, prompt injection) |

**Which models can use which tools.** Tool support is recorded per model, because it isn't uniform:
- `qwen3.8-max` is documented in Singapore for web search, the web extractor, the code interpreter, image search and MCP.
- `qwen3.8-flash` is documented for web search only; the other tool pages stop at Flash 3.7.

A step that gives a tool to a model without documented support raises `wf-ai-mismatch`. MCP through the Responses API is limited to SSE servers, at most 10.

**Tiering is a default, not a rule.** Cheap models on classify and route steps and large models on planners is AWS guidance, and the GPT model-evidence review found no controlled study proving it saves money overall. The prompt applies it as a default, and the proposal says "validate on your own data".

### Catalog changes

The products a workflow names already exist in `products.json` or `offerings.json`, except where noted. The research changes these entries. Each is a small edit with its NOTES reference:

| Entry | Change |
|---|---|
| `agentbay` | `status: 'no-new-purchases'`, successor `agent-sandbox`. **This also fixes the live cloud catalog today.** R21's "agentbay for Windows or Android" is reworded within the cloud prompt's 2 spare tokens. |
| `agentrun` | Note that only code-first is recommended. The low-code Flow Agent is in maintenance, and new users are told not to activate the Open Platform (FunAgent). |
| `agentcore` | Keep `ga`, worded as "commercial, pay-as-you-go" (no page says GA). Note:<br>- its IM channels are DingTalk, Lark and WeCom, managed agents only;<br>- the knowledge-base connector is Beijing-only;<br>- CloudMonitor, PrivateLink and SchedulerX3 are billed separately. |
| `agent-sandbox` | GA since 2026-09-22; Flash and Container editions in Singapore. Per-second reference prices: Economy $0.00000381 per vCPU and $0.00000191 per GiB of memory; disk $0.0000000703 per GiB. |
| `model-studio-apps` | Already `preview` and `restricted`. Note that the gate is a Singapore application created before 2025-04-21, not account age, and that `file_search` depends on it. |
| `chatapp` | Channels: WhatsApp, Viber, Messenger, Instagram, Telegram, LINE, SMS and email. Since 2026-09-01:<br>- Messenger, Instagram, Telegram and LINE: $0.005 per message, charged even when delivery fails;<br>- WhatsApp and Viber: $0.005 per message or conversation, plus the channel's own fees;<br>- SMS and email: no platform fee. |
| `dashvector` | Singapore: P.small $0.06/hour and S.small $0.045/hour, × replicas. |
| `agentloop` | The general region list names Hangzhou, Shanghai and Hong Kong. The multimodal evaluator docs also list Singapore, so availability varies by feature: confirm the feature before drawing it in Singapore. |
| `ai-guardrails` | Price per detection type. Endpoint `green-cip.ap-southeast-1`. Available in Singapore, Hong Kong, Frankfurt and Virginia. |
| `eventbridge` | $0.82 per 1M events on custom buses, $0.91 per 1M custom-target pushes; the default bus is free. It is the documented inbound path for email and SaaS webhooks. |
| `cloudflow` | Human approval uses `WaitForCustomCallback`, resumed by `ReportTaskSucceeded` or `ReportTaskFailed` with a task token. Standard mode only, with up to 1 year per execution. Reference price: 5,000 free transitions a month, then $0.25 per 10,000; this comes from the previous-version billing page. |
| `pai-langstudio` | Already `legacy`. Add the 2027-03-09 retirement; it has no Singapore migration target. |
| `tablestore` | Knowledge and Memory Storage are available in Singapore. Prices are CNY reference rates only. |
| `pricing.ts` | qwen3.8-flash explicit cache write is 0.20, not 0.1875. **This is a live-app fix too.** |

Two of these change the live cloud app, independent of this feature: `agentbay`, and the `pricing.ts` cache figure. Section 12 lists them as phase 0, so they can ship first.

## 7. Layout and canvas

`layoutWorkflow` is a **sticky layered grid**. Its rules come from the layout reader's analysis of `layout.ts` and its gates.

**Placement:**

1. **A node's cell is fixed when it arrives.** An edge arriving later never moves it. Edges arrive late through the pending buffer, and the strict gate requires zero foreign moves on edge ops.
2. **New main-path node:** its predecessor `p` is, in order of preference:
   - the `from` of a splice;
   - the source of an in-link already present;
   - its `after` field;
   - the last main-path node placed.

   Its column is `col(p) + 1`, or 0 for a trigger. Its row is `row(p)` if that cell is free; otherwise the first free row below, which starts a parallel branch. New branch rows are appended and never reordered.
3. **Late links never move a node.** A link that disagrees with a provisional cell is routed longer instead.
   - **Pointing left is visual only.** A link with `col(v) <= col(u)` is routed backwards, below the row. It is drawn as a loop only if it is a `loop` link or closes a cycle in the graph. Arrival order can make a forward dependency point left, and that must not change its meaning, the checks or the cost.
4. **Splicing X into A -> B:** when B is directly after A, B and everything to its right in B's reachable rows shift by one column. It is a uniform translation with its own budget, because one column pitch (about 200 px) exceeds `FAR_SIBLING` (168 px).
5. **Attached nodes** (tools, knowledge, memory and sub-agents) stack under their host in a `<host>#attached` slot, ordered by `orderSlot`.
   - Each row band's top is a `stickyTop` with spare rows, so a growing stack pushes nothing until it overflows.
   - Past three, the stack collapses into a count chip that opens on click.
   - A stack that overflows its spare rows may push the band below. That move has its own budget, like a splice.
   - A step's model is a chip on its card, so it takes no layout space.
6. **Repeat groups** get a bracket under their steps, labelled with the group's `over` ("each locale"). Steps in a group should be contiguous. When they aren't, the bracket splits and the panel lists the group.
7. **Removals leave holes.** Nothing moves left or up until a tidy.
8. **Tidy, or no previous state:**
   - columns are the longest path over non-loop links;
   - rows follow the first predecessor, then arrival;
   - tidy is a visible button. The layout never re-flows on its own.

**Workflow sticky state.** `LayoutState`'s sticky fields describe cloud shelves (`layout.ts:101-116`). The workflow variant adds:
- each node's cell;
- the branch rows;
- each host's attached stack;
- the repeat-group brackets.

**Camera:**
- `fitCamera` gets a workflow rule: it fits the height down to the readable zoom (titles at least 11 px), then pans on both axes.
- An overview strip at the bottom shows every column.
- While streaming, it follows the newest column until the user pans; after that it stays put until the user re-enables follow.

**Gates:**
- **Replay harness:** a cloned one with zero foreign moves on step and link ops, and budgets for splice shifts and stack overflow.
- **Fixtures:** the canonical sample graphs from phase 1, streamed in arrival order and in reverse topological order.
- **Legibility:** checked at 10, 15 and 25 steps, with branches, a loop and attached tools, at 800, 920 and 1,150 px wide.

**Canvas:**
- A view toggle remounts a keyed `<Canvas key={view}>`, and each view keeps its own monotonic display version.
  - Two canvases at once would collide on DOM ids (`diagram`, `products`, the popover and key-help ids).
  - One canvas instance switched between views could get a lower version than it last saw and trip its guard (`index.tsx:208-225`).
- A workflow scene builder and node type. Cards show the kind's glyph, the label, the product's short name and a model chip.
- New glyphs: trigger, decide, guard, human, act and end. Tool, knowledge and memory reuse existing families.
- **Line styles:**
  - links between steps are solid: code decides them;
  - connectors from an agent to its attached nodes are dashed: the model decides them;
  - `branch` carries its condition label;
  - `loop` is an arc below the row with its limit;
  - `escalate` uses the warning colour.
- **Badges and marks:**
  - an agent card shows its `turns` limit;
  - a repeat group gets a bracket labelled with what it repeats over;
  - a human step shows a clock, because it is a wait;
  - an act or tool card shows its effect, with a lock when approval is needed.
- Hover and the panel: the panel becomes **Steps and why** in workflow view, with the step, what it does, the model and product, and why.
- Routing: probe libavoid and the channel router on workflow layouts before building. The channel router assumes the cloud grid's regular gaps.

## 8. The workflow system prompt

### Budget

A separate prompt with its own pinned budget test:

| Part | Size |
|---|---|
| Catalog subset: AI, agent, integration and data rows from `products.json` and `offerings.json` | about 80 rows, about 3,200 tokens |
| Model table: id, tier, in/out kinds, roles, one-line note; **no prices** | 14 rows, about 700 tokens |
| Op vocabulary and one worked example | about 2,000 tokens |
| Rules below | about 2,500 tokens |
| Headroom | the rest of 15,000 |

Prices stay out of the prompt, because the app computes cost (D6). The model only needs tiers.

The listed parts total about 8,400 tokens. Space isn't the constraint; the rules agreeing with each other is.
- **Rules that come from code:** the approval rules come from the D9 table, and the schema constraints are enforced by the validator, not restated at length.
- **Persistent defaults:** Singapore, International scope and the approval policy are **session settings** shown in a header strip. They are not assumption chips, so they don't use up the three chips a turn may add.

### Rules

Each rule is backed by a fact in the digests or NOTES.

**Shape the workflow:**
1. **Prefer a workflow to an agent.** Use an agent only where the number of steps can't be known in advance: research, open-ended troubleshooting, multi-tool lookups. Agents use about 4× the tokens of a chat, and multi-agent systems about 15×. Name the pattern in `say`:
   - prompt chain;
   - router;
   - parallel fan-out;
   - orchestrator with workers;
   - evaluator-optimiser;
   - single agent.
2. **Bound every repetition with a number:**
   - every agent gets `turns`;
   - every `loop` link gets `max` and an `exhausted` route;
   - per-item work goes in a repeat group (`each`).

   Use 3 for refine loops and 10 for agents unless the user says otherwise.
3. **Inline or attached:**
   - **Inline:** a tool or retrieval the code always runs goes on the main path (a `knowledge` step with `task: 'retrieve'`, or a `tool` step).
   - **Attached:** what an agent may choose to use goes under it with `on`.
4. **Fan out in parallel** where steps don't depend on each other, using several `next` links and a joining step. Use `branch` links only for either-or choices. One research example uses an orchestrator with 3 to 5 sub-agents; size it to the task.

**Humans and safety:**

5. **Approval follows the D9 table:**
   - give every act step and side-effecting tool an `effect`;
   - put a human approve step before `send`, `publish`, `pay`, `delete`, `admin` and `decide`, with `approve` and `reject` links, and an `edit` link back to the drafting step;
   - live chat and voice answers (`reply`) and internal notices (`notify`) need no approval; give them a guard step and an `escalate` path to a person instead. An email answer is `send`, even to the person who wrote in;
   - set `private` on stores of customer or personal data, and `subject` on an approve step when it approves something other than the nearest drafted content;
   - respect the session's approval settings.
6. **Mark untrusted input:**
   - set `untrusted` on inbound email, web, upload and search sources;
   - put a `guard` step between untrusted content and any drafting step;
   - never let content from an untrusted source and private knowledge reach an approval-needing effect without a human approve step.

**Pick the model:**

7. **Use the tier the task needs:**
   - small: classify, route, extract, summarise, translate;
   - mid: drafts, RAG answers, vision with tools, the default agent;
   - large: planners, orchestrators, hard reasoning.

   Use only ids from the model table, and pick by the input kind (speech → ASR, scans → OCR, images with tool calls → `qwen3.7-plus`). Escalate with an `escalate` link from a small model to a larger one when confidence is low, rather than running the large model on everything.

**Pick the products** (international, Singapore by default):

8. **Runtimes:**
   - AgentRun (code-first) for agent runtimes;
   - AgentCore for governed multi-agent teams;
   - Function Compute for single steps;
   - CloudFlow for durable multi-step workflows with human waits, using a Standard-mode callback;
   - AgentCore team tasks for reviewer acceptance inside an agent team;
   - Dify on ACK when the customer wants a self-hosted visual builder.

   Never Model Studio's application builder or knowledge base for a new account. Never AgentRun's low-code builder, and never AgentBay.
9. **Retrieval:** Tablestore Knowledge Storage, DashVector or Milvus, with `text-embedding-v4` and `qwen3-rerank`. Never AI Search Open Platform in Singapore.
10. **Triggers:**
    - email arrives from the customer's own mailbox through a webhook into EventBridge or Function Compute (Alibaba Cloud has no inbound email service);
    - outbound email goes through Direct Mail;
    - chat channels: AgentCore connects DingTalk, Lark and WeCom; Chat App Message Service covers WhatsApp, Messenger, Instagram, Telegram, LINE, Viber, SMS and email; anything else (Slack, Teams, KakaoTalk) is a custom webhook into Function Compute;
    - voice in apps and on the web: real-time models over WebSocket, or IMS conversational AI over ARTC;
    - a phone line: drawn as the customer's carrier or partner line, with an assumption that it needs country and account confirmation. Alibaba Cloud documents no international inbound phone product for agents.
11. **Observability:** SLS for logs and traces. AgentLoop for evaluation, in Hong Kong, the only documented non-mainland region.

**Talk about it:**

12. **Residency:** never promise Singapore-only processing. Singapore is where data is stored and accessed. International scope may run inference on nodes outside the Chinese mainland.
13. **Ask and assume:**
    - ask at most two questions: the volume (runs per day), and what success looks like (the outcome and today's baseline), unless the user gave them;
    - assume the rest and say it in `assume`.

    The session settings already cover region, scope and approval.
14. **Set each step's runtime (`runs`).** AgentRun or Function Compute for steps you write, CloudFlow when the workflow waits on people, AgentCore for governed agent teams, or `customer` for the customer's own systems.

### Worked example

The worked example is the support-email workflow, because it exercises most kinds: a webhook trigger, classify, retrieve, guard, draft, a human step and send. A test replays it through the workflow validator, as the cloud example is replayed today.

**Competitor names.** When a user names another vendor's tool ("like Copilot Studio", "our n8n flow"), the model maps the shape onto Alibaba products. It never claims feature parity. The mapping table in `gpt/competitors.md` is used only to draft eval cases. It is not loaded into the prompt.

## 9. Cost per run

A pure function, `estimateWorkflow(wf, models, catalog, settings)`, in `packages/core`. It is tested like `pricing.ts`, and the model never sees or writes its figures.

**A run is one trigger event:** one inbound email, one chat conversation, one uploaded file, one alert. The panel states this in words for each workflow ("one run = one support email").

### Estimate settings

Stored in `memory.estimate`, carried through the request, the commit and the session like the workflow, and edited in the panel:

| Setting | Default |
|---|---|
| `runsPerMonth` | asked; assumed 10,000 when unanswered |
| `scope` | International |
| per step: input and output tokens, thinking on or off, offline (batch) | the table below; thinking off; online |
| per repeat group: items per run | typical 3, upper 10 |
| per `branch` link: share of runs | an equal split, unless the user gives shares |
| per loop: iterations | typical 1, upper `max` |
| per agent: model requests | typical half of `turns`, upper `turns` |
| per guard step: enabled detection types | 2 (prompt injection, content compliance) |
| per agent with web search: searches per request | 1 |

### Default tokens per step

Every default comes from `qwen/cost-sizing.md`, and the user can override it. Each row is labelled as an assumption in the UI and the proposal. These are illustrative sizes: a long email thread or a multi-page invoice is several times larger. So the panel puts the largest cost drivers first and lets the user edit them in place.

| Task | Input | Output | Range |
|---|---|---|---|
| classify / route | 300 + system 400 | 40 | input 100–800, output 20–80 |
| extract (one page) | 600 + system 400 | 150 | 400–900 / 50–400 |
| retrieve (embed the query) | 50 | — | |
| rerank | 20 candidates × 400 + query = 8,050 | — | 2,000–20,000 |
| generate a RAG answer or draft | k=5 chunks × 400 + prompt 800 = 2,800 | 250 | 1,000–5,120 / 100–500 |
| summarise | 3,000 | 200 | |
| plan (orchestrator) | 2,000 | 400 | |
| see / transcribe / speak / create | per unit from the model table: images, minutes, characters, images out | | |

### Agent loops

An agent re-sends its history with every request, so cost grows faster than the number of requests.

**Terms:**
- **N:** the number of model requests in one agent run, *including* the request that writes the final answer. N − 1 of them end in a tool call.
- **Request i** (1-based) sends the base prompt B, the tool schemas S, and the i − 1 earlier call-and-result pairs, each c + r tokens.

**With full history kept:**

```
input  = Σ_{i=1..N} (B + S + (i−1)(c + r))  =  N(B + S) + (c + r)·N(N−1)/2
output = (N−1)·c + a                          (a = the final answer)
```

The estimator sums per request rather than using the closed form, so a history policy can replace the full-history assumption later (for example, summarise after k requests).

**Defaults:**
- B = 2,000;
- S = 150 per attached tool;
- c = 150;
- r = 800;
- a = 250.

r drives the result. At N = 10, one tool, and r = 16,000 instead of 800, input grows from 64,250 to 748,250 tokens. So the panel shows r as an editable setting for agents that read documents or web pages.

**Thinking** tokens are billed as output. A step with thinking on gets the model's thinking price and a ×3 output default, labelled as an assumption.

### Fees outside tokens

- Built-in tool calls, per call, from the model table. An agent with web search assumes one search per turn.
- **AI Guardrails:** $6 per 10,000 calls × enabled types × the guard steps the run passes.
- **Platform fees counted from the graph:**
  - CloudFlow transitions, at the reference $0.25 per 10,000, when `runs` is `cloudflow`: one transition per step passed;
  - EventBridge custom-bus events: one per webhook trigger;
  - Direct Mail messages: one per `send` act on Direct Mail;
  - Chat App Message Service fees: one per `reply` or `send` on that channel.
- **Not priced per run:** time-based compute (Function Compute CU-seconds, AgentCore compute CU, sandbox seconds). These need a step duration, which the first release doesn't estimate. They are listed by unit.
- **Monthly fixed items:** the AgentCore control plane at $0.60 an hour, gateway instances and DashVector instances. They are listed apart, never divided per run.

### Discounts

- **Cache:** implicit caching on the static prefix (the system prompt and tool schemas), at the model's own implicit-hit price. Typical assumes 50% hits; upper assumes none. It applies only where the prefix is at least 1,024 tokens. Explicit caching, with its write price, is a later option.
- **Batch:** only for steps the user marks as offline, and only where the model's `batch` flag is set for Singapore. Batch and cache don't stack.

### Combining steps

- **Parallel `next` links:** costs add up.
- **Exclusive `branch` links:**
  - typical weights each branch by its share;
  - upper takes the most expensive branch.
- **Repeat groups:** the group's steps × items per run.
- **Loops:** the steps in the cycle × iterations.
- **Human steps:** no cost. Reviewer time is listed as an operations item, not priced.

### Output

**Scenarios:**
- **Typical per run** and **upper per run.** These are scenarios built from the settings, not measured percentiles. Same-task agent runs vary up to 30× in tokens, so a single figure would mislead.
- **Monthly:**
  - typical per run × runs per month is the expected usage;
  - upper × runs is labelled "if every run hit the upper case", not a monthly percentile.

**The figure is a priced usage subtotal.** Beside it, the panel lists coverage:
- **Priced:** model tokens, built-in tool calls, AI Guardrails, EventBridge, Direct Mail and Chat App Message Service fees.
- **Not priced, by unit:**
  - indexing and ingestion (one-time and ongoing), storage, sandbox time, Function Compute time;
  - fixed monthly items: the AgentCore control plane at $0.60 an hour, gateway instances, DashVector instances;
  - human review.

  These get a figure only when the user gives the quantity and the catalog has a price. Indexing is the first to add: documents × tokens × the embedding price.

**Latency.** No numbers in the first release. Without measured tool, network and queue times, a time-to-first-token sum would mislead. The panel shows:
- the number of model steps on the longest automated path;
- each human wait, separately, because those set the customer's completion time.

### Scope and region

The estimate takes the deployment scope from the session (International by default). Today's model table holds only International rows, so a Global-scope request shows "prices for International scope; Global is usually lower" instead of guessing.

## 10. Proposal and PDF

- A new section kind `{k:'step', id, text}` covers about 11 touch points: the union in `types.ts`, sanitising, the gate, missing-section detection and assembly in `proposal.ts`, the prompt, the draft client, the draft flow and strings.
- **Products:** there are two `designProducts`, in core (`proposal-prompt.ts:85`) and in the browser draft flow (`draft-flow.ts:180-181`). Both take the union of cloud and workflow products, so catalog excerpts, cautions and prices still reach the writer.
- **Export:** the export entry points (`ExportButton.tsx:159`, `generate.ts:23`, `60-62`) accept a workflow-only session. The completeness checks and `proposal.ts:718` accept step sections in place of product `why`s.
- **Drafting:** the workflow narrative rides in the same drafting call. That is one turn of quota (two if the backup ran), and about 1,600 output tokens in a typical draft against a 6,000-token cap.
- **Lint:**
  - the exact model ids the workflow uses are allowed (D7);
  - jargon rules are relaxed for workflow vocabulary (RAG, API, webhook) in step sections only.
- **Generated sections:** the cost table (D6) and the step-to-runtime mapping are generated, not drafted.
- **Open questions:** an "open questions" list is built from the session's assumptions and from the data-boundary items the design can't answer: which fields leave the customer, which identity reads which store, and retention. These are the security-review questions a pre-sales engineer would otherwise compile by hand.
- **PDF:** the first release has one diagram, the workflow. The PDF's diagram slot becomes a list (`pdf.ts:38`) only when the deployment view ships.

## 11. Evaluation

- **New `Expect.workflow`:**
  - expected step kinds and tasks;
  - a model tier per task;
  - required products and runtimes;
  - every approval-needing effect gated on every path, checked with the same reachability test as `wf-approval`;
  - loops bounded;
  - forbidden products (China-only, legacy, gated).
- **Records and rescoring:** records store the turn mode and the workflow before and after, so a rescore and the judge can read them (section 4). The current 109 cloud cases keep their format.
- **Canonical samples first.** The 32 workflows Qwen extracted to `usecases/*.json` (8 each for service, revenue, operations and documents) are sketches, not truth:
  - their topology is prose;
  - model work hides under `tool`, `decide` and `end`;
  - their roles (`reason`, `draft`, `ocr`, `asr`, `tts`) don't match `task`.

  Phase 1 converts each into a reviewed canonical graph in the new contract. That means explicit branches, joins, repeat groups, loops with an `exhausted` route, effects, and every billable call as a model-backed step, with a fixed role map:

  | Role in the samples | Becomes |
  |---|---|
  | reason | plan |
  | draft | generate |
  | ocr | extract on an OCR model |
  | asr | transcribe |
  | tts | speak |

  A sample must pass the validator before it becomes an eval case or a layout fixture.
- **Paraphrases:** Qwen drafts them in English, Korean and Chinese, and some cases are held out. Claude reviews every case against NOTES before it enters the set.
- **Cases that test the rules:**
  - one per gated product (the knowledge base for a new account, AgentBay, low-code AgentRun);
  - one per inbound channel (email via webhook, WhatsApp, Slack via custom webhook, a phone line);
  - a lethal-trifecta setup;
  - a request to "just automate it", where no human step is the right answer for internal, reversible actions;
  - a chat agent whose replies need no approval (`reply`), next to an email agent whose sends do.
- **A workflow judge rubric** beside the cloud one.
- **Gate:** the cloud eval is re-baselined once after phase 0a, because the catalog fixes change the prompt's rows. After that, this feature must keep it within the run-to-run noise measured on the new baseline (three runs). Deterministic tests and fixtures must match exactly.

## 12. Phases

| Phase | Work | Size | Gate |
|---|---|---|---|
| 0a | Live-app fixes that don't wait for this feature: AgentBay `no-new-purchases` with the R21 wording; qwen3.8-flash cache write 0.20 in `pricing.ts`; AgentRun and AgentCore notes | S | deterministic tests and the prompt budget band pass; cloud eval re-baselined (three runs) |
| 0b | `models.json` with per-model tool support; the remaining catalog changes in section 6; the open facts in section 13 settled or marked as assumptions | M | every row traced to NOTES |
| 1 | **Semantic contract:** types, the pure workflow reducer and validator, the D9 approval table, the checks; the 32 samples converted into canonical graphs | M | every canonical sample passes; each check fires on a seeded fault and stays quiet on the clean samples |
| 2 | **Layout spike** on the canonical samples and synthetic streams: sticky state, attached stacks, brackets, camera, overview; routing probe | M | zero foreign moves on step and link ops; splice and overflow within budget; legible at 10, 15 and 25 steps at 800, 920 and 1,150 px |
| 3a | **Turn pipeline, core and server:** mode, memory fields, serializers, the prompt cache by mode, `streamOps` with rescue and continuation, repair and commit, warnings by view, tombstones, caps and body size, quota | L | all existing tests unchanged; round trip, second workflow turn, truncated continuation and dual-document size tests |
| 3b | **Browser state:** controller mode and retry, streaming and commit by view, change keys, provenance and auto-fix, selectors, stop, revert and restore, session revival and eviction, replay per-turn mode | L | save and reload, mixed-view replay, revert across views |
| 4 | **Workflow prompt, eval and judge:** records, scorer and rescore by mode; cases from the canonical samples | M | pass rate set from the first run; cloud eval within baseline noise |
| 5 | **UI:** landing focus, canvas scene and glyphs, line styles, badges, header strip of session settings, the Steps and why panel with the step → runtime table, hover, accessibility announcements, export availability | L | browser check on real streams at the three widths |
| 6 | **Cost:** `estimateWorkflow`, estimate settings in memory and the panel, coverage list | M | unit tests on the formulas; samples priced against hand calculations |
| 7 | **Proposal:** step sections, generated cost and mapping tables, open questions, model allowlist in lint, backup voice threading, both `designProducts`, export entry points | L | proposal eval sessions for workflows; leak tests by mode |
| 8 | **Where it runs:** the deployment brief, the cloud turn, stale marking, cross-view check, PDF diagram list | M | eval cases for the deployment turn |

**Phase 0a, done on 2026-11-02.** The changes:
- **AgentBay** is `no-new-purchases`, with `agent-sandbox` as its successor. Its prompt row drops out, and it's removed from four entries' alternatives.
- **R21:** "Never agentbay: closed to new customers. Windows or Android sandboxes need confirmation with Alibaba Cloud."
- **Notes:** the AgentRun and AgentCore notes are updated.
- **Prices:** qwen3.8-flash explicit cache write is 0.20, and qwen3.7-plus explicit cache read is 0.04.
- **Eval:** one case's judge reference is updated.

**Verification:**
- **Tests:** 559 core and server, 269 Worker and 421 web, all passing.
- **Prompt size:** 14,977 tokens, inside the 14,500–15,000 band.

**The new cloud baseline** is `eval/results/2026-11-02T11-29-56-phase0a-baseline`: 109 cases × 3 runs, pass@1 96%, all three runs pass 92%, $4.88. Against the last full run (`2026-10-31T18-06-03-p1b-final-full`):
- **Headline:** pass@1 is unchanged at 96%; cases where every run passes went from 99 to 100.
- **Noise:** six cases gained a run and four lost one, which sets the noise band at about ±1 run per case.
- **`p1-vpc-no-group` (2/3 → 0/3):** this is a pre-existing repair gap, not the change. The model draws Private Zone attached to a VPC node that doesn't exist; it happened in 1 run of 3 before and in all 3 now.

**Phases 0b and 1, done on 2026-11-02.** The spec is `impl/phase1-spec.md`.
- **Phase 0b:**
  - `catalog/models.json`: 16 models and 6 built-in tools, with tool support and batch as three-state values. The ASR "conflict" turned out to be two models.
  - Catalog notes and prices for 10 entries, touching only fields the prompt doesn't read.
- **Phase 1, new modules:** `approval.ts` (the D9 table), `models.ts`, `workflow.ts` (reducer), and `workflow-validate.ts` (validator, 19 checks and repairs). The workflow types are in `types.ts`.
- **Additions to the contract beyond section 3:**
  - a `tool` field on tool steps;
  - an approve step counts only through its `approve` link;
  - `wf-dangling-ref`;
  - `wf-id-collision` when a link id is reused with new endpoints.
- **Samples:** the 32 sample workflows are canonical fixtures in `test/fixtures/workflows/`. 28 pass with no findings, and 4 carry the decision-review advisory.
- **Review:** an extra-high GPT review found 7 defects. All were reproduced, fixed and covered by regression tests:
  - nested sub-agent inputs were missing from the reply-guard check;
  - pending links survived an `unstep`;
  - splice wasn't atomic;
  - generated ids could exceed the limit;
  - a pending id could be consumed by the wrong link;
  - splice could overwrite an endpoint;
  - output order depended on insertion order.
- **Verification:**
  - **Tests:** 694 root, 421 web and 269 Worker, all passing.
  - **Typechecks:** all three are clean.
  - **Cloud prompt:** byte-identical (sha256 `998fab22…`).
- **Before phase 3, do a readability pass on `workflow.ts` and `workflow-validate.ts`.** The code is correct but denser than `reducer.ts` and `validate.ts`, with 19 lines over 160 characters.

**Order.** The contract comes before the layout spike: a layout that holds still but draws the wrong semantics proves nothing. The spike still comes before the pipeline work, because layout remains the largest single risk.

### Recommended first release

**Phases 0 to 7, for text-based workflows.** The release is worth shipping when a pre-sales engineer can do three things with it:
- stream a workflow such as support-email triage with retrieval, draft, approve/edit/reject and a bounded refine loop;
- review and edit its assumptions and cost drivers;
- export a proposal with step sections, the step → runtime table, a priced usage subtotal with its coverage, and the open questions.

That is enough to agree a pilot's scope with a customer.

**Deferred from the first release:**
- **The deployment turn and the dual-diagram PDF** (phase 8). The mapping table covers the "where does it run" question first.
- **Voice workflows.** They are drawable, with models and products, but they get no cost or latency figures. Streaming, barge-in and call length need their own semantics.
- **Image and video pricing.** Those steps are listed as "not priced".
- **Numeric latency.**
- **Data-flow and trust-boundary metadata.**
- **A full scoping brief**: today's baseline, targets, acceptance criteria, test data and integration owners. This is the strongest candidate for the next release. The first release asks for the outcome and baseline, and lists the rest as open questions.
- **Sub-workflow containers, multi-agent cost detail beyond `turns`, and DeepSeek and other third-party models.**
- **Run-time semantics a design tool doesn't need.** These belong to whatever runs the workflow (CloudFlow, AgentRun code), and the proposal lists them as implementation notes:
  - conversation ownership after a takeover;
  - streamed-output release and cancellation;
  - join correlation across overlapping runs;
  - artifact versions;
  - timed waits and scheduled follow-up sequences.

This cut is a recommendation for the user to confirm, not a decision already taken.

## 13. Risks and open questions

- **Layout stability and readability:** whether the sticky grid holds under real streams, and stays readable as holes and arrival-order rows build up, is unproven until the spike. The tidy button is the fallback.
- **False precision.** A polished diagram with model chips and a cost figure can read as a commitment. Three things guard against it:
  - the model chips are labelled "candidate, validate on your data";
  - the estimate is a priced subtotal with typical and upper scenarios and its coverage;
  - the proposal's open questions name what the design hasn't established.
- **Two documents in one conversation:** shared assumption caps (3) and question caps (2) per turn, and the 12-constraint cap, now cover both views.
- **The model may emit cloud ops in a workflow turn, or the reverse.** The validator drops them with an info warning. Evals measure how often it happens.
- **Model facts age fast.** `models.json` needs a `verified` date per row and the same re-check routine as the catalog. On launch day alone:
  - AgentBay closed to new customers;
  - qwen3.5-plus is about to retire;
  - free quotas changed four days earlier.
- **Prices with no firm international figure:**
  - Tablestore Knowledge and Memory Storage (CNY only, and the memory meter contradicts itself);
  - Agent Sandbox ("preview estimates");
  - Milvus compute in Singapore;
  - AgentRun (no rate card; derived from Function Compute).

  The estimate lists these by billing unit with no figure.
- **Facts still open, to settle in phase 0b:**
  - CloudFlow's current-version billing (only the previous-version page gives figures);
  - whether AgentCore team tasks run in Singapore;
  - AgentLoop in Singapore;
  - an international inbound phone path for voice agents.

  Until then, the app shows these as assumptions, not facts.
- **Tiering and the token multipliers are guidance, not law.** The 4× and 15× multipliers come from one vendor's measurements. The proposal words them that way.
- **Regulation shows up in requests.** The app doesn't give legal advice. It keeps facts the prompt may state, and rule-backed defaults:
  - **EU AI Act:** Annex III duties from 2027-12-02; workplace emotion recognition banned since 2025-02-02.
  - **Korea:** AI Basic Act disclosure since 2026-01-22; PIPA's right to object to automated decisions.
  - **Defaults:** human review on decisions with legal effect; an AI-disclosure note when a step's output reaches Korean users.

## 14. Research behind this plan

**Method.** The research had three stages, each run by a different model family, so no model checked its own work:
1. Qwen (qwen3.8-max, reasoning effort xhigh, with web search) wrote one deep-research report per brief in `briefs.md`.
2. Qwen Flash pulled the claims out of each report. GPT then checked every high-weight claim and up to 20 medium ones per report against the cited page, live, grouped by page.
3. Claude ruled on the disagreements in `verify/NOTES.md`. Qwen Max wrote one digest per report with the NOTES rulings applied. GPT also answered targeted questions where the reports conflicted (`verify/adjudicate-*.md`).

| Stream | Output | Status |
|---|---|---|
| Qwen deep research | `qwen/*.md`: models (text, multimodal), API features, platforms (runtime, tools), reference solutions, patterns, production practices, use cases (service, revenue, operations, documents), diagram notation, cost sizing, presales | all 15 done; documents needed four retries after Model Studio server errors |
| GPT research | `gpt/*.md`: competitors, model-tiering evidence, interoperability (MCP, A2A), regulation | done; cited here only where NOTES confirms a claim |
| Fact-check | `verify/batch1-7*.md`: about 900 claims; most confirmed as written, the rest corrected, flagged China-only or unverifiable | done; tallies per batch are in NOTES |
| Adjudication | `verify/adjudicate-1..4.md`: AgentBay, AI Guardrails, AgentCore channels and status, the knowledge-base gate, cache prices, retirements, Tablestore; then OCR, approvals, AgentLoop, Agent Sandbox, telephony, built-in tools | done |
| Digests | `digest/*.md`: 15 digests, 1,500 words each | done |
| Use cases | `usecases/*.json`: 32 workflows for evaluation, 8 per area | done |

**What the research changed in the design:**
- **Contract:**
  - the solid/dashed split via `on`;
  - `turns`, repeat groups and the `guard` kind;
  - no containers.
- **Checks:** `wf-trifecta` and `wf-gated-product`.
- **Cost:** the agent-loop formula; tool and per-detection-type fees; scope-keyed prices.
- **Prompt:** the product routing rules, such as no inbound email service, the IM channel split, and no knowledge base for new accounts.
- **The live app:** two catalog fixes that ship ahead of this feature (phase 0a).

**What it cost:** about $54 of Model Studio usage for the 15 reports (about $24 in tokens and about 3,200 web searches at $10 per 1,000), plus retries that timed out, and $4.88 for the phase-0a eval baseline. The GPT checks ran on the ChatGPT plan.

## 15. Review outcomes

Two GPT reviews (`review/code-fit.md`, `review/design.md`) attacked the first full draft. Claude checked the code claims cited here against the repository before using them. The checked claims:
- `finalUserContent`;
- the shared `rec` op;
- the prompt cache;
- the browser commit;
- the 109 cases;
- `turn()`;
- the controller request;
- session revival;
- the backup voice;
- the proposal lint context;
- the leak test's walk.

**Accepted and folded in:**

| Area | Change |
|---|---|
| Code facts | **Loss points:** the D1 list was corrected. The browser commit loses nothing; follow-up prompts, turn parsing, the controller and session revival do.<br>**Cited figures:** 109 cases; the 14,500–15,000 prompt band; the leak test stops at `memory`.<br>**Two code fixes:** `plan` seeds nothing; `voice` is not threaded. |
| Contract | **Fields:** `turns` and `effect` were added to the ops, and `repeat` and a numeric `max` replace the free-text `each` and loop labels.<br>**Semantics:** fork and join, approval outcomes, and the `exhausted` route.<br>**Ops:** `rec` is dropped in workflow turns; `splice` is spelled out.<br>**Ids and tombstones:** one id namespace across nodes, links and groups; separate workflow tombstones. |
| Checks | **Corrections:**<br>- inline knowledge is valid;<br>- loops come from the graph, not from columns;<br>- approval is checked on every path after removing approve steps;<br>- the trifecta check follows data across agents;<br>- the region check is a warning, not an error.<br>**Policy:** one approval table (D9) for the prompt and the checks. |
| Cost | **Definitions:** a run is defined, and N includes the final request.<br>**Labels:** typical and upper scenarios replace p50 and p95; the result is a "priced usage subtotal" with its coverage.<br>**Settings:** estimate settings persist in memory.<br>**Latency:** numeric latency is deferred. |
| Layout | Readable zoom, two-axis pan, an overview strip, follow stops after the user pans, a collapsed attachment stack, a visible tidy button, tests at three widths and three sizes. |
| Pipeline | The touch-point checklist in section 4: serializers, the prompt cache by mode, rescue seeding, auto-fix, change keys and provenance, sessions and eviction, replay, eval records, quota, body size. |
| Phases | The contract moves before the layout; the old phase 2 splits into 3a and 3b; the UI and the proposal are sized L; the cloud eval is re-baselined after 0a; a recommended first release. |
| Usefulness | **Runtime mapping:** `runs` and the step → runtime table.<br>**Open questions:** they replace an implied security sign-off.<br>**Questions asked:** the outcome and baseline join volume as the two questions.<br>**Deferral list:** an explicit one. |

**Deferred, with the reason:**
- **Data-flow metadata and the full scoping brief.** They are valuable, but the contract and the first release are already large.
- **Voice semantics.**
- **Measured latency.**

**Not adopted:**
- **Loop containers with a nested canvas,** and collapsible sub-workflows. The streaming layout can't keep a sub-canvas stable; repeat groups and attached sub-agents cover the cases in the 32 samples. The phase-1 conversion tests that claim.

**Contract walk (`review/contract-walk.md`).** GPT then wrote six of the samples as ops in the revised contract and ran the checks by hand:
- support email;
- localisation;
- SRE incident;
- sales outreach;
- claims;
- chat.

**What it found:**
- **D9 vs the email example.** A support email could be read as a `reply` (no approval), which contradicted the email example. Email is now `send` by definition.
- **A false negative in `wf-approval`.** Removing a per-locale review still passed, because an upstream legal approval cut the path. The check now walks backwards to the last content-producing step.
- **Data-flow rules left implicit:** what an approval covers; mixing parallel and either-or links; what a retry count means inside a repeat group; how a repeat group starts and ends.
- **Safety rules with no checks:** a missing guard on chat replies, and no advisory on consequential decisions.
- **`splice`:** it would have turned approval and retry links into plain `next` links.

**Accepted, with these fields and checks:**
- **New fields:**
  - `private`, `approval`, `subject`;
  - an agent `exhausted` link;
  - a group's `parallel` flag.
- **New checks:**
  - `wf-mixed-out`;
  - `wf-reply-guard`;
  - `wf-decision-review`.
- **Splice:** it now keeps the link's meaning.

**Deferred as run-time concerns:** conversation ownership after a takeover, streamed release, join correlation across runs, artifact versions, and timed follow-up sequences (section 12).
