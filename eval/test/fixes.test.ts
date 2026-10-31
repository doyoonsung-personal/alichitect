// Tests for the two core fixes the Phase 1 eval re-run made (llm.ts default checker, prompt.ts R12b) and for the
// repair-turn classification in phase1-report.ts.
// Run: node --test "eval/test/**/*.test.ts"
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
import { buildSystemPrompt, createMemory } from '../../packages/core/src/prompt.ts';
import { defaultConstraintChecker, runTurn } from '../../packages/core/src/llm.ts';
import { constraintChecker } from '../../packages/core/src/validate.ts';
import type { Constraint, Graph, SessionMemory, Warning } from '../../packages/core/src/types.ts';
import { classifyRepairTurn } from '../phase1-report.ts';
import type { TurnRecord } from '../records.ts';

const CAT = loadCatalog();
const SG: Constraint = { text: 'Data and workloads stay in Singapore', regions: ['ap-southeast-1'] };

function graph(): Graph {
  return {
    groups: { sg: { id: 'sg', kind: 'region', label: 'Singapore', parent: null }, inet: { id: 'inet', kind: 'external', label: 'Internet', parent: null } },
    nodes: {
      users: { id: 'users', product: 'users', label: '호주 고객', group: 'inet' },
      web: { id: 'web', product: 'ecs', label: 'Web servers', group: 'sg' },
    },
    edges: { e1: { id: 'e1', from: 'users', to: 'web' } },
    recs: [],
  };
}

/** One streamed chat completion with the given NDJSON content. */
function sse(content: string): string {
  const ev = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
  return (
    ev({ id: 'c', choices: [{ index: 0, delta: { role: 'assistant', content } }] }) +
    ev({ id: 'c', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) +
    ev({ id: 'c', choices: [], usage: { prompt_tokens: 100, completion_tokens: 20 } }) +
    'data: [DONE]\n\n'
  );
}

function mockFetch(bodies: string[], calls: unknown[]): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = bodies.shift();
    if (body === undefined) throw new Error('mock fetch: no response queued');
    calls.push(JSON.parse(String(init!.body)));
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}

const line = (o: unknown): string => JSON.stringify(o);

describe('defaultConstraintChecker (llm.ts)', () => {
  test('drops a region finding that rests only on a users node; keeps the same label on a workload node', () => {
    const g = graph();
    const raw = constraintChecker({ graph: g, says: [], constraints: [SG], catalog: CAT });
    assert.ok(raw.some((w) => w.code === 'constraint-region' && w.ids.join() === 'users'), 'the core checker flags the users label');
    assert.deepEqual(defaultConstraintChecker({ graph: g, says: [], constraints: [SG], catalog: CAT }), []);
    g.nodes.web.label = '호주 웹 서버';
    const kept = defaultConstraintChecker({ graph: g, says: [], constraints: [SG], catalog: CAT });
    assert.deepEqual(kept.map((w) => w.ids.join()), ['web']);
  });

  test('keeps say-line and avoid findings', () => {
    const says = ['Back up the database to Sydney every night.'];
    const ws = defaultConstraintChecker({ graph: graph(), says, constraints: [SG, { text: 'No ECS', avoid: ['ecs'] }], catalog: CAT });
    assert.ok(ws.some((w) => w.code === 'constraint-region' && w.severity === 'error' && w.ids.length === 0), JSON.stringify(ws));
    assert.ok(ws.some((w) => w.code === 'constraint-avoid' && w.ids.join() === 'web'));
  });

  test('runTurn uses it by default: a users node labelled with a foreign country triggers no repair turn', async () => {
    const content = [
      line({ t: 'say', text: 'Sydney is closed, so I will deploy in Singapore for your Australian customers.' }),
      line({ t: 'group', id: 'sg', kind: 'region', label: 'Singapore', parent: null }),
      line({ t: 'node', id: 'users', product: 'users', label: 'Customers in Australia', group: null }),
      line({ t: 'node', id: 'web', product: 'ecs', label: 'Web servers', group: 'sg' }),
      line({ t: 'edge', id: 'e1', from: 'users', to: 'web' }),
      line({ t: 'done', summary: 'Singapore web app' }),
    ].join('\n');
    const mem: SessionMemory = { ...createMemory(), requirements: [SG.text], constraints: [SG] };
    const calls: unknown[] = [];
    const r = await runTurn(mem, 'deploy for Australian customers', CAT, { apiKey: 'k', retries: 0, fetchImpl: mockFetch([sse(content)], calls) });
    assert.equal(calls.length, 1, 'no repair turn');
    assert.equal(r.stats.repair, undefined);
    assert.equal(r.stats.warningsAfter.filter((w) => w.code === 'constraint-region' && w.severity === 'error').length, 0);
    // Control: the raw core checker sends the same reply to a repair turn.
    const calls2: unknown[] = [];
    const fix = [line({ t: 'say', text: 'Nothing to change.' }), line({ t: 'done', summary: 'x' })].join('\n');
    const r2 = await runTurn(mem, 'deploy for Australian customers', CAT, { apiKey: 'k', retries: 0, checkConstraints: constraintChecker, fetchImpl: mockFetch([sse(content), sse(fix)], calls2) });
    assert.equal(calls2.length, 2);
    assert.equal(r2.stats.repair?.kind, 'repair');
  });
});

describe('system prompt R12b (prompt.ts)', () => {
  test('teaches that a requirement with no regions or avoid is still pinned, one req op per requirement', () => {
    const s = buildSystemPrompt(CAT);
    assert.ok(s.includes('is still pinned, as text alone: {"t":"req","text":"Team knows Java only"}'));
    assert.ok(s.includes('Two requirements in one message get two req ops'));
    assert.ok(s.length / 4 < 12500, `system prompt ${s.length} chars`);
  });
});

describe('classifyRepairTurn (phase1-report.ts)', () => {
  const W = (ids: string[], severity: Warning['severity'] = 'error', code: Warning['code'] = 'constraint-region'): Warning => ({ code, ids, msg: 'x', severity, repaired: false });
  const turn = (kind: 'repair' | 'continue' | 'both' | null, findings: Warning[]): TurnRecord =>
    ({ index: 0, ops: [], graph: graph(), stats: kind ? { repair: { kind, findings } } : {} }) as unknown as TurnRecord;
  test('a repair turn whose every error rests on a users node is the client-node false positive', () => {
    assert.equal(classifyRepairTurn(turn('repair', [W(['users']), W([], 'warn')]), CAT), 'false-positive (client node)');
  });
  test('any other error, a say-line error or a workload node, goes to review', () => {
    assert.equal(classifyRepairTurn(turn('repair', [W(['users']), W(['web'])]), CAT), 'review');
    assert.equal(classifyRepairTurn(turn('both', [W([])]), CAT), 'review');
    assert.equal(classifyRepairTurn(turn('repair', [W(['users'], 'error', 'duplicate-id')]), CAT), 'review');
  });
  test('no follow-up turn, or a continuation only, is not a repair turn', () => {
    assert.equal(classifyRepairTurn(turn(null, []), CAT), null);
    assert.equal(classifyRepairTurn(turn('continue', []), CAT), null);
  });
});
