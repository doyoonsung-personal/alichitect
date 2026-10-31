// Analysis helper for the adaptive variant (not part of the layout): what turn-end states contain, by placement area.
//   node spikes/layout-bench/variants/adaptive/analyze.ts   (from the repo root)
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { buildModel } from './model.ts';

const catalog = loadCatalog();
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const area = (slot: string): string => {
  if (slot.startsWith('~sol:')) return 'solution';
  if (slot.includes('#zone') || slot.endsWith('#span') || slot.endsWith('#compute')) return 'compute';
  if (slot.endsWith('#ingress')) return 'ingress';
  if (slot.endsWith('#data')) return 'data';
  if (slot.endsWith('#boundary')) return 'boundary';
  if (slot.includes('~') && slot.indexOf('~') > 0) return 'shelf';
  if (slot.startsWith('~dns') || slot.endsWith('#upper')) return 'dns';
  if (slot.startsWith('~account') || slot.startsWith('~saas') || slot.startsWith('~recs') || slot.startsWith('~outside')) return 'side';
  return 'ext/edge:' + slot.split('#')[0];
};
const rows: Array<Record<string, number>> = [];
for (const s of trace.sessions) {
  for (const f of s.frames) {
    if (f.kind !== 'commit' || !f.count) continue;
    const m = buildModel(f.display, catalog, true);
    const r: Record<string, number> = { cards: 0, regions: m.regions.size, vpcs: m.vpcs.size, zones: [...m.vpcs.values()].reduce((a, v) => a + v.zones.length, 0) };
    for (const [slot, items] of m.items) {
      let a = area(slot);
      if (a.startsWith('ext/edge')) a = slot.startsWith('~edge') || /edge/i.test(slot) ? 'edge' : 'ext';
      r[a] = (r[a] ?? 0) + items.length;
      r.cards += items.length;
    }
    rows.push(r);
  }
}
const keys = ['cards', 'ext', 'dns', 'edge', 'ingress', 'compute', 'data', 'boundary', 'shelf', 'side', 'solution', 'regions', 'vpcs', 'zones'];
const q = (xs: number[], p: number): number => { const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
console.log('states', rows.length);
for (const k of keys) {
  const xs = rows.map((r) => r[k] ?? 0);
  console.log(k.padEnd(9), 'p50', q(xs, 0.5), 'p90', q(xs, 0.9), 'max', Math.max(...xs), 'nonzero', xs.filter((x) => x > 0).length);
}
