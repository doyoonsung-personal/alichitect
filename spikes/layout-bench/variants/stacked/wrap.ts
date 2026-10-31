// Two-line title wrapping for the stacked variant's cards, measured with the bench's Inter advance table. Greedy word
// wrap (CSS white-space: normal, overflow-wrap: anywhere): break at spaces and after '/', '-' and CJK characters; a
// word wider than the line breaks between characters. Pure.
import { textWidth } from '../../src/text.ts';
import type { AdvanceTable, StyleKey } from '../../src/text.ts';

const CJK = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯＀-￯]/;

/** Splits text into break units: a unit ends after a space, '/', '-' or a CJK character. */
function units(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (ch === ' ' || ch === '/' || ch === '-' || CJK.test(ch)) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** The lines a text wraps into at width `room` (px), font size `px`. */
export function wrapLines(table: AdvanceTable, style: StyleKey, text: string, px: number, room: number): string[] {
  const w = (s: string): number => textWidth(table, style, s.trimEnd(), px);
  const lines: string[] = [];
  let line = '';
  for (const u of units(text.trim())) {
    if (w(line + u) <= room + 0.01) {
      line += u;
      continue;
    }
    if (line) {
      lines.push(line.trimEnd());
      line = '';
    }
    if (w(u) <= room + 0.01) {
      line = u;
      continue;
    }
    // a unit wider than the line: break between characters
    for (const ch of u) {
      if (w(line + ch) <= room + 0.01 || !line) line += ch;
      else {
        lines.push(line.trimEnd());
        line = ch;
      }
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [''];
}

/** Whether the text fits in `maxLines` lines without breaking inside a word (CJK breaks anywhere). */
export function fitsLines(table: AdvanceTable, style: StyleKey, text: string, px: number, room: number, maxLines: number): boolean {
  const lines = wrapLines(table, style, text, px, room);
  if (lines.length > maxLines) return false;
  // a line that had to break inside a Latin word counts as a miss
  return units(text.trim()).every((u) => CJK.test(u) || textWidth(table, style, u.trimEnd(), px) <= room + 0.01);
}
