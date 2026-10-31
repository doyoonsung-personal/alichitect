// Protocol core: NDJSON parser, reducer, validator and repair, unit tests plus replay of the recorded model streams
// in research/probes/streams.json (qwen3.8-max/flash, 2026-10-30) against the probe mini catalog fixture.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ApplyResult, Catalog, CatalogEntry, Graph, GraphEdge, GraphGroup, GraphNode, Op, Resolution, Warning } from '../src/types.ts';
import { createLineParser } from '../src/ndjson.ts';
import { applyOp, cloneCtx, createCtx, emptyGraph, endTurn } from '../src/reducer.ts';
import type { ApplyCtx } from '../src/reducer.ts';
import { checkGraph, ingestGraph, repairGraph, validateOp } from '../src/validate.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const STREAMS = JSON.parse(readFileSync(path.join(ROOT, 'research/probes/streams.json'), 'utf8'));
const FIXTURE = JSON.parse(readFileSync(path.join(HERE, 'fixtures/probe-catalog.json'), 'utf8'));
const ID_MAP: Record<string, string> = JSON.parse(readFileSync(path.join(HERE, 'fixtures/probe-id-map.json'), 'utf8'));

interface Stream {
  label: string;
  description: string;
  lineTimes: Array<[number, string]>;
}
const STREAM_LIST: Stream[] = STREAMS.streams;
const LINES: Record<string, string[]> = Object.fromEntries(STREAM_LIST.map((s) => [s.label, s.lineTimes.map((x) => x[1])]));
const INITIAL = ['F_max_nothink', 'E_flash_default', 'G_max_budget1k', 'H_flash_nothink', 'P1_team_grounded'];
const FOLLOW_UPS = ['B2_followup_waf_nothink', 'B3_k8s', 'B4_dw', 'B5_drop_ai'];

// ---------- helpers ----------

/** Minimal Catalog over fixture entries: exact id, then case-insensitive name/short/alias, then successor of a retired entry. */
function makeCatalog(entries: CatalogEntry[], version = 'fixture'): Catalog {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const byName = new Map<string, CatalogEntry>();
  for (const e of entries) {
    for (const n of [e.name, e.short, ...e.aliases]) if (!byName.has(n.toLowerCase())) byName.set(n.toLowerCase(), e);
  }
  return {
    version,
    entries,
    byId,
    resolve(q: string): Resolution {
      let entry = byId.get(q);
      let via: Resolution['via'] = 'id';
      if (!entry) {
        entry = byName.get(q.trim().toLowerCase());
        via = 'alias';
      }
      if (!entry) return {};
      if (entry.status === 'retired' && entry.successor && byId.has(entry.successor)) return { entry: byId.get(entry.successor), via: 'successor' };
      return { entry, via };
    },
    promptRows: () => entries.map((e) => [e.id, e.name, e.scope, e.lane, e.pathRank ?? '', e.purpose].join(' | ')).join('\n'),
  };
}

const CAT = makeCatalog(FIXTURE.entries, FIXTURE.version);

function entry(id: string, over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id,
    name: id,
    short: id.slice(0, 18),
    aliases: [],
    kind: 'service',
    category: 'Test',
    icon: 'generic',
    scope: 'region',
    lane: 'integration',
    status: 'ga',
    availability: 'intl',
    purpose: 'test entry',
    verified: '2026-10-31',
    ...over,
  };
}

const byCode = (ws: Warning[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const w of ws) out[w.code] = (out[w.code] ?? 0) + 1;
  return out;
};
const codes = (ws: Warning[], code: string): Warning[] => ws.filter((w) => w.code === code);

interface Parsed {
  ops: unknown[];
  lines: string[];
  bad: string[];
}

function parseChunks(chunks: string[]): Parsed {
  const out: Parsed = { ops: [], lines: [], bad: [] };
  const p = createLineParser({
    onOp(raw, line) {
      out.ops.push(raw);
      out.lines.push(line);
    },
    onBad(line) {
      out.bad.push(line);
    },
  });
  for (const c of chunks) p.push(c);
  p.end();
  return out;
}
const parseAll = (text: string): Parsed => parseChunks([text]);

/** Deterministic PRNG (mulberry32) so random splits are reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Replay {
  graph: Graph;
  ctx: ApplyCtx;
  bad: string[];
  ops: Op[];
  streamWarnings: Warning[];
  results: ApplyResult[];
  tombstones: Array<GraphNode | GraphEdge | GraphGroup>;
}

/** parser -> validateOp -> applyOp, as the server and browser run it. A copy of `start.ctx` is used. */
function replay(lines: string[], catalog: Catalog, start?: { graph: Graph; ctx: ApplyCtx }, mapRaw?: (raw: unknown) => unknown): Replay {
  const ctx = start ? cloneCtx(start.ctx) : createCtx();
  const out: Replay = { graph: start ? start.graph : emptyGraph(), ctx, bad: [], ops: [], streamWarnings: [], results: [], tombstones: [] };
  let sawDone = false;
  const p = createLineParser({
    onOp(raw) {
      const v = validateOp(mapRaw ? mapRaw(raw) : raw, catalog, ctx);
      out.streamWarnings.push(...v.warnings);
      if (!v.op) return;
      out.ops.push(v.op);
      if (v.op.t === 'done') sawDone = true;
      const r = applyOp(out.graph, v.op, ctx);
      out.graph = r.graph;
      out.results.push(r);
      out.streamWarnings.push(...r.warnings);
      out.tombstones.push(...r.tombstones);
    },
    onBad(line) {
      out.bad.push(line);
    },
  });
  p.push(lines.join('\n') + '\n');
  p.end();
  if (!sawDone) out.streamWarnings.push(...endTurn(out.graph, ctx).warnings);
  return out;
}

/** Applies ops (validated against the fixture catalog) to build a small graph. */
function build(ops: unknown[], catalog: Catalog = CAT): { graph: Graph; ctx: ApplyCtx; warnings: Warning[] } {
  const ctx = createCtx();
  let graph = emptyGraph();
  const warnings: Warning[] = [];
  for (const raw of ops) {
    const v = validateOp(raw, catalog, ctx);
    warnings.push(...v.warnings);
    if (!v.op) continue;
    const r = applyOp(graph, v.op, ctx);
    graph = r.graph;
    warnings.push(...r.warnings);
  }
  warnings.push(...endTurn(graph, ctx).warnings);
  return { graph, ctx, warnings };
}

interface Diff {
  added: string[];
  removed: string[];
  changed: string[];
}
function diff(a: Graph, b: Graph): { groups: Diff; nodes: Diff; edges: Diff } {
  const one = (A: Record<string, unknown>, B: Record<string, unknown>): Diff => ({
    added: Object.keys(B).filter((k) => !Object.hasOwn(A, k)).sort(),
    removed: Object.keys(A).filter((k) => !Object.hasOwn(B, k)).sort(),
    changed: Object.keys(B)
      .filter((k) => Object.hasOwn(A, k) && JSON.stringify(A[k]) !== JSON.stringify(B[k]))
      .sort(),
  });
  return { groups: one(a.groups, b.groups), nodes: one(a.nodes, b.nodes), edges: one(a.edges, b.edges) };
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

const node = (id: string, product: string, group: string | null = null, extra: Record<string, unknown> = {}) => ({ t: 'node', id, product, label: id, group, ...extra });
const edge = (id: string, from: string, to: string, extra: Record<string, unknown> = {}) => ({ t: 'edge', id, from, to, ...extra });
const group = (id: string, kind: string, parent: string | null = null, label = id) => ({ t: 'group', id, kind, label, parent });

// ---------- NDJSON parser ----------

describe('ndjson parser', () => {
  test('emits one object per line with its source line', () => {
    const r = parseAll('{"t":"say","text":"a"}\n{"t":"done","summary":"x"}\n');
    assert.deepEqual(r.ops, [{ t: 'say', text: 'a' }, { t: 'done', summary: 'x' }]);
    assert.deepEqual(r.lines, ['{"t":"say","text":"a"}', '{"t":"done","summary":"x"}']);
    assert.equal(r.bad.length, 0);
  });

  test('tolerates blank lines, code fences, CRLF, a BOM and array brackets', () => {
    const text = '﻿```json\r\n[\r\n{"t":"say","text":"a"},\r\n\r\n   \r\n{"t":"done","summary":"b"}\r\n]\r\n```\r\n';
    const r = parseAll(text);
    assert.deepEqual(r.ops, [{ t: 'say', text: 'a' }, { t: 'done', summary: 'b' }]);
    assert.equal(r.bad.length, 0);
  });

  test('extracts objects from prose on the same line and splits several objects on one line', () => {
    const r = parseAll(
      'Here you go: {"t":"say","text":"hi {braces} \\"q\\""} hope it helps\n' +
        '{"t":"node","id":"a","product":"ecs","label":"A"} {"t":"node","id":"b","product":"ecs","label":"B"}\n',
    );
    assert.equal(r.ops.length, 3);
    assert.deepEqual(r.ops[0], { t: 'say', text: 'hi {braces} "q"' });
    assert.equal(r.bad.length, 0);
  });

  test('reports malformed lines and plain prose, then keeps going', () => {
    const r = parseAll('{"t":"say","text":"He said "hi""}\nJust prose here\n{"t":"done","summary":"ok"}\n');
    assert.deepEqual(r.ops, [{ t: 'done', summary: 'ok' }]);
    assert.equal(r.bad.length, 2);
  });

  test('joins a pretty-printed object that spans lines', () => {
    const r = parseAll('{\n  "t": "say",\n  "text": "multi"\n}\n{"t":"done","summary":"x"}\n');
    assert.deepEqual(r.ops, [{ t: 'say', text: 'multi' }, { t: 'done', summary: 'x' }]);
    assert.equal(r.bad.length, 0);
  });

  test('a truncated object does not swallow the next line; a missing closing brace is repaired', () => {
    const cut = parseAll('{"t":"say","text":"cut off\n{"t":"done","summary":"x"}\n');
    assert.deepEqual(cut.ops, [{ t: 'done', summary: 'x' }]);
    assert.equal(cut.bad.length, 1);
    const brace = parseAll('{"t":"node","id":"a","product":"ecs","label":"A"\n{"t":"done","summary":"x"}\n');
    assert.deepEqual(brace.ops, [{ t: 'node', id: 'a', product: 'ecs', label: 'A' }, { t: 'done', summary: 'x' }]);
    assert.equal(brace.bad.length, 0);
  });

  test('end() flushes a last line that has no newline', () => {
    const seen: unknown[] = [];
    const p = createLineParser({ onOp: (o) => seen.push(o) });
    p.push('{"t":"done",');
    p.push('"summary":"x"}');
    assert.equal(seen.length, 0);
    p.end();
    assert.deepEqual(seen, [{ t: 'done', summary: 'x' }]);
  });

  test('partialSay types a say op while it streams, decoding escapes', () => {
    const seen: unknown[] = [];
    const p = createLineParser({ onOp: (o) => seen.push(o) });
    assert.equal(p.partialSay(), null);
    p.push('{"t":"say","te');
    assert.equal(p.partialSay(), null);
    p.push('xt":"');
    assert.equal(p.partialSay(), '');
    p.push('Hello \\"wor');
    assert.equal(p.partialSay(), 'Hello "wor');
    p.push('ld\\" \\u00e9\\u');
    assert.equal(p.partialSay(), 'Hello "world" é');
    p.push('00e9 \\ud83d');
    assert.equal(p.partialSay(), 'Hello "world" éé ');
    p.push('\\ude80!"}');
    assert.equal(p.partialSay(), 'Hello "world" éé \u{1F680}!');
    p.push('\n');
    assert.equal(p.partialSay(), null);
    assert.deepEqual(seen, [{ t: 'say', text: 'Hello "world" éé \u{1F680}!' }]);
    p.push('{"t": "say", "text": "spaced');
    assert.equal(p.partialSay(), 'spaced');
    p.push('"}\n{"t":"node","id":"x","why":"{\\"t\\":\\"say\\""');
    assert.equal(p.partialSay(), null);
  });

  for (const s of STREAM_LIST) {
    test(`random chunk splits of ${s.label} (50 trials) give identical output; partialSay is a prefix of the say text`, () => {
      const lines = LINES[s.label];
      const content = lines.join('\n') + '\n';
      const ref = JSON.stringify(parseAll(content));
      const refCrlf = parseAll(lines.join('\r\n') + '\r\n');
      assert.equal(JSON.stringify(refCrlf.ops), JSON.stringify(parseAll(content).ops), 'CRLF changes nothing');
      const rand = rng(0x5eed + lines.length);
      let partialChecks = 0;
      for (let trial = 0; trial < 50; trial++) {
        const out: Parsed = { ops: [], lines: [], bad: [] };
        const p = createLineParser({
          onOp(raw, line) {
            out.ops.push(raw);
            out.lines.push(line);
          },
          onBad(line) {
            out.bad.push(line);
          },
        });
        let pos = 0;
        while (pos < content.length) {
          const n = 1 + Math.floor(rand() * (trial % 2 ? 8 : 64));
          p.push(content.slice(pos, pos + n));
          pos = Math.min(content.length, pos + n);
          const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
          const partial = content.slice(lineStart, pos);
          const ps = p.partialSay();
          if (!partial) {
            assert.equal(ps, null);
            continue;
          }
          const full = JSON.parse(content.slice(lineStart, content.indexOf('\n', lineStart)));
          if (full.t !== 'say') {
            assert.equal(ps, null, `partialSay on a ${full.t} line`);
          } else if (ps !== null) {
            assert.ok(full.text.startsWith(ps), `'${ps}' is not a prefix of '${full.text}'`);
            partialChecks++;
          }
        }
        p.end();
        assert.equal(JSON.stringify(out), ref, `trial ${trial}`);
      }
      const says = lines.filter((l) => JSON.parse(l).t === 'say').length;
      if (says) assert.ok(partialChecks > 0, 'partialSay was exercised');
    });
  }

  test('fault injection on F: one malformed op costs one op; prose and a missing brace cost none', () => {
    const lines = LINES.F_max_nothink.slice();
    const i = lines.findIndex((l) => l.includes('"id":"alb"'));
    assert.ok(i > 0);
    const quote = lines.slice();
    quote[i] = quote[i].replace('"why":"L7 load balancing across multi-zone ECS fleet"', '"why":"L7 "load" balancing"');
    const brace = lines.slice();
    brace[i] = brace[i].replace(/\}$/, '');
    const prose = lines.slice();
    prose[i] = prose[i] + ' <- ALB added';
    const run = (ls: string[]) => parseAll(ls.join('\n') + '\n');
    const q = run(quote);
    assert.equal(q.ops.length, lines.length - 1);
    assert.equal(q.bad.length, 1);
    const b = run(brace);
    assert.equal(b.ops.length, lines.length);
    assert.equal(b.bad.length, 0);
    assert.equal(JSON.stringify(b.ops), JSON.stringify(run(lines).ops), 'order kept after the brace repair');
    const p = run(prose);
    assert.equal(p.ops.length, lines.length);
    assert.equal(p.bad.length, 0);
  });
});

// ---------- validateOp ----------

describe('validateOp', () => {
  test('normalizes ids: underscores silently, other rewrites with an info warning', () => {
    const quiet = validateOp({ t: 'node', id: 'model_studio', product: 'model_studio', label: 'MS' }, CAT);
    assert.equal(quiet.op && quiet.op.t === 'node' && quiet.op.id, 'model-studio');
    assert.deepEqual(quiet.warnings, []);
    const loud = validateOp({ t: 'node', id: 'Model Studio', product: 'model_studio', label: 'MS' }, CAT);
    assert.equal(loud.op && loud.op.t === 'node' && loud.op.id, 'model-studio');
    assert.deepEqual(byCode(loud.warnings), { 'bad-op': 1 });
    assert.equal(loud.warnings[0].severity, 'info');
    const long = validateOp({ t: 'node', id: 'a'.repeat(60), product: 'ecs', label: 'x' }, CAT);
    assert.equal(long.op && long.op.t === 'node' && long.op.id.length, 41);
    const proto = validateOp({ t: 'node', id: 'constructor', product: 'ecs', label: 'x' }, CAT);
    assert.equal(proto.op && proto.op.t === 'node' && proto.op.id, 'constructor-id');
    const bad = validateOp({ t: 'node', id: '***', product: 'ecs', label: 'x' }, CAT);
    assert.equal(bad.op, undefined);
    assert.equal(bad.warnings[0].severity, 'error');
    const e = validateOp({ t: 'edge', id: 'E_1', from: 'End_Users', to: 'dns' }, CAT);
    assert.deepEqual(e.op, { t: 'edge', id: 'e-1', from: 'end-users', to: 'dns' });
  });

  test('caps labels at 40 and why at 160 code points and strips control characters', () => {
    const v = validateOp({ t: 'node', id: 'x', product: 'ecs', label: 'L'.repeat(50), why: 'w'.repeat(200) }, CAT);
    assert.ok(v.op && v.op.t === 'node');
    if (v.op && v.op.t === 'node') {
      assert.equal(Array.from(v.op.label).length, 40);
      assert.ok(v.op.label.endsWith('…'));
      assert.equal(Array.from(v.op.why ?? '').length, 160);
    }
    assert.equal(codes(v.warnings, 'bad-op').length, 2);
    const cjk = validateOp({ t: 'node', id: 'x', product: 'ecs', label: '数据库'.repeat(20) }, CAT);
    assert.equal(cjk.op && cjk.op.t === 'node' && Array.from(cjk.op.label).length, 40);
    const ctl = validateOp({ t: 'node', id: 'x', product: 'ecs', label: 'A‮B\nC\u0007' }, CAT);
    assert.equal(ctl.op && ctl.op.t === 'node' && ctl.op.label, 'A B C');
    const missing = validateOp({ t: 'node', id: 'x', product: 'ecs' }, CAT);
    assert.equal(missing.op && missing.op.t === 'node' && missing.op.label, 'ECS');
  });

  test('an unknown product turns node, insert and rec ops into gaps; plan drops it', () => {
    const n = validateOp({ t: 'node', id: 'pay', product: 'stripe', label: 'Stripe Payments' }, CAT);
    assert.deepEqual(n.op, { t: 'gap', need: 'Stripe Payments', note: "'stripe' is not in the catalog" });
    assert.deepEqual(byCode(n.warnings), { 'unknown-product': 1 });
    assert.equal(n.warnings[0].severity, 'error');
    assert.equal(validateOp({ t: 'insert', id: 'w', product: 'cloudflare', label: 'CF', on: 'e1' }, CAT).op?.t, 'gap');
    assert.equal(validateOp({ t: 'rec', product: 'copilot', fit: 'primary', why: 'x' }, CAT).op?.t, 'gap');
    const plan = validateOp({ t: 'plan', products: ['ecs', 'stripe', 'ECS', 'Bailian'] }, CAT);
    assert.deepEqual(plan.op, { t: 'plan', products: ['ecs', 'model_studio'] });
    assert.deepEqual(byCode(plan.warnings), { 'unknown-product': 1, 'alias-resolved': 2 });
  });

  test('resolves aliases, kebab-case retries and successors, and flags lifecycle and availability', () => {
    const cat = makeCatalog([
      ...FIXTURE.entries,
      entry('old-gw', { status: 'retired', successor: 'api_gateway', note: 'shut down 2027-09-21' }),
      entry('gone', { status: 'retired' }),
      entry('classic-lb', { status: 'legacy', successor: 'alb' }),
      entry('cn-coder', { availability: 'china-only', scope: 'saas', lane: 'saas' }),
    ]);
    const alias = validateOp({ t: 'node', id: 'm', product: 'Bailian', label: 'M' }, cat);
    assert.equal(alias.op && alias.op.t === 'node' && alias.op.product, 'model_studio');
    assert.deepEqual(byCode(alias.warnings), { 'alias-resolved': 1 });
    const succ = validateOp({ t: 'node', id: 'g', product: 'old-gw', label: 'G' }, cat);
    assert.equal(succ.op && succ.op.t === 'node' && succ.op.product, 'api_gateway');
    assert.deepEqual(byCode(succ.warnings), { 'retired-product': 1 });
    assert.equal(succ.warnings[0].repaired, true);
    const gone = validateOp({ t: 'node', id: 'x', product: 'gone', label: 'X' }, cat);
    assert.equal(gone.op?.t, 'gap');
    const legacy = validateOp({ t: 'node', id: 'lb', product: 'classic-lb', label: 'LB' }, cat);
    assert.equal(legacy.op && legacy.op.t === 'node' && legacy.op.product, 'classic-lb');
    assert.match(legacy.warnings[0].msg, /legacy; prefer 'alb'/);
    assert.equal(legacy.warnings[0].repaired, false);
    const cn = validateOp({ t: 'rec', product: 'cn-coder', fit: 'primary', why: 'x' }, cat);
    assert.deepEqual(byCode(cn.warnings), { 'china-only': 1 });
    const kebab = makeCatalog([entry('model-studio', { name: 'Alibaba Cloud Model Studio' })]);
    const k = validateOp({ t: 'node', id: 'ms', product: 'model_studio', label: 'MS' }, kebab);
    assert.equal(k.op && k.op.t === 'node' && k.op.product, 'model-studio');
    assert.deepEqual(k.warnings, []);
  });

  test('drops non-container group kinds and re-points their members through ctx', () => {
    const ctx = createCtx();
    assert.deepEqual(validateOp(group('vpc', 'vpc'), CAT, ctx).op, { t: 'group', id: 'vpc', kind: 'vpc', label: 'vpc', parent: null });
    const managed = validateOp(group('data-grp', 'managed', 'vpc', 'Data Layer'), CAT, ctx);
    assert.equal(managed.op, undefined);
    assert.deepEqual(byCode(managed.warnings), { 'bad-op': 1 });
    assert.equal(managed.warnings[0].repaired, true);
    assert.equal(ctx.groupAlias['data-grp'], 'vpc');
    const member = validateOp(node('db', 'rds', 'data-grp'), CAT, ctx);
    assert.equal(member.op && member.op.t === 'node' && member.op.group, 'vpc');
    assert.deepEqual(validateOp({ t: 'move', id: 'db', to: 'data-grp' }, CAT, ctx).op, { t: 'move', id: 'db', to: 'vpc' });
    const noCtx = validateOp(node('db', 'rds', 'data-grp'), CAT);
    assert.equal(noCtx.op && noCtx.op.t === 'node' && noCtx.op.group, 'data-grp');
    assert.equal((validateOp(group('sw', 'vSwitch', 'vpc'), CAT).op as { kind: string }).kind, 'subnet');
    assert.equal((validateOp(group('az1', 'AZ'), CAT).op as { kind: string }).kind, 'zone');
    assert.equal(validateOp(group('p', 'constructor'), CAT, ctx).op, undefined, 'prototype keys are not kinds');
  });

  test('rejects unknown op types and malformed ops; accepts type for t and delete for remove', () => {
    assert.equal(validateOp('nope', CAT).warnings[0].code, 'bad-op');
    assert.equal(validateOp([1, 2], CAT).op, undefined);
    assert.equal(validateOp({ t: 'explode' }, CAT).warnings[0].severity, 'error');
    assert.equal(validateOp({ t: 'constructor' }, CAT).op, undefined);
    assert.deepEqual(validateOp({ type: 'say', text: 'hi' }, CAT).op, { t: 'say', text: 'hi' });
    assert.deepEqual(validateOp({ t: 'delete', id: 'x' }, CAT).op, { t: 'remove', id: 'x' });
    assert.equal(validateOp({ t: 'edge', from: 'a' }, CAT).op, undefined);
    assert.equal(validateOp({ t: 'move', id: 'a' }, CAT).op, undefined);
    assert.equal(validateOp({ t: 'say' }, CAT).op, undefined);
    assert.deepEqual(validateOp({ t: 'done' }, CAT).op, { t: 'done', summary: '' });
    assert.deepEqual(validateOp({ t: 'gap', need: 'payments' }, CAT).op, { t: 'gap', need: 'payments', note: '' });
  });

  test('edges get a generated id when missing, lose empty labels and keep only valid kinds', () => {
    const v = validateOp({ t: 'edge', from: 'a', to: 'b', label: '' }, CAT);
    assert.deepEqual(v.op, { t: 'edge', id: 'e-a-b', from: 'a', to: 'b' });
    assert.deepEqual(validateOp({ t: 'edge', id: 'e1', from: 'a', to: 'b', kind: 'DNS' }, CAT).op, { t: 'edge', id: 'e1', from: 'a', to: 'b', kind: 'resolve' });
    const bad = validateOp({ t: 'edge', id: 'e1', from: 'a', to: 'b', kind: 'https' }, CAT);
    assert.deepEqual(bad.op, { t: 'edge', id: 'e1', from: 'a', to: 'b' });
    assert.equal(bad.warnings[0].severity, 'info');
  });

  test('zones normalize to letters; rec defaults fit and why', () => {
    const z = validateOp({ t: 'node', id: 'ecs', product: 'ecs', label: 'App', zones: ['Zone A', 'az-b', 'a'] }, CAT);
    assert.deepEqual(z.op && z.op.t === 'node' && z.op.zones, ['a', 'b']);
    const r = validateOp({ t: 'rec', product: 'qoder' }, CAT);
    assert.equal(r.op && r.op.t === 'rec' && r.op.fit, 'primary');
    assert.equal(r.op && r.op.t === 'rec' && r.op.why, FIXTURE.entries.find((e: CatalogEntry) => e.id === 'qoder').purpose);
  });
});

// ---------- reducer ----------

describe('reducer', () => {
  test('node is an upsert: given fields overwrite, missing ones are kept, identical ops change nothing', () => {
    const ctx = createCtx();
    let r = applyOp(emptyGraph(), { t: 'node', id: 'app', product: 'ecs', label: 'App', group: null, why: 'serves' }, ctx);
    assert.deepEqual(r.added, ['app']);
    r = applyOp(r.graph, { t: 'node', id: 'app', product: 'ack', label: 'App' }, ctx);
    assert.deepEqual(r.updated, ['app']);
    assert.deepEqual(r.graph.nodes.app, { id: 'app', product: 'ack', label: 'App', group: null, why: 'serves' });
    const again = applyOp(r.graph, { t: 'node', id: 'app', product: 'ack', label: 'App' }, ctx);
    assert.equal(again.graph, r.graph, 'no change returns the same graph object');
    assert.deepEqual([again.added, again.updated, again.removed], [[], [], []]);
  });

  test('an edge that arrives before its endpoints waits in ctx and is added when they arrive', () => {
    const ctx = createCtx();
    const g0 = emptyGraph();
    let r = applyOp(g0, { t: 'edge', id: 'e1', from: 'a', to: 'b', label: 'x' }, ctx);
    assert.equal(r.graph, g0);
    assert.equal(ctx.pending.length, 1);
    r = applyOp(r.graph, { t: 'node', id: 'a', product: 'ecs', label: 'A' }, ctx);
    assert.deepEqual(r.added, ['a']);
    r = applyOp(r.graph, { t: 'node', id: 'b', product: 'rds', label: 'B' }, ctx);
    assert.deepEqual(r.added, ['b', 'e1']);
    assert.deepEqual(r.graph.edges.e1, { id: 'e1', from: 'a', to: 'b', label: 'x' });
    assert.equal(ctx.pending.length, 0);
  });

  test('pending edges still unresolved at done are dropped with dangling-edge; endTurn does the same', () => {
    const ctx = createCtx();
    let g = applyOp(emptyGraph(), { t: 'edge', id: 'e1', from: 'a', to: 'ghost' }, ctx).graph;
    g = applyOp(g, { t: 'node', id: 'a', product: 'ecs', label: 'A' }, ctx).graph;
    const done = applyOp(g, { t: 'done', summary: '' }, ctx);
    assert.equal(done.graph, g);
    assert.deepEqual(done.warnings.map((w) => [w.code, w.ids, w.repaired]), [['dangling-edge', ['e1', 'a', 'ghost'], false]]);
    assert.equal(ctx.pending.length, 0);
    assert.equal(Object.keys(done.graph.edges).length, 0);
    const ctx2 = createCtx();
    applyOp(emptyGraph(), { t: 'edge', id: 'e2', from: 'x', to: 'y' }, ctx2);
    assert.equal(codes(endTurn(emptyGraph(), ctx2).warnings, 'dangling-edge').length, 1);
    const own = applyOp(emptyGraph(), { t: 'edge', id: 'e3', from: 'x', to: 'y' });
    assert.equal(codes(own.warnings, 'dangling-edge').length, 1, 'without a ctx nothing can wait');
  });

  test('removing a node cascades its edges into tombstones', () => {
    const { graph } = build([node('a', 'ecs'), node('b', 'rds'), node('c', 'oss'), edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ac', 'a', 'c')]);
    const r = applyOp(graph, { t: 'remove', id: 'b' }, createCtx());
    assert.deepEqual(r.removed, ['b', 'ab', 'bc']);
    assert.deepEqual(r.tombstones, [graph.nodes.b, graph.edges.ab, graph.edges.bc]);
    assert.deepEqual(Object.keys(r.graph.edges), ['ac']);
    assert.deepEqual(Object.keys(r.graph.nodes), ['a', 'c']);
  });

  test('an unknown id is a no-op with an info warning, also after a cascade removed it', () => {
    const { graph } = build([node('a', 'ecs'), node('b', 'rds'), edge('ab', 'a', 'b')]);
    const ctx = createCtx();
    const none = applyOp(graph, { t: 'remove', id: 'nope' }, ctx);
    assert.equal(none.graph, graph);
    assert.deepEqual(none.warnings.map((w) => [w.code, w.severity]), [['unknown-id', 'info']]);
    const g1 = applyOp(graph, { t: 'remove', id: 'b' }, ctx).graph;
    const again = applyOp(g1, { t: 'remove', id: 'ab' }, ctx);
    assert.equal(again.graph, g1);
    assert.match(again.warnings[0].msg, /already removed/);
    assert.equal(applyOp(graph, { t: 'move', id: 'nope', to: null }, ctx).warnings[0].code, 'unknown-id');
  });

  test('removing a group re-parents its children to its parent and cascades edges to the group', () => {
    const { graph } = build([
      group('region', 'region'),
      group('vpc', 'vpc', 'region'),
      group('zone-a', 'zone', 'vpc'),
      node('x', 'ecs', 'zone-a'),
      node('y', 'rds', 'vpc'),
      node('u', 'users', null),
      edge('e-u-vpc', 'u', 'vpc'),
    ]);
    const r = applyOp(graph, { t: 'remove', id: 'vpc' }, createCtx());
    assert.deepEqual(r.removed, ['vpc', 'e-u-vpc']);
    assert.deepEqual(r.tombstones, [graph.groups.vpc, graph.edges['e-u-vpc']]);
    assert.equal(r.graph.groups['zone-a'].parent, 'region');
    assert.equal(r.graph.nodes.y.group, 'region');
    assert.equal(r.graph.nodes.x.group, 'zone-a');
    assert.deepEqual(r.updated.sort(), ['y', 'zone-a']);
  });

  test('insert splits an edge, keeping the old label and kind on the first segment', () => {
    const { graph } = build([group('edge', 'edge'), node('esa', 'esa', 'edge'), node('alb', 'alb'), edge('e-esa-alb', 'esa', 'alb', { label: 'HTTPS', kind: 'data' })]);
    const r = applyOp(graph, { t: 'insert', id: 'waf', product: 'waf', label: 'WAF', why: 'L7', on: 'e-esa-alb' }, createCtx());
    assert.deepEqual(r.added, ['waf', 'e-esa-waf', 'e-waf-alb']);
    assert.deepEqual(r.removed, ['e-esa-alb']);
    assert.deepEqual(r.tombstones, [graph.edges['e-esa-alb']]);
    assert.deepEqual(r.graph.edges['e-esa-waf'], { id: 'e-esa-waf', from: 'esa', to: 'waf', label: 'HTTPS', kind: 'data' });
    assert.deepEqual(r.graph.edges['e-waf-alb'], { id: 'e-waf-alb', from: 'waf', to: 'alb', kind: 'data' });
    assert.equal(r.graph.nodes.waf.group, 'edge', 'the hint comes from the upstream node');
    const twice = applyOp(r.graph, { t: 'insert', id: 'waf', product: 'waf', label: 'WAF', on: 'e-esa-waf' }, createCtx());
    assert.equal(twice.warnings[0].code, 'bad-op', 'an edge that already touches the node is not split');
  });

  test('insert can split an edge that is still pending; the far segment waits for its endpoint', () => {
    const ctx = createCtx();
    let g = applyOp(emptyGraph(), { t: 'node', id: 'a', product: 'esa', label: 'A' }, ctx).graph;
    g = applyOp(g, { t: 'edge', id: 'e1', from: 'a', to: 'b', label: 'L' }, ctx).graph;
    const r = applyOp(g, { t: 'insert', id: 'w', product: 'waf', label: 'W', on: 'e1' }, ctx);
    assert.deepEqual(r.added, ['w', 'e-a-w']);
    assert.deepEqual(r.removed, [], 'a pending edge was never drawn, so it has no tombstone');
    assert.deepEqual(r.graph.edges['e-a-w'], { id: 'e-a-w', from: 'a', to: 'w', label: 'L' });
    assert.deepEqual(ctx.pending.map((e) => e.id), ['e-w-b']);
    const r2 = applyOp(r.graph, { t: 'node', id: 'b', product: 'alb', label: 'B' }, ctx);
    assert.deepEqual(r2.added, ['b', 'e-w-b']);
  });

  test('insert on an unknown edge still adds the node, with a warning', () => {
    const r = applyOp(emptyGraph(), { t: 'insert', id: 'waf', product: 'waf', label: 'WAF', on: 'e-missing' }, createCtx());
    assert.deepEqual(r.added, ['waf']);
    assert.deepEqual(r.warnings.map((w) => [w.code, w.severity]), [['unknown-id', 'warn']]);
  });

  test('move re-parents nodes and groups, refuses cycles and waits for a group declared later', () => {
    const ctx = createCtx();
    let g = build([group('r', 'region'), group('v', 'vpc', 'r'), group('z', 'zone', 'v'), node('n', 'ecs', 'z')]).graph;
    g = applyOp(g, { t: 'move', id: 'n', to: 'v' }, ctx).graph;
    assert.equal(g.nodes.n.group, 'v');
    g = applyOp(g, { t: 'move', id: 'n', to: null }, ctx).graph;
    assert.equal(g.nodes.n.group, null);
    const cyc = applyOp(g, { t: 'move', id: 'r', to: 'z' }, ctx);
    assert.equal(cyc.graph, g);
    assert.equal(cyc.warnings[0].code, 'bad-op');
    g = applyOp(g, { t: 'move', id: 'n', to: 'later' }, ctx).graph;
    assert.equal(g.nodes.n.group, null);
    const r = applyOp(g, { t: 'group', id: 'later', kind: 'subnet', label: 'L', parent: 'v' }, ctx);
    assert.deepEqual(r.added, ['later']);
    assert.deepEqual(r.updated, ['n']);
    assert.equal(r.graph.nodes.n.group, 'later');
  });

  test('a node naming a group declared later moves into it; one that never comes is reported at done', () => {
    const ctx = createCtx();
    let g = applyOp(emptyGraph(), { t: 'node', id: 'db', product: 'rds', label: 'DB', group: 'data' }, ctx).graph;
    assert.equal(g.nodes.db.group, null);
    const r = applyOp(g, { t: 'group', id: 'data', kind: 'subnet', label: 'Data' }, ctx);
    assert.equal(r.graph.nodes.db.group, 'data');
    g = applyOp(r.graph, { t: 'node', id: 'x', product: 'ecs', label: 'X', group: 'nowhere' }, ctx).graph;
    const done = applyOp(g, { t: 'done', summary: '' }, ctx);
    assert.deepEqual(done.warnings.map((w) => [w.code, w.ids]), [['missing-group', ['x', 'nowhere']]]);
  });

  test('rec ops append to recs, upsert by product, and edges between recs resolve by product id', () => {
    const ctx = createCtx();
    let r = applyOp(emptyGraph(), { t: 'rec', product: 'qoder', fit: 'primary', why: 'a' }, ctx);
    assert.deepEqual(r.added, ['rec:qoder']);
    r = applyOp(r.graph, { t: 'edge', id: 'e1', from: 'qoder', to: 'model-studio' }, ctx);
    assert.equal(ctx.pending.length, 1);
    r = applyOp(r.graph, { t: 'rec', product: 'model_studio', fit: 'complement', why: 'b' }, ctx);
    assert.deepEqual(r.added, ['rec:model_studio', 'e1']);
    r = applyOp(r.graph, { t: 'rec', product: 'qoder', fit: 'primary', why: 'changed' }, ctx);
    assert.deepEqual(r.updated, ['rec:qoder']);
    assert.equal(r.graph.recs.length, 2);
    r = applyOp(r.graph, { t: 'remove', id: 'qoder' }, ctx);
    assert.deepEqual(r.removed, ['rec:qoder', 'e1']);
  });

  test('say, plan, req, gap and done leave the graph object unchanged', () => {
    const { graph } = build([node('a', 'ecs')]);
    const ops: Op[] = [
      { t: 'say', text: 'hi' },
      { t: 'plan', products: ['ecs'] },
      { t: 'req', text: 'avoid Kubernetes' },
      { t: 'gap', need: 'x', note: 'y' },
      { t: 'done', summary: 'ok' },
    ];
    for (const op of ops) {
      const r = applyOp(graph, op, createCtx());
      assert.equal(r.graph, graph, op.t);
      assert.deepEqual([r.added, r.updated, r.removed, r.tombstones], [[], [], [], []]);
    }
  });

  test('caps: the 81st node and the 121st edge are refused', () => {
    const ctx = createCtx();
    let g = emptyGraph();
    for (let i = 0; i < 80; i++) g = applyOp(g, { t: 'node', id: `n${i}`, product: 'ecs', label: `N${i}` }, ctx).graph;
    const over = applyOp(g, { t: 'node', id: 'n80', product: 'ecs', label: 'N80' }, ctx);
    assert.equal(over.graph, g);
    assert.deepEqual(over.warnings.map((w) => [w.code, w.severity]), [['cap-exceeded', 'error']]);
    for (let i = 0; i < 120; i++) g = applyOp(g, { t: 'edge', id: `e${i}`, from: `n${i % 80}`, to: `n${(i + 1 + Math.floor(i / 80)) % 80}` }, ctx).graph;
    assert.equal(Object.keys(g.edges).length, 120);
    const e = applyOp(g, { t: 'edge', id: 'e120', from: 'n0', to: 'n5' }, ctx);
    assert.equal(e.graph, g);
    assert.equal(e.warnings[0].code, 'cap-exceeded');
    const small = createCtx({ maxNodes: 2 });
    let s = applyOp(emptyGraph(), { t: 'node', id: 'a', product: 'ecs', label: 'A' }, small).graph;
    s = applyOp(s, { t: 'node', id: 'b', product: 'ecs', label: 'B' }, small).graph;
    assert.equal(applyOp(s, { t: 'node', id: 'c', product: 'ecs', label: 'C' }, small).warnings[0].code, 'cap-exceeded');
  });

  test('never mutates its input graph', () => {
    const { graph } = build([group('r', 'region'), group('v', 'vpc', 'r'), node('a', 'ecs', 'v'), node('b', 'rds', 'v'), edge('ab', 'a', 'b')]);
    const frozen = deepFreeze(graph);
    const snapshot = JSON.stringify(frozen);
    const ctx = createCtx();
    const ops: Op[] = [
      { t: 'node', id: 'a', product: 'ack', label: 'A2' },
      { t: 'insert', id: 'c', product: 'tair', label: 'C', on: 'ab' },
      { t: 'move', id: 'b', to: 'r' },
      { t: 'remove', id: 'v' },
      { t: 'remove', id: 'a' },
      { t: 'rec', product: 'qoder', fit: 'primary', why: 'x' },
    ];
    for (const op of ops) applyOp(frozen, op, ctx);
    assert.equal(JSON.stringify(frozen), snapshot);
  });

  test('ids that collide across kinds are refused', () => {
    const { graph } = build([group('vpc', 'vpc'), node('app', 'ecs', 'vpc')]);
    assert.equal(applyOp(graph, { t: 'node', id: 'vpc', product: 'ecs', label: 'X' }, createCtx()).warnings[0].code, 'duplicate-id');
    assert.equal(applyOp(graph, { t: 'edge', id: 'app', from: 'app', to: 'vpc' }, createCtx()).warnings[0].code, 'duplicate-id');
    assert.equal(applyOp(graph, { t: 'edge', id: 'loop', from: 'app', to: 'app' }, createCtx()).warnings[0].code, 'bad-op');
  });
});

// ---------- checkGraph and repairGraph ----------

describe('checkGraph and repairGraph', () => {
  test('regional managed services leave the VPC; vpcAttachable ones may stay', () => {
    const { graph } = build([group('r', 'region'), group('v', 'vpc', 'r'), node('oss', 'oss', 'v'), node('fc', 'fc', 'v'), node('kms', 'kms', 'v'), node('ecs', 'ecs', 'v')]);
    const before = codes(checkGraph(graph, CAT), 'containment');
    assert.deepEqual(before.map((w) => [w.ids, w.severity]), [[['oss'], 'error']]);
    const rep = repairGraph(graph, CAT);
    assert.equal(rep.graph.nodes.oss.group, 'r');
    assert.equal(rep.graph.nodes.fc.group, 'v');
    assert.equal(rep.graph.nodes.kms.group, 'v');
    assert.equal(codes(checkGraph(rep.graph, CAT), 'containment').length, 0);
    assert.equal(codes(rep.warnings, 'containment')[0].repaired, true);
  });

  test('reverse containment: VPC resources drawn outside every VPC move into it; no VPC drawn, no warning', () => {
    const { graph } = build([group('r', 'region'), group('v', 'vpc', 'r'), node('rds', 'rds'), node('tair', 'tair', 'r'), node('nat', 'nat', 'r')]);
    assert.deepEqual(codes(checkGraph(graph, CAT), 'containment').map((w) => w.ids[0]), ['rds', 'tair', 'nat']);
    const rep = repairGraph(graph, CAT);
    assert.deepEqual([rep.graph.nodes.rds.group, rep.graph.nodes.tair.group, rep.graph.nodes.nat.group], ['v', 'v', 'v']);
    const flat = build([node('rds', 'rds'), node('app', 'ecs'), edge('e', 'app', 'rds')]).graph;
    assert.equal(codes(checkGraph(flat, CAT), 'containment').length, 0);
  });

  test('account, saas, edge and global nodes leave VPC, zone and region groups', () => {
    const { graph } = build([
      group('r', 'region'),
      group('v', 'vpc', 'r'),
      group('z', 'zone', 'v'),
      group('edge', 'edge'),
      node('ram', 'ram', 'z'),
      node('qoder', 'qoder', 'v'),
      node('esa', 'esa', 'v'),
      node('dns', 'dns', 'r'),
      node('users', 'users', 'r'),
    ]);
    const rep = repairGraph(graph, CAT);
    const at = (id: string) => rep.graph.nodes[id].group;
    assert.deepEqual([at('ram'), at('qoder'), at('esa'), at('dns'), at('users')], [null, null, 'edge', 'edge', null]);
    assert.equal(codes(checkGraph(rep.graph, CAT), 'containment').length, 0);
  });

  test('DNS data edges become resolve edges; other kinds are left alone', () => {
    const { graph } = build([node('users', 'users'), node('dns', 'dns'), node('esa', 'esa'), edge('a', 'users', 'dns'), edge('b', 'dns', 'esa'), edge('c', 'users', 'esa'), edge('d', 'esa', 'dns', { kind: 'control' })]);
    assert.deepEqual(codes(checkGraph(graph, CAT), 'dns-in-path').map((w) => w.ids[0]), ['a', 'b']);
    const rep = repairGraph(graph, CAT);
    assert.deepEqual(Object.values(rep.graph.edges).map((e) => e.kind ?? 'data'), ['resolve', 'resolve', 'data', 'control']);
  });

  test('path order and orphans outside the repair rules are reported, not repaired', () => {
    // Phase 1: groups added (a VPC resource with no VPC group is now repaired) and a second compute node (an orphan
    // database next to exactly one compute node is now connected); the inversions are outside the Edge column.
    const { graph } = build([
      group('r', 'region'),
      group('v', 'vpc', 'r'),
      node('alb', 'alb', 'v'),
      node('ecs', 'ecs', 'v'),
      node('batch', 'ecs', 'v'),
      node('db', 'polardb', 'v'),
      node('rds', 'rds', 'v'),
      node('sls', 'sls', 'r'),
      edge('back', 'ecs', 'alb'),
      edge('up', 'db', 'ecs'),
      edge('jobs', 'batch', 'db'),
    ]);
    const w = checkGraph(graph, CAT);
    assert.deepEqual(codes(w, 'path-order').map((x) => [x.ids[0], x.severity]), [['back', 'warn'], ['up', 'info']]);
    assert.deepEqual(codes(w, 'orphan-node').map((x) => [x.ids[0], x.severity]), [['rds', 'warn'], ['sls', 'info']]);
    const rep = repairGraph(graph, CAT);
    assert.deepEqual(rep.graph, graph);
    assert.ok(rep.warnings.every((x) => !x.repaired));
    assert.equal(codes(rep.warnings, 'path-order').length, 2);
  });

  test('per-zone replicas collapse into one node with zones only when they are clearly replicas', () => {
    const zones = [group('r', 'region'), group('v', 'vpc', 'r'), group('za', 'zone', 'v', 'Zone A'), group('zb', 'zone', 'v', 'Zone B')];
    // same label once the zone marker is removed
    const lab = build([...zones, node('alb', 'alb', 'v'), node('rds', 'rds', 'v'), { ...node('web-a', 'ecs', 'za'), label: 'Web (Zone A)' }, { ...node('web-b', 'ecs', 'zb'), label: 'Web (Zone B)' }, edge('e1', 'alb', 'web-a'), edge('e2', 'alb', 'web-b'), edge('e3', 'web-a', 'rds')]).graph;
    const r1 = repairGraph(lab, CAT);
    assert.deepEqual(r1.graph.nodes['web-a'], { id: 'web-a', product: 'ecs', label: 'Web', group: 'v', zones: ['a', 'b'] });
    assert.equal(r1.graph.nodes['web-b'], undefined);
    assert.deepEqual(Object.keys(r1.graph.edges).sort(), ['e1', 'e3']);
    assert.deepEqual(r1.tombstones.map((t) => t.id).sort(), ['e2', 'web-b']);
    // different services in the two zones stay apart
    const diffSvc = build([...zones, node('rds', 'rds', 'v'), node('mq', 'rocketmq', 'v'), { ...node('web', 'ecs', 'za'), label: 'Web' }, { ...node('batch', 'ecs', 'zb'), label: 'Batch worker' }, edge('e1', 'web', 'rds'), edge('e2', 'batch', 'mq')]).graph;
    assert.equal(codes(checkGraph(diffSvc, CAT), 'zone-replicas').length, 0);
    assert.equal(Object.keys(repairGraph(diffSvc, CAT).graph.nodes).length, 4);
    // different labels, but one replica's connections are a subset of the other's
    const sub = build([...zones, node('alb', 'alb', 'v'), node('rds', 'rds', 'v'), { ...node('ack', 'ack', 'za'), label: 'ACK Cluster' }, { ...node('ack-b', 'ack', 'zb'), label: 'Node Pool B' }, edge('e1', 'alb', 'ack'), edge('e2', 'alb', 'ack-b'), edge('e3', 'ack', 'rds')]).graph;
    const r3 = repairGraph(sub, CAT);
    assert.deepEqual(r3.graph.nodes.ack, { id: 'ack', product: 'ack', label: 'ACK Cluster', group: 'v', zones: ['a', 'b'] });
    assert.equal(r3.graph.nodes['ack-b'], undefined);
    // edge-less per-zone parts of a node that already sits in the VPC merge into it
    const span = build([...zones, node('alb', 'alb', 'v'), { ...node('ack', 'ack', 'v'), label: 'ACK' }, { ...node('w-a', 'ack', 'za'), label: 'Workers (AZ-A)' }, { ...node('w-b', 'ack', 'zb'), label: 'Workers (AZ-B)' }, edge('e1', 'alb', 'ack')]).graph;
    const r4 = repairGraph(span, CAT);
    assert.deepEqual(r4.graph.nodes.ack.zones, ['a', 'b']);
    assert.deepEqual(Object.keys(r4.graph.nodes).sort(), ['ack', 'alb']);
    // two of the same product in one zone are not replicas
    const one = build([...zones, { ...node('a1', 'ecs', 'za'), label: 'Web' }, { ...node('a2', 'ecs', 'za'), label: 'Web' }]).graph;
    assert.equal(codes(checkGraph(one, CAT), 'zone-replicas').length, 0);
  });

  test('an inline attachable next to one of its catalog hosts becomes a badge; other neighbours do not trigger it', () => {
    const g = build([node('esa', 'esa'), node('waf', 'waf'), node('alb', 'alb'), node('nat', 'nat'), node('eip', 'eip'), edge('e1', 'esa', 'waf', { label: 'HTTPS' }), edge('e2', 'waf', 'alb'), edge('e3', 'nat', 'eip')]).graph;
    assert.deepEqual(codes(checkGraph(g, CAT), 'attach-inline').map((w) => w.ids), [['waf', 'alb'], ['eip', 'nat']]);
    const rep = repairGraph(g, CAT);
    assert.equal(rep.graph.nodes.waf.attachTo, 'alb', 'the downstream host wins');
    assert.equal(rep.graph.nodes.eip.attachTo, 'nat');
    assert.deepEqual(rep.graph.edges, { e1: { id: 'e1', from: 'esa', to: 'alb', label: 'HTTPS' } });
    const notHost = build([node('users', 'users'), node('waf', 'waf'), node('ecs', 'ecs'), edge('e1', 'users', 'waf'), edge('e2', 'waf', 'ecs')]).graph;
    assert.equal(codes(checkGraph(notHost, CAT), 'attach-inline').length, 0, 'ECS is not a WAF host');
    assert.equal(repairGraph(notHost, CAT).graph.nodes.waf.attachTo, undefined);
  });

  test('attachTo naming a missing or wrong host is re-targeted to the only valid host, or cleared', () => {
    const g = build([node('alb', 'alb'), node('waf', 'waf', null, { attachTo: 'ghost' }), node('ecs', 'ecs'), node('kms', 'kms', null, { attachTo: 'ecs' })]).graph;
    const w = codes(checkGraph(g, CAT), 'attach-host-missing');
    assert.deepEqual(w.map((x) => [x.ids[0], x.severity]), [['waf', 'error'], ['kms', 'warn']]);
    const rep = repairGraph(g, CAT);
    assert.equal(rep.graph.nodes.waf.attachTo, 'alb');
    assert.equal(rep.graph.nodes.kms.attachTo, undefined);
    assert.equal(codes(checkGraph(rep.graph, CAT), 'attach-host-missing').length, 0);
  });

  test('graphs from outside the reducer: unknown products, aliases, missing groups, dangling edges and caps', () => {
    const raw: Graph = {
      groups: { v: { id: 'v', kind: 'vpc', label: 'V', parent: 'gone' } },
      nodes: {
        a: { id: 'a', product: 'ECS', label: 'A', group: 'v' },
        s: { id: 's', product: 'stripe', label: 'S', group: null },
        b: { id: 'b', product: 'rds', label: 'B', group: 'nope' },
      },
      edges: { e1: { id: 'e1', from: 'a', to: 'b' }, e2: { id: 'e2', from: 'a', to: 'ghost' }, e3: { id: 'e3', from: 'a', to: 's' } },
      recs: [{ product: 'Lingma', fit: 'primary', why: 'x' }],
    };
    const before = byCode(checkGraph(raw, CAT));
    assert.equal(before['unknown-product'], 1);
    assert.equal(before['alias-resolved'], 2);
    assert.equal(before['missing-group'], 2);
    assert.equal(before['dangling-edge'], 1);
    const rep = repairGraph(raw, CAT);
    assert.equal(rep.graph.nodes.a.product, 'ecs');
    assert.equal(rep.graph.nodes.s, undefined);
    assert.equal(rep.graph.nodes.b.group, 'v', 'missing group cleared, then placed by scope');
    assert.deepEqual(Object.keys(rep.graph.edges), ['e1']);
    assert.equal(rep.graph.recs[0].product, 'qoder');
    assert.equal(rep.graph.groups.v.parent, null);
    const big: Graph = { groups: {}, nodes: {}, edges: {}, recs: [] };
    for (let i = 0; i < 85; i++) big.nodes[`n${i}`] = { id: `n${i}`, product: 'ecs', label: `N${i}`, group: null };
    assert.equal(codes(checkGraph(big, CAT), 'cap-exceeded').length, 1);
    const trimmed = repairGraph(big, CAT);
    assert.equal(Object.keys(trimmed.graph.nodes).length, 80);
    assert.equal(trimmed.tombstones.length, 5);
  });
});

// ---------- recorded streams ----------

interface StreamRun extends Replay {
  before: Warning[];
  repaired: ReturnType<typeof repairGraph>;
  after: Warning[];
}

function runStream(label: string, start?: { graph: Graph; ctx: ApplyCtx }): StreamRun {
  const r = replay(LINES[label], CAT, start);
  const snapshot = JSON.stringify(r.graph);
  const before = checkGraph(r.graph, CAT);
  const repaired = repairGraph(r.graph, CAT);
  assert.equal(JSON.stringify(r.graph), snapshot, 'repairGraph does not mutate its input');
  return { ...r, before, repaired, after: checkGraph(repaired.graph, CAT) };
}

function assertClean(run: StreamRun, label: string): void {
  assert.equal(run.bad.length, 0, `${label}: bad lines ${run.bad.join(' | ')}`);
  assert.equal(codes(run.streamWarnings, 'unknown-product').length, 0, `${label}: unknown products`);
  assert.equal(codes(run.streamWarnings, 'dangling-edge').length, 0, `${label}: dangling edges`);
  assert.equal(codes(run.after, 'containment').length, 0, `${label}: containment after repair`);
  for (const code of ['zone-replicas', 'attach-inline', 'attach-host-missing', 'dns-in-path', 'missing-group', 'cap-exceeded']) {
    assert.equal(codes(run.after, code).length, 0, `${label}: ${code} after repair`);
  }
  const again = repairGraph(run.repaired.graph, CAT);
  assert.equal(again.warnings.filter((w) => w.repaired).length, 0, `${label}: repair is idempotent`);
  assert.deepEqual(again.graph, run.repaired.graph);
}

const BASE = ingestGraph(STREAMS.baseState, CAT);
const BASE_REPAIRED = { graph: repairGraph(BASE.graph, CAT).graph, ctx: BASE.ctx };

describe('recorded streams (initial diagrams)', () => {
  test('F_max_nothink: 0 bad lines, 0 unknown products; 7 containment errors before repair, 0 after', (t) => {
    const run = runStream('F_max_nothink');
    assertClean(run, 'F');
    assert.equal(run.ops.length, 57 - 3, '57 lines, 3 of them managed groups dropped by the validator');
    assert.equal(codes(run.before, 'containment').length, 7);
    const n = run.repaired.graph.nodes;
    assert.deepEqual(n['ecs-a'], { id: 'ecs-a', product: 'ecs', label: 'App Servers', group: 'vpc', zones: ['a', 'b'], why: 'Stateless web/app tier handling business logic' });
    assert.equal(n['ecs-b'], undefined);
    assert.equal(n.asg.attachTo, 'ecs-a');
    assert.equal(n.waf.attachTo, 'esa');
    assert.deepEqual(['oss', 'opensearch', 'model-studio', 'sls', 'arms', 'cloudmonitor'].map((id) => n[id].group), Array(6).fill('region'));
    assert.deepEqual(['polardb', 'tair', 'rocketmq', 'alb', 'nat'].map((id) => n[id].group), Array(5).fill('vpc'));
    assert.equal(n['security-center'].group, null);
    assert.equal(run.repaired.graph.edges['e-users-dns'].kind, 'resolve');
    // Phase 1: anti-DDoS before ESA is rewired (repair d) instead of being left for the repair turn
    assert.equal(codes(run.after, 'path-order').length, 0);
    const ed = run.repaired.graph.edges;
    assert.deepEqual(
      ['e-dns-ddos', 'e-ddos-waf', 'e-esa-alb', 'e-waf-cdn'].map((id) => [ed[id].from, ed[id].to]),
      [['dns', 'esa'], ['esa', 'anti-ddos'], ['anti-ddos', 'alb'], ['esa', 'cdn']],
      'users -> dns => esa -> anti-ddos -> alb; the CDN branch stays on ESA',
    );
    t.diagnostic(`F before ${JSON.stringify(byCode(run.before))} after ${JSON.stringify(byCode(run.after))}`);
  });

  test('E_flash_default: underscored ids normalize; WAF becomes a badge on the API gateway', (t) => {
    const run = runStream('E_flash_default');
    assertClean(run, 'E');
    const n = run.repaired.graph.nodes;
    assert.ok(n['end-users'] && n['anti-ddos'] && n['api-gw'] && n['model-studio'] && n['cloud-firewall'] && n['security-center']);
    assert.equal(n.waf.attachTo, 'api-gw');
    assert.deepEqual(['api-gw', 'polardb', 'tair', 'rocketmq', 'cloud-firewall', 'waf'].map((id) => n[id].group), Array(6).fill('g-vpc'));
    assert.deepEqual([n.ram.group, n['security-center'].group, n.fc.group], [null, null, 'g-vpc']);
    t.diagnostic(`E before ${JSON.stringify(byCode(run.before))} after ${JSON.stringify(byCode(run.after))}`);
  });

  test('G_max_budget1k: ACK replicas with uneven wiring collapse into one node; WAF becomes a badge on ALB', (t) => {
    const run = runStream('G_max_budget1k');
    assertClean(run, 'G');
    const n = run.repaired.graph.nodes;
    assert.deepEqual(n.ack.zones, ['a', 'b']);
    assert.equal(n['ack-b'], undefined);
    assert.equal(n.waf.attachTo, 'alb');
    assert.equal(run.repaired.graph.edges.e4.to, 'alb', 'anti-DDoS now feeds the ALB that carries the WAF badge');
    t.diagnostic(`G before ${JSON.stringify(byCode(run.before))} after ${JSON.stringify(byCode(run.after))}`);
  });

  test('H_flash_nothink: the edge that arrived before its target node is buffered and resolved', (t) => {
    const run = runStream('H_flash_nothink');
    assertClean(run, 'H');
    const at = run.results.findIndex((r) => r.added.includes('e-esa-alb'));
    assert.deepEqual(run.results[at].added, ['n-alb', 'e-esa-alb'], 'added together with n-alb');
    assert.deepEqual(run.graph.edges['e-esa-alb'], { id: 'e-esa-alb', from: 'n-esa', to: 'n-alb', label: 'HTTPS' });
    t.diagnostic(`H before ${JSON.stringify(byCode(run.before))} after ${JSON.stringify(byCode(run.after))}`);
  });

  test('P1_team_grounded: a product-need answer is a rec, with no nodes', () => {
    const run = runStream('P1_team_grounded');
    assertClean(run, 'P1');
    assert.deepEqual(run.graph.recs.map((r) => [r.product, r.fit]), [['qoder', 'primary']]);
    assert.equal(Object.keys(run.graph.nodes).length, 0);
  });
});

describe('recorded streams (follow-ups on baseState)', () => {
  test('baseState ingests as 21 nodes, 20 edges and 6 network groups; the 3 managed groups become aliases', () => {
    assert.deepEqual([Object.keys(BASE.graph.nodes).length, Object.keys(BASE.graph.edges).length, Object.keys(BASE.graph.groups).length], [21, 20, 6]);
    assert.deepEqual(byCode(BASE.warnings), { 'bad-op': 3 });
    assert.deepEqual(BASE.ctx.groupAlias, { 'data-grp': 'vpc', 'ai-grp': 'vpc', 'ops-grp': 'vpc' });
  });

  test('B2 (WAF already present) changes nothing', () => {
    const run = runStream('B2_followup_waf_nothink', BASE);
    assertClean(run, 'B2');
    assert.equal(run.graph, BASE.graph);
    assert.equal(run.tombstones.length, 0);
  });

  test('B3 swaps ECS and Auto Scaling for ACK; cascades make the 12 explicit edge removals no-ops', () => {
    const run = runStream('B3_k8s', BASE);
    assertClean(run, 'B3');
    const d = diff(BASE.graph, run.graph);
    assert.deepEqual(d.nodes, { added: ['ack', 'ack-a', 'ack-b'], removed: ['asg', 'ecs-a', 'ecs-b'], changed: [] });
    const ecsEdges = Object.values(BASE.graph.edges).filter((e) => ['ecs-a', 'ecs-b', 'asg'].includes(e.from) || ['ecs-a', 'ecs-b', 'asg'].includes(e.to));
    assert.deepEqual(d.edges.removed, ecsEdges.map((e) => e.id).sort());
    assert.equal(d.edges.added.length, 10);
    assert.deepEqual([d.edges.changed, d.groups.added, d.groups.removed, d.groups.changed], [[], [], [], []]);
    assert.equal(run.tombstones.length, 15);
    for (const t of run.tombstones) assert.deepEqual(t, (BASE.graph.nodes as Record<string, unknown>)[t.id] ?? BASE.graph.edges[t.id], `tombstone ${t.id}`);
    assert.equal(codes(run.streamWarnings, 'unknown-id').length, 12);
    const g = run.repaired.graph;
    assert.deepEqual(Object.values(g.nodes).filter((n) => n.product === 'ack').map((n) => [n.id, n.zones]), [['ack', ['a', 'b']]]);
    assert.equal(Object.values(g.nodes).filter((n) => n.product === 'ecs' || n.product === 'auto_scaling').length, 0);
    const out = Object.values(g.edges).filter((e) => e.from === 'ack').map((e) => e.to).sort();
    assert.deepEqual(out, ['arms', 'model-studio', 'nat', 'opensearch', 'oss', 'polardb', 'rocketmq', 'sls', 'tair']);
    assert.ok(Object.values(g.edges).some((e) => e.from === 'alb' && e.to === 'ack'));
  });

  test('B4 adds the warehouse with three nodes and three edges; containment goes 10 -> 0', () => {
    const run = runStream('B4_dw', BASE);
    assertClean(run, 'B4');
    const d = diff(BASE.graph, run.graph);
    assert.deepEqual(d.nodes, { added: ['dataworks', 'maxcompute', 'quick-bi'], removed: [], changed: [] });
    assert.deepEqual(d.edges, { added: ['e-dw-mc', 'e-mc-bi', 'e-polardb-dw'], removed: [], changed: [] });
    assert.equal(codes(run.before, 'containment').length, 10);
    assert.deepEqual(['maxcompute', 'dataworks', 'quick-bi'].map((id) => run.repaired.graph.nodes[id].group), ['region', 'region', 'region']);
  });

  test('B5 removes model-studio and its two edges, and nothing else', () => {
    const run = runStream('B5_drop_ai', BASE);
    assertClean(run, 'B5');
    const d = diff(BASE.graph, run.graph);
    assert.deepEqual(d.nodes, { added: [], removed: ['model-studio'], changed: [] });
    assert.deepEqual(d.edges, { added: [], removed: ['e-ai-search', 'e-ecs-ai'], changed: [] });
    assert.deepEqual(run.tombstones.map((t) => t.id).sort(), ['e-ai-search', 'e-ecs-ai', 'model-studio']);
  });

  test('the follow-ups also apply cleanly on the repaired base (the realistic flow)', () => {
    for (const label of FOLLOW_UPS) {
      const run = runStream(label, BASE_REPAIRED);
      assertClean(run, label + ' on repaired base');
    }
    const b3 = runStream('B3_k8s', BASE_REPAIRED).repaired.graph;
    assert.deepEqual(Object.values(b3.nodes).filter((n) => n.product === 'ack').map((n) => [n.id, n.zones]), [['ack', ['a', 'b']]]);
    assert.equal(Object.values(b3.nodes).filter((n) => n.product === 'ecs').length, 0);
    const b5 = runStream('B5_drop_ai', BASE_REPAIRED);
    assert.deepEqual(diff(BASE_REPAIRED.graph, b5.graph).nodes.removed, ['model-studio']);
  });

  test('per-stream warning counts by code (diagnostics)', (t) => {
    for (const label of [...INITIAL, ...FOLLOW_UPS]) {
      const run = runStream(label, label.startsWith('B') ? BASE : undefined);
      t.diagnostic(
        `${label}: ops ${run.ops.length}, bad ${run.bad.length} | stream ${JSON.stringify(byCode(run.streamWarnings))} | before ${JSON.stringify(byCode(run.before))} | fixed ${JSON.stringify(byCode(run.repaired.warnings.filter((w) => w.repaired)))} | after ${JSON.stringify(byCode(run.after))}`,
      );
    }
  });
});

// ---------- integration with the real catalog (packages/core/catalog/*.json, src/catalog.ts) ----------

const CORE = path.resolve(HERE, '..');

/** The real catalog JSON, or why it cannot be used yet (the catalog team writes it in parallel). */
function readRealCatalogJson(): { products: { version: string; entries: CatalogEntry[] }; offerings: { version: string; entries: CatalogEntry[] } } | string {
  const files = ['catalog/products.json', 'catalog/offerings.json'].map((f) => path.join(CORE, f));
  if (!files.every((f) => existsSync(f))) return 'packages/core/catalog/products.json and offerings.json not present yet';
  try {
    const [products, offerings] = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
    if (!Array.isArray(products.entries) || !Array.isArray(offerings.entries)) return 'catalog JSON has no entries array';
    return { products, offerings };
  } catch (e) {
    return `catalog JSON unreadable: ${String(e)}`;
  }
}
const REAL_JSON = readRealCatalogJson();

/** src/catalog-node.ts loadCatalog() or src/catalog.ts createCatalog() when they exist; else the JSON behind this test's resolver. */
async function loadRealCatalog(json: Exclude<typeof REAL_JSON, string>): Promise<{ catalog: Catalog; via: string }> {
  const nodeLoader = path.join(CORE, 'src/catalog-node.ts');
  if (existsSync(nodeLoader)) {
    const mod = await import(pathToFileURL(nodeLoader).href);
    if (typeof mod.loadCatalog === 'function') return { catalog: mod.loadCatalog(), via: 'src/catalog-node.ts loadCatalog()' };
  }
  const builder = path.join(CORE, 'src/catalog.ts');
  if (existsSync(builder)) {
    const mod = await import(pathToFileURL(builder).href);
    if (typeof mod.createCatalog === 'function') {
      for (const args of [[json.products, json.offerings], [json.products.entries, json.offerings.entries]]) {
        try {
          const c = mod.createCatalog(...args) as Catalog;
          if (c && c.byId instanceof Map && typeof c.resolve === 'function' && c.byId.size > 0) return { catalog: c, via: 'src/catalog.ts createCatalog()' };
        } catch {
          // try the other argument shape
        }
      }
    }
  }
  return { catalog: makeCatalog([...json.products.entries, ...json.offerings.entries], json.products.version), via: 'catalog/*.json with the test resolver (src/catalog.ts not present yet)' };
}

describe('integration with the real catalog', () => {
  test(
    'the F stream, mapped through probe-id-map.json, replays against the real catalog',
    { skip: typeof REAL_JSON === 'string' ? REAL_JSON : false },
    async (t) => {
      if (typeof REAL_JSON === 'string') return;
      const { catalog: real, via } = await loadRealCatalog(REAL_JSON);
      t.diagnostic(`real catalog ${real.version} loaded via ${via}: ${real.byId.size} entries`);
      const missing = Object.entries(ID_MAP).filter(([, id]) => !real.byId.has(id));
      assert.deepEqual(missing, [], 'every probe-id-map.json target exists in the real catalog');
      const mapRaw = (raw: unknown): unknown => {
        const o = raw as Record<string, unknown>;
        return typeof o.product === 'string' && Object.hasOwn(ID_MAP, o.product) ? { ...o, product: ID_MAP[o.product] } : raw;
      };
      const run = replay(LINES.F_max_nothink, real, undefined, mapRaw);
      assert.equal(run.bad.length, 0);
      assert.deepEqual(codes(run.streamWarnings, 'unknown-product').map((w) => w.msg), []);
      assert.equal(Object.keys(run.graph.nodes).length, 21);
      const rep = repairGraph(run.graph, real);
      const after = checkGraph(rep.graph, real);
      assert.equal(codes(after, 'containment').length, 0);
      for (const code of ['zone-replicas', 'attach-inline', 'attach-host-missing', 'dns-in-path']) assert.equal(codes(after, code).length, 0, code);
      assert.deepEqual(rep.graph.nodes['ecs-a'].zones, ['a', 'b']);
      t.diagnostic(`F on the real catalog: before ${JSON.stringify(byCode(checkGraph(run.graph, real)))} after ${JSON.stringify(byCode(after))}`);
    },
  );
});
