// Text measurement for the canvas: titles are set on explicit lines (core's fitTitle), so the width has to be the width
// the browser draws. A 2D canvas context measures with the same font stack the CSS uses. Results are cached per font.
import type { Measurer } from './scene.ts';

let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  try {
    ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Rough advance when no canvas is available (Node, a blocked canvas): wide enough to wrap early rather than overflow. */
function guess(text: string, px: number): number {
  let w = 0;
  for (const ch of text) w += /[ᄀ-ᇿ぀-ヿ㐀-䶿一-鿿가-힯＀-￯]/.test(ch) ? px : px * 0.56;
  return w;
}

export function makeMeasurer(family: string): Measurer {
  const cache = new Map<string, number>();
  const run = (weight: number) => (text: string, px: number): number => {
    const key = `${weight}|${px}|${text}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const c = context();
    let w: number;
    if (c) {
      c.font = `${weight} ${px}px ${family}`;
      w = c.measureText(text).width;
    } else w = guess(text, px);
    if (cache.size > 4000) cache.clear();
    cache.set(key, w);
    return w;
  };
  return { title: run(500), body: run(400) };
}
