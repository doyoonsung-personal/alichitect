// Routing is prepared once; text fitting and label placement run again for every font pass.
import type { Catalog, WorkflowGraph, WorkflowSettings } from '@ali/core/types.ts';
import type { ModelTable } from '@ali/core/models.ts';
import { normalizeWorkflowLayout } from '../workflow/layout-adapter.ts';
import type { WorkflowLayout } from '../workflow/layout-adapter.ts';
import { buildWorkflowScene } from '../workflow/scene.ts';
import { checkedWorkflowRoutes, drawWorkflowEdges, planWorkflowEdges, workflowDrawingBounds } from '../workflow/edges.ts';
import { makeT } from '../i18n/t.ts';
import type { Lang } from '../i18n/t.ts';
import type { RouteFn } from './diagram.ts';
import type { FontSet } from './fonts.ts';
import { renderWorkflowSvg } from './workflow-svg.ts';
import { planWorkflowDiagramPages } from './workflow-pagination.ts';
import { wt } from './workflow-strings.ts';

interface PrepareInput {
  workflow: WorkflowGraph; layout: WorkflowLayout; catalog: Catalog; models: ModelTable;
  settings: WorkflowSettings; lang: Lang; route: RouteFn;
}
function sceneFor(i: PrepareInput, measure: { title(s: string, px: number): number; body(s: string, px: number): number }) {
  const layout = normalizeWorkflowLayout(i.workflow, i.layout);
  const scene = buildWorkflowScene({ ...i, layout, t: makeT(i.lang), measure });
  return { scene, plan: planWorkflowEdges({ workflow: i.workflow, layout, scene }) };
}
export async function prepareWorkflowDiagram(i: PrepareInput) {
  const measure = (s: string, px: number) => Array.from(s).length * px;
  const { plan } = sceneFor(i, { title: measure, body: measure });
  const start = Date.now();
  const result = await i.route(plan.request);
  const routes = checkedWorkflowRoutes(plan, result.routes, result.failed);
  for (const id of Object.keys(plan.semantics)) {
    if ((plan.explicit[id] ?? routes[id])?.length < 2 || !(plan.explicit[id] ?? routes[id])) {
      throw new Error(`Workflow route could not be drawn: ${id}`);
    }
  }
  return { input: i, routes, router: result.router, routeMs: Date.now() - start };
}
export type PreparedWorkflowDiagram = Awaited<ReturnType<typeof prepareWorkflowDiagram>>;
export function drawWorkflowDiagram(d: PreparedWorkflowDiagram, fonts: FontSet) {
  const { scene, plan } = sceneFor(d.input, {
    title: (s, px) => fonts.width(s, px, 500), body: (s, px) => fonts.width(s, px, 400),
  });
  const edges = drawWorkflowEdges({ plan, routes: d.routes, measure: (s) => fonts.width(s, 12, 400) });
  const raw = workflowDrawingBounds(plan, edges);
  const legend = { next: wt(d.input.lang, 'diagram.legend.next'), attached: wt(d.input.lang, 'diagram.legend.attached'),
    loop: wt(d.input.lang, 'diagram.legend.loop'), escalate: wt(d.input.lang, 'diagram.legend.escalate') };
  const bounds = { x: raw.x - 14, y: raw.y - 14,
    w: Math.max(raw.w + 28, ...Object.values(legend).map((s) => fonts.width(s, 12, 400) + 70)), h: raw.h + 128 };
  const minTitlePx = Math.min(14, ...scene.cards.map((c) => c.titlePx));
  const pages = planWorkflowDiagramPages({ bounds, cards: scene.cards, minTitlePx });
  const drawing = renderWorkflowSvg({ scene, edges, bounds, fonts, legend });
  return { ...drawing, pages: pages.map((p, index) => ({ ...p,
    drawing: index === 0 ? drawing : renderWorkflowSvg({ scene, edges, bounds: p.bounds, fonts, legend, tile: true }),
  })) };
}
