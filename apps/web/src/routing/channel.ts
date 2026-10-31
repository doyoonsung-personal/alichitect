// Channel router (our own fallback). The lane grid leaves regular gaps between cards; this router runs A* over a
// sparse orthogonal grid made of the midlines of those gaps plus each endpoint's centre lines, with costs for length,
// bends, crossings and overlaps. A nudging pass then spreads parallel segments that share a channel into tracks,
// ordered to avoid crossings, while same-source fan-outs and same-target fan-ins keep one shared trunk (a bus).
// Pure TypeScript: no DOM, no WASM; runs on the main thread, in a worker or in Node.
import type { Obstacle, PlannedEdge, Pt, RouteRequest, RouteResult } from './types.ts';

export interface ChannelOptions {
  clearance?: number; // gap kept between routes and cards
  bendCost?: number; // px-equivalent cost of one bend
  crossCost?: number; // cost of crossing an earlier route
  overlapCost?: number; // per-px cost of running on a line an unrelated route already uses
  trackGap?: number; // spacing of parallel tracks in a channel
}

type Dir = 0 | 1 | 2 | 3; // +x, -x, +y, -y
const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];
const REV = [1, 0, 3, 2];

interface Seg {
  route: number;
  k: number;
  h: boolean;
  line: number; // grid line index (Y index when horizontal, X index when vertical)
  lo: number; // extent along the other axis, in px
  hi: number;
  start: number; // coordinate where the route enters this segment
  end: number;
  port: 0 | 1 | 2 | 3; // 1: first segment, 2: last segment, 3: both
  off: number;
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size(): number {
    return this.k.length;
  }
  push(key: number, val: number): void {
    const k = this.k;
    const v = this.v;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  pop(): number {
    const k = this.k;
    const v = this.v;
    const top = v[0];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      let i = 0;
      const n = k.length;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && k[r] < k[l] ? r : l;
        if (k[c] >= lk) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lk;
      v[i] = lv;
    }
    return top;
  }
}

function uniqSorted(a: number[]): number[] {
  a.sort((x, y) => x - y);
  const out: number[] = [];
  for (const x of a) if (!out.length || x - out[out.length - 1] > 0.5) out.push(x);
  return out;
}

function lowerBound(a: number[], x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

export function routeChannels(req: RouteRequest, opts: ChannelOptions = {}): RouteResult {
  const t0 = now();
  const C = opts.clearance ?? 8;
  const BEND = opts.bendCost ?? 46;
  const CROSS = opts.crossCost ?? 70;
  const OVER = opts.overlapCost ?? 0.35;
  const TRACK = opts.trackGap ?? 7;
  const obs = req.obstacles;
  const edges = req.edges;
  const ox0 = obs.map((o) => o.x - C);
  const oy0 = obs.map((o) => o.y - C);
  const ox1 = obs.map((o) => o.x + o.w + C);
  const oy1 = obs.map((o) => o.y + o.h + C);

  // ----- grid lines: slab midlines plus endpoint centre lines -----
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < obs.length; i++) {
    minX = Math.min(minX, ox0[i]);
    minY = Math.min(minY, oy0[i]);
    maxX = Math.max(maxX, ox1[i]);
    maxY = Math.max(maxY, oy1[i]);
  }
  for (const e of edges) {
    for (const r of [e.src, e.dst]) {
      minX = Math.min(minX, r.x - C);
      minY = Math.min(minY, r.y - C);
      maxX = Math.max(maxX, r.x + r.w + C);
      maxY = Math.max(maxY, r.y + r.h + C);
    }
  }
  if (!isFinite(minX)) return { router: 'channel', routes: {}, ms: now() - t0, failed: [] };
  minX -= 40;
  minY -= 40;
  maxX += 40;
  maxY += 40;
  const xb = uniqSorted([minX, maxX, ...ox0, ...ox1]);
  const yb = uniqSorted([minY, maxY, ...oy0, ...oy1]);
  const xsRaw: number[] = [];
  const ysRaw: number[] = [];
  for (let i = 0; i + 1 < xb.length; i++) if (xb[i + 1] - xb[i] >= 2) xsRaw.push(Math.round((xb[i] + xb[i + 1]) * 2) / 4);
  for (let i = 0; i + 1 < yb.length; i++) if (yb[i + 1] - yb[i] >= 2) ysRaw.push(Math.round((yb[i] + yb[i + 1]) * 2) / 4);
  for (const e of edges) {
    for (const r of [e.src, e.dst]) {
      xsRaw.push(r.x + r.w / 2);
      ysRaw.push(r.y + r.h / 2);
    }
  }
  const X = uniqSorted(xsRaw);
  const Y = uniqSorted(ysRaw);
  const nx = X.length;
  const ny = Y.length;

  // free half-width around each line, used to bound the nudging offsets
  const halfFree = (lines: number[], bounds: number[]): number[] =>
    lines.map((v) => {
      const k = lowerBound(bounds, v);
      const left = k > 0 ? v - bounds[k - 1] : 40;
      const right = k < bounds.length ? bounds[k] - v : 40;
      return Math.max(0, Math.min(left, right) + C - 3);
    });
  const xFree = halfFree(X, xb);
  const yFree = halfFree(Y, yb);

  // ----- blocked points and segments -----
  const ptBlocked = new Uint8Array(nx * ny);
  const hBlocked = new Uint8Array(Math.max(0, nx - 1) * ny); // index j * (nx - 1) + i: (X[i],Y[j])-(X[i+1],Y[j])
  const vBlocked = new Uint8Array(nx * Math.max(0, ny - 1)); // index i * (ny - 1) + j: (X[i],Y[j])-(X[i],Y[j+1])
  for (let o = 0; o < obs.length; o++) {
    const i0 = lowerBound(X, ox0[o] + 1e-6);
    const i1 = lowerBound(X, ox1[o] - 1e-6) - 1;
    const j0 = lowerBound(Y, oy0[o] + 1e-6);
    const j1 = lowerBound(Y, oy1[o] - 1e-6) - 1;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) ptBlocked[i * ny + j] = 1;
    // horizontal segments inside the obstacle's y-range that overlap its x-range
    const si0 = Math.max(0, lowerBound(X, ox0[o]) - 1);
    const si1 = Math.min(nx - 2, lowerBound(X, ox1[o]));
    for (let j = j0; j <= j1; j++) for (let i = si0; i <= si1; i++) if (X[i + 1] > ox0[o] + 1e-6 && X[i] < ox1[o] - 1e-6) hBlocked[j * (nx - 1) + i] = 1;
    const sj0 = Math.max(0, lowerBound(Y, oy0[o]) - 1);
    const sj1 = Math.min(ny - 2, lowerBound(Y, oy1[o]));
    for (let i = i0; i <= i1; i++) for (let j = sj0; j <= sj1; j++) if (Y[j + 1] > oy0[o] + 1e-6 && Y[j] < oy1[o] - 1e-6) vBlocked[i * (ny - 1) + j] = 1;
  }

  // occupancy by routed edges, for crossing and overlap costs
  const hOcc: number[][] = new Array(Math.max(0, nx - 1) * ny);
  const vOcc: number[][] = new Array(nx * Math.max(0, ny - 1));
  const routeFrom: string[] = [];
  const routeTo: string[] = [];
  const related = (r: number, e: PlannedEdge): boolean => routeFrom[r] === e.from || routeTo[r] === e.to;

  const xi = (x: number): number => {
    const k = lowerBound(X, x - 0.25);
    return k < nx && Math.abs(X[k] - x) <= 0.25 ? k : -1;
  };
  const yi = (y: number): number => {
    const k = lowerBound(Y, y - 0.25);
    return k < ny && Math.abs(Y[k] - y) <= 0.25 ? k : -1;
  };

  interface Port {
    i: number; // grid point where the stub meets the grid
    j: number;
    dir: Dir; // direction of travel along the stub (outward for sources, inward for targets)
    cost: number;
    p: Pt; // point on the rect's side
  }
  const portsOf = (r: { x: number; y: number; w: number; h: number }, other: { x: number; y: number; w: number; h: number }, outward: boolean): Port[] => {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const ocx = other.x + other.w / 2;
    const ocy = other.y + other.h / 2;
    const out: Port[] = [];
    const jc = yi(cy);
    const ic = xi(cx);
    // side preference: face the other endpoint; left/right sides are preferred over top/bottom for this diagram
    const pref = (side: number): number => {
      const dx = ocx - cx;
      const dy = ocy - cy;
      const faces = side === 0 ? dx > r.w / 2 : side === 1 ? dx < -r.w / 2 : side === 2 ? dy > r.h / 2 : dy < -r.h / 2;
      return (faces ? 0 : 60) + (side >= 2 ? 18 : 0);
    };
    if (jc >= 0) {
      const iR = lowerBound(X, r.x + r.w + C + 1e-6);
      if (iR < nx && !ptBlocked[iR * ny + jc]) out.push({ i: iR, j: jc, dir: outward ? 0 : 1, cost: X[iR] - (r.x + r.w) + pref(0), p: { x: r.x + r.w, y: cy } });
      const iL = lowerBound(X, r.x - C - 1e-6) - 1;
      if (iL >= 0 && !ptBlocked[iL * ny + jc]) out.push({ i: iL, j: jc, dir: outward ? 1 : 0, cost: r.x - X[iL] + pref(1), p: { x: r.x, y: cy } });
    }
    if (ic >= 0) {
      const jB = lowerBound(Y, r.y + r.h + C + 1e-6);
      if (jB < ny && !ptBlocked[ic * ny + jB]) out.push({ i: ic, j: jB, dir: outward ? 2 : 3, cost: Y[jB] - (r.y + r.h) + pref(2), p: { x: cx, y: r.y + r.h } });
      const jT = lowerBound(Y, r.y - C - 1e-6) - 1;
      if (jT >= 0 && !ptBlocked[ic * ny + jT]) out.push({ i: ic, j: jT, dir: outward ? 3 : 2, cost: r.y - Y[jT] + pref(3), p: { x: cx, y: r.y } });
    }
    return out;
  };

  const N = nx * ny;
  const g = new Float64Array(N * 4);
  const parent = new Int32Array(N * 4);
  const stamp = new Int32Array(N * 4);
  let epoch = 0;

  const order = edges
    .map((e, idx) => ({ e, idx, d: Math.abs(e.src.x - e.dst.x) + Math.abs(e.src.y - e.dst.y) }))
    .sort((a, b) => Number(b.e.path) - Number(a.e.path) || a.d - b.d || (a.e.id < b.e.id ? -1 : 1));

  interface Found {
    states: number[]; // grid states from the first to the last grid point
    src: Port;
    dst: Port;
  }
  const routesPts: Record<string, Pt[]> = {};
  const failed: string[] = [];
  const segsByRoute: Seg[][] = [];
  const found: Array<Found | null> = new Array(edges.length).fill(null);

  for (const { e, idx } of order) {
    const srcPorts = portsOf(e.src, e.dst, true);
    const dstPorts = portsOf(e.dst, e.src, false);
    if (!srcPorts.length || !dstPorts.length) {
      failed.push(e.id);
      continue;
    }
    epoch++;
    const heap = new Heap();
    const tx = e.dst.x + e.dst.w / 2;
    const ty = e.dst.y + e.dst.h / 2;
    const hcost = (i: number, j: number): number => Math.abs(X[i] - tx) + Math.abs(Y[j] - ty) - Math.max(e.dst.w, e.dst.h);
    const goalAt = new Map<number, Port[]>();
    for (const p of dstPorts) {
      const k = p.i * ny + p.j;
      goalAt.set(k, [...(goalAt.get(k) ?? []), p]);
    }
    for (const p of srcPorts) {
      const s = (p.i * ny + p.j) * 4 + p.dir;
      if (stamp[s] !== epoch || p.cost < g[s]) {
        stamp[s] = epoch;
        g[s] = p.cost;
        parent[s] = -1 - srcPorts.indexOf(p);
        heap.push(p.cost + Math.max(0, hcost(p.i, p.j)), s);
      }
    }
    let best = Infinity;
    let bestState = -1;
    let bestDst: Port | null = null;
    while (heap.size) {
      const s = heap.pop();
      const gs = g[s];
      if (gs + 0 >= best) break;
      const d = (s & 3) as Dir;
      const pt = s >> 2;
      const i = (pt / ny) | 0;
      const j = pt - i * ny;
      const goals = goalAt.get(pt);
      if (goals) {
        for (const q of goals) {
          if (d === REV[q.dir]) continue;
          const c = gs + (d === q.dir ? 0 : BEND) + q.cost;
          if (c < best) {
            best = c;
            bestState = s;
            bestDst = q;
          }
        }
      }
      for (let nd = 0 as Dir; nd < 4; nd = (nd + 1) as Dir) {
        if (nd === REV[d]) continue;
        const i2 = i + DX[nd];
        const j2 = j + DY[nd];
        if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= ny) continue;
        if (ptBlocked[i2 * ny + j2]) continue;
        let len: number;
        let occ: number[] | undefined;
        if (nd < 2) {
          const si = nd === 0 ? i : i2;
          if (hBlocked[j * (nx - 1) + si]) continue;
          len = X[i2] - X[i];
          if (len < 0) len = -len;
          occ = hOcc[j * (nx - 1) + si];
        } else {
          const sj = nd === 2 ? j : j2;
          if (vBlocked[i * (ny - 1) + sj]) continue;
          len = Y[j2] - Y[j];
          if (len < 0) len = -len;
          occ = vOcc[i * (ny - 1) + sj];
        }
        let c = len + (nd === d ? 0 : BEND);
        if (occ && occ.length) {
          let mine = false;
          let other = false;
          for (const r of occ) {
            if (related(r, e)) mine = true;
            else other = true;
          }
          if (other) c += len * OVER;
          else if (mine) c -= len * 0.15;
        }
        // crossing: an earlier unrelated route passes straight through the next point across our direction
        if (nd < 2) {
          if (j2 > 0 && j2 < ny - 1) {
            const up = vOcc[i2 * (ny - 1) + j2 - 1];
            const dn = vOcc[i2 * (ny - 1) + j2];
            if (up && dn) for (const r of up) if (dn.includes(r) && !related(r, e)) c += CROSS;
          }
        } else if (i2 > 0 && i2 < nx - 1) {
          const lf = hOcc[j2 * (nx - 1) + i2 - 1];
          const rt = hOcc[j2 * (nx - 1) + i2];
          if (lf && rt) for (const r of lf) if (rt.includes(r) && !related(r, e)) c += CROSS;
        }
        const ns = (i2 * ny + j2) * 4 + nd;
        const ng = gs + c;
        if (stamp[ns] !== epoch || ng < g[ns] - 1e-9) {
          stamp[ns] = epoch;
          g[ns] = ng;
          parent[ns] = s;
          heap.push(ng + Math.max(0, hcost(i2, j2)), ns);
        }
      }
    }
    if (bestState < 0 || !bestDst) {
      failed.push(e.id);
      continue;
    }
    const states: number[] = [];
    let s = bestState;
    let srcPort: Port | null = null;
    for (let guard = 0; guard < N * 4; guard++) {
      states.push(s);
      const p = parent[s];
      if (p < 0) {
        srcPort = srcPorts[-1 - p];
        break;
      }
      s = p;
    }
    states.reverse();
    if (!srcPort) {
      failed.push(e.id);
      continue;
    }
    found[idx] = { states, src: srcPort, dst: bestDst };
    routeFrom[idx] = e.from;
    routeTo[idx] = e.to;
    // occupancy
    for (let k = 1; k < states.length; k++) {
      const a = states[k - 1] >> 2;
      const b = states[k] >> 2;
      const ai = (a / ny) | 0;
      const aj = a - ai * ny;
      const bi = (b / ny) | 0;
      const bj = b - bi * ny;
      if (aj === bj) {
        const key = aj * (nx - 1) + Math.min(ai, bi);
        (hOcc[key] ??= []).push(idx);
      } else {
        const key = ai * (ny - 1) + Math.min(aj, bj);
        (vOcc[key] ??= []).push(idx);
      }
    }
  }

  // ----- segments -----
  for (let r = 0; r < edges.length; r++) {
    const f = found[r];
    segsByRoute[r] = [];
    if (!f) continue;
    const pts: Array<{ x: number; y: number; i: number; j: number }> = [{ x: f.src.p.x, y: f.src.p.y, i: -1, j: -1 }];
    for (const s of f.states) {
      const pt = s >> 2;
      const i = (pt / ny) | 0;
      const j = pt - i * ny;
      pts.push({ x: X[i], y: Y[j], i, j });
    }
    pts.push({ x: f.dst.p.x, y: f.dst.p.y, i: -1, j: -1 });
    // merge collinear runs into segments
    const segs: Seg[] = [];
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const h = Math.abs(a.y - b.y) < 0.01;
      if (Math.abs(a.x - b.x) < 0.01 && h) continue;
      const lineCoord = h ? a.y : a.x;
      const line = h ? yi(lineCoord) : xi(lineCoord);
      const last = segs[segs.length - 1];
      const startC = h ? a.x : a.y;
      const endC = h ? b.x : b.y;
      if (last && last.h === h && last.line === line) {
        last.end = endC;
        last.lo = Math.min(last.lo, endC);
        last.hi = Math.max(last.hi, endC);
      } else {
        segs.push({ route: r, k: segs.length, h, line, lo: Math.min(startC, endC), hi: Math.max(startC, endC), start: startC, end: endC, port: 0, off: 0 });
      }
    }
    if (segs.length) {
      segs[0].port |= 1;
      segs[segs.length - 1].port |= 2;
    }
    segsByRoute[r] = segs;
  }

  // ----- nudging: shared trunks stay together, everything else is spread into ordered tracks -----
  const linked = new Map<Seg, Set<Seg>>();
  const link = (a: Seg, b: Seg): void => {
    (linked.get(a) ?? linked.set(a, new Set()).get(a)!).add(b);
    (linked.get(b) ?? linked.set(b, new Set()).get(b)!).add(a);
  };
  for (let a = 0; a < edges.length; a++) {
    for (let b = a + 1; b < edges.length; b++) {
      const A = segsByRoute[a];
      const B = segsByRoute[b];
      if (!A.length || !B.length) continue;
      if (edges[a].from === edges[b].from) {
        for (let k = 0; k < Math.min(A.length, B.length); k++) {
          if (A[k].h !== B[k].h || A[k].line !== B[k].line || Math.abs(A[k].start - B[k].start) > 0.5) break;
          link(A[k], B[k]);
          if (Math.abs(A[k].end - B[k].end) > 0.5) break;
        }
      }
      if (edges[a].to === edges[b].to) {
        for (let k = 1; k <= Math.min(A.length, B.length); k++) {
          const sa = A[A.length - k];
          const sb = B[B.length - k];
          if (sa.h !== sb.h || sa.line !== sb.line || Math.abs(sa.end - sb.end) > 0.5) break;
          link(sa, sb);
          if (Math.abs(sa.start - sb.start) > 0.5) break;
        }
      }
    }
  }
  const all = segsByRoute.flat();
  const groups = new Map<string, Seg[]>();
  for (const s of all) {
    if (s.line < 0) continue;
    const key = (s.h ? 'h' : 'v') + s.line;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  const sideOf = (s: Seg, atStart: boolean): number => {
    // direction (+1 / -1) in which the neighbouring segment leaves this segment's line at one end; 0 at a port
    const segs = segsByRoute[s.route];
    const nb = atStart ? segs[s.k - 1] : segs[s.k + 1];
    if (!nb) return 0;
    const far = atStart ? nb.start : nb.end;
    const here = s.h ? (atStart ? 0 : 0) : 0;
    void here;
    const lineC = s.h ? Y[s.line] : X[s.line];
    return far > lineC ? 1 : far < lineC ? -1 : 0;
  };
  for (const list of groups.values()) {
    list.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    // clusters of overlapping segments
    const clusters: Seg[][] = [];
    let cur: Seg[] = [];
    let curHi = -Infinity;
    for (const s of list) {
      if (cur.length && s.lo < curHi - 1) {
        cur.push(s);
        curHi = Math.max(curHi, s.hi);
      } else {
        if (cur.length) clusters.push(cur);
        cur = [s];
        curHi = s.hi;
      }
    }
    if (cur.length) clusters.push(cur);
    for (const cl of clusters) {
      if (cl.length < 2) continue;
      // tracks: union of linked segments
      const tracks: Seg[][] = [];
      const seen = new Set<Seg>();
      for (const s of cl) {
        if (seen.has(s)) continue;
        const t: Seg[] = [];
        const stack = [s];
        seen.add(s);
        while (stack.length) {
          const x = stack.pop()!;
          t.push(x);
          for (const y of linked.get(x) ?? []) if (!seen.has(y) && cl.includes(y)) {
            seen.add(y);
            stack.push(y);
          }
        }
        tracks.push(t);
      }
      if (tracks.length < 2) continue;
      // pairwise crossing cost of putting track p before (left of / above) track q
      const ends = (s: Seg): Array<{ c: number; side: number }> => [
        { c: s.start, side: sideOf(s, true) },
        { c: s.end, side: sideOf(s, false) },
      ];
      const within = (c: number, t: Seg[]): boolean => t.some((s) => c > s.lo + 0.5 && c < s.hi - 0.5);
      const costBefore = (p: Seg[], q: Seg[]): number => {
        let n = 0;
        for (const s of p) for (const e of ends(s)) if (e.side > 0 && within(e.c, q)) n++;
        for (const s of q) for (const e of ends(s)) if (e.side < 0 && within(e.c, p)) n++;
        return n;
      };
      let ord = tracks.map((_, i) => i);
      if (tracks.length <= 6) {
        let bestCost = Infinity;
        let bestOrd = ord;
        const perm = (arr: number[], k: number): void => {
          if (k === arr.length) {
            let c = 0;
            for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) c += costBefore(tracks[arr[a]], tracks[arr[b]]);
            if (c < bestCost) {
              bestCost = c;
              bestOrd = arr.slice();
            }
            return;
          }
          for (let i = k; i < arr.length; i++) {
            [arr[k], arr[i]] = [arr[i], arr[k]];
            perm(arr, k + 1);
            [arr[k], arr[i]] = [arr[i], arr[k]];
          }
        };
        perm(ord.slice(), 0);
        ord = bestOrd;
      } else {
        ord.sort((a, b) => costBefore(tracks[a], tracks[b]) - costBefore(tracks[b], tracks[a]));
      }
      const s0 = cl[0];
      const portLine = cl.some((s) => s.port);
      let free = s0.h ? yFree[s0.line] : xFree[s0.line];
      if (portLine) free = Math.min(free, 18);
      const T = tracks.length;
      const gap = Math.min(TRACK, (2 * free) / Math.max(1, T - 1));
      ord.forEach((ti, pos) => {
        const off = (pos - (T - 1) / 2) * gap;
        for (const s of tracks[ti]) s.off = off;
      });
    }
  }

  // ----- rebuild points -----
  for (let r = 0; r < edges.length; r++) {
    const segs = segsByRoute[r];
    const f = found[r];
    if (!f || !segs.length) continue;
    const coord = (s: Seg): number => (s.h ? Y[s.line] : X[s.line]) + s.off;
    const pts: Pt[] = [];
    const first = segs[0];
    pts.push(first.h ? { x: f.src.p.x, y: coord(first) } : { x: coord(first), y: f.src.p.y });
    for (let k = 0; k + 1 < segs.length; k++) {
      const a = segs[k];
      const b = segs[k + 1];
      pts.push(a.h ? { x: coord(b), y: coord(a) } : { x: coord(a), y: coord(b) });
    }
    const last = segs[segs.length - 1];
    pts.push(last.h ? { x: f.dst.p.x, y: coord(last) } : { x: coord(last), y: f.dst.p.y });
    routesPts[edges[r].id] = pts;
  }
  // unroutable edges: a plain elbow, reported as failed
  for (const id of failed) {
    const e = edges.find((x) => x.id === id)!;
    const a = { x: e.src.x + e.src.w, y: e.src.y + e.src.h / 2 };
    const b = { x: e.dst.x, y: e.dst.y + e.dst.h / 2 };
    const mx = (a.x + b.x) / 2;
    routesPts[id] = [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  return { router: 'channel', routes: routesPts, ms: now() - t0, failed };
}

/** Synchronous router object for the canvas. */
export function createChannelRouter(opts?: ChannelOptions): { name: 'channel'; route(req: RouteRequest): Promise<RouteResult> } {
  return { name: 'channel', route: async (req: RouteRequest) => routeChannels(req, opts) };
}

export type { Obstacle };
