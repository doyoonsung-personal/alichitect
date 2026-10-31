// Analysis helper for the stacked variant (not part of the layout): the legibility targets for core and stacked on
// every source: states with up to 24 cards under 12 px at 1040x800, and up to 20 cards under 11 px at 880x720.
//   node spikes/layout-bench/variants/stacked/targets.ts   (from the repo root)
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
for (const spec of ['core', 'spikes/layout-bench/variants/stacked.ts']) {
  const mod = await loadLayout(spec);
  for (const [canvas, lim, floor] of [[{ w: 880, h: 720 }, 20, 11], [{ w: 1040, h: 800 }, 24, 12]] as const) {
    const r = runLayout(trace, mod, catalog, table, canvas, { routes: 'none', avoid: null, snapshots: new Set() });
    const scope = r.size.filter((x) => x.cards > 0 && x.cards <= lim);
    const miss = scope.filter((x) => x.titlePx < floor - 1e-9);
    const big = r.size.filter((x) => x.cards > lim);
    const evalScope = scope.filter((x) => x.session.startsWith('final:') || x.session.startsWith('baseline:'));
    console.log(`${mod.name} ${canvas.w}x${canvas.h}: states <= ${lim} cards below ${floor}px: ${miss.length} of ${scope.length} (${(100 * miss.length / scope.length).toFixed(1)}%); eval runs only ${evalScope.filter((x) => x.titlePx < floor - 1e-9).length} of ${evalScope.length}; min ${Math.min(...scope.map((x) => x.titlePx)).toFixed(2)} px; larger states ${big.length}, title p50 ${big.map((x) => x.titlePx).sort((a, b) => a - b)[Math.floor(big.length / 2)]}`);
  }
}
