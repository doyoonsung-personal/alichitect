// <title>-architecture-proposal-<yyyy-mm-dd>.pdf, safe on Windows, macOS and Linux (pure).
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
// control characters, and the characters Windows forbids in a file name: < > : " / \ | ? *
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g;

/** The title as a file-name stem: no path or reserved characters, words joined by "-", at most `max` characters (80). */
export function fileStem(title: string, max = 80): string {
  const cleaned = title
    .normalize('NFC')
    .replace(FORBIDDEN, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  const chars = Array.from(cleaned);
  let cut = cleaned;
  if (chars.length > max) {
    cut = chars.slice(0, max).join('');
    // end on a whole word when there is one in the last third
    const dash = cut.lastIndexOf('-');
    if (dash > max * 0.6 && chars[max] !== undefined && chars[max] !== '-') cut = cut.slice(0, dash);
    cut = cut.replace(/[-.]+$/, '');
  }
  if (!cut || RESERVED.test(cut)) return 'architecture';
  return cut;
}

export function proposalFileName(title: string, isoDate: string): string {
  return `${fileStem(title)}-architecture-proposal-${isoDate}.pdf`;
}
