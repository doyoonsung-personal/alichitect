// The PDF's fonts. Noto Sans KR and Noto Sans SC (SIL OFL 1.1, from the @fontsource npm packages) ship as unicode-range
// slices: a Latin slice, a Latin-extended slice and one or two hundred CJK slices. A proposal uses a few hundred
// distinct characters at most, so only the slices that hold them are fetched, and pdfkit then embeds just the glyphs
// that were drawn (it subsets every TrueType face it embeds). Nothing here runs until an export is asked for.
//
// How it works: the document is built twice. The first pass runs with no faces loaded; every width and run request is
// recorded as (code point, weight) and answered with an estimate. `load()` fetches the slices those need, and the
// second pass measures and draws with the real faces. A character that no slice covers is replaced by a stand-in
// (an arrow by "->", anything else by "?") so that the PDF never shows an empty box.
import { create } from 'fontkit';
import type { Font } from 'fontkit';
import { woffToSfnt } from './woff.ts';

export type Family = 'kr' | 'sc';
export type Weight = 400 | 500 | 700;

/** Where the bytes come from: node_modules in Node (tests, the sample script), Vite's asset URLs in the browser. */
export interface FontSource {
  /** The family's regular-weight @font-face CSS: each slice's file name and unicode-range. */
  css(family: Family): Promise<string>;
  /** One slice as a woff file (zlib): pdfkit subsets a woff2-decoded face into unreadable glyphs. `slice` is 'latin', 'latin-ext' or a slice number such as '17'. */
  file(family: Family, slice: string, weight: Weight): Promise<Uint8Array>;
}

interface Slice {
  family: Family;
  id: string;
  ranges: ReadonlyArray<readonly [number, number]>;
}

/** The pdfkit font name of a loaded face. */
export type FaceName = string;

export interface Run {
  text: string;
  /** The face to draw it with; '' while the faces are not loaded yet (the first pass). */
  face: FaceName;
  /** Advance width at 1 px. */
  width: number;
}

const isLatinId = (id: string): boolean => id === 'latin' || id === 'latin-ext';
/** Latin slices come in 400, 500 and 700; the CJK slices in 400 and 700 only (a medium CJK glyph is drawn regular). */
const cjkWeight = (w: Weight): 400 | 700 => (w >= 600 ? 700 : 400);

/** Parses the @font-face blocks of a @fontsource CSS file. */
export function parseSlices(css: string, family: Family): Slice[] {
  const out: Slice[] = [];
  const re = /@font-face\s*\{([^}]*)\}/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const body = m[1];
    const file = /files\/noto-sans-(?:kr|sc)-(.+?)-\d+-normal\.woff2/.exec(body);
    const range = /unicode-range:\s*([^;]+);/.exec(body);
    if (!file || !range) continue;
    const ranges: Array<readonly [number, number]> = [];
    for (const part of range[1].split(',')) {
      const r = /U\+([0-9a-f]+)(?:-([0-9a-f]+))?/i.exec(part.trim());
      if (!r) continue;
      const lo = parseInt(r[1], 16);
      ranges.push([lo, r[2] ? parseInt(r[2], 16) : lo]);
    }
    out.push({ family, id: file[1], ranges });
  }
  return out;
}

const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

/** Stand-ins for characters no slice covers. */
const SUBSTITUTES: Readonly<Record<string, string>> = { '→': '->', '←': '<-', '↔': '<->', '✓': 'v', '✗': 'x', '•': '·' };

export interface FontSet {
  /** Splits text into runs of one face each, with measured widths. Records what it needs when faces are missing. */
  runs(text: string, weight: Weight): Run[];
  /** Width of `text` at `px`. */
  width(text: string, px: number, weight: Weight): number;
  /** The text with uncovered characters replaced, so measuring and drawing agree. */
  clean(text: string): string;
  /** True when the last pass asked for characters whose faces are not loaded. */
  readonly missing: boolean;
  /** Fetches and parses every slice the recorded requests need. Safe to call repeatedly. */
  load(): Promise<void>;
  /** Registers every loaded face with a pdfkit document. */
  register(doc: { registerFont(name: string, src: Font): unknown }): void;
  /** Font metrics at 1 px: ascent and descent (positive) and cap height, from the primary Latin face. */
  metrics(): { ascent: number; descent: number; cap: number };
  /** Counts for the report: faces loaded and bytes fetched. */
  stats(): { faces: number; bytes: number };
}

export function createFontSet(source: FontSource): FontSet {
  const slices: Record<Family, Slice[] | undefined> = { kr: undefined, sc: undefined };
  const cssLoads: Partial<Record<Family, Promise<void>>> = {};
  const faces = new Map<FaceName, Font>();
  const pending = new Map<FaceName, { family: Family; id: string; weight: Weight }>();
  let order: Family[] = ['kr', 'sc'];
  let bytes = 0;
  let missing = false;
  const widthCache = new Map<string, number>();
  const sliceCache = new Map<string, Slice | null>();

  const name = (family: Family, id: string, w: Weight): FaceName => `${family}${id.replace(/\W/g, '')}w${isLatinId(id) ? w : cjkWeight(w)}`;

  const ensureCss = (family: Family): Promise<void> =>
    (cssLoads[family] ??= source.css(family).then((css) => {
      slices[family] = parseSlices(css, family);
    }));

  function sliceOf(cp: number): Slice | null {
    const key = `${order.join('')}:${cp}`;
    const hit = sliceCache.get(key);
    if (hit !== undefined) return hit;
    let found: Slice | null = null;
    outer: for (const fam of order) {
      const list = slices[fam];
      if (!list) continue;
      // Latin before the numbered slices so that "a" never lands in a CJK slice that happens to repeat it
      for (const pass of [true, false]) {
        for (const s of list) {
          if (isLatinId(s.id) !== pass) continue;
          if (s.ranges.some(([lo, hi]) => cp >= lo && cp <= hi)) {
            found = s;
            break outer;
          }
        }
      }
    }
    sliceCache.set(key, found);
    return found;
  }

  const need = (family: Family, id: string, weight: Weight): void => {
    const n = name(family, id, weight);
    if (!faces.has(n) && !pending.has(n)) pending.set(n, { family, id, weight: isLatinId(id) ? weight : cjkWeight(weight) });
  };

  function clean(text: string): string {
    let out = '';
    for (const ch of text.replace(/[\t\r\n]+/g, ' ').replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/g, '')) {
      const cp = ch.codePointAt(0)!;
      if (!slices.kr && !slices.sc) {
        out += ch;
        continue;
      }
      if (sliceOf(cp)) out += ch;
      else out += SUBSTITUTES[ch] ?? '?';
    }
    return out;
  }

  const estimate = (text: string): number => {
    let w = 0;
    for (const ch of text) w += /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : ch === ' ' ? 0.27 : 0.56;
    return w;
  };

  function runs(text: string, weight: Weight): Run[] {
    const t = clean(text);
    const out: Run[] = [];
    let cur: { face: FaceName; text: string } | null = null;
    const flush = (): void => {
      if (!cur) return;
      out.push({ text: cur.text, face: cur.face, width: cur.face ? faceWidth(cur.face, cur.text) : estimate(cur.text) });
      cur = null;
    };
    for (const ch of t) {
      const s = sliceOf(ch.codePointAt(0)!);
      let face: FaceName = '';
      if (s) {
        const n = name(s.family, s.id, weight);
        if (faces.has(n)) face = n;
        else {
          need(s.family, s.id, weight);
          missing = true;
        }
      } else {
        // slices are not parsed yet (the first pass): remember the character through its likely slice later
        missing = true;
      }
      if (cur && cur.face === face) cur.text += ch;
      else {
        flush();
        cur = { face, text: ch };
      }
    }
    flush();
    return out;
  }

  function faceWidth(face: FaceName, text: string): number {
    const key = `${face}|${text}`;
    const hit = widthCache.get(key);
    if (hit !== undefined) return hit;
    const f = faces.get(face)!;
    const w = f.layout(text).advanceWidth / f.unitsPerEm;
    if (widthCache.size > 20000) widthCache.clear();
    widthCache.set(key, w);
    return w;
  }

  // The first pass has no slice tables yet. Requests are kept as raw code points and resolved in load().
  const wanted = new Map<string, { cp: number; weight: Weight }>();
  const note = (text: string, weight: Weight): void => {
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      wanted.set(`${cp}|${weight}`, { cp, weight });
    }
  };

  return {
    runs(text, weight) {
      note(text.replace(/[\t\r\n]+/g, ' '), weight);
      return runs(text, weight);
    },
    width(text, px, weight) {
      let w = 0;
      for (const r of this.runs(text, weight)) w += r.width;
      return w * px;
    },
    clean,
    get missing() {
      return missing;
    },
    async load() {
      const all = [...wanted.values()];
      // the script decides the order of the families: any Hangul puts Korean first, otherwise Chinese leads for Han text
      const text = all.map((w) => String.fromCodePoint(w.cp)).join('');
      const han = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/.test(text);
      const next: Family[] = HANGUL.test(text) ? ['kr', 'sc'] : han ? ['sc', 'kr'] : ['kr', 'sc'];
      if (next.join() !== order.join()) {
        order = next;
        sliceCache.clear();
      }
      await ensureCss(order[0]);
      // the second family is read only when the first cannot cover everything
      if (all.some((w) => !sliceOf(w.cp))) await ensureCss(order[1]);
      sliceCache.clear();
      for (const w of all) {
        const s = sliceOf(w.cp);
        if (s) need(s.family, s.id, w.weight);
        else {
          // a character no slice covers is drawn as its stand-in: load the stand-in's face in this round too
          for (const ch of SUBSTITUTES[String.fromCodePoint(w.cp)] ?? '?') {
            const t = sliceOf(ch.codePointAt(0)!);
            if (t) need(t.family, t.id, w.weight);
          }
        }
      }
      const jobs = [...pending.entries()];
      pending.clear();
      const files = await Promise.all(jobs.map(([, j]) => source.file(j.family, j.id, j.weight)));
      const sfnts = await Promise.all(files.map((f) => woffToSfnt(f)));
      jobs.forEach(([n], i) => {
        bytes += files[i].byteLength;
        faces.set(n, create(sfnts[i]));
      });
      missing = false;
      widthCache.clear();
    },
    register(doc) {
      for (const [n, f] of faces) doc.registerFont(n, f);
    },
    metrics() {
      const f = [...faces.entries()].find(([n]) => n.includes('latin') && n.endsWith('w400'))?.[1] ?? [...faces.values()][0];
      if (!f) return { ascent: 1.16, descent: 0.288, cap: 0.733 };
      return { ascent: f.ascent / f.unitsPerEm, descent: Math.abs(f.descent) / f.unitsPerEm, cap: f.capHeight / f.unitsPerEm };
    },
    stats() {
      return { faces: faces.size, bytes };
    },
  };
}
