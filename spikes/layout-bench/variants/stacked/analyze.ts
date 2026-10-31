// Analysis helper for the stacked variant (not part of the layout): composition of real turn-end states by placement
// class, and the title width distribution at a given type size. Run from the repo root:
//   node spikes/layout-bench/variants/stacked/analyze.ts [titlePx]
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { cardIds } from '../../src/display.ts';
import { entryOf, textWidth } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { pct } from '../../src/stats.ts';
import { stackedCardText } from './text.ts';

const px = Number(process.argv[2] ?? 14);
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const specs = loadSessions(ALL_SOURCES, catalog, { ops: 'content' });
const trace = buildTrace(specs, catalog, 'turn');

const classOf = (product: string, inVpcHint: boolean): string => {
  const e = entryOf(catalog, product);
  if (!e) return 'unknown';
  if (e.scope === 'external') return e.lane === 'thirdparty' ? 'outside' : 'external';
  if (e.scope === 'global' || e.scope === 'edge') return 'edge';
  if (e.scope === 'account') return 'account';
  if (e.scope === 'saas') return 'saas';
  if (e.scope === 'vpc-edge') return 'boundary';
  if (e.scope === 'vpc' || (inVpcHint && e.vpcAttachable)) return e.lane === 'ingress' ? 'ingress' : e.lane === 'compute' ? 'compute' : 'data';
  return 'shelf:' + e.lane;
};

const counts: Record<string, number[]> = {};
const titleW: number[] = [];
const subW: number[] = [];
const long: Map<string, number> = new Map();
let states = 0;
for (const st of trace.sessions) {
  for (const f of st.frames) {
    if (f.kind !== 'commit' || !f.count) continue;
    states++;
    const g = f.display;
    const ids = cardIds(g);
    const c: Record<string, number> = {};
    for (const id of ids) {
      const n = g.nodes[id];
      const chain: string[] = [];
      let cur = n.group;
      while (cur && g.groups[cur] && chain.length < 10) {
        chain.push(g.groups[cur].kind);
        cur = g.groups[cur].parent;
      }
      const k = classOf(n.product, chain.includes('vpc') || chain.includes('zone') || chain.includes('subnet'));
      c[k] = (c[k] ?? 0) + 1;
      const t = stackedCardText({ id, kind: 'node', product: n.product } as never, g, catalog);
      const w = textWidth(table, 'title', t.title, px);
      titleW.push(w);
      if (t.subtitle) subW.push(textWidth(table, 'subtitle', t.subtitle, px - 1.5));
      if (w > 130) long.set(t.title, (long.get(t.title) ?? 0) + 1);
    }
    c.recs = g.recs.length;
    c.cards = ids.size + g.recs.length;
    for (const k of new Set([...Object.keys(counts), ...Object.keys(c)])) (counts[k] ??= []).push(c[k] ?? 0);
  }
}
console.log(`states ${states}`);
for (const [k, v] of Object.entries(counts).sort()) {
  const nz = v.filter((x) => x > 0);
  console.log(`${k.padEnd(18)} present ${String(nz.length).padStart(4)}  p50 ${pct(nz, 0.5)}  p90 ${pct(nz, 0.9)}  max ${Math.max(0, ...v)}`);
}
for (const room of [100, 110, 116, 120, 126, 130, 140, 150]) {
  console.log(`title @${px}px: share wider than ${room}px: ${(titleW.filter((w) => w > room).length / titleW.length * 100).toFixed(2)}%   subtitle @${px - 1.5}px: ${(subW.filter((w) => w > room).length / subW.length * 100).toFixed(2)}%`);
}
console.log('title width p50/p90/p99/max', pct(titleW, 0.5).toFixed(1), pct(titleW, 0.9).toFixed(1), pct(titleW, 0.99).toFixed(1), Math.max(...titleW).toFixed(1));
console.log('longest titles:', [...long.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${k} x${n}`).join(' | '));
