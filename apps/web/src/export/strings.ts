// The words the proposal PDF and its dialog print. English is the source; Korean and Chinese were drafted by Qwen
// (qwen3.8-flash) against the app's own strings, so shared terms read the same as in the UI, then checked by hand.
// Kept apart from src/i18n/strings.json so the export track does not edit the shared table.
import raw from './strings.json' with { type: 'json' };
import type { Lang } from '../i18n/t.ts';

export type ExportKey = keyof typeof raw.en;
export type ExportVars = Record<string, string | number>;
export type XT = (key: ExportKey, vars?: ExportVars) => string;

const tables: Record<Lang, Record<string, string>> = { en: raw.en, ko: raw.ko, zh: raw.zh };

export function xt(lang: Lang, key: ExportKey, vars?: ExportVars): string {
  const tpl = tables[lang][key] ?? tables.en[key] ?? key;
  return vars ? tpl.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(vars, k) ? String(vars[k]) : m)) : tpl;
}

export function makeXT(lang: Lang): XT {
  return (key, vars) => xt(lang, key, vars);
}

export function exportKeys(lang: Lang): string[] {
  return Object.keys(tables[lang]);
}
