// Analysis helper for the stacked variant (not part of the layout): lists turn-end states that miss the title floor.
//   node spikes/layout-bench/variants/stacked/misses.ts [880|1040] [sources]
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { runLayout } from '../../src/runner.ts';
import type { LayoutModule } from '../../src/layouts.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { METRICS, cardText, layoutGraph } from '../stacked.ts';

const cw = Number(process.argv[2] ?? 880);
const canvas = cw === 880 ? { w: 880, h: 720 } : cw === 1040 ? { w: 1040, h: 800 } : { w: 1520, h: 940 };
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const sources = (process.argv[3] ?? 'final,baseline').split(',') as SourceId[];
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, 'op');
const mod: LayoutModule = { name: 'stacked', source: 'stacked', METRICS, cardText, layoutGraph };
const r = runLayout(trace, mod, catalog, table, canvas, { routes: 'none', avoid: null, snapshots: new Set() });
const lim = cw === 880 ? 20 : 24;
const floor = cw === 880 ? 11 : 12;
const miss = r.size.filter((x) => x.cards > 0 && x.cards <= lim && x.titlePx < floor - 1e-9);
for (const m of miss.slice(0, Number(process.argv[4] ?? 60))) console.log(`${m.session} T${m.turn + 1} cards ${m.cards} ${m.w}x${m.h} title ${m.titlePx}`);
console.log(`misses ${miss.length}`);
