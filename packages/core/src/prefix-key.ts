/** Stable content key (FNV-1a over UTF-16 code units, plus the length). */
export function prefixKey(prefix: string, text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${prefix}:${h.toString(16)}:${text.length}`;
}
