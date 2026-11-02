// Panel rows preserve hidden attachments and never infer a runtime from a service.
import type { Catalog, WorkflowGraph } from '@ali/core/types.ts';
import type { ModelTable } from '@ali/core/models.ts';
import type { WorkflowEstimate } from '@ali/core/workflow-estimate.ts';
import type { TFn } from '../i18n/t.ts';
export function buildWorkflowPanelModel(input: {
  workflow: WorkflowGraph; catalog: Catalog; models: ModelTable; estimate: WorkflowEstimate; t: TFn;
}) {
  const { workflow, catalog, models, estimate, t } = input;
  const service = (id: string) => catalog.byId.get(id)?.name ?? id;
  const rows = Object.values(workflow.nodes).sort((a, b) =>
    (a.repeat ?? a.id).localeCompare(b.repeat ?? b.id) || a.id.localeCompare(b.id)).map((n) => ({
    id: n.id, label: n.label, kind: t('workflow.kind.' + n.kind as 'workflow.kind.ai'),
    task: n.task ? t('workflow.task.' + n.task as 'workflow.task.generate') : t('workflow.unspecified'),
    model: n.ai ? (models.model(n.ai)?.name ?? n.ai) : '',
    runtime: n.runs === 'customer' ? t('workflow.runtime.customer') : n.runs ? service(n.runs) : t('workflow.unspecified'),
    services: n.product ? service(n.product) : t('workflow.unspecified'), why: n.why ?? '',
    host: n.on ? workflow.nodes[n.on]?.label ?? n.on : '', repeat: n.repeat ?? '',
  }));
  return { rows, estimate };
}
export type WorkflowPanelModel = ReturnType<typeof buildWorkflowPanelModel>;
export function usd(value: number): string {
  return '$' + (value === 0 ? '0.00' : value < 0.01 ? value.toPrecision(3) : value.toFixed(2));
}

export function assumptionText(a: { key: string; text: string }, workflow: WorkflowGraph, t: TFn): string {
  if (a.key === 'scope:global') return t('workflow.cost.globalNote');
  if (['runsPerMonth', 'scope', 'roots', 'triggers'].includes(a.key)) {
    return t('workflow.assumption.' + a.key as 'workflow.assumption.scope');
  }
  const parts = a.key.split(':'), suffix = parts.at(-1)!;
  const id = parts.find((id) => workflow.nodes[id] || workflow.groups[id] || workflow.edges[id]) ?? parts[0];
  const step = workflow.nodes[id]?.label ?? workflow.groups[id]?.over ?? id;
  if (['input', 'output', 'prefix'].includes(suffix)) {
    const detail = a.text.slice(a.text.indexOf(':') + 1);
    const value = /\d[\d,]*/.exec(detail)?.[0];
    if (value) return t('workflow.assumption.' + suffix as 'workflow.assumption.input', { step, value });
  }
  const known = ['max', 'turns', 'task', 'results', 'thinking-output', 'batch', 'batch-unavailable',
    'searches', 'free', 'guard-types', 'event', 'reference', 'channel', 'fixed', 'thinking', 'offline', 'cache', 'history', 'calls', 'pages', 'guard-product', 'attachment', 'order'];
  if (known.includes(suffix)) return t('workflow.assumption.' + suffix as 'workflow.assumption.thinking', { step });
  if (parts[0] === 'shares') return t(suffix === 'normalise' ? 'workflow.assumption.normalise' : 'workflow.assumption.shares', { step });
  if (suffix === 'meaning') return t('workflow.assumption.loopMeaning', { step });
  if (suffix === 'typical' || suffix === 'upper') {
    const value = /assumes ([\d,.]+)/.exec(a.text)?.[1];
    if (value) return t('workflow.assumption.default', { step, value,
      scenario: t('workflow.cost.' + suffix as 'workflow.cost.typical') });
  }
  return a.text;
}

const REASONS = {
  'Human review time is not priced.': 'human',
  'Model is missing from the price table.': 'model',
  'No confirmed model price.': 'price',
  'Image, video and voice quantities are not estimated in this release.': 'modality',
  'No firm rate for the request tier or token direction.': 'tier',
  'No confirmed tool fee.': 'tool',
  'Compute quantity requires a measured duration and resource size.': 'compute',
  'Storage quantity and firm International capacity rates required.': 'storage',
  'Document count, size and re-indexing frequency are unknown; only query usage is priced.': 'indexing',
} as const;
export function unpricedReason(reason: string, t: TFn): string {
  const key = REASONS[reason as keyof typeof REASONS];
  return key ? t('workflow.cost.reason.' + key as 'workflow.cost.reason.human') : reason;
}
