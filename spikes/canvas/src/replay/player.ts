// Browser replay engine: schedules a scenario's recorded lines at their real times (scaled by speed), coalesces
// them into batches, runs the pipeline, asks the router for routes, and records per-batch metrics.
import { planEdges } from '../routing/plan.ts';
import { routeMetrics } from '../routing/metrics.ts';
import type { EdgeRouter, PlannedEdge, Pt } from '../routing/types.ts';
import type { Catalog, Graph } from '../../../../packages/core/src/types.ts';
import type { LayoutDiff, LayoutState } from '../../../../packages/core/src/layout.ts';
import { BATCH_MS, applyBatch, batchLines, forkSession, parseLines, startTurn } from './pipeline.ts';
import type { BatchResult } from './pipeline.ts';
import { prepareScenario } from './scenarios.ts';
import type { ScenarioData } from './scenarios.ts';

export type Speed = '1x' | '4x' | 'instant';

export interface BatchMetric {
  i: number;
  t: number; // ms since the stream started (wall clock)
  ops: number;
  moved: number;
  unrelated: number;
  entered: number;
  exited: number;
  held: number;
  layoutMs: number;
  repairMs: number;
  routeMs?: number;
  routeSolveMs?: number;
  routeRoundTripMs?: number;
  cards: number;
  routes?: number;
  intersections?: number;
  crossings?: number;
  overlapPx?: number;
  bends?: number;
  superseded?: boolean;
}

export interface PlayerCallbacks {
  onFrame(f: { seq: number; layout: LayoutState; display: Graph; diff: LayoutDiff | null; animate: boolean; final: boolean }): void;
  onRoutes(r: { seq: number; edges: PlannedEdge[]; routes: Record<string, Pt[]> }): void;
  onStatus(s: { state: 'idle' | 'streaming' | 'done'; ops: number; totalOps: number; say: string }): void;
  onBatch(m: BatchMetric): void;
  onDone(summary: { routerFailed: number; final: Record<string, unknown> }): void;
  onError(msg: string): void;
}

export interface PlayerOptions {
  scenario: string;
  speed: Speed;
  router: EdgeRouter;
  catalog: Catalog;
  data: ScenarioData;
  moveMs: number;
}

export function play(opts: PlayerOptions, cb: PlayerCallbacks): () => void {
  let cancelled = false;
  const timers: number[] = [];
  const { catalog, router } = opts;
  const prep = prepareScenario(opts.scenario, opts.data, catalog);
  const s = forkSession(prep.base);
  const totalOps = prep.lines.length;
  let seq = 0;
  let batchIndex = 0;
  let consumed = 0;
  let lastRoute: Promise<void> = Promise.resolve();
  let final: Record<string, unknown> = {};
  let failedTotal = 0;
  const t0 = performance.now();

  const commit = (r: BatchResult | null, layout: LayoutState, display: Graph, animate: boolean, isFinal: boolean, ops: number): Promise<void> => {
    const mySeq = ++seq;
    const committedAt = performance.now();
    cb.onFrame({ seq: mySeq, layout, display, diff: r ? r.diff : null, animate, final: isFinal });
    const metric: BatchMetric = {
      i: batchIndex++,
      t: Math.round(committedAt - t0),
      ops,
      moved: r ? r.diff.moved.length : 0,
      unrelated: r ? r.unrelated.length : 0,
      entered: r ? r.diff.entered.length : 0,
      exited: r ? r.diff.exited.length : 0,
      held: r ? r.held.length : 0,
      layoutMs: r ? +r.layoutMs.toFixed(3) : 0,
      repairMs: r ? +r.repairMs.toFixed(3) : 0,
      cards: Object.keys(layout.cards).length,
    };
    const req = planEdges(display, layout, catalog);
    // routes are requested in order; the worker answers in order, so the newest answer always lands last
    lastRoute = router.route(req).then(
      (res) => {
        if (cancelled) return;
        const m = routeMetrics(req.edges, res.routes, req.obstacles);
        Object.assign(metric, { routeMs: +res.ms.toFixed(2), routeSolveMs: res.solveMs !== undefined ? +res.solveMs.toFixed(2) : undefined, routeRoundTripMs: res.roundTripMs !== undefined ? +res.roundTripMs.toFixed(2) : undefined, routes: m.edges, intersections: m.edgeNodeIntersections, crossings: m.crossings, overlapPx: m.overlapPx, bends: m.bends, superseded: mySeq !== seq });
        failedTotal += res.failed.length;
        cb.onBatch(metric);
        if (mySeq !== seq) return; // a newer batch is already on screen
        if (isFinal) final = { ...m, failed: res.failed.length, router: res.router, width: layout.width, height: layout.height, cards: Object.keys(layout.cards).length, frames: Object.keys(layout.frames).length, plannedRoutes: req.edges.length, graphEdges: Object.keys(display.edges).length };
        const wait = animate ? Math.max(0, opts.moveMs - (performance.now() - committedAt)) : 0;
        const deliver = (): void => {
          if (!cancelled && mySeq === seq) cb.onRoutes({ seq: mySeq, edges: req.edges, routes: res.routes });
        };
        if (wait > 0) timers.push(window.setTimeout(deliver, wait));
        else deliver();
      },
      (err: unknown) => cb.onError(`router: ${String((err as Error)?.message ?? err)}`),
    );
    return lastRoute;
  };

  const finish = async (): Promise<void> => {
    await lastRoute;
    // let the last draw-on and any move settle before declaring the replay done
    await new Promise((res) => timers.push(window.setTimeout(res, opts.speed === 'instant' ? 50 : opts.moveMs + 250)));
    if (cancelled) return;
    cb.onStatus({ state: 'done', ops: consumed, totalOps, say: s.say });
    cb.onDone({ routerFailed: failedTotal, final });
  };

  const run = async (): Promise<void> => {
    try {
      // earlier turns: drawn at once, no animation
      if (prep.base.layout) await commit(null, prep.base.layout, prep.base.display, false, false, 0);
      startTurn(s);
      const touched = new Set<string>();
      cb.onStatus({ state: 'streaming', ops: 0, totalOps, say: '' });
      if (opts.speed === 'instant') {
        let last: BatchResult | null = null;
        for (const b of batchLines(prep.lines)) {
          const r = applyBatch(s, catalog, parseLines(s, catalog, b.map((x) => x.line), prep.mapRaw), true, touched);
          consumed += b.length;
          if (r) {
            last = r;
            cb.onBatch({ i: batchIndex++, t: 0, ops: r.ops, moved: r.diff.moved.length, unrelated: r.unrelated.length, entered: r.diff.entered.length, exited: r.diff.exited.length, held: r.held.length, layoutMs: +r.layoutMs.toFixed(3), repairMs: +r.repairMs.toFixed(3), cards: Object.keys(r.layout.cards).length });
          }
        }
        const end = applyBatch(s, catalog, [], false, touched) ?? last;
        if (s.layout) await commit(end, s.layout, s.display, false, true, 0);
        await finish();
        return;
      }
      const factor = opts.speed === '4x' ? 4 : 1;
      let pending: string[] = [];
      let flushTimer = 0;
      const flush = (isFinal: boolean): void => {
        flushTimer = 0;
        const lines = pending;
        pending = [];
        const r = applyBatch(s, catalog, parseLines(s, catalog, lines, prep.mapRaw), !isFinal, touched);
        cb.onStatus({ state: isFinal ? 'done' : 'streaming', ops: consumed, totalOps, say: s.say });
        if (r) void commit(r, r.layout, r.display, true, isFinal, lines.length);
        else if (isFinal && s.layout) void commit(null, s.layout, s.display, true, true, 0);
        if (isFinal) void finish();
      };
      const first = prep.lines.length ? prep.lines[0].t : 0;
      prep.lines.forEach((l, k) => {
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return;
            pending.push(l.line);
            consumed++;
            const isLast = k === prep.lines.length - 1;
            if (isLast) {
              if (flushTimer) clearTimeout(flushTimer);
              flush(true);
            } else if (!flushTimer) flushTimer = window.setTimeout(() => flush(false), BATCH_MS);
          }, Math.max(0, (l.t - first) / factor) + 400),
        );
      });
      if (!prep.lines.length) void finish();
    } catch (err) {
      cb.onError(String((err as Error)?.stack ?? err));
    }
  };
  void run();
  return () => {
    cancelled = true;
    for (const t of timers) clearTimeout(t);
  };
}
