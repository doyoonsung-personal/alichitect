// Net change between two graphs: the one graph diff for chat memory (prompt.ts change summaries, llm.ts turn diffs),
// the eval edit statistics and canvas tests. Same output as prompt.diffGraphs. Browser-safe: no Node APIs.
import type { ApplyResult, Graph, GraphEdge, GraphGroup, GraphNode } from './types.ts';

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

/**
 * Net change between two graphs as one ApplyResult (rec ids are 'rec:<product>'); removed elements are tombstoned.
 * Order: groups, nodes, edges, then recs; within each, removed and updated follow `before`, added follows `after`.
 */
export function diffGraphs(before: Graph, after: Graph): ApplyResult {
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  const tombstones: Array<GraphNode | GraphEdge | GraphGroup> = [];
  const cmp = <T extends GraphNode | GraphEdge | GraphGroup>(a: Record<string, T>, b: Record<string, T>): void => {
    for (const [id, x] of Object.entries(a)) {
      if (!has(b, id)) {
        removed.push(id);
        tombstones.push(x);
      } else if (!same(x, b[id])) updated.push(id);
    }
    for (const id of Object.keys(b)) if (!has(a, id)) added.push(id);
  };
  cmp(before.groups, after.groups);
  cmp(before.nodes, after.nodes);
  cmp(before.edges, after.edges);
  const ra = new Map((before.recs ?? []).map((r) => [r.product, r]));
  const rb = new Map((after.recs ?? []).map((r) => [r.product, r]));
  for (const [p, r] of ra) {
    if (!rb.has(p)) removed.push('rec:' + p);
    else if (!same(r, rb.get(p))) updated.push('rec:' + p);
  }
  for (const p of rb.keys()) if (!ra.has(p)) added.push('rec:' + p);
  return { graph: after, added, updated, removed, tombstones, warnings: [] };
}

