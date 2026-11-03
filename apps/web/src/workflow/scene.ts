// Semantic workflow scene. No React, DOM or export dependencies.
import type { Catalog, WorkflowGraph, WorkflowEdge, WorkflowNode, WorkflowSettings } from '@ali/core/types.ts';
import type { ModelTable } from '@ali/core/models.ts';
import type { Rect } from '@ali/core/layout.ts';
import { needsApproval, waived } from '@ali/core/approval.ts';
import type { Lang, TFn } from '../i18n/t.ts';
import type { Measurer } from '../canvas/scene.ts';
import type { WorkflowRenderLayout } from './layout-adapter.ts';
import { workflowCardTitle, WORKFLOW_CARD_H } from './layout-adapter.ts';
export interface WorkflowCardView extends Rect {
  id: string; kind: WorkflowNode['kind']; node: WorkflowNode; label: string;
  titleLines: string[]; titlePx: number; product?: string; model?: string;
  approval: boolean; waived: boolean; badges: string[]; hidden: string[];
}
export interface WorkflowScene {
  cards: WorkflowCardView[];
  brackets: Array<Rect & { id: string; group: string; label: string; nodes: string[] }>;
  byId: Map<string, WorkflowCardView>;
  attachmentOwners: Record<string, string>;
  hiddenAttachmentIds: string[];
  bounds: Rect;
  edgeLabels: Record<string, string>;
}
export function buildWorkflowScene(input: {
  workflow: WorkflowGraph; layout: WorkflowRenderLayout; catalog: Catalog; models: ModelTable;
  settings: WorkflowSettings; lang: Lang; t: TFn; measure: Measurer;
}): WorkflowScene {
  const { workflow, layout, catalog, models, settings, t, measure } = input;
  const cards = Object.values(layout.source.cards).map((r): WorkflowCardView => {
    const n = workflow.nodes[r.id];
    const title = workflowCardTitle(n.label, measure.title, r.w - 48);
    const hidden = layout.hiddenAttachmentIds.filter((id) => {
      let host = layout.attachmentOwners[id];
      const seen = new Set<string>();
      while (host && !seen.has(host)) {
        if (host === n.id) return true;
        if (layout.source.cards[host]) return false;
        seen.add(host); host = layout.attachmentOwners[host];
      }
      return false;
    });
    const badges: string[] = [];
    if (n.turns) badges.push(t('workflow.badge.turns', { n: n.turns }));
    if (n.kind === 'human') badges.push(t('workflow.badge.wait'));
    if (n.effect) badges.push(t('workflow.effect.' + n.effect as 'workflow.effect.read'));
    if (needsApproval(n, settings)) badges.push(t('workflow.badge.approval'));
    const h = WORKFLOW_CARD_H;
    return { id: n.id, kind: n.kind, node: n, label: n.label, x: r.x, y: r.y, w: r.w, h,
      titleLines: title.lines, titlePx: title.px,
      ...(n.product ? { product: catalog.byId.get(n.product)?.short ?? n.product } : {}),
      ...(n.ai ? { model: models.model(n.ai)?.name ?? n.ai } : {}),
      approval: needsApproval(n, settings), waived: waived(n, settings), badges, hidden };
  });
  const brackets = Object.values(layout.source.frames).map((r) => ({
    id: r.id, group: r.group, x: r.x, y: r.y, w: r.w, h: r.h, nodes: r.nodes,
    label: t('workflow.badge.repeat', { over: workflow.groups[r.group]?.over ?? r.label }),
  }));
  const edgeLabels = Object.fromEntries(Object.values(workflow.edges).map((e) =>
    [e.id, workflowEdgeText(e, layout.source.workflow.routes[e.id]?.loop ?? false, t)]));
  const rects = [...cards, ...brackets];
  const bounds = { ...layout.source.bounds, h: Math.max(0, ...rects.map((r) => r.y + r.h)) };
  return { cards, brackets, edgeLabels, byId: new Map(cards.map((c) => [c.id, c])),
    attachmentOwners: layout.attachmentOwners, hiddenAttachmentIds: layout.hiddenAttachmentIds, bounds };
}

export function workflowEdgeText(e: WorkflowEdge, loop: boolean, t: TFn): string {
  return [e.label, e.outcome ? t('workflow.outcome.' + e.outcome as 'workflow.outcome.approve') : '',
    loop && e.max !== undefined ? t('workflow.edge.loop', { n: e.max }) : '',
    e.kind === 'escalate' ? t('workflow.edge.escalate') : '',
  ].filter(Boolean).join(' · ');
}


/** Fold content is presentation-only; the complete scene stays available to the PDF and popover. */
export function workflowCardDetails(card: WorkflowCardView, t: TFn) {
  const usesModel = (card.kind === 'ai' || card.kind === 'agent') && !!card.model;
  const clamped = card.titleLines.join('').replace(/\s/g, '') !== card.label.replace(/\s/g, '');
  const lines = [
    ...(clamped ? [card.label] : []),
    ...(card.model ? [card.model + ' \u00b7 ' + t('workflow.model.candidate')] : []),
    ...(usesModel && card.product ? [card.product] : []),
    ...card.badges,
  ];
  const meta = usesModel ? card.model : card.product;
  return { ...(meta !== undefined ? { meta } : {}), usesModel, lines, expandable: !!lines.length || !!card.hidden.length };
}
