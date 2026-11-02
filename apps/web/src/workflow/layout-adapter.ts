// Geometry-only projection for consumers that also support cloud layouts.
import type { WorkflowGraph } from '@ali/core/types.ts';
import type { LayoutState, MeasureText, TitleSet } from '@ali/core/layout.ts';
import { GEOMETRY } from '@ali/core/layout.ts';
import type { layoutWorkflow } from '@ali/core/workflow-layout.ts';
export type WorkflowLayout = ReturnType<typeof layoutWorkflow>;
export interface WorkflowRenderLayout {
  source: WorkflowLayout;
  motion: LayoutState;
  hiddenAttachmentIds: string[];
  attachmentOwners: Record<string, string>;
}
// Workflow titles wrap at natural size instead of shrinking the entire canvas's readable floor.
export function workflowTitle(text: string, measure: MeasureText, room: number): TitleSet {
  const lines: string[] = [];
  let line = '';
  for (const unit of text.trim().match(/\S+\s*/gu) ?? []) {
    if (line && measure((line + unit).trimEnd(), GEOMETRY.titlePx) > room) {
      lines.push(line.trimEnd()); line = '';
    }
    for (const ch of unit) {
      if (line && measure((line + ch).trimEnd(), GEOMETRY.titlePx) > room) {
        lines.push(line.trimEnd()); line = '';
      }
      line += ch;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return { lines: lines.length ? lines : [''], px: GEOMETRY.titlePx };
}
export function normalizeWorkflowLayout(workflow: WorkflowGraph, layout: WorkflowLayout): WorkflowRenderLayout {
  const scale = <T extends { x: number; y: number; w: number; h: number }>(r: T): T =>
    ({ ...r, y: r.y * 2.5 });
  const cards = Object.fromEntries(Object.entries(layout.cards).map(([id, c]) => {
    const title = workflowTitle(workflow.nodes[id].label, (s, px) => Array.from(s).length * px, c.w - 48);
    return [id, { ...scale(c), title }];
  }));
  const frames = Object.fromEntries(Object.entries(layout.frames).map(([id, f]) => [id, scale(f)]));
  const rects = [...Object.values(cards), ...Object.values(frames)];
  const bounds = { ...layout.bounds, h: Math.max(0, ...rects.map((r) => r.y + r.h)) };
  layout = { ...layout, cards, frames, bounds, height: bounds.h };
  const attachmentOwners: Record<string, string> = {};
  for (const n of Object.values(workflow.nodes)) if (n.on) attachmentOwners[n.id] = n.on;
  return { source: layout, motion: { ...layout, mode: 'architecture' },
    hiddenAttachmentIds: Object.keys(workflow.nodes).filter((id) => !layout.cards[id]).sort(), attachmentOwners };
}
