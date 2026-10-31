// Two-line card titles, estimated with the bench's Inter advance table: the rule the topdown canvas would use instead
// of a one-line ellipsis. Break opportunities are spaces, after a hyphen or slash, and between CJK characters; a word
// longer than a line breaks anywhere. Pure.
import { textWidth } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';

const CJK = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯＀-￯]/;

/** Indices (in code points) where a line may end: after a space, hyphen or slash, or after a CJK character. */
function breaks(chars: string[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < chars.length; i++) {
    const a = chars[i - 1];
    const b = chars[i];
    if (b === ' ' || a === '-' || a === '/' || CJK.test(a) || CJK.test(b)) out.push(i);
  }
  return out;
}

/** The title on at most two lines; the second line is cut with an ellipsis only if it still does not fit. */
export function wrapTitle(t: AdvanceTable, text: string, px: number, room: number): { lines: string[]; cut: boolean } {
  const fits = (s: string): boolean => textWidth(t, 'title', s, px) <= room + 0.01;
  const s = text.trim();
  if (fits(s)) return { lines: [s], cut: false };
  const chars = [...s];
  let at = 0;
  for (const b of breaks(chars)) if (fits(chars.slice(0, b).join('').trimEnd())) at = b;
  if (at === 0) {
    // no break fits: the first word alone is too long, so break it at the last character that fits
    let k = 1;
    while (k < chars.length && fits(chars.slice(0, k + 1).join(''))) k++;
    at = k;
  }
  const l1 = chars.slice(0, at).join('').trimEnd();
  const rest = chars.slice(at).join('').trimStart();
  if (fits(rest)) return { lines: [l1, rest], cut: false };
  const r = [...rest];
  let lo = 0;
  let hi = r.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(r.slice(0, mid).join('') + '…')) lo = mid;
    else hi = mid - 1;
  }
  return { lines: [l1, r.slice(0, lo).join('').trimEnd() + '…'], cut: true };
}

export const twoLineFit = (t: AdvanceTable, text: string, px: number, room: number): boolean => !wrapTitle(t, text, px, room).cut;
