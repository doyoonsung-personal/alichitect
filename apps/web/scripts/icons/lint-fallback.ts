// Lints fallback glyph sources before a build: sanitizer drops, transforms, shape count, bounding box on the 1024
// grid and how the glyph's larger side compares with the official set (median 853, middle half 811-938).
//   node apps/web/scripts/icons/lint-fallback.ts [dir]
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeSvg, type SvgNode } from './sanitize.ts';
import { nodeBBox } from './bbox.ts';
import { LIVE_AREA, MIN_EXTENT } from './grid.ts';

const dir = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), 'fallback'));
const hasTransform = (n: SvgNode): boolean => Boolean(n.a.transform) || (n.c ?? []).some(hasTransform);
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.svg')).sort()) {
  const r = sanitizeSvg(readFileSync(join(dir, f), 'utf8'));
  const drops = r.dropped.filter((d) => !/^attr:svg@(xmlns|width|height)$/.test(d));
  const b = r.root ? nodeBBox(r.root) : null;
  const transformed = r.root ? hasTransform(r.root) : false;
  const inGrid = b && b.x0 >= LIVE_AREA.min && b.y0 >= LIVE_AREA.min && b.x1 <= LIVE_AREA.max && b.y1 <= LIVE_AREA.max;
  const extent = b ? Math.max(b.x1 - b.x0, b.y1 - b.y0) : 0;
  const problems = [
    ...(inGrid ? [] : ['OUT OF LIVE AREA']),
    ...(extent >= MIN_EXTENT ? [] : [`SMALL (${Math.round(extent)} < ${MIN_EXTENT})`]),
    ...(transformed ? ['TRANSFORM'] : []),
    ...(drops.length ? [`DROPPED ${drops.slice(0, 5).join(' ')}`] : []),
  ];
  if (problems.length) bad++;
  console.log(`${f.padEnd(20)} ${String(r.root?.c?.length ?? 0).padStart(2)} shapes  bbox ${b ? [b.x0, b.y0, b.x1, b.y1].map((x) => Math.round(x)).join(' ') : '?'}  extent ${Math.round(extent)}${problems.length ? '  ' + problems.join('  ') : ''}`);
}
process.exitCode = bad ? 1 : 0;
