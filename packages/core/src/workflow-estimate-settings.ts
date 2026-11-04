import type { WorkflowGraph } from './types.ts';
import type { VideoEstimateSettings } from './workflow-estimate.ts';
import { ESTIMATE_LIMITS } from './workflow-estimate-limits.ts';
import { ID_PATTERN, normalizeId } from './reducer.ts';

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(path + ': expected an object');
  return value as Record<string, unknown>;
}
const advisory = (value: unknown, max: number, integer = false): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max && (!integer || Number.isInteger(value));

/** Admission and pricing fingerprints must agree after a workflow edit removes a step, loop or branch. */
export function normalizeWorkflowEstimateSettings(value: unknown, workflow?: WorkflowGraph): VideoEstimateSettings {
  const raw = record(value, 'settings');
  const out: VideoEstimateSettings = {};
  if (advisory(raw.runsPerMonth, ESTIMATE_LIMITS.runsPerMonth, true)) out.runsPerMonth = raw.runsPerMonth;
  if (Object.hasOwn(raw, 'scope')) {
    if (raw.scope !== 'international' && raw.scope !== 'global') throw new Error('scope: unknown value');
    out.scope = raw.scope;
  }
  for (const k of ['steps', 'items', 'shares', 'loops', 'agents', 'guardTypes'] as const) {
    if (!Object.hasOwn(raw, k)) continue;
    const map = record(raw[k], k);
    const ids = k === 'items' ? workflow?.groups : k === 'shares' || k === 'loops' ? workflow?.edges : workflow?.nodes;
    const parsed: Record<string, unknown> = {};
    for (const key of Object.keys(map)) {
      if (!ID_PATTERN.test(key) || normalizeId(key) !== key) throw new Error(k + ': invalid workflow id');
      if (!ids || !Object.hasOwn(ids, key)) continue; // The workflow itself is bounded by request admission.
      const entry = map[key];
      if (k === 'shares' || k === 'guardTypes') {
        if (advisory(entry, k === 'shares' ? ESTIMATE_LIMITS.share : ESTIMATE_LIMITS.guardTypes, k === 'guardTypes')) parsed[key] = entry;
        continue;
      }
      const row = record(entry, k + '.' + key);
      const item: Record<string, unknown> = {};
      const fields = k === 'steps' ? ['inTokens', 'outTokens', 'thinking', 'offline', 'clipSeconds', 'resolution']
        : k === 'agents' ? ['typical', 'upper', 'resultTokens', 'searchesPerRequest'] : ['typical', 'upper'];
      for (const field of fields) {
        if (!Object.hasOwn(row, field)) continue;
        const n = row[field];
        if (field === 'resolution') {
          if (ESTIMATE_LIMITS.resolutions.some(r => r === n)) item[field] = n;
        } else if (field === 'thinking' || field === 'offline') {
          if (typeof n !== 'boolean') throw new Error(k + '.' + key + '.' + field + ': expected a boolean');
          item[field] = n;
        } else if (advisory(n, field === 'clipSeconds' ? ESTIMATE_LIMITS.clipSeconds : ESTIMATE_LIMITS.amount)) {
          item[field] = n;
        }
      }
      parsed[key] = item;
    }
    Object.assign(out, { [k]: parsed });
  }
  return out;
}
