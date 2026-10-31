// Typed UI strings with {placeholders} and plural forms (key.one / key.other). English is the source: a key missing
// in ko or zh falls back to English, never to the raw key. Server fatal and status copy arrives localized in the
// stream (apps/server/src/messages.ts) and is not repeated here.
import raw from './strings.json' with { type: 'json' };

export type Lang = 'en' | 'ko' | 'zh';
export const LANGS: readonly Lang[] = ['en', 'ko', 'zh'];

type Table = Record<string, string>;
const tables: Record<Lang, Table> = { en: raw.en as Table, ko: raw.ko as Table, zh: raw.zh as Table };

type EnKey = keyof typeof raw.en;
type StripPlural<K extends string> = K extends `${infer B}.one` ? B : K extends `${infer B}.other` ? B : K;
/** Every string key, with the .one/.other plural pair collapsed to its base key. */
export type StringKey = StripPlural<EnKey>;
export type Vars = Record<string, string | number>;
export type TFn = (key: StringKey, vars?: Vars) => string;

const rules = new Map<Lang, Intl.PluralRules>();
function pluralRule(lang: Lang): Intl.PluralRules {
  let r = rules.get(lang);
  if (!r) {
    r = new Intl.PluralRules(lang);
    rules.set(lang, r);
  }
  return r;
}

function fill(template: string, vars: Vars | undefined): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (Object.hasOwn(vars, name) ? String(vars[name]) : m));
}

function lookup(lang: Lang, key: string): string | undefined {
  const own = tables[lang];
  if (Object.hasOwn(own, key)) return own[key];
  return undefined;
}

/**
 * Looks up `key` for `lang`. A key with plural forms is chosen by vars.n (Intl.PluralRules: ko and zh use "other").
 * Unknown placeholders stay as written, so a missing variable is visible in review rather than silently blank.
 */
export function t(lang: Lang, key: StringKey, vars?: Vars): string {
  const k: string = key;
  let tpl = lookup(lang, k);
  if (tpl === undefined) {
    const n = vars && typeof vars.n === 'number' ? vars.n : undefined;
    if (n !== undefined) {
      const form = pluralRule(lang).select(n) === 'one' ? 'one' : 'other';
      tpl = lookup(lang, `${k}.${form}`) ?? lookup(lang, `${k}.other`);
      if (tpl === undefined && lang !== 'en') {
        const enForm = pluralRule('en').select(n) === 'one' ? 'one' : 'other';
        tpl = lookup('en', `${k}.${enForm}`);
      }
    }
  }
  if (tpl === undefined && lang !== 'en') tpl = lookup('en', k);
  if (tpl === undefined) tpl = lookup('en', `${k}.other`);
  return fill(tpl ?? k, vars);
}

export function makeT(lang: Lang): TFn {
  return (key, vars) => t(lang, key, vars);
}

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'ko' || v === 'zh';
}

/** The UI language from a navigator.language-style tag; English when unknown. */
export function langFromTag(tag: string | undefined | null): Lang {
  const s = (tag ?? '').toLowerCase();
  if (s.startsWith('ko')) return 'ko';
  if (s.startsWith('zh')) return 'zh';
  return 'en';
}

/** All string keys of a language table, for tests that compare the three languages. */
export function keysOf(lang: Lang): string[] {
  return Object.keys(tables[lang]);
}
