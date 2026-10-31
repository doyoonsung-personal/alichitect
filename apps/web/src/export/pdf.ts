// The proposal document: cover, summary, diagram, components, recommendations, connections, revision history. It draws
// onto a pdfkit document through the Typesetter, at explicit coordinates, with the tokens of the app (ink on a white
// sheet, hairlines, blue links; orange only in the logo and the official icons). The same function runs twice: first
// "dry" on a stub document, so the font set learns which glyphs it needs, then for real.
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { iconFor } from '../icons/index.ts';
import { iconSvg } from '../icons/svg.ts';
import type { FontSet } from './fonts.ts';
import type { ComponentEntry, ProposalModel, RecEntry } from './model.ts';
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

export interface PdfInput {
  model: ProposalModel;
  fonts: FontSet;
  diagram: DiagramSvg | null;
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
  const report: PdfReport = { pages: 0, diagramPage: null, components: model.components.length, links: 0, missingDocs: 0 };

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
    ts.line(margin, ts.baseline(y, 28, 20), text, ink(20, 700));
    y += 30;
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

  // ---------- 2. summary ----------
  newPage(A4);
  outline(xt('summary.heading'));
  heading(xt('summary.heading'));
  const s = model.summary;
  const sub = (text: string): void => {
    ensure(40);
    y += 8;
    ts.line(margin, ts.baseline(y, 18, 12), text, ink(12, 700));
    y += 24;
  };
  if (s.narration) {
    sub(xt('summary.design'));
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

  // ---------- 3. the diagram ----------
  const fitOn = (size: PageSize): number =>
    i.diagram ? Math.min((size[0] - 2 * margin) / i.diagram.width, (size[1] - CONTENT_TOP - 30 - 28 - FOOTER_RULE_FROM_BOTTOM - 8) / i.diagram.height, 1.3) : 1;
  // a diagram that would have to shrink below the readable scale moves to a larger sheet
  const diagramSheet: PageSize = fitOn(A4_LANDSCAPE) < MIN_DIAGRAM_SCALE ? A3_LANDSCAPE : A4_LANDSCAPE;
  newPage(diagramSheet);
  outline(xt('diagram.heading'));
  heading(xt('diagram.heading'));
  if (!i.diagram) {
    ts.line(margin, ts.baseline(y, body.lh, body.px), xt('diagram.empty'), ink(body.px, 400, COLOR.ink3));
  } else {
    const d = i.diagram;
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
  }

  // ---------- 4. components ----------
  if (model.components.length) {
    newPage(A4);
    outline(xt('components.heading'));
    heading(xt('components.heading'), xt('components.intro'));
    for (const c of model.components) entry(componentSpec(c, xt));
  }

  // ---------- 5. recommendations ----------
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

  // ---------- 6. connections ----------
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

  // ---------- 7. revision history ----------
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

  // ---------- entries (components and recommendations) ----------
  interface EntrySpec {
    product: string;
    name: string;
    meta: string[];
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
    const sections: EntrySpec['sections'] = [{ label: t('components.role'), paragraphs: roleParas }];
    if (c.what) sections.push({ label: t('components.what'), paragraphs: [{ text: c.what, color: COLOR.ink2 }] });
    if (c.notes) sections.push({ label: t('components.notes'), paragraphs: [{ text: c.notes, color: COLOR.warn }] });
    if (c.price) sections.push({ label: t('components.price'), paragraphs: [{ text: c.price, color: COLOR.ink2 }] });
    sections.push({ label: t('components.docs'), paragraphs: [], link: c.docs ? { text: c.docs.replace(/^https:\/\//, ''), url: c.docs } : { missing: t('components.noDocs') } });
    return { product: c.product, name: c.name, meta, sections };
  }

  function recSpec(r: RecEntry, t: XT): EntrySpec {
    const sections: EntrySpec['sections'] = [{ label: t('recs.why'), paragraphs: [{ text: r.why || t('components.roleNone'), color: r.why ? COLOR.ink : COLOR.ink3 }] }];
    if (r.price) sections.push({ label: t('components.price'), paragraphs: [{ text: r.price, color: COLOR.ink2 }] });
    sections.push({ label: t('components.docs'), paragraphs: [], link: r.docs ? { text: r.docs.replace(/^https:\/\//, ''), url: r.docs } : { missing: t('components.noDocs') } });
    return { product: r.product, name: r.name, meta: [r.fitText], sections };
  }

  function entry(spec: EntrySpec): void {
    const leftW = 168;
    const gap = 18;
    const rx = margin + leftW + gap;
    const rw = pageSize()[0] - margin - rx;
    const nameP = ts.paragraph(spec.name, leftW - 32, 10, 500, cjk ? 15 : 13.5);
    const metaP = spec.meta.map((m) => ts.paragraph(m, leftW - 32, small.px, 400, small.lh));
    const leftH = Math.max(24, nameP.height) + metaP.reduce((a, p) => a + p.height, 0) + 4;
    const blocks = spec.sections.map((sec) => {
      const paras = sec.paragraphs.map((p) => ({ p: ts.paragraph(p.text, rw, body.px, 400, body.lh), color: p.color }));
      let linkLines: string[] = [];
      if (sec.link && 'url' in sec.link) linkLines = ts.wrap(sec.link.text, rw, small.px + 0.5, 400);
      const h = 11 + paras.reduce((a, q) => a + q.p.height + 2, 0) + (sec.link ? (linkLines.length || 1) * (small.lh + 1) : 0) + 5;
      return { sec, paras, linkLines, h };
    });
    const rightH = blocks.reduce((a, b) => a + b.h, 0);
    const h = Math.max(leftH, rightH) + 20;
    ensure(h);
    rule();
    const top = y + 11;
    if (!i.dry) {
      SVGtoPDF(doc, iconSvg(iconFor(spec.product).geometry, { size: 24, color: COLOR.brandIcon }), margin, top, { width: 24, height: 24, assumePt: true });
    }
    let ly = ts.draw(nameP, margin + 32, top, ink(10, 500));
    for (const m of metaP) ly = ts.draw(m, margin + 32, ly + 1, ink(small.px, 400, COLOR.ink3));
    let ry = top;
    for (const b of blocks) {
      ry = label(b.sec.label, rx, ry);
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

  return report;
}
