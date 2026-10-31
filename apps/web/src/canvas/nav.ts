// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed by Claude (null guard for an unknown card).
export interface NavItem { id: string; x: number; y: number; w: number; h: number; frame: string }
export type NavDir = 'left' | 'right' | 'up' | 'down';

export function readingOrder(items: readonly NavItem[], origin: (frame: string) => { x: number; y: number }): string[] {
  const frames = [...new Set(items.map(i => i.frame))].sort((a, b) => {
    const oa = origin(a), ob = origin(b);
    return oa.x !== ob.x ? oa.x - ob.x : oa.y - ob.y;
  });
  const result: string[] = [];
  for (const f of frames) {
    const fi = items.filter(i => i.frame === f).sort((a, b) => a.y !== b.y ? a.y - b.y : a.x !== b.x ? a.x - b.x : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const rows: NavItem[][] = [];
    for (const item of fi) {
      let placed = false;
      for (const row of rows) {
        if (Math.abs(item.y - row[0].y) < 12) { row.push(item); placed = true; break; }
      }
      if (!placed) rows.push([item]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.x !== b.x ? a.x - b.x : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      for (const item of row) result.push(item.id);
    }
  }
  return result;
}

export function nearest(items: readonly NavItem[], from: string, dir: NavDir): string | null {
  const f = items.find(i => i.id === from);
  if (!f) return null;
  const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
  let best: string | null = null, bestScore = Infinity;
  for (const c of items) {
    if (c.id === from) continue;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let valid = false, primary = 0, perp = 0;
    if (dir === 'right' && cx > fcx + 1) { valid = true; primary = cx - fcx; perp = Math.abs(cy - fcy); }
    else if (dir === 'left' && cx < fcx - 1) { valid = true; primary = fcx - cx; perp = Math.abs(cy - fcy); }
    else if (dir === 'down' && cy > fcy + 1) { valid = true; primary = cy - fcy; perp = Math.abs(cx - fcx); }
    else if (dir === 'up' && cy < fcy - 1) { valid = true; primary = fcy - cy; perp = Math.abs(cx - fcx); }
    if (!valid) continue;
    const score = primary + 2 * perp;
    if (score < bestScore || (score === bestScore && best !== null && c.id < best)) { bestScore = score; best = c.id; }
  }
  return best;
}

export function rovingStop(ids: readonly string[], current: string | null): string | null {
  if (current !== null && ids.includes(current)) return current;
  return ids.length > 0 ? ids[0] : null;
}
