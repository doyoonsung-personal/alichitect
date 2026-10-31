// The page language: an explicit choice (?lang=, then the ab_lang cookie) or the browser's Accept-Language, English
// otherwise. The pages' script mirrors the choice into localStorage 'ab.lang', the key the SPA reads, so the builder
// opens in the same language.
import { EN, KO, ZH } from './strings.ts';
import { parseCookies } from '../http.ts';

export type Lang = 'en' | 'ko' | 'zh';
export const LANGS: readonly Lang[] = ['en', 'ko', 'zh'];
export const LANG_COOKIE = 'ab_lang';
export const LANG_NAMES: Record<Lang, string> = { en: 'EN', ko: '한국어', zh: '中文' };

export type StringKey = keyof typeof EN;
const TABLES: Record<Lang, Record<StringKey, string>> = { en: EN, ko: KO, zh: ZH };

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'ko' || v === 'zh';

export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  const tpl = TABLES[lang][key] ?? EN[key] ?? key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (m, name: string) => (Object.hasOwn(vars, name) ? String(vars[name]) : m));
}

/** The first of en, ko or zh in an Accept-Language header, by q-value. */
export function langFromAcceptLanguage(header: string | null): Lang | null {
  if (!header) return null;
  const items = header
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = params.map((p) => /^\s*q=([0-9.]+)\s*$/.exec(p)).find(Boolean);
      return { tag, q: q ? Number(q[1]) : 1, i };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of items) {
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
}

/** The language for a page, and whether the user chose it (?lang= or the cookie) rather than the browser. */
export function langOfRequest(request: Request, url: URL): { lang: Lang; chosen: Lang | null } {
  const q = url.searchParams.get('lang');
  if (isLang(q)) return { lang: q, chosen: q };
  const c = parseCookies(request.headers.get('Cookie')).get(LANG_COOKIE);
  if (isLang(c)) return { lang: c, chosen: c };
  return { lang: langFromAcceptLanguage(request.headers.get('Accept-Language')) ?? 'en', chosen: null };
}
