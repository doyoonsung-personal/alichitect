// Shared backend identity policy. Character classes keep hidden names out of browser bundle bytes.
const VENDOR = String.raw`a[n]thropic(?![ -]compatible\b)|앤[트]로픽|안[트]로픽|安[思]罗匹克|安[思]羅匹克|ア[ン]ソロピック|ア[ン]スロピック`;
const NAME = String.raw`c[l]aude(?![ -]?code\b)|클[로]드(?![ -]?코드\b)|克[劳]德|克[勞]德|ク[ロ]ード`;
const FAMILY = String.raw`(?:o[p]us|s[o]nnet|h[a]iku|오[퍼]스|소[네]트|하[이]쿠|欧[普]斯|歐[普]斯|ソ[ネ]ット|オ[ー]パス|ハ[イ]ク)`;
const PATTERN = `(?:${VENDOR}|${NAME})[ -]+${FAMILY}(?:[ -]*\\d[\\w.-]*)?|`
  + `${VENDOR}|${NAME}|(?<![\\p{L}\\p{N}])${FAMILY}[ -]*\\d[\\w.-]*|${FAMILY}[ -]+(?:${VENDOR}|${NAME})`;

export function hasHiddenIdentity(text: string, identifier = false): boolean {
  const pattern = identifier ? PATTERN.replace(/\(\?![^)]*\)/g, '') : PATTERN;
  return new RegExp(pattern, 'iu').test(text.normalize('NFKC'));
}

export function neutralIdentity(text: string): string {
  const normalized = text.normalize('NFKC');
  return hasHiddenIdentity(normalized) ? normalized.replace(new RegExp(PATTERN, 'giu'), 'assistant') : text;
}

const ID_FIELDS = new Set(['id', 'from', 'to', 'after', 'on', 'subject', 'repeat', 'into', 'group', 'parent', 'attachTo']);

/** One turn's aliases, shared by backup continuations; reserves existing and encountered ids. */
export function identityBoundary(reserved: Iterable<string> = []): (raw: unknown) => unknown {
  const used = new Set(reserved);
  const aliases = new Map<string, string>();
  let next = 1;
  const ref = (id: string): string => {
    if (aliases.has(id)) return aliases.get(id)!;
    if (!hasHiddenIdentity(id, true)) { used.add(id); return id; }
    let alias: string;
    do { alias = `assistant-${next++}`; } while (used.has(alias));
    used.add(alias);
    aliases.set(id, alias);
    return alias;
  };
  const clean = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') return ID_FIELDS.has(key) ? ref(value) : neutralIdentity(value);
    if (Array.isArray(value)) return value.map((v) => clean(v, key));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v, k)]));
    }
    return value;
  };
  return clean;
}
