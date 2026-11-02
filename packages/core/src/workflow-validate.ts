// Workflow ops from the model: validateWorkflowOp() normalises one op, checkWorkflow() runs the PLAN.md section 5
// checks, and repairWorkflow() applies the deterministic repairs before them. Pure and browser-safe.
import type { Catalog, Op, Warning, WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowOp, WorkflowSettings } from './types.ts';
import type { ModelTable } from './models.ts';
import { WORKFLOW_TASKS } from './models.ts';
import { normalizeId, resolveProduct, TEXT_LIMITS, validateOp } from './validate.ts';
import type { ValidateCtx } from './validate.ts';
import { makeStep, makeLink, allocateWorkflowId } from './workflow.ts';
import { APPROVAL_POLICY, needsApproval, waived } from './approval.ts';
import { checkLifecycle } from './catalog.ts';

const kinds = ['trigger', 'ai', 'agent', 'decide', 'guard', 'human', 'act', 'tool', 'knowledge', 'memory', 'end'];
const aliases: Record<string, string> = { llm: 'ai', model: 'ai', approval: 'human', approve: 'human', hitl: 'human', condition: 'decide', router: 'decide', branch: 'decide', rag: 'knowledge', retrieval: 'knowledge', action: 'act', start: 'trigger', finish: 'end' };
const W = (code: Warning['code'], ids: string[], msg: string, severity: Warning['severity'] = 'warn', repaired = false): Warning => ({ code, ids, msg, severity, repaired });
const own = <T>(r: Record<string, T>, id: string): T | undefined => Object.hasOwn(r, id) ? r[id] : undefined;

export function validateWorkflowOp(raw: unknown, catalog: Catalog, models: ModelTable, ctx?: ValidateCtx): { op?: WorkflowOp | Op; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const bad = (msg: string): void => { warnings.push(W('wf-bad-op', [], msg)); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { warnings: [W('wf-bad-op', [], 'Expected a workflow op object.')] };
  const r = raw as Record<string, unknown>;
  if (typeof r.t !== 'string') return { warnings: [W('wf-bad-op', [], 'The op needs a type.')] };
  if (['say', 'plan', 'req', 'assume', 'ask', 'gap', 'done'].includes(r.t)) return validateOp(raw, catalog, ctx);
  if (['rec', 'node', 'edge', 'group', 'insert', 'move', 'remove'].includes(r.t)) return { warnings: [W('wf-cloud-op', [], `Cloud op '${r.t}' was dropped from this workflow turn.`, 'info')] };
  if (!['step', 'splice', 'link', 'each', 'unstep'].includes(r.t)) return { warnings: [W('wf-bad-op', [], `Unknown workflow op '${r.t}'.`)] };
  const id = normalizeId(r.id);
  if (!id) return { warnings: [W('wf-bad-op', [], 'The op needs a valid id.')] };
  const out: Record<string, unknown> = { t: r.t, id };
  const text = (key: string, max: number): string | undefined => {
    const v = r[key];
    if (!['string', 'number', 'boolean'].includes(typeof v)) return undefined;
    const chars = Array.from(String(v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, ' ').replace(/\s+/g, ' ').trim());
    if (chars.length > max) warnings.push(W('wf-bad-op', [id], `${key} is longer than ${max} characters; truncated.`, 'info', true));
    return chars.length ? (chars.length > max ? chars.slice(0, max - 1).join('') + '\u2026' : chars.join('')) : undefined;
  };
  const choice = (key: string, values: readonly string[]): void => {
    if (r[key] === undefined) return;
    if (typeof r[key] === 'string' && values.includes(r[key])) out[key] = r[key];
    else bad(`Invalid ${key} on '${id}'; the field was dropped.`);
  };
  const flag = (key: string): void => {
    if (typeof r[key] === 'boolean') out[key] = r[key];
    else if (r[key] !== undefined) bad(`${key} on '${id}' must be a boolean.`);
  };
  const number = (key: string, max: number): void => {
    if (typeof r[key] === 'number' && Number.isFinite(r[key])) out[key] = Math.max(1, Math.min(max, Math.trunc(r[key])));
    else if (r[key] !== undefined) bad(`${key} on '${id}' must be a number.`);
  };
  if (r.t === 'step' || r.t === 'splice') {
    const k = typeof r.kind === 'string' ? r.kind.toLowerCase().trim() : '';
    const kind = own(aliases, k) ?? k;
    if (!kinds.includes(kind)) return { warnings: [W('wf-bad-op', [id], `Step '${id}' has an unknown kind.`)] };
    out.kind = kind; out.label = text('label', TEXT_LIMITS.label) ?? id;
    choice('task', WORKFLOW_TASKS);
    if (out.task === undefined && ['approval', 'approve', 'hitl'].includes(k)) out.task = 'approve';
    if (out.task === undefined && ['rag', 'retrieval'].includes(k)) out.task = 'retrieve';
    for (const key of ['after', 'on', 'subject', 'repeat']) if (r[key] !== undefined) {
      const value = normalizeId(r[key]); if (value) out[key] = value; else bad(`Invalid ${key} on '${id}'.`);
    }
    for (const key of ['product', 'runs', 'ai', 'tool']) if (r[key] !== undefined) {
      if (key === 'runs' && r[key] === 'customer') { out[key] = 'customer'; continue; }
      if (key === 'product' || key === 'runs') {
        const resolved = resolveProduct(catalog, r[key], [id]);
        if (resolved.entry) { out[key] = resolved.entry.id; warnings.push(...resolved.warnings); continue; }
      } else if (typeof r[key] === 'string') {
        const value = r[key].trim();
        if (key === 'ai' ? models.model(value) : models.tool(value)) { out[key] = value; continue; }
      }
      warnings.push(W('wf-unknown-ref', [id], `Unknown ${key} reference on '${id}'; the field was dropped.`));
    }
    number('turns', 50); choice('effect', Object.keys(APPROVAL_POLICY)); choice('join', ['all', 'any']); choice('approval', ['required', 'skip']);
    flag('untrusted'); flag('private');
    const why = text('why', TEXT_LIMITS.why); if (why) out.why = why;
    if (r.t === 'splice') {
      const into = normalizeId(r.into); if (!into) { bad(`Splice '${id}' needs a valid link id.`); return { warnings }; } out.into = into;
    }
  } else if (r.t === 'link') {
    const from = normalizeId(r.from), to = normalizeId(r.to);
    if (!from || !to) { bad(`Link '${id}' needs valid endpoints.`); return { warnings }; }
    out.from = from; out.to = to;
    const edgeAliases: Record<string, string> = { edge: 'next', default: 'next', then: 'next', condition: 'branch', retry: 'loop' };
    if (r.kind !== undefined) {
      const k = typeof r.kind === 'string' ? r.kind : '';
      const kind = own(edgeAliases, k) ?? k;
      if (['next', 'branch', 'loop', 'escalate'].includes(kind)) out.kind = kind; else bad(`Invalid link kind on '${id}'.`);
    }
    const label = text('label', TEXT_LIMITS.label); if (label) out.label = label;
    number('max', 20); choice('outcome', ['approve', 'edit', 'reject', 'timeout', 'exhausted']);
  } else if (r.t === 'each') {
    const over = text('over', TEXT_LIMITS.label);
    if (!over) { bad(`Group '${id}' needs an over label.`); return { warnings }; }
    out.over = over; flag('parallel');
  }
  return { op: out as unknown as WorkflowOp, warnings };
}

const producer = (n: WorkflowNode): boolean => n.kind === 'ai' || n.kind === 'agent' || (n.kind === 'tool' && n.effect === 'write' && (n.task === 'generate' || n.task === 'create'));
const gate = (n: WorkflowNode, e: WorkflowEdge): boolean => n.kind === 'human' && (n.task === 'takeover' || (n.task === 'approve' && e.outcome === 'approve'));
const sorted = <T extends { id: string }>(r: Record<string, T>): T[] => Object.values(r).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function danglingFields(wf: WorkflowGraph, n: WorkflowNode): Array<'after' | 'subject' | 'repeat'> {
  return (['after', 'subject', 'repeat'] as const).filter((key) => {
    const id = n[key];
    if (!id) return false;
    if (key === 'repeat') return !own(wf.groups, id);
    const target = own(wf.nodes, id);
    return !target || (key === 'subject' && !producer(target));
  });
}

function hasUngatedPath(wf: WorkflowGraph, edges: WorkflowEdge[], id: string): boolean {
  const seen = new Set<string>();
  const walk = (at: string): boolean => edges.filter((e) => e.to === at).some((e) => {
    const n = own(wf.nodes, e.from);
    // Approval applies to this outgoing route, not every route from the person.
    if (!n || gate(n, e)) return false;
    if (producer(n) || n.kind === 'trigger') return true;
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return walk(n.id);
  });
  return walk(id);
}

function upstreamNodes(edges: WorkflowEdge[], id: string): Set<string> {
  const found = new Set<string>();
  const visit = (at: string): void => {
    if (found.has(at)) return;
    found.add(at);
    for (const e of edges) if (e.to === at) visit(e.from);
  };
  visit(id);
  return found;
}

function attachmentDescendants(nodes: WorkflowNode[], roots: Iterable<string>): Set<string> {
  const seen = new Set<string>();
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const n of nodes) if (n.on === id) visit(n.id);
  };
  for (const id of roots) visit(id);
  return seen;
}

function unguardedInput(wf: WorkflowGraph, id: string): boolean {
  const seen = new Set<string>();
  const nodes = Object.values(wf.nodes), edges = Object.values(wf.edges);
  const walk = (at: string): boolean => {
    if (seen.has(at)) return false;
    seen.add(at);
    const n = own(wf.nodes, at);
    if (!n || n.kind === 'guard') return false;
    if ((n.kind === 'trigger' || n.kind === 'tool' || n.kind === 'knowledge') && n.untrusted) return true;
    const attachments = attachmentDescendants(nodes, [at]);
    if (nodes.some((a) => attachments.has(a.id) && (a.kind === 'tool' || a.kind === 'knowledge') && a.untrusted)) return true;
    return edges.some((e) => e.to === at && walk(e.from));
  };
  return walk(id);
}

function checkModel(n: WorkflowNode, nodes: WorkflowNode[], models: ModelTable, settings: WorkflowSettings): Warning[] {
  const model = n.ai ? models.model(n.ai) : undefined;
  if (!model) return [];
  const warnings: Warning[] = [];
  const add = (code: Warning['code'], msg: string, severity: Warning['severity'] = 'warn'): void => {
    warnings.push(W(code, [n.id], `'${n.label}' (${n.id}): ${msg}`, severity));
  };
  const region = settings.region ?? 'ap-southeast-1';
  if (!model.regions.includes(region)) add('wf-ai-region', `Choose a model available in ${region}.`);
  const mismatch = (n.task === 'transcribe' && !model.in.includes('audio'))
    || (n.task === 'see' && !model.in.some((m) => m === 'image' || m === 'video'))
    || (n.task === 'speak' && !model.out.includes('audio'))
    || (n.task === 'create' && !model.out.some((m) => m === 'image' || m === 'video'));
  if (mismatch) add('wf-ai-mismatch', `Choose a model with the input and output modalities needed for ${n.task}.`);
  if (n.kind === 'agent' && model.functions !== true) {
    add('wf-ai-mismatch', model.functions === null
      ? `Function calling for ${model.id} is not established; confirm before relying on it.`
      : `${model.id} does not support function calling; choose another agent model.`, model.functions === null ? 'info' : 'warn');
  }
  if (n.kind === 'ai' || n.kind === 'agent') for (const tool of nodes) {
    if (tool.on !== n.id || tool.kind !== 'tool' || !tool.tool || model.tools?.includes(tool.tool)) continue;
    add('wf-ai-mismatch', model.tools === null
      ? `Tool support for ${model.id} is not established; confirm before relying on it.`
      : `${model.id} does not support ${tool.tool} on '${tool.label}' (${tool.id}); choose a supported tool.`, model.tools === null ? 'info' : 'warn');
  }
  return warnings;
}

function invalidAttachment(wf: WorkflowGraph, n: WorkflowNode): boolean {
  if (!n.on) return false;
  const host = own(wf.nodes, n.on);
  if (!['tool', 'knowledge', 'memory', 'agent'].includes(n.kind) || !host || !(host.kind === 'agent' || (n.kind === 'tool' && host.kind === 'ai'))) return true;
  const seen = new Set([n.id]); let current: WorkflowNode | undefined = host;
  while (current) {
    if (seen.has(current.id)) return true;
    seen.add(current.id); current = current.on ? own(wf.nodes, current.on) : undefined;
  }
  return false;
}
function cycleLinks(wf: WorkflowGraph): WorkflowEdge[] {
  const edges = sorted(wf.edges).filter((e) => own(wf.nodes, e.from) && own(wf.nodes, e.to) && !wf.nodes[e.from].on && !wf.nodes[e.to].on);
  const triggers = sorted(wf.nodes).filter((n) => n.kind === 'trigger').map((n) => n.id);
  const reachable = new Set<string>();
  const reach = (id: string): void => {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const e of edges.filter((e) => e.from === id)) reach(e.to);
  };
  for (const id of triggers) reach(id);
  // Removing bounded routes isolates cycles that have no loop or edit escape.
  const unbounded = edges.filter((e) => e.kind !== 'loop' && e.outcome !== 'edit');
  const done = new Set<string>(), active = new Set<string>(), found: WorkflowEdge[] = [];
  const visit = (id: string): void => {
    if (done.has(id)) return;
    active.add(id);
    for (const e of unbounded.filter((e) => e.from === id)) {
      if (active.has(e.to)) found.push(e); else visit(e.to);
    }
    active.delete(id); done.add(id);
  };
  for (const id of [...triggers, ...[...reachable].sort()]) visit(id);
  return found;
}
export function checkWorkflow(wf: WorkflowGraph, catalog: Catalog, models: ModelTable, settings: WorkflowSettings = {}): Warning[] {
  const warnings: Warning[] = [], nodes = sorted(wf.nodes), edges = sorted(wf.edges);
  const outgoing = (id: string): WorkflowEdge[] => edges.filter((e) => e.from === id);
  const add = (code: Warning['code'], n: WorkflowNode, msg: string, severity: Warning['severity'] = 'warn'): void => { warnings.push(W(code, [n.id], `'${n.label}' (${n.id}): ${msg}`, severity)); };
  const reached = new Set(nodes.filter((n) => n.kind === 'trigger').map((n) => n.id));
  let size = -1;
  while (size !== reached.size) {
    size = reached.size;
    for (const e of edges) if (reached.has(e.from) && own(wf.nodes, e.to) && !wf.nodes[e.to].on) reached.add(e.to);
    for (const n of nodes) if (n.on && reached.has(n.on)) reached.add(n.id);
  }
  if (nodes.length && !nodes.some((n) => n.kind === 'trigger')) warnings.push(W('wf-no-trigger', [], 'Add a trigger to start this workflow.', 'error'));
  const ungated = (id: string): boolean => hasUngatedPath(wf, edges, id);
  const closure = (id: string): Set<string> => upstreamNodes(edges, id);
  for (const n of nodes) {
    const outs = outgoing(n.id);
    if (!reached.has(n.id)) add('wf-unreachable', n, 'Connect this step to a trigger.', 'error');
    if (((n.kind === 'ai' || n.kind === 'agent') && (!n.ai || !models.model(n.ai))) || (n.kind === 'knowledge' && n.ai && !models.model(n.ai))) add('wf-ai-missing', n, 'Choose a model from the model table.', 'error');
    if (invalidAttachment(wf, n)) add('wf-attach-form', n, 'Use a supported attachment host or move this step inline.');
    if (!n.on && n.kind !== 'end' && !outs.length) add('wf-dead-end', n, 'Add an outgoing link or an end step.');
    if (n.kind === 'agent' && n.turns === undefined) add('wf-agent-turns', n, 'Set a maximum number of model requests.', 'info');
    if (n.kind === 'act' && !n.effect) add('wf-act-effect', n, 'Name the effect; approval currently treats this action as send.');
    if ((n.kind === 'act' && !n.on || n.kind === 'tool') && (needsApproval(n, settings) || waived(n, settings)) && (n.on ? n.approval !== 'required' : ungated(n.id))) add('wf-approval', n, 'Approve at call or move the action inline after an approve step.', waived(n, settings) ? 'info' : 'warn');
    if (outs.some((e) => (!e.kind || e.kind === 'next') && !e.outcome) && outs.some((e) => (e.kind && e.kind !== 'next') || e.outcome)) add('wf-mixed-out', n, 'Separate parallel next links from alternative routes.');
    if (n.kind === 'human' && n.task === 'approve' && (!outs.some((e) => e.outcome === 'approve') || !outs.some((e) => e.outcome === 'reject'))) add('wf-human-outcomes', n, 'Add both approve and reject routes.');
    if (n.effect === 'reply') {
      if (unguardedInput(wf, n.on ?? n.id) || !edges.some((e) => e.kind === 'escalate' && own(wf.nodes, e.to)?.kind === 'human')) add('wf-reply-guard', n, 'Guard untrusted input before replying and add an escalation route to a person.');
    }
    if (n.effect === 'send' || n.effect === 'publish') {
      const upstream = closure(n.id);
      if (n.on) for (const id of closure(n.on)) upstream.add(id);
      const attachments = attachmentDescendants(nodes, upstream);
      const inputs = nodes.filter((a) => attachments.has(a.id));
      // An attached tool approved at call time has a person in the loop, like an approve step after the last producer.
      const unapproved = n.on ? n.approval !== 'required' : ungated(n.id);
      if (inputs.some((a) => a.untrusted) && inputs.some((a) => a.private) && unapproved) add('wf-trifecta', n, 'Untrusted content and private data reach this outbound action; approve after the last content-producing step.');
    }
    if (n.effect === 'decide') add('wf-decision-review', n, 'Review this decision for PIPA and EU AI Act obligations.', 'info');
    warnings.push(...checkModel(n, nodes, models, settings));
    for (const key of danglingFields(wf, n)) add('wf-dangling-ref', n, `Remove the invalid ${key} reference '${n[key]}'.`, 'info');
    for (const key of ['product', 'runs'] as const) if (n[key] && n[key] !== 'customer') {
      const entry = catalog.byId.get(n[key]) ?? catalog.resolve(n[key]).entry;
      if (entry && (['no-new-purchases', 'retired'].includes(entry.status) || ['restricted', 'china-only'].includes(entry.availability))) {
        const lc = checkLifecycle(entry, catalog.byId);
        add('wf-gated-product', n, `${lc.status?.msg ?? lc.availability?.msg ?? entry.id}${lc.successor ? ` Use '${lc.successor.id}'.` : ''}`);
      }
    }
  }
  for (const e of edges) if (e.kind === 'loop' && (e.max === undefined || !outgoing(e.from).some((x) => x.outcome === 'exhausted'))) warnings.push(W('wf-loop-exit', [e.id, e.from], `Loop '${e.id}' needs a maximum and an exhausted route from '${e.from}'.`));
  for (const e of cycleLinks(wf)) warnings.push(W('wf-cycle', [e.id], `Cycle closes at '${e.id}'; mark a bounded loop or an edit route.`));
  return warnings;
}

export function repairWorkflow(wf: WorkflowGraph, catalog: Catalog, models: ModelTable, settings?: WorkflowSettings): { workflow: WorkflowGraph; warnings: Warning[] } {
  const g: WorkflowGraph = { nodes: { ...wf.nodes }, edges: { ...wf.edges }, groups: { ...wf.groups } };
  const warnings: Warning[] = [];
  const repair = (code: Warning['code'], id: string, msg: string, severity: Warning['severity']): void => { warnings.push(W(code, [id], msg, severity, true)); };
  const invalid = sorted(wf.nodes).filter((n) => invalidAttachment(wf, n));
  for (const n of invalid) {
    const value = { ...g.nodes[n.id] }; delete value.on;
    if (n.on && own(g.nodes, n.on) && n.on !== n.id) {
      value.after = n.on;
      if (!Object.values(g.edges).some((e) => e.to === n.id)) {
        const id = allocateWorkflowId(`${n.on}-${n.id}`, (id) => !!(own(g.nodes, id) || own(g.edges, id) || own(g.groups, id)));
        g.edges[id] = makeLink({ id, from: n.on, to: n.id, kind: 'next' });
      }
    }
    g.nodes[n.id] = makeStep(value);
    repair('wf-attach-form', n.id, `'${n.label}' (${n.id}) was moved inline because its attachment was invalid.`, 'warn');
  }
  for (const n of sorted(g.nodes)) {
    const value = { ...n };
    if (n.kind === 'agent' && n.turns === undefined) { value.turns = 10; repair('wf-agent-turns', n.id, `'${n.label}' (${n.id}) is limited to 10 model requests.`, 'info'); }
    for (const key of danglingFields(g, n)) {
      delete value[key]; repair('wf-dangling-ref', n.id, `Removed invalid ${key} '${n[key]}' from '${n.label}' (${n.id}).`, 'info');
    }
    g.nodes[n.id] = makeStep(value);
  }
  for (const e of cycleLinks(g)) {
    g.edges[e.id] = makeLink({ ...e, kind: 'loop', max: 3 });
    repair('wf-cycle', e.id, `Link '${e.id}' now closes a loop with a maximum of 3 iterations.`, 'warn');
  }
  const workflow = warnings.length ? g : wf;
  return { workflow, warnings: [...warnings, ...checkWorkflow(workflow, catalog, models, settings)] };
}
