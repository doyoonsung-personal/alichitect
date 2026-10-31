// Analysis helper for the adaptive variant (not part of the layout): why do states miss the title floor? Groups the
// misses (<= card limit, title under the floor) by structure.
//   node spikes/layout-bench/variants/adaptive/misses.ts [1040x800 24 12]   (from the repo root)
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { runLayout } from '../../src/runner.ts';
import { loadLayout } from '../../src/layouts.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { buildModel } from './model.ts';

const [cs, lim, floor] = [process.argv[2] ?? '1040x800', Number(process.argv[3] ?? 24), Number(process.argv[4] ?? 12)];
const [w, h] = cs.split('x').map(Number);
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const mod = await loadLayout('spikes/layout-bench/variants/adaptive.ts');
const r = runLayout(trace, mod, catalog, table, { w, h }, { routes: 'none', avoid: null, snapshots: new Set() });
const displays = new Map<string, import('../../../../packages/core/src/types.ts').Graph>();
for (const s of trace.sessions) for (const f of s.frames) if (f.kind === 'commit') displays.set(`${s.spec.id}|${f.turn}`, f.display);
const scope = r.size.filter((x) => x.cards > 0 && x.cards <= lim);
const miss = scope.filter((x) => x.titlePx < floor - 1e-9);
const cat = new Map<string, number>();
for (const x of miss) {
  const d = displays.get(`${x.session}|${x.turn}`);
  const m = d ? buildModel(d, catalog, true) : undefined;
  const regions = m ? m.regions.size : 0;
  const side = m ? [...m.items.keys()].filter((k) => /^~(account|saas|recs|outside)/.test(k)).length : 0;
  const k = `${regions >= 2 ? 'multi-region' : 'one region'}${side ? ' + side bands' : ''}${x.w / x.h > 1 ? ' (width-bound)' : ''}`;
  cat.set(k, (cat.get(k) ?? 0) + 1);
}
console.log(`${cs}: ${miss.length} of ${scope.length} states with up to ${lim} cards are under ${floor} px`);
for (const [k, n] of [...cat].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), k);
const hs = miss.map((x) => x.h).sort((a, b) => a - b);
console.log('missed state heights p50', hs[Math.floor(hs.length / 2)], 'min', hs[0], 'max', hs.at(-1), '; height that reaches the floor', Math.round((h - 48) / (floor / 12.5)));
if (process.argv.includes('--list')) {
  for (const x of miss.sort((a, b) => b.h - a.h).slice(0, 40)) {
    const d = displays.get(`${x.session}|${x.turn}`)!;
    const m = buildModel(d, catalog, true);
    const n = (re: RegExp): number => [...m.items].filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v.length, 0);
    console.log(`${x.session} T${x.turn + 1} cards ${x.cards} ${x.w}x${x.h} title ${x.titlePx}  compute ${n(/#(compute|span|front|zone)$/)} data ${n(/#data$/)} ingress ${n(/#ingress$/)} shelf ${n(/~[a-z]+#stack$/) - n(/^~/)} left ${n(/^~(?!sol)/)} regions ${m.regions.size}`);
  }
}
