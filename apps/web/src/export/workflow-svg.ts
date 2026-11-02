// Vector-only workflow serialization from p5's pure presentation models.
import type { Rect } from '@ali/core/layout.ts';
import type { WorkflowCardView, WorkflowScene } from '../workflow/scene.ts';
import { workflowTitle } from '../workflow/layout-adapter.ts';
import type { WorkflowEdgeDrawing } from '../workflow/edges.ts';
import { workflowGlyph } from '../workflow/glyphs.ts';
import { iconMarkup } from './svg.ts';
import type { DiagramSvg, SvgFonts } from './svg.ts';
import type { Weight } from './fonts.ts';

export interface WorkflowLegendText { next: string; attached: string; loop: string; escalate: string }
export interface WorkflowSvgInput {
  scene: WorkflowScene; edges: readonly WorkflowEdgeDrawing[]; bounds: Rect; fonts: SvgFonts;
  legend: WorkflowLegendText; tile?: boolean;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export type WorkflowCardFonts = Pick<SvgFonts, 'width' | 'metrics'>;
export function workflowCardContent(c: WorkflowCardView, fonts: WorkflowCardFonts) {
  const metrics = fonts.metrics();
  const texts: Array<{ x: number; y: number; value: string; px: number; weight: Weight }> = [];
  const chips: Rect[] = [];
  const title = workflowTitle(c.label, (s, px) => fonts.width(s, px, 500), c.w - (c.approval ? 64 : 44));
  const titleHeight = Math.max(title.px * 1.25, title.px * (metrics.ascent + metrics.descent));
  let top = 8;
  for (const value of title.lines) {
    texts.push({ x: 34, y: top + title.px * metrics.ascent, value, px: title.px, weight: 500 });
    top += titleHeight;
  }
  top = Math.max(34, top + 4);
  const room = c.w - 20 - (c.kind === 'human' ? 24 : 0);
  // Step headings and runtime rows in the PDF refer to raw IDs.
  const rows = [{ value: c.id, chip: false }, { value: c.product ?? '', chip: false },
    { value: c.model ?? '', chip: true }, ...c.badges.map((value) => ({ value, chip: false })),
    { value: c.hidden.length ? `+${c.hidden.length}` : '', chip: true }];
  for (const row of rows.filter((r) => r.value)) {
    const lines: string[] = []; let line = '';
    for (const ch of row.value) {
      if (line && fonts.width(line + ch, 12, 400) > room - 8) { lines.push(line); line = ''; }
      line += ch;
    }
    if (line) lines.push(line);
    const lh = Math.max(18, 12 * (metrics.ascent + metrics.descent));
    const height = lines.length * lh + (row.chip ? 6 : 0);
    if (row.chip) chips.push({ x: 6, y: top,
      w: Math.max(...lines.map((s) => fonts.width(s, 12, 400))) + 8, h: height });
    for (const value of lines) {
      texts.push({ x: 10, y: top + (row.chip ? 3 : 0) + 12 * metrics.ascent, value, px: 12, weight: 400 });
      top += lh;
    }
    if (row.chip) top += 6;
  }
  return { texts, chips, h: Math.ceil(Math.max(60, top + 8) / 2) * 2 };
}
export function renderWorkflowSvg(i: WorkflowSvgInput): DiagramSvg {
  const { fonts, bounds: b } = i;
  const parts: string[] = [];
  let runs = 0;
  const inside = (r: Rect) => r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h;
  function text(x: number, y: number, value: string, px = 12, weight: Weight = 400, color = '#334155'): void {
    for (const r of fonts.runs(value, weight)) {
      const lead = r.text.length - r.text.trimStart().length;
      const start = x + fonts.width(r.text.slice(0, lead), px, weight);
      parts.push(`<text x="${start}" y="${y}" font-family="${esc(r.face || 'sans')}" font-size="${px}" fill="${color}">${esc(r.text.trim())}</text>`);
      x += r.width * px; runs++;
    }
  }
  const cards = i.scene.cards.filter((c) => !i.tile || inside(c));
  const brackets = i.scene.brackets.filter((c) => !i.tile || inside(c));
  for (const e of i.edges) {
    const color = e.warning ? '#a85b00' : '#64748b';
    parts.push(`<g data-kind="edge" data-id="${esc(e.id)}"><path d="${esc(e.path)}" fill="none" stroke="${color}"`
      + ` stroke-width="1.5"${e.attached ? ' stroke-dasharray="5 4"' : ''}/>`);
    if (!e.attached && e.points.length > 1) {
      const end = e.points.at(-1)!, prev = e.points.at(-2)!;
      const angle = Math.atan2(end.y - prev.y, end.x - prev.x) * 180 / Math.PI;
      parts.push(`<path d="M-7 -4 L0 0 L-7 4" transform="translate(${end.x} ${end.y}) rotate(${angle})" fill="none" stroke="${color}"/>`);
    }
    if (e.label && (!i.tile || inside(e.labelBox))) {
      const r = e.labelBox;
      parts.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#ffffff"/>`);
      text(r.x + 6, r.y + 14, e.label, 12, 400, color);
    }
    parts.push('</g>');
  }
  for (const r of brackets) {
    parts.push(`<path d="M${r.x} ${r.y + r.h} V${r.y} H${r.x + r.w} V${r.y + r.h}" fill="none" stroke="#64748b"/>`);
    text(r.x + 8, r.y + 16, r.label);
  }
  for (const c of cards) {
    parts.push(`<g data-kind="card" data-id="${esc(c.id)}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"`
      + ' rx="5" fill="#ffffff" stroke="#94a3b8"/>');
    parts.push(iconMarkup(workflowGlyph(c.kind), c.x + 8, c.y + 10, 22, '#334155').replaceAll('currentColor', '#334155'));
    const content = workflowCardContent(c, fonts);
    for (const r of content.chips) {
      parts.push(`<rect x="${c.x + r.x}" y="${c.y + r.y}" width="${r.w}" height="${r.h}" rx="3" fill="#f1f5f9"/>`);
    }
    for (const t of content.texts) text(c.x + t.x, c.y + t.y, t.value, t.px, t.weight);
    if (c.approval) parts.push(`<path d="M${c.x + c.w - 19} ${c.y + 10} v-3 a3 3 0 0 1 6 0 v3 m-8 0 h10 v8 h-10 Z" fill="none" stroke="#334155"/>`);
    if (c.kind === 'human') {
      parts.push(`<circle cx="${c.x + c.w - 16}" cy="${c.y + c.h - 16}" r="7" fill="none" stroke="#64748b"/>`);
      parts.push(`<path d="M${c.x + c.w - 16} ${c.y + c.h - 21} v5 h4" fill="none" stroke="#64748b"/>`);
    }
    parts.push('</g>');
  }
  if (!i.tile) Object.entries(i.legend).forEach(([key, value], k) => {
    const y = b.y + b.h - 84 + k * 20;
    parts.push(`<path d="M${b.x + 14} ${y} h28" stroke="${key === 'escalate' ? '#a85b00' : '#64748b'}"`
      + `${key === 'attached' ? ' stroke-dasharray="5 4"' : ''}/>`);
    text(b.x + 50, y + 4, value);
  });
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${parts.join('')}</svg>`,
    width: b.w, height: b.h,
    counts: { frames: brackets.length, cards: cards.length, badges: cards.reduce((n, c) => n + c.badges.length, 0),
      edges: i.edges.length, labels: i.edges.filter((e) => e.label).length, runs },
  };
}
