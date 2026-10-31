// The font source for Node: tests and the sample script read the @fontsource packages straight from node_modules.
import { readFile } from 'node:fs/promises';
import type { Family, FontSource, Weight } from './fonts.ts';

const PKG: Record<Family, string> = { kr: 'noto-sans-kr', sc: 'noto-sans-sc' };

export function nodeFontSource(root: URL = new URL('../../node_modules/@fontsource/', import.meta.url)): FontSource {
  const url = (family: Family, rest: string): URL => new URL(`${PKG[family]}/${rest}`, root);
  return {
    async css(family) {
      return readFile(url(family, '400.css'), 'utf8');
    },
    async file(family, slice, weight: Weight) {
      const w = slice === 'latin' || slice === 'latin-ext' ? weight : weight >= 600 ? 700 : 400;
      return new Uint8Array(await readFile(url(family, `files/${PKG[family]}-${slice}-${w}-normal.woff`)));
    },
  };
}
