// Measured rows and readable diagram windows; independent of PDF drawing.
import type { Rect } from '@ali/core/layout.ts';

export interface TableLayoutInput {
  rows: readonly (readonly string[][])[];
  firstHeight: number;
  pageHeight: number;
  headerHeight: number;
  lineHeight: number;
}
export interface TablePage {
  rows: Array<{ index: number; cells: string[][]; continued: boolean; height: number }>;
}
export function planTablePages(i: TableLayoutInput): TablePage[] {
  const pages: TablePage[] = [{ rows: [] }];
  let left = i.firstHeight - i.headerHeight;
  const capacity = i.pageHeight - i.headerHeight;
  if (capacity < i.lineHeight + 12) throw new Error('Table page is too short');
  const next = () => { pages.push({ rows: [] }); left = capacity; };
  i.rows.forEach((cells, index) => {
    const lines = Math.max(1, ...cells.map((c) => c.length));
    if (lines * i.lineHeight + 12 <= capacity && lines * i.lineHeight + 12 > left) next();
    let offset = 0;
    while (offset < lines) {
      const count = Math.min(lines - offset, Math.floor((left - 12) / i.lineHeight));
      if (count < 1) { next(); continue; }
      const height = count * i.lineHeight + 12;
      pages.at(-1)!.rows.push({ index, cells: cells.map((c) => c.slice(offset, offset + count)), continued: offset > 0, height });
      left -= height;
      offset += count;
      if (offset < lines) next();
    }
  });
  return pages;
}

export interface DiagramPageInput { bounds: Rect; cards: readonly Rect[]; minTitlePx: number }
export interface DiagramPage { size: 'A4' | 'A3'; scale: number; overview: boolean; bounds: Rect; windows?: Rect[] }
export const WORKFLOW_TITLE_FLOOR = 11;
const fit = (b: Rect, w: number, h: number) => Math.min(w / b.w, h / b.h, 1.3);
export function planWorkflowDiagramPages(i: DiagramPageInput): DiagramPage[] {
  const minScale = WORKFLOW_TITLE_FLOOR / i.minTitlePx;
  const a4 = fit(i.bounds, 745.89, 403.28), a3 = fit(i.bounds, 1094.55, 649.89);
  if (a4 >= minScale) return [{ size: 'A4', scale: a4, overview: false, bounds: i.bounds }];
  if (a3 >= minScale) return [{ size: 'A3', scale: a3, overview: false, bounds: i.bounds }];
  const pages: DiagramPage[] = [{ size: 'A3', scale: a3, overview: true, bounds: i.bounds }];
  const w = 1094.55 / minScale, h = 649.89 / minScale;
  if (i.cards.some((c) => c.w + 28 > w || c.h + 28 > h)) throw new Error('Workflow card exceeds readable tile size');
  const contains = (b: Rect, c: Rect) => c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h;
  let remaining = [...i.cards].sort((a, b) => a.x - b.x || a.y - b.y);
  const tiles: Rect[] = [];
  while (remaining.length) {
    const seed = remaining[0];
    const window = { x: Math.max(i.bounds.x, Math.min(seed.x - 14, i.bounds.x + i.bounds.w - w)),
      y: Math.max(i.bounds.y, Math.min(seed.y - 14, i.bounds.y + i.bounds.h - h)), w, h };
    const cards = i.cards.filter((c) => contains(window, c));
    // Crop unused margins, but retain a channel around cards for edge stubs and labels.
    const x = Math.max(window.x, Math.min(...cards.map((c) => c.x)) - 28);
    const y = Math.max(window.y, Math.min(...cards.map((c) => c.y)) - 44);
    const bounds = { x, y, w: Math.min(window.x + w, Math.max(...cards.map((c) => c.x + c.w)) + 28) - x,
      h: Math.min(window.y + h, Math.max(...cards.map((c) => c.y + c.h)) + 76) - y };
    tiles.push(bounds);
    remaining = remaining.filter((c) => !contains(bounds, c));
  }
  // Minimise page count first, then balance strip heights so the final sheet is not mostly empty.
  const plans = [{ count: 0, cost: 0, start: 0 }];
  for (let end = 1; end <= tiles.length; end++) {
    let best = { count: Infinity, cost: Infinity, start: 0 }, height = -24;
    for (let start = end - 1; start >= 0; start--) {
      height += tiles[start].h + 24;
      if (height > h + .001) break;
      const count = plans[start].count + 1, cost = plans[start].cost + height * height;
      if (count < best.count || (count === best.count && cost < best.cost)) best = { count, cost, start };
    }
    plans.push(best);
  }
  const groups: Rect[][] = [];
  for (let end = tiles.length; end > 0; end = plans[end].start) groups.unshift(tiles.slice(plans[end].start, end));
  for (const windows of groups) {
    const bounds = windows.length === 1 ? windows[0] : { x: 0, y: 0, w: Math.max(...windows.map((b) => b.w)),
      h: windows.reduce((n, b) => n + b.h + 24, -24) };
    pages.push({ size: 'A3', scale: Math.max(minScale, fit(bounds, 1094.55, 649.89)), overview: false, bounds,
      ...(windows.length > 1 ? { windows } : {}) });
  }
  return pages;
}
