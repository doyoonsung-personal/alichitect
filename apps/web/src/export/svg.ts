// The diagram as an SVG string (pure). It is drawn from the same view model the canvas draws: the scene (frames, cards,
// badges, set titles) and the edge layer's EdgeDraw list (rounded orthogonal paths, chevrons, label plates), in the same
// world coordinates, so what is on screen is what is in the PDF. svg-to-pdfkit then embeds it as vector paths and text.
//
// Restrictions that come from svg-to-pdfkit: attributes only (no CSS), absolute text positions, one face per <text>
// (the font set splits a string into one run per face), so a Korean label with a Latin product name is two elements.
import type { Rect } from '@ali/core/layout.ts';
import { GEOMETRY } from '@ali/core/layout.ts';
import { iconFor } from '../icons/index.ts';
import type { IconGeometry, IconNode } from '../icons/types.ts';
import { UI_ICONS } from '../shell/ui-icons.generated.ts';
import type { EdgeDraw } from '../canvas/edges.tsx';
import type { BadgeView, CardView, FrameView, Scene } from '../canvas/scene.ts';
import type { FontSet, Weight } from './fonts.ts';
import { COLOR } from './tokens.ts';

/** What the renderer needs from the font set: runs, widths and metrics. A test passes a fake. */
export type SvgFonts = Pick<FontSet, 'runs' | 'width' | 'metrics'>;

export interface LegendText {
  path: string;
  data: string;
  async: string;
  resolve: string;
}

export interface DiagramSvgInput {
  scene: Scene;
  edges: readonly EdgeDraw[];
  /** The layout's bounding box (world coordinates). */
  bounds: Rect;
  fonts: SvgFonts;
  /** Words for the legend row under the drawing; null leaves it out. */
  legend: LegendText | null;
  /** Words for a recommendation card's chip. */
  chips: { primary: string; complement: string };
}

export interface DiagramSvg {
  /** Numbered connectors replace routes that cannot be shown whole in a workflow detail window. */
  continuations?: Array<{ ref: string; from: string; to: string; label: string; groups?: string[] }>;
  svg: string;
  /** The viewBox size, in world px. */
  width: number;
  height: number;
  /** What was drawn, for tests and the report. */
  counts: { frames: number; cards: number; badges: number; edges: number; labels: number; runs: number };
}

const G = GEOMETRY;
const PAD = 14;
const LEGEND_H = 34;

const n2 = (v: number): string => String(Math.round(v * 100) / 100);
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** An icon geometry as SVG nodes, drawn into a size x size box at (x, y) in the given colour. */
export function iconMarkup(g: IconGeometry, x: number, y: number, size: number, color: string): string {
  const vb = g.viewBox.split(/\s+/).map(Number);
  const k = size / (vb[2] || 1024);
  const body = g.nodes.map(nodeMarkup).join('');
  return `<g transform="translate(${n2(x - (vb[0] || 0) * k)} ${n2(y - (vb[1] || 0) * k)}) scale(${Math.round(k * 1e6) / 1e6})" fill="${color}">${body}</g>`;
}

function nodeMarkup(n: IconNode): string {
  const attrs = Object.entries(n.a)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ');
  const open = `<${n.el}${attrs ? ' ' + attrs : ''}`;
  if (!n.c || n.c.length === 0) return `${open}/>`;
  return `${open}>${n.c.map(nodeMarkup).join('')}</${n.el}>`;
}

/** A 16 px stroke icon of the UI set, in a size x size box. */
function uiIconMarkup(name: keyof typeof UI_ICONS, x: number, y: number, size: number, color: string): string {
  const body = UI_ICONS[name]
    .map((n) => `<${n.el} ${Object.entries(n.a).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`)
    .join('');
  return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${Math.round((size / 16) * 1e4) / 1e4})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">${body}</g>`;
}

interface TextOpts {
  px: number;
  weight: Weight;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
}

class Writer {
  readonly parts: string[] = [];
  runs = 0;
  readonly fonts: SvgFonts;
  constructor(fonts: SvgFonts) {
    this.fonts = fonts;
  }

  add(s: string): void {
    this.parts.push(s);
  }

  /** Baseline of a line of `px` text centred in a box of height `lh` that starts at `top`. */
  baseline(top: number, lh: number, px: number): number {
    const m = this.fonts.metrics();
    return top + (lh - (m.ascent + m.descent) * px) / 2 + m.ascent * px;
  }

  /** Baseline of text centred on `cy` the way SVG's dominant-baseline: central does it (edge labels). */
  centralBaseline(cy: number, px: number): number {
    const m = this.fonts.metrics();
    return cy + ((m.ascent - m.descent) / 2) * px;
  }

  /** Text at a baseline. Returns its advance width. */
  text(x: number, baseline: number, text: string, o: TextOpts): number {
    const runs = this.fonts.runs(text, o.weight);
    const total = runs.reduce((s, r) => s + r.width, 0) * o.px;
    let cx = o.anchor === 'middle' ? x - total / 2 : o.anchor === 'end' ? x - total : x;
    for (const r of runs) {
      const w = r.width * o.px;
      const lead = r.text.length - r.text.trimStart().length;
      const body = r.text.trim();
      if (body) {
        // leading spaces collapse in SVG: move the run to where its first visible character stands
        const spaceW = lead ? (this.fonts.width(r.text.slice(0, lead), o.px, o.weight)) : 0;
        this.add(`<text x="${n2(cx + spaceW)}" y="${n2(baseline)}" font-family="${r.face || 'sans'}" font-size="${n2(o.px)}" fill="${o.fill}">${esc(body)}</text>`);
        this.runs++;
      }
      cx += w;
    }
    return total;
  }
}

// ---------- frames ----------

function frameRect(f: FrameView): string {
  const base = `x="${n2(f.x)}" y="${n2(f.y)}" width="${n2(f.w)}" height="${n2(f.h)}"`;
  switch (f.kind) {
    case 'region':
      return `<rect ${base} rx="4" fill="${COLOR.surface2}" stroke="${COLOR.line1}" stroke-width="1"/>`;
    case 'vpc':
      return `<rect ${base} rx="4" fill="${COLOR.sheet}" stroke="${COLOR.line2}" stroke-width="1"/>`;
    case 'zone':
      return `<rect ${base} rx="4" fill="none" stroke="${COLOR.line2}" stroke-width="1" stroke-dasharray="4 3"/>`;
    case 'edge':
      return `<rect ${base} rx="4" fill="${COLOR.record}"/>`;
    case 'external':
    case 'onprem':
      return `<rect ${base} rx="4" fill="none" stroke="${COLOR.line2}" stroke-width="1" stroke-dasharray="4 3"/>`;
    case 'account':
    case 'saas':
    case 'recs':
    case 'outside':
    case 'solution':
      return `<rect ${base} rx="4" fill="${COLOR.record}"/>`;
    case 'lane':
      return '';
  }
}

function drawFrame(w: Writer, f: FrameView): void {
  w.add(`<g data-kind="frame" data-id="${esc(f.id)}">`);
  w.add(frameRect(f));
  const lane = f.kind === 'lane';
  const x0 = lane ? f.x : f.x + 12;
  const top = lane ? f.y + 2 : f.y + 6;
  const base = w.baseline(top, 16, 12);
  let x = x0;
  const nameFill = lane ? COLOR.ink3 : COLOR.ink2;
  if (f.aside && f.asidePlace === 'before') x += w.text(x, base, f.aside, { px: 12, weight: 500, fill: COLOR.ink3 }) + 8;
  x += w.text(x, base, f.text, { px: 12, weight: 500, fill: nameFill });
  if (f.aside && f.asidePlace === 'after') w.text(x + 8, base, f.aside, { px: 12, weight: 400, fill: COLOR.ink3 });
  w.add('</g>');
}

// ---------- cards and badges ----------

function drawBadge(w: Writer, host: CardView, b: BadgeView, svgIcon: (product: string, x: number, y: number, size: number) => string): void {
  const x = host.x + b.x;
  const y = host.y + b.y;
  w.add(`<g data-kind="badge" data-id="${esc(b.id)}" data-product="${esc(b.product)}">`);
  w.add(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(b.w)}" height="${n2(b.h)}" rx="2" fill="${COLOR.sheet}" stroke="${COLOR.line2}" stroke-width="1"/>`);
  if (b.as === 'badge') {
    const s = 14;
    w.add(svgIcon(b.product, x + (b.w - s) / 2, y + (b.h - s) / 2, s));
  } else {
    const s = 12;
    w.add(svgIcon(b.product, x + 6, y + (b.h - s) / 2, s));
    const room = b.w - 6 - s - 4 - 8;
    const name = fitText(w, b.short, 12, 500, room);
    w.text(x + 6 + s + 4, w.baseline(y, b.h, 12), name, { px: 12, weight: 500, fill: COLOR.ink2 });
  }
  w.add('</g>');
}

/** The text cut with an ellipsis to fit `room` px (the canvas clips; a PDF reads better with the mark). */
function fitText(w: Writer, text: string, px: number, weight: Weight, room: number): string {
  const fonts = w.fonts;
  if (fonts.width(text, px, weight) <= room) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && fonts.width(chars.join('') + '…', px, weight) > room) chars.pop();
  return chars.join('') + '…';
}

function drawCard(w: Writer, c: CardView, chips: DiagramSvgInput['chips'], svgIcon: (product: string, x: number, y: number, size: number) => string): void {
  w.add(`<g data-kind="card" data-id="${esc(c.id)}" data-product="${esc(c.product)}">`);
  w.add(`<rect x="${n2(c.x)}" y="${n2(c.y)}" width="${n2(c.w)}" height="${n2(c.h)}" rx="2" fill="${COLOR.sheet}" stroke="${COLOR.line2}" stroke-width="1"/>`);
  // the glyph tile: 30 px, the 20 px icon centred in it, 10 px from the left edge
  w.add(svgIcon(c.product, c.x + 10 + 5, c.y + (c.h - 20) / 2, 20));

  const tx = c.x + 10 + 30 + 10;
  const titleLh = c.titlePx * G.titleLineHeight;
  const subLh = G.subtitlePx * G.subtitleLineHeight;
  const hasSub = !!c.subtitle || c.zones.length > 0;
  const block = c.titleLines.length * titleLh + (hasSub ? subLh : 0);
  let top = c.y + (c.h - block) / 2;
  for (const line of c.titleLines) {
    w.text(tx, w.baseline(top, titleLh, c.titlePx), line, { px: c.titlePx, weight: 500, fill: COLOR.ink });
    top += titleLh;
  }
  if (hasSub) {
    const base = w.baseline(top, subLh, G.subtitlePx);
    if (c.subtitle) w.text(tx, base, c.subtitle, { px: G.subtitlePx, weight: 400, fill: COLOR.ink3 });
    if (c.zones.length) w.text(tx + G.textW, base, c.zones.join(' '), { px: G.subtitlePx, weight: 500, fill: COLOR.ink3, anchor: 'end' });
  }
  if (c.caution) w.add(uiIconMarkup('infoCircle', c.x + c.w - 8 - 12, c.y + 6, 12, COLOR.warn));
  if (c.fit) {
    const text = c.fit === 'primary' ? chips.primary : chips.complement;
    const cw = w.fonts.width(text, 12, 500) + 16;
    const cx = c.x + 10;
    const cy = c.y - 9;
    if (c.fit === 'primary') w.add(`<rect x="${n2(cx)}" y="${n2(cy)}" width="${n2(cw)}" height="18" fill="${COLOR.ink}"/>`);
    else w.add(`<rect x="${n2(cx)}" y="${n2(cy)}" width="${n2(cw)}" height="18" fill="${COLOR.sheet}" stroke="${COLOR.lineControl}" stroke-width="1"/>`);
    w.text(cx + 8, w.baseline(cy, 18, 12), text, { px: 12, weight: 500, fill: c.fit === 'primary' ? COLOR.onAction : COLOR.ink2 });
  }
  for (const b of c.badges) drawBadge(w, c, b, svgIcon);
  for (const b of c.attachments) drawBadge(w, c, b, svgIcon);
  w.add('</g>');
}

// ---------- edges ----------

function edgeStyle(e: EdgeDraw): { stroke: string; width: number; dash?: string; cap?: string } {
  const base = e.path ? { stroke: COLOR.ink2, width: 2 } : { stroke: COLOR.edge, width: 1.5 };
  if (e.kind === 'async') return { ...base, dash: '5 4' };
  if (e.kind === 'resolve') return { ...base, dash: '0.1 4.5', cap: 'round' };
  if (e.kind === 'control') return { ...base, width: 1, dash: '3 3' };
  return base;
}

function drawEdge(w: Writer, e: EdgeDraw): void {
  const s = edgeStyle(e);
  const dash = s.dash ? ` stroke-dasharray="${s.dash}"` : '';
  w.add(`<g data-kind="edge" data-id="${esc(e.id)}" data-edge-kind="${e.kind}">`);
  w.add(`<path d="${e.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linejoin="round" stroke-linecap="${s.cap ?? 'butt'}"${dash}/>`);
  if (e.kind !== 'resolve' && e.arrow) w.add(`<path d="${e.arrow}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linejoin="round" stroke-linecap="butt"/>`);
  w.add('</g>');
}

function drawEdgeLabel(w: Writer, e: EdgeDraw): void {
  if (!e.label) return;
  const p = e.label.plate;
  w.add(`<g data-kind="edge-label" data-id="${esc(e.id)}">`);
  w.add(`<rect x="${n2(p.x)}" y="${n2(p.y)}" width="${n2(p.w)}" height="${n2(p.h)}" fill="${COLOR.sheet}"/>`);
  w.text(e.label.x, w.centralBaseline(e.label.y, 12), e.label.text, { px: 12, weight: 400, fill: COLOR.ink3 });
  w.add('</g>');
}

// ---------- legend ----------

function drawLegend(w: Writer, legend: LegendText, x0: number, y: number): void {
  const items: Array<{ kind: 'path' | 'data' | 'async' | 'resolve'; text: string }> = [
    { kind: 'path', text: legend.path },
    { kind: 'data', text: legend.data },
    { kind: 'async', text: legend.async },
    { kind: 'resolve', text: legend.resolve },
  ];
  let x = x0;
  w.add('<g data-kind="legend">');
  for (const it of items) {
    const stroke = it.kind === 'path' ? COLOR.ink2 : COLOR.edge;
    const width = it.kind === 'path' ? 2 : 1.5;
    const dash = it.kind === 'async' ? ' stroke-dasharray="5 4"' : it.kind === 'resolve' ? ' stroke-dasharray="0.1 4.5" stroke-linecap="round"' : '';
    w.add(`<path d="M${n2(x + 1)},${n2(y)} L${n2(x + (it.kind === 'resolve' ? 27 : 24))},${n2(y)}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash}/>`);
    if (it.kind !== 'resolve') w.add(`<path d="M${n2(x + 19.5)},${n2(y - 3.2)} L${n2(x + 25)},${n2(y)} L${n2(x + 19.5)},${n2(y + 3.2)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`);
    const tw = w.text(x + 28 + 8, w.baseline(y - 8, 16, 12), it.text, { px: 12, weight: 400, fill: COLOR.ink3 });
    x += 28 + 8 + tw + 20;
  }
  w.add('</g>');
}

// ---------- the drawing ----------

export function renderDiagramSvg(i: DiagramSvgInput): DiagramSvg {
  const w = new Writer(i.fonts);
  const icon = (product: string, x: number, y: number, size: number): string => iconMarkup(iconFor(product).geometry, x, y, size, COLOR.brandIcon);
  const vx = i.bounds.x - PAD;
  const vy = i.bounds.y - PAD;
  const vw = i.bounds.w + 2 * PAD;
  const vh = i.bounds.h + 2 * PAD + (i.legend ? LEGEND_H : 0);

  const frames = [...i.scene.frames].sort((a, b) => a.depth - b.depth);
  for (const f of frames) drawFrame(w, f);
  const labelled: EdgeDraw[] = [];
  for (const e of i.edges) {
    drawEdge(w, e);
    if (e.label) labelled.push(e);
  }
  for (const e of labelled) drawEdgeLabel(w, e);
  let badges = 0;
  for (const c of i.scene.cards) {
    drawCard(w, c, i.chips, icon);
    badges += c.badges.length + c.attachments.length;
  }
  if (i.legend) drawLegend(w, i.legend, i.bounds.x + 4, i.bounds.y + i.bounds.h + PAD + 16);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n2(vx)} ${n2(vy)} ${n2(vw)} ${n2(vh)}" width="${n2(vw)}" height="${n2(vh)}">${w.parts.join('')}</svg>`;
  return {
    svg,
    width: vw,
    height: vh,
    counts: { frames: frames.length, cards: i.scene.cards.length, badges, edges: i.edges.length, labels: labelled.length, runs: w.runs },
  };
}
