// Geometry-only projection for consumers that also support cloud layouts.
import type { WorkflowGraph } from '@ali/core/types.ts';
import type { LayoutState } from '@ali/core/layout.ts';
import type { layoutWorkflow } from '@ali/core/workflow-layout.ts';
export type WorkflowLayout = ReturnType<typeof layoutWorkflow>;
export interface WorkflowRenderLayout {
  source: WorkflowLayout;
  motion: LayoutState;
  hiddenAttachmentIds: string[];
  attachmentOwners: Record<string, string>;
}
export function normalizeWorkflowLayout(workflow: WorkflowGraph, layout: WorkflowLayout): WorkflowRenderLayout {
  const scale = <T extends { x: number; y: number; w: number; h: number }>(r: T): T =>
    ({ ...r, x: r.x * 1.6, y: r.y * 3, w: r.w * 1.6, h: r.h * 3 });
  layout = { ...layout, cards: Object.fromEntries(Object.entries(layout.cards).map(([id, c]) => [id, scale(c)])),
    frames: Object.fromEntries(Object.entries(layout.frames).map(([id, f]) => [id, scale(f)])),
    bounds: scale(layout.bounds), width: layout.width * 1.6, height: layout.height * 3 };
  const attachmentOwners: Record<string, string> = {};
  for (const n of Object.values(workflow.nodes)) if (n.on) attachmentOwners[n.id] = n.on;
  return { source: layout, motion: { ...layout, mode: 'architecture' },
    hiddenAttachmentIds: Object.keys(workflow.nodes).filter((id) => !layout.cards[id]).sort(), attachmentOwners };
}
