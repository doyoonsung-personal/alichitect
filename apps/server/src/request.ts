// Shape and limit checks for POST /api/turn bodies (TurnRequest). The body is untrusted JSON: every field is checked
// for type, length and count before it reaches the prompt builder, the reducer or the validator. Record keys must be
// valid element ids equal to the element's own id, which also rules out keys such as __proto__ and constructor.
// Pure: no I/O.
import type { Constraint, Graph, GraphEdge, GraphGroup, GraphNode, Recommendation, SessionMemory, TurnRequest, Turn } from '../../../packages/core/src/types.ts';
import { ID_PATTERN } from '../../../packages/core/src/reducer.ts';

export const LIMITS = {
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
  zones: 6,
  textChars: 400, // labels, why, edge labels and other short graph text
  sessionId: 128,
} as const;

/** Element and catalog ids, exactly as the reducer accepts them. */
const ID_RE = ID_PATTERN;
const REC_ID_RE = ID_PATTERN;
const SESSION_RE = /^[A-Za-z0-9_-]{1,128}$/;
const GROUP_KINDS = new Set(['external', 'edge', 'region', 'vpc', 'zone', 'subnet', 'onprem']);
const EDGE_KINDS = new Set(['data', 'async', 'control', 'resolve']);

export type RequestCheck = { ok: true; value: TurnRequest } | { ok: false; code: 'bad-request'; message: string };

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
    return { ok: true, value: { sessionId, ask, memory: memory(own(o, 'memory'), 'memory') } };
  } catch (e) {
    if (e instanceof Bad) return { ok: false, code: 'bad-request', message: e.message };
    return { ok: false, code: 'bad-request', message: 'invalid request body' };
  }
}
