// Panel rows preserve hidden attachments and never infer a runtime from a service.
import type { Catalog, WorkflowEdge, WorkflowGraph, WorkflowNode } from '@ali/core/types.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import type { WorkflowLayoutState } from '@ali/core/workflow-layout.ts';
import type { ModelTable } from '@ali/core/models.ts';
import { workflowChoiceSets } from '@ali/core/workflow-estimate.ts';
import type { VideoEstimateSettings, WorkflowEstimate } from '@ali/core/workflow-estimate.ts';
import { videoStepOptions } from './settings.ts';
import type { EstimateEdit } from './settings.ts';
import type { TFn } from '../i18n/t.ts';

export interface CostDriver {
  label: string; edit: EstimateEdit; value?: number | boolean; options?: readonly number[];
}

export function workflowCostDrivers(workflow: WorkflowGraph, settings: VideoEstimateSettings, estimate: WorkflowEstimate, t: TFn): CostDriver[] {
  const sets = workflowChoiceSets(workflow), drivers: CostDriver[] = [];
  const add = (label: string, edit: EstimateEdit, value?: number | boolean, options?: readonly number[]) => {
    drivers.push({ label, edit, ...(value === undefined ? {} : { value }), ...(options ? { options } : {}) });
  };
  add(t('workflow.cost.runs'), { map: 'runsPerMonth' }, settings.runsPerMonth);
  const ranked = Object.values(workflow.nodes).sort((a, b) => {
    const cost = (id: string) => estimate.lines.filter((l) => l.id.startsWith(id + ':')).reduce((n, l) => n + l.typical, 0);
    return cost(b.id) - cost(a.id);
  });
  for (const n of ranked) {
    const video = videoStepOptions(workflow, n.id);
    if (video) {
      for (const field of ['clipSeconds', 'resolution'] as const) add(
        n.label + ' · ' + t('workflow.cost.' + field as 'workflow.cost.clipSeconds'),
        { map: 'steps', id: n.id, field }, settings.steps?.[n.id]?.[field], field === 'resolution' ? video.resolutions : undefined,
      );
    } else if (n.ai || n.kind === 'ai' || n.kind === 'agent') {
      for (const field of ['inTokens', 'outTokens', 'thinking', 'offline'] as const) add(
        n.label + ' · ' + t('workflow.cost.' + field as 'workflow.cost.inTokens'),
        { map: 'steps', id: n.id, field }, settings.steps?.[n.id]?.[field],
      );
    }
    if (n.kind === 'agent') for (const field of ['typical', 'upper', 'resultTokens', 'searchesPerRequest'] as const) {
      add(n.label + ' · ' + t(field === 'resultTokens' ? 'workflow.cost.resultTokens'
        : field === 'searchesPerRequest' ? 'workflow.cost.searches' : 'workflow.cost.requests') +
        (field === 'typical' || field === 'upper' ? ' · ' + t('workflow.cost.' + field as 'workflow.cost.typical') : ''),
      { map: 'agents', id: n.id, field }, settings.agents?.[n.id]?.[field]);
    }
    if (n.kind === 'guard') add(n.label + ' · ' + t('workflow.cost.guardTypes'),
      { map: 'guardTypes', id: n.id }, settings.guardTypes?.[n.id]);
  }
  for (const g of Object.values(workflow.groups)) for (const field of ['typical', 'upper'] as const) add(
    g.over + ' · ' + t('workflow.cost.items') + ' · ' + t('workflow.cost.' + field as 'workflow.cost.typical'),
    { map: 'items', id: g.id, field }, settings.items?.[g.id]?.[field],
  );
  for (const edge of Object.values(workflow.edges)) {
    if (sets.shares[edge.id]) add(edgeName(edge, workflow, t) + ' · ' + t('workflow.cost.share'),
      { map: 'shares', id: edge.id }, settings.shares?.[edge.id]);
    if (sets.loops[edge.id]) for (const field of ['typical', 'upper'] as const) add(
      edgeName(edge, workflow, t) + ' · ' + t('workflow.cost.loops') + ' · ' + t('workflow.cost.' + field as 'workflow.cost.typical'),
      { map: 'loops', id: edge.id, field }, settings.loops?.[edge.id]?.[field],
    );
  }
  return drivers;
}

// Repeat groups occupy their first member's position; attachments travel with their host.
export function workflowPanelOrder(workflow: WorkflowGraph, layout = layoutWorkflow(workflow)): WorkflowNode[] {
  const cells = layout.workflow.cells;
  const compare = (a: WorkflowNode, b: WorkflowNode): number =>
    (cells[a.id]?.column ?? Infinity) - (cells[b.id]?.column ?? Infinity)
    || (cells[a.id]?.row ?? Infinity) - (cells[b.id]?.row ?? Infinity)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const nodes = Object.values(workflow.nodes).sort(compare), seen = new Set<string>(), ordered: WorkflowNode[] = [];
  const add = (n: WorkflowNode): void => {
    if (seen.has(n.id)) return;
    seen.add(n.id); ordered.push(n);
    for (const child of nodes.filter((child) => child.on === n.id)) add(child);
  };
  for (const n of nodes.filter((n) => !n.on || !workflow.nodes[n.on])) {
    if (n.repeat) for (const member of nodes.filter((m) => !m.on && m.repeat === n.repeat)) add(member);
    else add(n);
  }
  for (const n of nodes) add(n);
  return ordered;
}

export function buildWorkflowPanelModel(input: {
  workflow: WorkflowGraph; catalog: Catalog; models: ModelTable; estimate: WorkflowEstimate; t: TFn; layout?: WorkflowLayoutState;
}) {
  const { workflow, catalog, models, estimate, t } = input;
  const service = (id: string) => catalog.byId.get(id)?.name ?? id;
  const rows = workflowPanelOrder(workflow, input.layout).map((n) => ({
    id: n.id, label: n.label, glyph: n.kind, compact: n.kind === 'trigger' || n.kind === 'end',
    kind: t('workflow.kind.' + n.kind as 'workflow.kind.ai'),
    task: n.task ? t('workflow.task.' + n.task as 'workflow.task.generate') : '',
    model: n.ai ? (models.model(n.ai)?.name ?? n.ai) : '',
    runtime: n.runs === 'customer' ? t('workflow.runtime.customer') : n.runs ? service(n.runs) : '',
    services: n.product ? service(n.product) : '', why: n.why ?? '',
    host: n.on ? workflow.nodes[n.on]?.label ?? n.on : '', repeat: n.repeat ?? '',
  }));
  return { rows, estimate };
}
export type WorkflowPanelModel = ReturnType<typeof buildWorkflowPanelModel>;
export function usd(value: number, lang = 'en'): string {
  if (value === 0) return '$0.00';
  return '$' + new Intl.NumberFormat(lang, value < 1 ? { maximumSignificantDigits: 3 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function monthlyUsd(value: number, lang = 'en'): string {
  return '$' + new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function edgeName(edge: WorkflowEdge, workflow: WorkflowGraph, t: TFn): string {
  const from = workflow.nodes[edge.from]?.label ?? t('workflow.unspecified');
  const to = workflow.nodes[edge.to]?.label ?? t('workflow.unspecified');
  return [edge.label, `${from} → ${to}`, edge.outcome && t('workflow.outcome.' + edge.outcome as 'workflow.outcome.edit')]
    .filter(Boolean).join(' · ');
}

export function assumptionText(a: { key: string; text: string }, workflow: WorkflowGraph, t: TFn): string {
  if (a.key === 'scope:global') return t('workflow.cost.globalNote');
  if (['runsPerMonth', 'scope', 'roots', 'triggers'].includes(a.key)) {
    return t('workflow.assumption.' + a.key as 'workflow.assumption.scope');
  }
  const parts = a.key.split(':'), suffix = parts.at(-1)!;
  const id = parts.find((id) => workflow.nodes[id] || workflow.groups[id] || workflow.edges[id]) ?? parts[0];
  const step = workflow.nodes[id]?.label ?? workflow.groups[id]?.over
    ?? (workflow.edges[id] ? edgeName(workflow.edges[id], workflow, t) : t('workflow.cost.title'));
  const detail = a.text.startsWith(step + ':') ? a.text.slice(step.length + 1) : a.text.slice(a.text.lastIndexOf(':') + 1);
  if (parts[1] === 'video') {
    if (suffix === 'list') return t('workflow.cost.assumption.videoList', { step });
    if (suffix === 'input') return t('workflow.cost.assumption.videoInput', { step });
    const values = /typical (\d+) s at (\d+)P; upper (\d+) s at 1080P/.exec(detail);
    if (values) return t('workflow.cost.assumption.video', { step, seconds: values[1], resolution: values[2], upper: values[3] });
  }
  if (parts[1] === 'clipSeconds') {
    if (suffix === 'bound') {
      const values = /bounded to (\d+)-(\d+) s/.exec(detail);
      if (values) return t('workflow.cost.assumption.clipBound', { step, min: values[1], max: values[2] });
    } else if (suffix === 'clipSeconds') {
      const value = /assumes a (\d+) s/.exec(detail)?.[1];
      if (value) return t('workflow.cost.assumption.clipSeconds', { step, value });
    }
  }
  if (['input', 'output', 'prefix'].includes(suffix)) {
    // Core exposes only text. Strip the complete known label before reading its numeric detail.
    const value = /\d[\d,]*/.exec(detail)?.[0];
    if (value) return t('workflow.assumption.' + suffix as 'workflow.assumption.input', { step, value });
  }
  const known = ['max', 'turns', 'task', 'results', 'thinking-output', 'batch', 'batch-unavailable',
    'searches', 'free', 'guard-types', 'event', 'reference', 'channel', 'fixed', 'thinking', 'offline', 'cache',
    'history', 'calls', 'pages', 'guard-product', 'attachment', 'order'];
  if (known.includes(suffix)) return t('workflow.assumption.' + suffix as 'workflow.assumption.thinking', { step });
  if (parts[0] === 'shares') return t(suffix === 'normalise' ? 'workflow.assumption.normalise' : 'workflow.assumption.shares', { step });
  if (suffix === 'meaning') return t('workflow.assumption.loopMeaning', { step });
  if (suffix === 'typical' || suffix === 'upper') {
    const value = /assumes (\d[\d,]*(?:\.\d+)?)/.exec(a.text)?.[1];
    if (value) return t('workflow.assumption.default', { step, value,
      scenario: t('workflow.cost.' + suffix as 'workflow.cost.typical') });
  }
  if (a.key === 'arithmetic:limit') return t('workflow.cost.arithmeticLimit');
  if (a.key === 'resources') return t('workflow.cost.resourceLimit');
  if (suffix === 'limit') {
    const value = /capped at (\d[\d,]*(?:\.\d+)?)/.exec(a.text)?.[1];
    const fields = { input: 'inTokens', output: 'outTokens', results: 'resultTokens', searches: 'searches',
      'guard-types': 'guardTypes', turns: 'requests', max: 'loops', clipSeconds: 'clipSeconds' } as const;
    const field = fields[parts.at(-2)! as keyof typeof fields];
    const label = parts[0] === 'runsPerMonth' ? t('workflow.cost.runs')
      : field ? step + ' · ' + t('workflow.cost.' + field as 'workflow.cost.inTokens') : step;
    if (value) return t('workflow.cost.limit', { step: label, value });
  }
  return t('workflow.cost.assumptionUnknown');
}

const REASONS = {
  'Human review time is not priced.': 'human',
  'Model is missing from the price table.': 'model',
  'No confirmed model price.': 'price',
  'Image, video and voice quantities are not estimated in this release.': 'modality',
  'Image, voice or unsupported media quantities are not estimated in this release.': 'modality',
  'No firm rate for the request tier or token direction.': 'tier',
  'No confirmed tool fee.': 'tool',
  'Compute quantity requires a measured duration and resource size.': 'compute',
  'Storage quantity and firm International capacity rates required.': 'storage',
  'Document count, size and re-indexing frequency are unknown; only query usage is priced.': 'indexing',
} as const;
export function unpricedReason(reason: string, t: TFn): string {
  const resolution = /^No confirmed video rate for (\d+)P typical and 1080P upper\.$/.exec(reason)?.[1];
  if (resolution) return t('workflow.cost.reason.videoResolution', { resolution });
  const key = REASONS[reason as keyof typeof REASONS];
  return key ? t('workflow.cost.reason.' + key as 'workflow.cost.reason.human') : t('workflow.cost.reason.unknown');
}

const UNITS = {
  mtok: 'tokens', call: 'call', page: 'page', message: 'message', event: 'event', transition: 'transition',
  'detection call': 'detection', 'control-plane hour': 'control', 'instance-month': 'instance',
  'CU-second': 'cuSecond', 'compute CU': 'computeCu', 'compute second': 'computeSecond',
  'GB-month / capacity': 'capacity', 'document tokens': 'document', 'reviewer hour': 'reviewer',
  'model usage': 'model', '10k-chars': 'characters', image: 'image', second: 'videoSecond',
} as const;

export function unitText(unit: string, t: TFn): string {
  const key = UNITS[unit as keyof typeof UNITS];
  return key ? t('workflow.cost.unitName.' + key as 'workflow.cost.unitName.tokens') : t('workflow.cost.unitName.unknown');
}

export function costLineLabel(line: { id: string; label: string }, workflow: WorkflowGraph, t: TFn): string {
  if (!line.id.endsWith(':indexing')) return line.label;
  const node = workflow.nodes[line.id.slice(0, -':indexing'.length)];
  return t('workflow.cost.labelValue', { label: node?.label ?? t('workflow.unspecified'), value: t('workflow.cost.indexing') });
}
