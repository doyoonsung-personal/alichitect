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
export const insideWorkflowWindow = (b: Rect, r: Rect) => r.x >= b.x && r.y >= b.y
  && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h;

/** A viewport alone clips routes into disconnected fragments. Only draw a complete, endpoint-owned route. */
export function workflowWindowEdges(i: Pick<WorkflowSvgInput, 'bounds' | 'scene' | 'edges'>) {
  const visible = new Set(i.scene.cards.filter(c => insideWorkflowWindow(i.bounds, c)).map(c => c.id));
  const full = i.edges.filter(e => visible.has(e.edge.from) && visible.has(e.edge.to)
    && e.points.every(p => insideWorkflowWindow(i.bounds, { ...p, w: 0, h: 0 }))
    && (!e.label || insideWorkflowWindow(i.bounds, e.labelBox)));
  const continued = i.edges.filter(e => !full.includes(e) && (visible.has(e.edge.from) || visible.has(e.edge.to)));
  return { visible, full, continued };
}
/** Compress only truly consecutive references; a range must never imply a missing connection. */
function connectorLabel(refs: readonly string[]): string {
  const numbers = [...new Set(refs.map(ref => Number(ref.slice(1))))].sort((a, b) => a - b);
  const labels: string[] = [];
  for (let k = 0; k < numbers.length; k++) {
    const start = numbers[k];
    while (k + 1 < numbers.length && numbers[k + 1] === numbers[k] + 1) k++;
    const end = numbers[k];
    labels.push(start === end ? `C${start}` : `C${start}–C${end}`);
  }
  return labels.join(', ');
}
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
  const inside = (r: Rect) => insideWorkflowWindow(b, r);
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
  const window = workflowWindowEdges(i);
  const edges = i.tile ? window.full : i.edges;
  const continuations: NonNullable<DiagramSvg['continuations']> = (i.tile ? window.continued : []).map(e => ({ ref: `C${i.edges.indexOf(e) + 1}`,
    from: `${i.scene.byId.get(e.edge.from)?.label ?? e.edge.from} (${e.edge.from})`,
    to: `${i.scene.byId.get(e.edge.to)?.label ?? e.edge.to} (${e.edge.to})`,
    label: e.label || (e.attached ? i.legend.attached : e.loop ? i.legend.loop : i.legend.next) }));
  for (const e of edges) {
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
    // This labels repetition, rather than depicting an unfinished node or an open box.
    parts.push(`<rect data-kind="repetition" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="#f1f5f9"/>`);
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
  // A numbered connector at each visible endpoint points to the cross-view connection table.
  // Shared ports combine references into one badge rather than painting several badges on top of each other.
  const markers = new Map<string, { id: string; x: number; y: number; dx: number; dy: number; refs: string[] }>();
  // A group reference is based on every port in the complete diagram, not this page's subset.
  // Its member C references remain explicit in the connection table and SVG metadata.
  const portKey = (id: string, point: { x: number; y: number }) => `${id}:${point.x}:${point.y}`;
  const groupIds = new Map([...new Set(i.edges.flatMap(e => [
    e.points[0] && portKey(e.edge.from, e.points[0]),
    e.points.at(-1) && portKey(e.edge.to, e.points.at(-1)!),
  ].filter((key): key is string => !!key)))].sort().map((key, index) => [key, `G${index + 1}`]));
  if (i.tile) for (const e of window.continued) {
    for (const [id, point, next] of [[e.edge.from, e.points[0], e.points[1]],
      [e.edge.to, e.points.at(-1)!, e.points.at(-2)!]] as const) {
      if (!window.visible.has(id) || !point || !next) continue;
      const key = portKey(id, point);
      const marker = markers.get(key) ?? { id, x: point.x, y: point.y,
        dx: Math.sign(next.x - point.x), dy: Math.sign(next.y - point.y), refs: [] };
      marker.refs.push(`C${i.edges.indexOf(e) + 1}`);
      markers.set(key, marker);
    }
  }
  const occupied: Rect[] = [...cards, ...brackets, ...edges.filter(e => e.label && inside(e.labelBox)).map(e => e.labelBox)];
  const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const routeSegments = edges.flatMap(e => e.points.slice(1).map((p, k) => ({
    x: Math.min(p.x, e.points[k].x) - 1, y: Math.min(p.y, e.points[k].y) - 1,
    w: Math.abs(p.x - e.points[k].x) + 2, h: Math.abs(p.y - e.points[k].y) + 2 })));
  for (const [key, marker] of markers) {
    const card = i.scene.byId.get(marker.id)!;
    // Clamping a badge into a narrow crop margin can cover the node title or ID. Move it into
    // the clear row above/below the card and retain a short, endpoint-anchored leader instead.
    // A badge spanning several cards is technically inside the page but difficult to associate
    // with its endpoint. Keep it no wider than its own card and use an exact table-backed group.
    const available = (r: Rect) => r.w <= card.w - 4 && inside(r) && !occupied.some(o => intersects(o, r));
    const locate = (value: string): Rect | undefined => {
      const w = fonts.width(value, 10, 500) + 8;
      const preferred = { x: marker.x + (marker.dx < 0 ? -w - 2 : marker.dx > 0 ? 2 : -w / 2),
        y: marker.y + (marker.dy < 0 ? -18 : marker.dy > 0 ? 2 : -8), w, h: 16 };
      const xs = [marker.x - w / 2, card.x + 2, card.x + card.w - w - 2];
      const candidates = [preferred, ...[card.y + card.h + 2, card.y - 18].flatMap(y => xs.map(x => ({ x, y, w, h: 16 })))];
      const compactW = fonts.width(value, 8, 500) + 6;
      return candidates.find(r => available(r) && !routeSegments.some(s => intersects(r, s)))
        ?? candidates.find(available) ?? [card.y - 14, card.y + card.h + 2].flatMap(y =>
        [card.x + 2, card.x + card.w - compactW - 2].map(x => ({ x, y, w: compactW, h: 12 }))).find(available);
    };
    let value = connectorLabel(marker.refs), badge = locate(value);
    if (!badge) {
      value = groupIds.get(key)!;
      badge = locate(value);
      if (badge) for (const row of continuations) if (marker.refs.includes(row.ref)) {
        row.groups = [...new Set([...(row.groups ?? []), value])];
      }
    }
    if (!badge) throw new Error(`No clear position for workflow connector ${value} at ${marker.id}`);
    occupied.push(badge);
    const { x, y } = badge, compact = badge.h === 12;
    const end = { x: Math.max(x, Math.min(marker.x, x + badge.w)), y: Math.max(y, Math.min(marker.y, y + badge.h)) };
    const opposite = marker.dy && Math.sign(end.y - marker.y) !== marker.dy;
    const lead = marker.dx ? `M${marker.x} ${marker.y} h${marker.dx * 6} V${end.y} H${end.x}`
      : opposite ? `M${marker.x} ${marker.y} v${marker.dy * 6} H${card.x - 6} V${end.y} H${end.x}`
      : `M${marker.x} ${marker.y} v${marker.dy * 6} H${end.x} V${end.y}`;
    parts.push(`<g data-kind="continuation" data-node="${esc(marker.id)}" data-refs="${marker.refs.join(' ')}" data-label="${esc(value)}"><path d="${lead}" fill="none" stroke="#64748b"/>`
      + `<rect x="${x}" y="${y}" width="${badge.w}" height="${badge.h}" rx="3" fill="#ffffff" stroke="#64748b"/>`);
    text(x + (compact ? 3 : 4), y + (compact ? 9 : 11), value, compact ? 8 : 10, 500);
    parts.push('</g>');
  }
  if (!i.tile) Object.entries(i.legend).forEach(([key, value], k) => {
    const y = b.y + b.h - 84 + k * 20;
    parts.push(`<path d="M${b.x + 14} ${y} h28" stroke="${key === 'escalate' ? '#a85b00' : '#64748b'}"`
      + `${key === 'attached' ? ' stroke-dasharray="5 4"' : ''}/>`);
    text(b.x + 50, y + 4, value);
  });
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" overflow="hidden" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${parts.join('')}</svg>`,
    width: b.w, height: b.h,
    continuations,
    counts: { frames: brackets.length, cards: cards.length, badges: cards.reduce((n, c) => n + c.badges.length, 0),
      edges: edges.length, labels: edges.filter((e) => e.label && (!i.tile || inside(e.labelBox))).length, runs },
  };
}

// Wide overviews read left to right in strips, then top to bottom, without moving any card within a strip.
export function renderWorkflowOverview(i: WorkflowSvgInput): DiagramSvg {
  const columns = [...new Set(i.scene.cards.map((c) => c.x))].sort((a, b) => a - b);
  let best: { bounds: Rect[]; width: number; height: number; scale: number } | null = null;
  for (let count = 1; count <= columns.length; count++) {
    const strips: Rect[] = [];
    for (let start = 0; start < columns.length; start += count) {
      const next = columns[start + count];
      const x = start ? columns[start] - 14 : i.bounds.x;
      const right = next === undefined ? i.bounds.x + i.bounds.w : next - 14;
      const cards = i.scene.cards.filter((c) => c.x >= x && c.x < right);
      // Never cut a card, even when adjacent columns overlap horizontally.
      if (cards.some((c) => c.x + c.w > right)) break;
      const rects: Rect[] = [...cards, ...i.scene.brackets.filter((r) => r.x < right && r.x + r.w > x),
        ...i.edges.filter((e) => e.label && e.labelBox.x < right && e.labelBox.x + e.labelBox.w > x).map((e) => e.labelBox)];
      for (const e of i.edges) for (let k = 1; k < e.points.length; k++) {
        const a = e.points[k - 1], b = e.points[k];
        if (Math.min(a.x, b.x) < right && Math.max(a.x, b.x) >= x) {
          rects.push({ x, y: Math.min(a.y, b.y), w: 0, h: Math.abs(a.y - b.y) });
        }
      }
      const y = Math.min(...rects.map((r) => r.y)) - 14;
      strips.push({ x, y, w: right - x, h: Math.max(...rects.map((r) => r.y + r.h)) + 14 - y });
    }
    if (strips.length !== Math.ceil(columns.length / count)) continue;
    const width = Math.max(...strips.map((b) => b.w));
    const height = strips.reduce((h, b) => h + b.h + 24, 100);
    const scale = Math.min(1094.55 / width, 649.89 / height, 1.3);
    if (!best || scale > best.scale) best = { bounds: strips, width, height, scale };
  }
  if (!best || best.bounds.length === 1) return renderWorkflowSvg(i);
  return renderWorkflowStrips(i, best.bounds, true);
}

export function renderWorkflowStrips(i: WorkflowSvgInput, windows: readonly Rect[], withLegend = false): DiagramSvg {
  const width = Math.max(...windows.map((b) => b.w));
  const height = windows.reduce((h, b) => h + b.h, 0) + (windows.length - 1) * 24 + (withLegend ? 124 : 0);
  let y = 0;
  const continued = new Map<string, NonNullable<DiagramSvg['continuations']>[number]>();
  const parts = windows.map((bounds, index) => {
    const strip = renderWorkflowSvg({ ...i, bounds, tile: true });
    for (const row of strip.continuations ?? []) {
      const previous = continued.get(row.ref);
      continued.set(row.ref, { ...row, ...((previous?.groups || row.groups)
        ? { groups: [...new Set([...(previous?.groups ?? []), ...(row.groups ?? [])])] } : {}) });
    }
    const svg = strip.svg.replace('<svg ', `<svg x="0" y="${y}" `);
    y += bounds.h + 24;
    return svg + (index + 1 < windows.length
      ? `<path d="M0 ${y - 12} H${width}" stroke="#e2e8f0"/>` : '');
  });
  if (withLegend) {
    const legend = renderWorkflowSvg({ ...i, scene: { ...i.scene, cards: [], brackets: [] }, edges: [],
      bounds: { x: 0, y: 0, w: width, h: 100 }, tile: false });
    parts.push(legend.svg.replace('<svg ', `<svg x="0" y="${y}" `));
  }
  const full = renderWorkflowSvg(i);
  return { ...full, width, height, continuations: [...continued.values()],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"`
      + ` viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>` };
}
