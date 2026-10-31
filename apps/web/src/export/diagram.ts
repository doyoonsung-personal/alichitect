// From a layout and a graph to the diagram's SVG, through the canvas's own steps: the scene (set titles, badges), the
// planned and routed edges, and the edge layer's drawing model (rounded paths, chevrons, label plates). The routes are
// computed once; the scene and the drawing are redone whenever the font set changes, because the text widths do.
import type { Catalog, Graph } from '@ali/core/types.ts';
import type { LayoutState, Rect } from '@ali/core/layout.ts';
import { drawEdges } from '../canvas/edges-model.ts';
import { STILL } from '../canvas/motion.ts';
import { buildScene } from '../canvas/scene.ts';
import { makeT } from '../i18n/t.ts';
import type { Lang } from '../i18n/t.ts';
import { planEdges } from '../routing/plan.ts';
import type { RouteRequest, RouteResult } from '../routing/types.ts';
import type { FontSet } from './fonts.ts';
import { makeXT } from './strings.ts';
import { renderDiagramSvg } from './svg.ts';
import type { DiagramSvg } from './svg.ts';

export type RouteFn = (req: RouteRequest) => Promise<RouteResult>;

export interface RoutedDiagram {
  graph: Graph;
  layout: LayoutState;
  catalog: Catalog;
  lang: Lang;
  planned: RouteRequest;
  routes: RouteResult['routes'];
  /** Which router answered ('libavoid' or 'channel') and how long it took, for the report. */
  router: string;
  routeMs: number;
}

/** Plans the edges and routes them (the slow, font-independent part). */
export async function routeDiagram(graph: Graph, layout: LayoutState, catalog: Catalog, lang: Lang, route: RouteFn): Promise<RoutedDiagram> {
  const planned = planEdges(graph, layout, catalog);
  const t0 = Date.now();
  const res = await route(planned);
  return { graph, layout, catalog, lang, planned, routes: res.routes, router: res.router, routeMs: Date.now() - t0 };
}

/** The SVG for the current state of the font set. */
export function drawDiagram(d: RoutedDiagram, fonts: FontSet): DiagramSvg {
  const t = makeT(d.lang);
  const xt = makeXT(d.lang);
  const measure = { title: (s: string, px: number) => fonts.width(s, px, 500), body: (s: string, px: number) => fonts.width(s, px, 400) };
  const scene = buildScene({ layout: d.layout, graph: d.graph, catalog: d.catalog, lang: d.lang, t, measure });
  const edges = drawEdges({
    planned: d.planned.edges,
    routes: d.routes,
    routedVersion: 1,
    version: 1,
    layout: d.layout,
    motion: STILL,
    hot: new Set(),
    lit: new Set(),
    building: new Set(),
    streaming: false,
    drawn: new Set(),
    measure: (s) => fonts.width(s, 12, 400),
  });
  const bounds: Rect = d.layout.bounds ?? { x: 0, y: 0, w: d.layout.width, h: d.layout.height };
  return renderDiagramSvg({
    scene,
    edges,
    bounds,
    fonts,
    legend: { path: xt('diagram.legend.path'), data: xt('diagram.legend.data'), async: xt('diagram.legend.async'), resolve: xt('diagram.legend.resolve') },
    chips: { primary: xt('components.fit.primary'), complement: xt('components.fit.complement') },
  });
}
