// Shared pieces of the golden-prompt evaluation: case and base loading, the spend ledger, text and script helpers,
// and the machine-checkable assertions evaluated after every turn.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Catalog, Graph, Op, SessionMemory, Turn, Warning, WarningCode } from '../packages/core/src/types.ts';
import { ingestGraph, repairGraph } from '../packages/core/src/validate.ts';
import { createMemory } from '../packages/core/src/prompt.ts';
import type { TurnStats } from '../packages/core/src/llm.ts';

/** The part of TurnStats the assertions read; stored records carry exactly these fields, so they can be rescored offline. */
export type StatsLike = Pick<TurnStats, 'error' | 'ops' | 'warningsBefore' | 'warningsAfter' | 'badLines' | 'doneSeen' | 'finishReason' | 'escapes'> &
  Partial<Pick<TurnStats, 'truncated' | 'finalDone'>>;

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
}

/** Constraints from earlier turns that must still hold (reported as assertion type 'retention'). */
export interface Retain {
  exclude?: string[];
  include?: string[][];
  req?: string[][];
  regions?: { only?: string[]; not?: string[]; min?: number };
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
  stats: StatsLike;
  userTexts: string[]; // every user message of the case so far, this one included
}

export function modelTexts(v: TurnView): string[] {
  const out: string[] = [...v.says, ...v.reqs];
  for (const op of v.ops) {
    if (op.t === 'node' || op.t === 'insert') out.push(op.label, op.why ?? '');
    else if (op.t === 'group') out.push(op.label);
    else if (op.t === 'edge') out.push(op.label ?? '');
    else if (op.t === 'rec') out.push(op.why);
    else if (op.t === 'gap') out.push(op.need, op.note);
    else if (op.t === 'done') out.push(op.summary);
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

/** Every assertion for one turn: the case's expectations, retention checks and the defaults that apply to all turns. */
export function evaluateTurn(v: TurnView, turn: EvalTurn, lang: Lang, names: RegExp): AssertionResult[] {
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
  if (e.exclude) excludeChecks('exclude', e.exclude, have, out);
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
    const texts = modelTexts(v).map(norm);
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
  if (e.question) out.push({ type: 'question', name: 'asks a question', pass: v.says.some((s) => /[?？]/.test(s)) });

  // retention of earlier constraints
  if (turn.retain) {
    const r = turn.retain;
    if (r.exclude) excludeChecks('retention', r.exclude, have, out);
    if (r.include) includeChecks('retention', r.include, have, out);
    if (r.req) reqChecks('retention', r.req, v.requirements, out);
    if (r.regions) regionChecks('retention', r.regions, g, out);
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
    // The model attached a badge to a node that cannot host it (Auto Scaling on SAE or ACK, an unknown host). Repair can only
    // leave it floating, so this is judged on the model's own output.
    const bad = v.stats.warningsBefore.filter((w) => w.code === 'attach-host-missing' && w.severity !== 'info');
    out.push({ type: 'attachValid', name: 'every attachment names a valid host', pass: !bad.length, detail: bad.length ? bad.map((w) => w.msg).join('; ').slice(0, 240) : undefined });
  }
  out.push({
    type: 'format',
    name: 'NDJSON only, ends with done',
    pass: v.stats.badLines === 0 && v.stats.doneSeen,
    detail: `bad ${v.stats.badLines}, done ${v.stats.doneSeen}, finish ${v.stats.finishReason}${v.stats.truncated && v.stats.finalDone ? ', rescued by the continuation turn' : ''}`,
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
  'include', 'exclude', 'excludeRaw', 'primaryRec', 'noNodes', 'noRecs', 'req', 'maxOps', 'maxNodes', 'minNodes', 'mention', 'notMention', 'notInLabels',
  'regions', 'attach', 'zones', 'edit', 'restored', 'noWarn', 'question', 'pathOrder', 'noErrors', 'noPrices', 'attachValid',
]);
const RETAIN_KEYS: ReadonlySet<string> = new Set(['exclude', 'include', 'req', 'regions']);
const EDIT_KEYS: ReadonlySet<string> = new Set(['maxNodeAdds', 'maxNodeRemoves', 'maxEdgeRemoves', 'maxChanged', 'minChanged', 'noGrowth']);
const CASE_KEYS: ReadonlySet<string> = new Set(['id', 'category', 'lang', 'of', 'title', 'base', 'reference', 'window', 'summarize', 'turns']);
const TURN_KEYS: ReadonlySet<string> = new Set(['ask', 'askRepeat', 'expect', 'retain']);
const CATEGORIES: ReadonlySet<string> = new Set(['pattern', 'need', 'trap', 'edit', 'multiturn', 'i18n', 'adversarial']);
const WARNING_CODES: ReadonlySet<string> = new Set([
  'bad-json', 'bad-op', 'unknown-product', 'alias-resolved', 'retired-product', 'china-only', 'restricted', 'dangling-edge', 'missing-group', 'containment',
  'dns-in-path', 'path-order', 'orphan-node', 'duplicate-id', 'cap-exceeded', 'attach-host-missing', 'unknown-id', 'zone-replicas', 'attach-inline',
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
    for (const p of list) if (typeof p !== 'string' || !catalog.byId.has(p)) bad(c, `${where}: '${String(p)}' is not a catalog id`);
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
        if (i === 0) bad(c, `${w}: retain on the first turn has nothing to retain`);
      }
    });
  }
  return problems;
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
