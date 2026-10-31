// Bounding box of SVG path data, by walking every command in absolute coordinates and sampling curves and arcs.
// Used to crop the logos to a tight viewBox and to check that glyphs stay on the 1024 grid.

export interface Box { x0: number; y0: number; x1: number; y1: number }

const SAMPLES = 24;

function tokens(d: string): Array<string | number> {
  const out: Array<string | number> = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  for (const m of d.matchAll(re)) out.push(m[1] ? m[1] : Number(m[2]));
  return out;
}

/** Arc flags may be written without separators ('a1 1 0 011 1'); split them out. */
function arcArgs(list: Array<string | number>, i: number): { args: number[]; next: number } | null {
  const args: number[] = [];
  let j = i;
  while (args.length < 7 && j < list.length && typeof list[j] === 'number') { args.push(list[j] as number); j++; }
  return args.length === 7 ? { args, next: j } : null;
}

export function pathBBox(d: string): Box | null {
  const t = tokens(d);
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x: number, y: number) => {
    if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x;
    if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y;
  };
  let x = 0, y = 0, sx = 0, sy = 0; // current point and subpath start
  let cx = 0, cy = 0; // last control point, for S and T
  let prev = '';
  let i = 0;
  let cmd = '';
  const num = (): number => { const v = t[i++]; if (typeof v !== 'number') throw new Error('bad path'); return v; };
  try {
    while (i < t.length) {
      if (typeof t[i] === 'string') { cmd = t[i] as string; i++; }
      else if (!cmd) return null;
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      switch (C) {
        case 'M': { x = ox + num(); y = oy + num(); sx = x; sy = y; add(x, y); cmd = rel ? 'l' : 'L'; break; }
        case 'L': { x = ox + num(); y = oy + num(); add(x, y); break; }
        case 'H': { x = ox + num(); add(x, y); break; }
        case 'V': { y = oy + num(); add(x, y); break; }
        case 'Z': { x = sx; y = sy; break; }
        case 'C': case 'S': case 'Q': case 'T': {
          let x1: number, y1: number, x2: number, y2: number;
          const reflect = (/[CS]/.test(prev) && /[CS]/.test(C)) || (/[QT]/.test(prev) && /[QT]/.test(C));
          if (C === 'C') { x1 = ox + num(); y1 = oy + num(); x2 = ox + num(); y2 = oy + num(); }
          else if (C === 'S') { x1 = reflect ? 2 * x - cx : x; y1 = reflect ? 2 * y - cy : y; x2 = ox + num(); y2 = oy + num(); }
          else if (C === 'Q') { x1 = ox + num(); y1 = oy + num(); x2 = x1; y2 = y1; }
          else { x1 = reflect ? 2 * x - cx : x; y1 = reflect ? 2 * y - cy : y; x2 = x1; y2 = y1; }
          const ex = ox + num(), ey = oy + num();
          for (let k = 1; k <= SAMPLES; k++) {
            const s = k / SAMPLES, u = 1 - s;
            if (C === 'C' || C === 'S') add(u * u * u * x + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * ex, u * u * u * y + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * ey);
            else add(u * u * x + 2 * u * s * x1 + s * s * ex, u * u * y + 2 * u * s * y1 + s * s * ey);
          }
          cx = C === 'C' || C === 'S' ? x2 : x1; cy = C === 'C' || C === 'S' ? y2 : y1;
          x = ex; y = ey;
          break;
        }
        case 'A': {
          const r = arcArgs(t, i);
          if (!r) return null;
          i = r.next;
          const [rxIn, ryIn, rot, large, sweep, exR, eyR] = r.args;
          const ex = ox + exR, ey = oy + eyR;
          for (const [px, py] of arcPoints(x, y, rxIn, ryIn, rot, large !== 0, sweep !== 0, ex, ey)) add(px, py);
          x = ex; y = ey;
          break;
        }
        default: return null;
      }
      prev = C;
    }
  } catch { return null; }
  return Number.isFinite(box.x0) ? box : null;
}

/** Endpoint-to-center arc conversion (SVG 1.1 F.6.5), sampled. */
function arcPoints(x1: number, y1: number, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, x2: number, y2: number): Array<[number, number]> {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const pts: Array<[number, number]> = [];
  for (let k = 1; k <= SAMPLES; k++) {
    const th = t1 + (dt * k) / SAMPLES;
    const px = rx * Math.cos(th), py = ry * Math.sin(th);
    pts.push([cos * px - sin * py + cx, sin * px + cos * py + cy]);
  }
  return pts;
}

/** Shape-level view of a sanitized node, so this module stays independent of sanitize.ts. */
export interface ShapeLike { el: string; a: Readonly<Record<string, string>>; c?: readonly ShapeLike[] }

/** Bounding box of a node and its children in its own coordinates. Transforms are not applied. */
export function nodeBBox(n: ShapeLike): Box | null {
  const v = (k: string) => Number(n.a[k] ?? 0);
  let b: Box | null = null;
  if (n.el === 'path' && n.a.d) b = pathBBox(n.a.d);
  else if (n.el === 'circle') b = { x0: v('cx') - v('r'), y0: v('cy') - v('r'), x1: v('cx') + v('r'), y1: v('cy') + v('r') };
  else if (n.el === 'ellipse') b = { x0: v('cx') - v('rx'), y0: v('cy') - v('ry'), x1: v('cx') + v('rx'), y1: v('cy') + v('ry') };
  else if (n.el === 'rect') b = { x0: v('x'), y0: v('y'), x1: v('x') + v('width'), y1: v('y') + v('height') };
  else if ((n.el === 'polygon' || n.el === 'polyline') && n.a.points) {
    const p = (n.a.points.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    for (let i = 0; i + 1 < p.length; i += 2) b = unionBox(b, { x0: p[i], y0: p[i + 1], x1: p[i], y1: p[i + 1] });
  }
  for (const c of n.c ?? []) b = unionBox(b, nodeBBox(c));
  return b;
}

export function unionBox(a: Box | null, b: Box | null): Box | null {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}
