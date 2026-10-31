// Timing helper (not part of the layout): milliseconds per layout call for a 30-card state (fresh, and as the last step of an incremental replay).
//   node spikes/layout-bench/variants/adaptive/timing.ts   (from the repo root)
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { emptyGraph } from '../../../../packages/core/src/reducer.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Graph } from '../../../../packages/core/src/types.ts';
import { layoutGraph } from '../../variants/adaptive.ts';

const catalog = loadCatalog();
const g = emptyGraph() as Graph;
g.groups['sg'] = { id: 'sg', kind: 'region', label: 'Singapore', parent: null };
g.groups['vpc'] = { id: 'vpc', kind: 'vpc', label: 'App VPC', parent: 'sg' };
const prods = ['ecs', 'rds', 'oss', 'redis', 'alb', 'sls'];
for (let i = 0; i < 30; i++) g.nodes[`n${i}`] = { id: `n${i}`, product: prods[i % prods.length], label: `Node ${i}`, group: i % 6 === 2 ? 'sg' : 'vpc' };
const canvas = { w: 1040, h: 800 };
const time = (f: () => void, n: number): number => {
  for (let i = 0; i < 200; i++) f();
  const t = performance.now();
  for (let i = 0; i < n; i++) f();
  return (performance.now() - t) / n;
};
const fresh = time(() => layoutGraph(g, catalog, undefined, { canvas }), 500);
const prev: LayoutState = layoutGraph(g, catalog, undefined, { canvas });
const warm = time(() => layoutGraph(g, catalog, prev, { canvas }), 500);
console.log(`30 cards (${Object.keys(prev.cards).length} placed): fresh ${fresh.toFixed(3)} ms, with prev ${warm.toFixed(3)} ms per call`);
