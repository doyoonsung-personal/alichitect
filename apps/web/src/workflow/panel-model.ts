// Panel rows preserve hidden attachments and never infer a runtime from a service.
import type { Catalog, WorkflowGraph, WorkflowNode } from '@ali/core/types.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import type { WorkflowLayoutState } from '@ali/core/workflow-layout.ts';
import type { ModelTable } from '@ali/core/models.ts';
import type { WorkflowEstimate } from '@ali/core/workflow-estimate.ts';
import type { TFn } from '../i18n/t.ts';

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
