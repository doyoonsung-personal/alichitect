// Geometry-only projection for consumers that also support cloud layouts.
import type { WorkflowGraph, WorkflowSettings } from '@ali/core/types.ts';
import type { LayoutState, MeasureText, TitleSet } from '@ali/core/layout.ts';
import { GEOMETRY } from '@ali/core/layout.ts';
import { WORKFLOW_GEOMETRY } from '@ali/core/workflow-layout.ts';
import type { layoutWorkflow } from '@ali/core/workflow-layout.ts';
export const WORKFLOW_CARD_H = 92;
export const WORKFLOW_WEB_SLOT = WORKFLOW_CARD_H + 24;
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
// The PDF uses workflowTitle directly and retains its own unrestricted sizing.
export function workflowCardTitle(text: string, measure: MeasureText, room: number): TitleSet {
  const title = workflowTitle(text, measure, room);
  if (title.lines.length <= 2) return title;
  const lines = title.lines.slice(0, 2);
  const last = Array.from(lines[1].trimEnd());
  while (last.length && measure(last.join('') + '…', title.px) > room) last.pop();
  lines[1] = last.join('').trimEnd() + '…';
  return { lines, px: title.px };
}

export function normalizeWorkflowLayout(workflow: WorkflowGraph, layout: WorkflowLayout,
  options: { measure?: MeasureText; settings?: WorkflowSettings } = {}): WorkflowRenderLayout {
  const measure = options.measure ?? ((s: string, px: number) => Array.from(s).length * px);
  const attachmentOwners: Record<string, string> = {};
  for (const n of Object.values(workflow.nodes)) if (n.on) attachmentOwners[n.id] = n.on;
  const hiddenAttachmentIds = Object.keys(workflow.nodes).filter((id) => !layout.cards[id]).sort();
  const sized = Object.fromEntries(Object.entries(layout.cards).map(([id, c]) => {
    const n = workflow.nodes[id];
    const title = workflowCardTitle(n.label, measure, c.w - 48);
    return [id, { ...c, title, h: WORKFLOW_CARD_H }];
  }));
  const scale = <T extends { y: number }>(r: T): T => ({ ...r, y: Math.round(r.y * WORKFLOW_WEB_SLOT / WORKFLOW_GEOMETRY.rowPitch) });
  const cards = Object.fromEntries(Object.entries(sized).map(([id, c]) => [id, scale(c)]));
  const frames = Object.fromEntries(Object.entries(layout.frames).map(([id, f]) => [id, scale(f)]));
  const rects = [...Object.values(cards), ...Object.values(frames)];
  const bounds = { ...layout.bounds, h: Math.max(0, ...rects.map((r) => r.y + r.h)) };
  layout = { ...layout, cards, frames, bounds, height: bounds.h };
  return { source: layout, motion: { ...layout, mode: 'architecture' }, hiddenAttachmentIds, attachmentOwners };
}
