// Replay pipeline, shared by the canvas and the Node bench: stream lines -> parse -> validateOp -> applyOp (batched)
// -> repairGraph -> display rules -> layoutGraph. Pure: no DOM, no timers; the caller decides when a batch closes.
import { createLineParser } from '../../../../packages/core/src/ndjson.ts';
import { applyOp, cloneCtx, createCtx, emptyGraph, endTurn } from '../../../../packages/core/src/reducer.ts';
import type { ApplyCtx } from '../../../../packages/core/src/reducer.ts';
import { repairGraph, validateOp } from '../../../../packages/core/src/validate.ts';
import { layoutDiff, layoutGraph, unrelatedMoves } from '../../../../packages/core/src/layout.ts';
import type { LayoutDiff, LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Catalog, Graph, Op } from '../../../../packages/core/src/types.ts';

export interface Session {
  raw: Graph; // the reducer's graph (what the model has said)
  ctx: ApplyCtx;
  display: Graph; // what is drawn: repaired, plus the display rules below
  layout?: LayoutState;
  /** Node ids drawn as cards at the start of the current turn (for the no-resurrection rule). */
  shownAtTurnStart: Set<string>;
  keepInline: ReadonlySet<string>;
  say: string;
}

export interface BatchResult {
  ops: number;
  /** The display graph this layout was computed from. */
  display: Graph;
  layout: LayoutState;
  diff: LayoutDiff;
  unrelated: string[];
  layoutMs: number;
  repairMs: number;
  /** Cards held back this batch because they would only flash in and out (see heldBack()). */
  held: string[];
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function newSession(keepInline: Iterable<string> = []): Session {
  return { raw: emptyGraph(), ctx: createCtx(), display: emptyGraph(), shownAtTurnStart: new Set(), keepInline: new Set(keepInline), say: '' };
}

export function forkSession(s: Session, keepInline?: Iterable<string>): Session {
  return { ...s, ctx: cloneCtx(s.ctx), shownAtTurnStart: new Set(s.shownAtTurnStart), keepInline: keepInline ? new Set(keepInline) : s.keepInline };
}

/** Probe streams use underscored ids (anti_ddos); the protocol team's map turns them into catalog ids. */
export function probeMapper(map: Record<string, string>): (raw: unknown) => unknown {
  return (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const o = raw as Record<string, unknown>;
    const out: Record<string, unknown> = { ...o };
    if (typeof o.product === 'string' && Object.hasOwn(map, o.product)) out.product = map[o.product];
    if (Array.isArray(o.products)) out.products = o.products.map((p) => (typeof p === 'string' && Object.hasOwn(map, p) ? map[p] : p));
    return out;
  };
}

/** Parses NDJSON lines into validated ops (the session ctx carries group aliases between ops). */
export function parseLines(s: Session, catalog: Catalog, lines: string[], mapRaw: (raw: unknown) => unknown): Op[] {
  const ops: Op[] = [];
  const p = createLineParser({
    onOp(raw) {
      const v = validateOp(mapRaw(raw), catalog, s.ctx);
      if (v.op) ops.push(v.op);
    },
  });
  for (const l of lines) p.push(l + '\n');
  p.end();
  return ops;
}

export function startTurn(s: Session): void {
  s.shownAtTurnStart = new Set(s.layout ? Object.keys(s.layout.cards) : []);
}

/**
 * Display graph: the repaired graph, with two spike-level rules.
 * 1. keepInline: nodes the user asked to keep in the path (WAF in CNAME mode) skip repair's attach-inline rule:
 *    they are taken out before repair and put back, with their own edges, afterwards.
 * 2. No resurrection mid-turn: a node that was not a card at the start of the turn and was not touched by this
 *    turn's ops does not become a card until the turn ends. Without this, removing a merged replica (B3 removes the
 *    multi-zone ecs-a first) briefly shows the hidden replica ecs-b and the orphaned Auto Scaling badge as cards.
 */
function displayOf(s: Session, catalog: Catalog, touched: ReadonlySet<string>, turnOpen: boolean): { graph: Graph; held: string[] } {
  let raw = s.raw;
  const inline = [...s.keepInline].filter((id) => Object.hasOwn(raw.nodes, id));
  if (inline.length) {
    const nodes = { ...raw.nodes };
    const edges = { ...raw.edges };
    for (const id of inline) delete nodes[id];
    for (const [eid, e] of Object.entries(edges)) if (inline.includes(e.from) || inline.includes(e.to)) delete edges[eid];
    raw = { ...raw, nodes, edges };
  }
  const rep = repairGraph(raw, catalog).graph;
  let g: Graph = rep;
  if (inline.length) {
    const nodes = { ...rep.nodes };
    const edges = { ...rep.edges };
    for (const id of inline) {
      const n = { ...s.raw.nodes[id] };
      delete n.attachTo;
      nodes[id] = n;
    }
    for (const [eid, e] of Object.entries(s.raw.edges)) {
      if ((inline.includes(e.from) || inline.includes(e.to)) && (Object.hasOwn(nodes, e.from) || rep.recs.some((r) => r.product === e.from)) && (Object.hasOwn(nodes, e.to) || rep.recs.some((r) => r.product === e.to))) edges[eid] = e;
    }
    g = { ...rep, nodes, edges };
  }
  const held: string[] = [];
  if (turnOpen && s.layout) {
    const nodes = { ...g.nodes };
    for (const n of Object.values(g.nodes)) {
      const isCard = !n.attachTo || !Object.hasOwn(g.nodes, n.attachTo);
      if (isCard && !s.shownAtTurnStart.has(n.id) && !touched.has(n.id) && !Object.hasOwn(s.layout.cards, n.id)) {
        delete nodes[n.id];
        held.push(n.id);
      }
    }
    if (held.length) {
      const edges = Object.fromEntries(Object.entries(g.edges).filter(([, e]) => !held.includes(e.from) && !held.includes(e.to)));
      g = { ...g, nodes, edges };
    }
  }
  return { graph: g, held };
}

/** Applies one batch of ops and lays out the result. `turnOpen` is false for the closing batch (done). */
export function applyBatch(s: Session, catalog: Catalog, ops: Op[], turnOpen: boolean, touchedSoFar: Set<string>): BatchResult | null {
  let changed = false;
  for (const op of ops) {
    if (op.t === 'say') s.say = op.text;
    // only the op's own subject counts as touched: a badge whose host was removed shows up in r.updated too
    if (op.t === 'node' || op.t === 'insert' || op.t === 'move') touchedSoFar.add(op.id);
    else if (op.t === 'rec') touchedSoFar.add(op.product);
    const r = applyOp(s.raw, op, s.ctx);
    if (r.graph !== s.raw) changed = true;
    s.raw = r.graph;
  }
  if (!turnOpen) {
    const end = endTurn(s.raw, s.ctx);
    if (end.graph !== s.raw) changed = true;
    s.raw = end.graph;
  }
  if (!changed && turnOpen) return null;
  const t0 = nowMs();
  const { graph, held } = displayOf(s, catalog, touchedSoFar, turnOpen);
  const t1 = nowMs();
  const next = layoutGraph(graph, catalog, s.layout);
  const t2 = nowMs();
  const diff = layoutDiff(s.layout, next);
  const unrelated = s.layout ? unrelatedMoves(s.layout, next, diff.moved) : [];
  s.display = graph;
  s.layout = next;
  return { ops: ops.length, display: graph, layout: next, diff, unrelated, layoutMs: t2 - t1, repairMs: t1 - t0, held };
}

export interface TimedLine {
  t: number; // ms since the request
  line: string;
}

/** Groups timed lines into batches: a batch closes BATCH_MS after its first line (the canvas coalesces the same way). */
export const BATCH_MS = 180;
export function batchLines(lines: TimedLine[], windowMs = BATCH_MS): TimedLine[][] {
  const out: TimedLine[][] = [];
  let cur: TimedLine[] = [];
  let start = -Infinity;
  for (const l of lines) {
    if (l.t - start > windowMs && cur.length) {
      out.push(cur);
      cur = [];
    }
    if (!cur.length) start = l.t;
    cur.push(l);
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Runs a whole stream synchronously (instant replay, base states, the bench). Returns every batch result. */
export function runStream(s: Session, catalog: Catalog, lines: TimedLine[], mapRaw: (raw: unknown) => unknown): BatchResult[] {
  startTurn(s);
  const touched = new Set<string>();
  const out: BatchResult[] = [];
  for (const b of batchLines(lines)) {
    const r = applyBatch(s, catalog, parseLines(s, catalog, b.map((x) => x.line), mapRaw), true, touched);
    if (r) out.push(r);
  }
  const end = applyBatch(s, catalog, [], false, touched);
  if (end && (end.diff.entered.length || end.diff.exited.length || end.diff.moved.length)) out.push(end);
  return out;
}
