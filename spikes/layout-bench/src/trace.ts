// The replay pipeline, independent of the layout under test. For each session:
//   raw op -> validateOp (one ctx per session) -> applyOp on the turn's working graph
//   during a turn: display = displayDuringTurn(repairGraph(working)), one frame per batch
//   at turn end:   endTurn, then repairGraph; that graph is committed and is the session truth for the next turn
// The result is a list of display frames per session; layouts then run over it (runner.ts). Pure apart from timing.
import { applyOp, createCtx, emptyGraph, endTurn } from '../../../packages/core/src/reducer.ts';
import { repairGraph, validateOp } from '../../../packages/core/src/validate.ts';
import type { Catalog, Graph, Op } from '../../../packages/core/src/types.ts';
import { cardIds, displayDuringTurn } from './display.ts';
import type { DisplayArgs, DisplayResult } from './display.ts';
import type { SessionSpec } from './inputs.ts';

export type BatchMode = 'op' | 'turn';
export type Carry = 'repaired' | 'raw';

export interface Frame {
  /** base: the committed start graph (laid out, never counted); mid: a frame of an open turn; commit: the turn-end state. */
  kind: 'base' | 'mid' | 'commit';
  turn: number;
  count: boolean;
  first: boolean;
  display: Graph;
  /** Short description of the ops in this batch, for the worst-case list. */
  label: string;
  held: number;
}

export interface SessionTrace {
  spec: SessionSpec;
  frames: Frame[];
}

export interface Trace {
  mode: BatchMode;
  carry: Carry;
  sessions: SessionTrace[];
  ops: number;
  exceptions: string[];
  repairMs: number[];
}

const now = (): number => performance.now();

function describe(op: Op): string {
  const id = 'id' in op ? `:${op.id}` : op.t === 'rec' ? `:${op.product}` : '';
  return op.t + id;
}

export type DisplayRule = (a: DisplayArgs) => DisplayResult;

export function traceSession(spec: SessionSpec, catalog: Catalog, mode: BatchMode, carry: Carry, sink: { ops: number; exceptions: string[]; repairMs: number[] }, display: DisplayRule = displayDuringTurn): SessionTrace {
  const frames: Frame[] = [];
  const ctx = createCtx();
  let committed: Graph = spec.base ?? emptyGraph();
  let raw: Graph = committed;
  let shown: Graph | null = null; // the last display graph
  if (spec.base) {
    frames.push({ kind: 'base', turn: -1, count: false, first: false, display: committed, label: 'base', held: 0 });
    shown = committed;
  }
  for (const turn of spec.turns) {
    let working: Graph = carry === 'raw' ? raw : committed;
    const shownAtTurnStart = shown ? cardIds(shown) : new Set<string>();
    const touched = new Set<string>();
    let changed = false;
    let labels: string[] = [];
    const flush = (): void => {
      if (!changed) return;
      const t0 = now();
      const d = display({ working, catalog, prevCards: shown ? cardIds(shown) : null, shownAtTurnStart, touched });
      sink.repairMs.push(now() - t0);
      frames.push({ kind: 'mid', turn: turn.index, count: turn.count, first: turn.first, display: d.graph, label: labels.join(',').slice(0, 90), held: d.held.length });
      shown = d.graph;
      changed = false;
      labels = [];
    };
    for (const r of turn.raws) {
      let op: Op | undefined;
      try {
        op = turn.validated ? (r as Op) : validateOp(spec.mapRaw ? spec.mapRaw(r) : r, catalog, ctx).op;
      } catch (e) {
        sink.exceptions.push(`${spec.id} T${turn.index + 1} validate: ${String(e).slice(0, 120)}`);
        continue;
      }
      if (!op) continue;
      sink.ops++;
      // only the op's own subject counts as touched (spike rule): a badge whose host was removed is not
      if (op.t === 'node' || op.t === 'insert' || op.t === 'move') touched.add(op.id);
      else if (op.t === 'rec') touched.add(op.product);
      try {
        const res = applyOp(working, op, ctx);
        if (res.graph !== working) changed = true;
        working = res.graph;
      } catch (e) {
        sink.exceptions.push(`${spec.id} T${turn.index + 1} ${op.t}: ${String(e).slice(0, 120)}`);
        continue;
      }
      labels.push(describe(op));
      if (mode === 'op') flush();
    }
    if (mode === 'turn') flush();
    working = endTurn(working, ctx).graph;
    raw = working;
    const t0 = now();
    committed = repairGraph(working, catalog).graph;
    sink.repairMs.push(now() - t0);
    frames.push({ kind: 'commit', turn: turn.index, count: turn.count, first: turn.first, display: committed, label: 'END', held: 0 });
    shown = committed;
  }
  return { spec, frames };
}

export function buildTrace(specs: readonly SessionSpec[], catalog: Catalog, mode: BatchMode, carry: Carry = 'repaired', display: DisplayRule = displayDuringTurn): Trace {
  const sink = { ops: 0, exceptions: [] as string[], repairMs: [] as number[] };
  const sessions = specs.map((s) => traceSession(s, catalog, mode, carry, sink, display));
  return { mode, carry, sessions, ops: sink.ops, exceptions: sink.exceptions, repairMs: sink.repairMs };
}
