// Reuse the cloud product and narration checks without mixing the two documents.
import type { Catalog, Constraint, Graph, Warning, WorkflowGraph } from './types.ts';
import { checkConstraints } from './constraints.ts';

export function checkWorkflowConstraints(
  workflow: WorkflowGraph, says: readonly string[], constraints: readonly Constraint[], catalog: Catalog,
): Warning[] {
  const graph: Graph = { nodes: {}, edges: {}, groups: {}, recs: [] };
  for (const edge of Object.values(workflow.edges)) {
    graph.edges[edge.id] = { id: edge.id, from: edge.from, to: edge.to, ...(edge.label ? { label: edge.label } : {}) };
  }
  for (const node of Object.values(workflow.nodes)) {
    for (const field of ['product', 'runs'] as const) {
      const product = node[field];
      if (!product || product === 'customer') continue;
      graph.nodes[`${node.id}-${field}`] = { id: node.id, product, label: node.label, group: null,
        ...(node.why ? { why: node.why } : {}) };
    }
  }
  return checkConstraints(graph, says, constraints, catalog).map((w) => ({ ...w, view: 'workflow' }));
}
