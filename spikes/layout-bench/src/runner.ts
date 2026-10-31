// Runs one layout over a replay trace at one canvas size: sticky layouts frame by frame, stability per frame, size,
// text and frame fill per turn-end state, and (optionally) both routers with their quality, churn and timing.
import { performance } from 'node:perf_hooks';
import type { LayoutState } from '../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';
import { checkState } from './layouts.ts';
import type { Canvas, LayoutModule } from './layouts.ts';
import type { Trace } from './trace.ts';
import { classifyMoves } from './metrics/stability.ts';
import type { StabilityRecord } from './metrics/stability.ts';
import { sizeRow } from './metrics/size.ts';
import type { SizeRow } from './metrics/size.ts';
import { textFit } from './metrics/textfit.ts';
import type { TextFit } from './metrics/textfit.ts';
import { frameFill, mergeFill } from './metrics/frames.ts';
import type { FillTotals } from './metrics/frames.ts';
import { ambiguity, churn } from './metrics/routes.ts';
import type { Ambiguity, Churn } from './metrics/routes.ts';
import type { AdvanceTable } from './text.ts';
import { planEdges } from './routing/plan.ts';
import { routeChannels } from './routing/channel.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from './routing/avoid.ts';
import type { AvoidState } from './routing/avoid.ts';
import { routeMetrics } from './routing/metrics.ts';
import type { RouteMetrics } from './routing/metrics.ts';
import type { PlannedEdge, Pt } from './routing/types.ts';

export type RouterName = 'channel' | 'libavoid';

export interface RouteQuality {
  session: string;
  turn: number;
  cards: number;
  routes: number;
  failed: number;
  m: RouteMetrics;
  a: Ambiguity;
}

export interface RouterData {
  quality: RouteQuality[];
  churn: Array<Churn & { session: string }>;
  /** One entry per routing call, with its session, so reports can be cut by source. */
  calls: Array<{ session: string; ms: number; solveMs?: number }>;
}

export interface Snapshot {
  display: Graph;
  layout: LayoutState;
}

export interface RunOptions {
  /** Route every frame, only turn-end states, or nothing. */
  routes: 'batch' | 'turn' | 'none';
  /** The libavoid-js module instance (AvoidLib.getInstance()), or null to skip libavoid. */
  avoid: unknown | null;
  /** Snapshot keys to keep: `${sessionId}@base` or `${sessionId}@${turnIndex}` (turn-end state). */
  snapshots: ReadonlySet<string>;
}

export interface RunResult {
  canvas: Canvas;
  frames: number;
  layoutMs: number[];
  stability: StabilityRecord[];
  size: SizeRow[];
  text: Array<TextFit & { session: string }>;
  fill: Record<string, FillTotals>;
  zoneEmpty: number[];
  routers: Partial<Record<RouterName, RouterData>>;
  snapshots: Map<string, Snapshot>;
}

export function runLayout(trace: Trace, layout: LayoutModule, catalog: Catalog, table: AdvanceTable, canvas: Canvas, opts: RunOptions): RunResult {
  const res: RunResult = { canvas, frames: 0, layoutMs: [], stability: [], size: [], text: [], fill: {}, zoneEmpty: [], routers: {}, snapshots: new Map() };
  const routing = opts.routes !== 'none';
  const routers: RouterName[] = routing ? (opts.avoid ? ['channel', 'libavoid'] : ['channel']) : [];
  for (const r of routers) res.routers[r] = { quality: [], churn: [], calls: [] };
  for (const st of trace.sessions) {
    let prev: LayoutState | undefined;
    let avoid: AvoidState | null = routers.includes('libavoid') ? createAvoidState(opts.avoid) : null;
    const last: Partial<Record<RouterName, { edges: PlannedEdge[]; routes: Record<string, Pt[]> }>> = {};
    try {
      for (const f of st.frames) {
        const t0 = performance.now();
        const next = layout.layoutGraph(f.display, catalog, prev, { canvas });
        res.layoutMs.push(performance.now() - t0);
        res.frames++;
        if (res.frames <= 50 || res.frames % 500 === 0) checkState(next, `${layout.name} ${st.spec.id}`);
        if (prev && f.count && f.kind !== 'base') {
          res.stability.push({ session: st.spec.id, case: st.spec.case, turn: f.turn, kind: f.kind as 'mid' | 'commit', first: f.first, label: f.label, moves: classifyMoves(prev, next) });
        }
        const key = f.kind === 'base' ? `${st.spec.id}@base` : f.kind === 'commit' ? `${st.spec.id}@${f.turn}` : '';
        if (key && opts.snapshots.has(key)) res.snapshots.set(key, { display: f.display, layout: next });
        const turnEnd = f.kind === 'commit' && f.count;
        if (turnEnd) {
          res.size.push(sizeRow(st.spec.id, f.turn, next, layout.METRICS, canvas));
          res.text.push({ session: st.spec.id, ...textFit(next, f.display, catalog, table, layout) });
          const ff = frameFill(next);
          mergeFill(res.fill, ff.byKind);
          res.zoneEmpty.push(...ff.zoneEmpty);
        }
        if (routing && (opts.routes === 'batch' || f.kind !== 'mid')) {
          const req = planEdges(f.display, next, catalog);
          for (const r of routers) {
            const data = res.routers[r]!;
            let routes: Record<string, Pt[]>;
            let failed: number;
            if (r === 'channel') {
              const c = routeChannels(req);
              data.calls.push({ session: st.spec.id, ms: c.ms });
              routes = c.routes;
              failed = c.failed.length;
            } else {
              const a = routeWithAvoid(avoid!, req);
              data.calls.push({ session: st.spec.id, ms: a.ms, solveMs: a.solveMs ?? 0 });
              routes = a.routes;
              failed = a.failed.length;
            }
            const p = last[r];
            if (p && f.count && f.kind !== 'base') data.churn.push({ session: st.spec.id, ...churn(p.edges, p.routes, req.edges, routes) });
            last[r] = { edges: req.edges, routes };
            if (turnEnd && req.edges.length > 0) {
              data.quality.push({ session: st.spec.id, turn: f.turn, cards: Object.keys(next.cards).length, routes: req.edges.length, failed, m: routeMetrics(req.edges, routes, req.obstacles), a: ambiguity(req.edges, routes, Object.values(next.frames)) });
            }
          }
        }
        prev = next;
      }
    } finally {
      if (avoid) disposeAvoidState(avoid);
      avoid = null;
    }
  }
  return res;
}
