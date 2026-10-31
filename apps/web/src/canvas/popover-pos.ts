// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed by Claude.
export interface Box { x: number; y: number; w: number; h: number }
export type Side = 'right' | 'left' | 'below' | 'above';
export interface Placement { x: number; y: number; side: Side }

export function placePopover(
  anchor: Box,
  pop: { w: number; h: number },
  bounds: Box,
  gap: number = 10,
  margin: number = 8
): Placement {
  const minX = bounds.x + margin;
  const maxX = bounds.x + bounds.w - margin - pop.w;
  const minY = bounds.y + margin;
  const maxY = bounds.y + bounds.h - margin - pop.h;

  const clampX = (v: number): number => Math.max(minX, Math.min(maxX, v));
  const clampY = (v: number): number => Math.max(minY, Math.min(maxY, v));

  const fitsX = (x: number): boolean => x >= minX && x <= maxX;
  const fitsY = (y: number): boolean => y >= minY && y <= maxY;

  const rightX = anchor.x + anchor.w + gap;
  const leftX = anchor.x - pop.w - gap;
  const belowY = anchor.y + anchor.h + gap;
  const aboveY = anchor.y - pop.h - gap;

  const centerY = anchor.y + anchor.h / 2 - pop.h / 2;
  const centerX = anchor.x + anchor.w / 2 - pop.w / 2;

  if (fitsX(rightX) && fitsY(clampY(centerY))) return { x: rightX, y: clampY(centerY), side: 'right' };
  if (fitsX(leftX) && fitsY(clampY(centerY))) return { x: leftX, y: clampY(centerY), side: 'left' };
  if (fitsY(belowY) && fitsX(clampX(centerX))) return { x: clampX(centerX), y: belowY, side: 'below' };
  if (fitsY(aboveY) && fitsX(clampX(centerX))) return { x: clampX(centerX), y: aboveY, side: 'above' };

  const spaceRight = bounds.x + bounds.w - (anchor.x + anchor.w);
  const spaceLeft = anchor.x - bounds.x;
  const spaceBelow = bounds.y + bounds.h - (anchor.y + anchor.h);
  const spaceAbove = anchor.y - bounds.y;

  const spaces: [number, Side][] = [
    [spaceRight, 'right'],
    [spaceLeft, 'left'],
    [spaceBelow, 'below'],
    [spaceAbove, 'above']
  ];

  let bestSide: Side = 'right';
  let bestSpace = -Infinity;
  for (const [space, side] of spaces) {
    if (space > bestSpace) {
      bestSpace = space;
      bestSide = side;
    }
  }

  let x: number;
  let y: number;

  if (bestSide === 'right') { x = rightX; y = clampY(centerY); }
  else if (bestSide === 'left') { x = leftX; y = clampY(centerY); }
  else if (bestSide === 'below') { x = clampX(centerX); y = belowY; }
  else { x = clampX(centerX); y = aboveY; }

  x = clampX(x);
  y = clampY(y);

  return { x, y, side: bestSide };
}

export function overlaps(a: Box, b: Box): boolean {
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return overlapX > 0.5 && overlapY > 0.5;
}
