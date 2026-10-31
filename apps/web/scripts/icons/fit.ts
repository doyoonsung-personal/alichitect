// Fits a fallback glyph to the optical size of the official set: scales its geometry uniformly so its larger side
// spans `extent` grid units and centres it on (512, 512). Coordinates are rewritten (fallbacks carry no transforms),
// so stroke weights scale too: refit a glyph only when its weight stays near the official median after scaling.
//   node apps/web/scripts/icons/fit.ts <glyph.svg> [--extent 860] [--write]
// Without --write it prints the result and the before/after box.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg, serializeSvg, type SvgNode } from './sanitize.ts';
import { nodeBBox, type Box } from './bbox.ts';
import { FIT_EXTENT } from './grid.ts';

export interface Affine { s: number; tx: number; ty: number } // x' = s*x + tx, y' = s*y + ty

const round = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Rewrites path data under a uniform scale and translation. Arc flags and rotation are kept as is. */
export function mapPath(d: string, m: Affine): string {
  let i = 0;
  const out: string[] = [];
  const skip = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
  const num = (): number => {
    skip();
    const r = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i));
    if (!r) throw new Error(`path data: number expected at ${i} in ${JSON.stringify(d.slice(i, i + 12))}`);
    i += r[0].length;
    return Number(r[0]);
  };
  const flag = (): number => {
    skip();
    const ch = d[i];
    if (ch !== '0' && ch !== '1') throw new Error(`path data: arc flag expected at ${i}`);
    i++;
    return Number(ch);
  };
  const ax = (v: number) => round(m.s * v + m.tx);
  const ay = (v: number) => round(m.s * v + m.ty);
  const rel = (v: number) => round(m.s * v);
  let cmd = '';
  for (;;) {
    skip();
    if (i >= d.length) break;
    if (/[A-Za-z]/.test(d[i])) {
      cmd = d[i]; i++;
      // A leading relative moveto is absolute (SVG 1.1, 8.3.2): write it as M so the translation applies.
      if (cmd === 'm' && out.length === 0) { out.push('M', ax(num()), ay(num())); cmd = 'l'; continue; }
      out.push(cmd);
      if (/[Zz]/.test(cmd)) continue;
    }
    else if (!cmd || /[Zz]/.test(cmd)) throw new Error(`path data: command expected at ${i}`);
    else out.push(cmd); // implicit repeat, written explicitly
    const r = cmd === cmd.toLowerCase();
    const X = r ? rel : ax, Y = r ? rel : ay;
    switch (cmd.toUpperCase()) {
      case 'M': case 'L': case 'T': out.push(X(num()), Y(num())); if (cmd === 'M') cmd = 'L'; else if (cmd === 'm') cmd = 'l'; break;
      case 'H': out.push(X(num())); break;
      case 'V': out.push(Y(num())); break;
      case 'C': out.push(X(num()), Y(num()), X(num()), Y(num()), X(num()), Y(num())); break;
      case 'S': case 'Q': out.push(X(num()), Y(num()), X(num()), Y(num())); break;
      case 'A': out.push(rel(num()), rel(num()), round(num()), String(flag()), String(flag()), X(num()), Y(num())); break;
      default: throw new Error(`path data: unknown command ${cmd}`);
    }
  }
  return out.join(' ').replace(/ ?([A-Za-z]) ?/g, '$1');
}

/** Applies the map to every shape in the tree. Elements with a transform are refused. */
export function mapTree(n: SvgNode, m: Affine): SvgNode {
  if (n.a.transform) throw new Error(`${n.el} has a transform; fallback glyphs use absolute coordinates`);
  const a = { ...n.a };
  const x = (k: string) => { if (k in a) a[k] = round(m.s * Number(a[k]) + m.tx); };
  const y = (k: string) => { if (k in a) a[k] = round(m.s * Number(a[k]) + m.ty); };
  const len = (k: string) => { if (k in a) a[k] = round(m.s * Number(a[k])); };
  switch (n.el) {
    case 'path': a.d = mapPath(a.d, m); break;
    case 'circle': if (!('cx' in a)) a.cx = '0'; if (!('cy' in a)) a.cy = '0'; x('cx'); y('cy'); len('r'); break;
    case 'ellipse': if (!('cx' in a)) a.cx = '0'; if (!('cy' in a)) a.cy = '0'; x('cx'); y('cy'); len('rx'); len('ry'); break;
    case 'rect': if (!('x' in a)) a.x = '0'; if (!('y' in a)) a.y = '0'; x('x'); y('y'); len('width'); len('height'); len('rx'); len('ry'); break;
    case 'polygon': case 'polyline': {
      const v = (a.points.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
      const pts: string[] = [];
      for (let k = 0; k + 1 < v.length; k += 2) pts.push(`${round(m.s * v[k] + m.tx)},${round(m.s * v[k + 1] + m.ty)}`);
      a.points = pts.join(' ');
      break;
    }
    default: break;
  }
  const out: SvgNode = { el: n.el, a };
  if (n.c) out.c = n.c.map((c) => mapTree(c, m));
  return out;
}

/** The map that makes `box`'s larger side span `extent` units, centred on the 1024 grid. */
export function fitMap(box: Box, extent: number): Affine {
  const s = extent / Math.max(box.x1 - box.x0, box.y1 - box.y0);
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  return { s, tx: 512 - s * cx, ty: 512 - s * cy };
}

/** Serializes a fallback glyph one shape per line, the format of fallback/*.svg. */
export function glyphSource(root: SvgNode): string {
  const kids = (root.c ?? []).map((c) => serializeSvg(c));
  return `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">\n${kids.join('\n')}\n</svg>\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const file = argv.find((x) => !x.startsWith('--'));
  if (!file) throw new Error('usage: fit.ts <glyph.svg> [--extent 860] [--write]');
  const ei = argv.indexOf('--extent');
  const extent = ei >= 0 ? Number(argv[ei + 1]) : FIT_EXTENT;
  const { root, dropped } = sanitizeSvg(readFileSync(file, 'utf8'));
  if (!root) throw new Error('no svg root');
  const notable = dropped.filter((x) => !/^attr:svg@(xmlns|width|height)$/.test(x));
  if (notable.length) throw new Error(`sanitizer dropped ${notable.join(' ')}`);
  const before = nodeBBox(root);
  if (!before) throw new Error('no geometry');
  const m = fitMap(before, extent);
  const fitted: SvgNode = { el: 'svg', a: { viewBox: '0 0 1024 1024' }, c: (root.c ?? []).map((c) => mapTree(c, m)) };
  const after = nodeBBox(fitted)!;
  const fmt = (b: Box) => [b.x0, b.y0, b.x1, b.y1].map((v) => Math.round(v)).join(' ');
  console.log(`scale ${m.s.toFixed(3)}  box ${fmt(before)} -> ${fmt(after)}`);
  if (argv.includes('--write')) writeFileSync(file, glyphSource(fitted));
  else console.log(glyphSource(fitted));
}
