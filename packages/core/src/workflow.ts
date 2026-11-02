// Reducer for the workflow document (PLAN.md section 3), beside the cloud graph's reducer.ts. applyWorkflowOp() never
// mutates its input and returns the same object when nothing changed; the ctx holds links waiting for an endpoint.
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowGroup, WorkflowOp, Warning } from './types.ts';
import { normalizeId } from './reducer.ts';

export interface WorkflowLimits { maxNodes: number; maxEdges: number; maxGroups: number; maxPending: number }
export const DEFAULT_WORKFLOW_LIMITS: WorkflowLimits = { maxNodes: 40, maxEdges: 60, maxGroups: 8, maxPending: 60 };
export interface WorkflowCtx { pending: WorkflowEdge[]; removedThisTurn: string[]; limits: WorkflowLimits }
export interface WorkflowApplyResult {
  workflow: WorkflowGraph; added: string[]; updated: string[]; removed: string[];
  tombstones: Array<WorkflowNode | WorkflowEdge | WorkflowGroup>; warnings: Warning[];
}
export function emptyWorkflow(): WorkflowGraph { return { nodes: {}, edges: {}, groups: {} }; }
export function createWorkflowCtx(limits: Partial<WorkflowLimits> = {}): WorkflowCtx {
  return { pending: [], removedThisTurn: [], limits: { ...DEFAULT_WORKFLOW_LIMITS, ...limits } };
}
export function makeStep(n: WorkflowNode): WorkflowNode {
  const out: WorkflowNode = { id: n.id, kind: n.kind, label: n.label };
  const keys = ['task', 'after', 'on', 'product', 'runs', 'ai', 'tool', 'turns', 'effect', 'untrusted', 'private', 'approval', 'subject', 'join', 'repeat', 'why'] as const;
  for (const k of keys) if (n[k] !== undefined) Object.assign(out, { [k]: n[k] });
  return out;
}
export function makeLink(e: WorkflowEdge): WorkflowEdge {
  const out: WorkflowEdge = { id: e.id, from: e.from, to: e.to };
  for (const k of ['kind', 'label', 'max', 'outcome'] as const) if (e[k] !== undefined) Object.assign(out, { [k]: e[k] });
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

export function applyWorkflowOp(wf: WorkflowGraph, op: WorkflowOp, ctx: WorkflowCtx = createWorkflowCtx()): WorkflowApplyResult {
  const g: WorkflowGraph = { nodes: { ...wf.nodes }, edges: { ...wf.edges }, groups: { ...wf.groups } };
  // A splice commits its queue only after both halves have been materialized.
  const queue = op.t === 'splice' ? { pending: [...ctx.pending] } : ctx;
  const result: WorkflowApplyResult = { workflow: wf, added: [], updated: [], removed: [], tombstones: [], warnings: [] };
  const warn = (code: Warning['code'], id: string, msg: string, severity: Warning['severity'] = 'info'): void => {
    result.warnings.push({ code, ids: [id], msg, severity, repaired: false });
  };
  const free = (id: string, own?: keyof WorkflowGraph): string => {
    const used = (s: string): boolean => (['nodes', 'edges', 'groups'] as const).some((k) => k !== own && has(g[k], s))
      || (s !== id && own !== undefined && has(g[own], s))
      || queue.pending.some((e) => e.id === s && !(own === 'edges' && s === id));
    const next = own !== undefined && !used(id) ? id : allocateWorkflowId(id, used);
    if (next !== id) warn('wf-id-collision', id, `Id '${id}' is already used; using '${next}'.`);
    return next;
  };
  const put = <T extends WorkflowNode | WorkflowEdge | WorkflowGroup>(key: keyof WorkflowGraph, value: T, cap: number): boolean => {
    const map = g[key] as Record<string, T>;
    const exists = has(map, value.id);
    if (!exists && Object.keys(map).length >= cap) { warn('cap-exceeded', value.id, `The ${key} limit is ${cap}; '${value.id}' was dropped.`, 'warn'); return false; }
    if (exists && JSON.stringify(map[value.id]) === JSON.stringify(value)) return true;
    map[value.id] = value;
    (exists ? result.updated : result.added).push(value.id);
    return true;
  };
  const link = (e: WorkflowEdge, queued?: WorkflowEdge): boolean => {
    if (e.from === e.to) { warn('wf-bad-op', e.id, `Link '${e.id}' cannot connect a step to itself.`, 'warn'); return false; }
    // Match before allocation: a renamed link must not consume a different queued request.
    const old = queued ? queue.pending.indexOf(queued) : queue.pending.findIndex((p) => p.id === e.id);
    const id = free(e.id, 'edges');
    const value = makeLink({ ...e, id });
    if (!has(g.nodes, e.from) || !has(g.nodes, e.to)) {
      if (old >= 0) queue.pending[old] = value;
      else if (queue.pending.length < ctx.limits.maxPending) queue.pending.push(value);
      else warn('cap-exceeded', id, `The pending link limit is ${ctx.limits.maxPending}; '${id}' was dropped.`, 'warn');
      return false;
    } else {
      if (old >= 0) queue.pending.splice(old, 1);
      // A reused link id replaces the old link; say so, or a second route silently disappears.
      const prev = has(g.edges, id) ? g.edges[id] : undefined;
      if (prev && (prev.from !== value.from || prev.to !== value.to)) warn('wf-id-collision', id, `Link '${id}' was redefined: it now runs ${value.from} -> ${value.to} instead of ${prev.from} -> ${prev.to}.`);
      return put('edges', value, ctx.limits.maxEdges);
    }
  };
  const flushPending = (): void => {
    const ready = queue.pending.filter((e) => has(g.nodes, e.from) && has(g.nodes, e.to)).sort(byId);
    for (const e of ready) link(e, e);
  };
  const step = (n: WorkflowNode, id = free(n.id, 'nodes'), flush = true): string | null => {
    const old = has(g.nodes, id) ? g.nodes[id] : undefined;
    const value = makeStep({ ...n, id, ...(n.after === undefined && old?.after !== undefined ? { after: old.after } : {}) });
    if (!put('nodes', value, ctx.limits.maxNodes)) return null;
    if (flush) flushPending();
    return id;
  };
  if (op.t === 'step') step(op);
  else if (op.t === 'link') link(op);
  else if (op.t === 'each') {
    const value: WorkflowGroup = { id: free(op.id, 'groups'), over: op.over };
    if (op.parallel !== undefined) value.parallel = op.parallel;
    put('groups', value, ctx.limits.maxGroups);
  } else if (op.t === 'splice') {
    const edge = has(g.edges, op.into) ? g.edges[op.into] : undefined;
    const id = free(op.id, 'nodes');
    if (!edge) {
      warn('unknown-id', op.into, `Link '${op.into}' does not exist; added '${op.id}' as a step.`);
      if (!step(op, id)) return result;
    } else {
      if (id === edge.from || id === edge.to) {
        warn('wf-bad-op', id, `Splice '${id}' cannot insert a link's endpoint into itself.`, 'warn');
        return result;
      }
      if (Object.keys(g.edges).length + 1 > ctx.limits.maxEdges) {
        warn('cap-exceeded', id, 'There is no room for the extra splice link.', 'warn');
        return result;
      }
      // Reserve both halves by inserting them before ready pending links can consume capacity.
      if (!step(op, id, false)
        || !link({ ...edge, to: id })
        || !link({ id: free(`${id}-${edge.to}`), from: id, to: edge.to, kind: 'next' })) {
        result.added = []; result.updated = [];
        return result;
      }
      flushPending();
    }
    ctx.pending = queue.pending;
  } else {
    const hadPending = ctx.pending.some((e) => e.id === op.id);
    ctx.pending = ctx.pending.filter((e) => e.id !== op.id);
    const remove = (key: keyof WorkflowGraph, id: string): void => {
      result.tombstones.push(g[key][id]); delete g[key][id]; result.removed.push(id); ctx.removedThisTurn.push(id);
    };
    if (has(g.nodes, op.id)) {
      const gone = new Set([op.id]);
      let size = 0;
      while (size !== gone.size) {
        size = gone.size;
        for (const n of sorted(g.nodes)) if (n.on && gone.has(n.on)) gone.add(n.id);
      }
      for (const id of [...gone].sort()) remove('nodes', id);
      for (const e of sorted(g.edges)) if (gone.has(e.from) || gone.has(e.to)) remove('edges', e.id);
      ctx.pending = ctx.pending.filter((e) => !gone.has(e.from) && !gone.has(e.to));
    } else if (has(g.edges, op.id)) remove('edges', op.id);
    else if (has(g.groups, op.id)) {
      remove('groups', op.id);
      for (const n of sorted(g.nodes)) if (n.repeat === op.id) {
        const value = { ...n }; delete value.repeat; put('nodes', makeStep(value), ctx.limits.maxNodes);
      }
    } else if (!hadPending && !ctx.removedThisTurn.includes(op.id)) warn('unknown-id', op.id, `Nothing named '${op.id}' exists to remove.`);
  }
  if (result.added.length || result.updated.length || result.removed.length) result.workflow = g;
  return result;
}
export function endWorkflowTurn(ctx: WorkflowCtx): Warning[] {
  const warnings: Warning[] = ctx.pending.map((e) => ({ code: 'dangling-edge', ids: [e.id, e.from, e.to], msg: `Link '${e.id}' was dropped because an endpoint never arrived.`, severity: 'warn', repaired: false }));
  ctx.pending = []; ctx.removedThisTurn = [];
  return warnings;
}
