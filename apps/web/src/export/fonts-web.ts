// The font source for the browser. Vite turns each glob entry into a lazy import: nothing is fetched until a proposal
// is exported, and then only the slices the document's characters live in. The CJK slices are offered at 400 and 700,
// the Latin slices at 400, 500 and 700 (see fonts.ts). Files come from the @fontsource packages (SIL OFL 1.1).
import type { Family, FontSource, Weight } from './fonts.ts';

type Loader = () => Promise<string>;

const css = import.meta.glob('/node_modules/@fontsource/noto-sans-{kr,sc}/400.css', { query: '?raw', import: 'default' }) as Record<string, Loader>;
const latin = import.meta.glob('/node_modules/@fontsource/noto-sans-{kr,sc}/files/noto-sans-{kr,sc}-latin*-{400,500,700}-normal.woff', { query: '?url', import: 'default' }) as Record<string, Loader>;
const cjkKr = import.meta.glob('/node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-[0-9]*-{400,700}-normal.woff', { query: '?url', import: 'default' }) as Record<string, Loader>;
const cjkSc = import.meta.glob('/node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-[0-9]*-{400,700}-normal.woff', { query: '?url', import: 'default' }) as Record<string, Loader>;

const PKG: Record<Family, string> = { kr: 'noto-sans-kr', sc: 'noto-sans-sc' };

function pick(table: Record<string, Loader>, path: string): Loader {
  const hit = table[path];
  if (!hit) throw new Error(`font file not bundled: ${path}`);
  return hit;
}

export function webFontSource(): FontSource {
  return {
    async css(family) {
      return pick(css, `/node_modules/@fontsource/${PKG[family]}/400.css`)();
    },
    async file(family, slice, weight: Weight) {
      const isLatin = slice === 'latin' || slice === 'latin-ext';
      const w = isLatin ? weight : weight >= 600 ? 700 : 400;
      const path = `/node_modules/@fontsource/${PKG[family]}/files/${PKG[family]}-${slice}-${w}-normal.woff`;
      const table = isLatin ? latin : family === 'kr' ? cjkKr : cjkSc;
      const url = await pick(table, path)();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`font ${path}: HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    },
  };
}
