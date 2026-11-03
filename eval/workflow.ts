// Workflow assertions use the production reachability checks on the final, repaired graph.
import type { Catalog, Effect, WorkflowNodeKind, WorkflowNode, WorkflowTask } from '../packages/core/src/types.ts';
import type { Modality, ModelEntry, ModelTable } from '../packages/core/src/models.ts';
import { WORKFLOW_TASKS } from '../packages/core/src/models.ts';
import { checkWorkflow } from '../packages/core/src/workflow-validate.ts';
import type { AssertionResult, TurnView } from './lib.ts';
import { modelTexts } from './lib.ts';

export interface WorkflowExpect {
  kinds?: WorkflowNodeKind[];
  tasks?: WorkflowTask[];
  tasksAny?: WorkflowTask[][]; // each group is any-of
  tiers?: Partial<Record<WorkflowTask, ModelEntry['tier'][]>>;
  modelOutputs?: Partial<Record<WorkflowTask, Modality[]>>; // some model step per task outputs all listed modalities
  mentionModels?: Modality[]; // reply names a table model id, display name or family with each output modality
  noGaps?: string[]; // case-insensitive regexes over gap need/note
  notMention?: string[]; // case-insensitive regexes over model text; shared expect.notMention stays literal
  products?: string[][]; // each group is any-of; ai also implies Model Studio
  runtimes?: string[][]; // each group is any-of, only runs counts; customer is allowed
  effects?: Effect[];
  effectsAny?: Effect[][]; // each group is any-of; approval checks still follow each action's policy
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
  const modelStep = (n: WorkflowNode): boolean => ['ai', 'agent', 'knowledge'].includes(n.kind) && !!n.ai;
  const hasTask = (task: WorkflowTask): boolean => nodes.some((n) => {
    if (n.task === task) return !['approve', 'takeover'].includes(task) || n.kind === 'human';
    if (task === 'extract' && n.kind === 'tool' && n.tool === 'pdf_parse') return true;
    const model = modelStep(n) ? models.model(n.ai!) : undefined;
    // Native video audio meets speak too; a separate TTS step is optional.
    return task === 'transcribe' ? !!model?.in.includes('audio') : task === 'speak' && !!model?.out.includes('audio');
  });
  for (const task of e.tasks ?? []) add(`workflow task ${task}`, hasTask(task));
  for (const group of e.tasksAny ?? []) add(`workflow task ${group.join('|')}`, group.some(hasTask));
  for (const [task, outputs] of Object.entries(e.modelOutputs ?? {})) {
    const matching = nodes.filter((n) => n.task === task && modelStep(n));
    add(`workflow model output ${task}: ${outputs!.join(',')}`,
      matching.some((n) => outputs!.every((output) => models.model(n.ai!)?.out.includes(output))),
      matching.length ? matching.map((n) => `${n.id}: ${n.ai}`).join(', ') : 'model step absent');
  }
  const reply = [...v.says, ...v.ops.flatMap((o) => o.t === 'say' ? [o.text] : o.t === 'done' ? [o.summary] : [])]
    .join('\n').normalize('NFKC').toLowerCase();
  for (const output of e.mentionModels ?? []) {
    const candidates = models.models.filter((m) => m.out.includes(output));
    add(`workflow mentions ${output} model`, candidates.some((m) => [m.id, m.name]
      .some((name) => reply.includes(name.normalize('NFKC').toLowerCase())) || new RegExp(`\\b${m.family}\\b`, 'u').test(reply)));
  }
  const gaps = [...v.gaps, ...v.ops.filter((o) => o.t === 'gap')];
  for (const pattern of e.noGaps ?? []) {
    const re = new RegExp(pattern, 'iu');
    const bad = gaps.filter((g) => re.test(g.need) || re.test(g.note));
    add(`workflow no gap ${pattern}`, !bad.length, bad.map((g) => `${g.need}: ${g.note}`).join('; '));
  }
  for (const pattern of e.notMention ?? []) {
    const re = new RegExp(pattern, 'iu');
    const bad = [...modelTexts(v, true), reply, ...gaps.flatMap((g) => [g.need, g.note])].filter((text) => re.test(text));
    add(`workflow never mentions ${pattern}`, !bad.length, bad.join('; '));
  }
  for (const effect of e.effects ?? []) add(`workflow effect ${effect}`, nodes.some((n) => n.effect === effect));
  for (const group of e.effectsAny ?? []) {
    add(`workflow effect ${group.join('|')}`, nodes.some((n) => n.effect && group.includes(n.effect)));
  }
  for (const kind of e.forbiddenKinds ?? []) add(`workflow no kind ${kind}`, nodes.every((n) => n.kind !== kind));
  for (const task of e.forbiddenTasks ?? []) add(`workflow no task ${task}`, nodes.every((n) => n.task !== task));
  for (const [task, tiers] of Object.entries(e.tiers ?? {})) {
    const matching = nodes.filter((n) => n.task === task);
    const bad = matching.filter((n) => !n.ai || !tiers!.includes(models.model(n.ai)?.tier as ModelEntry['tier']));
    add(`workflow tier ${task}: ${tiers!.join('|')}`, matching.length > 0 && !bad.length,
      !matching.length ? 'task absent' : bad.map((n) => `${n.id}: ${n.ai ?? 'no model'}`).join(', '));
  }
  for (const [key, field] of [['products', 'product'], ['runtimes', 'runs']] as const) {
    for (const group of e[key] ?? []) {
      add(`workflow ${key} ${group.join('|')}`, nodes.some((n) => group.includes(n[field] ?? '')
        || (key === 'products' && group.includes('model-studio') && modelStep(n))));
    }
  }
  const used = [...new Set(nodes.flatMap((n) => [n.product, n.runs, ...(modelStep(n) ? ['model-studio'] : [])]
    .filter((p): p is string => !!p)))];
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
    clean('workflow automated loops have bounds and exits', ['wf-loop-exit', 'wf-cycle']);
    const bad = nodes.filter((n) => n.kind === 'agent' && (!Number.isInteger(n.turns) || n.turns! < 1 || n.turns! > 50));
    const links = Object.values(v.workflow.edges).filter((l) => l.kind === 'loop' && (!Number.isInteger(l.max) || l.max! < 1));
    add('workflow numeric agent and automated loop bounds', !bad.length && !links.length, [...bad, ...links].map((x) => x.id).join(', '));
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
const MODALITIES: readonly Modality[] = ['text', 'image', 'video', 'audio'];
const CODES = ['wf-approval', 'wf-loop-exit', 'wf-cycle', 'wf-trifecta', 'wf-reply-guard', 'wf-gated-product',
  'wf-ai-missing', 'wf-ai-mismatch', 'wf-ai-region', 'wf-unreachable', 'wf-no-trigger', 'wf-dead-end',
  'wf-agent-turns', 'wf-act-effect', 'wf-human-outcomes', 'wf-mixed-out', 'wf-attach-form', 'wf-dangling-ref', 'wf-decision-review'];

export function checkWorkflowExpect(value: unknown, catalog: Catalog): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['must be an object'];
  const e = value as Record<string, unknown>;
  const problems: string[] = [];
  const keys = ['kinds', 'tasks', 'tasksAny', 'tiers', 'products', 'runtimes', 'effects', 'forbiddenProducts', 'forbiddenKinds',
    'effectsAny', 'forbiddenTasks', 'approvals', 'boundedLoops', 'international', 'noWarnings',
    'modelOutputs', 'mentionModels', 'noGaps', 'notMention'];
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
    ['forbiddenTasks', WORKFLOW_TASKS], ['effects', EFFECTS], ['noWarnings', CODES], ['mentionModels', MODALITIES]] as const) {
    if (key in e) list(key, e[key], allowed);
  }
  const products = [...catalog.byId.keys()];
  if ('effectsAny' in e) {
    if (!Array.isArray(e.effectsAny) || !e.effectsAny.length) {
      problems.push('effectsAny must be a non-empty array of groups');
    } else for (const group of e.effectsAny) list('effectsAny', group, EFFECTS);
  }
  if ('tasksAny' in e) {
    if (!Array.isArray(e.tasksAny) || !e.tasksAny.length) problems.push('tasksAny must be a non-empty array of groups');
    else for (const group of e.tasksAny) list('tasksAny', group, WORKFLOW_TASKS);
  }
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
  if ('modelOutputs' in e) {
    const outputs = e.modelOutputs;
    if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs) || !Object.keys(outputs).length) {
      problems.push('modelOutputs must be a non-empty task-to-modalities object');
    } else for (const [task, modalities] of Object.entries(outputs)) {
      if (!WORKFLOW_TASKS.includes(task as WorkflowTask)) problems.push(`unknown task '${task}'`);
      list(`modelOutputs.${task}`, modalities, MODALITIES);
    }
  }
  for (const key of ['noGaps', 'notMention']) {
    const patterns = e[key];
    if (!(key in e)) continue;
    if (!Array.isArray(patterns) || !patterns.length || patterns.some((p) => typeof p !== 'string' || !p.trim())) {
      problems.push(`${key} must be a non-empty array of regex strings`);
    } else for (const pattern of patterns) {
      try { new RegExp(pattern, 'iu'); }
      catch { problems.push(`${key} has invalid regex '${pattern}'`); }
    }
  }
  return problems;
}
