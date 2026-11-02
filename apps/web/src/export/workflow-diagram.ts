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
import { renderWorkflowSvg, workflowCardContent } from './workflow-svg.ts';
import type { WorkflowCardFonts } from './workflow-svg.ts';
import { planWorkflowDiagramPages } from './workflow-pagination.ts';
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
  // Keep each original row aligned; expand only gaps that cannot hold the PDF content.
  for (const y of [...new Set(rects.map((r) => r.y))]) {
    const row = rects.filter((r) => r.y === y && !placed.includes(r));
    const top = Math.max(y, ...row.flatMap((r) => placed
      .filter((p) => r.x < p.x + p.w && p.x < r.x + r.w).map((p) => p.y + p.h + 24)));
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
  return { scene, plan: planWorkflowEdges({ workflow: i.workflow, layout, scene }) };
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
  const pages = planWorkflowDiagramPages({ bounds, cards: scene.cards, minTitlePx });
  const drawing = renderWorkflowSvg({ scene, edges, bounds, fonts, legend });
  return { ...drawing, scene, edges, pages: pages.map((p, index) => ({ ...p,
    drawing: index === 0 ? drawing : renderWorkflowSvg({ scene, edges, bounds: p.bounds, fonts, legend, tile: true }),
  })) };
}
