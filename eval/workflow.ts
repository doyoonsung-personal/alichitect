// Workflow assertions use the production reachability checks on the final, repaired graph.
import type { Catalog, Effect, WorkflowNodeKind, WorkflowTask } from '../packages/core/src/types.ts';
import type { ModelEntry, ModelTable } from '../packages/core/src/models.ts';
import { WORKFLOW_TASKS } from '../packages/core/src/models.ts';
import { checkWorkflow } from '../packages/core/src/workflow-validate.ts';
import type { AssertionResult, TurnView } from './lib.ts';

export interface WorkflowExpect {
  kinds?: WorkflowNodeKind[];
  tasks?: WorkflowTask[];
  tiers?: Partial<Record<WorkflowTask, ModelEntry['tier'][]>>;
  products?: string[][]; // each group is any-of, only the service field counts
  runtimes?: string[][]; // each group is any-of, only runs counts; customer is allowed
  effects?: Effect[];
  forbiddenProducts?: string[]; // checked in both product and runs
  forbiddenKinds?: WorkflowNodeKind[];
  forbiddenTasks?: WorkflowTask[];
  approvals?: boolean; // default true; no wf-approval finding, including waived findings
  boundedLoops?: boolean; // default true
  international?: boolean; // default true; no China-only, restricted, legacy or closed products
  noWarnings?: string[];
}

export function workflowAssertions(
  v: TurnView, e: WorkflowExpect, catalog: Catalog | undefined, models: ModelTable, noErrors = true,
): AssertionResult[] {
  const out: AssertionResult[] = [];
  const add = (name: string, pass: boolean, detail?: string): void => {
    out.push({ type: 'workflow', name, pass, ...(detail ? { detail } : {}) });
  };
  if (!v.workflow || !catalog) {
    add('workflow available for scoring', false, !v.workflow ? 'missing workflow' : 'missing catalog');
    return out;
  }
  const nodes = Object.values(v.workflow.nodes);
  const warnings = checkWorkflow(v.workflow, catalog, models, v.workflowSettings);
  for (const kind of e.kinds ?? []) add(`workflow kind ${kind}`, nodes.some((n) => n.kind === kind));
  for (const task of e.tasks ?? []) add(`workflow task ${task}`, nodes.some((n) => n.task === task));
  for (const effect of e.effects ?? []) add(`workflow effect ${effect}`, nodes.some((n) => n.effect === effect));
  for (const kind of e.forbiddenKinds ?? []) add(`workflow no kind ${kind}`, nodes.every((n) => n.kind !== kind));
  for (const task of e.forbiddenTasks ?? []) add(`workflow no task ${task}`, nodes.every((n) => n.task !== task));
  for (const [task, tiers] of Object.entries(e.tiers ?? {})) {
    const matching = nodes.filter((n) => n.task === task);
    const bad = matching.filter((n) => !n.ai || !tiers!.includes(models.model(n.ai)?.tier as ModelEntry['tier']));
    add(`workflow tier ${task}: ${tiers!.join('|')}`, matching.length > 0 && !bad.length,
      !matching.length ? 'task absent' : bad.map((n) => `${n.id}: ${n.ai ?? 'no model'}`).join(', '));
  }
  for (const [key, field] of [['products', 'product'], ['runtimes', 'runs']] as const) {
    for (const group of e[key] ?? []) add(`workflow ${key} ${group.join('|')}`, nodes.some((n) => group.includes(n[field] ?? '')));
  }
  const used = [...new Set(nodes.flatMap((n) => [n.product, n.runs].filter((p): p is string => !!p)))];
  for (const p of e.forbiddenProducts ?? []) add(`workflow forbids ${p}`, !used.includes(p));
  if (e.international !== false) {
    const bad = used.filter((p) => {
      if (p === 'customer') return false;
      const entry = catalog.byId.get(p);
      return !entry || ['legacy', 'retired', 'no-new-purchases'].includes(entry.status)
        || ['china-only', 'restricted'].includes(entry.availability);
    });
    add('workflow products available internationally', !bad.length, bad.join(', '));
  }
  const clean = (name: string, codes: string[]): void => {
    const bad = warnings.filter((w) => codes.includes(w.code));
    add(name, !bad.length, bad.map((w) => `${w.code}: ${w.msg}`).join('; '));
  };
  if (e.approvals !== false) clean('workflow every approval-needing effect gated on every path', ['wf-approval']);
  if (e.boundedLoops !== false) {
    clean('workflow loops have bounds and exits', ['wf-loop-exit', 'wf-cycle']);
    const bad = nodes.filter((n) => n.kind === 'agent' && (!Number.isInteger(n.turns) || n.turns! < 1 || n.turns! > 50));
    const links = Object.values(v.workflow.edges).filter((l) => l.kind === 'loop' && (!Number.isInteger(l.max) || l.max! < 1));
    add('workflow numeric agent and loop bounds', !bad.length && !links.length, [...bad, ...links].map((x) => x.id).join(', '));
  }
  if (e.noWarnings?.length) clean('workflow required checks clean', e.noWarnings);
  if (noErrors) {
    const errors = [...warnings, ...v.stats.warningsAfter].filter((w) => w.severity === 'error');
    add('workflow no errors after repair', !errors.length, errors.map((w) => `${w.code}: ${w.msg}`).join('; '));
  }
  return out;
}

const KINDS = ['trigger', 'ai', 'agent', 'decide', 'guard', 'human', 'act', 'tool', 'knowledge', 'memory', 'end'];
const EFFECTS = ['read', 'write', 'reply', 'notify', 'send', 'publish', 'pay', 'delete', 'admin', 'decide'];
const CODES = ['wf-approval', 'wf-loop-exit', 'wf-cycle', 'wf-trifecta', 'wf-reply-guard', 'wf-gated-product',
  'wf-ai-missing', 'wf-ai-mismatch', 'wf-ai-region', 'wf-unreachable', 'wf-no-trigger', 'wf-dead-end',
  'wf-agent-turns', 'wf-act-effect', 'wf-human-outcomes', 'wf-mixed-out', 'wf-attach-form', 'wf-dangling-ref', 'wf-decision-review'];

export function checkWorkflowExpect(value: unknown, catalog: Catalog): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['must be an object'];
  const e = value as Record<string, unknown>;
  const problems: string[] = [];
  const keys = ['kinds', 'tasks', 'tiers', 'products', 'runtimes', 'effects', 'forbiddenProducts', 'forbiddenKinds',
    'forbiddenTasks', 'approvals', 'boundedLoops', 'international', 'noWarnings'];
  const list = (key: string, v: unknown, allowed: readonly string[]): void => {
    if (!Array.isArray(v) || !v.length || v.some((x) => typeof x !== 'string' || !allowed.includes(x))) {
      problems.push(`${key} must be a non-empty array of allowed values`);
    }
  };
  for (const key of Object.keys(e)) if (!keys.includes(key)) problems.push(`unknown key '${key}'`);
  for (const key of ['approvals', 'boundedLoops', 'international']) {
    if (key in e && typeof e[key] !== 'boolean') problems.push(`${key} must be boolean`);
  }
  for (const [key, allowed] of [['kinds', KINDS], ['forbiddenKinds', KINDS], ['tasks', WORKFLOW_TASKS],
    ['forbiddenTasks', WORKFLOW_TASKS], ['effects', EFFECTS], ['noWarnings', CODES]] as const) {
    if (key in e) list(key, e[key], allowed);
  }
  const products = [...catalog.byId.keys()];
  if ('forbiddenProducts' in e) list('forbiddenProducts', e.forbiddenProducts, products);
  for (const key of ['products', 'runtimes']) {
    if (!(key in e)) continue;
    if (!Array.isArray(e[key]) || !e[key].length) problems.push(`${key} must be a non-empty array of groups`);
    else for (const group of e[key]) list(key, group, key === 'runtimes' ? [...products, 'customer'] : products);
  }
  if ('tiers' in e) {
    if (!e.tiers || typeof e.tiers !== 'object' || Array.isArray(e.tiers)) problems.push('tiers must be a task-to-tiers object');
    else for (const [task, tiers] of Object.entries(e.tiers)) {
      if (!WORKFLOW_TASKS.includes(task as WorkflowTask)) problems.push(`unknown task '${task}'`);
      list(`tiers.${task}`, tiers, ['small', 'mid', 'large']);
    }
  }
  return problems;
}
