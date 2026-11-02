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
export interface DiagramPage { size: 'A4' | 'A3'; scale: number; overview: boolean; bounds: Rect }
export const WORKFLOW_TITLE_FLOOR = 11;
const fit = (b: Rect, w: number, h: number) => Math.min(w / b.w, h / b.h, 1.3);
export function planWorkflowDiagramPages(i: DiagramPageInput): DiagramPage[] {
  const minScale = WORKFLOW_TITLE_FLOOR / i.minTitlePx;
  const a4 = fit(i.bounds, 745.89, 403.28), a3 = fit(i.bounds, 1094.55, 649.89);
  if (a4 >= minScale) return [{ size: 'A4', scale: a4, overview: false, bounds: i.bounds }];
  if (a3 >= minScale) return [{ size: 'A3', scale: a3, overview: false, bounds: i.bounds }];
  const pages: DiagramPage[] = [{ size: 'A3', scale: a3, overview: true, bounds: i.bounds }];
  const w = 1094.55 / minScale, h = 649.89 / minScale;
  const overlapX = Math.max(40, ...i.cards.map((c) => c.w + 28));
  const overlapY = Math.max(40, ...i.cards.map((c) => c.h + 28));
  if (overlapX >= w || overlapY >= h) throw new Error('Workflow card exceeds readable tile size');
  for (let x = i.bounds.x; x < i.bounds.x + i.bounds.w; x += w - overlapX) {
    for (let y = i.bounds.y; y < i.bounds.y + i.bounds.h; y += h - overlapY) {
      pages.push({ size: 'A3', scale: minScale, overview: false,
        bounds: { x, y, w: Math.min(w, i.bounds.x + i.bounds.w - x), h: Math.min(h, i.bounds.y + i.bounds.h - y) } });
      if (y + h >= i.bounds.y + i.bounds.h) break;
    }
    if (x + w >= i.bounds.x + i.bounds.w) break;
  }
  return pages;
}
