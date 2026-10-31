// Text for the PDF: line breaking that knows Latin words, Korean words (broken at spaces) and Chinese (broken between
// characters, with the usual rules for punctuation), and drawing that splits each line into one pdfkit text call per font
// face. Drawing is at explicit baselines, so pdfkit never paginates behind our back.
import type PDFDocument from 'pdfkit';
import type { FontSet, Weight } from './fonts.ts';

const CJK = /[\u2e80-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
/** No line starts with one of these. */
const CLOSERS = new Set([...'，。、；：！？）」』】》〉”’…·、．,.;:!?)]}%）']);
/** No line ends with one of these. */
const OPENERS = new Set([...'（「『【《〈“‘([{（']);

/** Splits text into pieces a line may break between. Spaces stay at the end of the piece they follow. */
export function breakTokens(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  const push = (): void => {
    if (cur) out.push(cur);
    cur = '';
  };
  for (const ch of text) {
    if (ch === ' ') {
      // the space stays with the piece before it, also when that piece was a single Han character
      if (!cur && out.length && !out[out.length - 1].endsWith(' ')) out[out.length - 1] += ch;
      else cur += ch;
      push();
    } else if (CJK.test(ch)) {
      if (CLOSERS.has(ch) && (cur || (out.length && !out[out.length - 1].endsWith(' ')))) {
        if (cur) cur += ch;
        else out[out.length - 1] += ch;
        if (cur) push();
        continue;
      }
      // a Latin or Hangul word ends where Han text starts, unless an opening bracket is waiting for its partner
      if (cur && !OPENERS.has(cur[cur.length - 1])) push();
      cur += ch;
      if (!OPENERS.has(ch)) push();
    } else {
      // Latin and Hangul: a word. Breaks are allowed after / and - so that long links and compounds can wrap.
      if (cur && CJK.test(cur[cur.length - 1]) && !OPENERS.has(cur[cur.length - 1])) push();
      cur += ch;
      // break after a slash, and after a hyphen that follows a letter (not in dates and part numbers)
      if (ch === '/' || (ch === '-' && /\p{L}/u.test(cur[cur.length - 2] ?? ''))) push();
    }
  }
  push();
  return out;
}

export interface TextStyle {
  px: number;
  weight: Weight;
  color: string;
}

export interface LinkStyle extends TextStyle {
  underline?: boolean;
}

export interface Paragraph {
  lines: string[];
  lh: number;
  height: number;
}

export class Typesetter {
  readonly doc: PDFDocument;
  readonly fonts: FontSet;
  constructor(doc: PDFDocument, fonts: FontSet) {
    this.doc = doc;
    this.fonts = fonts;
  }

  width(text: string, px: number, weight: Weight): number {
    return this.fonts.width(text, px, weight);
  }

  /** Baseline of a `px` line centred in a box of height `lh` that starts at `top`. */
  baseline(top: number, lh: number, px: number): number {
    const m = this.fonts.metrics();
    return top + (lh - (m.ascent + m.descent) * px) / 2 + m.ascent * px;
  }

  /** The text cut with an ellipsis to fit `room` pt on one line. */
  clip(text: string, room: number, px: number, weight: Weight): string {
    if (this.width(text, px, weight) <= room) return text;
    const chars = Array.from(text);
    while (chars.length > 1 && this.width(chars.join('').trimEnd() + '…', px, weight) > room) chars.pop();
    return chars.join('').trimEnd() + '…';
  }

  /** Greedy wrap of `text` into lines no wider than `maxW` at `px`. A piece wider than a line is split by characters. */
  wrap(text: string, maxW: number, px: number, weight: Weight): string[] {
    const lines: string[] = [];
    for (const para of text.replace(/\r\n?/g, '\n').split('\n')) {
      let line = '';
      let lineW = 0;
      const flush = (): void => {
        lines.push(line.trimEnd());
        line = '';
        lineW = 0;
      };
      for (const tok of breakTokens(para.replace(/[\t ]+/g, ' ').trim())) {
        const core = tok.trimEnd();
        const coreW = this.width(core, px, weight);
        const fullW = core === tok ? coreW : this.width(tok, px, weight);
        if (line && lineW + coreW > maxW + 0.01) flush();
        if (coreW > maxW + 0.01) {
          // a link or a very long word: break it by characters
          let piece = '';
          for (const ch of core) {
            if (piece && this.width(piece + ch, px, weight) > maxW) {
              lines.push(piece);
              piece = '';
            }
            piece += ch;
          }
          line = piece + tok.slice(core.length);
          lineW = this.width(piece, px, weight) + (fullW - coreW);
          continue;
        }
        line += tok;
        lineW += fullW;
      }
      if (line || !lines.length) flush();
    }
    return lines;
  }

  paragraph(text: string, maxW: number, px: number, weight: Weight, lh: number): Paragraph {
    const lines = text.trim() ? this.wrap(text, maxW, px, weight) : [];
    return { lines, lh, height: lines.length * lh };
  }

  /** One line at a baseline. `align` is relative to x. Returns the width drawn. */
  line(x: number, baseline: number, text: string, s: TextStyle, align: 'left' | 'right' | 'center' = 'left'): number {
    const runs = this.fonts.runs(text, s.weight);
    const total = runs.reduce((a, r) => a + r.width, 0) * s.px;
    let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
    for (const r of runs) {
      const body = r.text.trim();
      if (body) {
        const lead = r.text.length - r.text.trimStart().length;
        const dx = lead ? this.fonts.width(r.text.slice(0, lead), s.px, s.weight) : 0;
        this.doc.font(r.face).fontSize(s.px).fillColor(s.color).text(body, cx + dx, baseline, { baseline: 'alphabetic', lineBreak: false });
      }
      cx += r.width * s.px;
    }
    return total;
  }

  /** A paragraph's lines from `top`; returns the bottom. */
  draw(p: Paragraph, x: number, top: number, s: TextStyle): number {
    let y = top;
    for (const l of p.lines) {
      this.line(x, this.baseline(y, p.lh, s.px), l, s);
      y += p.lh;
    }
    return y;
  }

  /** A clickable line: coloured text, a hairline underline and a link annotation over it. */
  link(x: number, baseline: number, text: string, url: string, s: LinkStyle): number {
    const w = this.line(x, baseline, text, s);
    if (s.underline !== false) {
      this.doc.lineWidth(0.5).strokeColor(s.color).moveTo(x, baseline + s.px * 0.16).lineTo(x + w, baseline + s.px * 0.16).stroke();
    }
    this.doc.link(x, baseline - s.px * 0.95, w, s.px * 1.25, url);
    return w;
  }
}
