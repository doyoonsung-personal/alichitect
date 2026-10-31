Write one erasable-TypeScript file `popover-pos.ts` (no enums, no namespaces, no parameter properties; no imports needed) and a separate test file `popover-pos.test.ts` using `node:test` and `node:assert/strict` that imports `./popover-pos.ts`. Output the two files as two fenced code blocks, the first headed by a line `// popover-pos.ts` and the second by `// popover-pos.test.ts`.

Purpose: place a hover popover beside a product card on a diagram. All numbers are CSS px in one coordinate space (the viewport).

```ts
export interface Box { x: number; y: number; w: number; h: number }
export type Side = 'right' | 'left' | 'below' | 'above';
export interface Placement { x: number; y: number; side: Side }

/**
 * Position a popover of size `pop` beside `anchor` (a card), inside `bounds` (the canvas), never covering the anchor.
 * Try sides in this order: right, left, below, above (the first side where the popover fits entirely inside `bounds` with `margin` px to spare on that axis).
 * - right: x = anchor.x + anchor.w + gap; left: x = anchor.x - pop.w - gap; for these the y is anchor centre minus half the popover height, then clamped so the popover stays inside bounds (with margin).
 * - below: y = anchor.y + anchor.h + gap; above: y = anchor.y - pop.h - gap; for these x is anchor centre minus half the popover width, then clamped inside bounds.
 * If no side fits, use the side with the most free room (largest of: space right of the anchor, space left, space below, space above, measured to the bounds edges), place it there, and clamp both axes into bounds (when the popover is bigger than bounds, align it to bounds.x + margin / bounds.y + margin). Defaults: gap 10, margin 8.
 */
export function placePopover(anchor: Box, pop: { w: number; h: number }, bounds: Box, gap?: number, margin?: number): Placement;

/** True when two boxes overlap by more than 0.5 px on both axes. */
export function overlaps(a: Box, b: Box): boolean;
```

Write the implementation clean and short, then 8 to 10 focused tests: right side fits; falls to left near the right edge; clamps y near the top and bottom; below and above when the canvas is narrow; the result never overlaps the anchor when a side fits (use `overlaps`); the fallback when nothing fits; custom gap and margin.
