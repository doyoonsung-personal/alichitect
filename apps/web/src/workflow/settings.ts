// Validated, immutable updates. Reset removes an override instead of freezing a default.
import type { Effect, WorkflowSettings, WorkflowEstimateSettings, WorkflowGraph } from '@ali/core/types.ts';
import type { StringKey } from '../i18n/t.ts';
export function approvalOverride(current: WorkflowSettings, effect: Effect, choice: 'default' | 'require' | 'waive'): WorkflowSettings {
  const next = { ...current, approvalOn: (current.approvalOn ?? []).filter((e) => e !== effect),
    approvalOff: (current.approvalOff ?? []).filter((e) => e !== effect) };
  if (choice === 'require') next.approvalOn.push(effect);
  if (choice === 'waive') next.approvalOff.push(effect);
  return next;
}
export type EstimateEdit =
  | { map: 'runsPerMonth'; value?: number }
  | { map: 'scope'; value?: 'international' | 'global' }
  | { map: 'shares' | 'guardTypes'; id: string; value?: number }
  | { map: 'steps'; id: string; field: 'inTokens' | 'outTokens' | 'thinking' | 'offline'; value?: number | boolean }
  | { map: 'items' | 'loops'; id: string; field: 'typical' | 'upper'; value?: number }
  | { map: 'agents'; id: string; field: 'typical' | 'upper' | 'resultTokens' | 'searchesPerRequest'; value?: number };
export function applyEstimateEdit(current: WorkflowEstimateSettings, edit: EstimateEdit, workflow: WorkflowGraph):
  { ok: true; value: WorkflowEstimateSettings } | { ok: false; key: StringKey } {
  const invalid = { ok: false as const, key: 'workflow.cost.invalid' as const };
  const v = edit.value;
  if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) return invalid;
  if (typeof v === 'number' && edit.map !== 'shares' && !Number.isInteger(v)) return invalid;
  if (edit.map === 'shares' && typeof v === 'number' && v > 1) return invalid;
  if ('id' in edit) {
    if (edit.map === 'items' && !workflow.groups[edit.id]) return invalid;
    if (['steps', 'agents', 'guardTypes'].includes(edit.map) && !workflow.nodes[edit.id]) return invalid;
    if (['loops', 'shares'].includes(edit.map) && !workflow.edges[edit.id]) return invalid;
    if (edit.map === 'agents' && workflow.nodes[edit.id].kind !== 'agent') return invalid;
    if (edit.map === 'guardTypes' && workflow.nodes[edit.id].kind !== 'guard') return invalid;
    if (edit.map === 'shares' && workflow.edges[edit.id].kind !== 'branch') return invalid;
  }
  if (edit.map === 'steps' && v !== undefined) {
    const bool = edit.field === 'thinking' || edit.field === 'offline';
    if (typeof v !== (bool ? 'boolean' : 'number')) return invalid;
  }
  const next = structuredClone(current);
  const target = next as Record<string, unknown>;
  if (!('id' in edit)) {
    if (v === undefined) delete target[edit.map]; else target[edit.map] = v;
  } else {
    const map = { ...(target[edit.map] as Record<string, unknown> ?? {}) };
    if ('field' in edit) {
      const item = { ...(map[edit.id] as Record<string, unknown> ?? {}) };
      if (v === undefined) delete item[edit.field]; else item[edit.field] = v;
      if (Object.keys(item).length) map[edit.id] = item; else delete map[edit.id];
    } else if (v === undefined) delete map[edit.id]; else map[edit.id] = v;
    if (Object.keys(map).length) target[edit.map] = map; else delete target[edit.map];
  }
  if ('id' in edit && ['items', 'loops', 'agents'].includes(edit.map)) {
    const pair = (target[edit.map] as Record<string, { typical?: number; upper?: number }> | undefined)?.[edit.id];
    const max = edit.map === 'agents' ? workflow.nodes[edit.id].turns ?? 10
      : edit.map === 'loops' ? workflow.edges[edit.id].max ?? 3 : Infinity;
    const t = pair?.typical ?? (edit.map === 'items' ? 3 : edit.map === 'agents' ? Math.ceil(max / 2) : Math.min(1, max));
    const u = pair?.upper ?? (edit.map === 'items' ? 10 : max);
    if (t > u || u > max || (edit.map === 'agents' && t < 1)) return invalid;
  }
  if (edit.map === 'shares') {
    const siblings = Object.values(workflow.edges).filter((e) => e.kind === 'branch' && e.from === workflow.edges[edit.id].from);
    const values = siblings.map((e) => next.shares?.[e.id]);
    const sum = values.reduce<number>((a, b) => a + (b ?? 0), 0);
    if (sum > 1 + 1e-9 || (values.every((v) => v !== undefined) && Math.abs(sum - 1) > 1e-9)) {
      return { ok: false, key: 'workflow.cost.invalidShares' };
    }
  }
  return { ok: true, value: next };
}
