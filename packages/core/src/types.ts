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
  | 'constraint-replaced'; // info: a pinned constraint was replaced, lifted or dropped (a newer requirement, or the cap of twelve)

export interface Warning {
  code: WarningCode;
  ids: string[];
  msg: string;
  severity: 'error' | 'warn' | 'info';
  repaired: boolean; // true when a deterministic rule already fixed it
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
  sessionId: string;
  ask: string;
  memory: SessionMemory;
}

/**
 * POST /api/turn response: NDJSON, one event per line. The stream carries every llm.ts TurnEvent (say, op, warn, usage,
 * done, error, each with phase 'main' or 'repair') plus these server events. It ends with 'commit' or 'fatal';
 * a 'summary' may follow 'commit' when older turns were folded into the rolling summary.
 */
export type ServerEvent =
  | { type: 'status'; code: 'fallback' | 'retry' | 'continue' | 'repair' | 'summary'; text: string }
  | { type: 'commit'; memory: SessionMemory; changes: string; warnings: Warning[] } // final repaired state; the browser replaces its memory with it
  | { type: 'summary'; summary: string } // rolling summary after the commit; the browser stores it in memory.summary
  | { type: 'fatal'; code: string; message: string; retryable: boolean }; // the turn failed and memory is unchanged
