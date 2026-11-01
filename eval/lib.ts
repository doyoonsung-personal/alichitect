// Shared pieces of the golden-prompt evaluation: case and base loading, the spend ledger, text and script helpers,
// and the machine-checkable assertions evaluated after every turn.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Catalog, Constraint, Graph, GraphGroup, Op, SessionMemory, Turn, Warning, WarningCode } from '../packages/core/src/types.ts';
import { checkConstraints, ingestGraph, repairGraph } from '../packages/core/src/validate.ts';
import { allowedRegions, avoidedProducts } from '../packages/core/src/constraints.ts';
import { isOpenRegion } from '../packages/core/src/regions.ts';
import { scanResidency } from './residency-scan.ts';
import { createMemory } from '../packages/core/src/prompt.ts';
import type { TurnStats } from '../packages/core/src/llm.ts';

/** The part of TurnStats the assertions read; stored records carry exactly these fields, so they can be rescored offline. */
export type StatsLike = Pick<TurnStats, 'error' | 'ops' | 'warningsBefore' | 'warningsAfter' | 'badLines' | 'doneSeen' | 'finishReason' | 'escapes'> &
  Partial<Pick<TurnStats, 'truncated' | 'finalDone' | 'repair' | 'fixes' | 'rescue'>>;

export const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS_DIR = path.join(EVAL_DIR, 'results');
export const LEDGER = path.join(RESULTS_DIR, 'ledger.jsonl');

// ---------- case schema ----------

export type Lang = 'en' | 'ko' | 'zh';
export type Category = 'pattern' | 'need' | 'trap' | 'edit' | 'multiturn' | 'i18n' | 'adversarial';

/** Checks on one turn. Product lists name catalog ids; text lists are case-insensitive substrings. */
export interface Expect {
  include?: string[][]; // each any-of group needs one product among the final nodes or recs
  exclude?: string[]; // products that must not be in the final graph (nodes or recs)
  excludeRaw?: string[]; // product strings the model must not write, before alias resolution (normalized)
  primaryRec?: string[]; // some rec with fit primary is one of these
  noNodes?: boolean;
  noRecs?: boolean;
  req?: string[][]; // pinned requirements after the turn: each group needs one requirement containing one keyword
  maxOps?: number;
  maxNodes?: number;
  minNodes?: number;
  mention?: string[][]; // say/done/gap text mentions one string of each group
  notMention?: string[]; // no model text (say, label, why, req, done, gap) contains these
  notInLabels?: string[]; // no node or group label contains these
  regions?: { only?: string[]; not?: string[]; min?: number }; // region group labels and ids
  attach?: Array<{ product: string; hosts: string[] }>; // every node of product is a badge on a node of a host product
  zones?: string[][]; // some node of each group spans two or more zones
  edit?: { maxNodeAdds?: number; maxNodeRemoves?: number; maxEdgeRemoves?: number; maxChanged?: number; minChanged?: number; noGrowth?: boolean };
  restored?: string[]; // node or edge ids that must exist after the turn
  noWarn?: WarningCode[]; // codes that must not appear before repair (the model got it right without the validator)
  question?: boolean; // some say asks the user a question
  pathOrder?: boolean; // default: on when the graph has nodes
  noErrors?: boolean; // default true
  noPrices?: boolean; // default true
  attachValid?: boolean; // default true: every attachment (badge) names a valid host before repair
  /** Region ids data and workloads must stay in: the core constraint checker runs on the final graph and the final narration; an error-level finding fails. */
  residency?: string[];
  /** Machine-checkable constraints pinned after the turn (memory.constraints): regions within these ids, avoid groups each named. */
  pins?: { regions?: string[]; avoid?: string[][] };
  noAttach?: string[]; // every node of these products is an ordinary node (no attachTo); at least one exists
  linked?: Array<{ from: string[]; to: string[]; directed?: boolean }>; // an edge joins a node of a `from` product and one of a `to` product (from -> to when directed)
  placement?: boolean; // every vpc and vpc-edge node (not a badge) sits inside a VPC group
  /** Phase 1 asks: the ask ops of the turn (validated, after the per-turn caps). `options` requires 2-4 quick-reply options on every ask. */
  asks?: { min?: number; max?: number; options?: boolean };
  /** The assume ops of the turn. */
  assumes?: { min?: number; max?: number };
  /** Details the user already stated: no ask (text or option) may contain any of these keywords (the model must not re-ask what it was told). */
  notAsking?: string[];
  /** Details the user already stated: no assume (text or alt) may repeat them. */
  notAssuming?: string[];
  /** After the turn memory.assumptions holds nothing that mentions these keywords (a flipped assumption's chip is gone). */
  assumedGone?: string[];
  /** Partial-scope asks: no compute tier (ECS, ACK, ACS, SAE, Function Compute, ECI, ...) is drawn on Alibaba Cloud. */
  noCompute?: boolean;
  /** Another provider's name (AWS, Azure, Google Cloud, GCP) appears only on other-cloud nodes and on external groups. Names the providers to police. */
  providerNames?: string[];
  /** No GPU model other than A10, T4, V100 and P100 appears in any model text (labels, why, say, ask, assume, done). */
  gpuNames?: boolean;
}

/** The compute tier of a design: the products that run the customer's own application code or containers. */
export const COMPUTE_TIER: readonly string[] = ['ecs', 'egs', 'ebm', 'swas', 'ddh', 'ess', 'fc', 'sae', 'ack', 'acs', 'eci', 'ack-serverless', 'ack-dedicated', 'ack-edge', 'edas', 'batch-compute', 'ehpc', 'asm'];

/**
 * Dimensions a design depends on, as phrases that re-ask them. `notAsking: ['dim:region']` fails when an ask (or an option) is
 * about the region, so the check targets the question being asked again and not every mention of a stated entity: "How do you
 * connect AWS to Alibaba Cloud?" does not re-ask which provider the app runs on.
 */
export const ASK_DIMENSIONS: Readonly<Record<string, readonly string[]>> = {
  'dim:exposure': ['public', 'internal', 'internet-facing', 'internet facing', 'intranet', 'external users'],
  'dim:region': ['which region', 'what region', 'where are', 'where is', 'where do you', 'where should', 'which country', 'residency', 'which geography'],
  'dim:scale': ['how many', 'number of users', 'concurrent', 'peak traffic', 'daily users', 'visitors', 'users per', 'expected traffic', 'how large', 'how big'],
  'dim:provider': ['which cloud', 'which provider', 'what cloud', 'which platform', 'where does your app run', 'where does the app run', 'where is the app', 'where is your app', 'where do you run'],
  'dim:workload': ['what kind of app', 'what type of app', 'what will you run', 'what do you plan to run', 'what workload', 'what are you building', 'what is the app'],
};
const expandAskKeys = (keys: readonly string[]): Array<{ key: string; phrases: string[] }> => keys.map((k) => ({ key: k, phrases: k.startsWith('dim:') ? [...(ASK_DIMENSIONS[k] ?? [])] : [k] }));

/** GPU model names the product may not state: only A10, T4, V100 and P100 are allowed in text (research/ai-depth/amendments.md). */
const GPU_DENY = /\b(?:a100|a800|a30|a40|a2|h100|h800|h200|h20|b100|b200|gb200|l20|l40s?|l4|p4|p40|k80|rtx\s?\d{4}|[34]090|mi\d{3}x?)\b/i;

/** Constraints from earlier turns that must still hold (reported as assertion type 'retention'). */
export interface Retain {
  exclude?: string[];
  include?: string[][];
  req?: string[][];
  regions?: { only?: string[]; not?: string[]; min?: number };
  residency?: string[]; // as Expect.residency, reported as type 'residency'
}

export interface EvalTurn {
  ask: string;
  /** Repeat the ask this many times (oversized-input cases), separated by blank lines. */
  askRepeat?: number;
  expect?: Expect;
  retain?: Retain;
}

export interface EvalCase {
  id: string;
  category: Category;
  lang?: Lang;
  of?: string; // the English case this one translates
  title: string;
  base?: string; // eval/bases/<base>.json is the starting memory
  reference: string; // what a strong answer usually contains (for the judge)
  /** History window in exchanges (default 10). A small value with summarize makes the rolling summary carry the early turns. */
  window?: number;
  summarize?: boolean;
  turns: EvalTurn[];
}

export interface BaseFile {
  description: string;
  history?: Turn[];
  requirements?: string[];
  graph: { groups?: unknown[]; nodes?: unknown[]; edges?: unknown[]; recs?: unknown[] };
}

export function askText(t: EvalTurn): string {
  const n = Math.max(1, t.askRepeat ?? 1);
  return Array.from({ length: n }, () => t.ask).join('\n\n');
}

export function loadCases(dir = path.join(EVAL_DIR, 'cases')): EvalCase[] {
  const out: EvalCase[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const j = JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as EvalCase | EvalCase[];
    out.push(...(Array.isArray(j) ? j : [j]));
  }
  const seen = new Set<string>();
  for (const c of out) {
    if (seen.has(c.id)) throw new Error(`duplicate case id ${c.id}`);
    seen.add(c.id);
    if (!c.turns?.length) throw new Error(`case ${c.id} has no turns`);
  }
  return out;
}

/** A base diagram as starting memory: validated and repaired like any untrusted graph. */
export function loadBase(name: string, catalog: Catalog): { memory: SessionMemory; warnings: Warning[] } {
  const b = JSON.parse(readFileSync(path.join(EVAL_DIR, 'bases', `${name}.json`), 'utf8')) as BaseFile;
  const ing = ingestGraph(b.graph, catalog);
  const rep = repairGraph(ing.graph, catalog);
  const m = createMemory(rep.graph);
  m.turns = (b.history ?? []).map((t) => ({ ...t }));
  m.requirements = [...(b.requirements ?? [])];
  return { memory: m, warnings: [...ing.warnings, ...rep.warnings] };
}

// ---------- ledger ----------

export interface LedgerEntry {
  ts: string;
  label: string;
  model: string;
  phase: string;
  costUsd: number;
  estimated?: boolean;
  usage?: unknown;
  case?: string;
}

export function appendLedger(e: LedgerEntry): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  appendFileSync(LEDGER, JSON.stringify(e) + '\n');
}

export function spentUsd(filter?: (e: LedgerEntry) => boolean): number {
  if (!existsSync(LEDGER)) return 0;
  let s = 0;
  for (const ln of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!ln.trim()) continue;
    try {
      const e = JSON.parse(ln) as LedgerEntry;
      if (!filter || filter(e)) s += e.costUsd || 0;
    } catch {
      /* partial line */
    }
  }
  return s;
}

// ---------- text helpers ----------

export interface TurnView {
  ask: string;
  ops: Op[];
  says: string[];
  reqs: string[];
  gaps: Array<{ need: string; note: string }>;
  rawProducts: string[];
  graph: Graph; // after the turn (repaired)
  before: Graph; // before the turn
  requirements: string[]; // pinned after the turn
  constraints?: Constraint[]; // machine-checkable constraints pinned after the turn (memory.constraints)
  assumptions?: Array<{ id: string; text: string; alt?: string }>; // memory.assumptions after the turn (Phase 1 asks; absent in older records)
  questions?: Array<{ id: string; text: string; options?: string[] }>; // memory.questions after the turn
  stats: StatsLike;
  userTexts: string[]; // every user message of the case so far, this one included
}

export function modelTexts(v: TurnView, withAsks = false): string[] {
  const out: string[] = [...v.says, ...v.reqs];
  for (const op of v.ops) {
    if (op.t === 'node' || op.t === 'insert') out.push(op.label, op.why ?? '');
    else if (op.t === 'group') out.push(op.label);
    else if (op.t === 'edge') out.push(op.label ?? '');
    else if (op.t === 'rec') out.push(op.why);
    else if (op.t === 'gap') out.push(op.need, op.note);
    else if (op.t === 'done') out.push(op.summary);
    else if (withAsks && op.t === 'ask') out.push(op.text, ...(op.options ?? []));
    else if (withAsks && op.t === 'assume') out.push(op.text, op.alt ?? '');
  }
  return out.filter(Boolean);
}

export function narration(v: TurnView): string {
  const done = v.ops.filter((o): o is Extract<Op, { t: 'done' }> => o.t === 'done').map((o) => o.summary);
  return [...v.says, ...done, ...v.gaps.map((g) => `${g.need} ${g.note}`)].join('\n');
}

const norm = (s: string): string => s.normalize('NFKC').toLowerCase();
const normProduct = (s: string): string => norm(s).trim().replace(/[\s_]+/g, '-');

/** Catalog names, short labels, ids and ASCII aliases, longest first, for stripping before script counts. */
export function productNamePattern(catalog: Catalog): RegExp {
  const names = new Set<string>();
  for (const e of catalog.entries) for (const s of [e.name, e.short, e.id, ...(e.aliases ?? [])]) if (s && /^[\x20-\x7e]+$/.test(s) && s.length >= 2) names.add(s);
  const esc = [...names].sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?:${esc.join('|')})`, 'gi');
}

export interface ScriptCounts {
  hangul: number;
  han: number;
  kana: number;
  latin: number;
}

export function scriptCounts(text: string): ScriptCounts {
  const c = (re: RegExp): number => (text.match(re) ?? []).length;
  return { hangul: c(/\p{Script=Hangul}/gu), han: c(/\p{Script=Han}/gu), kana: c(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu), latin: c(/\p{Script=Latin}/gu) };
}

/** Share of the expected script among letters, after product names and acronyms are removed. */
export function langShare(text: string, lang: Lang, names: RegExp): { share: number; letters: number; counts: ScriptCounts } {
  const stripped = text.replace(names, ' ').replace(/\b[A-Z0-9][A-Z0-9-]{1,9}\b/g, ' ');
  const counts = scriptCounts(stripped);
  const letters = counts.hangul + counts.han + counts.kana + counts.latin;
  const mine = lang === 'ko' ? counts.hangul : lang === 'zh' ? counts.han : counts.latin;
  return { share: letters ? mine / letters : 1, letters, counts };
}

const MONEY = /(?:US\$|\$|USD\s?|€|£|¥|￥|₩|CNY\s?|RMB\s?)\s?(\d[\d,.]*)|(\d[\d,.]*)\s?(?:USD|US dollars?|dollars?|美元|元|달러|원)/gi;

/** Currency amounts in model text that the user never wrote (prices must come from the catalog, not the model). */
export function inventedAmounts(texts: string[], userTexts: string[]): string[] {
  const user = userTexts.join(' ');
  const userNums = new Set([...user.matchAll(/\d[\d,.]*/g)].map((m) => m[0].replace(/[,.]+$/, '').replace(/,/g, '')));
  const out: string[] = [];
  for (const t of texts) {
    for (const m of t.matchAll(MONEY)) {
      const num = (m[1] ?? m[2] ?? '').replace(/[,.]+$/, '').replace(/,/g, '');
      if (num && !userNums.has(num)) out.push(m[0].trim());
    }
  }
  return out;
}

// ---------- assertions ----------

export interface AssertionResult {
  type: string;
  name: string;
  pass: boolean;
  detail?: string;
}

function productsOf(g: Graph): Set<string> {
  const s = new Set<string>();
  for (const n of Object.values(g.nodes)) s.add(n.product);
  for (const r of g.recs ?? []) s.add(r.product);
  return s;
}

function regionGroups(g: Graph): string[] {
  return Object.values(g.groups)
    .filter((x) => x.kind === 'region')
    .map((x) => norm(`${x.label} ${x.id}`));
}

export interface EditStats {
  nodeAdds: number;
  nodeRemoves: number;
  nodeUpdates: number;
  edgeAdds: number;
  edgeRemoves: number;
}

export function editStats(before: Graph, after: Graph): EditStats {
  const s: EditStats = { nodeAdds: 0, nodeRemoves: 0, nodeUpdates: 0, edgeAdds: 0, edgeRemoves: 0 };
  for (const id of Object.keys(after.nodes)) {
    if (!before.nodes[id]) s.nodeAdds++;
    else if (JSON.stringify(before.nodes[id]) !== JSON.stringify(after.nodes[id])) s.nodeUpdates++;
  }
  for (const id of Object.keys(before.nodes)) if (!after.nodes[id]) s.nodeRemoves++;
  for (const id of Object.keys(after.edges)) if (!before.edges[id]) s.edgeAdds++;
  for (const id of Object.keys(before.edges)) if (!after.edges[id]) s.edgeRemoves++;
  return s;
}

function includeChecks(type: string, groups: string[][], have: Set<string>, out: AssertionResult[]): void {
  for (const grp of groups) {
    const hit = grp.find((p) => have.has(p));
    out.push({ type, name: `include ${grp.join('|')}`, pass: !!hit, detail: hit ? hit : `none of ${grp.join(', ')}` });
  }
}

/**
 * `family:<name>` in an exclude list stands for every catalog entry tagged with that family (CatalogEntry.family), so a
 * "no Kubernetes" case checks ACK, ACS, ACK One, ACK Serverless, ASM and Dify on ACK, not the few ids its author thought of.
 * Without a catalog the token stays as it is and matches nothing.
 */
export function expandFamilies(ids: readonly string[], catalog: Catalog | undefined): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (id.startsWith('family:')) {
      for (const e of catalog?.entries ?? []) if (e.family === id.slice('family:'.length) && !out.includes(e.id)) out.push(e.id);
    } else if (!out.includes(id)) out.push(id);
  }
  return out;
}

function excludeChecks(type: string, ids: string[], have: Set<string>, out: AssertionResult[]): void {
  const bad = ids.filter((p) => have.has(p));
  out.push({ type, name: `exclude ${ids.join('|')}`, pass: !bad.length, detail: bad.length ? `present: ${bad.join(', ')}` : undefined });
}

function reqChecks(type: string, groups: string[][], reqs: string[], out: AssertionResult[]): void {
  const pinned = reqs.map(norm);
  for (const grp of groups) {
    const ok = pinned.some((r) => grp.some((k) => r.includes(norm(k))));
    out.push({ type, name: `req ${grp.join('|')}`, pass: ok, detail: ok ? undefined : `pinned: ${JSON.stringify(reqs)}` });
  }
}

function regionChecks(type: string, r: NonNullable<Expect['regions']>, g: Graph, out: AssertionResult[]): void {
  const labels = regionGroups(g);
  if (r.min !== undefined) out.push({ type, name: `regions >= ${r.min}`, pass: labels.length >= r.min, detail: labels.join(' / ') || 'no region group' });
  if (r.only) {
    const bad = labels.filter((l) => !r.only!.some((k) => l.includes(norm(k))));
    const ok = labels.length > 0 && !bad.length;
    out.push({ type, name: `regions only ${r.only.join('|')}`, pass: ok, detail: ok ? undefined : labels.length ? `outside: ${bad.join(' / ')}` : 'no region group' });
  }
  if (r.not) {
    const bad = labels.filter((l) => r.not!.some((k) => l.includes(norm(k))));
    out.push({ type, name: `regions not ${r.not.join('|')}`, pass: !bad.length, detail: bad.length ? bad.join(' / ') : undefined });
  }
}

/** Say, done and gap text of a list of ops: what the user reads in the console. */
function opTexts(ops: readonly Op[]): string[] {
  const out: string[] = [];
  for (const o of ops) {
    if (o.t === 'say') out.push(o.text);
    else if (o.t === 'done') out.push(o.summary);
    else if (o.t === 'gap') out.push(`${o.need}: ${o.note}`);
  }
  return out.filter(Boolean);
}

/**
 * The narration a residency check reads: the main stream's say, done and gap text, plus the follow-up turn's. When the
 * product's own constraint check sent the turn to the repair turn (findings with constraint-region) and the repair turn
 * wrote a say line, the main stream's text was reported and corrected in the console: only the follow-up text is read,
 * as llm.ts does, and the corrected text is returned separately so it can be counted.
 */
export function residencyNarration(v: Pick<TurnView, 'ops' | 'stats'>): { texts: string[]; corrected: string[] } {
  const n = Math.max(0, Math.min(v.stats.ops ?? v.ops.length, v.ops.length));
  const main = opTexts(v.ops.slice(0, n));
  const follow = opTexts(v.ops.slice(n));
  const rep = v.stats.repair;
  const corrected = !!rep && rep.kind !== 'continue' && (rep.findings ?? []).some((w) => w.code === 'constraint-region') && v.ops.slice(n).some((o) => o.t === 'say');
  return corrected ? { texts: follow, corrected: main } : { texts: [...main, ...follow], corrected: [] };
}

/** Placeholder for residency checks without a catalog: the region branch of checkConstraints never reads it. */
const NO_CATALOG: Catalog = { version: '', entries: [], byId: new Map(), resolve: () => ({}), promptRows: () => '' };

function residencyCheck(regions: string[], v: TurnView, catalog: Catalog | undefined, out: AssertionResult[]): void {
  const { texts, corrected } = residencyNarration(v);
  // Users and devices sit outside the cloud: a label such as "Australian customers" says where they are, not where data
  // or workloads go, so findings about client nodes alone are dropped.
  const client = (id: string): boolean => {
    const n = Object.prototype.hasOwnProperty.call(v.graph.nodes, id) ? v.graph.nodes[id] : undefined;
    return !!n && catalog?.byId.get(n.product)?.lane === 'clients';
  };
  const ws = checkConstraints(v.graph, texts, [{ text: 'eval residency', regions }], catalog ?? NO_CATALOG).filter((w) => !(w.ids.length > 0 && w.ids.every(client)));
  const errs = ws.filter((w) => w.severity === 'error');
  const warns = ws.filter((w) => w.severity === 'warn');
  const parts: string[] = [];
  if (errs.length) parts.push(errs.map((w) => w.msg).join('; '));
  if (warns.length) parts.push(`warn (not failed): ${warns.map((w) => w.msg).join('; ')}`);
  if (corrected.length) parts.push('main-stream narration corrected by the repair turn');
  out.push({ type: 'residency', name: `residency ${regions.join('|')}`, pass: !errs.length, detail: parts.length ? parts.join(' | ').slice(0, 600) : undefined });
  // An independent second opinion (residency-scan.ts shares no code or table with the product's checker). It reads the same
  // narration and the final diagram; nodes for users and devices are dropped as above.
  const scan = scanResidency(regions, v.graph, texts, client);
  out.push({
    type: 'residencyScan',
    name: `residency scan ${regions.join('|')}`,
    pass: !scan.length,
    detail: scan.length ? scan.map((h) => `${h.where} ${h.ids.join(',')}: ${h.places.join('/')} in "${h.text}"`).join('; ').slice(0, 600) : undefined,
  });
}

function insideVpc(g: Graph, groupId: string | null): boolean {
  let cur = groupId;
  for (let i = 0; cur !== null && i < 32; i++) {
    const grp: GraphGroup | undefined = Object.prototype.hasOwnProperty.call(g.groups, cur) ? g.groups[cur] : undefined;
    if (!grp) return false;
    if (grp.kind === 'vpc') return true;
    cur = grp.parent;
  }
  return false;
}

/** Every assertion for one turn: the case's expectations, retention checks and the defaults that apply to all turns. */
export function evaluateTurn(v: TurnView, turn: EvalTurn, lang: Lang, names: RegExp, catalog?: Catalog): AssertionResult[] {
  const e = turn.expect ?? {};
  const out: AssertionResult[] = [];
  const g = v.graph;
  const have = productsOf(g);
  const nodes = Object.values(g.nodes);
  const after = v.stats.warningsAfter;
  if (v.stats.error && v.stats.ops === 0) {
    return [{ type: 'api', name: 'turn completed', pass: false, detail: `${v.stats.error.code}: ${v.stats.error.message}` }];
  }
  if (e.include) includeChecks('include', e.include, have, out);
  if (e.exclude) excludeChecks('exclude', expandFamilies(e.exclude, catalog), have, out);
  if (e.excludeRaw) {
    const raw = v.rawProducts.map(normProduct);
    const bad = e.excludeRaw.map(normProduct).filter((x) => raw.includes(x));
    out.push({ type: 'exclude', name: `raw ids not ${e.excludeRaw.join('|')}`, pass: !bad.length, detail: bad.length ? `model wrote ${bad.join(', ')}` : undefined });
  }
  if (e.primaryRec) {
    const prim = (g.recs ?? []).filter((r) => r.fit === 'primary').map((r) => r.product);
    const ok = prim.some((p) => e.primaryRec!.includes(p));
    out.push({ type: 'primaryRec', name: `primary rec ${e.primaryRec.join('|')}`, pass: ok, detail: ok ? undefined : `primary: ${prim.join(', ') || 'none'}; recs: ${(g.recs ?? []).map((r) => r.product).join(', ') || 'none'}` });
  }
  if (e.noNodes) out.push({ type: 'size', name: 'no nodes', pass: nodes.length === 0, detail: nodes.length ? `${nodes.length} nodes` : undefined });
  if (e.noRecs) out.push({ type: 'size', name: 'no recs', pass: !(g.recs ?? []).length, detail: (g.recs ?? []).map((r) => r.product).join(', ') || undefined });
  if (e.req) reqChecks('req', e.req, v.requirements, out);
  if (e.maxOps !== undefined) out.push({ type: 'size', name: `ops <= ${e.maxOps}`, pass: v.ops.length <= e.maxOps, detail: `${v.ops.length} ops` });
  if (e.maxNodes !== undefined) out.push({ type: 'size', name: `nodes <= ${e.maxNodes}`, pass: nodes.length <= e.maxNodes, detail: `${nodes.length} nodes` });
  if (e.minNodes !== undefined) out.push({ type: 'size', name: `nodes >= ${e.minNodes}`, pass: nodes.length >= e.minNodes, detail: `${nodes.length} nodes` });
  if (e.mention) {
    const said = norm(narration(v));
    for (const grp of e.mention) {
      const ok = grp.some((k) => said.includes(norm(k)));
      out.push({ type: 'mention', name: `mentions ${grp.join('|')}`, pass: ok, detail: ok ? undefined : said.slice(0, 160) });
    }
  }
  if (e.notMention) {
    const texts = modelTexts(v, true).map(norm);
    const bad = e.notMention.filter((k) => texts.some((t) => t.includes(norm(k))));
    out.push({ type: 'notMention', name: `never mentions ${e.notMention.join('|')}`, pass: !bad.length, detail: bad.length ? `mentions ${bad.join(', ')}` : undefined });
  }
  if (e.notInLabels) {
    const labels = [...nodes.map((n) => n.label), ...Object.values(g.groups).map((x) => x.label)].map(norm);
    const bad = e.notInLabels.filter((k) => labels.some((l) => new RegExp(`(^|[^a-z0-9])${norm(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(l)));
    out.push({ type: 'notMention', name: `labels never name ${e.notInLabels.join('|')}`, pass: !bad.length, detail: bad.length ? bad.join(', ') : undefined });
  }
  if (e.regions) regionChecks('region', e.regions, g, out);
  if (e.attach) {
    for (const a of e.attach) {
      const list = nodes.filter((n) => n.product === a.product);
      const bad = list.filter((n) => !n.attachTo || !g.nodes[n.attachTo] || !a.hosts.includes(g.nodes[n.attachTo].product));
      out.push({ type: 'attach', name: `${a.product} badge on ${a.hosts.join('|')}`, pass: list.length > 0 && !bad.length, detail: !list.length ? `no ${a.product} node` : bad.length ? bad.map((n) => `${n.id} attachTo ${n.attachTo ?? 'none'}`).join(', ') : undefined });
    }
  }
  if (e.zones) {
    for (const grp of e.zones) {
      const ok = nodes.some((n) => grp.includes(n.product) && (n.zones ?? []).length >= 2);
      out.push({ type: 'zones', name: `multi-AZ ${grp.join('|')}`, pass: ok });
    }
  }
  if (e.edit) {
    const s = editStats(v.before, g);
    const changed = s.nodeAdds + s.nodeRemoves + s.nodeUpdates;
    const ok =
      (e.edit.maxNodeAdds === undefined || s.nodeAdds <= e.edit.maxNodeAdds) &&
      (e.edit.maxNodeRemoves === undefined || s.nodeRemoves <= e.edit.maxNodeRemoves) &&
      (e.edit.maxEdgeRemoves === undefined || s.edgeRemoves <= e.edit.maxEdgeRemoves) &&
      (e.edit.maxChanged === undefined || changed <= e.edit.maxChanged) &&
      (e.edit.minChanged === undefined || changed + s.edgeAdds + s.edgeRemoves >= e.edit.minChanged) &&
      (!e.edit.noGrowth || Object.keys(g.nodes).length <= Object.keys(v.before.nodes).length);
    out.push({ type: 'editMinimal', name: `edit ${JSON.stringify(e.edit)}`, pass: ok, detail: JSON.stringify(s) });
  }
  if (e.restored) {
    const missing = e.restored.filter((id) => !g.nodes[id] && !g.edges[id]);
    out.push({ type: 'restore', name: `restored ${e.restored.join(', ')}`, pass: !missing.length, detail: missing.length ? `missing ${missing.join(', ')}` : undefined });
  }
  if (e.noWarn) {
    const seen = v.stats.warningsBefore.filter((w) => e.noWarn!.includes(w.code));
    out.push({ type: 'noWarn', name: `no ${e.noWarn.join('|')} before repair`, pass: !seen.length, detail: seen.length ? seen.map((w) => w.msg).join('; ').slice(0, 200) : undefined });
  }
  if (e.question) {
    const askOps = v.ops.filter((o) => o.t === 'ask').length;
    out.push({ type: 'question', name: 'asks a question', pass: askOps > 0 || v.says.some((s) => /[?？]/.test(s)), detail: askOps ? `${askOps} ask op(s)` : undefined });
  }
  const askOps = v.ops.filter((o): o is Extract<Op, { t: 'ask' }> => o.t === 'ask');
  const assumeOps = v.ops.filter((o): o is Extract<Op, { t: 'assume' }> => o.t === 'assume');
  const askBrief = askOps.map((a) => `"${a.text}" [${(a.options ?? []).join(' / ')}]`).join('; ').slice(0, 300);
  if (e.asks) {
    const a = e.asks;
    const n = askOps.length;
    const okN = (a.min === undefined || n >= a.min) && (a.max === undefined || n <= a.max);
    out.push({ type: 'asks', name: `asks ${a.min ?? 0}-${a.max ?? 'any'}`, pass: okN, detail: `${n} ask op(s): ${askBrief}` });
    if (a.options) {
      const bad = askOps.filter((x) => !x.options || x.options.length < 2 || x.options.length > 4);
      out.push({ type: 'askOptions', name: 'every ask has 2-4 options', pass: !bad.length && (n > 0 || !a.min), detail: n === 0 && a.min ? 'no ask op' : bad.length ? `without options: ${bad.map((x) => x.id).join(', ')}` : undefined });
    }
  }
  if (e.assumes) {
    const a = e.assumes;
    const n = assumeOps.length;
    const ok = (a.min === undefined || n >= a.min) && (a.max === undefined || n <= a.max);
    out.push({ type: 'assumes', name: `assumes ${a.min ?? 0}-${a.max ?? 'any'}`, pass: ok, detail: `${n} assume op(s): ${assumeOps.map((x) => x.text).join('; ').slice(0, 240)}` });
  }
  if (e.notAsking) {
    const texts = askOps.flatMap((a) => [a.text, ...(a.options ?? [])]).map(norm);
    const bad = expandAskKeys(e.notAsking).filter((x) => x.phrases.some((p) => texts.some((t) => t.includes(norm(p))))).map((x) => x.key);
    out.push({ type: 'reask', name: `asks never re-ask ${e.notAsking.join('|')}`, pass: !bad.length, detail: bad.length ? `asks ${bad.join(', ')}: ${askBrief}` : undefined });
  }
  if (e.notAssuming) {
    const texts = assumeOps.flatMap((a) => [a.text, a.alt ?? '']).map(norm);
    const bad = e.notAssuming.filter((k) => texts.some((t) => t.includes(norm(k))));
    out.push({ type: 'reask', name: `assumes never repeat ${e.notAssuming.join('|')}`, pass: !bad.length, detail: bad.length ? `assumes ${bad.join(', ')}: ${assumeOps.map((x) => x.text).join('; ').slice(0, 200)}` : undefined });
  }
  if (e.assumedGone) {
    const chips = (v.assumptions ?? []).flatMap((a) => [a.text, a.alt ?? '']).map(norm);
    const bad = e.assumedGone.filter((k) => chips.some((t) => t.includes(norm(k))));
    out.push({ type: 'chips', name: `no assumption chip mentions ${e.assumedGone.join('|')}`, pass: !bad.length, detail: bad.length ? `chips: ${(v.assumptions ?? []).map((a) => a.text).join('; ').slice(0, 200)}` : undefined });
  }
  if (e.noCompute) {
    const bad = nodes.filter((n) => COMPUTE_TIER.includes(n.product));
    out.push({ type: 'scope', name: 'no compute tier drawn', pass: !bad.length, detail: bad.length ? `compute: ${bad.map((n) => `${n.id} (${n.product})`).join(', ')}` : undefined });
  }
  if (e.providerNames) {
    const names = e.providerNames.map(norm);
    const hasName = (s: string): boolean => names.some((k) => new RegExp('(^|[^a-z0-9])' + k.replace(/\s+/g, '\\s+') + '([^a-z0-9]|$)').test(norm(s)));
    const badNodes = nodes.filter((n) => hasName(n.label) && n.product !== 'other-cloud');
    const badGroups = Object.values(g.groups).filter((x) => hasName(x.label) && x.kind !== 'external');
    const bad = [...badNodes.map((n) => `node ${n.id} (${n.product}) "${n.label}"`), ...badGroups.map((x) => `group ${x.id} (${x.kind}) "${x.label}"`)];
    out.push({ type: 'scope', name: `provider names only on other-cloud nodes and external groups`, pass: !bad.length, detail: bad.length ? bad.join('; ').slice(0, 300) : undefined });
  }
  if (e.gpuNames) {
    const hits = modelTexts(v, true).filter((t) => GPU_DENY.test(t));
    out.push({ type: 'gpu', name: 'no GPU model outside A10, T4, V100, P100', pass: !hits.length, detail: hits.length ? hits.map((t) => t.slice(0, 100)).join(' | ').slice(0, 300) : undefined });
  }
  if (e.residency) residencyCheck(e.residency, v, catalog, out);
  if (e.pins) {
    const cs = v.constraints ?? [];
    const pinnedText = cs.length ? JSON.stringify(cs).slice(0, 240) : 'no machine-checkable constraint pinned';
    if (e.pins.regions) {
      const allowed = allowedRegions(cs);
      const ok = !!allowed && allowed.length > 0 && allowed.every((r) => e.pins!.regions!.includes(r));
      out.push({ type: 'pins', name: `pinned regions within ${e.pins.regions.join('|')}`, pass: ok, detail: ok ? `allowed ${allowed!.join(', ')}` : pinnedText });
    }
    for (const grp of e.pins.avoid ?? []) {
      const avoided = avoidedProducts(cs);
      const hit = grp.find((p) => avoided.has(p));
      out.push({ type: 'pins', name: `pinned avoid ${grp.join('|')}`, pass: !!hit, detail: hit ? `avoid ${[...avoided].join(', ')}` : pinnedText });
    }
  }
  if (e.noAttach) {
    for (const p of e.noAttach) {
      const list = nodes.filter((n) => n.product === p);
      const bad = list.filter((n) => n.attachTo);
      out.push({ type: 'attach', name: `${p} is an ordinary node`, pass: list.length > 0 && !bad.length, detail: !list.length ? `no ${p} node` : bad.length ? bad.map((n) => `${n.id} attachTo ${n.attachTo}`).join(', ') : undefined });
    }
  }
  if (e.linked) {
    const prod = (id: string): string | undefined => (Object.prototype.hasOwnProperty.call(g.nodes, id) ? g.nodes[id].product : undefined);
    for (const l of e.linked) {
      const hit = Object.values(g.edges).find((x) => {
        const a = prod(x.from);
        const b = prod(x.to);
        if (!a || !b) return false;
        return (l.from.includes(a) && l.to.includes(b)) || (!l.directed && l.from.includes(b) && l.to.includes(a));
      });
      out.push({ type: 'linked', name: `edge ${l.from.join('|')} ${l.directed ? '->' : '-'} ${l.to.join('|')}`, pass: !!hit, detail: hit ? hit.id : `edges: ${Object.values(g.edges).map((x) => `${x.from}->${x.to}`).join(', ').slice(0, 200)}` });
    }
  }
  if (e.placement) {
    if (!catalog) out.push({ type: 'placement', name: 'vpc nodes inside a VPC group', pass: false, detail: 'no catalog given' });
    else {
      const bad = nodes.filter((n) => {
        const scope = catalog.byId.get(n.product)?.scope;
        return (scope === 'vpc' || scope === 'vpc-edge') && !n.attachTo && !insideVpc(g, n.group);
      });
      out.push({ type: 'placement', name: 'vpc nodes inside a VPC group', pass: !bad.length, detail: bad.length ? `outside a VPC: ${bad.map((n) => `${n.id} (${n.product}) in ${n.group ?? 'root'}`).join(', ')}` : undefined });
    }
  }

  // retention of earlier constraints
  if (turn.retain) {
    const r = turn.retain;
    if (r.exclude) excludeChecks('retention', expandFamilies(r.exclude, catalog), have, out);
    if (r.include) includeChecks('retention', r.include, have, out);
    if (r.req) reqChecks('retention', r.req, v.requirements, out);
    if (r.regions) regionChecks('retention', r.regions, g, out);
    if (r.residency && !e.residency) residencyCheck(r.residency, v, catalog, out);
  }

  // defaults on every turn
  if (e.noErrors !== false) {
    const errs = after.filter((w) => w.severity === 'error');
    out.push({ type: 'noErrors', name: 'no error-level warnings after repair', pass: !errs.length, detail: errs.length ? errs.map((w) => `${w.code}: ${w.msg}`).join('; ').slice(0, 240) : undefined });
  }
  const wantPath = e.pathOrder ?? nodes.length > 1;
  if (wantPath) {
    const po = after.filter((w) => w.code === 'path-order' && w.severity !== 'info');
    out.push({ type: 'pathOrder', name: 'clean path order after repair', pass: !po.length, detail: po.length ? po.map((w) => w.msg).join('; ').slice(0, 240) : undefined });
  }
  if (e.attachValid !== false) {
    // The model attached a badge to a node that cannot host it (Auto Scaling on SAE or ACK, an unknown host), judged on the
    // model's own output. Since Phase 1 one case is repaired correctly: a product that cannot attach at all (dify-on-ack on
    // its ACK node) becomes an ordinary node with an edge from the named host (fix code attach-invalid), so the diagram the
    // user sees is right and it passes, with a note. A badge the repair could only remove (Auto Scaling on SAE) still fails.
    const repairedIntoEdge = new Set((v.stats.fixes ?? []).filter((f) => f.code === 'attach-invalid').map((f) => f.ids[0]));
    const seen = v.stats.warningsBefore.filter((w) => w.code === 'attach-host-missing' && w.severity !== 'info');
    const bad = seen.filter((w) => !repairedIntoEdge.has(w.ids[0]));
    const fixed = seen.length - bad.length;
    out.push({
      type: 'attachValid',
      name: 'every attachment names a valid host',
      pass: !bad.length,
      detail: bad.length ? bad.map((w) => w.msg).join('; ').slice(0, 240) : fixed ? `${fixed} invalid attachment(s) repaired into an edge (attach-invalid)` : undefined,
    });
  }
  // A main stream cut off before its done line (watchdog, network, or the model stopping early) and completed by the
  // continuation turn passes here; summarize counts those rescued turns separately.
  const rescued = !v.stats.doneSeen && !!v.stats.truncated && !!v.stats.finalDone;
  // A content-filter cut leaves the half-written line it interrupted, which counts as one unparseable line of the main
  // stream. When the Claude backup continued that reply and finished it (rescue kind continue, ok), that fragment is the
  // cut, not a format failure of the model: it is the one bad line the rescue is allowed, and the turn counts as rescued.
  const filterRescued = rescued && v.stats.rescue?.kind === 'continue' && v.stats.rescue.ok === true && v.stats.rescue.reason === 'content-filtered';
  const allowedBad = filterRescued ? 1 : 0;
  out.push({
    type: 'format',
    name: 'NDJSON only, ends with done',
    pass: v.stats.badLines <= allowedBad && (v.stats.doneSeen || rescued),
    detail: `bad ${v.stats.badLines}, done ${v.stats.doneSeen}, finish ${v.stats.finishReason}${rescued ? ', cut off and rescued by the continuation turn' : ''}${filterRescued && v.stats.badLines > 0 ? `, ${Math.min(v.stats.badLines, allowedBad)} of them the fragment line the content-filter cut left` : ''}`,
  });
  out.push({ type: 'escapes', name: 'no \\u escapes', pass: v.stats.escapes === 0, detail: v.stats.escapes ? `${v.stats.escapes} escapes` : undefined });
  if (e.noPrices !== false) {
    const inv = inventedAmounts(modelTexts(v), v.userTexts);
    out.push({ type: 'noPrices', name: 'no invented prices', pass: !inv.length, detail: inv.length ? inv.join(', ') : undefined });
  }
  const sayText = v.says.join('\n');
  if (sayText.trim()) {
    const s = langShare(sayText, lang, names);
    const ok = lang === 'en' ? s.share >= 0.95 : s.share >= 0.5 && s.letters >= 4;
    out.push({ type: 'sayLang', name: `say text in ${lang}`, pass: ok, detail: `share ${s.share.toFixed(2)} of ${s.letters} letters ${JSON.stringify(s.counts)}` });
  } else {
    out.push({ type: 'sayLang', name: `say text in ${lang}`, pass: false, detail: 'no say op' });
  }
  if (lang !== 'en' && askOps.length) {
    const s = langShare(askOps.map((a) => [a.text, ...(a.options ?? [])].join('\n')).join('\n'), lang, names);
    out.push({ type: 'askLang', name: `ask text in ${lang}`, pass: s.share >= 0.5, detail: `share ${s.share.toFixed(2)} of ${s.letters} letters` });
  }
  if (lang !== 'en') {
    const why = v.ops.flatMap((o) => (o.t === 'node' || o.t === 'insert' ? [o.why ?? ''] : o.t === 'rec' ? [o.why] : [])).join('\n');
    if (why.trim()) {
      const s = langShare(why, lang, names);
      out.push({ type: 'whyLang', name: `why text in ${lang}`, pass: s.share >= 0.5, detail: `share ${s.share.toFixed(2)} of ${s.letters} letters` });
    }
  }
  return out;
}

// ---------- case checks ----------

const EXPECT_KEYS: ReadonlySet<string> = new Set([
  'asks', 'assumes', 'notAsking', 'notAssuming', 'assumedGone', 'noCompute', 'providerNames', 'gpuNames',
  'include', 'exclude', 'excludeRaw', 'primaryRec', 'noNodes', 'noRecs', 'req', 'maxOps', 'maxNodes', 'minNodes', 'mention', 'notMention', 'notInLabels',
  'regions', 'attach', 'zones', 'edit', 'restored', 'noWarn', 'question', 'pathOrder', 'noErrors', 'noPrices', 'attachValid',
  'residency', 'pins', 'noAttach', 'linked', 'placement',
]);
const RETAIN_KEYS: ReadonlySet<string> = new Set(['exclude', 'include', 'req', 'regions', 'residency']);
const EDIT_KEYS: ReadonlySet<string> = new Set(['maxNodeAdds', 'maxNodeRemoves', 'maxEdgeRemoves', 'maxChanged', 'minChanged', 'noGrowth']);
const CASE_KEYS: ReadonlySet<string> = new Set(['id', 'category', 'lang', 'of', 'title', 'base', 'reference', 'window', 'summarize', 'turns']);
const TURN_KEYS: ReadonlySet<string> = new Set(['ask', 'askRepeat', 'expect', 'retain']);
const CATEGORIES: ReadonlySet<string> = new Set(['pattern', 'need', 'trap', 'edit', 'multiturn', 'i18n', 'adversarial']);
const WARNING_CODES: ReadonlySet<string> = new Set([
  'bad-json', 'bad-op', 'unknown-product', 'alias-resolved', 'retired-product', 'china-only', 'restricted', 'dangling-edge', 'missing-group', 'containment',
  'dns-in-path', 'path-order', 'orphan-node', 'duplicate-id', 'cap-exceeded', 'attach-host-missing', 'unknown-id', 'zone-replicas', 'attach-inline',
  'attach-invalid', 'constraint-region', 'constraint-avoid', 'constraint-replaced',
]);

/**
 * Structural problems in a case file set: unknown keys (typos silently disable an assertion), product ids that are not in
 * the catalog, missing bases, empty keyword groups, wrong categories, dangling `of` links and duplicate asks.
 * Returns human-readable problems; an empty list means the cases are well formed.
 */
export function checkCases(cases: EvalCase[], catalog: Catalog): string[] {
  const problems: string[] = [];
  const ids = new Set(cases.map((c) => c.id));
  const bad = (c: EvalCase, msg: string): void => void problems.push(`${c.id}: ${msg}`);
  const unknownKeys = (c: EvalCase, where: string, o: object, allowed: ReadonlySet<string>): void => {
    for (const k of Object.keys(o)) if (!allowed.has(k)) bad(c, `${where} has unknown key '${k}'`);
  };
  const products = (c: EvalCase, where: string, list: unknown): void => {
    if (!Array.isArray(list)) return bad(c, `${where} must be an array`);
    for (const p of list) {
      const family = typeof p === 'string' && p.startsWith('family:') ? p.slice('family:'.length) : null;
      if (family !== null && catalog.entries.some((e) => e.family === family)) continue;
      if (typeof p !== 'string' || !catalog.byId.has(p)) bad(c, `${where}: '${String(p)}' is not a catalog id`);
    }
  };
  const groups = (c: EvalCase, where: string, list: unknown, ids_ = true): void => {
    if (!Array.isArray(list)) return bad(c, `${where} must be an array of arrays`);
    for (const g of list) {
      if (!Array.isArray(g) || !g.length) bad(c, `${where} has an empty or non-array group`);
      else if (ids_) products(c, where, g);
      else for (const k of g) if (typeof k !== 'string' || !k.trim()) bad(c, `${where} has an empty keyword`);
    }
  };
  const regions = (c: EvalCase, where: string, r: NonNullable<Expect['regions']>): void => {
    unknownKeys(c, where, r, new Set(['only', 'not', 'min']));
    for (const k of [...(r.only ?? []), ...(r.not ?? [])]) if (typeof k !== 'string' || !k.trim()) bad(c, `${where} has an empty region keyword`);
  };
  const regionIds = (c: EvalCase, where: string, list: unknown): void => {
    if (!Array.isArray(list) || !list.length) return bad(c, `${where} must be a non-empty array of region ids`);
    for (const r of list) if (typeof r !== 'string' || !isOpenRegion(r)) bad(c, `${where}: '${String(r)}' is not an open region id`);
  };
  const seenAsk = new Map<string, string>();
  for (const c of cases) {
    unknownKeys(c, 'case', c, CASE_KEYS);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(c.id)) bad(c, 'id must be kebab-case');
    if (!CATEGORIES.has(c.category)) bad(c, `unknown category '${c.category}'`);
    if (c.lang && !['en', 'ko', 'zh'].includes(c.lang)) bad(c, `unknown lang '${c.lang}'`);
    if (c.category === 'i18n' && (!c.lang || c.lang === 'en')) bad(c, 'i18n cases need lang ko or zh');
    if (c.of && !ids.has(c.of)) bad(c, `'of' points to a missing case '${c.of}'`);
    if (!c.title?.trim()) bad(c, 'missing title');
    if (!c.reference?.trim()) bad(c, 'missing reference');
    if (c.base && !existsSync(path.join(EVAL_DIR, 'bases', `${c.base}.json`))) bad(c, `missing base '${c.base}'`);
    if (c.window !== undefined && !(Number.isInteger(c.window) && c.window >= 0)) bad(c, 'window must be a non-negative integer');
    c.turns.forEach((t, i) => {
      const w = `turn ${i + 1}`;
      unknownKeys(c, w, t, TURN_KEYS);
      if (!t.ask?.trim()) bad(c, `${w} has no ask`);
      else if (!c.lang || c.lang === 'en') {
        const key = `${c.base ?? ''}|${t.ask.trim()}`;
        if (seenAsk.has(key) && !c.of) bad(c, `${w} repeats the ask of ${seenAsk.get(key)}`);
        seenAsk.set(key, c.id);
      }
      const e = t.expect;
      if (e) {
        unknownKeys(c, `${w} expect`, e, EXPECT_KEYS);
        if (e.include) groups(c, `${w} include`, e.include);
        if (e.exclude) products(c, `${w} exclude`, e.exclude);
        if (e.primaryRec) products(c, `${w} primaryRec`, e.primaryRec);
        if (e.req) groups(c, `${w} req`, e.req, false);
        if (e.mention) groups(c, `${w} mention`, e.mention, false);
        if (e.zones) groups(c, `${w} zones`, e.zones);
        if (e.attach) {
          for (const a of e.attach) {
            products(c, `${w} attach`, [a.product, ...a.hosts]);
          }
        }
        if (e.regions) regions(c, `${w} regions`, e.regions);
        if (e.edit) unknownKeys(c, `${w} edit`, e.edit, EDIT_KEYS);
        if (e.noWarn) for (const code of e.noWarn) if (!WARNING_CODES.has(code)) bad(c, `${w} noWarn: unknown warning code '${code}'`);
        if (e.residency) regionIds(c, `${w} residency`, e.residency);
        if (e.pins) {
          unknownKeys(c, `${w} pins`, e.pins, new Set(['regions', 'avoid']));
          if (e.pins.regions) regionIds(c, `${w} pins.regions`, e.pins.regions);
          if (e.pins.avoid) groups(c, `${w} pins.avoid`, e.pins.avoid);
          if (!e.pins.regions && !e.pins.avoid) bad(c, `${w} pins needs regions or avoid`);
        }
        if (e.noAttach) products(c, `${w} noAttach`, e.noAttach);
        if (e.linked) {
          if (!Array.isArray(e.linked)) bad(c, `${w} linked must be an array`);
          else
            for (const l of e.linked) {
              unknownKeys(c, `${w} linked`, l, new Set(['from', 'to', 'directed']));
              products(c, `${w} linked.from`, l.from);
              products(c, `${w} linked.to`, l.to);
            }
        }
        if (e.placement !== undefined && typeof e.placement !== 'boolean') bad(c, `${w} placement must be a boolean`);
        for (const [k, o] of [['asks', e.asks], ['assumes', e.assumes]] as const) {
          if (!o) continue;
          unknownKeys(c, `${w} ${k}`, o, new Set(k === 'asks' ? ['min', 'max', 'options'] : ['min', 'max']));
          for (const f of ['min', 'max'] as const) if (o[f] !== undefined && !(Number.isInteger(o[f]) && o[f]! >= 0)) bad(c, `${w} ${k}.${f} must be a non-negative integer`);
        }
        for (const [k, list] of [['notAsking', e.notAsking], ['assumedGone', e.assumedGone], ['notAssuming', e.notAssuming], ['providerNames', e.providerNames]] as const) {
          if (list === undefined) continue;
          if (!Array.isArray(list) || !list.length || list.some((x) => typeof x !== 'string' || !x.trim())) bad(c, `${w} ${k} must be a non-empty array of keywords`);
          else for (const x of list) if (x.startsWith('dim:') && !ASK_DIMENSIONS[x]) bad(c, `${w} ${k}: unknown dimension '${x}'`);
        }
        if (e.noNodes && e.noCompute) bad(c, `${w} noNodes with noCompute is redundant`);
        if (e.noNodes && (e.minNodes || e.include?.some((g) => g.some((p) => !['users'].includes(p))))) bad(c, `${w} asks for no nodes and for nodes at once`);
        for (const k of ['maxOps', 'maxNodes', 'minNodes'] as const) if (e[k] !== undefined && !(Number.isInteger(e[k]) && e[k]! >= 0)) bad(c, `${w} ${k} must be a non-negative integer`);
      }
      const r = t.retain;
      if (r) {
        unknownKeys(c, `${w} retain`, r, RETAIN_KEYS);
        if (r.exclude) products(c, `${w} retain.exclude`, r.exclude);
        if (r.include) groups(c, `${w} retain.include`, r.include);
        if (r.req) groups(c, `${w} retain.req`, r.req, false);
        if (r.regions) regions(c, `${w} retain.regions`, r.regions);
        if (r.residency) regionIds(c, `${w} retain.residency`, r.residency);
        if (i === 0) bad(c, `${w}: retain on the first turn has nothing to retain`);
      }
    });
  }
  return problems;
}

/** A case with constraints to keep across or within turns (residency, an avoided product, a budget): every run is judged. */
export function isConstraintCase(c: EvalCase): boolean {
  return c.turns.some((t) => !!t.retain || !!t.expect?.req || !!t.expect?.residency || !!t.expect?.pins);
}

// ---------- stats helpers ----------

export function percentile(xs: number[], p: number): number | null {
  const a = xs.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const i = (a.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(a[lo] + (a[hi] - a[lo]) * (i - lo));
}

export function countBy<T>(xs: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) {
    const k = key(x);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}
