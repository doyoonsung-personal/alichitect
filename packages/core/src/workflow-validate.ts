// Workflow ops from the model: validateWorkflowOp() normalises one op, checkWorkflow() runs the PLAN.md section 5
// checks, and repairWorkflow() applies the deterministic repairs before them. Pure and browser-safe.
import type { Catalog, Op, Warning, WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowOp, WorkflowSettings } from './types.ts';
import type { ModelTable } from './models.ts';
import { WORKFLOW_TASKS } from './models.ts';
import { normalizeId, resolveProduct, TEXT_LIMITS, validateOp } from './validate.ts';
import type { ValidateCtx } from './validate.ts';
import { makeStep, makeLink, allocateWorkflowId, DEFAULT_WORKFLOW_LIMITS } from './workflow.ts';
import { APPROVAL_POLICY, needsApproval, waived } from './approval.ts';
import { checkLifecycle } from './catalog.ts';

const kinds = ['trigger', 'ai', 'agent', 'decide', 'guard', 'human', 'act', 'tool', 'knowledge', 'memory', 'end'];
const aliases: Record<string, string> = {
  llm: 'ai',
  model: 'ai',
  approval: 'human',
  approve: 'human',
  hitl: 'human',
  condition: 'decide',
  router: 'decide',
  branch: 'decide',
  rag: 'knowledge',
  retrieval: 'knowledge',
  action: 'act',
  start: 'trigger',
  finish: 'end',
};

function W(
  code: Warning['code'], ids: string[], msg: string, severity: Warning['severity'] = 'warn', repaired = false,
): Warning {
  return { code, ids, msg, severity, repaired };
}

const own = <T>(r: Record<string, T>, id: string): T | undefined => Object.hasOwn(r, id) ? r[id] : undefined;

interface ValidateState {
  r: Record<string, unknown>;
  out: Record<string, unknown>;
  id: string;
  warnings: Warning[];
}

/** Reports a malformed field without dropping the other fields. */
function bad(s: ValidateState, msg: string): void {
  s.warnings.push(W('wf-bad-op', [], msg));
}

/** Normalizes display text and reports truncation in code points. */
function text(s: ValidateState, key: string, max: number): string | undefined {
  const { r, id, warnings } = s;
  const v = r[key];
  if (!['string', 'number', 'boolean'].includes(typeof v)) return undefined;
  const chars = Array.from(String(v)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
  if (chars.length > max) warnings.push(W('wf-bad-op', [id], `${key} is longer than ${max} characters; truncated.`, 'info', true));
  return chars.length ? (chars.length > max ? chars.slice(0, max - 1).join('') + '\u2026' : chars.join('')) : undefined;
}

/** Keeps only a supported optional enum value. */
function choice(s: ValidateState, key: string, values: readonly string[]): void {
  const { r, out, id } = s;
  if (r[key] === undefined) return;
  if (typeof r[key] === 'string' && values.includes(r[key])) out[key] = r[key];
  else bad(s, `Invalid ${key} on '${id}'; the field was dropped.`);
}

/** Keeps an optional boolean without coercion. */
function flag(s: ValidateState, key: string): void {
  const { r, out, id } = s;
  if (typeof r[key] === 'boolean') out[key] = r[key];
  else if (r[key] !== undefined) bad(s, `${key} on '${id}' must be a boolean.`);
}

/** Clamps an optional numeric field to its integer bounds. */
function number(s: ValidateState, key: string, max: number): void {
  const { r, out, id } = s;
  if (typeof r[key] === 'number' && Number.isFinite(r[key])) out[key] = Math.max(1, Math.min(max, Math.trunc(r[key])));
  else if (r[key] !== undefined) bad(s, `${key} on '${id}' must be a number.`);
}

/** Resolves service, runtime, model and tool references in field order. */
function validateReferences(s: ValidateState, catalog: Catalog, models: ModelTable): void {
  const { r, out, id, warnings } = s;
  for (const key of ['product', 'runs', 'ai', 'tool']) {
    if (r[key] === undefined) continue;
    if (key === 'runs' && r[key] === 'customer') {
      out[key] = 'customer';
      continue;
    }
    if (key === 'product' || key === 'runs') {
      const resolved = resolveProduct(catalog, r[key], [id]);
      if (resolved.entry) {
        out[key] = resolved.entry.id;
        warnings.push(...resolved.warnings);
        continue;
      }
    } else if (typeof r[key] === 'string') {
      const value = r[key].trim();
      if (key === 'ai' ? models.model(value) : models.tool(value)) {
        out[key] = value;
        continue;
      }
    }
    warnings.push(W('wf-unknown-ref', [id], `Unknown ${key} reference on '${id}'; the field was dropped.`));
  }
}

/** Normalizes step fields, retaining the original diagnostic order. */
function validateStep(s: ValidateState, catalog: Catalog, models: ModelTable): boolean {
  const { r, out, id, warnings } = s;
  const k = typeof r.kind === 'string' ? r.kind.toLowerCase().trim() : '';
  const kind = own(aliases, k) ?? k;
  if (!kinds.includes(kind)) {
    warnings.push(W('wf-bad-op', [id], `Step '${id}' has an unknown kind.`));
    return false;
  }
  out.kind = kind;
  out.label = text(s, 'label', TEXT_LIMITS.label) ?? id;
  choice(s, 'task', WORKFLOW_TASKS);
  if (out.task === undefined && ['approval', 'approve', 'hitl'].includes(k)) out.task = 'approve';
  if (out.task === undefined && ['rag', 'retrieval'].includes(k)) out.task = 'retrieve';
  for (const key of ['after', 'on', 'subject', 'repeat']) {
    if (r[key] === undefined) continue;
    const value = normalizeId(r[key]);
    if (value) out[key] = value;
    else bad(s, `Invalid ${key} on '${id}'.`);
  }
  validateReferences(s, catalog, models);
  number(s, 'turns', 50);
  choice(s, 'effect', Object.keys(APPROVAL_POLICY));
  if (out.effect !== undefined && !effectKind(kind)) {
    // A dropped read or write is noise to the user; a dropped send, pay or decide means the design lost an approval gate.
    const gated = APPROVAL_POLICY[out.effect as keyof typeof APPROVAL_POLICY].approval;
    s.warnings.push(W('wf-bad-op', [], `Effect on '${id}' was dropped; only act, tool and memory steps carry effects.`,
      gated ? 'warn' : 'info'));
    delete out.effect;
  }
  choice(s, 'join', ['all', 'any']);
  choice(s, 'approval', ['required', 'skip']);
  flag(s, 'untrusted');
  flag(s, 'private');
  const why = text(s, 'why', TEXT_LIMITS.why);
  if (why) out.why = why;
  if (r.t === 'splice') {
    const into = normalizeId(r.into);
    if (!into) {
      bad(s, `Splice '${id}' needs a valid link id.`);
      return false;
    }
    out.into = into;
  }
  return true;
}

/** Normalizes a link only when both endpoint ids are valid. */
function validateLink(s: ValidateState): boolean {
  const { r, out, id } = s;
  const from = normalizeId(r.from);
  const to = normalizeId(r.to);
  if (!from || !to) {
    bad(s, `Link '${id}' needs valid endpoints.`);
    return false;
  }
  out.from = from;
  out.to = to;
  const edgeAliases: Record<string, string> = { edge: 'next', default: 'next', then: 'next', condition: 'branch', retry: 'loop' };
  if (r.kind !== undefined) {
    const k = typeof r.kind === 'string' ? r.kind : '';
    const kind = own(edgeAliases, k) ?? k;
    if (['next', 'branch', 'loop', 'escalate'].includes(kind)) out.kind = kind;
    else bad(s, `Invalid link kind on '${id}'.`);
  }
  const label = text(s, 'label', TEXT_LIMITS.label);
  if (label) out.label = label;
  number(s, 'max', 20);
  choice(s, 'outcome', ['approve', 'edit', 'reject', 'timeout', 'exhausted']);
  return true;
}

const effectKind = (kind: string): boolean => ['act', 'tool', 'memory'].includes(kind);
const humanApprove = (n: WorkflowNode | undefined): boolean => n?.kind === 'human' && n.task === 'approve';

export interface WorkflowValidateCtx extends ValidateCtx {
  workflow?: WorkflowGraph;
  workflowSteps?: Record<string, WorkflowNode>;
}

export function validateWorkflowOp(
  raw: unknown, catalog: Catalog, models: ModelTable, ctx?: WorkflowValidateCtx,
): { op?: WorkflowOp | Op; warnings: Warning[] } {
  const warnings: Warning[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { warnings: [W('wf-bad-op', [], 'Expected a workflow op object.')] };
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.t !== 'string') return { warnings: [W('wf-bad-op', [], 'The op needs a type.')] };
  if (['say', 'plan', 'req', 'assume', 'ask', 'gap', 'done'].includes(r.t)) return validateOp(raw, catalog, ctx);
  if (['rec', 'node', 'edge', 'group', 'insert', 'move', 'remove'].includes(r.t)) {
    return { warnings: [W('wf-cloud-op', [], `Cloud op '${r.t}' was dropped from this workflow turn.`, 'info')] };
  }
  if (!['step', 'splice', 'link', 'each', 'unstep'].includes(r.t)) {
    return { warnings: [W('wf-bad-op', [], `Unknown workflow op '${r.t}'.`)] };
  }
  const id = normalizeId(r.id);
  if (!id) return { warnings: [W('wf-bad-op', [], 'The op needs a valid id.')] };
  const out: Record<string, unknown> = { t: r.t, id };
  const s: ValidateState = { r, out, id, warnings };
  if (r.t === 'step' || r.t === 'splice') {
    if (!validateStep(s, catalog, models)) return { warnings };
    if (ctx) (ctx.workflowSteps ??= {})[id] = out as unknown as WorkflowNode;
  } else if (r.t === 'link') {
    if (!validateLink(s)) return { warnings };
    const node = (id: string): WorkflowNode | undefined =>
      own(ctx?.workflowSteps ?? {}, id) ?? own(ctx?.workflow?.nodes ?? {}, id);
    if (node(out.from as string)?.on || node(out.to as string)?.on) {
      warnings.push(W('wf-attach-form', [id], `Link '${id}' touches an attached step; use its host instead.`, 'error'));
      return { warnings };
    }
    const from = node(out.from as string);
    if (out.outcome === 'edit' && from && !humanApprove(from)) {
      delete out.outcome;
      bad(s, `Edit outcome on '${id}' was dropped; it must leave a human approve step.`);
    }
  } else if (r.t === 'each') {
    const over = text(s, 'over', TEXT_LIMITS.label);
    if (!over) {
      bad(s, `Group '${id}' needs an over label.`);
      return { warnings };
    }
    out.over = over;
    flag(s, 'parallel');
  }
  if (r.t === 'unstep' && ctx?.workflowSteps) delete ctx.workflowSteps[id];
  return { op: out as unknown as WorkflowOp, warnings };
}

const producer = (n: WorkflowNode): boolean => n.kind === 'ai' || n.kind === 'agent'
  || (n.kind === 'tool' && n.effect === 'write' && (n.task === 'generate' || n.task === 'create'));
const gate = (n: WorkflowNode, e: WorkflowEdge): boolean => n.kind === 'human'
  && (n.task === 'takeover' || (n.task === 'approve' && e.outcome === 'approve'));
const sorted = <T extends { id: string }>(r: Record<string, T>): T[] =>
  Object.values(r).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

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
    for (const e of edges) {
      if (e.to === at) visit(e.from);
    }
  };
  visit(id);
  return found;
}

function attachmentDescendants(nodes: WorkflowNode[], roots: Iterable<string>): Set<string> {
  const seen = new Set<string>();
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const n of nodes) {
      if (n.on === id) visit(n.id);
    }
  };
  for (const id of roots) visit(id);
  return seen;
}

function unguardedInput(wf: WorkflowGraph, id: string): boolean {
  const seen = new Set<string>();
  const nodes = Object.values(wf.nodes);
  const edges = Object.values(wf.edges).filter((e) => !attachedLink(wf, e));
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
  // A model outside the pinned region cannot serve this step there.
  if (!model.regions.includes(region)) add('wf-ai-region', `Choose a model available in ${region}.`);
  // The task must fit the model's input and output modalities.
  const mismatch = (n.task === 'transcribe' && !model.in.includes('audio'))
    || (n.task === 'see' && !model.in.some((m) => m === 'image' || m === 'video'))
    || (n.task === 'speak' && !model.out.includes('audio'))
    || (n.task === 'create' && !model.out.some((m) => m === 'image' || m === 'video'));
  if (mismatch) add('wf-ai-mismatch', `Choose a model with the input and output modalities needed for ${n.task}.`);
  // An agent needs documented function calling to choose its tools.
  if (n.kind === 'agent' && model.functions !== true) {
    add('wf-ai-mismatch', model.functions === null
      ? `Function calling for ${model.id} is not established; confirm before relying on it.`
      : `${model.id} does not support function calling; choose another agent model.`, model.functions === null ? 'info' : 'warn');
  }
  // Attached built-in tools must be supported by the selected model.
  if (n.kind === 'ai' || n.kind === 'agent') {
    for (const tool of nodes) {
      if (tool.on !== n.id || tool.kind !== 'tool' || !tool.tool || model.tools?.includes(tool.tool)) continue;
      add('wf-ai-mismatch', model.tools === null
        ? `Tool support for ${model.id} is not established; confirm before relying on it.`
        : `${model.id} does not support ${tool.tool} on '${tool.label}' (${tool.id}); choose a supported tool.`,
        model.tools === null ? 'info' : 'warn');
    }
  }
  return warnings;
}

function invalidAttachment(wf: WorkflowGraph, n: WorkflowNode): boolean {
  if (!n.on) return false;
  const host = own(wf.nodes, n.on);
  if (!['tool', 'knowledge', 'memory', 'agent'].includes(n.kind) || !host
    || !(host.kind === 'agent' || (n.kind === 'tool' && host.kind === 'ai'))) return true;
  const seen = new Set([n.id]);
  let current: WorkflowNode | undefined = host;
  while (current) {
    if (seen.has(current.id)) return true;
    seen.add(current.id);
    current = current.on ? own(wf.nodes, current.on) : undefined;
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
  const unbounded = edges.filter((e) => e.kind !== 'loop' && !(e.outcome === 'edit' && humanApprove(own(wf.nodes, e.from))));
  const done = new Set<string>();
  const active = new Set<string>();
  const found: WorkflowEdge[] = [];
  const visit = (id: string): void => {
    if (done.has(id)) return;
    active.add(id);
    for (const e of unbounded.filter((e) => e.from === id)) {
      if (active.has(e.to)) found.push(e);
      else visit(e.to);
    }
    active.delete(id);
    done.add(id);
  };
  for (const id of [...triggers, ...[...reachable].sort()]) visit(id);
  return found;
}

interface CheckState {
  wf: WorkflowGraph;
  catalog: Catalog;
  models: ModelTable;
  settings: WorkflowSettings;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  warnings: Warning[];
}

/** Formats a node finding consistently across the check rules. */
function add(
  s: CheckState, code: Warning['code'], n: WorkflowNode, msg: string, severity: Warning['severity'] = 'warn',
): void {
  s.warnings.push(W(code, [n.id], `'${n.label}' (${n.id}): ${msg}`, severity));
}

/** Finds routes in the same order as the sorted edge list. */
function outgoing(edges: WorkflowEdge[], id: string): WorkflowEdge[] {
  return edges.filter((e) => e.from === id);
}

/** Follows inline routes and attached hosts from every trigger. */
function reachedNodes(wf: WorkflowGraph, nodes: WorkflowNode[], edges: WorkflowEdge[]): Set<string> {
  const reached = new Set(nodes.filter((n) => n.kind === 'trigger').map((n) => n.id));
  let size = -1;
  while (size !== reached.size) {
    size = reached.size;
    for (const e of edges) {
      if (reached.has(e.from) && own(wf.nodes, e.to) && !wf.nodes[e.to].on) reached.add(e.to);
    }
    for (const n of nodes) {
      if (n.on && reached.has(n.on)) reached.add(n.id);
    }
  }
  return reached;
}

/** Checks whether a step can be reached, hosted and executed as drawn. */
function checkNodeStructure(s: CheckState, n: WorkflowNode, outs: WorkflowEdge[], reached: Set<string>): void {
  // Unreachable steps never participate in a run; attachments inherit their host's reachability.
  if (!reached.has(n.id)) add(s, 'wf-unreachable', n, 'Connect this step to a trigger.', 'error');
  // Model calls need an allowed model, including optional models on knowledge steps.
  if (((n.kind === 'ai' || n.kind === 'agent') && (!n.ai || !s.models.model(n.ai)))
    || (n.kind === 'knowledge' && n.ai && !s.models.model(n.ai))) {
    add(s, 'wf-ai-missing', n, 'Choose a model from the model table.', 'error');
  } else if (n.task === 'create' && !n.ai && /\bvideos?\b|영상|비디오|视频|視頻|影片|影像/iu.test(n.label)) {
    add(s, 'wf-ai-missing', n, 'Choose a video-output model from the model table and use an ai create step.');
  }
  // Unsupported hosts and attachment cycles cannot be drawn as valid agent capabilities.
  if (invalidAttachment(s.wf, n)) {
    add(s, 'wf-attach-form', n, 'Use a supported attachment host or move this step inline.');
  }
  // Only an end step may terminate an inline route without an outgoing link.
  if (!n.on && n.kind !== 'end' && !outs.length) add(s, 'wf-dead-end', n, 'Add an outgoing link or an end step.');
  // An explicit request limit keeps an agent's own loop bounded.
  if (n.kind === 'agent' && n.turns === undefined) {
    add(s, 'wf-agent-turns', n, 'Set a maximum number of model requests.', 'info');
  }
  // An unnamed effect would hide the action's approval requirements; it defaults to send.
  if (n.kind === 'act' && !n.effect) {
    add(s, 'wf-act-effect', n, 'Name the effect; approval currently treats this action as send.');
  }
}

/** Checks approval and route semantics without treating parallel paths as alternatives. */
function checkNodeRoutes(s: CheckState, n: WorkflowNode, outs: WorkflowEdge[]): void {
  const { wf, edges, settings } = s;
  // Sensitive actions need approval after the last producer, or at call time for attached tools.
  if ((n.effect !== undefined || n.kind === 'act') && (needsApproval(n, settings) || waived(n, settings))
    && (n.on ? n.approval !== 'required' : hasUngatedPath(wf, edges, n.id))) {
    add(s, 'wf-approval', n, 'Approve at call or move the action inline after an approve step.',
      waived(n, settings) ? 'info' : 'warn');
  }
  // Mixing parallel next links with alternatives makes the intended execution ambiguous.
  if (outs.some((e) => (!e.kind || e.kind === 'next') && !e.outcome)
    && outs.some((e) => (e.kind && e.kind !== 'next') || e.outcome)) {
    add(s, 'wf-mixed-out', n, 'Separate parallel next links from alternative routes.');
  }
  // An approval step must let a person reject as well as approve.
  if (n.kind === 'human' && n.task === 'approve'
    && (!outs.some((e) => e.outcome === 'approve') || !outs.some((e) => e.outcome === 'reject'))) {
    add(s, 'wf-human-outcomes', n, 'Add both approve and reject routes.');
  }
}

/** Checks exposure to untrusted input, private data and consequential decisions. */
function checkNodeSafety(s: CheckState, n: WorkflowNode): void {
  const { wf, nodes, edges } = s;
  // Live replies need guarded input and a route to a person instead of mandatory approval.
  if (n.effect === 'reply') {
    if (unguardedInput(wf, n.on ?? n.id)
      || !edges.some((e) => e.kind === 'escalate' && own(wf.nodes, e.to)?.kind === 'human')) {
      add(s, 'wf-reply-guard', n, 'Guard untrusted input before replying and add an escalation route to a person.');
    }
  }
  // Untrusted content plus private data and outbound access can leak data across agent boundaries.
  if (n.effect === 'send' || n.effect === 'publish') {
    const upstream = upstreamNodes(edges, n.id);
    if (n.on) {
      for (const id of upstreamNodes(edges, n.on)) upstream.add(id);
    }
    const attachments = attachmentDescendants(nodes, upstream);
    const inputs = nodes.filter((a) => attachments.has(a.id));
    // Approval at call time covers an attached tool, like approval after the last inline producer.
    const unapproved = n.on ? n.approval !== 'required' : hasUngatedPath(wf, edges, n.id);
    if (inputs.some((a) => a.untrusted) && inputs.some((a) => a.private) && unapproved) {
      add(s, 'wf-trifecta', n,
        'Untrusted content and private data reach this outbound action; approve after the last content-producing step.');
    }
  }
  // Decisions affecting people need a regulatory review that automatic repair cannot make.
  if (n.effect === 'decide') {
    add(s, 'wf-decision-review', n, 'Review this decision for PIPA and EU AI Act obligations.', 'info');
  }
}

/** Checks references and purchasing restrictions after the model feasibility findings. */
function checkNodeReferences(s: CheckState, n: WorkflowNode): void {
  // Missing layout, approval-subject or repeat targets leave misleading relationships.
  for (const key of danglingFields(s.wf, n)) {
    add(s, 'wf-dangling-ref', n, `Remove the invalid ${key} reference '${n[key]}'.`, 'info');
  }
  // Closed or restricted products cannot serve new international accounts; name their successor.
  for (const key of ['product', 'runs'] as const) {
    if (!n[key] || n[key] === 'customer') continue;
    const entry = s.catalog.byId.get(n[key]) ?? s.catalog.resolve(n[key]).entry;
    if (entry && (['no-new-purchases', 'retired'].includes(entry.status)
      || ['restricted', 'china-only'].includes(entry.availability))) {
      const lc = checkLifecycle(entry, s.catalog.byId);
      add(s, 'wf-gated-product', n,
        `${lc.status?.msg ?? lc.availability?.msg ?? entry.id}${lc.successor ? ` Use '${lc.successor.id}'.` : ''}`);
    }
  }
}

function attachedLink(wf: WorkflowGraph, e: WorkflowEdge): boolean {
  return !!(own(wf.nodes, e.from)?.on || own(wf.nodes, e.to)?.on);
}

export function checkWorkflow(wf: WorkflowGraph, catalog: Catalog, models: ModelTable, settings: WorkflowSettings = {}): Warning[] {
  const warnings: Warning[] = [];
  const nodes = sorted(wf.nodes);
  const allEdges = sorted(wf.edges);
  const edges = allEdges.filter((e) => !attachedLink(wf, e));
  for (const e of allEdges) {
    if (attachedLink(wf, e)) warnings.push(W('wf-attach-form', [e.id],
      `Link '${e.id}' touches an attached step; use its host instead.`, 'error'));
    if (e.outcome === 'edit' && !humanApprove(own(wf.nodes, e.from))) warnings.push(W('wf-bad-op', [e.id],
      `Edit outcome on '${e.id}' must leave a human approve step.`, 'error'));
  }
  const s: CheckState = { wf, catalog, models, settings, nodes, edges, warnings };
  const reached = reachedNodes(wf, nodes, edges);
  // Without a trigger, a nonempty workflow has no entry point.
  if (nodes.length && !nodes.some((n) => n.kind === 'trigger')) {
    warnings.push(W('wf-no-trigger', [], 'Add a trigger to start this workflow.', 'error'));
  }
  for (const n of nodes) {
    const outs = outgoing(edges, n.id);
    checkNodeStructure(s, n, outs, reached);
    checkNodeRoutes(s, n, outs);
    checkNodeSafety(s, n);
    warnings.push(...checkModel(n, nodes, models, settings));
    checkNodeReferences(s, n);
  }
  // A retry needs both a numeric bound and a route for exhausted attempts.
  for (const e of edges) {
    if (e.kind === 'loop' && (e.max === undefined || !outgoing(edges, e.from).some((x) => x.outcome === 'exhausted'))) {
      warnings.push(W('wf-loop-exit', [e.id, e.from],
        `Loop '${e.id}' needs a maximum and an exhausted route from '${e.from}'.`));
    }
  }
  // Reachable cycles need an explicit loop bound or edit route to avoid unbounded execution.
  for (const e of cycleLinks(wf)) {
    warnings.push(W('wf-cycle', [e.id], `Cycle closes at '${e.id}'; mark a bounded loop or an edit route.`));
  }
  return warnings;
}

export function repairWorkflow(
  wf: WorkflowGraph, catalog: Catalog, models: ModelTable, settings?: WorkflowSettings,
): { workflow: WorkflowGraph; warnings: Warning[] } {
  const g: WorkflowGraph = { nodes: { ...wf.nodes }, edges: { ...wf.edges }, groups: { ...wf.groups } };
  const warnings: Warning[] = [];
  const repair = (code: Warning['code'], id: string, msg: string, severity: Warning['severity']): void => {
    warnings.push(W(code, [id], msg, severity, true));
  };
  for (const e of sorted(g.edges)) {
    if (attachedLink(wf, e)) {
      delete g.edges[e.id];
      repair('wf-attach-form', e.id, `Removed link '${e.id}' touching an attached step; use its host instead.`, 'warn');
    } else if (e.outcome === 'edit' && !humanApprove(own(wf.nodes, e.from))) {
      const value = { ...e };
      delete value.outcome;
      g.edges[e.id] = makeLink(value);
      repair('wf-bad-op', e.id, `Removed edit outcome on '${e.id}'; it must leave a human approve step.`, 'warn');
    }
  }
  const invalid = sorted(wf.nodes).filter((n) => invalidAttachment(wf, n));
  for (const n of invalid) {
    const value = { ...g.nodes[n.id] };
    delete value.on;
    if (n.on && own(g.nodes, n.on) && n.on !== n.id) {
      value.after = n.on;
      if (!Object.values(g.edges).some((e) => e.to === n.id)) {
        const id = allocateWorkflowId(`${n.on}-${n.id}`, (id) => !!(own(g.nodes, id) || own(g.edges, id) || own(g.groups, id)));
        if (Object.keys(g.edges).length < DEFAULT_WORKFLOW_LIMITS.maxEdges && !g.nodes[n.on].on) {
          g.edges[id] = makeLink({ id, from: n.on, to: n.id, kind: 'next' });
        } else warnings.push(W('wf-attach-form', [n.id],
          `Could not connect '${n.id}': edge limit reached or host is still attached.`, 'warn'));
      }
    }
    g.nodes[n.id] = makeStep(value);
    repair('wf-attach-form', n.id, `'${n.label}' (${n.id}) was moved inline because its attachment was invalid.`, 'warn');
  }
  // Convert all producers before checking approval subjects, regardless of their id order.
  for (const n of sorted(g.nodes)) {
    const model = n.ai ? models.model(n.ai) : undefined;
    if (n.kind !== 'tool' || n.on || !model?.out.some((m) => m === 'video' || m === 'image')) continue;
    const value: WorkflowNode = { ...n, kind: 'ai' };
    delete value.tool;
    g.nodes[n.id] = makeStep(value);
    repair('wf-bad-op', n.id,
      `'${n.label}' (${n.id}) now uses an ai step for ${model.id}; image/video generation is a model call, not a built-in tool.`, 'warn');
  }
  for (const n of sorted(g.nodes)) {
    const value = { ...n };
    if (n.effect !== undefined && !effectKind(n.kind)) {
      delete value.effect;
      repair('wf-bad-op', n.id, `Removed effect from '${n.id}'; only act, tool and memory steps carry effects.`,
        APPROVAL_POLICY[n.effect].approval ? 'warn' : 'info');
    }
    if (n.kind === 'agent' && n.turns === undefined) {
      value.turns = 10;
      repair('wf-agent-turns', n.id, `'${n.label}' (${n.id}) is limited to 10 model requests.`, 'info');
    }
    for (const key of danglingFields(g, n)) {
      delete value[key];
      repair('wf-dangling-ref', n.id, `Removed invalid ${key} '${n[key]}' from '${n.label}' (${n.id}).`, 'info');
    }
    g.nodes[n.id] = makeStep(value);
  }
  const repairMixedOut = (): void => {
    const edges = sorted(g.edges);
    for (const n of sorted(g.nodes)) {
      const outs = outgoing(edges, n.id);
      if (!outs.some((e) => (e.kind && e.kind !== 'next') || e.outcome)) continue;
      const next = outs.filter((e) => (!e.kind || e.kind === 'next') && !e.outcome);
      if (!next.length) continue;
      for (const e of next) g.edges[e.id] = makeLink({ ...e, kind: 'branch', label: e.label || 'otherwise' });
      const ids = next.map((e) => e.id);
      warnings.push(W('wf-mixed-out', [n.id, ...ids],
        `'${n.label}' (${n.id}): converted next links ${ids.map((id) => `'${id}'`).join(', ')} to branches.`, 'warn', true));
    }
  };
  repairMixedOut();
  const cycles = cycleLinks(g);
  for (const e of cycles) {
    g.edges[e.id] = makeLink({ ...e, kind: 'loop', max: 3 });
    repair('wf-cycle', e.id, `Link '${e.id}' now closes a loop with a maximum of 3 iterations.`, 'warn');
  }
  // A new loop can mix with remaining next links; resolve those in this call for idempotence.
  if (cycles.length) repairMixedOut();
  const workflow = warnings.length ? g : wf;
  return { workflow, warnings: [...warnings, ...checkWorkflow(workflow, catalog, models, settings)] };
}
