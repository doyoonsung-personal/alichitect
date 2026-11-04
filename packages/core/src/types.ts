// Shared contracts for the catalog, the diagram graph and the streamed op grammar (v2).
// Erasable TypeScript only, so the same file runs under Node's type stripping, Vite and tsc.

// ---------- Catalog ----------

/** Where an entry lives. The renderer derives containment from this, never from the model. */
export type Scope =
  | 'external' // outside the cloud: users, devices, on-prem DC, third-party services
  | 'global' // outside any region: DNS, GTM, Global Accelerator
  | 'edge' // edge network: ESA, CDN, Anti-DDoS Proxy, WAF in CNAME mode
  | 'region' // regional managed service drawn outside the VPC: OSS, SLS, Model Studio, MaxCompute
  | 'vpc' // inside a VPC (vSwitch): ECS, ACK, ALB, RDS, PolarDB, Tair
  | 'vpc-edge' // on the VPC boundary: NAT Gateway, VPN Gateway, Cloud Firewall
  | 'account' // account-level governance band: RAM, CloudSSO, ActionTrail, Security Center
  | 'saas'; // bought as seats and used outside the customer's cloud: Qoder, QwenWork

/** Column or band inside the entry's scope; drives the lane-grid layout. */
export type Lane =
  | 'clients' | 'onprem' | 'thirdparty' // external
  | 'dns' | 'edge' // global, edge
  | 'ingress' | 'compute' | 'middleware' | 'cache' | 'database' | 'search' | 'filestore' // vpc
  | 'boundary' // vpc-edge
  | 'storage' | 'ai' | 'analytics' | 'integration' | 'ops' | 'security' | 'network' // region
  | 'governance' // account
  | 'saas'; // saas

/** Icon family. The app ships its own glyph per family; no Alibaba artwork. */
export type IconFamily =
  | 'users' | 'device' | 'onprem' | 'internet' | 'dns' | 'cdn' | 'shield' | 'firewall' | 'loadbalancer'
  | 'gateway' | 'compute' | 'container' | 'serverless' | 'database' | 'cache' | 'storage' | 'filestore'
  | 'search' | 'queue' | 'stream' | 'analytics' | 'bi' | 'ai' | 'agent' | 'network' | 'vpn' | 'monitor'
  | 'logs' | 'key' | 'identity' | 'audit' | 'devtools' | 'desktop' | 'media' | 'saas' | 'generic';

export type Lifecycle = 'ga' | 'preview' | 'legacy' | 'no-new-purchases' | 'retired';
export type Availability = 'intl' | 'china-only' | 'restricted' | 'announced';

export interface CatalogEntry {
  id: string; // stable kebab-case id; the model may emit only these
  name: string; // current official international name
  short: string; // card label, at most 18 characters
  aliases: string[]; // former and alternate names that resolve to this id
  kind: 'service' | 'offering' | 'construct'; // construct: users, devices, on-prem DC
  category: string; // official L1 category from the international navigation
  icon: IconFamily;
  scope: Scope;
  lane: Lane;
  /** North-south request path order: users 0, dns 5, edge 10, anti-ddos 15, waf 20, lb/gateway 30, compute 40, cache 50, db/search 60, storage 70. */
  pathRank?: number;
  vpcAttachable?: boolean; // region-scoped service that may also sit inside a VPC (VPC-attached FC, KMS instance)
  attach?: { as: 'badge' | 'attachment'; hosts: string[] }; // drawn on a host node instead of in the path (WAF on ALB/ESA, EIP on NAT)
  multiAz?: boolean; // usually deployed across zones (one node with zones[])
  status: Lifecycle;
  successor?: string; // id to recommend instead when legacy, no-new-purchases or retired
  availability: Availability;
  regions?: string[]; // international region ids, where known
  purpose: string; // our own words, at most 16 words; used in the prompt row and as the hover fallback
  useWhen?: string; // at most 20 words
  avoidWhen?: string; // at most 20 words
  pairsWith?: string[]; // ids
  family?: string; // product family for avoid constraints (for example 'kubernetes'): avoiding the family rules out every member
  alternatives?: string[]; // ids
  docs?: string; // official URL, link only
  note?: string; // lifecycle or availability caveat in our own words (dates, successor hints); shown in warnings and hover
  verified: string; // YYYY-MM-DD the entry was last checked
  // Offering fields (kind === 'offering')
  audience?: string;
  purchase?: 'saas-seat' | 'subscription-plan' | 'cloud-payg' | 'open-source' | 'contact-sales';
  price?: { summary: string; asOf: string };
  intents?: string[]; // need phrases this offering answers
  notFor?: string; // for example 'app backends' for Coding Plan
}

export interface Resolution {
  entry?: CatalogEntry;
  via?: 'id' | 'alias' | 'successor';
  warning?: Warning;
}

/** Built by createCatalog() in catalog.ts from products.json + offerings.json (one id namespace). */
export interface Catalog {
  version: string;
  entries: CatalogEntry[];
  byId: Map<string, CatalogEntry>;
  /** Exact id first, then case-insensitive alias or name, then successor of a retired entry. */
  resolve(idOrName: string): Resolution;
  /** Compact rows for the system prompt: id | name | scope | lane | rank | purpose | pairs-with | [flags]; empty fields are omitted (legend: PROMPT_ROW_FORMAT in catalog.ts). */
  promptRows(): string;
}

// ---------- Graph ----------

export type GroupKind = 'external' | 'edge' | 'region' | 'vpc' | 'zone' | 'subnet' | 'onprem';
export type EdgeKind = 'data' | 'async' | 'control' | 'resolve';

export interface GraphGroup { id: string; kind: GroupKind; label: string; parent: string | null }

export interface GraphNode {
  id: string;
  product: string; // catalog id
  label: string;
  group: string | null; // the model's hint; the validator re-parents by catalog scope
  zones?: string[]; // one logical node spanning zones, for example ['a', 'b']
  attachTo?: string; // host node id when drawn as a badge or attachment
  why?: string;
}

export interface GraphEdge { id: string; from: string; to: string; label?: string; kind?: EdgeKind }
export interface Recommendation { product: string; fit: 'primary' | 'complement'; why: string }

export interface Graph {
  groups: Record<string, GraphGroup>;
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  recs: Recommendation[];
}

// ---------- Op grammar v2 (one JSON object per NDJSON line) ----------

export type Op =
  | { t: 'say'; text: string }
  | { t: 'plan'; products: string[]; note?: string }
  | { t: 'req'; text: string; regions?: string[]; avoid?: string[]; lifts?: string[] } // pins a user requirement for chat memory; regions: region ids data and workloads must stay in (the complete list now allowed: it replaces earlier region pins); avoid: catalog ids the user ruled out; lifts: 'regions' to drop every region pin, or catalog ids to drop from the avoid lists
  | { t: 'group'; id: string; kind: GroupKind; label: string; parent?: string | null }
  | { t: 'node'; id: string; product: string; label: string; group?: string | null; zones?: string[]; attachTo?: string; why?: string } // upsert by id
  | { t: 'edge'; id: string; from: string; to: string; label?: string; kind?: EdgeKind }
  | { t: 'insert'; id: string; product: string; label: string; why?: string; on: string } // splits edge `on` into from -> id -> to
  | { t: 'move'; id: string; to: string | null }
  | { t: 'remove'; id: string } // removing a node cascades its edges; unknown id is a no-op
  | { t: 'rec'; product: string; fit: 'primary' | 'complement'; why: string }
  | { t: 'gap'; need: string; note: string }
  | { t: 'assume'; id: string; text: string; alt?: string } // an assumption the design rests on; shown as a chip, alt is the one-click alternative (research/phase1-asks-and-scope.md)
  | { t: 'ask'; id: string; text: string; options?: string[] } // a question whose answer would change the design; options become quick-reply buttons
  | { t: 'done'; summary: string };

export type WarningCode =
  | 'wf-bad-op' | 'wf-unknown-ref' | 'wf-id-collision' | 'wf-cloud-op'
  | 'wf-no-trigger' | 'wf-unreachable' | 'wf-ai-missing' | 'wf-attach-form' | 'wf-dead-end' | 'wf-cycle'
  | 'wf-loop-exit' | 'wf-agent-turns' | 'wf-act-effect' | 'wf-approval' | 'wf-mixed-out'
  | 'wf-human-outcomes' | 'wf-reply-guard' | 'wf-trifecta' | 'wf-decision-review' | 'wf-ai-region'
  | 'wf-ai-mismatch' | 'wf-dangling-ref' | 'wf-gated-product'
  | 'wf-deploy-stale' | 'wf-product-missing'
  | 'bad-json' | 'bad-op' | 'unknown-product' | 'alias-resolved' | 'retired-product' | 'china-only'
  | 'restricted' | 'dangling-edge' | 'missing-group' | 'containment' | 'dns-in-path' | 'path-order'
  | 'orphan-node' | 'duplicate-id' | 'cap-exceeded' | 'attach-host-missing'
  // protocol core (reducer.ts, validate.ts):
  | 'unknown-id' // remove, move or insert named an id that does not exist; the op is a no-op (info)
  | 'zone-replicas' // one node per zone for the same product; repaired into one node with zones[]
  | 'attach-inline' // an attachable product drawn as a hop next to one of its catalog hosts; repaired into attachTo
  // Phase 1 (validate.ts):
  | 'attach-invalid' // attachTo on a product the catalog does not let attach to that host; repaired into an edge
  | 'constraint-region' // a group, node or say line puts data or workloads outside a pinned regions constraint
  | 'constraint-avoid' // a product the user ruled out was added
  | 'constraint-replaced' // info: a pinned constraint was replaced, lifted or dropped (a newer requirement, or the cap of twelve)
  // Backup model (llm.ts runTurn with a BackupProvider):
  | 'reply-incomplete'; // warn: the reply was stopped (Model Studio's content filter) and the backup could not finish it; the diagram keeps what was drawn

export interface Warning {
  code: WarningCode;
  ids: string[];
  msg: string;
  severity: 'error' | 'warn' | 'info';
  repaired: boolean; // true when a deterministic rule already fixed it
  view?: TurnMode; // which document the finding is about; absent means 'cloud' (records from before the workflow view)
}

/** Result of applying one op: the new graph plus what changed, for animation, tombstones and history. */
export interface ApplyResult {
  graph: Graph;
  added: string[];
  updated: string[];
  removed: string[];
  tombstones: Array<GraphNode | GraphEdge | GraphGroup>; // removed elements, so "bring it back" can restore them
  warnings: Warning[];
}

// ---------- Chat memory ----------

export interface Turn {
  role: 'user' | 'assistant';
  text: string; // the user's message, or the assistant's say lines joined
  changes?: string; // assistant only: compact change summary, for example "+waf(badge on alb) -ecs-a"
  mode?: TurnMode; // the document this turn edited; absent means 'cloud'
}

export interface SessionMemory {
  turns: Turn[]; // full history; the prompt builder sends a recent window verbatim
  summary?: string; // rolling summary of turns older than the window
  requirements: string[]; // pinned by req ops, always sent
  constraints?: Constraint[]; // machine-checkable form of pinned requirements (req ops with regions or avoid), checked every turn
  assumptions?: Array<{ id: string; text: string; alt?: string }>; // the assumptions the current diagram rests on; the same id replaces
  questions?: Array<{ id: string; text: string; options?: string[] }>; // open questions from the latest assistant turn
  graph: Graph;
  tombstones: Array<GraphNode | GraphEdge | GraphGroup>;
  // The workflow view (research/ai-workflows/PLAN.md D1). All optional: a session without them is a cloud-only session.
  workflow?: WorkflowGraph;
  deploymentSource?: string; // fingerprint of the committed workflow and placement settings used to draw the cloud graph
  workflowTombstones?: Array<WorkflowNode | WorkflowEdge | WorkflowGroup>; // removed workflow elements, bounded like tombstones
  workflowSettings?: WorkflowSettings; // session settings strip: region, approval overrides (PLAN.md D9)
  estimate?: WorkflowEstimateSettings; // cost-estimate inputs the user edited (PLAN.md section 9)
}

/** Machine-checkable form of a pinned requirement, from a req op that carries regions or avoid. */
export interface Constraint {
  text: string; // the requirement as pinned
  regions?: string[]; // region ids (for example ap-southeast-1) that data and workloads must stay in
  avoid?: string[]; // catalog ids the user ruled out
  /** Transient, on a constraint taken from a req op: 'regions' or catalog ids this requirement lifts. mergeConstraints applies it and never stores it. */
  lifts?: string[];
}

// ---------- Server API (apps/server) ----------

/** POST /api/turn body. The browser holds the session and sends it with each turn; the server keeps no session state. */
export interface TurnRequest {
  intent?: 'deployment'; // explicit request to draw the cloud graph from the workflow
  sessionId: string;
  ask: string;
  memory: SessionMemory;
  mode?: TurnMode; // which document the turn edits; absent means 'cloud' (existing clients and fixtures)
}

/** Which document a turn edits: the cloud architecture graph or the AI workflow (PLAN.md D2). */
export type TurnMode = 'cloud' | 'workflow';

/**
 * POST /api/turn response: NDJSON, one event per line. The stream carries every llm.ts TurnEvent (say, op, warn, usage,
 * done, error, each with phase 'main' or 'repair') plus these server events. It ends with 'commit' or 'fatal';
 * a 'summary' may follow 'commit' when older turns were folded into the rolling summary.
 */
/** Who served a call: Model Studio (Qwen, the primary) or the backup that finishes a turn Model Studio's filter stopped. Server-side only: never sent to a browser. */
export type Provider = 'qwen' | 'claude';

export type ServerEvent =
  // 'finish': a second pass is completing the answer (see apps/server/src/turn.ts). The wire never names who runs it:
  // no provider, model or reason field travels to the browser.
  | { type: 'status'; code: 'fallback' | 'retry' | 'continue' | 'repair' | 'summary' | 'finish'; text: string }
  | { type: 'commit'; memory: SessionMemory; changes: string; warnings: Warning[] } // final repaired state; the browser replaces its memory with it
  | { type: 'summary'; summary: string } // rolling summary after the commit; the browser stores it in memory.summary
  | { type: 'fatal'; code: string; message: string; retryable: boolean }; // the turn failed and memory is unchanged

// ---------- Proposal drafting (POST /api/proposal) ----------

/**
 * POST /api/proposal body: the session as the browser holds it, plus the export dialog's cover fields. The server
 * drafts the proposal's narrative with Qwen (packages/core/src/proposal.ts draftProposal) and streams it back.
 */
export interface ProposalRequest {
  sessionId: string;
  /** The language the PDF is written in (the app's UI language), whatever language the conversation used. */
  lang: 'en' | 'ko' | 'zh';
  /** Cover title as typed; may be empty. */
  title: string;
  /** Customer name as typed; may be empty. The writer uses it to address the reader and never adds facts about it. */
  customer: string;
  memory: SessionMemory;
  /** Optional solution pricing conversation from the same session, separate from the diagram. */
  pricing?: import('./solution-pricing.ts').PricingSession;
}

/**
 * Where a customer need comes from: the customer's own words in any message, including corrections and answers to
 * questions ('stated', with a short quote of those words); what their answers and corrections imply ('inferred'); or
 * what is typical for this kind of workload when the conversation says little ('general').
 */
export type NeedSource = 'stated' | 'inferred' | 'general';

/** One NDJSON line of the drafted narrative, as the writer model emits it and proposal.ts validates it. */
export type ProposalSection =
  /** Executive summary for business decision makers: 2 or 3 short paragraphs separated by a blank line. */
  | { k: 'exec'; text: string }
  /** A customer need or pain point and how the design answers it, in business terms. `products` are catalog ids in the design. */
  | { k: 'need'; id: string; need: string; source: NeedSource; quote?: string; answer: string; products: string[] }
  /** A business outcome of the design ("Pay only for what you use"): a short title and why it follows. */
  | { k: 'outcome'; title: string; text: string }
  /** Why one product is in this design for this customer: the problem it removes or the outcome it enables, and the cost of leaving it out. */
  | { k: 'why'; product: string; text: string }
  /** Business explanation of an inline workflow step. */
  | { k: 'step'; id: string; text: string }
  /** What drives the solution estimate and which decision could change it. Its figures come from the printed breakdown. */
  | { k: 'cost'; text: string }
  /** An honest trade-off, risk or open point, and how it is handled. */
  | { k: 'tradeoff'; text: string; mitigation?: string }
  /** A concrete next step. */
  | { k: 'next'; text: string };

export interface ProposalNeed {
  id: string;
  need: string;
  source: NeedSource;
  /** Present only when it was found in the customer's messages. */
  quote?: string;
  answer: string;
  products: string[];
}

/** The validated, assembled narrative the PDF prints. Products without a `why` entry fall back to the drawing's own reason. */
export interface ProposalDraft {
  lang: 'en' | 'ko' | 'zh';
  exec: string;
  needs: ProposalNeed[];
  outcomes: Array<{ title: string; text: string }>;
  /** Catalog id -> why it is in this design for this customer. */
  why: Record<string, string>;
  /** Workflow node id -> explanation; absent on legacy and cloud-only drafts. */
  steps?: Record<string, string>;
  cost?: string;
  tradeoffs: Array<{ text: string; mitigation?: string }>;
  next: string[];
  /** Every section kind arrived and every product in the design got a why line. */
  complete: boolean;
}

/**
 * POST /api/proposal response: NDJSON, one event per line, ending with 'done' or 'fatal'. As on /api/turn, the wire
 * never names who wrote a line: no provider, model or reason field travels to the browser.
 */
export type ProposalEvent =
  | { type: 'section'; section: ProposalSection }
  /** 'retry': a stalled or failed call is being retried; 'finish': a second pass is completing the draft. */
  | { type: 'status'; code: 'retry' | 'finish'; text: string }
  | { type: 'done'; draft: ProposalDraft }
  | { type: 'fatal'; code: string; message: string; retryable: boolean };

// ---------- Workflow ----------

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
  | {
      t: 'step'; id: string; kind: WorkflowNodeKind; label: string;
      task?: WorkflowTask; after?: string; on?: string; product?: string; runs?: string;
      ai?: string; tool?: string; turns?: number; effect?: Effect;
      untrusted?: boolean; private?: boolean; approval?: 'required' | 'skip'; subject?: string;
      join?: 'all' | 'any'; repeat?: string; why?: string;
    }
  | { t: 'link'; id: string; from: string; to: string; kind?: WorkflowEdgeKind; label?: string; max?: number; outcome?: WorkflowOutcome }
  | { t: 'each'; id: string; over: string; parallel?: boolean }
  | {
      t: 'splice'; into: string; id: string; kind: WorkflowNodeKind; label: string;
      task?: WorkflowTask; after?: string; on?: string; product?: string; runs?: string;
      ai?: string; tool?: string; turns?: number; effect?: Effect;
      untrusted?: boolean; private?: boolean; approval?: 'required' | 'skip'; subject?: string;
      join?: 'all' | 'any'; repeat?: string; why?: string;
    }
  | { t: 'unstep'; id: string };

export interface WorkflowSettings {
  region?: string;          // pinned region id; default 'ap-southeast-1'
  approvalOff?: Effect[];   // the user waived approval for these effects
  approvalOn?: Effect[];    // the user asked for approval on these effects
}

/**
 * Cost-estimate inputs the user can edit (PLAN.md section 9). Every field is optional; packages/core/src/workflow-estimate.ts
 * supplies the defaults. Keys of the per-element maps are workflow node, link or group ids.
 */
export interface WorkflowEstimateSettings {
  runsPerMonth?: number;
  scope?: 'international' | 'global';
  steps?: Record<string, { inTokens?: number; outTokens?: number; thinking?: boolean; offline?: boolean }>;
  items?: Record<string, { typical?: number; upper?: number }>; // repeat group id -> items per run
  shares?: Record<string, number>; // branch link id -> share of runs, 0..1
  loops?: Record<string, { typical?: number; upper?: number }>; // loop link id -> iterations
  agents?: Record<string, { typical?: number; upper?: number; resultTokens?: number; searchesPerRequest?: number }>; // agent id -> model requests
  guardTypes?: Record<string, number>; // guard step id -> enabled AI Guardrails detection types
}
