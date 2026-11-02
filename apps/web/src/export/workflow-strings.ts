import data from './workflow-strings.json' with { type: 'json' };
import type { Lang } from '../i18n/t.ts';
export type WorkflowExportKey = keyof typeof data.en;
export function wt(lang: Lang, key: WorkflowExportKey, vars: Record<string, string | number> = {}): string {
  return data[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match));
}
