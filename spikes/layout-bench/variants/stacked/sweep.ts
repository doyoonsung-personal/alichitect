// Analysis helper for the stacked variant (not part of the layout): runs option sets through the bench runner on the
// eval sources and prints the numbers the targets name. Run from the repo root:
//   node spikes/layout-bench/variants/stacked/sweep.ts
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { runLayout } from '../../src/runner.ts';
import { aggregateStability } from '../../src/metrics/stability.ts';
import type { LayoutModule } from '../../src/layouts.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { pct } from '../../src/stats.ts';
import { METRICS, cardText } from '../stacked.ts';
import { layoutStacked } from './layout.ts';
import type { StackedOptions } from './layout.ts';

const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const sources = (process.argv[2] ?? 'final,baseline').split(',') as SourceId[];
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, 'op');

const sets: Array<{ name: string; o: StackedOptions }> = JSON.parse(process.argv[3] ?? '[{"name":"default","o":{}}]');
for (const s of sets) {
  const line: string[] = [s.name.padEnd(14)];
  for (const canvas of [{ w: 880, h: 720 }, { w: 1040, h: 800 }]) {
    const mod: LayoutModule = { name: 'sweep', source: 'sweep', METRICS, cardText, layoutGraph: (g, c, p, o) => layoutStacked(g, c, p, { ...s.o, canvas: o.canvas }) };
    const r = runLayout(trace, mod, catalog, table, canvas, { routes: 'none', avoid: null, snapshots: new Set() });
    const st = aggregateStability(r.stability);
    const lim = canvas.w === 880 ? 20 : 24;
    const floor = canvas.w === 880 ? 11 : 12;
    const inScope = r.size.filter((x) => x.cards > 0 && x.cards <= lim);
    const miss = inScope.filter((x) => x.titlePx < floor - 1e-9).length;
    const asp = r.size.filter((x) => x.cards >= 4).map((x) => x.aspect);
    line.push(`${canvas.w}: fol ${st.followUps.unrelated}/${st.followUps.casesWithUnrelated.length}c first ${st.firstTurns.unrelated}/${st.firstTurns.casesWithUnrelated.length}c | title p50 ${pct(r.size.map((x) => x.titlePx), 0.5).toFixed(1)} <${floor}@<=${lim} ${miss}/${inScope.length} | aspect p50 ${pct(asp, 0.5).toFixed(2)} p10 ${pct(asp, 0.1).toFixed(2)} p90 ${pct(asp, 0.9).toFixed(2)}`);
  }
  console.log(line.join('  ||  '));
}
