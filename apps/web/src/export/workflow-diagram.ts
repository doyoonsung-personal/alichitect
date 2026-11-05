// PDF card geometry and routing are fitted again for every font pass.
import type { Catalog, WorkflowGraph, WorkflowSettings } from '@ali/core/types.ts';
import type { ModelTable } from '@ali/core/models.ts';
import { normalizeWorkflowLayout } from '../workflow/layout-adapter.ts';
import type { WorkflowLayout } from '../workflow/layout-adapter.ts';
import { buildWorkflowScene } from '../workflow/scene.ts';
import type { WorkflowScene } from '../workflow/scene.ts';
import { routeChannels } from '../routing/channel.ts';
import { checkedWorkflowRoutes, drawWorkflowEdges, planWorkflowEdges, workflowDrawingBounds } from '../workflow/edges.ts';
import { makeT } from '../i18n/t.ts';
import type { Lang } from '../i18n/t.ts';
import type { RouteFn } from './diagram.ts';
import type { FontSet } from './fonts.ts';
import { renderWorkflowOverview, renderWorkflowStrips, renderWorkflowSvg, workflowCardContent } from './workflow-svg.ts';
import type { WorkflowCardFonts } from './workflow-svg.ts';
import { planWorkflowDiagramPages, WORKFLOW_TITLE_FLOOR } from './workflow-pagination.ts';
import { wt } from './workflow-strings.ts';

interface PrepareInput {
  workflow: WorkflowGraph; layout: WorkflowLayout; catalog: Catalog; models: ModelTable;
  settings: WorkflowSettings; lang: Lang; route: RouteFn;
}
export function fitWorkflowPdfScene(source: WorkflowScene, fonts: WorkflowCardFonts): WorkflowScene {
  const cards = source.cards.map((c) => ({ ...c, h: workflowCardContent(c, fonts).h }));
  const brackets = source.brackets.map((b) => ({ ...b }));
  const rects = [...cards, ...brackets].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const placed: typeof rects = [];
  const rows = [...new Set(rects.map((r) => r.y))].map((y) => rects.filter((r) => r.y === y));
  const firstY = Math.min(source.bounds.y, ...rects.map((r) => r.y));
  // Reserve a label line conservatively: routing chooses label positions after fitting.
  const clearance = 24 + (Object.values(source.edgeLabels).some(Boolean) ? 20 : 0);
  for (const row of rows) {
    const top = Math.max(firstY, ...row.flatMap((r) => placed
      .filter((p) => r.x < p.x + p.w && p.x < r.x + r.w).map((p) => p.y + p.h + clearance)));
    for (const r of row) r.y = top;
    placed.push(...row);
  }
  const bounds = { ...source.bounds,
    h: Math.max(source.bounds.y, ...rects.map((r) => r.y + r.h)) - source.bounds.y };
  return { ...source, cards, brackets, byId: new Map(cards.map((c) => [c.id, c])), bounds };
}
function sceneFor(i: PrepareInput, fonts: WorkflowCardFonts) {
  const layout = normalizeWorkflowLayout(i.workflow, i.layout);
  const measure = { title: (s: string, px: number) => fonts.width(s, px, 500),
    body: (s: string, px: number) => fonts.width(s, px, 400) };
  const scene = fitWorkflowPdfScene(buildWorkflowScene({ ...i, layout, t: makeT(i.lang), measure }), fonts);
  const plan = planWorkflowEdges({ workflow: i.workflow, layout, scene });
  return { scene, plan };
}
export async function prepareWorkflowDiagram(i: PrepareInput) {
  const measure = (s: string, px: number) => Array.from(s).length * px;
  const { plan } = sceneFor(i, { width: measure, metrics: () => ({ ascent: 1.16, descent: .288, cap: .733 }) });
  const start = Date.now();
  const result = await i.route(plan.request);
  const routes = checkedWorkflowRoutes(plan, result.routes, result.failed);
  for (const id of Object.keys(plan.semantics)) {
    if ((plan.explicit[id] ?? routes[id])?.length < 2 || !(plan.explicit[id] ?? routes[id])) {
      throw new Error(`Workflow route could not be drawn: ${id}`);
    }
  }
  return { input: i, request: plan.request, routes, router: result.router, routeMs: Date.now() - start };
}
export type PreparedWorkflowDiagram = Awaited<ReturnType<typeof prepareWorkflowDiagram>>;
export function drawWorkflowDiagram(d: PreparedWorkflowDiagram, fonts: FontSet) {
  const { scene, plan } = sceneFor(d.input, fonts);
  // Prepared ports may move when real fonts replace estimates. Route those final obstacles synchronously.
  const result = JSON.stringify(plan.request) === JSON.stringify(d.request) ? null : routeChannels(plan.request);
  const routes = checkedWorkflowRoutes(plan, result?.routes ?? d.routes, result?.failed ?? []);
  const edges = drawWorkflowEdges({ plan, routes, measure: (s) => fonts.width(s, 12, 400) });
  if (edges.length !== Object.keys(plan.semantics).length) throw new Error('Workflow route could not be drawn after font fitting');
  const raw = workflowDrawingBounds(plan, edges);
  const legend = { next: wt(d.input.lang, 'diagram.legend.next'), attached: wt(d.input.lang, 'diagram.legend.attached'),
    loop: wt(d.input.lang, 'diagram.legend.loop'), escalate: wt(d.input.lang, 'diagram.legend.escalate') };
  const bounds = { x: raw.x - 14, y: raw.y - 14,
    w: Math.max(raw.w + 28, ...Object.values(legend).map((s) => fonts.width(s, 12, 400) + 70)), h: raw.h + 128 };
  const minTitlePx = Math.min(14, ...scene.cards.map((c) => c.titlePx));
  const pages = planWorkflowDiagramPages({ bounds, cards: scene.cards, minTitlePx, routes: edges.map(e => {
    const points = [...e.points, ...(e.label ? [{ x: e.labelBox.x, y: e.labelBox.y },
      { x: e.labelBox.x + e.labelBox.w, y: e.labelBox.y + e.labelBox.h }] : [])];
    const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
    return { from: scene.byId.get(e.edge.from)!, to: scene.byId.get(e.edge.to)!,
      bounds: { x, y, w: Math.max(...points.map(p => p.x)) - x, h: Math.max(...points.map(p => p.y)) - y } };
  }) });
  const drawing = renderWorkflowSvg({ scene, edges, bounds, fonts, legend });
  const rendered = pages.map((p, index) => {
    if (p.overview) {
      const overview = renderWorkflowOverview({ scene, edges, bounds, fonts, legend });
      return { ...p, scale: Math.min(1094.55 / overview.width, 649.89 / overview.height, 1.3), drawing: overview };
    }
    if (p.windows) return { ...p, drawing: renderWorkflowStrips({ scene, edges, bounds, fonts, legend }, p.windows) };
    return { ...p, drawing: index === 0 ? drawing : renderWorkflowSvg({ scene, edges, bounds: p.bounds, fonts, legend, tile: true }) };
  });
  const first = rendered[0];
  return { ...drawing, scene, edges, pages: first.overview && first.scale * minTitlePx >= WORKFLOW_TITLE_FLOOR
    ? [{ ...first, overview: false }] : rendered };
}
