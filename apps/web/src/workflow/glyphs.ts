// Step symbols are pure SVG geometry, shared with print consumers.
import type { WorkflowNodeKind } from '@ali/core/types.ts';
import { iconFor } from '../icons/index.ts';
import type { IconGeometry } from '../icons/types.ts';
const paths: Partial<Record<WorkflowNodeKind, string>> = {
  trigger: 'M13 2 5 13h6l-1 9 9-13h-6Z',
  decide: 'M12 2 22 12 12 22 2 12Z M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 16v1',
  guard: 'M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6Z M7 12l3 3 7-7',
  human: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M3 22v-3a9 7 0 0 1 18 0v3',
  act: 'M3 5h11v14H3Z M10 12h12m-5-5 5 5-5 5',
  end: 'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20 M8 8h8v8H8Z',
};
const products: Partial<Record<WorkflowNodeKind, string>> = {
  ai: 'model-studio', agent: 'agentcore', tool: 'function-compute', knowledge: 'opensearch', memory: 'tair',
};
export function workflowGlyph(kind: WorkflowNodeKind): IconGeometry {
  const d = paths[kind];
  return d ? { viewBox: '0 0 24 24', multicolor: false,
    nodes: [{ el: 'path', a: { d, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round' } }] }
    : iconFor(products[kind] ?? '', kind === 'memory' ? 'database' : 'ai').geometry;
}
