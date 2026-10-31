// A 25-plus-card diagram for the speed check: a recorded conversation's graph with more products added to it, laid out
// by the same core layout the canvas uses.
import type { Graph } from '@ali/core/types.ts';
import { layoutFor } from '../../src/canvas/layout.ts';
import type { AppState } from '../../src/store/types.ts';
import { catalog } from './node-env.ts';

const EXTRA = ['ack', 'polardb', 'rocketmq', 'mse', 'sae', 'fc', 'arms', 'dts', 'maxcompute', 'opensearch', 'tair', 'nas', 'actiontrail', 'ram', 'pai', 'hologres', 'dataworks', 'elasticsearch', 'security-center', 'kms', 'cloud-backup', 'sls'];

/** The state's graph plus enough products to reach `cards` drawn cards. */
export function bigGraph(state: AppState, cards = 26): { graph: Graph; layout: NonNullable<AppState['display']['layout']> } {
  const graph: Graph = structuredClone(state.display.graph);
  const have = new Set(Object.values(graph.nodes).map((n) => n.product));
  let layout = layoutFor(graph, catalog, undefined, { w: 1040, h: 800 });
  let i = 0;
  for (const p of EXTRA) {
    if (layout && Object.keys(layout.cards).length >= cards) break;
    if (have.has(p) || !catalog.byId.has(p)) continue;
    const id = `x-${p}-${i++}`;
    const alb = Object.values(graph.nodes).find((n) => n.product === 'alb');
    graph.nodes[id] = { id, product: p, label: catalog.byId.get(p)!.short, group: null, why: `Added to make the diagram bigger: ${catalog.byId.get(p)!.purpose}` };
    if (alb) graph.edges[`e-${id}`] = { id: `e-${id}`, from: alb.id, to: id, label: 'traffic' };
    layout = layoutFor(graph, catalog, undefined, { w: 1040, h: 800 });
  }
  if (!layout) throw new Error('no layout');
  return { graph, layout };
}
