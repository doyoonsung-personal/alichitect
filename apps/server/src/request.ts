// Shape and limit checks for POST /api/turn bodies (TurnRequest) and POST /api/proposal bodies (ProposalRequest). The body is untrusted JSON: every field is checked
// for type, length and count before it reaches the prompt builder, the reducer or the validator. Record keys must be
// valid element ids equal to the element's own id, which also rules out keys such as __proto__ and constructor.
// Pure: no I/O.
import type { Constraint, Graph, GraphEdge, GraphGroup, GraphNode, ProposalRequest, Recommendation, SessionMemory, TurnRequest, Turn } from '../../../packages/core/src/types.ts';
import type {
  TurnMode, WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowGroup, WorkflowSettings, WorkflowEstimateSettings,
} from '../../../packages/core/src/types.ts';
import { DEFAULT_WORKFLOW_LIMITS } from '../../../packages/core/src/workflow.ts';
import { createModelTable, WORKFLOW_TASKS } from '../../../packages/core/src/models.ts';
import type { ModelFile } from '../../../packages/core/src/models.ts';
import { normalizeId, ID_PATTERN } from '../../../packages/core/src/reducer.ts';
import modelsFile from '../../../packages/core/catalog/models.json' with { type: 'json' };
import products from '../../../packages/core/catalog/products.json' with { type: 'json' };
import offerings from '../../../packages/core/catalog/offerings.json' with { type: 'json' };
import { createCatalog } from '../../../packages/core/src/catalog.ts';
import type { CatalogFile } from '../../../packages/core/src/catalog.ts';
import { resolveProduct } from '../../../packages/core/src/validate.ts';
import { ASK_LIMITS } from '../../../packages/core/src/asks.ts';

export const LIMITS = {
  workflowNodes: DEFAULT_WORKFLOW_LIMITS.maxNodes,
  workflowEdges: DEFAULT_WORKFLOW_LIMITS.maxEdges,
  workflowGroups: DEFAULT_WORKFLOW_LIMITS.maxGroups,
  workflowTombstones: 80,
  askChars: 6000, // code points of the new message
  turns: 200,
  turnChars: 20000, // one stored turn (assistant turns hold several say lines)
  changesChars: 2000,
  summaryChars: 4000,
  requirements: 40,
  requirementChars: 300,
  constraints: 40,
  constraintRegions: 20,
  constraintAvoid: 40,
  nodes: 150,
  edges: 400,
  groups: 80,
  recs: 40,
  tombstones: 300,
  assumptions: 12, // memory.assumptions as the browser sends it back (the server keeps at most ASK_LIMITS.assumptionsKept)
  questions: 4, // memory.questions (the server keeps at most ASK_LIMITS.askPerTurn)
  zones: 6,
  textChars: 400, // labels, why, edge labels and other short graph text
  sessionId: 128,
  proposalTitle: 160, // code points of the export dialog's cover title
  proposalCustomer: 80, // and of its customer name
} as const;

// Six bytes per code point covers JSON escapes; the envelope includes a maximum session id.
export const TURN_MEMORY_BUDGET = 512 * 1024 - LIMITS.askChars * 6 - 1024;
export const memoryBytes = (memory: SessionMemory): number => new TextEncoder().encode(JSON.stringify(memory)).byteLength;
const workflowModels = createModelTable(modelsFile as ModelFile);
const workflowCatalog = createCatalog(products as unknown as CatalogFile, offerings as unknown as CatalogFile);

/** Element and catalog ids, exactly as the reducer accepts them. */
const ID_RE = ID_PATTERN;
const REC_ID_RE = ID_PATTERN;
const SESSION_RE = /^[A-Za-z0-9_-]{1,128}$/;
const GROUP_KINDS = new Set(['external', 'edge', 'region', 'vpc', 'zone', 'subnet', 'onprem']);
const EDGE_KINDS = new Set(['data', 'async', 'control', 'resolve']);

export type RequestCheck = { ok: true; value: TurnRequest } | { ok: false; code: 'bad-request'; message: string };
export type ProposalCheck = { ok: true; value: ProposalRequest } | { ok: false; code: 'bad-request'; message: string };

class Bad extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o: Record<string, unknown>, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const cps = (s: string): number => {
  let n = 0;
  for (const _ of s) n++;
  return n;
};

function fail(path: string, what: string): never {
  throw new Bad(`${path}: ${what}`);
}

function str(v: unknown, path: string, max: number, opts: { optional?: boolean; nonEmpty?: boolean } = {}): string | undefined {
  if (v === undefined && opts.optional) return undefined;
  if (typeof v !== 'string') fail(path, 'expected a string');
  if (v.length > max * 2 || cps(v) > max) fail(path, `longer than ${max} characters`);
  if (opts.nonEmpty && !v.trim()) fail(path, 'must not be empty');
  return v;
}

function arr(v: unknown, path: string, max: number, optional = false): unknown[] | undefined {
  if (v === undefined && optional) return undefined;
  if (!Array.isArray(v)) fail(path, 'expected an array');
  if (v.length > max) fail(path, `more than ${max} items`);
  return v;
}

function obj(v: unknown, path: string): Record<string, unknown> {
  if (!isObj(v)) fail(path, 'expected an object');
  return v;
}

function id(v: unknown, path: string): string {
  if (typeof v !== 'string' || !ID_RE.test(v)) fail(path, 'expected a lowercase kebab-case id');
  return v;
}

function nullableId(v: unknown, path: string): string | null {
  if (v === null || v === undefined) return null;
  return id(v, path);
}

function record<T>(v: unknown, path: string, max: number, item: (x: unknown, p: string) => T & { id: string }): Record<string, T> {
  const o = obj(v, path);
  const keys = Object.keys(o);
  if (keys.length > max) fail(path, `more than ${max} entries`);
  const out: Record<string, T> = {};
  for (const k of keys) {
    if (!ID_RE.test(k)) fail(`${path}`, `invalid key '${k.slice(0, 40)}'`);
    const x = item(o[k], `${path}.${k}`);
    if (x.id !== k) fail(`${path}.${k}`, 'key must equal the element id');
    Object.defineProperty(out, k, { value: x, enumerable: true, writable: true, configurable: true });
  }
  return out;
}

function group(v: unknown, p: string): GraphGroup {
  const o = obj(v, p);
  const kind = own(o, 'kind');
  if (typeof kind !== 'string' || !GROUP_KINDS.has(kind)) fail(`${p}.kind`, 'unknown group kind');
  return { id: id(own(o, 'id'), `${p}.id`), kind: kind as GraphGroup['kind'], label: str(own(o, 'label'), `${p}.label`, LIMITS.textChars)!, parent: nullableId(own(o, 'parent'), `${p}.parent`) };
}

function node(v: unknown, p: string): GraphNode {
  const o = obj(v, p);
  const n: GraphNode = {
    id: id(own(o, 'id'), `${p}.id`),
    product: id(own(o, 'product'), `${p}.product`),
    label: str(own(o, 'label'), `${p}.label`, LIMITS.textChars)!,
    group: nullableId(own(o, 'group'), `${p}.group`),
  };
  const zones = arr(own(o, 'zones'), `${p}.zones`, LIMITS.zones, true);
  if (zones) n.zones = zones.map((z, i) => str(z, `${p}.zones[${i}]`, 8)!);
  const attachTo = own(o, 'attachTo');
  if (attachTo !== undefined && attachTo !== null) n.attachTo = id(attachTo, `${p}.attachTo`);
  const why = str(own(o, 'why'), `${p}.why`, LIMITS.textChars, { optional: true });
  if (why !== undefined) n.why = why;
  return n;
}

function edge(v: unknown, p: string): GraphEdge {
  const o = obj(v, p);
  const e: GraphEdge = { id: id(own(o, 'id'), `${p}.id`), from: id(own(o, 'from'), `${p}.from`), to: id(own(o, 'to'), `${p}.to`) };
  const label = str(own(o, 'label'), `${p}.label`, LIMITS.textChars, { optional: true });
  if (label !== undefined) e.label = label;
  const kind = own(o, 'kind');
  if (kind !== undefined) {
    if (typeof kind !== 'string' || !EDGE_KINDS.has(kind)) fail(`${p}.kind`, 'unknown edge kind');
    e.kind = kind as GraphEdge['kind'];
  }
  return e;
}

function rec(v: unknown, p: string): Recommendation {
  const o = obj(v, p);
  const product = own(o, 'product');
  if (typeof product !== 'string' || !REC_ID_RE.test(product)) fail(`${p}.product`, 'expected a catalog id');
  const fit = own(o, 'fit');
  if (fit !== 'primary' && fit !== 'complement') fail(`${p}.fit`, "expected 'primary' or 'complement'");
  return { product, fit, why: str(own(o, 'why'), `${p}.why`, LIMITS.textChars)! };
}

function graph(v: unknown, p: string): Graph {
  const o = obj(v, p);
  return {
    groups: record(own(o, 'groups'), `${p}.groups`, LIMITS.groups, group),
    nodes: record(own(o, 'nodes'), `${p}.nodes`, LIMITS.nodes, node),
    edges: record(own(o, 'edges'), `${p}.edges`, LIMITS.edges, edge),
    recs: (arr(own(o, 'recs') ?? [], `${p}.recs`, LIMITS.recs) ?? []).map((r, i) => rec(r, `${p}.recs[${i}]`)),
  };
}

function tombstone(v: unknown, p: string): GraphNode | GraphEdge | GraphGroup {
  const o = obj(v, p);
  if (own(o, 'product') !== undefined) return node(o, p);
  if (own(o, 'from') !== undefined) return edge(o, p);
  return group(o, p);
}

function turn(v: unknown, p: string): Turn {
  const o = obj(v, p);
  const role = own(o, 'role');
  if (role !== 'user' && role !== 'assistant') fail(`${p}.role`, "expected 'user' or 'assistant'");
  const t: Turn = { role, text: str(own(o, 'text'), `${p}.text`, LIMITS.turnChars)! };
  const changes = str(own(o, 'changes'), `${p}.changes`, LIMITS.changesChars, { optional: true });
  if (changes !== undefined) t.changes = changes;
  if (own(o, 'mode') !== undefined) t.mode = mode(own(o, 'mode'), `${p}.mode`);
  return t;
}

function constraint(v: unknown, p: string): Constraint {
  const o = obj(v, p);
  const c: Constraint = { text: str(own(o, 'text'), `${p}.text`, LIMITS.requirementChars, { nonEmpty: true })! };
  const regions = arr(own(o, 'regions'), `${p}.regions`, LIMITS.constraintRegions, true);
  if (regions) c.regions = regions.map((r, i) => str(r, `${p}.regions[${i}]`, 40)!);
  const avoid = arr(own(o, 'avoid'), `${p}.avoid`, LIMITS.constraintAvoid, true);
  if (avoid) c.avoid = avoid.map((a, i) => id(a, `${p}.avoid[${i}]`));
  return c;
}

/** Clips to `max` code points, one line, no control characters. Text beyond the spec limit is cut, not rejected: the browser echoes what the server committed, and a cosmetic field must not fail a turn. */
function note(v: unknown, p: string, max: number): string {
  if (typeof v !== 'string') fail(p, 'expected a string');
  const one = v.slice(0, max * 4).replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(one).slice(0, max).join('').trim();
}

function assumptions(v: unknown, p: string): NonNullable<SessionMemory['assumptions']> {
  const out: NonNullable<SessionMemory['assumptions']> = [];
  for (const [i, x] of arr(v, p, LIMITS.assumptions)!.entries()) {
    const o = obj(x, `${p}[${i}]`);
    const a: { id: string; text: string; alt?: string } = { id: id(own(o, 'id'), `${p}[${i}].id`), text: note(own(o, 'text'), `${p}[${i}].text`, ASK_LIMITS.assumeText) };
    const alt = own(o, 'alt');
    if (alt !== undefined && alt !== null) {
      const t = note(alt, `${p}[${i}].alt`, ASK_LIMITS.assumeAlt);
      if (t) a.alt = t;
    }
    if (a.text) out.push(a);
  }
  return out.slice(-ASK_LIMITS.assumptionsKept);
}

function questions(v: unknown, p: string): NonNullable<SessionMemory['questions']> {
  const out: NonNullable<SessionMemory['questions']> = [];
  for (const [i, x] of arr(v, p, LIMITS.questions)!.entries()) {
    const o = obj(x, `${p}[${i}]`);
    const q: { id: string; text: string; options?: string[] } = { id: id(own(o, 'id'), `${p}[${i}].id`), text: note(own(o, 'text'), `${p}[${i}].text`, ASK_LIMITS.askText) };
    const raw = own(o, 'options');
    if (raw !== undefined && raw !== null) {
      const opts = [...new Set(arr(raw, `${p}[${i}].options`, 20)!.map((x2, j) => note(x2, `${p}[${i}].options[${j}]`, ASK_LIMITS.optionText)).filter(Boolean))].slice(0, ASK_LIMITS.optionsMax);
      if (opts.length >= ASK_LIMITS.optionsMin) q.options = opts;
    }
    if (q.text) out.push(q);
  }
  return out.slice(0, ASK_LIMITS.askPerTurn);
}

function memory(v: unknown, p: string): SessionMemory {
  const o = obj(v, p);
  const m: SessionMemory = {
    turns: arr(own(o, 'turns'), `${p}.turns`, LIMITS.turns)!.map((t, i) => turn(t, `${p}.turns[${i}]`)),
    requirements: arr(own(o, 'requirements'), `${p}.requirements`, LIMITS.requirements)!.map((r, i) => str(r, `${p}.requirements[${i}]`, LIMITS.requirementChars, { nonEmpty: true })!),
    graph: graph(own(o, 'graph'), `${p}.graph`),
    tombstones: (arr(own(o, 'tombstones') ?? [], `${p}.tombstones`, LIMITS.tombstones) ?? []).map((t, i) => tombstone(t, `${p}.tombstones[${i}]`)),
  };
  const summary = str(own(o, 'summary'), `${p}.summary`, LIMITS.summaryChars, { optional: true });
  if (summary !== undefined) m.summary = summary;
  const constraints = arr(own(o, 'constraints'), `${p}.constraints`, LIMITS.constraints, true);
  if (constraints) m.constraints = constraints.map((c, i) => constraint(c, `${p}.constraints[${i}]`));
  // Draw first, then ask: the assumptions the diagram rests on and the questions the last reply asked. They reach the
  // final user message (prompt.ts), so they are rebuilt from known fields, clipped, and never copied as they came.
  const asm = own(o, 'assumptions');
  if (asm !== undefined && asm !== null) {
    const list = assumptions(asm, `${p}.assumptions`);
    if (list.length) m.assumptions = list;
  }
  const qs = own(o, 'questions');
  if (qs !== undefined && qs !== null) {
    const list = questions(qs, `${p}.questions`);
    if (list.length) m.questions = list;
  }
  if (own(o, 'workflow') !== undefined) m.workflow = workflow(own(o, 'workflow'), `${p}.workflow`);
  if (own(o, 'workflowTombstones') !== undefined) {
    m.workflowTombstones = arr(own(o, 'workflowTombstones'), `${p}.workflowTombstones`, LIMITS.workflowTombstones)!
      .map((x, i) => workflowTombstone(x, `${p}.workflowTombstones[${i}]`));
  }
  if (own(o, 'workflowSettings') !== undefined) m.workflowSettings = workflowSettings(own(o, 'workflowSettings'), `${p}.workflowSettings`);
  if (own(o, 'estimate') !== undefined) m.estimate = estimate(own(o, 'estimate'), `${p}.estimate`);
  return m;
}

/**
 * Checks a parsed POST /api/turn body. On success the value is a fresh copy built only from known fields, so unknown
 * fields (and anything hiding in them) never reach the turn. The error message names the first offending field.
 */
export function checkTurnRequest(body: unknown): RequestCheck {
  try {
    const o = obj(body, 'body');
    const sessionId = own(o, 'sessionId');
    if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) fail('sessionId', `expected 1-${LIMITS.sessionId} characters of A-Z, a-z, 0-9, _ or -`);
    const ask = str(own(o, 'ask'), 'ask', LIMITS.askChars, { nonEmpty: true })!;
    const turnMode = mode(own(o, 'mode'), 'mode');
    const parsed = memory(own(o, 'memory'), 'memory');
    if (parsed.workflow || turnMode === 'workflow') {
      const retained = { ...parsed, turns: [], tombstones: [], workflowTombstones: [] };
      if (memoryBytes(retained) > TURN_MEMORY_BUDGET) fail('memory', 'retained documents exceed the next-request budget');
    }
    return { ok: true, value: { sessionId, ask, mode: turnMode, memory: parsed } };
  } catch (e) {
    if (e instanceof Bad) return { ok: false, code: 'bad-request', message: e.message };
    return { ok: false, code: 'bad-request', message: 'invalid request body' };
  }
}

/**
 * Checks a parsed POST /api/proposal body: the same session and memory checks as a turn, plus the PDF language and the
 * export dialog's cover fields. On success the value is a fresh copy built only from known fields.
 */
export function checkProposalRequest(body: unknown): ProposalCheck {
  try {
    const o = obj(body, 'body');
    const sessionId = own(o, 'sessionId');
    if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) fail('sessionId', `expected 1-${LIMITS.sessionId} characters of A-Z, a-z, 0-9, _ or -`);
    const lang = own(o, 'lang');
    if (lang !== 'en' && lang !== 'ko' && lang !== 'zh') fail('lang', "expected 'en', 'ko' or 'zh'");
    const title = str(own(o, 'title') ?? '', 'title', LIMITS.proposalTitle)!;
    const customer = str(own(o, 'customer') ?? '', 'customer', LIMITS.proposalCustomer)!;
    return { ok: true, value: { sessionId, lang, title, customer, memory: memory(own(o, 'memory'), 'memory') } };
  } catch (e) {
    if (e instanceof Bad) return { ok: false, code: 'bad-request', message: e.message };
    return { ok: false, code: 'bad-request', message: 'invalid request body' };
  }
}

// Workflow documents have their own grammar and tombstones; none pass through cloud node parsing.
function mode(v: unknown, p: string): TurnMode {
  if (v === undefined) return 'cloud';
  return choice(v, p, ['cloud', 'workflow']);
}

function choice<const T extends string>(v: unknown, p: string, values: readonly T[]): T {
  if (typeof v !== 'string' || !values.includes(v as T)) fail(p, 'unknown value');
  return v as T;
}

function number(v: unknown, p: string, max: number, min = 0, integer = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    fail(p, `expected ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`);
  }
  return v;
}

function bool(v: unknown, p: string): boolean {
  if (typeof v !== 'boolean') fail(p, 'expected a boolean');
  return v;
}

const EFFECTS = ['read', 'write', 'reply', 'notify', 'send', 'publish', 'pay', 'delete', 'admin', 'decide'] as const;

function workflowId(v: unknown, p: string): string {
  const value = id(v, p);
  if (normalizeId(value) !== value) fail(p, 'expected a canonical workflow id');
  return value;
}

function workflowNode(v: unknown, p: string): WorkflowNode {
  const o = obj(v, p);
  const n: WorkflowNode = {
    id: workflowId(own(o, 'id'), `${p}.id`),
    kind: choice(own(o, 'kind'), `${p}.kind`, ['trigger', 'ai', 'agent', 'decide', 'guard', 'human', 'act', 'tool', 'knowledge', 'memory', 'end']),
    label: str(own(o, 'label'), `${p}.label`, LIMITS.textChars)!,
  };
  const put = (k: keyof WorkflowNode, parse: (x: unknown, path: string) => unknown): void => {
    if (own(o, k) !== undefined) Object.assign(n, { [k]: parse(own(o, k), `${p}.${k}`) });
  };
  put('task', (x, path) => choice(x, path, WORKFLOW_TASKS));
  for (const k of ['after', 'on', 'subject', 'repeat'] as const) put(k, workflowId);
  for (const k of ['product', 'runs', 'ai', 'tool'] as const) {
    if (own(o, k) === undefined) continue;
    const value = str(own(o, k), `${p}.${k}`, 80, { nonEmpty: true })!;
    const ref = k === 'product' || k === 'runs'
      ? k === 'runs' && value === 'customer' ? value : resolveProduct(workflowCatalog, value, [n.id]).entry?.id
      : k === 'ai' ? workflowModels.model(value.trim())?.id : workflowModels.tool(value.trim())?.id;
    if (ref) n[k] = ref;
  }
  put('turns', (x, path) => number(x, path, 50, 1, true));
  put('effect', (x, path) => choice(x, path, EFFECTS));
  for (const k of ['untrusted', 'private'] as const) put(k, bool);
  put('approval', (x, path) => choice(x, path, ['required', 'skip']));
  put('join', (x, path) => choice(x, path, ['all', 'any']));
  put('why', (x, path) => str(x, path, LIMITS.textChars));
  return n;
}

function workflowEdge(v: unknown, p: string): WorkflowEdge {
  const o = obj(v, p);
  const e: WorkflowEdge = {
    id: workflowId(own(o, 'id'), `${p}.id`),
    from: workflowId(own(o, 'from'), `${p}.from`),
    to: workflowId(own(o, 'to'), `${p}.to`),
  };
  if (own(o, 'kind') !== undefined) e.kind = choice(o.kind, `${p}.kind`, ['next', 'branch', 'loop', 'escalate']);
  if (own(o, 'label') !== undefined) e.label = str(o.label, `${p}.label`, LIMITS.textChars)!;
  if (own(o, 'max') !== undefined) e.max = number(o.max, `${p}.max`, 20, 1, true);
  if (own(o, 'outcome') !== undefined) e.outcome = choice(o.outcome, `${p}.outcome`, ['approve', 'edit', 'reject', 'timeout', 'exhausted']);
  return e;
}

function workflowGroup(v: unknown, p: string): WorkflowGroup {
  const o = obj(v, p);
  const g: WorkflowGroup = { id: workflowId(own(o, 'id'), `${p}.id`), over: str(own(o, 'over'), `${p}.over`, LIMITS.textChars)! };
  if (own(o, 'parallel') !== undefined) g.parallel = bool(o.parallel, `${p}.parallel`);
  return g;
}

function workflow(v: unknown, p: string): WorkflowGraph {
  const o = obj(v, p);
  return {
    nodes: record(own(o, 'nodes'), `${p}.nodes`, LIMITS.workflowNodes, workflowNode),
    edges: record(own(o, 'edges'), `${p}.edges`, LIMITS.workflowEdges, workflowEdge),
    groups: record(own(o, 'groups'), `${p}.groups`, LIMITS.workflowGroups, workflowGroup),
  };
}

function workflowTombstone(v: unknown, p: string): WorkflowNode | WorkflowEdge | WorkflowGroup {
  const o = obj(v, p);
  if (own(o, 'from') !== undefined) return workflowEdge(o, p);
  if (own(o, 'over') !== undefined) return workflowGroup(o, p);
  return workflowNode(o, p);
}

function workflowSettings(v: unknown, p: string): WorkflowSettings {
  const o = obj(v, p);
  const out: WorkflowSettings = {};
  if (own(o, 'region') !== undefined) out.region = workflowId(o.region, `${p}.region`);
  for (const k of ['approvalOff', 'approvalOn'] as const) {
    if (own(o, k) !== undefined) out[k] = arr(o[k], `${p}.${k}`, EFFECTS.length)!.map((x, i) => choice(x, `${p}.${k}[${i}]`, EFFECTS));
  }
  return out;
}

function estimate(v: unknown, p: string): WorkflowEstimateSettings {
  const o = obj(v, p);
  const out: WorkflowEstimateSettings = {};
  if (own(o, 'runsPerMonth') !== undefined) out.runsPerMonth = number(o.runsPerMonth, `${p}.runsPerMonth`, 1e9, 0, true);
  if (own(o, 'scope') !== undefined) out.scope = choice(o.scope, `${p}.scope`, ['international', 'global']);
  for (const k of ['steps', 'items', 'shares', 'loops', 'agents', 'guardTypes'] as const) {
    if (own(o, k) === undefined) continue;
    const map = obj(o[k], `${p}.${k}`);
    const max = k === 'items' ? LIMITS.workflowGroups : k === 'shares' || k === 'loops' ? LIMITS.workflowEdges : LIMITS.workflowNodes;
    if (Object.keys(map).length > max) fail(`${p}.${k}`, `more than ${max} entries`);
    const parsed: Record<string, unknown> = {};
    for (const key of Object.keys(map)) {
      const path = `${p}.${k}.${key}`;
      workflowId(key, path);
      if (k === 'shares' || k === 'guardTypes') {
        parsed[key] = number(map[key], path, k === 'shares' ? 1 : 3, 0, k === 'guardTypes');
        continue;
      }
      const value = obj(map[key], path);
      const item: Record<string, unknown> = {};
      const fields = k === 'steps' ? ['inTokens', 'outTokens', 'thinking', 'offline']
        : k === 'agents' ? ['typical', 'upper', 'resultTokens', 'searchesPerRequest'] : ['typical', 'upper'];
      for (const field of fields) {
        if (own(value, field) === undefined) continue;
        item[field] = field === 'thinking' || field === 'offline' ? bool(value[field], `${path}.${field}`)
          : number(value[field], `${path}.${field}`, 1e9);
      }
      parsed[key] = item;
    }
    Object.assign(out, { [k]: parsed });
  }
  return out;
}
