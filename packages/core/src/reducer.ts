// Graph reducer for op grammar v2. applyOp() is pure with respect to the graph: it never mutates its input and
// returns a new graph object when anything changed (the same object when nothing did). The ctx object is the
// stateful part: the pending-edge buffer, groups an element is waiting for, and aliases for non-container groups.
// One ctx per session; done (or endTurn) flushes the per-turn parts. Browser-safe: no Node APIs.
import type {
  ApplyResult,
  EdgeKind,
  Graph,
  GraphEdge,
  GraphGroup,
  GraphNode,
  Op,
  Recommendation,
  Warning,
  WarningCode,
} from './types.ts';

export interface Limits {
  maxNodes: number;
  maxEdges: number;
  maxGroups: number;
  maxPending: number;
  maxRecs: number;
}

/** Server-side caps from the gap review: about 80 nodes and 120 edges per graph. */
export const DEFAULT_LIMITS: Limits = { maxNodes: 80, maxEdges: 120, maxGroups: 40, maxPending: 120, maxRecs: 20 };

export interface ApplyCtx {
  /** Edges whose endpoints have not arrived yet. They are added as soon as both exist, and dropped at done. */
  pending: GraphEdge[];
  /** Element id -> group id it named before that group existed. Applied when the group arrives, cleared at done. */
  pendingParent: Record<string, string>;
  /** Group ids the validator dropped because their kind is not a network container (e.g. 'managed'), mapped to the
   * container their members belong in. Kept for the whole session. Written by validateOp(raw, catalog, ctx). */
  groupAlias: Record<string, string | null>;
  /** Ids removed during the current turn, so a later explicit remove of a cascaded edge says so. */
  removedThisTurn: string[];
  limits: Limits;
}

export function createCtx(limits?: Partial<Limits>): ApplyCtx {
  return { pending: [], pendingParent: {}, groupAlias: {}, removedThisTurn: [], limits: { ...DEFAULT_LIMITS, ...limits } };
}

/** Independent copy, e.g. to branch a session for a preview. */
export function cloneCtx(ctx: ApplyCtx): ApplyCtx {
  const c = ensureCtx(ctx);
  return {
    pending: c.pending.map((e) => ({ ...e })),
    pendingParent: { ...c.pendingParent },
    groupAlias: { ...c.groupAlias },
    removedThisTurn: c.removedThisTurn.slice(),
    limits: { ...c.limits },
  };
}

export function emptyGraph(): Graph {
  return { groups: {}, nodes: {}, edges: {}, recs: [] };
}

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** Canonical element id: lower case, underscores/spaces/dots to hyphens, other characters dropped, at most 41 chars. */
export function normalizeId(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) v = String(v);
  if (typeof v !== 'string') return null;
  let s = v
    .trim()
    .toLowerCase()
    .replace(/[_\s.:/\\]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > 41) s = s.slice(0, 41).replace(/-+$/, '');
  if (s in Object.prototype) s += '-id'; // 'constructor' would shadow an inherited property in plain-object lookups
  return s && ID_PATTERN.test(s) ? s : null;
}

/** Builds a node with a fixed key order and no undefined optional keys. */
export function makeNode(n: {
  id: string;
  product: string;
  label: string;
  group: string | null;
  zones?: string[];
  attachTo?: string;
  why?: string;
}): GraphNode {
  const out: GraphNode = { id: n.id, product: n.product, label: n.label, group: n.group };
  if (n.zones && n.zones.length) out.zones = n.zones.slice();
  if (n.attachTo) out.attachTo = n.attachTo;
  if (n.why) out.why = n.why;
  return out;
}

export function makeEdge(e: { id: string; from: string; to: string; label?: string; kind?: EdgeKind }): GraphEdge {
  const out: GraphEdge = { id: e.id, from: e.from, to: e.to };
  if (e.label) out.label = e.label;
  if (e.kind) out.kind = e.kind;
  return out;
}

interface Acc {
  added: string[];
  updated: string[];
  removed: string[];
  tombstones: Array<GraphNode | GraphEdge | GraphGroup>;
  warnings: Warning[];
}

function warning(code: WarningCode, ids: string[], msg: string, severity: Warning['severity'], repaired = false): Warning {
  return { code, ids, msg, severity, repaired };
}

function ensureCtx(ctx?: Partial<ApplyCtx>): ApplyCtx {
  const c = (ctx ?? {}) as ApplyCtx;
  if (!Array.isArray(c.pending)) c.pending = [];
  if (!c.pendingParent || typeof c.pendingParent !== 'object') c.pendingParent = {};
  if (!c.groupAlias || typeof c.groupAlias !== 'object') c.groupAlias = {};
  if (!Array.isArray(c.removedThisTurn)) c.removedThisTurn = [];
  if (!c.limits || typeof c.limits.maxNodes !== 'number') c.limits = { ...DEFAULT_LIMITS, ...(c.limits ?? {}) };
  return c;
}

// Working copies use null-prototype records, so a lookup of an absent id never reaches Object.prototype.
const bare = <T>(r: Record<string, T> | undefined): Record<string, T> => Object.assign(Object.create(null) as Record<string, T>, r ?? {});
const plain = <T>(r: Record<string, T>): Record<string, T> => ({ ...r });

function draft(g: Graph): Graph {
  return { groups: bare(g.groups), nodes: bare(g.nodes), edges: bare(g.edges), recs: (g.recs ?? []).slice() };
}

function finalize(g: Graph): Graph {
  return { groups: plain(g.groups), nodes: plain(g.nodes), edges: plain(g.edges), recs: g.recs };
}

const count = (r: Record<string, unknown>): number => Object.keys(r).length;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const has = (r: Record<string, unknown>, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

/** An edge endpoint may be a node, a group, or the product id of a rec (edges between recs are allowed). */
export function endpointExists(g: Graph, id: string): boolean {
  if (has(g.nodes, id) || has(g.groups, id)) return true;
  for (const r of g.recs) if (r.product === id || normalizeId(r.product) === id) return true;
  return false;
}

function wouldCycle(g: Graph, id: string, parent: string): boolean {
  let cur: string | null = parent;
  for (let i = 0; cur !== null && i < 64; i++) {
    if (cur === id) return true;
    const grp: GraphGroup | undefined = g.groups[cur];
    cur = grp ? grp.parent : null;
  }
  return false;
}

function freeEdgeId(g: Graph, c: ApplyCtx, base: string): string {
  let b = normalizeId(base) ?? 'e';
  if (b.length > 36) b = b.slice(0, 36).replace(/-+$/, '');
  let id = b;
  for (let n = 2; has(g.edges, id) || has(g.nodes, id) || has(g.groups, id) || c.pending.some((e) => e.id === id); n++) {
    id = `${b}-${n}`;
  }
  return id;
}

/** Adds every pending edge whose endpoints now exist. */
function flushPending(g: Graph, c: ApplyCtx, acc: Acc): void {
  if (!c.pending.length) return;
  const keep: GraphEdge[] = [];
  for (const e of c.pending) {
    if (!endpointExists(g, e.from) || !endpointExists(g, e.to)) {
      keep.push(e);
      continue;
    }
    if (has(g.nodes, e.id) || has(g.groups, e.id)) {
      acc.warnings.push(warning('duplicate-id', [e.id], `edge '${e.id}' collides with a node or group id; dropped`, 'error'));
      continue;
    }
    const prev = g.edges[e.id];
    if (!prev && count(g.edges) >= c.limits.maxEdges) {
      acc.warnings.push(warning('cap-exceeded', [e.id], `edge cap of ${c.limits.maxEdges} reached; '${e.id}' dropped`, 'error'));
      continue;
    }
    g.edges[e.id] = e;
    (prev ? acc.updated : acc.added).push(e.id);
  }
  c.pending = keep;
}

/** Moves elements that were waiting for group `groupId` into it. */
function resolveWaiting(g: Graph, c: ApplyCtx, acc: Acc, groupId: string): void {
  for (const [child, gid] of Object.entries(c.pendingParent)) {
    if (gid !== groupId) continue;
    delete c.pendingParent[child];
    const n = g.nodes[child];
    if (n) {
      if (n.group !== groupId) {
        g.nodes[child] = makeNode({ ...n, group: groupId });
        acc.updated.push(child);
      }
      continue;
    }
    const grp = g.groups[child];
    if (grp && grp.parent !== groupId && !wouldCycle(g, child, groupId)) {
      g.groups[child] = { ...grp, parent: groupId };
      acc.updated.push(child);
    }
  }
}

/** Adds or replaces one edge, or buffers it while an endpoint is missing. */
function putEdge(g: Graph, c: ApplyCtx, acc: Acc, e: GraphEdge): void {
  if (has(g.nodes, e.id) || has(g.groups, e.id)) {
    acc.warnings.push(warning('duplicate-id', [e.id], `edge '${e.id}' collides with a node or group id; dropped`, 'error'));
    return;
  }
  if (e.from === e.to) {
    acc.warnings.push(warning('bad-op', [e.id, e.from], `edge '${e.id}' is a self-loop on '${e.from}'; dropped`, 'warn'));
    return;
  }
  const pi = c.pending.findIndex((p) => p.id === e.id);
  if (pi >= 0) c.pending.splice(pi, 1); // a newer version replaces the buffered one
  if (endpointExists(g, e.from) && endpointExists(g, e.to)) {
    const prev = g.edges[e.id];
    if (!prev) {
      if (count(g.edges) >= c.limits.maxEdges) {
        acc.warnings.push(warning('cap-exceeded', [e.id], `edge cap of ${c.limits.maxEdges} reached; '${e.id}' dropped`, 'error'));
        return;
      }
      g.edges[e.id] = e;
      acc.added.push(e.id);
    } else if (!same(prev, e)) {
      g.edges[e.id] = e;
      acc.updated.push(e.id);
    }
    return;
  }
  if (c.pending.length >= c.limits.maxPending) {
    acc.warnings.push(warning('cap-exceeded', [e.id], `pending-edge cap of ${c.limits.maxPending} reached; '${e.id}' dropped`, 'error'));
    return;
  }
  c.pending.push(e);
}

function applyGroup(g: Graph, op: Extract<Op, { t: 'group' }>, c: ApplyCtx, acc: Acc): void {
  const id = op.id;
  if (has(g.nodes, id)) {
    acc.warnings.push(warning('duplicate-id', [id], `group '${id}' collides with a node id; op dropped`, 'error'));
    return;
  }
  const prev = g.groups[id];
  const keepParent = prev ? prev.parent : null;
  let parent: string | null = op.parent === undefined ? keepParent : op.parent;
  if (parent === id) {
    acc.warnings.push(warning('bad-op', [id], `group '${id}' cannot be its own parent`, 'warn', true));
    parent = keepParent;
  }
  if (op.parent !== undefined) delete c.pendingParent[id];
  if (parent !== null && !has(g.groups, parent)) {
    c.pendingParent[id] = parent; // the parent may still arrive in this turn
    parent = keepParent !== null && has(g.groups, keepParent) ? keepParent : null;
  }
  if (parent !== null && wouldCycle(g, id, parent)) {
    acc.warnings.push(warning('bad-op', [id, parent], `group '${id}' under '${parent}' would form a cycle; parent kept`, 'warn', true));
    parent = keepParent;
  }
  const next: GraphGroup = { id, kind: op.kind, label: op.label, parent };
  if (!prev) {
    if (count(g.groups) >= c.limits.maxGroups) {
      acc.warnings.push(warning('cap-exceeded', [id], `group cap of ${c.limits.maxGroups} reached; '${id}' dropped`, 'error'));
      delete c.pendingParent[id];
      return;
    }
    g.groups[id] = next;
    acc.added.push(id);
  } else if (!same(prev, next)) {
    g.groups[id] = next;
    acc.updated.push(id);
  }
  resolveWaiting(g, c, acc, id);
  flushPending(g, c, acc);
}

function applyNode(g: Graph, op: Extract<Op, { t: 'node' }>, c: ApplyCtx, acc: Acc): void {
  const id = op.id;
  if (has(g.groups, id)) {
    acc.warnings.push(warning('duplicate-id', [id], `node '${id}' collides with a group id; op dropped`, 'error'));
    return;
  }
  const prev = g.nodes[id];
  let group: string | null = prev ? prev.group : null;
  if (op.group === null) {
    group = null;
    delete c.pendingParent[id];
  } else if (op.group !== undefined) {
    if (has(g.groups, op.group)) {
      group = op.group;
      delete c.pendingParent[id];
    } else {
      c.pendingParent[id] = op.group; // placed at its current spot (root when new) until the group arrives
    }
  }
  let attachTo = op.attachTo !== undefined ? op.attachTo : prev ? prev.attachTo : undefined;
  if (attachTo === id) {
    acc.warnings.push(warning('bad-op', [id], `node '${id}' cannot attach to itself`, 'info', true));
    attachTo = undefined;
  }
  const zones = op.zones !== undefined ? op.zones : prev ? prev.zones : undefined;
  const why = op.why !== undefined ? op.why : prev ? prev.why : undefined;
  const next = makeNode({ id, product: op.product, label: op.label, group, zones, attachTo, why });
  if (!prev) {
    if (count(g.nodes) >= c.limits.maxNodes) {
      acc.warnings.push(warning('cap-exceeded', [id], `node cap of ${c.limits.maxNodes} reached; '${id}' dropped`, 'error'));
      delete c.pendingParent[id];
      return;
    }
    g.nodes[id] = next;
    acc.added.push(id);
  } else if (!same(prev, next)) {
    g.nodes[id] = next;
    acc.updated.push(id);
  }
  flushPending(g, c, acc);
}

function applyInsert(g: Graph, op: Extract<Op, { t: 'insert' }>, c: ApplyCtx, acc: Acc): void {
  const id = op.id;
  if (has(g.groups, id)) {
    acc.warnings.push(warning('duplicate-id', [id], `insert '${id}' collides with a group id; op dropped`, 'error'));
    return;
  }
  let on: GraphEdge | undefined = g.edges[op.on];
  let onPending = false;
  if (!on) {
    on = c.pending.find((e) => e.id === op.on);
    onPending = on !== undefined;
  }
  const prev = g.nodes[id];
  let group: string | null = prev ? prev.group : null;
  if (!prev && on) {
    const a = g.nodes[on.from];
    const b = g.nodes[on.to];
    group = a ? a.group : b ? b.group : null; // a hint only: the validator re-places by catalog scope
  }
  const next = makeNode({
    id,
    product: op.product,
    label: op.label,
    group,
    zones: prev ? prev.zones : undefined,
    attachTo: prev ? prev.attachTo : undefined,
    why: op.why !== undefined ? op.why : prev ? prev.why : undefined,
  });
  if (!prev) {
    if (count(g.nodes) >= c.limits.maxNodes) {
      acc.warnings.push(warning('cap-exceeded', [id], `node cap of ${c.limits.maxNodes} reached; '${id}' dropped`, 'error'));
      return;
    }
    g.nodes[id] = next;
    acc.added.push(id);
    delete c.pendingParent[id];
  } else if (!same(prev, next)) {
    g.nodes[id] = next;
    acc.updated.push(id);
  }
  if (!on) {
    acc.warnings.push(warning('unknown-id', [op.on, id], `insert: edge '${op.on}' not found; '${id}' added without connections`, 'warn'));
    flushPending(g, c, acc);
    return;
  }
  if (on.from === id || on.to === id) {
    acc.warnings.push(warning('bad-op', [op.on, id], `insert: edge '${op.on}' already touches '${id}'; not split`, 'info'));
    flushPending(g, c, acc);
    return;
  }
  const old = on;
  if (onPending) {
    c.pending = c.pending.filter((e) => e.id !== old.id);
  } else {
    delete g.edges[old.id];
    acc.removed.push(old.id);
    acc.tombstones.push(old);
    c.removedThisTurn.push(old.id);
  }
  // from -> id keeps the old label and kind; id -> to keeps the kind
  putEdge(g, c, acc, makeEdge({ id: freeEdgeId(g, c, `e-${old.from}-${id}`), from: old.from, to: id, label: old.label, kind: old.kind }));
  putEdge(g, c, acc, makeEdge({ id: freeEdgeId(g, c, `e-${id}-${old.to}`), from: id, to: old.to, kind: old.kind }));
  flushPending(g, c, acc);
}

function applyMove(g: Graph, op: Extract<Op, { t: 'move' }>, c: ApplyCtx, acc: Acc): void {
  const { id, to } = op;
  const node = g.nodes[id];
  const grp = g.groups[id];
  if (!node && !grp) {
    acc.warnings.push(warning('unknown-id', [id], `move: unknown id '${id}'; no-op`, 'info'));
    return;
  }
  if (to !== null && !has(g.groups, to)) {
    c.pendingParent[id] = to; // applied if the group arrives in this turn
    return;
  }
  delete c.pendingParent[id];
  if (node) {
    if (node.group !== to) {
      g.nodes[id] = makeNode({ ...node, group: to });
      acc.updated.push(id);
    }
    return;
  }
  if (to === id || (to !== null && wouldCycle(g, id, to))) {
    acc.warnings.push(warning('bad-op', [id, String(to)], `move: group '${id}' into '${to}' would form a cycle; no-op`, 'warn'));
    return;
  }
  if (grp.parent !== to) {
    g.groups[id] = { ...grp, parent: to };
    acc.updated.push(id);
  }
}

function cascadeEdges(g: Graph, c: ApplyCtx, acc: Acc, endpoint: string): void {
  for (const [eid, e] of Object.entries(g.edges)) {
    if (e.from !== endpoint && e.to !== endpoint) continue;
    delete g.edges[eid];
    acc.removed.push(eid);
    acc.tombstones.push(e);
    c.removedThisTurn.push(eid);
  }
}

function applyRemove(g: Graph, op: Extract<Op, { t: 'remove' }>, c: ApplyCtx, acc: Acc): void {
  const id = op.id;
  const node = g.nodes[id];
  if (node) {
    delete g.nodes[id];
    acc.removed.push(id);
    acc.tombstones.push(node);
    c.removedThisTurn.push(id);
    delete c.pendingParent[id];
    cascadeEdges(g, c, acc, id);
    for (const [nid, m] of Object.entries(g.nodes)) {
      if (m.attachTo !== id) continue;
      g.nodes[nid] = makeNode({ ...m, attachTo: undefined });
      acc.updated.push(nid);
      acc.warnings.push(warning('attach-host-missing', [nid, id], `'${nid}' was attached to removed '${id}'; now drawn on its own`, 'info', true));
    }
    return;
  }
  const grp = g.groups[id];
  if (grp) {
    delete g.groups[id];
    acc.removed.push(id);
    acc.tombstones.push(grp);
    c.removedThisTurn.push(id);
    delete c.pendingParent[id];
    for (const [gid, x] of Object.entries(g.groups)) {
      if (x.parent !== id) continue;
      g.groups[gid] = { ...x, parent: grp.parent };
      acc.updated.push(gid);
    }
    for (const [nid, n] of Object.entries(g.nodes)) {
      if (n.group !== id) continue;
      g.nodes[nid] = makeNode({ ...n, group: grp.parent });
      acc.updated.push(nid);
    }
    for (const [k, v] of Object.entries(c.groupAlias)) if (v === id) c.groupAlias[k] = grp.parent;
    cascadeEdges(g, c, acc, id);
    return;
  }
  const edge = g.edges[id];
  if (edge) {
    delete g.edges[id];
    acc.removed.push(id);
    acc.tombstones.push(edge);
    c.removedThisTurn.push(id);
    return;
  }
  const pi = c.pending.findIndex((e) => e.id === id);
  if (pi >= 0) {
    c.pending.splice(pi, 1); // never drawn, so nothing to tombstone
    return;
  }
  const ri = g.recs.findIndex((r) => r.product === id || normalizeId(r.product) === id);
  if (ri >= 0) {
    const rec = g.recs[ri];
    g.recs.splice(ri, 1);
    acc.removed.push('rec:' + rec.product);
    c.removedThisTurn.push(id);
    cascadeEdges(g, c, acc, id);
    if (rec.product !== id) cascadeEdges(g, c, acc, rec.product);
    return;
  }
  const already = c.removedThisTurn.includes(id);
  acc.warnings.push(
    warning('unknown-id', [id], already ? `remove: '${id}' was already removed in this turn (cascade); no-op` : `remove: unknown id '${id}'; no-op`, 'info'),
  );
}

function applyRec(g: Graph, op: Extract<Op, { t: 'rec' }>, c: ApplyCtx, acc: Acc): void {
  const next: Recommendation = { product: op.product, fit: op.fit, why: op.why };
  const i = g.recs.findIndex((r) => r.product === op.product);
  if (i < 0) {
    if (g.recs.length >= c.limits.maxRecs) {
      acc.warnings.push(warning('cap-exceeded', [op.product], `rec cap of ${c.limits.maxRecs} reached; '${op.product}' dropped`, 'error'));
      return;
    }
    g.recs.push(next);
    acc.added.push('rec:' + op.product);
    flushPending(g, c, acc);
  } else if (!same(g.recs[i], next)) {
    g.recs[i] = next;
    acc.updated.push('rec:' + op.product);
  }
}

function uniq(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Ends a turn: drops pending edges that never resolved (dangling-edge), reports elements whose group never
 * arrived (missing-group; they keep their placement), and clears the per-turn state. The done op calls this;
 * call it yourself when a stream ends without done.
 */
export function endTurn(graph: Graph, ctx?: ApplyCtx): ApplyResult {
  const c = ensureCtx(ctx);
  const warnings: Warning[] = [];
  for (const e of c.pending) {
    const missing = [e.from, e.to].filter((x) => !endpointExists(graph, x));
    warnings.push(
      warning('dangling-edge', [e.id, e.from, e.to], `edge '${e.id}' (${e.from} -> ${e.to}) dropped at done; missing ${missing.map((m) => `'${m}'`).join(' and ') || 'endpoint'}`, 'warn'),
    );
  }
  c.pending = [];
  for (const [child, gid] of Object.entries(c.pendingParent)) {
    if (!has(graph.nodes, child) && !has(graph.groups, child)) continue;
    warnings.push(warning('missing-group', [child, gid], `'${child}' named unknown group '${gid}'; left where it was`, 'warn', true));
  }
  c.pendingParent = {};
  c.removedThisTurn = [];
  return { graph, added: [], updated: [], removed: [], tombstones: [], warnings };
}

export function applyOp(graph: Graph, op: Op, ctx?: ApplyCtx): ApplyResult {
  const own = ctx === undefined;
  const c = ensureCtx(ctx);
  if (op.t === 'done') return endTurn(graph, c);
  const acc: Acc = { added: [], updated: [], removed: [], tombstones: [], warnings: [] };
  if (op.t === 'say' || op.t === 'plan' || op.t === 'req' || op.t === 'gap' || op.t === 'assume' || op.t === 'ask') {
    // not graph ops: assume and ask feed the console's chips and questions (llm.ts collects them into memory)
    return { graph, ...acc };
  }
  const g = draft(graph);
  switch (op.t) {
    case 'group':
      applyGroup(g, op, c, acc);
      break;
    case 'node':
      applyNode(g, op, c, acc);
      break;
    case 'edge':
      putEdge(g, c, acc, makeEdge(op));
      break;
    case 'insert':
      applyInsert(g, op, c, acc);
      break;
    case 'move':
      applyMove(g, op, c, acc);
      break;
    case 'remove':
      applyRemove(g, op, c, acc);
      break;
    case 'rec':
      applyRec(g, op, c, acc);
      break;
    default:
      acc.warnings.push(warning('bad-op', [], `unknown op type '${String((op as { t?: unknown }).t)}'`, 'error'));
  }
  if (own) acc.warnings.push(...endTurn(g, c).warnings); // nobody holds this ctx, so nothing buffered can resolve later
  const added = uniq(acc.added);
  const removed = uniq(acc.removed);
  const updated = uniq(acc.updated).filter((x) => !added.includes(x) && !removed.includes(x));
  const changed = added.length + updated.length + removed.length > 0;
  return { graph: changed ? finalize(g) : graph, added, updated, removed, tombstones: acc.tombstones, warnings: acc.warnings };
}
