// Static SVG of one diagram state as the canvas would show it at a given canvas size: fit zoom, frames with
// small-caps labels, routed edges, cards with a glyph tile, title and subtitle, badges and attachments. Colours, type
// and geometry follow spikes/canvas (tokens.css light theme, canvas.css, nodes.tsx, edges.tsx). The app's own glyphs
// and palette only: no vendor icons, logos or brand colours. Truncation uses the bench's advance-width estimate.
import type { LayoutCard, LayoutFrame, LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Catalog, CatalogEntry, Graph, IconFamily, Lane } from '../../../../packages/core/src/types.ts';
import type { Canvas, LayoutMetrics } from '../layouts.ts';
import { textWidthOf } from '../layouts.ts';
import { fitZoom } from '../metrics/size.ts';
import { ellipsize, entryOf, frameLabelRoom, frameText, textWidth } from '../text.ts';
import type { AdvanceTable, CardText } from '../text.ts';
import type { PlannedEdge, Pt } from '../routing/types.ts';
import { GLYPHS } from './glyphs.ts';
import { FONT_STACK } from '../browser.ts';

const C = {
  bg: '#f3f5f8',
  surface: '#ffffff',
  ink: '#14181f',
  ink2: '#485160',
  ink3: '#667080',
  line: 'rgba(22,30,44,0.11)',
  lineStrong: 'rgba(22,30,44,0.2)',
  accent: '#3550cc',
  accentSoft: 'rgba(53,80,204,0.12)',
  edge: 'rgba(64,74,90,0.5)',
  edgeMuted: 'rgba(64,74,90,0.32)',
  edgePath: '#3550cc',
  frameLabel: '#5a6371',
  zoneLine: 'rgba(34,108,160,0.32)',
};

const FRAME_STYLE: Record<string, { fill: string; stroke: string; rx: number; dash?: string }> = {
  region: { fill: 'rgba(84,98,122,0.04)', stroke: 'rgba(84,98,122,0.2)', rx: 14 },
  vpc: { fill: 'rgba(34,108,160,0.055)', stroke: 'rgba(34,108,160,0.28)', rx: 12 },
  zone: { fill: 'rgba(255,255,255,0.45)', stroke: C.zoneLine, rx: 10, dash: '4 3' },
  edge: { fill: 'rgba(104,86,170,0.045)', stroke: 'rgba(104,86,170,0.22)', rx: 14 },
  external: { fill: 'rgba(84,98,122,0.03)', stroke: 'rgba(84,98,122,0.16)', rx: 14 },
  onprem: { fill: 'rgba(84,98,122,0.03)', stroke: 'rgba(84,98,122,0.16)', rx: 14 },
  outside: { fill: 'rgba(84,98,122,0.03)', stroke: 'rgba(84,98,122,0.16)', rx: 14 },
  solution: { fill: 'rgba(84,98,122,0.03)', stroke: 'rgba(84,98,122,0.16)', rx: 14 },
  account: { fill: 'rgba(140,112,72,0.045)', stroke: 'rgba(140,112,72,0.2)', rx: 14 },
  saas: { fill: 'rgba(140,112,72,0.045)', stroke: 'rgba(140,112,72,0.2)', rx: 14 },
  recs: { fill: 'rgba(140,112,72,0.045)', stroke: 'rgba(140,112,72,0.2)', rx: 14 },
};

const HUE_OF_LANE: Record<Lane, string> = {
  clients: 'external', onprem: 'external', thirdparty: 'external', dns: 'edge', edge: 'edge', ingress: 'ingress', boundary: 'ingress', network: 'ingress',
  compute: 'compute', cache: 'data', database: 'data', search: 'data', filestore: 'data', storage: 'data', middleware: 'integration', integration: 'integration',
  ai: 'ai', analytics: 'analytics', ops: 'ops', security: 'security', governance: 'security', saas: 'saas',
};
const HUES: Record<string, { fg: string; bg: string }> = {
  external: { fg: '#4a5262', bg: '#eef0f3' },
  edge: { fg: '#5546b8', bg: '#eeebfb' },
  ingress: { fg: '#2b62c9', bg: '#e7effc' },
  compute: { fg: '#0b7f86', bg: '#e0f3f3' },
  data: { fg: '#3b7a2c', bg: '#e8f3e3' },
  integration: { fg: '#8547ad', bg: '#f3eafa' },
  ai: { fg: '#7a3fc8', bg: '#f1eafd' },
  analytics: { fg: '#8f6400', bg: '#f8f0db' },
  ops: { fg: '#4f6075', bg: '#edf0f4' },
  security: { fg: '#b03a5b', bg: '#fbe9ee' },
  saas: { fg: '#39687f', bg: '#e6f0f4' },
};
const hueOf = (e: CatalogEntry | undefined): { fg: string; bg: string } => HUES[e ? HUE_OF_LANE[e.lane] ?? 'ops' : 'ops'];

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x: number): string => (Math.round(x * 100) / 100).toString();

/** Baseline of a text line of `px` in a CSS line box of `lineH` starting at `top` (Inter: ascent 0.969, content 1.21 em). */
const baseline = (top: number, lineH: number, px: number): number => top + (lineH - 1.21 * px) / 2 + 0.969 * px;

function glyph(icon: IconFamily | undefined, x: number, y: number, size: number, color: string): string {
  const inner = GLYPHS[icon ?? 'generic'] ?? GLYPHS.generic;
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(size)}" height="${n(size)}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

/** Orthogonal polyline to a path with rounded corners (edges.tsx roundedPath, radius 8). */
export function roundedPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${n(pts[0].x)},${n(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y);
    const l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(8, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L${n(b.x)},${n(b.y)}`;
      continue;
    }
    const p1 = { x: b.x - ((b.x - a.x) / l1) * r, y: b.y - ((b.y - a.y) / l1) * r };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * r, y: b.y + ((c.y - b.y) / l2) * r };
    d += ` L${n(p1.x)},${n(p1.y)} Q${n(b.x)},${n(b.y)} ${n(p2.x)},${n(p2.y)}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L${n(z.x)},${n(z.y)}`;
}

function arrow(pts: Pt[]): string {
  const b = pts[pts.length - 1];
  const a = pts[pts.length - 2];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const s = 5.5;
  const tx = b.x - ux;
  const ty = b.y - uy;
  return `M${n(tx - ux * s - uy * s * 0.8)},${n(ty - uy * s + ux * s * 0.8)} L${n(tx)},${n(ty)} L${n(tx - ux * s + uy * s * 0.8)},${n(ty - uy * s - ux * s * 0.8)}`;
}

export interface SvgInput {
  layout: LayoutState;
  display: Graph;
  catalog: Catalog;
  edges: PlannedEdge[];
  routes: Record<string, Pt[]>;
  metrics: LayoutMetrics;
  canvas: Canvas;
  table: AdvanceTable;
  cardText: (card: LayoutCard, display: Graph, catalog: Catalog) => CardText;
  /** @font-face CSS embedded in the SVG (Inter Variable latin as a data URL), or '' for the system font. */
  fontFace: string;
}

export interface SvgOutput {
  svg: string;
  zoom: number;
  bbox: { w: number; h: number };
}

export function renderSvg(inp: SvgInput): SvgOutput {
  const { layout: L, metrics: M, canvas, table } = inp;
  // content box: frames, cards, badges and routes
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const grow = (x: number, y: number, w = 0, h = 0): void => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + w);
    y1 = Math.max(y1, y + h);
  };
  for (const r of [...Object.values(L.frames), ...Object.values(L.cards), ...Object.values(L.badges)]) grow(r.x, r.y, r.w, r.h);
  for (const pts of Object.values(inp.routes)) for (const p of pts) grow(p.x, p.y);
  if (!Number.isFinite(x0)) {
    x0 = y0 = 0;
    x1 = y1 = 1;
  }
  const bw = x1 - x0;
  const bh = y1 - y0;
  const zoom = fitZoom(bw, bh, canvas);
  const tx = (canvas.w - bw * zoom) / 2 - x0 * zoom;
  const ty = (canvas.h - bh * zoom) / 2 - y0 * zoom;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.w}" height="${canvas.h}" viewBox="0 0 ${canvas.w} ${canvas.h}">`);
  out.push(`<style>${inp.fontFace}text{font-family:${FONT_STACK};}.fl{font-weight:650;letter-spacing:0.07em;font-variant-caps:all-small-caps;fill:${C.frameLabel}}.fc{font-weight:500;fill:${C.ink3}}.ct{font-weight:600;letter-spacing:-0.006em;fill:${C.ink}}.cs{font-weight:450;fill:${C.ink3}}</style>`);
  out.push(`<rect width="100%" height="100%" fill="${C.bg}"/>`);
  out.push(`<g transform="translate(${n(tx)},${n(ty)}) scale(${zoom.toFixed(5)})">`);

  // frames, outermost first
  const frames = Object.values(L.frames).sort((a, b) => a.depth - b.depth);
  for (const f of frames) {
    const st = FRAME_STYLE[f.kind];
    if (st) out.push(`<rect x="${n(f.x)}" y="${n(f.y)}" width="${n(f.w)}" height="${n(f.h)}" rx="${st.rx}" fill="${st.fill}" stroke="${st.stroke}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`);
  }
  for (const f of frames) out.push(frameLabelSvg(f, M.frameLabelPx, table));
  for (const f of frames) {
    if (f.empty && f.kind === 'solution') {
      out.push(`<rect x="${n(f.x + 14)}" y="${n(f.y + 40)}" width="${n(f.w - 28)}" height="${n(Math.max(20, f.h - 56))}" rx="10" fill="none" stroke="${C.lineStrong}" stroke-dasharray="4 3"/>`);
      out.push(`<text x="${n(f.x + f.w / 2)}" y="${n(f.y + 40 + Math.max(20, f.h - 56) / 2 + 4)}" text-anchor="middle" font-size="11.5" fill="${C.ink3}">Nothing to provision</text>`);
    }
  }

  // edges under cards
  for (const e of inp.edges) {
    const pts = inp.routes[e.id];
    if (!pts || pts.length < 2) continue;
    const muted = e.kind === 'resolve' || e.kind === 'control';
    const color = muted ? C.edgeMuted : e.path ? C.edgePath : C.edge;
    const width = muted || e.path ? 1.5 : 1.25;
    const dash = e.kind === 'async' ? ' stroke-dasharray="5 4"' : muted ? ' stroke-dasharray="1 4" stroke-linecap="round"' : '';
    out.push(`<path d="${roundedPath(pts)}" fill="none" stroke="${color}" stroke-width="${width}"${dash}/>`);
    out.push(`<path d="${arrow(pts)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (e.bar) out.push(`<path d="M${n(e.bar.x)},${n(e.bar.y0)} L${n(e.bar.x)},${n(e.bar.y1)}" stroke="${C.edge}" stroke-width="2.5" stroke-linecap="round"/>`);
  }

  // cards
  const room = textWidthOf(M);
  for (const c of Object.values(L.cards)) out.push(cardSvg(c, inp, room));
  out.push('</g></svg>');
  return { svg: out.join('\n'), zoom, bbox: { w: Math.round(bw), h: Math.round(bh) } };
}

function frameLabelSvg(f: LayoutFrame, px: number, table: AdvanceTable): string {
  const { label, caption } = frameText(f);
  if (!label) return '';
  const room = frameLabelRoom(f);
  const left = f.kind === 'lane' ? f.x : f.kind === 'zone' ? f.x + 8 : f.x + 12;
  const top = f.kind === 'lane' ? f.y + 2 : f.kind === 'zone' ? f.y + 6 : f.y + 9;
  const y = baseline(top, 16, px);
  const lw = textWidth(table, 'frame', label, px);
  if (lw >= room || !caption) return `<text class="fl" x="${n(left)}" y="${n(y)}" font-size="${px}">${esc(ellipsize(table, 'frame', label, px, room))}</text>`;
  const capRoom = room - lw - 7;
  const cap = capRoom > 12 ? ellipsize(table, 'caption', caption, px, capRoom) : '';
  return `<text class="fl" x="${n(left)}" y="${n(y)}" font-size="${px}">${esc(label)}</text>` + (cap ? `<text class="fc" x="${n(left + lw + 7)}" y="${n(y)}" font-size="${px}">${esc(cap)}</text>` : '');
}

function cardSvg(c: LayoutCard, inp: SvgInput, room: number): string {
  const { catalog, table, metrics: M } = inp;
  const e = entryOf(catalog, c.product);
  const hue = hueOf(e);
  const t = inp.cardText(c, inp.display, catalog);
  const o: string[] = [];
  const primary = c.fit === 'primary';
  if (primary) o.push(`<rect x="${n(c.x - 3)}" y="${n(c.y - 3)}" width="${n(c.w + 6)}" height="${n(c.h + 6)}" rx="13" fill="${C.accentSoft}"/>`);
  o.push(`<rect x="${n(c.x)}" y="${n(c.y + 1)}" width="${n(c.w)}" height="${n(c.h)}" rx="10" fill="rgba(16,24,40,0.05)"/>`);
  o.push(`<rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.w)}" height="${n(c.h)}" rx="10" fill="${C.surface}" stroke="${primary ? 'rgba(53,80,204,0.55)' : C.line}"/>`);
  const tile = Math.min(30, c.h - 12);
  const tx = c.x + 10;
  const ty = c.y + (c.h - tile) / 2;
  o.push(`<rect x="${n(tx)}" y="${n(ty)}" width="${n(tile)}" height="${n(tile)}" rx="8" fill="${hue.bg}"/>`);
  const gs = tile * 0.6;
  o.push(glyph(e?.icon, tx + (tile - gs) / 2, ty + (tile - gs) / 2, gs, hue.fg));
  const textX = tx + tile + 10;
  const lhT = Math.round(M.titlePx * 1.28);
  const lhS = Math.round(M.subtitlePx * 1.27);
  const hasSub = !!t.subtitle;
  const block = hasSub ? lhT + 1 + lhS : lhT;
  const top = c.y + (c.h - block) / 2;
  o.push(`<text class="ct" x="${n(textX)}" y="${n(baseline(top, lhT, M.titlePx))}" font-size="${M.titlePx}">${esc(ellipsize(table, 'title', t.title, M.titlePx, room))}</text>`);
  if (hasSub) o.push(`<text class="cs" x="${n(textX)}" y="${n(baseline(top + lhT + 1, lhS, M.subtitlePx))}" font-size="${M.subtitlePx}">${esc(ellipsize(table, 'subtitle', t.subtitle, M.subtitlePx, room))}</text>`);
  if (primary) {
    const w = textWidth(table, 'frame', 'Primary', 10) + 14;
    o.push(`<rect x="${n(c.x + c.w - 10 - w)}" y="${n(c.y - 9)}" width="${n(w)}" height="16" rx="8" fill="${C.accent}"/>`);
    o.push(`<text class="fl" x="${n(c.x + c.w - 10 - w + 7)}" y="${n(baseline(c.y - 9, 16, 10))}" font-size="10" style="fill:#fff">Primary</text>`);
  }
  if (c.zones && c.zones.length > 1) {
    const letters = c.zones.map((z) => z.toUpperCase());
    const w = letters.length * 9 + (letters.length - 1) * 3 + 10;
    const zx = c.x + c.w - 10 - w;
    const zy = c.y + c.h - 8;
    o.push(`<rect x="${n(zx)}" y="${n(zy)}" width="${n(w)}" height="14" rx="7" fill="${C.surface}" stroke="${C.zoneLine}"/>`);
    letters.forEach((z, i) => o.push(`<text x="${n(zx + 5 + i * 12 + 4.5)}" y="${n(zy + 10.5)}" text-anchor="middle" font-size="9" font-weight="700" fill="${HUES.ingress.fg}">${esc(z)}</text>`));
  }
  for (const bid of c.badges) {
    const b = inp.layout.badges[bid];
    if (!b) continue;
    const be = entryOf(catalog, b.product);
    const bh = hueOf(be);
    if (b.as === 'badge') {
      o.push(`<circle cx="${n(b.x + b.w / 2)}" cy="${n(b.y + b.h / 2)}" r="${n(b.w / 2)}" fill="${C.surface}" stroke="${bh.fg}" stroke-opacity="0.45"/>`);
      o.push(glyph(be?.icon, b.x + (b.w - 13) / 2, b.y + (b.h - 13) / 2, 13, bh.fg));
    } else {
      const label = be?.short ?? b.product;
      const w = 6 + 11 + 4 + textWidth(table, 'attach', label, 10.5) + 8;
      o.push(`<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(w)}" height="${n(b.h)}" rx="${n(b.h / 2)}" fill="${C.surface}" stroke="${C.lineStrong}"/>`);
      o.push(glyph(be?.icon, b.x + 6, b.y + (b.h - 11) / 2, 11, bh.fg));
      o.push(`<text x="${n(b.x + 21)}" y="${n(baseline(b.y + 1, 18, 10.5))}" font-size="10.5" font-weight="550" fill="${C.ink2}">${esc(label)}</text>`);
    }
  }
  return o.join('');
}
