// Analysis helper for the adaptive variant (not part of the layout): the legibility and aspect targets on every source.
//   node spikes/layout-bench/variants/adaptive/targets.ts [variant.ts ...]   (from the repo root)
// Prints, per canvas, the states inside the target's card limit that miss the text floor, and the aspect spread.
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { runLayout } from '../../src/runner.ts';
import { loadLayout } from '../../src/layouts.ts';
import type { AdvanceTable } from '../../src/text.ts';

const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const specs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const verbose = process.argv.includes('--v');
const q = (xs: number[], p: number): number => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
for (const spec of specs.length ? specs : ['spikes/layout-bench/variants/adaptive.ts']) {
  const mod = await loadLayout(spec);
  for (const [canvas, lim, floor] of [[{ w: 880, h: 720 }, 20, 11], [{ w: 1040, h: 800 }, 24, 12], [{ w: 1520, h: 940 }, 24, 12]] as const) {
    const r = runLayout(trace, mod, catalog, table, canvas, { routes: 'none', avoid: null, snapshots: new Set() });
    const withCards = r.size.filter((x) => x.cards > 0);
    const scope = withCards.filter((x) => x.cards <= lim);
    const miss = scope.filter((x) => x.titlePx < floor - 1e-9);
    const big = withCards.filter((x) => x.cards > lim);
    const arch = withCards.filter((x) => x.mode === 'architecture');
    const inBand = (xs: typeof withCards): string => `${(100 * xs.filter((x) => x.aspect >= 1.1 && x.aspect <= 1.7).length / xs.length).toFixed(1)}%`;
    console.log(`${mod.name} ${canvas.w}x${canvas.h}: <=${lim} cards below ${floor}px: ${miss.length} of ${scope.length}; min ${Math.min(...scope.map((x) => x.titlePx)).toFixed(2)}; larger ${big.length} (title p50 ${q(big.map((x) => x.titlePx), 0.5)}, min ${Math.min(...big.map((x) => x.titlePx))})`);
    console.log(`   aspect all p25 ${q(withCards.map((x) => x.aspect), 0.25)} p50 ${q(withCards.map((x) => x.aspect), 0.5)} p75 ${q(withCards.map((x) => x.aspect), 0.75)} in 1.1-1.7 ${inBand(withCards)}; arch>=8 p50 ${q(arch.filter((x) => x.cards >= 8).map((x) => x.aspect), 0.5)} in band ${inBand(arch.filter((x) => x.cards >= 8))}; w p50 ${q(withCards.map((x) => x.w), 0.5)} max ${Math.max(...withCards.map((x) => x.w))}; h p50 ${q(withCards.map((x) => x.h), 0.5)} max ${Math.max(...withCards.map((x) => x.h))}`);
    if (verbose) for (const x of miss.sort((a, b) => a.titlePx - b.titlePx).slice(0, Number(process.env.TOPN ?? 25))) console.log(`     ${x.session} T${x.turn + 1} cards ${x.cards} ${x.w}x${x.h} title ${x.titlePx}`);
  }
}
