// The proposal document: cover, summary, diagram, components, recommendations, connections, revision history. It draws
// onto a pdfkit document through the Typesetter, at explicit coordinates, with the tokens of the app (ink on a white
// sheet, hairlines, blue links; orange only in the logo and the official icons). The same function runs twice: first
// "dry" on a stub document, so the font set learns which glyphs it needs, then for real.
// With a drafted narrative the business reader comes first: cover, executive summary, the customer's needs and how the
// design answers them, the diagram, components led by why each is here, recommendations, trade-offs and next steps, and
// then the technical record (the summary, renamed the design record), connections and revision history.
import type { TurnMode, WorkflowGraph } from '@ali/core/types.ts';
import { makeT } from '../i18n/t.ts';
import { assumptionText, unpricedReason, usd } from '../workflow/panel-model.ts';
import { workflowPdfData } from './workflow-data.ts';
import { wt } from './workflow-strings.ts';
import { planTablePages } from './workflow-pagination.ts';
import type { DiagramPage } from './workflow-pagination.ts';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { iconFor } from '../icons/index.ts';
import { iconSvg } from '../icons/svg.ts';
import type { FontSet } from './fonts.ts';
import type { ComponentEntry, NarrativeModel, ProposalModel, RecEntry } from './model.ts';
import { makeXT } from './strings.ts';
import type { XT } from './strings.ts';
import type { DiagramSvg } from './svg.ts';
import { COLOR } from './tokens.ts';
import { Typesetter } from './typeset.ts';
import type { TextStyle } from './typeset.ts';

export type PageSize = readonly [number, number];
export const A4: PageSize = [595.28, 841.89];
export const A4_LANDSCAPE: PageSize = [841.89, 595.28];
export const A3_LANDSCAPE: PageSize = [1190.55, 841.89];

const MARGIN = 48;
const HEADER_RULE_Y = 50;
const CONTENT_TOP = 76;
const FOOTER_RULE_FROM_BOTTOM = 40;
/** A diagram is set at no less than this scale (a 14 px card title is then 8.7 pt) or moves to a larger page. */
export const MIN_DIAGRAM_SCALE = 0.62;
/** The drafted narrative's reading width: about 70 characters of body text, the measure business prose reads best at. */
const MEASURE = 400;

export interface PdfDiagram {
  id: string; view: TurnMode; title: string; drawing: DiagramSvg;
  pages?: Array<DiagramPage & { drawing: DiagramSvg }>;
}

export interface PdfInput {
  model: ProposalModel;
  fonts: FontSet;
  diagrams: readonly PdfDiagram[];
  workflow?: WorkflowGraph;
  /** The Alibaba Cloud logo (English or Chinese) as SVG text; null draws no logo. */
  logoSvg: string | null;
  logoAspect: number;
  /** Dry run: no drawing calls reach pdfkit and svg-to-pdfkit is skipped. */
  dry: boolean;
  /** Called with a pdfkit document or a stub. */
  doc: PDFDocument;
}

export interface PdfReport {
  pages: number;
  diagramPage: { size: 'A4' | 'A3'; scale: number } | null;
  diagramPages: Array<{ id: string; page: number; size: 'A4' | 'A3'; scale: number; overview: boolean }>;
  components: number;
  links: number;
  missingDocs: number;
}

interface Pt {
  px: number;
  lh: number;
}

const stripSize = (svg: string): string => svg.replace(/^(<svg[^>]*?)\s(?:width|height)="[^"]*"/, '$1').replace(/^(<svg[^>]*?)\s(?:width|height)="[^"]*"/, '$1');

export function buildDocument(i: PdfInput): PdfReport {
  const { model, fonts, doc } = i;
  const xt = makeXT(model.lang);
  const ts = new Typesetter(doc, fonts);
  const cjk = model.lang !== 'en';
  const body: Pt = { px: 9.5, lh: cjk ? 15.5 : 14 };
  const small: Pt = { px: 8.5, lh: cjk ? 13 : 12 };
  const report: PdfReport = { pages: 0, diagramPage: null, diagramPages: [], components: model.components.length, links: 0, missingDocs: 0 };

  const ink = (px: number, weight: TextStyle['weight'] = 400, color: string = COLOR.ink): TextStyle => ({ px, weight, color });
  const pageSize = (): PageSize => [doc.page.width, doc.page.height];

  // ---------- pages and flow ----------
  let y = 0;
  let kind: PageSize = A4;
  const margin = MARGIN;
  const contentW = (): number => pageSize()[0] - 2 * margin;
  const bottomLimit = (): number => pageSize()[1] - FOOTER_RULE_FROM_BOTTOM - 14;

  function newPage(size: PageSize = kind): void {
    kind = size;
    doc.addPage({ size: [size[0], size[1]], margin: 0 });
    y = CONTENT_TOP;
  }
  const ensure = (h: number): void => {
    if (y + h > bottomLimit()) newPage();
  };
  const outline = (title: string): void => {
    doc.outline.addItem(title);
  };

  function logo(x: number, top: number, h: number): void {
    if (!i.logoSvg || i.dry) return;
    SVGtoPDF(doc, stripSize(i.logoSvg), x, top, { width: h * i.logoAspect, height: h, assumePt: true, preserveAspectRatio: 'xMinYMin meet' });
  }

  function heading(text: string, intro?: string): void {
    const hp = ts.paragraph(text, contentW(), 20, 700, 26);
    if (hp.lines.length <= 1) {
      ts.line(margin, ts.baseline(y, 28, 20), text, ink(20, 700));
      y += 30;
    } else {
      // a heading too long for one line (a long translation) wraps rather than running off the page
      for (const l of hp.lines) {
        ts.line(margin, ts.baseline(y, 28, 20), l, ink(20, 700));
        y += 26;
      }
      y += 4;
    }
    if (intro) {
      const p = ts.paragraph(intro, contentW(), body.px, 400, body.lh);
      y = ts.draw(p, margin, y, ink(body.px, 400, COLOR.ink3));
      y += 6;
    }
    doc.lineWidth(0.5).strokeColor(COLOR.line1).moveTo(margin, y).lineTo(pageSize()[0] - margin, y).stroke();
    y += 14;
  }

  function label(text: string, x: number, top: number): number {
    ts.line(x, ts.baseline(top, 11, 8), text, ink(8, 500, COLOR.ink3));
    return top + 11;
  }

  /** The console's change marks as vector strokes, centred on (cx + 3, cy). */
  function changeMark(mark: 'plus' | 'minus' | 'arrow' | 'ring' | 'info', x: number, cy: number): void {
    const cx = x + 3.5;
    doc.lineWidth(1).strokeColor(COLOR.ink2);
    if (mark === 'plus') doc.moveTo(cx - 3, cy).lineTo(cx + 3, cy).moveTo(cx, cy - 3).lineTo(cx, cy + 3).stroke();
    else if (mark === 'minus') doc.moveTo(cx - 3, cy).lineTo(cx + 3, cy).stroke();
    else if (mark === 'arrow') doc.moveTo(cx - 3.5, cy).lineTo(cx + 3.5, cy).moveTo(cx + 1, cy - 2.6).lineTo(cx + 3.5, cy).lineTo(cx + 1, cy + 2.6).stroke();
    else doc.circle(cx, cy, 3).lineWidth(0.8).stroke();
  }

  function rule(color: string = COLOR.line1): void {
    doc.lineWidth(0.5).strokeColor(color).moveTo(margin, y).lineTo(pageSize()[0] - margin, y).stroke();
  }

  /** A sub-heading, kept on the same page as the first `keep` pt of what follows it. */
  function sub(text: string, keep = 0): void {
    ensure(40 + keep);
    y += 8;
    ts.line(margin, ts.baseline(y, 18, 12), text, ink(12, 700));
    y += 24;
  }

  const n: NarrativeModel | null = model.narrative ?? null;

  // ---------- 1. cover ----------
  newPage(A4);
  outline(model.title);
  logo(margin, 52, 34);
  {
    const w = 440;
    const titleLines = ts.paragraph(model.title, w, 30, 700, cjk ? 42 : 38);
    let ty = 276 - Math.max(0, titleLines.lines.length - 2) * titleLines.lh;
    ty = ts.draw(titleLines, margin, ty, ink(30, 700));
    ty += 14;
    ts.line(margin, ts.baseline(ty, 22, 14), xt('doc.type'), ink(14, 400, COLOR.ink2));
    ty += 40;
    if (model.customer) {
      const cp = ts.paragraph(xt('doc.preparedFor', { customer: model.customer }), w, 13, 500, 20);
      ty = ts.draw(cp, margin, ty, ink(13, 500));
    }

    // the title block, as on an engineering drawing: ruled cells with a small label over the value
    const W = A4[0] - 2 * margin;
    const by = A4[1] - 168;
    const cells = [
      { label: xt('cover.date'), value: model.dateText, w: W * 0.34 },
      { label: xt('cover.revisions'), value: String(model.revisionsDone), w: W * 0.2 },
      { label: xt('cover.products'), value: String(model.productCount), w: W * 0.2 },
      { label: xt('cover.catalog'), value: model.catalogDate, w: W * 0.26 },
    ];
    doc.lineWidth(0.75).strokeColor(COLOR.ink).moveTo(margin, by).lineTo(A4[0] - margin, by).stroke();
    let cx = margin;
    for (const c of cells) {
      ts.line(cx, ts.baseline(by + 10, 12, 8), c.label, ink(8, 500, COLOR.ink3));
      ts.line(cx, ts.baseline(by + 24, 18, 12), c.value, ink(12, 500));
      cx += c.w;
    }
    doc.lineWidth(0.5).strokeColor(COLOR.line2).moveTo(margin, by + 52).lineTo(A4[0] - margin, by + 52).stroke();
    ts.line(margin, ts.baseline(by + 68, 16, 10), xt('doc.preparedWith'), ink(10, 400, COLOR.ink2));
    const np = ts.paragraph(xt('doc.aiNotice'), w, 10, 500, 15);
    ts.draw(np, margin, by + 88, ink(10, 500));
  }

  // ---------- the sections, in the order of the document ----------
  if (n) {
    execSection(n);
    needsSection(n);
    diagramSection();
    workflowSections();
    componentsSection();
    recsSection();
    considerationsSection(n);
    summarySection(true);
  } else {
    summarySection(false);
    diagramSection();
    workflowSections();
    componentsSection();
    recsSection();
  }
  connectionsSection();
  revisionsSection();

  // ---------- running header and footer ----------
  const count = doc.bufferedPageRange().count;
  for (let p = 0; p < count; p++) {
    doc.switchToPage(p);
    const [pw, ph] = pageSize();
    if (p > 0) {
      logo(margin, 26, 14);
      const title = ts.clip(model.title, pw - 2 * margin - 14 * i.logoAspect - 24, 8, 400);
      ts.line(pw - margin, ts.baseline(24, 18, 8), title, ink(8, 400, COLOR.ink3), 'right');
      doc.lineWidth(0.5).strokeColor(COLOR.line1).moveTo(margin, HEADER_RULE_Y).lineTo(pw - margin, HEADER_RULE_Y).stroke();
    }
    const fy = ph - FOOTER_RULE_FROM_BOTTOM;
    doc.lineWidth(0.5).strokeColor(COLOR.line1).moveTo(margin, fy).lineTo(pw - margin, fy).stroke();
    ts.line(margin, ts.baseline(fy + 8, 14, 8), xt('page.catalog', { date: model.catalogDate }), ink(8, 400, COLOR.ink3));
    ts.line(pw - margin, ts.baseline(fy + 8, 14, 8), xt('page.of', { n: p + 1, total: count }), ink(8, 400, COLOR.ink3), 'right');
  }
  report.pages = count;
  return report;

  // ---------- the summary; with a draft it follows the business sections, as the design record ----------
  function summarySection(record: boolean): void {
    newPage(A4);
    outline(xt(record ? 'record.heading' : 'summary.heading'));
    if (record) heading(xt('record.heading'), xt('record.intro'));
    else heading(xt('summary.heading'));
    const s = model.summary;
    if (s.narration) {
      // with a draft, the first chat reply is shown for what it is: the architect's first notes, not the proposal
      sub(xt(record ? 'record.firstNotes' : 'summary.design'));
      const p = ts.paragraph(s.narration, contentW(), 10.5, 400, cjk ? 17 : 15.5);
      for (const l of p.lines) {
        ensure(p.lh);
        ts.line(margin, ts.baseline(y, p.lh, 10.5), l, ink(10.5));
        y += p.lh;
      }
      y += 4;
      ts.line(margin, ts.baseline(y, 14, 8.5), s.facts, ink(8.5, 400, COLOR.ink3));
      y += 20;
    }
    sub(xt('summary.requirements'));
    if (!s.requirements.length) {
      ts.line(margin, ts.baseline(y, body.lh, body.px), xt('summary.requirementsNone'), ink(body.px, 400, COLOR.ink3));
      y += body.lh + 8;
    }
    for (const r of s.requirements) {
      const stateW = 150;
      const p = ts.paragraph(r.text, contentW() - stateW - 16, body.px, 400, body.lh);
      const sp = ts.paragraph(r.stateText, stateW, small.px, 500, small.lh);
      const h = Math.max(p.height, sp.height + small.lh) + 14;
      ensure(h);
      rule();
      const tone = r.state === 'held' || r.state === 'repaired' ? COLOR.ok : r.state === 'broken' ? COLOR.danger : COLOR.warn;
      ts.draw(p, margin, y + 7, ink(body.px));
      const right = pageSize()[0] - margin;
      let sy = y + 7;
      for (const l of sp.lines) {
        ts.line(right, ts.baseline(sy, small.lh, small.px), l, ink(small.px, 500, tone), 'right');
        sy += small.lh;
      }
      ts.line(right, ts.baseline(sy, small.lh, small.px), r.pinned, ink(small.px, 400, COLOR.ink3), 'right');
      y += h;
    }
    rule();
    y += 6;
    sub(xt('summary.constraints'));
    if (!s.constraints.length) {
      ts.line(margin, ts.baseline(y, body.lh, body.px), xt('summary.constraintsNone'), ink(body.px, 400, COLOR.ink3));
      y += body.lh + 8;
    }
    for (const c of s.constraints) {
      const p = ts.paragraph(c, contentW(), body.px, 400, body.lh);
      ensure(p.height + 12);
      rule();
      y = ts.draw(p, margin, y + 7, ink(body.px)) + 7;
    }
    if (s.constraints.length) {
      rule();
      y += 6;
    }
    if (model.workflow) return;
    sub(xt('summary.assumptions'));
    if (!s.assumptions.length) {
      ts.line(margin, ts.baseline(y, body.lh, body.px), xt('summary.assumptionsNone'), ink(body.px, 400, COLOR.ink3));
      y += body.lh + 8;
    }
    for (const a of s.assumptions) {
      const p = ts.paragraph(a.text, contentW(), body.px, 400, body.lh);
      const alt = a.alt ? ts.paragraph(xt('summary.alternative', { alt: a.alt }), contentW(), small.px, 400, small.lh) : null;
      ensure(p.height + (alt?.height ?? 0) + 14);
      rule();
      y = ts.draw(p, margin, y + 7, ink(body.px));
      if (alt) y = ts.draw(alt, margin, y + 1, ink(small.px, 400, COLOR.ink3));
      y += 7;
    }
    if (s.assumptions.length) {
      rule();
      y += 6;
    }
    if (s.questions.length) {
      sub(xt('summary.questions'));
      for (const q of s.questions) {
        const text = q.options.length ? `${q.text} (${q.options.join(' / ')})` : q.text;
        const p = ts.paragraph(text, contentW(), body.px, 400, body.lh);
        ensure(p.height + 14);
        rule();
        y = ts.draw(p, margin, y + 7, ink(body.px)) + 7;
      }
      rule();
    }
  }

  // ---------- the diagram ----------
  function diagramSection(): void {
    if (i.diagrams[0]?.view === 'workflow') { workflowDiagrams(); return; }
    const diagram = i.diagrams[0]?.drawing ?? null;
    const fitOn = (size: PageSize): number =>
      diagram ? Math.min((size[0] - 2 * margin) / diagram.width, (size[1] - CONTENT_TOP - 30 - 28 - FOOTER_RULE_FROM_BOTTOM - 8) / diagram.height, 1.3) : 1;
    // a diagram that would have to shrink below the readable scale moves to a larger sheet
    const diagramSheet: PageSize = fitOn(A4_LANDSCAPE) < MIN_DIAGRAM_SCALE ? A3_LANDSCAPE : A4_LANDSCAPE;
    newPage(diagramSheet);
    outline(xt('diagram.heading'));
    heading(xt('diagram.heading'));
    if (!diagram) {
      ts.line(margin, ts.baseline(y, body.lh, body.px), xt('diagram.empty'), ink(body.px, 400, COLOR.ink3));
    } else {
      const d = diagram;
      const size = diagramSheet;
      const scale = fitOn(size);
      const w = d.width * scale;
      const h = d.height * scale;
      const x = margin + (size[0] - 2 * margin - w) / 2;
      if (!i.dry) {
        SVGtoPDF(doc, stripSize(d.svg), x, y, {
          width: w,
          height: h,
          assumePt: true,
          preserveAspectRatio: 'xMidYMin meet',
          fontCallback: (family) => family,
          warningCallback: () => {},
        });
      }
      report.diagramPage = { size: size === A3_LANDSCAPE ? 'A3' : 'A4', scale: Math.round(scale * 1000) / 1000 };
      report.diagramPages.push({ id: 'cloud', page: doc.bufferedPageRange().count, ...report.diagramPage, overview: false });
    }
  }

  function workflowDiagrams(): void {
    for (const diagram of i.diagrams) {
      const pages = diagram.pages;
      if (!pages?.length) throw new Error('Workflow diagram requires a measured page plan');
      pages.forEach((p, index) => {
        newPage(p.size === 'A3' ? A3_LANDSCAPE : A4_LANDSCAPE);
        const title = p.overview ? wt(model.lang, 'diagram.overview') : index === 0 ? diagram.title
          : wt(model.lang, 'diagram.detail', { n: index, total: pages.length - 1 });
        outline(title);
        heading(title);
        if (pages.length > 1) {
          const page = doc.bufferedPageRange().count;
          const continuation = wt(model.lang, 'diagram.continued', { page: index + 1 < pages.length ? page + 1 : page - 1 });
          ts.line(margin, ts.baseline(y, 16, 9), continuation, ink(9));
          y += 18;
        }
        if (!i.dry) SVGtoPDF(doc, stripSize(p.drawing.svg), margin, y, {
          width: p.drawing.width * p.scale, height: p.drawing.height * p.scale,
          assumePt: true, preserveAspectRatio: 'xMinYMin meet', fontCallback: (family) => family,
        });
        const value = { size: p.size, scale: p.scale };
        report.diagramPage ??= value;
        report.diagramPages.push({ id: diagram.id, page: doc.bufferedPageRange().count, ...value, overview: p.overview });
      });
    }
  }

  function workflowSections(): void {
    const data = workflowPdfData(model);
    if (!data) return;
    const t = makeT(model.lang);
    const w = (key: Parameters<typeof wt>[1]) => wt(model.lang, key);
    const start = (title: string) => { newPage(A4); outline(title); heading(title); };
    const paragraph = (text: string, weight: 400 | 700 = 400) => {
      if (weight === 700) ensure(body.lh * 4);
      const p = ts.paragraph(text, contentW(), body.px, weight, body.lh);
      for (const line of p.lines) {
        ensure(body.lh);
        ts.line(margin, ts.baseline(y, body.lh, body.px), line, ink(body.px, weight));
        y += body.lh;
      }
      y += 6;
    };
    function table(headers: string[], rows: string[][], widths: number[]): void {
      const cols = widths.map((v) => v * contentW());
      const headerLines = headers.map((h, k) => ts.wrap(h, cols[k] - 12, body.px, 500));
      const headerHeight = Math.max(...headerLines.map((ls) => ls.length)) * body.lh + 30;
      ensure(headerHeight + body.lh + 12);
      const measured = rows.map((row) => row.map((cell, k) => ts.wrap(cell, cols[k] - 12, body.px, 400)));
      const pages = planTablePages({ rows: measured, firstHeight: bottomLimit() - y,
        pageHeight: A4[1] - 54 - CONTENT_TOP, headerHeight, lineHeight: body.lh });
      pages.forEach((page, index) => {
        if (index) newPage(A4);
        if (index) {
          const first = page.rows[0];
          const note = w('table.continued') + (first?.continued ? ` (${first.index + 1})` : '');
          ts.line(margin, ts.baseline(y, body.lh, body.px), note, ink(body.px, 500));
        }
        y += body.lh;
        let x = margin;
        headerLines.forEach((ls, k) => {
          ls.forEach((line, n) => ts.line(x, ts.baseline(y + n * body.lh, body.lh, body.px), line, ink(body.px, 500)));
          x += cols[k];
        });
        y += headerHeight - body.lh;
        for (const row of page.rows) {
          rule(); x = margin;
          row.cells.forEach((ls, k) => {
            ls.forEach((line, n) => ts.line(x, ts.baseline(y + 6 + n * body.lh, body.lh, body.px), line, ink(body.px)));
            x += cols[k];
          });
          y += row.height;
        }
      });
      rule(); y += 8;
    }
    start(w('steps.heading'));
    for (const step of data.steps) {
      ensure(body.lh * 3);
      paragraph(`${step.id} - ${step.label}`, 700);
      if (step.text) paragraph(step.text);
    }
    start(data.mappingTitle);
    table([w('mapping.step'), w('mapping.runtime'), w('mapping.services')], data.mapping.map((row) => [
      `${row.id} - ${row.label}` + (row.on ? ` (${t('workflow.pop.attachedTo', { step: row.on })})` : ''),
      row.runtime, row.service,
    ]), [.34, .26, .40]);
    start(data.costTitle);
    const cost = data.cost;
    const triggers = cost.oneRun.filter((id) => i.workflow?.nodes[id]?.kind === 'trigger');
    paragraph(t('workflow.cost.oneRun', { trigger: triggers.map((id) => i.workflow!.nodes[id].label).join(', ')
      || t('workflow.unspecified') }));
    paragraph(`${t('workflow.settings.scope')}: ${t(cost.scope === 'global' ? 'workflow.settings.global' : 'workflow.settings.international')}`);
    paragraph(`${t('workflow.cost.runs')}: ${cost.runsPerMonth}`);
    paragraph(t('workflow.cost.scenarios'));
    table(['', w('cost.typical'), w('cost.upper')], [
      [w('cost.perRun'), usd(cost.typical.perRunUsd), usd(cost.upper.perRunUsd)],
      [w('cost.perMonth'), usd(cost.typical.monthlyUsd), `${usd(cost.upper.monthlyUsd)} - ${w('cost.upperMonthly')}`],
    ], [.25, .30, .45]);
    paragraph(w('cost.coverage'), 700);
    paragraph(cost.coverage);
    table([w('cost.item'), w('cost.unit'), w('cost.typical'), w('cost.upper')],
      cost.lines.map((r) => [`${r.id} - ${r.label}`, r.unit, usd(r.typical), usd(r.upper)]), [.40, .20, .20, .20]);
    paragraph(w('cost.fixed'), 700);
    table([w('cost.item'), w('cost.unit'), w('cost.perMonth')],
      cost.fixed.map((r) => [r.label, r.unit, r.monthlyUsd === null ? w('cost.unpriced') : usd(r.monthlyUsd)]), [.45, .30, .25]);
    paragraph(w('cost.unpriced'), 700);
    table([w('cost.item'), w('cost.unit'), w('cost.reason')],
      cost.unpriced.map((r) => [`${r.id} - ${r.label}`, r.unit, unpricedReason(r.why, t)]), [.34, .22, .44]);
    paragraph(w('cost.assumptions'), 700);
    for (const a of cost.assumptions) paragraph(i.workflow ? assumptionText(a, i.workflow, t) : a.text);
    const sources = [...new Set([...cost.lines, ...cost.fixed].map((r) => r.source).filter(Boolean))];
    if (sources.length) paragraph(t('workflow.cost.source'), 700);
    for (const source of sources) {
      if (/^https:\/\//.test(source)) {
        for (const line of ts.wrap(source, contentW(), body.px, 400)) {
          ensure(body.lh);
          ts.link(margin, ts.baseline(y, body.lh, body.px), line, source, ink(body.px, 400, COLOR.action));
          y += body.lh;
        }
        report.links++;
      } else paragraph(source);
    }
    start(data.questionsTitle);
    data.openQuestions.forEach((q, k) => paragraph(`${k + 1}. ${q.text}` + (q.options.length ? ` (${q.options.join(' / ')})` : '')));
  }

  // ---------- components ----------
  function componentsSection(): void {
    if (!model.components.length) return;
    newPage(A4);
    outline(xt('components.heading'));
    heading(xt('components.heading'), xt('components.intro'));
    for (const c of model.components) entry(componentSpec(c, xt));
  }

  // ---------- recommendations ----------
  function recsSection(): void {
    if (model.recs.length) {
      newPage(A4);
      outline(xt('recs.heading'));
      heading(xt('recs.heading'), xt('recs.intro'));
      for (const r of model.recs) entry(recSpec(r, xt));
      if (model.gaps.length) {
        sub(xt('recs.gaps'));
        for (const g of model.gaps) {
          const p = ts.paragraph(g.note ? `${g.need}: ${g.note}` : g.need, contentW(), body.px, 400, body.lh);
          ensure(p.height + 14);
          rule();
          y = ts.draw(p, margin, y + 7, ink(body.px)) + 7;
        }
        rule();
      }
    }
  }

  // ---------- connections ----------
  function connectionsSection(): void {
    newPage(A4);
    outline(xt('conn.heading'));
    heading(xt('conn.heading'), xt('conn.intro'));
    if (!model.connections.length) ts.line(margin, ts.baseline(y, body.lh, body.px), xt('conn.none'), ink(body.px, 400, COLOR.ink3));
    else {
      const cols = [
        { title: xt('conn.from'), w: 132 },
        { title: xt('conn.to'), w: 132 },
        { title: xt('conn.label'), w: 118 },
        { title: xt('conn.kind'), w: contentW() - 382 },
      ];
      const head = (): void => {
        let x = margin;
        for (const c of cols) {
          label(c.title, x, y);
          x += c.w;
        }
        y += 16;
      };
      head();
      for (const r of model.connections) {
        const cells = [r.from, r.to, r.label, r.kindText];
        const paras = cells.map((t, k) => ts.paragraph(t, cols[k].w - 10, body.px, 400, body.lh));
        const h = Math.max(...paras.map((p) => p.height), body.lh) + 12;
        if (y + h > bottomLimit()) {
          newPage();
          head();
        }
        rule();
        let x = margin;
        paras.forEach((p, k) => {
          ts.draw(p, x, y + 6, ink(body.px, 400, k === 3 ? COLOR.ink3 : COLOR.ink));
          x += cols[k].w;
        });
        y += h;
      }
      rule();
    }
  }

  // ---------- revision history ----------
  function revisionsSection(): void {
    newPage(A4);
    outline(xt('rev.heading'));
    heading(xt('rev.heading'), xt('rev.intro'));
    for (const r of model.revisions) {
      const askP = ts.paragraph(r.ask, contentW() - 70, body.px, 400, body.lh);
      ensure(36 + Math.min(askP.height, body.lh * 3) + body.lh * 2);
      rule();
      y += 8;
      ts.line(margin, ts.baseline(y, 16, 11), xt('rev.revision', { n: r.n }), ink(11, 700));
      const meta = r.applied ? r.drawn : xt('rev.notApplied');
      if (meta) ts.line(pageSize()[0] - margin, ts.baseline(y, 16, 8.5), meta, ink(8.5, 400, r.applied ? COLOR.ink3 : COLOR.danger), 'right');
      y += 22;
      label(xt('rev.ask'), margin, y);
      for (const l of askP.lines) {
        ensure(askP.lh);
        ts.line(margin + 70, ts.baseline(y, askP.lh, body.px), l, ink(body.px));
        y += askP.lh;
      }
      y += 6;
      if (r.applied) {
        label(xt('rev.changes'), margin, y);
        const lines = r.changes.length ? r.changes : [{ mark: 'info' as const, text: xt('rev.noChange'), struck: false }];
        for (const c of lines) {
          const p = ts.paragraph(c.text, contentW() - 70 - 14, body.px, 400, body.lh);
          ensure(p.height);
          if (r.changes.length) changeMark(c.mark, margin + 70, y + body.lh / 2);
          const top = y;
          y = ts.draw(p, margin + 70 + 14, y, ink(body.px, 400, c.struck ? COLOR.ink3 : r.changes.length ? COLOR.ink : COLOR.ink3));
          if (c.struck) {
            // a removed product reads struck through, as in the console
            const first = p.lines[0] ?? '';
            const w = ts.width(first, body.px, 400);
            doc.lineWidth(0.5).strokeColor(COLOR.ink3).moveTo(margin + 70 + 14, top + p.lh / 2).lineTo(margin + 70 + 14 + w, top + p.lh / 2).stroke();
          }
        }
      }
      y += 12;
    }
    rule();
  }

  // ---------- the drafted narrative ----------

  /** The executive summary: the lead paragraph a step larger, the rest as body, then the outcomes as titled blocks. */
  function execSection(nv: NarrativeModel): void {
    if (!nv.exec.length && !nv.outcomes.length) return;
    newPage(A4);
    outline(xt('exec.heading'));
    heading(xt('exec.heading'));
    nv.exec.forEach((text, k) => {
      const px = k === 0 ? 12 : 10.5;
      const lh = k === 0 ? (cjk ? 19.5 : 18) : cjk ? 17 : 15.5;
      const p = ts.paragraph(text, MEASURE, px, 400, lh);
      for (const l of p.lines) {
        ensure(p.lh);
        ts.line(margin, ts.baseline(y, p.lh, px), l, ink(px));
        y += p.lh;
      }
      y += k === 0 ? 12 : 9;
    });
    if (nv.outcomes.length) {
      const specs: EntrySpec[] = nv.outcomes.map((o) => ({ product: null, name: o.title, meta: [], sections: [{ label: '', paragraphs: [{ text: o.text, color: COLOR.ink2 }] }] }));
      y += 4;
      sub(xt('exec.outcomes'), measureEntry(specs[0]).h);
      for (const sp of specs) entry(sp);
    }
    // what is asked of the reader, on the page many of them read alone: the first two next steps
    if (nv.next.length) {
      const numW = 22;
      const steps = nv.next.slice(0, 2).map((t) => ts.paragraph(t, MEASURE - numW, body.px, 400, body.lh));
      y += 4;
      sub(xt('exec.next'), steps[0].height + 14);
      steps.forEach((p, k) => {
        ensure(p.height + 14);
        rule();
        ts.line(margin, ts.baseline(y + 7, body.lh, body.px), `${k + 1}.`, ink(body.px, 700));
        y = ts.draw(p, margin + numW, y + 7, ink(body.px)) + 7;
      });
      rule();
    }
  }

  /** Each customer need: the need and where it came from on the left, how the design answers it on the right. */
  function needsSection(nv: NarrativeModel): void {
    if (!nv.needs.length) return;
    newPage(A4);
    outline(xt('needs.heading'));
    heading(xt(nv.mostlyTypical ? 'needs.headingTypical' : 'needs.heading'), xt('needs.intro'));
    const list = model.lang === 'zh' ? '、' : ', ';
    for (const need of nv.needs) {
      const sections: EntrySpec['sections'] = [{ label: xt('needs.answer'), paragraphs: [{ text: need.answer, color: COLOR.ink }] }];
      if (need.products.length) sections.push({ label: xt('needs.products'), paragraphs: [{ text: need.products.join(list), color: COLOR.ink2 }] });
      entry({ product: null, name: need.need, meta: [need.sourceText], sections });
    }
  }

  /** The honest part: trade-offs with how each is handled, then numbered next steps. */
  function considerationsSection(nv: NarrativeModel): void {
    if (!nv.tradeoffs.length && !nv.next.length) return;
    newPage(A4);
    outline(xt('next.heading'));
    heading(xt('next.heading'));
    if (nv.tradeoffs.length) {
      const blocks = nv.tradeoffs.map((t) => ({ p: ts.paragraph(t.text, MEASURE, body.px, 400, body.lh), m: t.mitigation ? ts.paragraph(t.mitigation, MEASURE, body.px, 400, body.lh) : null }));
      const heightOf = (b: (typeof blocks)[number]): number => 7 + b.p.height + (b.m ? 4 + 11 + b.m.height : 0) + 9;
      sub(xt('next.tradeoffs'), heightOf(blocks[0]));
      for (const b of blocks) {
        ensure(heightOf(b));
        rule();
        y = ts.draw(b.p, margin, y + 7, ink(body.px));
        if (b.m) y = ts.draw(b.m, margin, label(xt('next.mitigation'), margin, y + 4), ink(body.px, 400, COLOR.ink2));
        y += 9;
      }
      rule();
      y += 6;
    }
    if (nv.next.length) {
      const numW = 22;
      const steps = nv.next.map((t) => ts.paragraph(t, MEASURE - numW, body.px, 400, body.lh));
      sub(xt('next.steps'), steps[0].height + 14);
      steps.forEach((p, k) => {
        ensure(p.height + 14);
        rule();
        ts.line(margin, ts.baseline(y + 7, body.lh, body.px), `${k + 1}.`, ink(body.px, 700));
        y = ts.draw(p, margin + numW, y + 7, ink(body.px)) + 7;
      });
      rule();
    }
    // no product of the design has a catalog price: say who prepares the estimate rather than leave cost unanswered
    if (nv.pricingNote) {
      const p = ts.paragraph(nv.pricingNote, MEASURE, body.px, 400, body.lh);
      ensure(p.height + 12);
      y = ts.draw(p, margin, y + 10, ink(body.px, 400, COLOR.ink2)) + 2;
    }
  }

  // ---------- entries (components, recommendations, needs and outcomes) ----------
  interface EntrySpec {
    /** The product whose official icon leads the entry; null for an entry about something else (a need, an outcome). */
    product: string | null;
    name: string;
    meta: string[];
    /** An empty label draws none. */
    sections: Array<{ label: string; paragraphs: Array<{ text: string; color: string }>; link?: { text: string; url: string } | { missing: string } }>;
  }

  function componentSpec(c: ComponentEntry, t: XT): EntrySpec {
    const multi = c.roles.length > 1;
    const meta: string[] = [];
    if (c.label && !multi) meta.push(c.label);
    if (c.fit) meta.push(t(c.fit === 'primary' ? 'components.fit.primary' : 'components.fit.complement'));
    if (!multi && c.roles[0]?.where) meta.push(c.roles[0].where);
    else if (c.category) meta.push(c.category);
    const roleParas = c.roles.map((r) => {
      // a product drawn more than once: each use is told apart by its label (or, with none, by where it sits)
      const lead = multi ? r.label || r.where : '';
      const text = r.why ? (lead ? `${lead}: ${r.why}` : r.why) : lead ? `${lead}: ${t('components.roleNone')}` : t('components.roleNone');
      return { text, color: r.why ? COLOR.ink : COLOR.ink3 };
    });
    // with a narrative, each entry leads with why it is here for this customer (the drawing's own reason when the draft has none)
    const sections: EntrySpec['sections'] = n
      ? [{ label: t('components.why'), paragraphs: c.draftWhy ? [{ text: c.draftWhy, color: COLOR.ink }] : roleParas }]
      : [{ label: t('components.role'), paragraphs: roleParas }];
    if (c.what) sections.push({ label: t('components.what'), paragraphs: [{ text: c.what, color: COLOR.ink2 }] });
    if (c.notes) sections.push({ label: t('components.notes'), paragraphs: [{ text: c.notes, color: COLOR.warn }] });
    if (c.price) sections.push({ label: t('components.price'), paragraphs: [{ text: c.price, color: COLOR.ink2 }] });
    // a construct (users, a mobile app) has no documentation; with a draft its entry leaves the row out
    if (!(n && c.construct)) sections.push({ label: t('components.docs'), paragraphs: [], link: c.docs ? { text: c.docs.replace(/^https:\/\//, ''), url: c.docs } : { missing: t('components.noDocs') } });
    return { product: c.product, name: c.name, meta, sections };
  }

  function recSpec(r: RecEntry, t: XT): EntrySpec {
    const why = r.draftWhy ?? r.why;
    const sections: EntrySpec['sections'] = [{ label: t('recs.why'), paragraphs: [{ text: why || t('components.roleNone'), color: why ? COLOR.ink : COLOR.ink3 }] }];
    if (r.price) sections.push({ label: t('components.price'), paragraphs: [{ text: r.price, color: COLOR.ink2 }] });
    sections.push({ label: t('components.docs'), paragraphs: [], link: r.docs ? { text: r.docs.replace(/^https:\/\//, ''), url: r.docs } : { missing: t('components.noDocs') } });
    return { product: r.product, name: r.name, meta: [r.fitText], sections };
  }

  /** An entry's lines and its height, measured before it is placed, so a sub-heading can keep its first entry with it. */
  function measureEntry(spec: EntrySpec) {
    const leftW = 168;
    const gap = 18;
    const rx = margin + leftW + gap;
    const rw = pageSize()[0] - margin - rx;
    // the name sits beside the product's icon; an entry with no product uses the whole left column
    const nameX = spec.product ? margin + 32 : margin;
    const nameW = spec.product ? leftW - 32 : leftW;
    const nameP = ts.paragraph(spec.name, nameW, 10, 500, cjk ? 15 : 13.5);
    const metaP = spec.meta.map((m) => ts.paragraph(m, nameW, small.px, 400, small.lh));
    const leftH = (spec.product ? Math.max(24, nameP.height) : nameP.height) + metaP.reduce((a, p) => a + p.height, 0) + 4;
    const blocks = spec.sections.map((sec) => {
      const paras = sec.paragraphs.map((p) => ({ p: ts.paragraph(p.text, rw, body.px, 400, body.lh), color: p.color }));
      let linkLines: string[] = [];
      if (sec.link && 'url' in sec.link) linkLines = ts.wrap(sec.link.text, rw, small.px + 0.5, 400);
      const h = (sec.label ? 11 : 0) + paras.reduce((a, q) => a + q.p.height + 2, 0) + (sec.link ? (linkLines.length || 1) * (small.lh + 1) : 0) + 5;
      return { sec, paras, linkLines, h };
    });
    const rightH = blocks.reduce((a, b) => a + b.h, 0);
    return { spec, rx, nameX, nameP, metaP, blocks, h: Math.max(leftH, rightH) + 20 };
  }

  function entry(spec: EntrySpec): void {
    const { rx, nameX, nameP, metaP, blocks, h } = measureEntry(spec);
    ensure(h);
    rule();
    const top = y + 11;
    if (!i.dry && spec.product) {
      SVGtoPDF(doc, iconSvg(iconFor(spec.product).geometry, { size: 24, color: COLOR.brandIcon }), margin, top, { width: 24, height: 24, assumePt: true });
    }
    let ly = ts.draw(nameP, nameX, top, ink(10, 500));
    for (const m of metaP) ly = ts.draw(m, nameX, ly + 1, ink(small.px, 400, COLOR.ink3));
    let ry = top;
    for (const b of blocks) {
      if (b.sec.label) ry = label(b.sec.label, rx, ry);
      for (const q of b.paras) ry = ts.draw(q.p, rx, ry, ink(body.px, 400, q.color)) + 2;
      if (b.sec.link) {
        if ('url' in b.sec.link) {
          for (const l of b.linkLines) {
            ts.link(rx, ts.baseline(ry, small.lh + 1, small.px + 0.5), l, b.sec.link.url, { px: small.px + 0.5, weight: 400, color: COLOR.action });
            ry += small.lh + 1;
          }
          report.links++;
        } else {
          ts.line(rx, ts.baseline(ry, small.lh + 1, small.px + 0.5), b.sec.link.missing, ink(small.px + 0.5, 400, COLOR.ink3));
          ry += small.lh + 1;
          report.missingDocs++;
        }
      }
      ry += 5;
    }
    y += h;
  }
}
