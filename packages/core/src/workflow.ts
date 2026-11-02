// Reducer for the workflow document (PLAN.md section 3), beside the cloud graph's reducer.ts.
// Ops never mutate the input graph; the turn context holds links waiting for an endpoint.
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowGroup, WorkflowOp, Warning } from './types.ts';
import { normalizeId } from './reducer.ts';

export interface WorkflowLimits {
  maxNodes: number;
  maxEdges: number;
  maxGroups: number;
  maxPending: number;
}

export const DEFAULT_WORKFLOW_LIMITS: WorkflowLimits = { maxNodes: 40, maxEdges: 60, maxGroups: 8, maxPending: 60 };

export interface WorkflowCtx {
  pending: WorkflowEdge[];
  removedThisTurn: string[];
  limits: WorkflowLimits;
}

export interface WorkflowApplyResult {
  workflow: WorkflowGraph;
  added: string[];
  updated: string[];
  removed: string[];
  tombstones: Array<WorkflowNode | WorkflowEdge | WorkflowGroup>;
  warnings: Warning[];
}

export function emptyWorkflow(): WorkflowGraph {
  return { nodes: {}, edges: {}, groups: {} };
}

export function createWorkflowCtx(limits: Partial<WorkflowLimits> = {}): WorkflowCtx {
  return { pending: [], removedThisTurn: [], limits: { ...DEFAULT_WORKFLOW_LIMITS, ...limits } };
}

/** Builds a step with a fixed key order and no undefined optional keys. */
export function makeStep(n: WorkflowNode): WorkflowNode {
  const out: WorkflowNode = { id: n.id, kind: n.kind, label: n.label };
  const keys = [
    'task', 'after', 'on', 'product', 'runs', 'ai', 'tool', 'turns', 'effect',
    'untrusted', 'private', 'approval', 'subject', 'join', 'repeat', 'why',
  ] as const;
  for (const k of keys) {
    if (n[k] !== undefined) Object.assign(out, { [k]: n[k] });
  }
  return out;
}

/** Builds a link with a fixed key order and no undefined optional keys. */
export function makeLink(e: WorkflowEdge): WorkflowEdge {
  const out: WorkflowEdge = { id: e.id, from: e.from, to: e.to };
  for (const k of ['kind', 'label', 'max', 'outcome'] as const) {
    if (e[k] !== undefined) Object.assign(out, { [k]: e[k] });
  }
  return out;
}

const has = (r: object, id: string): boolean => Object.hasOwn(r, id);
const byId = (a: { id: string }, b: { id: string }): number => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const sorted = <T extends { id: string }>(r: Record<string, T>): T[] => Object.values(r).sort(byId);

// Keep generated references canonical, including when a suffix must fit a 41-character base.
export function allocateWorkflowId(base: string, used: (id: string) => boolean): string {
  const normalized = normalizeId(base) ?? 'id';
  let id = normalized;
  for (let i = 2; used(id); i++) {
    const suffix = `-${i}`;
    id = normalized.slice(0, 41 - suffix.length).replace(/-+$/, '') + suffix;
  }
  return id;
}

interface ApplyState {
  g: WorkflowGraph;
  ctx: WorkflowCtx;
  queue: { pending: WorkflowEdge[] };
  result: WorkflowApplyResult;
}

/** Appends an op warning without changing the graph. */
function warn(s: ApplyState, code: Warning['code'], id: string, msg: string, severity: Warning['severity'] = 'info'): void {
  s.result.warnings.push({ code, ids: [id], msg, severity, repaired: false });
}

/** Reserves the shared id namespace while allowing an element to replace itself. */
function free(s: ApplyState, id: string, own?: keyof WorkflowGraph): string {
  const { g, queue } = s;
  const used = (candidate: string): boolean =>
    (['nodes', 'edges', 'groups'] as const).some((k) => k !== own && has(g[k], candidate))
    || (candidate !== id && own !== undefined && has(g[own], candidate))
    || queue.pending.some((e) => e.id === candidate && !(own === 'edges' && candidate === id));
  const next = own !== undefined && !used(id) ? id : allocateWorkflowId(id, used);
  if (next !== id) warn(s, 'wf-id-collision', id, `Id '${id}' is already used; using '${next}'.`);
  return next;
}

/** Upserts within the cap and records only actual changes. */
function put<T extends WorkflowNode | WorkflowEdge | WorkflowGroup>(
  s: ApplyState, key: keyof WorkflowGraph, value: T, cap: number,
): boolean {
  const map = s.g[key] as Record<string, T>;
  const exists = has(map, value.id);
  if (!exists && Object.keys(map).length >= cap) {
    warn(s, 'cap-exceeded', value.id, `The ${key} limit is ${cap}; '${value.id}' was dropped.`, 'warn');
    return false;
  }
  if (exists && JSON.stringify(map[value.id]) === JSON.stringify(value)) return true;
  map[value.id] = value;
  (exists ? s.result.updated : s.result.added).push(value.id);
  return true;
}

/** Adds a link, or queues it until both endpoints arrive. */
function link(s: ApplyState, e: WorkflowEdge, queued?: WorkflowEdge): boolean {
  const { g, ctx, queue } = s;
  if (e.from === e.to) {
    warn(s, 'wf-bad-op', e.id, `Link '${e.id}' cannot connect a step to itself.`, 'warn');
    return false;
  }
  // Match before allocation: a renamed link must not consume a different queued request.
  const old = queued ? queue.pending.indexOf(queued) : queue.pending.findIndex((p) => p.id === e.id);
  const id = free(s, e.id, 'edges');
  const value = makeLink({ ...e, id });
  if (!has(g.nodes, e.from) || !has(g.nodes, e.to)) {
    if (old >= 0) queue.pending[old] = value;
    else if (queue.pending.length < ctx.limits.maxPending) queue.pending.push(value);
    else warn(s, 'cap-exceeded', id, `The pending link limit is ${ctx.limits.maxPending}; '${id}' was dropped.`, 'warn');
    return false;
  }
  if (old >= 0) queue.pending.splice(old, 1);
  // A reused link id replaces the old link; say so, or a second route silently disappears.
  const prev = has(g.edges, id) ? g.edges[id] : undefined;
  if (prev && (prev.from !== value.from || prev.to !== value.to)) {
    warn(s, 'wf-id-collision', id,
      `Link '${id}' was redefined: it now runs ${value.from} -> ${value.to} instead of ${prev.from} -> ${prev.to}.`);
  }
  return put(s, 'edges', value, ctx.limits.maxEdges);
}

/** Materializes ready requests in id order, preserving each queued request's identity. */
function flushPending(s: ApplyState): void {
  const ready = s.queue.pending.filter((e) => has(s.g.nodes, e.from) && has(s.g.nodes, e.to)).sort(byId);
  for (const e of ready) link(s, e, e);
}

/** Replaces a step, retaining its layout predecessor when the op omits it. */
function step(s: ApplyState, n: WorkflowNode, id = free(s, n.id, 'nodes'), flush = true): string | null {
  const old = has(s.g.nodes, id) ? s.g.nodes[id] : undefined;
  const value = makeStep({ ...n, id, ...(n.after === undefined && old?.after !== undefined ? { after: old.after } : {}) });
  if (!put(s, 'nodes', value, s.ctx.limits.maxNodes)) return null;
  if (flush) flushPending(s);
  return id;
}

/** Inserts both splice halves before committing the private pending queue. */
function splice(s: ApplyState, op: Extract<WorkflowOp, { t: 'splice' }>): boolean {
  const { g, ctx, queue, result } = s;
  const edge = has(g.edges, op.into) ? g.edges[op.into] : undefined;
  const id = free(s, op.id, 'nodes');
  if (!edge) {
    warn(s, 'unknown-id', op.into, `Link '${op.into}' does not exist; added '${op.id}' as a step.`);
    if (!step(s, op, id)) return false;
  } else {
    if (id === edge.from || id === edge.to) {
      warn(s, 'wf-bad-op', id, `Splice '${id}' cannot insert a link's endpoint into itself.`, 'warn');
      return false;
    }
    if (Object.keys(g.edges).length + 1 > ctx.limits.maxEdges) {
      warn(s, 'cap-exceeded', id, 'There is no room for the extra splice link.', 'warn');
      return false;
    }
    // Reserve both halves before ready pending links can consume capacity.
    if (!step(s, op, id, false)
      || !link(s, { ...edge, to: id })
      || !link(s, { id: free(s, `${id}-${edge.to}`), from: id, to: edge.to, kind: 'next' })) {
      result.added = [];
      result.updated = [];
      return false;
    }
    flushPending(s);
  }
  ctx.pending = queue.pending;
  return true;
}

/** Records a tombstone and suppresses repeated removal warnings in this turn. */
function remove(s: ApplyState, key: keyof WorkflowGraph, id: string): void {
  s.result.tombstones.push(s.g[key][id]);
  delete s.g[key][id];
  s.result.removed.push(id);
  s.ctx.removedThisTurn.push(id);
}

/** Removes an element, cascading attachments and links or clearing group membership. */
function unstep(s: ApplyState, id: string): void {
  const { g, ctx } = s;
  const hadPending = ctx.pending.some((e) => e.id === id);
  ctx.pending = ctx.pending.filter((e) => e.id !== id);
  if (has(g.nodes, id)) {
    const gone = new Set([id]);
    let size = 0;
    while (size !== gone.size) {
      size = gone.size;
      for (const n of sorted(g.nodes)) {
        if (n.on && gone.has(n.on)) gone.add(n.id);
      }
    }
    for (const removedId of [...gone].sort()) remove(s, 'nodes', removedId);
    for (const e of sorted(g.edges)) {
      if (gone.has(e.from) || gone.has(e.to)) remove(s, 'edges', e.id);
    }
    ctx.pending = ctx.pending.filter((e) => !gone.has(e.from) && !gone.has(e.to));
  } else if (has(g.edges, id)) {
    remove(s, 'edges', id);
  } else if (has(g.groups, id)) {
    remove(s, 'groups', id);
    for (const n of sorted(g.nodes)) {
      if (n.repeat !== id) continue;
      const value = { ...n };
      delete value.repeat;
      put(s, 'nodes', makeStep(value), ctx.limits.maxNodes);
    }
  } else if (!hadPending && !ctx.removedThisTurn.includes(id)) {
    warn(s, 'unknown-id', id, `Nothing named '${id}' exists to remove.`);
  }
}

export function applyWorkflowOp(wf: WorkflowGraph, op: WorkflowOp, ctx: WorkflowCtx = createWorkflowCtx()): WorkflowApplyResult {
  const g: WorkflowGraph = { nodes: { ...wf.nodes }, edges: { ...wf.edges }, groups: { ...wf.groups } };
  // A splice commits its queue only after both halves have been materialized.
  const queue = op.t === 'splice' ? { pending: [...ctx.pending] } : ctx;
  const result: WorkflowApplyResult = { workflow: wf, added: [], updated: [], removed: [], tombstones: [], warnings: [] };
  const s: ApplyState = { g, ctx, queue, result };
  if (op.t === 'step') step(s, op);
  else if (op.t === 'link') link(s, op);
  else if (op.t === 'each') {
    const value: WorkflowGroup = { id: free(s, op.id, 'groups'), over: op.over };
    if (op.parallel !== undefined) value.parallel = op.parallel;
    put(s, 'groups', value, ctx.limits.maxGroups);
  } else if (op.t === 'splice') {
    if (!splice(s, op)) return result;
  } else {
    unstep(s, op.id);
  }
  if (result.added.length || result.updated.length || result.removed.length) result.workflow = g;
  return result;
}

export function endWorkflowTurn(ctx: WorkflowCtx): Warning[] {
  const warnings: Warning[] = ctx.pending.map((e) => ({
    code: 'dangling-edge',
    ids: [e.id, e.from, e.to],
    msg: `Link '${e.id}' was dropped because an endpoint never arrived.`,
    severity: 'warn',
    repaired: false,
  }));
  ctx.pending = [];
  ctx.removedThisTurn = [];
  return warnings;
}
