// The export pipeline: session -> proposal model -> routed diagram -> two passes over the document (dry, then real) ->
// PDF bytes. Pure TypeScript over pdfkit; the browser and Node differ only in the font source, the logo and the router,
// which the caller passes in. Nothing here touches the DOM.
import PDFDocument from 'pdfkit';
import type { Catalog, Graph, ProposalDraft, WorkflowGraph } from '@ali/core/types.ts';
import type { LayoutState } from '@ali/core/layout.ts';
import type { Lang } from '../i18n/t.ts';
import type { SessionRecord } from '../store/types.ts';
import { hasContent } from '../canvas/layout.ts';
import { drawDiagram, routeDiagram } from './diagram.ts';
import type { RouteFn } from './diagram.ts';
import { proposalFileName } from './filename.ts';
import { createFontSet } from './fonts.ts';
import type { FontSource } from './fonts.ts';
import { buildProposal } from './model.ts';
import { buildDocument } from './pdf.ts';
import type { PdfReport } from './pdf.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import type { WorkflowLayout } from '../workflow/layout-adapter.ts';
import { models } from '../workflow/models.ts';
import { drawWorkflowDiagram, prepareWorkflowDiagram } from './workflow-diagram.ts';
import { wt } from './workflow-strings.ts';
import { xt } from './strings.ts';
import { createStubDoc } from './stub.ts';

export interface GenerateInput {
  session: SessionRecord;
  workflow?: WorkflowGraph;
  workflowLayout?: WorkflowLayout;
  graph: Graph;
  layout: LayoutState | null;
  catalog: Catalog;
  lang: Lang;
  title: string;
  customer: string;
  now: Date;
  fontSource: FontSource;
  route: RouteFn;
  /** The Alibaba Cloud logo as SVG text (the English or the Chinese one) and its width / height. */
  logo: { svg: string; aspect: number } | null;
  /** The drafted narrative (POST /api/proposal). Absent or null makes the basic document. */
  draft?: ProposalDraft | null;
}

export interface GenerateResult {
  bytes: Uint8Array;
  fileName: string;
  report: PdfReport & {
    totalMs: number;
    routeMs: number;
    router: string;
    fontsMs: number;
    drawMs: number;
    faces: number;
    fontBytes: number;
    passes: number;
    svg: { cards: number; edges: number; labels: number; runs: number } | null;
  };
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

type Drawn = ReturnType<typeof drawDiagram>;

export async function generateProposalPdf(i: GenerateInput): Promise<GenerateResult> {
  const t0 = now();
  const model = buildProposal({ session: i.session, graph: i.graph, layout: i.layout, catalog: i.catalog,
    lang: i.lang, title: i.title, customer: i.customer, now: i.now, draft: i.draft,
    ...(i.workflowLayout ? { workflowLayout: i.workflowLayout } : {}) });
  const fonts = createFontSet(i.fontSource);
  const workflow = i.session.memory.workflow;
  if (i.workflow && JSON.stringify(i.workflow) !== JSON.stringify(workflow)) {
    throw new Error('Workflow export must use the committed session snapshot');
  }
  const prepared = model.workflow && workflow ? await prepareWorkflowDiagram({
    workflow, layout: layoutWorkflow(workflow, i.workflowLayout), catalog: i.catalog, models,
    settings: i.session.memory.workflowSettings ?? {}, lang: i.lang, route: i.route,
  }) : null;
  const routed = !prepared && i.layout && hasContent(i.graph) ? await routeDiagram(i.graph, i.layout, i.catalog, i.lang, i.route) : null;

  const compose = (doc: PDFDocument, dry: boolean): { report: PdfReport; svg: Drawn | null } => {
    const workflowSvg = prepared ? drawWorkflowDiagram(prepared, fonts) : null;
    const svg = workflowSvg ?? (routed ? drawDiagram(routed, fonts) : null);
    const report = buildDocument({ model, fonts, ...(workflow ? { workflow } : {}), diagrams: svg ? [{
      id: prepared ? 'workflow' : 'cloud', view: prepared ? 'workflow' : 'cloud',
      title: prepared ? wt(i.lang, 'diagram.heading') : xt(i.lang, 'diagram.heading'), drawing: svg,
      ...(workflowSvg ? { pages: workflowSvg.pages } : {}),
    }] : [], logoSvg: i.logo?.svg ?? null, logoAspect: i.logo?.aspect ?? 7.421, dry, doc });
    return { report, svg };
  };

  // pass 1: dry, to learn which glyphs the document needs
  let passes = 1;
  compose(createStubDoc(), true);
  const tf = now();
  await fonts.load();
  const fontsMs = now() - tf;

  // pass 2 for real; a third when a stand-in character turned up that needed another face
  const td = now();
  let out: { report: PdfReport; svg: Drawn | null; bytes: Uint8Array };
  for (;;) {
    passes++;
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: false,
      bufferPages: true,
      font: null,
      lang: i.lang === 'zh' ? 'zh-CN' : i.lang === 'ko' ? 'ko-KR' : 'en',
      displayTitle: true,
      info: { Title: model.title, Author: 'Architecture Builder', Creator: 'Architecture Builder', Subject: xt(i.lang, 'doc.type'), Keywords: 'Alibaba Cloud, architecture, proposal' },
    });
    const chunks: Uint8Array[] = [];
    const done = new Promise<void>((resolve, reject) => {
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve());
      doc.on('error', reject);
    });
    fonts.register(doc);
    const r = compose(doc, false);
    if (fonts.missing && passes < 5) {
      doc.end();
      await done;
      await fonts.load();
      continue;
    }
    doc.end();
    await done;
    out = { ...r, bytes: concat(chunks) };
    break;
  }
  const drawMs = now() - td;
  const st = fonts.stats();
  return {
    bytes: out.bytes,
    fileName: proposalFileName(model.title, model.date),
    report: {
      ...out.report,
      totalMs: Math.round(now() - t0),
      routeMs: prepared?.routeMs ?? routed?.routeMs ?? 0,
      router: prepared?.router ?? routed?.router ?? 'none',
      fontsMs: Math.round(fontsMs),
      drawMs: Math.round(drawMs),
      faces: st.faces,
      fontBytes: st.bytes,
      passes,
      svg: out.svg ? { cards: out.svg.counts.cards, edges: out.svg.counts.edges, labels: out.svg.counts.labels, runs: out.svg.counts.runs } : null,
    },
  };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
