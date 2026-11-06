// The BD brief module's own words, in the same shape as export/strings.ts: a module-local
// EN/KO/ZH table kept apart from src/i18n/strings.json so this feature never edits the
// shared table, and removing the feature removes this file with it. English is the source;
// KO/ZH follow the register of the app's existing copy (brief imperative labels, … for work
// in progress). Placeholders are {name} tokens, substituted the same way as export/strings.ts.
import raw from './strings.json' with { type: 'json' };
import type { Lang } from '@ali/bd-brief/types.ts';

export type BdBriefKey = keyof typeof raw.en;
export type BdBriefVars = Record<string, string | number>;
export type BT = (key: BdBriefKey, vars?: BdBriefVars) => string;

const tables: Record<Lang, Record<string, string>> = { en: raw.en, ko: raw.ko, zh: raw.zh };

export function bt(lang: Lang, key: BdBriefKey, vars?: BdBriefVars): string {
  const tpl = tables[lang][key] ?? tables.en[key] ?? key;
  return vars ? tpl.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(vars, k) ? String(vars[k]) : m)) : tpl;
}

export function makeBT(lang: Lang): BT {
  return (key, vars) => bt(lang, key, vars);
}

export function bdbKeys(lang: Lang): string[] {
  return Object.keys(tables[lang]);
}
