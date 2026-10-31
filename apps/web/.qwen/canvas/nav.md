Write one erasable-TypeScript file `nav.ts` (no enums, no namespaces, no parameter properties; relative imports use the .ts extension; no imports needed) and a separate test file `nav.test.ts` using `node:test` and `node:assert/strict` that imports `./nav.ts`. Output the two files as two fenced code blocks, the first headed by a line `// nav.ts` and the second by `// nav.test.ts`.

Purpose: keyboard navigation between the product cards of an architecture diagram (a roving tabindex; one tab stop for the whole diagram).

```ts
export interface NavItem { id: string; x: number; y: number; w: number; h: number; frame: string }
export type NavDir = 'left' | 'right' | 'up' | 'down';

/** Reading order: group items by `frame`, order the frames by their top-left corner (the frame origin returned by `origin`, x first, then y), and inside a frame order the cards by row (y), then x. Returns ids. Cards whose y differs by less than 12 px are one row. Ties are broken by id so the order is deterministic. */
export function readingOrder(items: readonly NavItem[], origin: (frame: string) => { x: number; y: number }): string[];

/** The id of the card to move to when an arrow key is pressed on `from`, or null when no card lies in that direction. Candidate cards must lie strictly beyond `from`'s centre in that direction (for 'right': candidate centre x > from centre x + 1, and so on). Score each candidate by primary distance (along the direction, between centres) plus 2 x the perpendicular offset between centres; pick the lowest score; break ties by id. */
export function nearest(items: readonly NavItem[], from: string, dir: NavDir): string | null;

/** Roving tabindex: returns the id that carries tabindex 0. `current` when it is still in `ids`, else the first id of `ids`, else null. */
export function rovingStop(ids: readonly string[], current: string | null): string | null;
```

Write the implementation clean and short, then 8 to 12 focused tests: reading order across two frames and rows; the 12 px row tolerance; nearest in each of four directions; no candidate returns null; the perpendicular weighting picks the aligned card over a nearer diagonal one; rovingStop cases; tie-breaking by id.
