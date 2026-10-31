// Op validation (schema, ids, text caps, catalog resolution), graph checks and deterministic placement repair.
// Placement is decided by the catalog: the model proposes products, edges and group hints, and these rules move
// each node to the container its entry's scope implies. Browser-safe: no Node APIs.
import type {
  Catalog,
  CatalogEntry,
  Constraint,
  EdgeKind,
  Graph,
  GraphEdge,
  GraphGroup,
  GraphNode,
  GroupKind,
  Op,
  Resolution,
  Warning,
  WarningCode,
} from './types.ts';
import { DEFAULT_LIMITS, applyOp, createCtx, emptyGraph, endTurn, endpointExists, makeEdge, makeNode, normalizeId } from './reducer.ts';
import type { ApplyCtx } from './reducer.ts';
import { LANE_ORDER, checkLifecycle, placementOf, successorWarning } from './catalog.ts';
import type { PlaceKind } from './catalog.ts';
import { DEFAULT_REGION, isOpenRegion, regionLabel, regionMentions, resolveRegions } from './regions.ts';
import { allowedRegions, expandAvoid, familyOfWord } from './constraints.ts';
import { ASK_LIMITS } from './asks.ts';

export { normalizeId };
export { checkConstraints, constraintChecker } from './constraints.ts';

/** Text caps, in code points. Longer text is truncated with an ellipsis and an info warning. */
export const TEXT_LIMITS = { label: 40, why: 160, say: 300, summary: 300, note: 160, req: 200, planNote: 120 };

/** Lanes whose nodes are commonly drawn without edges; an orphan there is only info. */
const QUIET_LANES = new Set(['ops', 'security', 'governance', 'saas', 'network']);

export interface ValidateCtx {
  /** Written when a group of a non-container kind is dropped, read to re-point references to it. ApplyCtx has it. */
  groupAlias?: Record<string, string | null>;
  /** Ids of the assume and ask ops accepted so far this turn; validateOp keeps it to enforce the per-turn caps (3 assume, 2 ask). Pass a fresh ctx per turn. */
  turnAsks?: { assume: string[]; ask: string[] };
}

export interface ValidateResult {
  op?: Op;
  warnings: Warning[];
}

export interface RepairResult {
  graph: Graph;
  /** One entry per fix applied (repaired: true), then every issue still present (repaired: false). */
  warnings: Warning[];
  /** Elements the repair removed (merged replicas, duplicate or self-loop edges, unknown products, cap overflow). */
  tombstones: Array<GraphNode | GraphEdge | GraphGroup>;
}

export interface RepairOptions {
  /** Pinned constraints (memory.constraints): a VPC or region group the repair creates goes to an allowed region. */
  constraints?: readonly Constraint[];
  /** Region for a region group the repair creates when nothing else names one. Default DEFAULT_REGION (Singapore). */
  defaultRegion?: string;
  /** Node ids the user asked to keep in the path (WAF in CNAME mode): they are never turned into badges. */
  keepInline?: Iterable<string>;
}

/** Caps on a req op's machine-checkable lists. */
export const REQ_LIMITS = { regions: 8, avoid: 20 };

type Raw = Record<string, unknown>;
type Severity = Warning['severity'];

const OP_TYPES = new Set(['say', 'plan', 'req', 'group', 'node', 'edge', 'insert', 'move', 'remove', 'rec', 'gap', 'assume', 'ask', 'done']);
const OP_ALIASES: Record<string, string> = { delete: 'remove', recommend: 'rec', recommendation: 'rec', end: 'done', assumption: 'assume', question: 'ask' };
const GROUP_KINDS = new Set(['external', 'edge', 'region', 'vpc', 'zone', 'subnet', 'onprem']);
const GROUP_KIND_ALIASES: Record<string, string> = {
  vswitch: 'subnet',
  vsw: 'subnet',
  az: 'zone',
  'availability-zone': 'zone',
  internet: 'external',
  users: 'external',
  clients: 'external',
  'on-prem': 'onprem',
  'on-premises': 'onprem',
  onpremises: 'onprem',
  idc: 'onprem',
  datacenter: 'onprem',
  'data-center': 'onprem',
  global: 'edge',
};
const EDGE_KINDS = new Set(['data', 'async', 'control', 'resolve']);
const EDGE_KIND_ALIASES: Record<string, string> = {
  dns: 'resolve',
  resolution: 'resolve',
  event: 'async',
  events: 'async',
  message: 'async',
  queue: 'async',
  pubsub: 'async',
  management: 'control',
  sync: 'data',
};
const FIT_ALIASES: Record<string, 'primary' | 'complement'> = {
  primary: 'primary',
  main: 'primary',
  best: 'primary',
  complement: 'complement',
  complementary: 'complement',
  secondary: 'complement',
  optional: 'complement',
  alternative: 'complement',
};
const STRIP = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g;

function W(code: WarningCode, ids: string[], msg: string, severity: Severity, repaired = false): Warning {
  return { code, ids: [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))], msg, severity, repaired };
}

const isObj = (v: unknown): v is Raw => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);
/** Own-property lookup, so keys such as 'constructor' never resolve to Object.prototype members. */
const pick = <T>(map: Record<string, T>, k: string): T | undefined => (has(map, k) ? map[k] : undefined);
const clip = (v: unknown): string => {
  const s = String(v).replace(STRIP, ' ');
  return s.length > 48 ? s.slice(0, 47) + '…' : s;
};

interface Clean {
  text: string;
  truncated: boolean;
}

function clean(v: unknown, max: number): Clean | null {
  if (typeof v === 'number' || typeof v === 'boolean') v = String(v);
  if (typeof v !== 'string') return null;
  const s = v.replace(STRIP, ' ').replace(/\s+/g, ' ').trim();
  const cps = Array.from(s);
  if (cps.length <= max) return { text: s, truncated: false };
  return { text: cps.slice(0, max - 1).join('').trimEnd() + '…', truncated: true };
}

function text(v: unknown, max: number, field: string, ids: string[], warnings: Warning[]): string | undefined {
  const c = clean(v, max);
  if (!c || !c.text) return undefined;
  if (c.truncated) warnings.push(W('bad-op', ids, `${field} is longer than ${max} characters; truncated`, 'info', true));
  return c.text;
}

/** Normalizes an element id. Underscore-to-hyphen is silent; any other rewrite gets an info warning. */
function idField(v: unknown, field: string, warnings: Warning[]): string | null {
  const id = normalizeId(v);
  if (id !== null && typeof v === 'string' && v.trim().replace(/_/g, '-') !== id) {
    warnings.push(W('bad-op', [id], `${field} '${clip(v)}' normalized to '${id}'`, 'info', true));
  }
  return id;
}

function alias(id: string, ctx?: ValidateCtx): string | null {
  const map = ctx && ctx.groupAlias;
  if (!map) return id;
  let cur: string | null = id;
  for (let i = 0; cur !== null && i < 16 && has(map, cur); i++) cur = map[cur];
  return cur;
}

/** A reference to a group: undefined when absent, null for the root, else a normalized id (through aliases). */
function groupRef(v: unknown, ctx: ValidateCtx | undefined, field: string, ids: string[], warnings: Warning[]): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === false) return null;
  if (typeof v === 'string' && /^\s*(?:null|none|root)?\s*$/i.test(v)) return null;
  const id = idField(v, field, warnings);
  if (id === null) {
    warnings.push(W('missing-group', ids, `${field} '${clip(v)}' is not a valid id; placed at the root`, 'warn', true));
    return null;
  }
  return alias(id, ctx);
}

function zonesField(v: unknown, ids: string[], warnings: Warning[]): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,\s]+/) : null;
  if (!list) {
    warnings.push(W('bad-op', ids, 'zones is not a list; ignored', 'info', true));
    return undefined;
  }
  const out: string[] = [];
  for (const z of list) {
    const s = normalizeId(typeof z === 'string' ? z.replace(/^\s*(?:availability[\s_-]*zone|zone|az)[\s_-]*/i, '') : z);
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 6); // [] clears zones on an upsert
}

function edgeKind(v: unknown, ids: string[], warnings: Warning[]): EdgeKind | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const k = typeof v === 'string' ? v.trim().toLowerCase() : '';
  const kind = EDGE_KINDS.has(k) ? k : pick(EDGE_KIND_ALIASES, k);
  if (!kind) {
    warnings.push(W('bad-op', ids, `edge kind '${clip(v)}' is not data|async|control|resolve; dropped`, 'info', true));
    return undefined;
  }
  return kind as EdgeKind;
}

function safeResolve(catalog: Catalog, q: string): Resolution {
  try {
    return catalog.resolve(q) ?? {};
  } catch {
    return {};
  }
}

/** Catalog entry for a stored product id (exact id first, then the catalog's alias and successor resolution). */
function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  return catalog.byId.get(product) ?? safeResolve(catalog, product).entry;
}

/**
 * Resolves a product reference through the catalog: exact id, the catalog's alias and successor rules, then a
 * kebab-case retry (model_studio -> model-studio). Retired entries switch to their successor or fail; legacy,
 * no-new-purchases, china-only, restricted and announced entries resolve with a warning.
 */
export function resolveProduct(catalog: Catalog, v: unknown, ids: string[]): { entry?: CatalogEntry; warnings: Warning[] } {
  const q = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
  if (!q) return { warnings: [W('unknown-product', ids, 'op has no product', 'error')] };
  let r = safeResolve(catalog, q);
  if (!r.entry) {
    const k = q.toLowerCase().replace(/[_\s]+/g, '-');
    if (k !== q) {
      const r2 = safeResolve(catalog, k);
      if (r2.entry) r = r2.via === 'id' ? { entry: r2.entry, via: 'id' } : r2;
    }
  }
  if (!r.entry) return { warnings: [W('unknown-product', ids, `'${clip(q)}' is not in the catalog`, 'error')] };
  const warnings: Warning[] = [];
  let entry = r.entry;
  const withIds = (w: Warning): Warning => W(w.code, [...ids, ...(w.ids ?? [])], w.msg, w.severity, w.repaired);
  if (r.warning) warnings.push(withIds(r.warning));
  else if (r.via === 'alias') warnings.push(W('alias-resolved', ids, `'${clip(q)}' resolved to '${entry.id}'`, 'info', true));
  else if (r.via === 'successor') warnings.push(W('retired-product', ids, `'${clip(q)}' is retired; using its successor '${entry.id}'`, 'warn', true));
  const noted = (code: WarningCode): boolean => warnings.some((w) => w.code === code);
  let lc = checkLifecycle(entry, catalog.byId);
  if (entry.status === 'retired') {
    const succ = lc.successor && lc.successor.status !== 'retired' ? lc.successor : undefined;
    if (!succ) return { warnings: lc.status ? [...warnings, withIds(lc.status)] : warnings };
    if (!noted('retired-product')) warnings.push(withIds(successorWarning(entry, succ)));
    entry = succ;
    lc = checkLifecycle(entry, catalog.byId);
  } else if (lc.status && !noted('retired-product')) {
    warnings.push(withIds(lc.status));
  }
  const avail = lc.availability;
  if (avail && !noted(avail.code)) warnings.push(withIds(avail));
  return { entry, warnings };
}

/**
 * Catalog ids for a req op's avoid list: names, aliases and ids resolve through the catalog; unknown ones are dropped.
 * A family word ("kubernetes", "k8s", "쿠버네티스") or a family's root product (ack) expands to every member of the family,
 * so "no Kubernetes" also rules out ACS, ACK One, ACK Serverless, ASM and Dify on ACK.
 */
function avoidIds(v: unknown, catalog: Catalog, warnings: Warning[], what = 'avoid'): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;]/) : [];
  const found: string[] = [];
  for (const x of list.slice(0, 60)) {
    const q = typeof x === 'string' ? x.trim() : '';
    if (!q) continue;
    if (familyOfWord(q)) {
      found.push(q.normalize('NFKC').toLowerCase());
      continue;
    }
    const e = entryOf(catalog, q) ?? entryOf(catalog, q.toLowerCase().replace(/[_\s]+/g, '-'));
    if (!e) {
      warnings.push(W('unknown-product', [], `req ${what} '${clip(q)}' is not in the catalog; dropped`, 'info', true));
      continue;
    }
    found.push(e.id);
  }
  return expandAvoid(catalog, found).slice(0, REQ_LIMITS.avoid);
}

/** What a req op lifts: 'regions' (every region pin) or catalog ids to drop from the avoid lists (families expanded). */
function liftIds(v: unknown, catalog: Catalog, warnings: Warning[]): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;]/) : [];
  const out: string[] = [];
  const rest: string[] = [];
  for (const x of list.slice(0, 60)) {
    const q = typeof x === 'string' ? x.trim() : '';
    if (!q) continue;
    if (/^(?:regions?|residency|data[\s_-]?residency)$/i.test(q)) {
      if (!out.includes('regions')) out.push('regions');
    } else rest.push(q);
  }
  for (const id of avoidIds(rest, catalog, warnings, 'lifts')) if (!out.includes(id)) out.push(id);
  return out;
}

/** Open region ids for a req op's regions list: ids, names and aliases (English, Korean, Chinese); a country gives all of its regions. */
function reqRegionIds(v: unknown, warnings: Warning[]): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;、，]/) : [];
  const out: string[] = [];
  for (const x of list.slice(0, 40)) {
    const q = typeof x === 'string' ? x.trim() : '';
    if (!q) continue;
    const all = resolveRegions(q);
    const open = all.filter(isOpenRegion);
    if (!open.length) {
      const why = all.length ? 'is not an open international region' : 'is not a known region';
      warnings.push(W('bad-op', [], `req region '${clip(q)}' ${why}; dropped`, 'info', true));
      continue;
    }
    for (const id of open) if (!out.includes(id) && out.length < REQ_LIMITS.regions) out.push(id);
  }
  return out;
}

/** A stable id for an assume or ask op that has none: the first words of its text. */
function noteId(prefix: string, v: unknown, fallback: string): string {
  return normalizeId(`${prefix}-${Array.from(String(v ?? '')).slice(0, 24).join('')}`) ?? fallback;
}

/** Records an accepted assume or ask id in the turn counters; false when the per-turn cap is reached (the same id again replaces and is free). */
function takeTurnSlot(ctx: ValidateCtx | undefined, kind: 'assume' | 'ask', id: string): boolean {
  if (!ctx) return true;
  const t = ctx.turnAsks ?? (ctx.turnAsks = { assume: [], ask: [] });
  const list = t[kind];
  if (list.includes(id)) return true;
  if (list.length >= (kind === 'assume' ? ASK_LIMITS.assumePerTurn : ASK_LIMITS.askPerTurn)) return false;
  list.push(id);
  return true;
}

/** Quick-reply options: trimmed, truncated to 40 characters, deduplicated, at most 4; fewer than 2 left means no options. */
function optionList(v: unknown, id: string, warnings: Warning[]): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const list = typeof v === 'string' ? v.split('|') : v;
  if (!Array.isArray(list)) {
    warnings.push(W('bad-op', [id], 'ask options is not a list; dropped', 'info', true));
    return undefined;
  }
  const out: string[] = [];
  const seen = new Set<string>();
  let over = false;
  for (const raw of list) {
    const c = clean(raw, ASK_LIMITS.optionText);
    if (!c || !c.text) continue;
    if (c.truncated) warnings.push(W('bad-op', [id], `ask option is longer than ${ASK_LIMITS.optionText} characters; truncated`, 'info', true));
    const k = c.text.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    if (out.length >= ASK_LIMITS.optionsMax) over = true;
    else out.push(c.text);
  }
  if (over) warnings.push(W('bad-op', [id], `ask has more than ${ASK_LIMITS.optionsMax} options; the rest are dropped`, 'info', true));
  if (out.length < ASK_LIMITS.optionsMin) {
    if (out.length) warnings.push(W('bad-op', [id], `ask needs at least ${ASK_LIMITS.optionsMin} options; asked without them`, 'info', true));
    return undefined;
  }
  return out;
}

function gapFor(r: Raw, id: string): Op {
  const need = clean(r.label ?? r.name ?? r.product ?? id, TEXT_LIMITS.note);
  return { t: 'gap', need: (need && need.text) || id || 'component', note: `'${clip(r.product ?? '')}' is not in the catalog` };
}

/**
 * Validates one parsed NDJSON object into an Op. Returns no op when the object cannot be used; unknown products in
 * node, insert and rec ops become gap ops. Pass the session's ApplyCtx as ctx so that groups of a non-container
 * kind (such as 'managed') are dropped and references to them are re-pointed to their parent container.
 */
export function validateOp(raw: unknown, catalog: Catalog, ctx?: ValidateCtx): ValidateResult {
  const warnings: Warning[] = [];
  if (!isObj(raw)) return { warnings: [W('bad-op', [], 'op is not a JSON object', 'error')] };
  const r = raw;
  const tv = r.t ?? r.type ?? r.op;
  const t0 = typeof tv === 'string' ? tv.trim().toLowerCase() : '';
  const t = OP_TYPES.has(t0) ? t0 : pick(OP_ALIASES, t0);
  const rid = typeof r.id === 'string' ? clip(r.id) : '';
  if (!t) return { warnings: [W('bad-op', [rid], `unknown op type '${clip(tv)}'`, 'error')] };
  const drop = (msg: string, severity: Severity = 'error'): ValidateResult => ({ warnings: [...warnings, W('bad-op', [rid], msg, severity)] });

  switch (t) {
    case 'say': {
      const s = text(r.text ?? r.message, TEXT_LIMITS.say, 'say text', [], warnings);
      return s ? { op: { t: 'say', text: s }, warnings } : drop('say without text', 'info');
    }
    case 'req': {
      const s = text(r.text, TEXT_LIMITS.req, 'req text', [], warnings);
      if (!s) return drop('req without text', 'info');
      const op: Extract<Op, { t: 'req' }> = { t: 'req', text: s };
      const regions = reqRegionIds(r.regions ?? r.region, warnings);
      const avoid = avoidIds(r.avoid, catalog, warnings);
      const lifts = liftIds(r.lifts ?? r.lift, catalog, warnings);
      if (regions.length) op.regions = regions;
      if (avoid.length) op.avoid = avoid;
      if (lifts.length) op.lifts = lifts;
      return { op, warnings };
    }
    case 'plan': {
      const list = typeof r.products === 'string' ? r.products.split(/[,\s]+/).filter(Boolean) : r.products;
      if (!Array.isArray(list)) return drop('plan without a products list', 'warn');
      const products: string[] = [];
      for (const p of list.slice(0, 60)) {
        const pr = resolveProduct(catalog, p, []);
        for (const w of pr.warnings) warnings.push(w.code === 'unknown-product' ? { ...w, severity: 'warn', msg: w.msg + '; left out of the plan' } : w);
        if (pr.entry && !products.includes(pr.entry.id)) products.push(pr.entry.id);
      }
      if (!products.length) return drop('plan has no catalog products', 'warn');
      const note = text(r.note, TEXT_LIMITS.planNote, 'plan note', [], warnings);
      return { op: note ? { t: 'plan', products, note } : { t: 'plan', products }, warnings };
    }
    case 'group': {
      const id = idField(r.id, 'group id', warnings);
      if (!id) return drop(`group id '${rid}' is not a valid id`);
      const kraw = typeof r.kind === 'string' ? r.kind.trim().toLowerCase().replace(/[_\s]+/g, '-') : '';
      const kind = GROUP_KINDS.has(kraw) ? kraw : pick(GROUP_KIND_ALIASES, kraw);
      const parent = groupRef(r.parent, ctx, 'group parent', [id], warnings);
      if (!kind) {
        // Not a network or location container (grammar v2): drop it and send its members to its parent.
        const target = parent === undefined || parent === id ? null : parent;
        if (ctx) {
          if (!ctx.groupAlias) ctx.groupAlias = {};
          ctx.groupAlias[id] = target;
        }
        warnings.push(
          W('bad-op', [id], `group '${id}' has kind '${clip(r.kind ?? '')}', which is not a network container; its members go to ${target ? `'${target}'` : 'the root'}`, 'info', true),
        );
        return { warnings };
      }
      if (ctx && ctx.groupAlias && has(ctx.groupAlias, id)) delete ctx.groupAlias[id];
      const label = text(r.label ?? r.name, TEXT_LIMITS.label, 'group label', [id], warnings) ?? id;
      const op: Extract<Op, { t: 'group' }> = { t: 'group', id, kind: kind as GroupKind, label };
      if (parent !== undefined) op.parent = parent === id ? null : parent;
      return { op, warnings };
    }
    case 'node':
    case 'insert': {
      const id = idField(r.id, `${t} id`, warnings);
      if (!id) return drop(`${t} id '${rid}' is not a valid id`);
      const res = resolveProduct(catalog, r.product, [id]);
      warnings.push(...res.warnings);
      if (!res.entry) return { op: gapFor(r, id), warnings };
      const e = res.entry;
      let label = text(r.label ?? r.name, TEXT_LIMITS.label, 'label', [id], warnings);
      if (!label) {
        label = (clean(e.short || e.name, TEXT_LIMITS.label) ?? { text: e.id }).text || e.id;
        warnings.push(W('bad-op', [id], `'${id}' has no label; using '${label}'`, 'info', true));
      }
      const why = text(r.why, TEXT_LIMITS.why, 'why', [id], warnings);
      if (t === 'insert') {
        const on = r.on !== undefined || r.edge !== undefined ? idField(r.on ?? r.edge, 'insert on', warnings) : null;
        if (on) {
          const ins: Extract<Op, { t: 'insert' }> = { t: 'insert', id, product: e.id, label, on };
          if (why) ins.why = why;
          return { op: ins, warnings };
        }
        warnings.push(W('bad-op', [id], `insert '${id}' names no edge to split; added as a plain node`, 'warn', true));
      }
      const op: Extract<Op, { t: 'node' }> = { t: 'node', id, product: e.id, label };
      const group = groupRef(r.group !== undefined ? r.group : r.parent, ctx, 'node group', [id], warnings);
      if (group !== undefined) op.group = group;
      const zones = zonesField(r.zones, [id], warnings);
      if (zones) op.zones = zones;
      if (r.attachTo !== undefined && r.attachTo !== null && r.attachTo !== '') {
        const host = idField(r.attachTo, 'attachTo', warnings);
        if (host) op.attachTo = host;
      }
      if (why) op.why = why;
      return { op, warnings };
    }
    case 'edge': {
      const from = idField(r.from ?? r.source, 'edge from', warnings);
      const to = idField(r.to ?? r.target, 'edge to', warnings);
      if (!from || !to) return drop(`edge '${rid}' needs valid from and to ids`);
      let id = r.id !== undefined ? idField(r.id, 'edge id', warnings) : null;
      if (!id) {
        id = normalizeId(`e-${from}-${to}`) ?? 'e';
        warnings.push(W('bad-op', [id], `edge without a valid id; using '${id}'`, 'info', true));
      }
      const op: Extract<Op, { t: 'edge' }> = { t: 'edge', id, from, to };
      const label = text(r.label, TEXT_LIMITS.label, 'edge label', [id], warnings);
      if (label) op.label = label;
      const kind = edgeKind(r.kind, [id], warnings);
      if (kind) op.kind = kind;
      return { op, warnings };
    }
    case 'move': {
      const id = idField(r.id, 'move id', warnings);
      if (!id) return drop(`move id '${rid}' is not a valid id`);
      const dest = r.to !== undefined ? r.to : r.group !== undefined ? r.group : r.parent;
      if (dest === undefined) return drop(`move '${id}' has no destination ('to')`);
      const to = groupRef(dest, ctx, 'move to', [id], warnings);
      return { op: { t: 'move', id, to: to === undefined ? null : to }, warnings };
    }
    case 'remove': {
      const id = idField(r.id, 'remove id', warnings);
      return id ? { op: { t: 'remove', id }, warnings } : drop(`remove id '${rid}' is not a valid id`);
    }
    case 'rec': {
      const res = resolveProduct(catalog, r.product, []);
      warnings.push(...res.warnings);
      if (!res.entry) return { op: gapFor(r, ''), warnings };
      const e = res.entry;
      const fraw = typeof r.fit === 'string' ? r.fit.trim().toLowerCase() : '';
      let fit = pick(FIT_ALIASES, fraw);
      if (!fit) {
        fit = 'primary';
        if (fraw) warnings.push(W('bad-op', [e.id], `rec fit '${clip(r.fit)}' is not primary|complement; using primary`, 'info', true));
      }
      let why = text(r.why, TEXT_LIMITS.why, 'why', [e.id], warnings);
      if (!why) {
        why = (clean(e.purpose, TEXT_LIMITS.why) ?? { text: e.name }).text || e.name;
        warnings.push(W('bad-op', [e.id], `rec '${e.id}' has no why; using the catalog purpose`, 'info', true));
      }
      return { op: { t: 'rec', product: e.id, fit, why }, warnings };
    }
    case 'gap': {
      const need = text(r.need ?? r.text, TEXT_LIMITS.note, 'gap need', [], warnings);
      if (!need) return drop('gap without need', 'warn');
      const note = text(r.note ?? r.why, TEXT_LIMITS.note, 'gap note', [], warnings) ?? '';
      return { op: { t: 'gap', need, note }, warnings };
    }
    case 'assume': {
      const txt = text(r.text ?? r.assumption, ASK_LIMITS.assumeText, 'assume text', [], warnings);
      if (!txt) return drop('assume without text', 'info');
      const id = r.id !== undefined && r.id !== null && r.id !== '' ? idField(r.id, 'assume id', warnings) : null;
      const aid = id ?? noteId('assume', txt, 'assume');
      if (!id) warnings.push(W('bad-op', [aid], `assume without a valid id; using '${aid}'`, 'info', true));
      if (!takeTurnSlot(ctx, 'assume', aid)) return drop(`more than ${ASK_LIMITS.assumePerTurn} assume ops in one turn; '${aid}' dropped`, 'warn');
      const op: Extract<Op, { t: 'assume' }> = { t: 'assume', id: aid, text: txt };
      const alt = text(r.alt ?? r.alternative, ASK_LIMITS.assumeAlt, 'assume alt', [aid], warnings);
      if (alt) op.alt = alt;
      return { op, warnings };
    }
    case 'ask': {
      const txt = text(r.text ?? r.question, ASK_LIMITS.askText, 'ask text', [], warnings);
      if (!txt) return drop('ask without text', 'info');
      const id = r.id !== undefined && r.id !== null && r.id !== '' ? idField(r.id, 'ask id', warnings) : null;
      const qid = id ?? noteId('ask', txt, 'ask');
      if (!id) warnings.push(W('bad-op', [qid], `ask without a valid id; using '${qid}'`, 'info', true));
      if (!takeTurnSlot(ctx, 'ask', qid)) return drop(`more than ${ASK_LIMITS.askPerTurn} ask ops in one turn; '${qid}' dropped`, 'warn');
      const op: Extract<Op, { t: 'ask' }> = { t: 'ask', id: qid, text: txt };
      const options = optionList(r.options ?? r.choices, qid, warnings);
      if (options) op.options = options;
      return { op, warnings };
    }
    case 'done': {
      const summary = text(r.summary ?? r.text, TEXT_LIMITS.summary, 'done summary', [], warnings) ?? '';
      return { op: { t: 'done', summary }, warnings };
    }
  }
  return drop(`unhandled op type '${t}'`);
}

/**
 * Loads an untrusted graph (a client's CURRENT DIAGRAM, saved state, or the probe's baseState arrays) through the
 * same validate -> apply path as streamed ops, then ends the turn. Accepts arrays or id-keyed records.
 */
export function ingestGraph(raw: unknown, catalog: Catalog, ctx?: ApplyCtx): { graph: Graph; warnings: Warning[]; ctx: ApplyCtx } {
  const c = ctx ?? createCtx();
  const warnings: Warning[] = [];
  let graph = emptyGraph();
  if (!isObj(raw)) return { graph, warnings: [W('bad-op', [], 'graph is not an object', 'error')], ctx: c };
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : isObj(v) ? Object.values(v) : []);
  const ops: unknown[] = [
    ...list(raw.groups).map((x) => (isObj(x) ? { ...x, t: 'group' } : x)),
    ...list(raw.nodes).map((x) => (isObj(x) ? { ...x, t: 'node' } : x)),
    ...list(raw.edges).map((x) => (isObj(x) ? { ...x, t: 'edge' } : x)),
    ...list(raw.recs).map((x) => (isObj(x) ? { ...x, t: 'rec' } : x)),
  ];
  for (const o of ops) {
    const v = validateOp(o, catalog, c);
    warnings.push(...v.warnings);
    if (!v.op) continue;
    const res = applyOp(graph, v.op, c);
    graph = res.graph;
    warnings.push(...res.warnings);
  }
  warnings.push(...endTurn(graph, c).warnings);
  return { graph, warnings, ctx: c };
}

// ---------- graph analysis shared by checkGraph and repairGraph ----------

interface Adj {
  dir: 'in' | 'out';
  other: string;
}

function adjacency(g: Graph): Map<string, Adj[]> {
  const m = new Map<string, Adj[]>();
  const add = (k: string, a: Adj): void => {
    const l = m.get(k);
    if (l) l.push(a);
    else m.set(k, [a]);
  };
  for (const e of Object.values(g.edges)) {
    add(e.from, { dir: 'out', other: e.to });
    add(e.to, { dir: 'in', other: e.from });
  }
  return m;
}

/** The group and its ancestors, nearest first. Cycle-safe. */
function chainOf(g: Graph, groupId: string | null | undefined): GraphGroup[] {
  const out: GraphGroup[] = [];
  const seen = new Set<string>();
  let cur = groupId ?? null;
  while (cur !== null && !seen.has(cur) && out.length < 32) {
    seen.add(cur);
    const grp: GraphGroup | undefined = g.groups[cur];
    if (!grp) break;
    out.push(grp);
    cur = grp.parent;
  }
  return out;
}

interface Place {
  chain: GraphGroup[];
  inVpc: boolean;
  inRegion: boolean;
  inEdge: boolean;
  inExternal: boolean;
  region?: GraphGroup;
  here: string;
}

function placeOf(g: Graph, groupId: string | null): Place {
  const chain = chainOf(g, groupId);
  const kinds = chain.map((x) => x.kind);
  return {
    chain,
    inVpc: kinds.some((k) => k === 'vpc' || k === 'zone' || k === 'subnet'),
    inRegion: kinds.includes('region'),
    inEdge: kinds.includes('edge'),
    inExternal: kinds.some((k) => k === 'external' || k === 'onprem'),
    region: chain.find((x) => x.kind === 'region'),
    here: chain.length ? `'${chain[0].id}' (${chain[0].kind})` : 'the root',
  };
}

/** Picks a group of one of `kinds`: inside `within` when that narrows it down, else the one holding most neighbours. */
function pickGroup(g: Graph, kinds: GroupKind[], nodeId: string | null, adj: Map<string, Adj[]>, within?: string): string | undefined {
  let cands = Object.values(g.groups).filter((x) => kinds.includes(x.kind));
  if (within) {
    const inside = cands.filter((x) => chainOf(g, x.id).some((a) => a.id === within));
    if (inside.length) cands = inside;
  }
  if (!cands.length) return undefined;
  if (cands.length === 1 || nodeId === null) return cands[0].id;
  let best = cands[0].id;
  let bestScore = -1;
  for (const cand of cands) {
    let score = 0;
    for (const a of adj.get(nodeId) ?? []) {
      const m = g.nodes[a.other];
      if (m && chainOf(g, m.group).some((x) => x.id === cand.id)) score++;
    }
    if (score > bestScore) {
      best = cand.id;
      bestScore = score;
    }
  }
  return best;
}

interface Move {
  id: string;
  target: string | null;
  severity: Severity;
  msg: string;
}

function groupNestingMoves(g: Graph): Move[] {
  const adj = adjacency(g);
  const kinds = new Set(Object.values(g.groups).map((x) => x.kind));
  const moves: Move[] = [];
  for (const grp of Object.values(g.groups)) {
    const up = chainOf(g, grp.parent);
    const tag = `group '${grp.id}' (${grp.kind})`;
    const region = up.find((x) => x.kind === 'region');
    switch (grp.kind) {
      case 'region':
      case 'edge':
      case 'external':
      case 'onprem':
        if (grp.parent !== null) moves.push({ id: grp.id, target: null, severity: 'warn', msg: `${tag} is nested in '${grp.parent}'; it belongs at the root` });
        break;
      case 'vpc': {
        const wrong = up.find((x) => x.kind !== 'region');
        if (wrong) moves.push({ id: grp.id, target: region ? region.id : null, severity: 'warn', msg: `${tag} is nested in ${wrong.kind} '${wrong.id}'` });
        else if (!region && kinds.has('region')) {
          moves.push({ id: grp.id, target: pickGroup(g, ['region'], null, adj) ?? null, severity: 'warn', msg: `${tag} is outside every region` });
        }
        break;
      }
      case 'zone':
      case 'subnet': {
        const ok: GroupKind[] = grp.kind === 'zone' ? ['vpc', 'region'] : ['vpc', 'zone'];
        const vpc = up.find((x) => x.kind === 'vpc');
        if (!vpc && kinds.has('vpc')) {
          moves.push({ id: grp.id, target: pickGroup(g, ['vpc'], null, adj, region ? region.id : undefined) ?? null, severity: 'warn', msg: `${tag} is outside every VPC` });
        } else if (up.length && !ok.includes(up[0].kind)) {
          const fit = up.find((x) => ok.includes(x.kind));
          moves.push({ id: grp.id, target: fit ? fit.id : null, severity: 'warn', msg: `${tag} is nested in ${up[0].kind} '${up[0].id}'` });
        }
        break;
      }
    }
  }
  return moves;
}

/** What "drawn outside its container" says, per container kind. */
const OUTSIDE_MSG: Record<string, string> = { region: 'is drawn outside every region', edge: 'is drawn outside the edge group', external: 'is drawn outside the external group', onprem: 'is drawn outside the external group' };
const PLACE_ORDER: readonly PlaceKind[] = ['vpc', 'region', 'edge', 'external'];

/**
 * Node placement against the catalog's placement table (catalog.placementOf), both directions: a managed service
 * inside a VPC, a VPC resource outside it, an edge service inside a region, and so on.
 */
function containmentMoves(g: Graph, catalog: Catalog): Move[] {
  const adj = adjacency(g);
  const kinds = new Set(Object.values(g.groups).map((x) => x.kind));
  const moves: Move[] = [];
  for (const n of Object.values(g.nodes)) {
    if (n.attachTo && g.nodes[n.attachTo]) continue; // badges ride on their host
    const e = entryOf(catalog, n.product);
    if (!e) continue;
    const P = placementOf(e);
    const p = placeOf(g, n.group);
    const mv = (severity: Severity, why: string, target: string | null | undefined): void => {
      moves.push({ id: n.id, target: target ?? null, severity, msg: `'${n.id}' (${e.id}, scope ${e.scope}) ${why}` });
    };
    const target = (): string | undefined => (P.targets.length ? pickGroup(g, [...P.targets], n.id, adj) : undefined);
    if (P.container === 'vpc') {
      if (p.inVpc) continue;
      if (kinds.has('vpc')) mv('error', `sits in ${p.here}, outside every VPC`, pickGroup(g, ['vpc'], n.id, adj, p.region ? p.region.id : undefined));
      else if (p.inEdge || p.inExternal) mv('error', `sits in ${p.here}`, pickGroup(g, ['region'], n.id, adj));
      continue;
    }
    const isIn: Record<PlaceKind, boolean> = { vpc: p.inVpc, region: p.inRegion, edge: p.inEdge, external: p.inExternal };
    const bad = PLACE_ORDER.find((k) => P.inside[k] !== undefined && isIn[k]);
    if (bad) {
      const severity = P.inside[bad] ?? 'warn';
      if (P.container === 'region' && bad === 'vpc') mv(severity, `sits inside the VPC (${p.here}); ${P.why}`, p.region ? p.region.id : target());
      else mv(severity, `sits in ${p.here}; ${P.why}`, target());
      continue;
    }
    if (!P.outside || !P.container) continue;
    const home = P.container === 'region' ? p.inRegion || p.inVpc : P.container === 'edge' ? p.inEdge : p.inExternal;
    const exists = P.targets.some((k) => kinds.has(k));
    if (!home && exists) mv(P.outside, OUTSIDE_MSG[P.container] ?? 'is drawn outside its group', target());
  }
  return moves;
}

// ---------- per-zone replicas ----------

interface ReplicaSet {
  product: string;
  parent: string | null;
  members: string[];
  letters: string[]; // zone letter per member
  spanning?: string; // a same-product node directly in the zones' parent that the replicas belong to
  via: 'label' | 'connections';
}

function zoneLetter(z: GraphGroup): string {
  for (const s of [z.label, z.id]) {
    const m = /(?:zone|az)[\s_-]*([a-z0-9]{1,3})\s*$/i.exec(s) ?? /\d([a-z])\s*$/i.exec(s) ?? /(?:^|[\s_-])([a-z]|\d{1,2})\s*$/i.exec(s);
    if (m) return m[1].toLowerCase();
  }
  return z.id;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ZONE_WORD = /^(?:availability\s+zone|zone|az)[\s_-]*[a-z0-9]{1,2}$/i;

/** Removes zone markers ("(AZ-A)", "Zone B", a trailing zone letter) and HA role words from a label. */
function stripReplicaTokens(label: string, letter: string): string {
  const s = label
    .replace(/\(([^)]*)\)/g, (m: string, inner: string) => (ZONE_WORD.test(inner.trim()) || inner.trim().toLowerCase() === letter ? ' ' : m))
    .replace(/\b(?:availability\s+zone|zone|az)[\s_-]*[a-z0-9]{1,2}\b/gi, ' ')
    .replace(/\b(?:primary|standby|secondary|replica|master|slave|active|passive)\b/gi, ' ')
    .replace(new RegExp(`[\\s_-]+${escapeRe(letter)}\\s*$`, 'i'), ' ');
  return s.replace(/\s+/g, ' ').replace(/[\s_-]+$/, '').trim();
}

function replicaKey(label: string, letter: string): string {
  return stripReplicaTokens(label, letter)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function signature(adj: Map<string, Adj[]>, id: string, exclude: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const a of adj.get(id) ?? []) if (!exclude.has(a.other)) out.add(a.dir + ':' + a.other);
  return out;
}

function subset(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Same-product nodes in sibling zones of one parent are replicas when their labels match once zone markers are
 * removed, or (one per zone) when each one's connections are a subset of the best-connected one's.
 */
function findReplicaSets(g: Graph): ReplicaSet[] {
  const adj = adjacency(g);
  interface Item {
    n: GraphNode;
    zone: GraphGroup;
    letter: string;
  }
  const buckets = new Map<string, Item[]>();
  for (const n of Object.values(g.nodes)) {
    if (n.attachTo && g.nodes[n.attachTo]) continue;
    const zone = chainOf(g, n.group).find((x) => x.kind === 'zone');
    if (!zone) continue;
    const key = n.product + '\u0001' + (zone.parent ?? '');
    const item: Item = { n, zone, letter: zoneLetter(zone) };
    const l = buckets.get(key);
    if (l) l.push(item);
    else buckets.set(key, [item]);
  }
  const sets: ReplicaSet[] = [];
  const make = (list: Item[], via: ReplicaSet['via']): ReplicaSet => ({
    product: list[0].n.product,
    parent: list[0].zone.parent,
    members: list.map((i) => i.n.id),
    letters: list.map((i) => i.letter),
    via,
  });
  const oneEach = (list: Item[]): boolean => new Set(list.map((i) => i.zone.id)).size === list.length;
  for (const items of buckets.values()) {
    if (new Set(items.map((i) => i.zone.id)).size < 2) continue;
    const used = new Set<string>();
    const byLabel = new Map<string, Item[]>();
    for (const i of items) {
      const k = replicaKey(i.n.label, i.letter);
      if (!k) continue;
      const l = byLabel.get(k);
      if (l) l.push(i);
      else byLabel.set(k, [i]);
    }
    for (const list of byLabel.values()) {
      if (list.length < 2 || !oneEach(list)) continue;
      sets.push(make(list, 'label'));
      for (const i of list) used.add(i.n.id);
    }
    const rest = items.filter((i) => !used.has(i.n.id));
    if (rest.length >= 2 && oneEach(rest)) {
      const ids = new Set(rest.map((i) => i.n.id));
      const sigs = rest.map((i) => signature(adj, i.n.id, ids));
      let best = 0;
      for (let k = 1; k < sigs.length; k++) if (sigs[k].size > sigs[best].size) best = k;
      if (rest.every((_, k) => k === best || (sigs[k].size > 0 && subset(sigs[k], sigs[best])))) sets.push(make(rest, 'connections'));
    }
  }
  for (const s of sets) {
    const members = new Set(s.members);
    const span = Object.values(g.nodes).filter(
      (m) => m.product === s.product && m.group === s.parent && !members.has(m.id) && !(m.attachTo && g.nodes[m.attachTo]),
    );
    if (span.length !== 1) continue;
    const exclude = new Set([...s.members, span[0].id]);
    const sigR = new Set<string>();
    for (const id of s.members) for (const x of signature(adj, id, exclude)) sigR.add(x);
    if (subset(sigR, signature(adj, span[0].id, exclude))) s.spanning = span[0].id;
  }
  return sets;
}

// ---------- attachments ----------

interface AttachFix {
  id: string;
  /**
   * attach: (re-)attach to `host` (moving its edges there); clear: drawn on its own; edge: attachTo becomes an edge
   * between the old host and the node (attach-invalid); drop: an attachment with no host to sit on is removed.
   */
  action: 'attach' | 'clear' | 'edge' | 'drop';
  host: string | null; // attach: the new host; edge: the old host
  code: 'attach-host-missing' | 'attach-inline';
  severity: Severity;
  msg: string;
}

function attachFixes(g: Graph, catalog: Catalog, keepInline: ReadonlySet<string> = new Set()): AttachFix[] {
  const adj = adjacency(g);
  const out: AttachFix[] = [];
  const hostFor = (e: CatalogEntry, id: string, self: string): boolean => {
    const h = g.nodes[id];
    return !!h && id !== self && !h.attachTo && !!e.attach && e.attach.hosts.includes(h.product);
  };
  const adjacentHost = (n: GraphNode, e: CatalogEntry): string | undefined => {
    const list = adj.get(n.id) ?? [];
    const down = list.find((a) => a.dir === 'out' && hostFor(e, a.other, n.id)); // the host it protects or fronts
    const up = list.find((a) => a.dir === 'in' && hostFor(e, a.other, n.id));
    return (down ?? up)?.other;
  };
  const hostsOf = (n: GraphNode, e: CatalogEntry): string[] => Object.values(g.nodes).filter((h) => hostFor(e, h.id, n.id)).map((h) => h.id);
  const onlyHost = (n: GraphNode, e: CatalogEntry): string | undefined => {
    const all = hostsOf(n, e);
    return all.length === 1 ? all[0] : undefined;
  };
  for (const n of Object.values(g.nodes)) {
    const e = entryOf(catalog, n.product);
    const attachment = !!e && !!e.attach && e.attach.as === 'attachment';
    if (n.attachTo) {
      const host = g.nodes[n.attachTo];
      if (host && e && hostFor(e, host.id, n.id)) {
        if ((adj.get(n.id) ?? []).length) out.push({ id: n.id, action: 'attach', host: host.id, code: 'attach-inline', severity: 'info', msg: `badge '${n.id}' on '${host.id}' has edges of its own` });
        continue;
      }
      const why = !host
        ? `host '${n.attachTo}' does not exist`
        : !e || !e.attach
          ? `${n.product} is not drawn as an attachment`
          : host.attachTo
            ? `host '${host.id}' is itself attached`
            : `'${host.id}' (${host.product}) is not an attach host for ${n.product}`;
      const msg = `'${n.id}' attaches to '${n.attachTo}': ${why}`;
      const severity: Severity = host ? 'warn' : 'error';
      const target = e && e.attach ? (adjacentHost(n, e) ?? onlyHost(n, e)) : undefined;
      if (target) out.push({ id: n.id, action: 'attach', host: target, code: 'attach-host-missing', severity, msg });
      // Several possible hosts and none chosen: keep the node on its own rather than delete it; only a diagram with no host at all loses it.
      else if (attachment) out.push({ id: n.id, action: e && hostsOf(n, e).length > 1 ? 'clear' : 'drop', host: null, code: 'attach-host-missing', severity, msg });
      else if (host && !host.attachTo) out.push({ id: n.id, action: 'edge', host: host.id, code: 'attach-host-missing', severity, msg });
      else out.push({ id: n.id, action: 'clear', host: null, code: 'attach-host-missing', severity, msg });
      continue;
    }
    if (!e || !e.attach || keepInline.has(n.id)) continue;
    const h = adjacentHost(n, e);
    if (h) {
      out.push({ id: n.id, action: 'attach', host: h, code: 'attach-inline', severity: 'info', msg: `'${n.id}' (${e.id}) is drawn inline next to its attach host '${h}'` });
    } else if (attachment && !(adj.get(n.id) ?? []).length && Object.keys(g.nodes).length > 1) {
      // An attachment drawn on its own with no edges (its host was removed or replaced): it means nothing without one.
      const only = onlyHost(n, e);
      const msg = `'${n.id}' (${e.id}) is an attachment with no host`;
      if (only) out.push({ id: n.id, action: 'attach', host: only, code: 'attach-host-missing', severity: 'warn', msg });
      else if (!hostsOf(n, e).length) out.push({ id: n.id, action: 'drop', host: null, code: 'attach-host-missing', severity: 'warn', msg });
      // several candidate hosts: it stays on its own
    }
  }
  return out;
}

/** -1 when `a` comes before `b` on the request path (pathRank, then lane order), 1 when after, 0 when neither does. */
function pathCompare(a: CatalogEntry | undefined, b: CatalogEntry | undefined): number {
  if (!a || !b) return 0;
  if (typeof a.pathRank === 'number' && typeof b.pathRank === 'number' && a.pathRank !== b.pathRank) return a.pathRank < b.pathRank ? -1 : 1;
  const la = LANE_ORDER.indexOf(a.lane);
  const lb = LANE_ORDER.indexOf(b.lane);
  if (la !== lb && la >= 0 && lb >= 0) return la < lb ? -1 : 1;
  return 0;
}

/** A free element id built from `base` (edges, nodes and groups share one namespace). */
function freeId(g: Graph, base: string): string {
  let b = normalizeId(base) ?? 'x';
  if (b.length > 36) b = b.slice(0, 36).replace(/-+$/, '');
  let id = b;
  for (let n = 2; has(g.edges, id) || has(g.nodes, id) || has(g.groups, id); n++) id = `${b}-${n}`;
  return id;
}

// ---------- edges ----------

function isDns(e: CatalogEntry | undefined): boolean {
  return !!e && (e.lane === 'dns' || e.icon === 'dns');
}

function dnsDataEdges(g: Graph, catalog: Catalog): GraphEdge[] {
  const out: GraphEdge[] = [];
  for (const e of Object.values(g.edges)) {
    if (e.kind && e.kind !== 'data') continue;
    const a = g.nodes[e.from];
    const b = g.nodes[e.to];
    if ((a && isDns(entryOf(catalog, a.product))) || (b && isDns(entryOf(catalog, b.product)))) out.push(e);
  }
  return out;
}

// ---------- checkGraph ----------

const bare = <T>(r: Record<string, T> | undefined): Record<string, T> => Object.assign(Object.create(null) as Record<string, T>, r ?? {});

/** Null-prototype view of a graph for read-only analysis. */
function shape(graph: Graph): Graph {
  return { groups: bare(graph.groups), nodes: bare(graph.nodes), edges: bare(graph.edges), recs: graph.recs ?? [] };
}

/** Structural problems a graph from outside the reducer can have. */
function structuralIssues(g: Graph, catalog: Catalog): Warning[] {
  const out: Warning[] = [];
  for (const n of Object.values(g.nodes)) {
    const e = entryOf(catalog, n.product);
    if (!e) out.push(W('unknown-product', [n.id], `'${n.id}' uses unknown product '${clip(n.product)}'`, 'error'));
    else if (e.id !== n.product) out.push(W('alias-resolved', [n.id], `'${n.id}' stores product '${clip(n.product)}' instead of '${e.id}'`, 'info'));
    if (n.group !== null && !g.groups[n.group]) out.push(W('missing-group', [n.id, n.group], `'${n.id}' is in unknown group '${n.group}'`, 'warn'));
  }
  for (const r of g.recs) {
    const e = entryOf(catalog, r.product);
    if (!e) out.push(W('unknown-product', [r.product], `rec uses unknown product '${clip(r.product)}'`, 'error'));
    else if (e.id !== r.product) out.push(W('alias-resolved', [r.product], `rec stores '${clip(r.product)}' instead of '${e.id}'`, 'info'));
  }
  for (const grp of Object.values(g.groups)) {
    if (grp.parent !== null && !g.groups[grp.parent]) out.push(W('missing-group', [grp.id, grp.parent], `group '${grp.id}' has unknown parent '${grp.parent}'`, 'warn'));
  }
  for (const e of Object.values(g.edges)) {
    const missing = [e.from, e.to].filter((x) => !endpointExists(g, x));
    if (missing.length) out.push(W('dangling-edge', [e.id, ...missing], `edge '${e.id}' points to missing ${missing.map((m) => `'${m}'`).join(' and ')}`, 'warn'));
  }
  return out;
}

/** Semantic checks of a whole graph. Nothing is changed; every warning has repaired: false. opts.keepInline as for repairGraph. */
export function checkGraph(graph: Graph, catalog: Catalog, opts: Pick<RepairOptions, 'keepInline'> = {}): Warning[] {
  const g = shape(graph);
  const out: Warning[] = structuralIssues(g, catalog);
  for (const m of groupNestingMoves(g)) out.push(W('containment', [m.id], m.msg, m.severity));
  for (const m of containmentMoves(g, catalog)) out.push(W('containment', [m.id], m.msg, m.severity));
  if (!Object.values(g.groups).some((x) => x.kind === 'vpc')) {
    const loose = vpcResources(g, catalog);
    if (loose.length) out.push(W('missing-group', loose.map((n) => n.id), `VPC resources ${loose.map((n) => `'${n.id}'`).join(', ')} are drawn without a VPC group`, 'warn'));
  }
  for (const s of findReplicaSets(g)) {
    const ids = s.spanning ? [s.spanning, ...s.members] : s.members;
    const into = s.spanning ? ` that belong to '${s.spanning}'` : '';
    out.push(W('zone-replicas', ids, `per-zone ${s.product} nodes ${s.members.join(', ')}${into}; draw one node with zones [${[...new Set(s.letters)].sort().join(', ')}]`, 'warn'));
  }
  for (const f of attachFixes(g, catalog, new Set(opts.keepInline ?? []))) out.push(W(f.code, f.host && f.action === 'attach' ? [f.id, f.host] : [f.id], f.msg, f.severity));
  for (const e of dnsDataEdges(g, catalog)) {
    out.push(W('dns-in-path', [e.id], `edge '${e.id}' (${e.from} -> ${e.to}) puts DNS in the data path; DNS should be a 'resolve' edge`, 'warn'));
  }
  for (const e of Object.values(g.edges)) {
    if (e.kind && e.kind !== 'data') continue;
    const a = g.nodes[e.from];
    const b = g.nodes[e.to];
    if (!a || !b) continue;
    const ea = entryOf(catalog, a.product);
    const eb = entryOf(catalog, b.product);
    if (!ea || !eb || isDns(ea) || isDns(eb)) continue;
    const ra = ea.pathRank;
    const rb = eb.pathRank;
    if (typeof ra !== 'number' || typeof rb !== 'number' || ra <= rb) continue;
    out.push(
      W('path-order', [e.id], `edge '${e.id}' runs against the request path: ${a.id} (${ea.id}, rank ${ra}) -> ${b.id} (${eb.id}, rank ${rb})`, Math.min(ra, rb) < 40 ? 'warn' : 'info'),
    );
  }
  const nodes = Object.values(g.nodes);
  if (nodes.length > 1) {
    const adj = adjacency(g);
    for (const n of nodes) {
      if (n.attachTo && g.nodes[n.attachTo]) continue;
      if ((adj.get(n.id) ?? []).length) continue;
      const e = entryOf(catalog, n.product);
      out.push(W('orphan-node', [n.id], `'${n.id}' (${n.product}) has no connections`, e && QUIET_LANES.has(e.lane) ? 'info' : 'warn'));
    }
  }
  const nn = nodes.length;
  const ne = Object.keys(g.edges).length;
  if (nn > DEFAULT_LIMITS.maxNodes) out.push(W('cap-exceeded', [], `${nn} nodes; the cap is ${DEFAULT_LIMITS.maxNodes}`, 'error'));
  if (ne > DEFAULT_LIMITS.maxEdges) out.push(W('cap-exceeded', [], `${ne} edges; the cap is ${DEFAULT_LIMITS.maxEdges}`, 'error'));
  return out;
}

// ---------- repairGraph ----------

/** Deep working copy with null-prototype records; plainGraph() turns it back into ordinary objects. */
function copyGraph(graph: Graph): Graph {
  const g = shape(graph);
  const out: Graph = { groups: bare<GraphGroup>({}), nodes: bare<GraphNode>({}), edges: bare<GraphEdge>({}), recs: [] };
  for (const [k, v] of Object.entries(g.groups)) out.groups[k] = { ...v };
  for (const [k, v] of Object.entries(g.nodes)) out.nodes[k] = makeNode(v);
  for (const [k, v] of Object.entries(g.edges)) out.edges[k] = makeEdge(v);
  out.recs = g.recs.map((r) => ({ ...r }));
  return out;
}

/** VPC-scoped cards (vpc and vpc-edge entries, not drawn as a badge). */
function vpcResources(g: Graph, catalog: Catalog): GraphNode[] {
  return Object.values(g.nodes).filter((n) => {
    if (n.attachTo && g.nodes[n.attachTo]) return false;
    const e = entryOf(catalog, n.product);
    return !!e && placementOf(e).container === 'vpc';
  });
}

/** The open region a group's label or id names, when it names one. */
function groupRegion(grp: GraphGroup): string | undefined {
  const ids = regionMentions(`${grp.label} ${grp.id}`);
  return ids.find(isOpenRegion) ?? ids[0];
}

/**
 * Repair (c): VPC resources and no VPC group at all. Creates a VPC in the region group that holds them (or the region
 * group of a pinned region, else the one holding most of them), creating a region group first when there is none:
 * its region comes from the pinned constraints, else from a region the diagram's labels name, else the default.
 */
function ensureVpc(g: Graph, catalog: Catalog, opts: RepairOptions, fixes: Warning[]): void {
  const groups = Object.values(g.groups);
  if (groups.some((x) => x.kind === 'vpc')) return;
  const members = vpcResources(g, catalog);
  if (!members.length) return;
  const allowed = allowedRegions(opts.constraints);
  const regionOf = (n: GraphNode): string | undefined => chainOf(g, n.group).find((x) => x.kind === 'region')?.id;
  const regionGroups = groups.filter((x) => x.kind === 'region');
  const created: string[] = [];
  let primary: string;
  if (regionGroups.length) {
    const count = new Map<string, number>();
    for (const n of members) {
      const r = regionOf(n);
      if (r) count.set(r, (count.get(r) ?? 0) + 1);
    }
    const score = (r: GraphGroup): number => (allowed && allowed.includes(groupRegion(r) ?? '') ? 1000 : 0) + (count.get(r.id) ?? 0);
    primary = regionGroups.reduce((best, r) => (score(r) > score(best) ? r : best)).id;
  } else {
    const named = regionMentions([...groups.map((x) => x.label), ...Object.values(g.nodes).map((n) => n.label)].join(' | ')).filter(isOpenRegion);
    const fallback = opts.defaultRegion && isOpenRegion(opts.defaultRegion) ? opts.defaultRegion : DEFAULT_REGION;
    const rid = (allowed && allowed[0]) ?? named[0] ?? fallback;
    primary = freeId(g, 'region');
    g.groups[primary] = { id: primary, kind: 'region', label: regionLabel(rid), parent: null };
    created.push(primary);
  }
  const vpcOf = new Map<string, string>();
  const vpcIn = (rid: string): string => {
    let v = vpcOf.get(rid);
    if (!v) {
      v = freeId(g, vpcOf.size ? `vpc-${rid}` : 'vpc');
      g.groups[v] = { id: v, kind: 'vpc', label: 'VPC', parent: rid };
      vpcOf.set(rid, v);
      created.push(v);
    }
    return v;
  };
  const home = (n: GraphNode): string => regionOf(n) ?? primary;
  const ordered = [...members.filter((n) => home(n) === primary), ...members.filter((n) => home(n) !== primary)];
  for (const n of ordered) g.nodes[n.id] = makeNode({ ...n, group: vpcIn(home(n)) });
  const where = [...vpcOf].map(([r, v]) => `'${v}' in '${r}'`).join(', ');
  const made = created.filter((id) => g.groups[id].kind === 'region').map((id) => `region group '${id}' (${g.groups[id].label}), `).join('');
  fixes.push(
    W('missing-group', [...created, ...ordered.map((n) => n.id)], `VPC resources ${ordered.map((n) => `'${n.id}'`).join(', ')} had no VPC group; created ${made}VPC ${where} and moved them in`, 'warn', true),
  );
}

const isDataEdge = (e: GraphEdge): boolean => !e.kind || e.kind === 'data';

/**
 * Repair (d): a linear chain of edge-tier hops (pathRank between users and the load balancers: ESA, CDN, Anti-DDoS
 * Proxy, WAF drawn inline) whose ranks are out of order is rewired into rank order. Each hop after the first has one
 * incoming data edge, the chain has one way forward, and a same-rank peer (ESA next to CDN) is a branch, not a hop.
 * Data and resolve edges into the chain move to the new first hop, the chain's own edges keep their ids (on the same
 * pair of nodes where possible), the edge to the origin (the lowest-ranked next node beyond the chain's ranks) moves
 * to the new last hop, and every other edge stays where it is (ESA keeps its OSS origin and its CDN branch).
 */
function reorderEdgeChains(g: Graph, catalog: Catalog, fixes: Warning[], dropEdge: (id: string) => void): void {
  const rankOf = (id: string): number | undefined => {
    const n = g.nodes[id];
    if (!n || (n.attachTo && g.nodes[n.attachTo])) return undefined;
    const e = entryOf(catalog, n.product);
    return e && !isDns(e) && typeof e.pathRank === 'number' ? e.pathRank : undefined;
  };
  const tier = (id: string): boolean => {
    const r = rankOf(id);
    return r !== undefined && r > 0 && r < 30;
  };
  const tried = new Set<string>();
  for (let round = 0; round < 8; round++) {
    const data = Object.values(g.edges).filter(isDataEdge);
    const ins = (id: string): GraphEdge[] => data.filter((e) => e.to === id);
    const outs = (id: string): GraphEdge[] => data.filter((e) => e.from === id);
    const inv = data.find((e) => !tried.has(e.id) && tier(e.from) && tier(e.to) && (rankOf(e.from) as number) > (rankOf(e.to) as number));
    if (!inv) return;
    tried.add(inv.id);
    let start = inv.from;
    const back = new Set([start]);
    for (;;) {
      const i = ins(start);
      if (i.length !== 1) break;
      const p = i[0].from;
      if (back.has(p) || !tier(p) || rankOf(p) === rankOf(start) || outs(p).filter((e) => tier(e.to) && rankOf(e.to) !== rankOf(p)).length !== 1) break;
      back.add(p);
      start = p;
    }
    const chain = [start];
    for (let cur = start; ; ) {
      const next = outs(cur).filter((e) => tier(e.to) && rankOf(e.to) !== rankOf(cur)); // a same-rank peer (ESA and CDN) is a branch, not a hop
      if (next.length !== 1) break;
      const t = next[0].to;
      if (chain.includes(t) || ins(t).length !== 1) break;
      chain.push(t);
      cur = t;
    }
    const ia = chain.indexOf(inv.from);
    if (ia < 0 || chain[ia + 1] !== inv.to) continue;
    const sorted = chain.slice().sort((a, b) => (rankOf(a) as number) - (rankOf(b) as number));
    if (sorted.every((id, k) => id === chain[k])) continue;
    const chainEdges = chain.slice(0, -1).map((id, k) => data.find((e) => e.from === id && e.to === chain[k + 1]) as GraphEdge);
    // DNS records point at the first hop too, so resolve edges into the chain move with the data edges
    const entry = Object.values(g.edges).filter((e) => e.to === chain[0] && !chain.includes(e.from) && (isDataEdge(e) || e.kind === 'resolve'));
    const last = chain[chain.length - 1];
    const top = Math.max(...chain.map((id) => rankOf(id) as number));
    const ranked = outs(last).filter((e) => !chain.includes(e.to) && (rankOf(e.to) ?? -1) > top);
    const minRank = Math.min(...ranked.map((e) => rankOf(e.to) as number));
    const tail = ranked.filter((e) => rankOf(e.to) === minRank);
    const pool = chainEdges.slice();
    const rest: Array<[string, string]> = [];
    const plan: Array<[GraphEdge, string, string]> = [];
    for (let k = 0; k + 1 < sorted.length; k++) {
      const a = sorted[k];
      const b = sorted[k + 1];
      const i = pool.findIndex((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
      if (i >= 0) plan.push([pool.splice(i, 1)[0], a, b]);
      else rest.push([a, b]);
    }
    for (const [a, b] of rest) plan.push([pool.shift() as GraphEdge, a, b]);
    for (const [e, a, b] of plan) g.edges[e.id] = makeEdge({ ...e, from: a, to: b });
    for (const e of entry) g.edges[e.id] = makeEdge({ ...e, to: sorted[0] });
    for (const e of tail) g.edges[e.id] = makeEdge({ ...e, from: sorted[sorted.length - 1] });
    for (const e of [...entry, ...plan.map((x) => x[0]), ...tail]) {
      const now = g.edges[e.id];
      if (now && Object.values(g.edges).some((f) => f.id !== now.id && f.from === now.from && f.to === now.to)) dropEdge(now.id);
    }
    const ids = [...entry, ...chainEdges, ...tail].map((e) => e.id);
    fixes.push(W('path-order', ids, `request path ${chain.join(' -> ')} ran against the rank order; rewired to ${sorted.join(' -> ')}`, 'warn', true));
  }
}

const ORPHAN_DATA_LANES: ReadonlySet<string> = new Set(['cache', 'database', 'search', 'filestore']);

/**
 * Repair (e): orphans with exactly one possible partner. A DNS resolver with no edges and exactly one client node
 * gets a resolve edge from it; a VPC cache, database, search or file store with no edges in a diagram with exactly
 * one compute node gets an edge from that node. Every other orphan is left for the model.
 */
function connectOrphans(g: Graph, catalog: Catalog, fixes: Warning[]): void {
  const nodes = Object.values(g.nodes);
  if (nodes.length < 2) return;
  const card = (n: GraphNode): boolean => !(n.attachTo && g.nodes[n.attachTo]);
  const degree = new Map<string, number>();
  for (const e of Object.values(g.edges)) for (const x of [e.from, e.to]) degree.set(x, (degree.get(x) ?? 0) + 1);
  const ent = (n: GraphNode): CatalogEntry | undefined => entryOf(catalog, n.product);
  const clients = nodes.filter((n) => card(n) && ent(n)?.scope === 'external' && ent(n)?.lane === 'clients');
  const computes = nodes.filter((n) => card(n) && ent(n)?.lane === 'compute');
  const link = (from: GraphNode, to: GraphNode, kind: EdgeKind | undefined, why: string): void => {
    const id = freeId(g, `e-${from.id}-${to.id}`);
    g.edges[id] = makeEdge({ id, from: from.id, to: to.id, kind });
    fixes.push(W('orphan-node', [to.id, id], `'${to.id}' (${to.product}) had no connections; ${why}, so edge '${id}' (${from.id} -> ${to.id}) was added`, 'warn', true));
  };
  for (const n of nodes) {
    if (!card(n) || degree.get(n.id)) continue;
    const e = ent(n);
    if (!e || QUIET_LANES.has(e.lane)) continue;
    if (isDns(e) && clients.length === 1) link(clients[0], n, 'resolve', `'${clients[0].id}' is the only client`);
    else if (e.scope === 'vpc' && ORPHAN_DATA_LANES.has(e.lane) && computes.length === 1 && computes[0].id !== n.id) {
      link(computes[0], n, undefined, `'${computes[0].id}' is the only compute node`);
    }
  }
}

/**
 * Deterministic fixes, in order: structural cleanup, group nesting, per-zone replicas to one node with zones[],
 * attachments (an inline attachable next to a catalog host becomes a badge; a broken attachTo is re-targeted to the
 * only valid host, else becomes an edge (attach-invalid) or, for an attachment such as Auto Scaling, the node is
 * removed), a VPC group (and region group) for VPC resources drawn without one, containment by catalog scope
 * (respecting vpcAttachable), DNS data edges to 'resolve', the Edge column rewired into request-path order, orphans
 * with exactly one possible partner connected, and the node and edge caps. Every fix is a warning with repaired: true.
 * Never mutates the input. Remaining path-order and orphan findings are reported for the model.
 */
export function repairGraph(graph: Graph, catalog: Catalog, opts: RepairOptions = {}): RepairResult {
  const keepInline: ReadonlySet<string> = new Set(opts.keepInline ?? []);
  const g = copyGraph(graph);
  const fixes: Warning[] = [];
  const tombstones: Array<GraphNode | GraphEdge | GraphGroup> = [];
  const dropEdge = (id: string): void => {
    const e = g.edges[id];
    if (!e) return;
    tombstones.push(e);
    delete g.edges[id];
  };
  const dropNode = (id: string): void => {
    const n = g.nodes[id];
    if (!n) return;
    tombstones.push(n);
    delete g.nodes[id];
    for (const e of Object.values(g.edges)) if (e.from === id || e.to === id) dropEdge(e.id);
    for (const m of Object.values(g.nodes)) if (m.attachTo === id) g.nodes[m.id] = makeNode({ ...m, attachTo: undefined });
  };
  const setNode = (id: string, patch: Partial<GraphNode>): void => {
    g.nodes[id] = makeNode({ ...g.nodes[id], ...patch });
  };
  const duplicate = (from: string, to: string, self: string): boolean =>
    Object.values(g.edges).some((f) => f.id !== self && f.from === from && f.to === to);

  // 1. structural cleanup for graphs that did not come through the reducer
  for (const n of Object.values(g.nodes)) {
    const e = entryOf(catalog, n.product);
    if (!e) {
      dropNode(n.id);
      fixes.push(W('unknown-product', [n.id], `'${n.id}' used unknown product '${clip(n.product)}'; removed`, 'error', true));
    } else if (e.id !== n.product) {
      setNode(n.id, { product: e.id });
      fixes.push(W('alias-resolved', [n.id], `'${n.id}' product '${clip(n.product)}' canonicalized to '${e.id}'`, 'info', true));
    }
  }
  g.recs = g.recs.filter((r) => {
    const e = entryOf(catalog, r.product);
    if (!e) fixes.push(W('unknown-product', [r.product], `rec with unknown product '${clip(r.product)}' removed`, 'error', true));
    else if (e.id !== r.product) {
      fixes.push(W('alias-resolved', [r.product], `rec '${clip(r.product)}' canonicalized to '${e.id}'`, 'info', true));
      r.product = e.id;
    }
    return !!e;
  });
  for (const grp of Object.values(g.groups)) {
    if (grp.parent !== null && !g.groups[grp.parent]) {
      fixes.push(W('missing-group', [grp.id, grp.parent], `group '${grp.id}' had unknown parent '${grp.parent}'; moved to the root`, 'warn', true));
      g.groups[grp.id] = { ...grp, parent: null };
    }
  }
  for (const n of Object.values(g.nodes)) {
    if (n.group !== null && !g.groups[n.group]) {
      fixes.push(W('missing-group', [n.id, n.group], `'${n.id}' was in unknown group '${n.group}'; re-placed by scope`, 'warn', true));
      setNode(n.id, { group: null });
    }
  }
  for (const e of Object.values(g.edges)) {
    const missing = [e.from, e.to].filter((x) => !endpointExists(g, x));
    if (missing.length) {
      dropEdge(e.id);
      fixes.push(W('dangling-edge', [e.id, ...missing], `edge '${e.id}' pointed to missing ${missing.join(' and ')}; removed`, 'warn', true));
    } else if (e.from === e.to) {
      dropEdge(e.id);
      fixes.push(W('bad-op', [e.id], `self-loop edge '${e.id}' removed`, 'warn', true));
    }
  }

  // 2. group nesting (run again after repair (c) creates a VPC: zone and subnet groups outside every VPC go into it in the same pass)
  const nestGroups = (): void => {
    for (let round = 0; round < 4; round++) {
      const moves = groupNestingMoves(g);
      if (!moves.length) break;
      for (const m of moves) {
        const grp = g.groups[m.id];
        if (!grp || grp.parent === m.target) continue;
        if (m.target !== null && chainOf(g, m.target).some((x) => x.id === m.id)) continue; // would cycle
        g.groups[m.id] = { ...grp, parent: m.target };
        fixes.push(W('containment', [m.id], `${m.msg}; moved to ${m.target ? `'${m.target}'` : 'the root'}`, m.severity, true));
      }
    }
  };
  nestGroups();

  // 3. per-zone replicas -> one node with zones[] (one set at a time, since a merge can expose the next one)
  for (let round = 0; round < 12; round++) {
    const s = findReplicaSets(g)[0];
    if (!s) break;
    const degree = (id: string): number => Object.values(g.edges).filter((e) => e.from === id || e.to === id).length;
    let survivor = s.spanning ?? s.members[0];
    if (!s.spanning) for (const id of s.members) if (degree(id) > degree(survivor)) survivor = id;
    const others = new Set(s.members.filter((id) => id !== survivor));
    for (const e of Object.values(g.edges)) {
      if (!others.has(e.from) && !others.has(e.to)) continue;
      const from = others.has(e.from) ? survivor : e.from;
      const to = others.has(e.to) ? survivor : e.to;
      if (from === to || duplicate(from, to, e.id)) dropEdge(e.id);
      else g.edges[e.id] = makeEdge({ ...e, from, to });
    }
    for (const m of Object.values(g.nodes)) if (m.attachTo && others.has(m.attachTo)) setNode(m.id, { attachTo: survivor });
    for (const id of others) {
      tombstones.push(g.nodes[id]);
      delete g.nodes[id];
    }
    const S = g.nodes[survivor];
    const zones = [...new Set([...(S.zones ?? []), ...s.letters])].sort();
    let label = S.label;
    if (!s.spanning) label = stripReplicaTokens(S.label, s.letters[s.members.indexOf(survivor)]) || S.label;
    setNode(survivor, { group: s.parent, zones, label });
    const how = s.spanning ? `merged into '${survivor}'` : `collapsed into '${survivor}'`;
    fixes.push(W('zone-replicas', [survivor, ...others], `per-zone ${S.product} nodes ${s.members.join(', ')} ${how} with zones [${zones.join(', ')}]`, 'warn', true));
  }

  // 4. attachments: badges get no edges of their own; inline attachables next to a catalog host become badges;
  //    a broken attachTo is re-targeted to the only valid host, else turned into an edge (attach-invalid), and an
  //    attachment (Auto Scaling, EIP, disks) with no host to sit on is removed
  for (let round = 0; round < 3; round++) {
    const plan = attachFixes(g, catalog, keepInline);
    if (!plan.length) break;
    let applied = 0;
    for (const f of plan) {
      const x = g.nodes[f.id];
      if (!x) continue;
      if (f.action === 'drop') {
        const ex = entryOf(catalog, x.product);
        const now = x.attachTo ? g.nodes[x.attachTo] : undefined;
        if (now && !now.attachTo && ex && ex.attach && ex.attach.hosts.includes(now.product)) continue; // stale after an earlier fix
        dropNode(x.id);
        fixes.push(W(f.code, [x.id], `${f.msg}; no valid host in the diagram, so it was removed`, f.severity, true));
        applied++;
        continue;
      }
      if (f.action === 'edge') {
        const host = f.host ? g.nodes[f.host] : undefined;
        if (!host || x.attachTo !== host.id) continue; // stale after an earlier fix
        const hostFirst = pathCompare(entryOf(catalog, x.product), entryOf(catalog, host.product)) >= 0;
        const [from, to] = hostFirst ? [host.id, x.id] : [x.id, host.id];
        setNode(x.id, { attachTo: undefined });
        const linked = Object.values(g.edges).some((ed) => (ed.from === from && ed.to === to) || (ed.from === to && ed.to === from));
        let note = 'an edge already connects them';
        if (!linked) {
          const id = freeId(g, `e-${from}-${to}`);
          g.edges[id] = makeEdge({ id, from, to });
          note = `connected by edge '${id}' (${from} -> ${to})`;
        }
        fixes.push(W('attach-invalid', [x.id, host.id], `${f.msg}; it is an ordinary node, ${note}`, 'warn', true));
        applied++;
        continue;
      }
      const h = f.host ? g.nodes[f.host] : undefined;
      const e = entryOf(catalog, x.product);
      if (f.host && (!h || h.attachTo || !e || !e.attach || !e.attach.hosts.includes(h.product))) continue; // stale after an earlier fix
      if (h) {
        for (const ed of Object.values(g.edges)) {
          if (ed.from !== x.id && ed.to !== x.id) continue;
          const other = ed.from === x.id ? ed.to : ed.from;
          if (other === h.id) {
            dropEdge(ed.id);
            continue;
          }
          const from = ed.from === x.id ? h.id : ed.from;
          const to = ed.to === x.id ? h.id : ed.to;
          if (from === to || duplicate(from, to, ed.id)) dropEdge(ed.id);
          else g.edges[ed.id] = makeEdge({ ...ed, from, to });
        }
        setNode(x.id, { attachTo: h.id, group: h.group });
        const as = e && e.attach && e.attach.as === 'attachment' ? 'an attachment' : 'a badge';
        fixes.push(W(f.code, [x.id, h.id], `${f.msg}; now ${as} on '${h.id}', its edges moved to the host`, f.severity, true));
      } else {
        setNode(x.id, { attachTo: undefined });
        fixes.push(W(f.code, [x.id], `${f.msg}; drawn on its own`, f.severity, true));
      }
      applied++;
    }
    if (!applied) break;
  }

  // 4b. VPC resources drawn without any VPC group get one (and a region group when there is none)
  const groupCount = Object.keys(g.groups).length;
  ensureVpc(g, catalog, opts, fixes);
  if (Object.keys(g.groups).length !== groupCount) nestGroups();

  // 5. containment by catalog scope
  for (let round = 0; round < 3; round++) {
    const moves = containmentMoves(g, catalog);
    let applied = 0;
    for (const m of moves) {
      const n = g.nodes[m.id];
      if (!n || n.group === m.target) continue;
      setNode(m.id, { group: m.target });
      fixes.push(W('containment', [m.id], `${m.msg}; moved to ${m.target ? `'${m.target}'` : 'the root'}`, m.severity, true));
      applied++;
    }
    if (!applied) break;
  }

  // 6. badges live in their host's container
  for (const n of Object.values(g.nodes)) {
    const h = n.attachTo ? g.nodes[n.attachTo] : undefined;
    if (h && n.group !== h.group) setNode(n.id, { group: h.group });
  }

  // 7. DNS resolves names; it is not a hop in the data path
  for (const e of dnsDataEdges(g, catalog)) {
    g.edges[e.id] = makeEdge({ ...e, kind: 'resolve' });
    fixes.push(W('dns-in-path', [e.id], `edge '${e.id}' (${e.from} -> ${e.to}) touched DNS as data; now kind 'resolve'`, 'warn', true));
  }

  // 7b. the Edge column follows the request path (ESA before Anti-DDoS, and so on)
  reorderEdgeChains(g, catalog, fixes, dropEdge);

  // 7c. orphans with exactly one possible partner
  connectOrphans(g, catalog, fixes);

  // 8. caps
  const nodeIds = Object.keys(g.nodes);
  if (nodeIds.length > DEFAULT_LIMITS.maxNodes) {
    const extra = nodeIds.slice(DEFAULT_LIMITS.maxNodes);
    for (const id of extra) dropNode(id);
    fixes.push(W('cap-exceeded', extra, `${nodeIds.length} nodes; kept the first ${DEFAULT_LIMITS.maxNodes}`, 'error', true));
  }
  const edgeIds = Object.keys(g.edges);
  if (edgeIds.length > DEFAULT_LIMITS.maxEdges) {
    const extra = edgeIds.slice(DEFAULT_LIMITS.maxEdges);
    for (const id of extra) dropEdge(id);
    fixes.push(W('cap-exceeded', extra, `${edgeIds.length} edges; kept the first ${DEFAULT_LIMITS.maxEdges}`, 'error', true));
  }

  const out: Graph = { groups: { ...g.groups }, nodes: { ...g.nodes }, edges: { ...g.edges }, recs: g.recs };
  return { graph: out, warnings: [...fixes, ...checkGraph(out, catalog, { keepInline })], tombstones };
}
