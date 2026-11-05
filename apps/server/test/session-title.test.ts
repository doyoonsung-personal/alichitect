import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactSessionTitle, draftSessionTitle, needsSessionTitle, sessionTitleBrief } from '../../../packages/core/src/session-title.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { executeTurn } from '../src/turn.ts';
import { checkTurnRequest } from '../src/request.ts';
import { sharedTurnState } from '../../worker/src/turn.ts';
import type { ServerEvent } from '../../../packages/core/src/types.ts';
import { createTurnServer } from '../src/server.ts';
import { configFromEnv, hostsFor } from '../src/config.ts';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';

const sse = (content: string, finish = 'stop') => new Response('data: ' + JSON.stringify({
  choices: [{ delta: { content }, finish_reason: finish }], usage: { prompt_tokens: 100, completion_tokens: 20 },
}) + '\n\ndata: [DONE]\n\n');

test('retroactive migration identifies only prompt-derived names and validates standalone briefs', () => {
  const brief = 'We want to improve inventory planning across all our stores, preserving human approval. '.repeat(5);
  for (const old of [brief, brief.slice(0, 120), brief.slice(0, 160), compactSessionTitle(brief), '']) assert.equal(needsSessionTitle(old, brief), true);
  const unicode = '재고📦'.repeat(100);
  assert.equal(needsSessionTitle(Array.from(unicode).slice(0, 120).join(''), unicode), true);
  assert.equal(needsSessionTitle('Approved inventory proposal', brief), false);
  assert.equal(needsSessionTitle(brief, brief, 1), false);
  assert.equal(sessionTitleBrief({ ask: '  inventory planning  ' }), 'inventory planning');
  for (const bad of [null, {}, { ask: '' }, { ask: 'x'.repeat(6001) }, { ask: 42 }]) assert.equal(sessionTitleBrief(bad), null);
});

test('local standalone title route validates input and caches Flash without reserving a design turn', async () => {
  const config = configFromEnv({ TURN_LOG: '0' });
  let calls = 0;
  const server = createTurnServer({ config, catalog: loadCatalog(), apiKey: 'fake', fetchImpl: async () => {
    calls++; return sse('{"title":"Regional inventory planning"}');
  } });
  const port = await server.listen(0);
  config.allowedHosts = hostsFor(port);
  const post = (ask: unknown, origin = 'http://localhost:5174') => fetch(`http://127.0.0.1:${port}/api/session-title`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ ask }),
  });
  try {
    assert.equal((await post('brief', 'https://other.invalid')).status, 403);
    assert.equal((await post('x'.repeat(6001))).status, 400);
    assert.equal((await post('x'.repeat(33000))).status, 413);
    for (let n = 0; n < 2; n++) assert.deepEqual(await (await post('Plan regional inventory')).json(), { title: 'Regional inventory planning', titleVersion: 1 });
    assert.equal(calls, 1);
    assert.deepEqual(server.inFlight(), { turns: 0, sessions: [] });
  } finally { await server.close(); }
});

test('titles preserve language, bound Unicode safely and sanitize whitespace', async () => {
  for (const title of ['Regional inventory planning', '매장별 재고 최적화', '多门店库存优化']) {
    const result = await draftSessionTitle('Customer brief', { apiKey: 'fake', fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'qwen3.8-flash');
      assert.equal(body.enable_thinking, false);
      assert.equal(body.max_completion_tokens, 120);
      return sse(JSON.stringify({ title }));
    } });
    assert.equal(result.title, title);
    assert.ok(result.costUsd > 0);
  }
  assert.equal(compactSessionTitle('  abc\n\tdef\u202eg  '), 'abc def g');
  const long = compactSessionTitle('🎯'.repeat(90));
  assert.equal(Array.from(long).length, 60);
  assert.equal(long.at(-1), '…');
  assert.equal(long.isWellFormed(), true);
});

test('unusable Flash output falls back without failing the design', async () => {
  const prompt = '우리 매장마다 재고가 부족하거나 너무 많이 남습니다. '.repeat(20);
  for (const response of [() => sse('not JSON'), () => sse('{"title":""}'),
    () => sse('{"title":"partial"}', 'length'), () => new Response('', { status: 503 }),
    () => { throw new Error('network'); }]) {
    const result = await draftSessionTitle(prompt, { apiKey: 'fake', fetchImpl: async () => response() });
    assert.equal(result.title, compactSessionTitle(prompt));
  }
});

for (const mode of ['cloud', 'workflow'] as const) test(`${mode}: first-turn title runs in parallel, travels with commit, later turns never rename`, async () => {
  let designStarted = false;
  const models: string[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); models.push(body.model);
    if (body.model === 'qwen3.8-flash') {
      await new Promise(resolve => setImmediate(resolve));
      assert.ok(designStarted, 'title does not block starting the architecture request');
      return sse('{"title":"매장 재고 최적화"}');
    }
    designStarted = true;
    return sse('{"t":"say","text":"Design saved."}\n{"t":"done","summary":"Saved"}\n');
  };
  const deps = { ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null,
    baseUrl: 'https://fake.invalid', turnOptions: { retries: 0, repair: false }, fetchImpl };
  const req = { sessionId: 's', ask: '재고를 최적화해주세요', memory: createMemory(), mode, generateTitle: true };
  assert.equal(checkTurnRequest({ ...req, generateTitle: 'yes' }).ok, false);
  const checked = checkTurnRequest(req);
  assert.ok(checked.ok);
  const events: ServerEvent[] = [];
  const result = await executeTurn(checked.value, deps, e => { if (e.type === 'commit') events.push(e); }, new AbortController().signal);
  assert.equal(result.outcome, 'commit');
  const first = events[0]; assert.equal(first.type, 'commit');
  if (first.type !== 'commit') return;
  assert.equal(first.title, '매장 재고 최적화');
  assert.ok(result.titleCostUsd! > 0);
  await executeTurn({ ...req, memory: first.memory }, deps, e => {
    if (e.type === 'commit') assert.equal(e.title, undefined);
  }, new AbortController().signal);
  assert.equal(models.filter(m => m === 'qwen3.8-flash').length, 1);
});

test('aborting a turn cancels its concurrent title request without committing a title', async () => {
  const ac = new AbortController();
  let titleCancelled = false;
  const result = await executeTurn({ sessionId: 's', ask: 'Design', memory: createMemory(), generateTitle: true }, {
    ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null, baseUrl: 'https://fake.invalid',
    fetchImpl: async (_url, init) => {
      const flash = JSON.parse(String(init?.body)).model === 'qwen3.8-flash';
      if (!flash) setImmediate(() => ac.abort());
      return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => {
        if (flash) titleCancelled = true;
        reject(new DOMException('Aborted', 'AbortError'));
      }));
    },
  }, e => assert.notEqual(e.type, 'commit'), ac.signal);
  assert.equal(result.outcome, 'aborted');
  assert.ok(titleCancelled);
});
