// Validated, immutable updates. Reset removes an override instead of freezing a default.
import type { Effect, WorkflowSettings, WorkflowGraph } from '@ali/core/types.ts';
import type { VideoEstimateSettings } from '@ali/core/workflow-estimate.ts';
import type { StringKey } from '../i18n/t.ts';
import { ESTIMATE_LIMITS } from '@ali/core/workflow-estimate-limits.ts';
import { workflowChoiceSets } from '@ali/core/workflow-estimate.ts';
import { models } from './models.ts';
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
  | { map: 'steps'; id: string; field: 'inTokens' | 'outTokens' | 'thinking' | 'offline' | 'clipSeconds' | 'resolution'; value?: number | boolean }
  | { map: 'items' | 'loops'; id: string; field: 'typical' | 'upper'; value?: number }
  | { map: 'agents'; id: string; field: 'typical' | 'upper' | 'resultTokens' | 'searchesPerRequest'; value?: number };

export function videoStepOptions(workflow: WorkflowGraph, id: string) {
  const node = workflow.nodes[id], model = node?.ai ? models.model(node.ai) : undefined;
  if (node?.kind === 'human' || node?.task !== 'create' || !model?.out.includes('video')
    || model.price?.unit !== 'second' || !model.video) return undefined;
  return {
    min: model.video.minSeconds ?? 1,
    max: Math.min(ESTIMATE_LIMITS.clipSeconds, model.video.maxSeconds),
    resolutions: ESTIMATE_LIMITS.resolutions.filter((r) => model.price!.tiers.some((tier) => tier.resolution === r)),
  };
}

export function estimateEditRange(edit: EstimateEdit, workflow: WorkflowGraph): { min: number; max: number } {
  const range = { min: 0, max: ESTIMATE_LIMITS.amount as number };
  if (edit.map === 'runsPerMonth') range.max = ESTIMATE_LIMITS.runsPerMonth;
  if (edit.map === 'guardTypes') range.max = ESTIMATE_LIMITS.guardTypes;
  if (edit.map === 'steps') range.max = Math.min(range.max, 1_000_000);
  if (edit.map === 'steps' && edit.field === 'clipSeconds') {
    const video = videoStepOptions(workflow, edit.id);
    return { min: video?.min ?? 1, max: video?.max ?? ESTIMATE_LIMITS.clipSeconds };
  }
  if (edit.map === 'steps' && edit.field === 'resolution') {
    return { min: ESTIMATE_LIMITS.resolutions[0], max: ESTIMATE_LIMITS.resolutions.at(-1)! };
  }
  if (edit.map === 'items') range.max = Math.min(range.max, 10_000);
  if (edit.map === 'shares') return workflowChoiceSets(workflow).shares[edit.id] ?? { min: 0, max: 0 };
  if (edit.map === 'loops') return workflowChoiceSets(workflow).loops[edit.id] ?? { min: 0, max: 0 };
  if (edit.map === 'agents') {
    if (edit.field === 'resultTokens') range.max = Math.min(range.max, 1_000_000);
    else if (edit.field === 'searchesPerRequest') range.max = Math.min(range.max, 100);
    else {
      const turns = workflow.nodes[edit.id]?.turns;
      range.min = 1;
      range.max = Math.max(1, Math.ceil(Math.min(turns !== undefined && Number.isFinite(turns) && turns >= 0 ? turns : 10, 50)));
    }
  }
  return range;
}

export function applyEstimateEdit(current: VideoEstimateSettings, edit: EstimateEdit, workflow: WorkflowGraph):
  { ok: true; value: VideoEstimateSettings } | { ok: false; key: StringKey } {
  const invalid = { ok: false as const, key: 'workflow.cost.invalid' as const };
  const v = edit.value;
  const range = estimateEditRange(edit, workflow), sets = workflowChoiceSets(workflow);
  if (typeof v === 'number' && (!Number.isFinite(v) || v < range.min || v > range.max)) return invalid;
  if (typeof v === 'number' && edit.map !== 'shares' && !Number.isInteger(v)) return invalid;
  if (edit.map === 'shares' && typeof v === 'number' && v > 1) return invalid;
  if ('id' in edit) {
    if (edit.map === 'items' && !workflow.groups[edit.id]) return invalid;
    if (['steps', 'agents', 'guardTypes'].includes(edit.map) && !workflow.nodes[edit.id]) return invalid;
    if (['loops', 'shares'].includes(edit.map) && !workflow.edges[edit.id]) return invalid;
    if (edit.map === 'agents' && workflow.nodes[edit.id].kind !== 'agent') return invalid;
    if (edit.map === 'guardTypes' && workflow.nodes[edit.id].kind !== 'guard') return invalid;
    if (v !== undefined && edit.map === 'shares' && !sets.shares[edit.id]) return invalid;
    if (v !== undefined && edit.map === 'loops' && !sets.loops[edit.id]) return invalid;
  }
  if (edit.map === 'steps' && v !== undefined) {
    const bool = edit.field === 'thinking' || edit.field === 'offline';
    if (typeof v !== (bool ? 'boolean' : 'number')) return invalid;
    if (edit.field === 'clipSeconds' || edit.field === 'resolution') {
      const video = videoStepOptions(workflow, edit.id);
      if (!video || (edit.field === 'resolution' && !video.resolutions.some((r) => r === v))) return invalid;
    }
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
    const max = edit.map === 'agents' ? estimateEditRange({ map: 'agents', id: edit.id, field: 'upper' }, workflow).max
      : edit.map === 'loops' ? sets.loops[edit.id]?.max ?? 3 : 10_000;
    const t = pair?.typical ?? (edit.map === 'items' ? 3 : edit.map === 'agents' ? Math.ceil(max / 2) : Math.min(1, max));
    const u = pair?.upper ?? (edit.map === 'items' ? 10 : max);
    if (t > u || u > max || (edit.map === 'agents' && t < 1)) return invalid;
  }
  if (edit.map === 'shares') {
    const siblings = sets.choices[workflow.edges[edit.id].from] ?? [];
    const values = siblings.map((id) => next.shares?.[id]);
    const sum = values.reduce<number>((a, b) => a + (b ?? 0), 0);
    if (sum > 1 + 1e-9 || (values.length && values.every((v) => v !== undefined) && Math.abs(sum - 1) > 1e-9)) {
      return { ok: false, key: 'workflow.cost.invalidShares' };
    }
  }
  return { ok: true, value: next };
}
