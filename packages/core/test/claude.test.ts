// The Claude backup (claude.ts) and runTurn's rescue of turns Model Studio's content filter stops, with no network: one
// fake fetch answers Model Studio (dashscope) and, injected into the Anthropic SDK, api.anthropic.com. Covers: the
// request shape (model, effort, no thinking, server-side fallback, caching), a filter mid-stream continued on Claude,
// a filter before any op run whole on Claude, both failing (the partial is kept with a warning), refusals, no key
// (behaviour unchanged), the key never in events or errors, abort on disconnect, watchdogs and the cost of a fallback.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/catalog-node.ts';
import { runTurn } from '../src/llm.ts';
import type { BackupGateResult, RunStatus, TurnEvent } from '../src/llm.ts';
import { CLAUDE_BACKUP_MODEL, CLAUDE_FALLBACK_BETA, CLAUDE_MAX_OUTPUT_CHARS, CLAUDE_MAX_TOKENS, claudeBackupConfig, claudeCost, claudeError, claudeModelOf, claudeRequest, createClaudeBackup, toClaudeMessages, BACKUP_VOICE_NOTE } from '../src/claude.ts';
import type { ClaudeBackupOptions } from '../src/claude.ts';
import { createMemory } from '../src/prompt.ts';
import modelsFile from '../catalog/models.json' with { type: 'json' };
import { createModelTable } from '../src/models.ts';
import type { ModelFile } from '../src/models.ts';
import { BACKUP_TEXT_VOICE_NOTE, BACKUP_WORKFLOW_VOICE_NOTE } from '../src/claude.ts';
import Anthropic from '@anthropic-ai/sdk';

const CAT = loadCatalog();
const KEY = 'sk-ant-api03-SECRET-claude-0123456789abcdef';
const QWEN_KEY = 'sk-test-QWEN-0123456789abcdef';
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);
const abortError = (): Error => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

// ---------- fake upstreams ----------

interface Call {
  host: string;
  headers: Headers;
  body: Record<string, unknown>;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response | Promise<Response>;

/** One fetch for both providers: dashscope calls take the next qwen handler, api.anthropic.com calls the next claude one. */
function router(q: Handler[], c: Handler[], calls: Call[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url instanceof Request ? url.url : url));
    const call: Call = { host: u.host, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, signal: init!.signal! };
    calls.push(call);
    const h = u.host === 'api.anthropic.com' ? c.shift() : q.shift();
    if (!h) throw new Error(`fake upstream: no handler queued for ${u.host}`);
    return h(call);
  }) as typeof fetch;
}

/** A 200 event stream of `text`, in 64-byte reads; `hang` keeps it open after the text until the request is aborted. */
function sseResponse(c: Call, text: string, o: { hang?: boolean } = {}): Response {
  const bytes = enc.encode(text);
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(ctl) {
      c.signal.addEventListener('abort', () => {
        try {
          ctl.error(abortError());
        } catch {
          /* closed */
        }
      });
    },
    pull(ctl) {
      if (i >= bytes.length) {
        if (o.hang) return new Promise<void>(() => undefined);
        ctl.close();
        return;
      }
      const end = Math.min(bytes.length, i + 64);
      ctl.enqueue(bytes.slice(i, end));
      i = end;
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream', 'request-id': 'req_test' } });
}

// Model Studio (OpenAI-compatible SSE)
const qev = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
const QWEN_PART = [
  line({ t: 'say', text: 'A web tier in Singapore.' }),
  line({ t: 'group', id: 'sg', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null }),
  line({ t: 'group', id: 'vpc', kind: 'vpc', label: 'App VPC', parent: 'sg' }),
  line({ t: 'node', id: 'app', product: 'ecs', label: 'Web', group: 'vpc', why: 'Runs the site.' }),
].join('\n') + '\n';
/** Ops, then Model Studio's output inspection stops the stream (DataInspectionFailed error event). */
const QWEN_FILTERED_MID = qev({ choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] }) + qev({ choices: [{ index: 0, delta: { content: QWEN_PART } }] }) + qev({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } }) + 'data: [DONE]\n\n';
const qwenFilteredMid: Handler = (c) => sseResponse(c, QWEN_FILTERED_MID);
const qwenFilteredHttp: Handler = () => new Response('{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content.","request_id":"x"}', { status: 400 });
const qwenFinishFiltered: Handler = (c) => sseResponse(c, qev({ choices: [{ index: 0, delta: { content: QWEN_PART } }] }) + qev({ choices: [{ index: 0, delta: {}, finish_reason: 'content_filter' }] }) + 'data: [DONE]\n\n');

// Anthropic Messages (SSE with event names; the SDK skips events without one)
const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const START_USAGE = { input_tokens: 2000, output_tokens: 1, cache_read_input_tokens: 15000, cache_creation_input_tokens: 0 };

interface ClaudeSse {
  stop?: 'end_turn' | 'refusal' | 'max_tokens';
  category?: string;
  model?: string;
  outputTokens?: number;
  iterations?: unknown[];
  /** A server-side fallback hop after this many characters of text, to this model. */
  fallbackAt?: number;
  fallbackTo?: string;
}

function claudeSse(text: string, o: ClaudeSse = {}): string {
  const model = o.model ?? CLAUDE_BACKUP_MODEL;
  let s = cev('message_start', { message: { id: 'msg_test', type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: START_USAGE } });
  s += cev('ping');
  s += cev('content_block_start', { index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } }) + cev('content_block_delta', { index: 0, delta: { type: 'signature_delta', signature: 'sig' } }) + cev('content_block_stop', { index: 0 });
  let index = 1;
  const block = (t: string): void => {
    s += cev('content_block_start', { index, content_block: { type: 'text', text: '' } });
    for (let i = 0; i < t.length; i += 40) s += cev('content_block_delta', { index, delta: { type: 'text_delta', text: t.slice(i, i + 40) } });
    s += cev('content_block_stop', { index });
    index++;
  };
  if (o.fallbackAt !== undefined && o.fallbackTo) {
    block(text.slice(0, o.fallbackAt));
    s += cev('content_block_start', { index, content_block: { type: 'fallback', from: { model }, to: { model: o.fallbackTo }, trigger: { type: 'refusal', category: 'cyber' } } }) + cev('content_block_stop', { index });
    index++;
    block(text.slice(o.fallbackAt));
  } else if (text) block(text);
  const stop = o.stop ?? 'end_turn';
  s += cev('message_delta', {
    delta: { stop_reason: stop, stop_sequence: null, stop_details: stop === 'refusal' ? { type: 'refusal', category: o.category ?? 'cyber', explanation: null } : null },
    usage: { output_tokens: o.outputTokens ?? 300, ...(o.iterations ? { iterations: o.iterations } : {}) },
  });
  return s + cev('message_stop');
}

const CLAUDE_REST = [
  line({ t: 'node', id: 'db', product: 'rds', label: 'Orders DB', group: 'vpc', why: 'Stores orders.' }),
  line({ t: 'edge', id: 'e-app-db', from: 'app', to: 'db', label: 'SQL' }),
  line({ t: 'say', text: 'Added the database.' }),
  line({ t: 'done', summary: 'Web tier with RDS.' }),
].join('\n') + '\n';
const CLAUDE_WHOLE = QWEN_PART + CLAUDE_REST;
const claudeOk = (text: string, o: ClaudeSse = {}): Handler => (c) => sseResponse(c, claudeSse(text, o));
const claudeHttp = (status: number, type: string): Handler => () => new Response(JSON.stringify({ type: 'error', error: { type, message: `upstream says ${type}, key ${KEY}` } }), { status, headers: { 'content-type': 'application/json' } });

/** 2000 uncached + 15000 cache reads + 300 out at claude-opus-5-5 prices ($4 / $0.20 / $20 per MTok). */
const CLAUDE_CALL_COST = (2000 * 4 + 15000 * 0.2 + 300 * 20) / 1e6;

const backupWith = (fetchImpl: typeof fetch, o: Partial<ClaudeBackupOptions> = {}) => createClaudeBackup({ apiKey: KEY, fetchImpl, maxRetries: 0, watchdogs: { firstByteTimeoutMs: 3000, idleTimeoutMs: 3000, totalTimeoutMs: 10000 }, ...o });
const TURN = { apiKey: QWEN_KEY, retries: 2, backoffMs: 1, firstByteTimeoutMs: 3000, idleTimeoutMs: 3000, totalTimeoutMs: 10000 };
const key = (s: RunStatus): string => `${s.code}:${s.phase}${s.provider ? ':' + s.provider : ''}`;

// ---------- the request ----------

describe('Claude backup: the request', () => {
  test('claude-opus-5-5 at effort low, no thinking param, server-side fallback "default", cached system prompt plus automatic caching', () => {
    const req = claudeRequest(CLAUDE_BACKUP_MODEL, [
      { role: 'system', content: [{ type: 'text', text: 'SYSTEM PROMPT', cache_control: { type: 'ephemeral' } }] },
      { role: 'user', content: 'first' },
      { role: 'assistant', content: '{"t":"done","summary":""}' },
      { role: 'user', content: 'second' },
    ]);
    assert.equal(req.model, 'claude-opus-5-5');
    assert.equal(req.stream, true);
    assert.ok(req.max_tokens >= 16000 && req.max_tokens <= 24000, `max_tokens ${req.max_tokens}: room for thinking and the longest reply, but a call is bounded in money (<= $0.48 of output)`);
    assert.equal(req.max_tokens, CLAUDE_MAX_TOKENS);
    assert.equal('thinking' in req, false, 'Claude Opus 5.5 always thinks; disabling it is a 400');
    assert.deepEqual(req.output_config, { effort: 'low' });
    assert.equal(req.fallbacks, 'default');
    assert.deepEqual(req.betas, [CLAUDE_FALLBACK_BETA]);
    assert.equal(CLAUDE_FALLBACK_BETA, 'server-side-fallback-2026-07-01');
    assert.deepEqual(req.cache_control, { type: 'ephemeral' });
    assert.deepEqual(req.system, [{ type: 'text', text: `SYSTEM PROMPT

${BACKUP_VOICE_NOTE}`, cache_control: { type: 'ephemeral' } }]);
    assert.match(BACKUP_VOICE_NOTE, /never name an AI model/);
    assert.deepEqual(req.messages, [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: '{"t":"done","summary":""}' },
      { role: 'user', content: 'second' },
    ]);
  });

  test('messages: system text leaves the list, empty text gets a placeholder, the list starts with a user turn', () => {
    const c = toClaudeMessages([{ role: 'system', content: 'S1' }, { role: 'system', content: 'S2' }, { role: 'assistant', content: '  ' }, { role: 'user', content: 'u' }]);
    assert.equal(c.system, 'S1\n\nS2');
    assert.deepEqual(c.messages.map((m) => m.role), ['user', 'assistant', 'user']);
    assert.equal(c.messages[1].content, '(empty)');
  });

  test('config: no key means no backup; CLAUDE_BACKUP_MODEL overrides the model only with a Claude model id', () => {
    assert.equal(claudeBackupConfig({}), undefined);
    assert.equal(claudeBackupConfig({ ANTHROPIC_API_KEY: '   ' }), undefined);
    assert.deepEqual(claudeBackupConfig({ ANTHROPIC_API_KEY: ` ${KEY} ` }), { apiKey: KEY, model: 'claude-opus-5-5' });
    assert.equal(claudeBackupConfig({ ANTHROPIC_API_KEY: KEY, CLAUDE_BACKUP_MODEL: 'claude-opus-5' })?.model, 'claude-opus-5');
    assert.equal(claudeModelOf('gpt-x'), 'claude-opus-5-5');
    assert.equal(claudeModelOf(''), 'claude-opus-5-5');
    // only the Claude models of the PRICES table: a model without a price would be booked at UNKNOWN_PRICE ($3 / $15)
    assert.equal(claudeModelOf('claude-opus-4-8'), 'claude-opus-4-8');
    for (const unpriced of ['claude-haiku-9', 'claude-opus-5-5-preview', 'claude-', 'claude-opus-5-5 ; x', 'claude-constructor', 'claude-__proto__', 'kimi-k3']) assert.equal(claudeModelOf(unpriced), 'claude-opus-5-5', unpriced);
    assert.equal(claudeBackupConfig({ ANTHROPIC_API_KEY: KEY, CLAUDE_BACKUP_MODEL: 'claude-made-up' })?.model, 'claude-opus-5-5');
    assert.throws(() => createClaudeBackup({ apiKey: ' ' }));
  });

  test('one SDK call over the injected fetch: headers, body and the key only in the auth header', async () => {
    const calls: Call[] = [];
    const b = backupWith(router([], [claudeOk(CLAUDE_WHOLE)], calls));
    const r = await b.stream({ messages: [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'Draw it.' }], catalog: CAT });
    assert.equal(calls.length, 1);
    const c = calls[0];
    assert.equal(c.host, 'api.anthropic.com');
    assert.ok(c.headers.get('authorization') === `Bearer ${KEY}` || c.headers.get('x-api-key') === KEY, 'the key goes in the auth header');
    assert.ok((c.headers.get('anthropic-beta') ?? '').split(',').map((s) => s.trim()).includes(CLAUDE_FALLBACK_BETA));
    assert.equal(c.body.model, 'claude-opus-5-5');
    assert.equal(c.body.fallbacks, 'default');
    assert.equal('betas' in c.body, false, 'betas travel as the header');
    assert.equal('thinking' in c.body, false);
    assert.ok(!JSON.stringify(c.body).includes(KEY));
    assert.equal(r.provider, 'claude');
    assert.equal(r.error, undefined);
    assert.ok(r.doneSeen);
    assert.deepEqual(Object.keys(r.graph.nodes).sort(), ['app', 'db']);
    assert.equal(r.finishReason, 'end_turn');
    assert.ok(Math.abs(r.costUsd - CLAUDE_CALL_COST) < 1e-9, `cost ${r.costUsd}`);
    assert.equal(r.usage?.prompt_tokens, 17000);
    assert.equal(r.usage?.prompt_tokens_details?.cached_tokens, 15000);
  });
});

// ---------- runTurn rescue ----------

describe('runTurn with a backup: Model Studio filtered the reply', () => {
  test('filtered mid-stream after ops: Claude continues from the partial diagram and the turn commits', async () => {
    for (const qwen of [qwenFilteredMid, qwenFinishFiltered]) {
      const calls: Call[] = [];
      const statuses: RunStatus[] = [];
      const events: Array<TurnEvent & { phase: string }> = [];
      const fetchImpl = router([qwen], [claudeOk(CLAUDE_REST)], calls);
      const mem = createMemory();
      const r = await runTurn(mem, 'Web tier with a database in Singapore', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s), onEvent: (e) => events.push(e) });
      assert.deepEqual(statuses.map(key), ['fallback:repair:claude', 'continue:repair:claude'], 'a fallback status first, then the continuation the web app mirrors');
      assert.equal(statuses[0].text, 'Finishing the answer.', 'the status text is neutral too: it names neither a model nor the filter');
      assert.equal(statuses[0].reason, 'content-filtered');
      assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'api.anthropic.com'], 'no Qwen retry and no qwen3.7-max');
      assert.notEqual(r.memory, mem, 'the turn commits');
      assert.deepEqual(Object.keys(r.memory.graph.nodes).sort(), ['app', 'db'], "Qwen's node and Claude's node");
      assert.ok(r.memory.graph.edges['e-app-db']);
      assert.ok(r.stats.finalDone);
      assert.equal(r.stats.error?.code, 'content-filtered', 'the main stream was filtered');
      assert.equal(r.stats.repair?.provider, 'claude');
      assert.equal(r.stats.repair?.model, 'claude-opus-5-5');
      assert.equal(r.stats.repair?.kind, 'continue');
      assert.ok(r.stats.backupUsed);
      assert.deepEqual([r.stats.rescue?.kind, r.stats.rescue?.ok, r.stats.rescue?.from, r.stats.rescue?.provider], ['continue', true, 'qwen3.8-max', 'claude']);
      assert.deepEqual(r.stats.attempts.map((a) => `${a.provider}:${a.model}`), ['qwen:qwen3.8-max']);
      assert.ok(!r.stats.warningsAfter.some((w) => w.code === 'reply-incomplete'));
      assert.ok(r.memory.turns[1].text.includes('Added the database.'), "Claude's say line joins the narration");
      assert.ok(Math.abs((r.stats.rescue?.costUsd ?? 0) - CLAUDE_CALL_COST) < 1e-9);
      assert.ok(r.stats.costUsd >= CLAUDE_CALL_COST);
      // the continuation request: the turn's messages, Qwen's partial reply as the assistant turn, then the continue note
      const body = calls[1].body as { messages: Array<{ role: string; content: string }>; system: Array<{ text: string }> };
      assert.deepEqual(body.messages.map((m) => m.role), ['user', 'assistant', 'user']);
      assert.ok(body.messages[1].content.includes('"id":"app"'));
      assert.match(body.messages[2].content, /stopped before the closing done op/);
      assert.match(body.system[0].text, /./);
      assert.ok(events.some((e) => e.type === 'op' && e.phase === 'repair' && e.op.t === 'node' && e.op.id === 'db'), "Claude's ops stream as repair-phase events");
    }
  });

  test('filtered before any op: the whole turn runs on Claude', async () => {
    const calls: Call[] = [];
    const statuses: RunStatus[] = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeOk(CLAUDE_WHOLE)], calls);
    const mem = createMemory();
    const r = await runTurn(mem, 'Web tier with a database', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s) });
    assert.deepEqual(statuses.map(key), ['fallback:main:claude']);
    assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'api.anthropic.com']);
    assert.notEqual(r.memory, mem);
    assert.deepEqual(Object.keys(r.memory.graph.nodes).sort(), ['app', 'db']);
    assert.equal(r.stats.error, undefined, "Claude's reply is the turn's reply");
    assert.deepEqual(r.stats.attempts.map((a) => `${a.provider}:${a.model}:${a.error?.code ?? 'ok'}`), ['qwen:qwen3.8-max:content-filtered', 'claude:claude-opus-5-5:ok']);
    assert.equal(r.stats.model, 'claude-opus-5-5');
    assert.deepEqual([r.stats.rescue?.kind, r.stats.rescue?.ok], ['turn', true]);
    assert.equal(r.stats.repair, undefined, 'a complete reply needs no follow-up');
    assert.ok(Math.abs(r.stats.costUsd - CLAUDE_CALL_COST) < 1e-9, 'the filtered HTTP 400 booked $0');
    const body = calls[1].body as { messages: Array<{ role: string; content: string }> };
    assert.equal(body.messages.length, 1);
    assert.match(body.messages[0].content, /USER MESSAGE:/);
  });

  test("Claude's whole-turn reply cut off (max_tokens): its continuation stays on Claude, never on Model Studio", async () => {
    const calls: Call[] = [];
    const statuses: RunStatus[] = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeOk(QWEN_PART, { stop: 'max_tokens' }), claudeOk(CLAUDE_REST)], calls);
    const r = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s) });
    assert.deepEqual(statuses.map(key), ['fallback:main:claude', 'continue:repair:claude']);
    assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'api.anthropic.com', 'api.anthropic.com']);
    assert.deepEqual(Object.keys(r.memory.graph.nodes).sort(), ['app', 'db']);
    assert.ok(r.stats.finalDone);
    assert.deepEqual([r.stats.rescue?.kind, r.stats.rescue?.ok], ['turn', true]);
    assert.ok(Math.abs((r.stats.rescue?.costUsd ?? 0) - 2 * CLAUDE_CALL_COST) < 1e-9, 'both Claude calls');
    assert.equal(r.stats.repair?.provider, 'claude');
  });

  test('both fail after Qwen drew: the partial diagram is committed with a reply-incomplete warning', async () => {
    for (const [claude, code] of [
      [claudeHttp(529, 'overloaded_error'), 'overloaded'],
      [claudeHttp(500, 'api_error'), 'server-error'],
      [claudeHttp(401, 'authentication_error'), 'auth'],
    ] as Array<[Handler, string]>) {
      const calls: Call[] = [];
      const statuses: RunStatus[] = [];
      const fetchImpl = router([qwenFilteredMid], [claude], calls);
      const mem = createMemory();
      const r = await runTurn(mem, 'Web tier', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s) });
      assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'api.anthropic.com'], `${code}: no fallback to qwen3.7-max`);
      assert.notEqual(r.memory, mem, `${code}: the partial diagram is kept`);
      assert.deepEqual(Object.keys(r.memory.graph.nodes), ['app']);
      assert.equal(r.stats.finalDone, false);
      assert.equal(r.stats.rescue?.error?.code, code);
      assert.equal(r.stats.rescue?.ok, false);
      const w = r.stats.warningsAfter.find((x) => x.code === 'reply-incomplete');
      assert.ok(w, `${code}: a clear warning`);
      assert.equal(w.severity, 'warn');
      assert.equal(w.msg, 'The reply is incomplete. The diagram keeps what was drawn.');
      assert.doesNotMatch(w.msg, /claude|anthropic|backup|filter|qwen|model|opus/i, `${code}: the warning goes to the browser and names no vendor, model or filter`);
      assert.ok(!w.msg.includes(KEY) && !JSON.stringify(r.stats).includes(KEY), 'the upstream echoed the key; it never reaches stats');
    }
  });

  test('both fail before anything was drawn: memory unchanged, the turn stays content-filtered', async () => {
    const fetchImpl = router([qwenFilteredHttp], [claudeHttp(529, 'overloaded_error')]);
    const mem = createMemory();
    const r = await runTurn(mem, 'Web tier', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl) });
    assert.equal(r.memory, mem);
    assert.deepEqual([r.stats.error?.code, r.stats.error?.retryable], ['content-filtered', false]);
    assert.equal(r.stats.rescue?.error?.code, 'overloaded');
    assert.ok(r.stats.backupUsed);
  });
});

describe('Claude refusals', () => {
  test('stop_reason refusal is a non-retryable refusal error with its category', async () => {
    const b = backupWith(router([], [claudeOk(line({ t: 'say', text: 'Drawing.' }) + '\n', { stop: 'refusal', category: 'cyber' })]));
    const r = await b.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.deepEqual([r.error?.code, r.error?.retryable], ['refusal', false]);
    assert.match(r.error!.message, /cyber/);
    assert.equal(r.finishReason, 'refusal');
  });

  test('whole-turn rescue refused: refused output is discarded, memory unchanged, still content-filtered', async () => {
    const statuses: RunStatus[] = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeOk(QWEN_PART, { stop: 'refusal' })]);
    const mem = createMemory();
    const r = await runTurn(mem, 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s) });
    assert.equal(r.memory, mem);
    assert.equal(r.stats.error?.code, 'content-filtered');
    assert.deepEqual([r.stats.rescue?.error?.code, r.stats.rescue?.ops], ['refusal', 4]);
    assert.deepEqual(statuses.map(key), ['fallback:main:claude']);
  });

  test("continuation refused: Claude's refused ops are dropped, Qwen's partial diagram is committed with the warning", async () => {
    const fetchImpl = router([qwenFilteredMid], [claudeOk(CLAUDE_REST.split('\n').slice(0, 1).join('\n') + '\n', { stop: 'refusal' })]);
    const mem = createMemory();
    const r = await runTurn(mem, 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl) });
    assert.notEqual(r.memory, mem);
    assert.deepEqual(Object.keys(r.memory.graph.nodes), ['app'], 'the refused db node is not committed');
    assert.deepEqual(r.stats.repair?.ops, []);
    assert.equal(r.stats.rescue?.error?.code, 'refusal');
    const w = r.stats.warningsAfter.find((x) => x.code === 'reply-incomplete');
    assert.ok(w && w.msg === 'The reply is incomplete. The diagram keeps what was drawn.' && !/declin|refus/i.test(w.msg), 'the browser is not told that the backup refused; the log is (rescue.error)');
  });

  test('a server-side fallback hop mid-stream: the text continues, the served model is recorded, each attempt priced at its own model', async () => {
    const iterations = [
      { type: 'message', model: 'claude-opus-5-5', input_tokens: 2000, output_tokens: 100, cache_read_input_tokens: 15000, cache_creation_input_tokens: 0, cache_creation: null },
      { type: 'fallback_message', model: 'claude-opus-5', input_tokens: 17000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cache_creation: null },
    ];
    const at = CLAUDE_WHOLE.indexOf('{"t":"node","id":"app"') + 10; // the hop splits a line: the fallback model continues it
    const b = backupWith(router([], [claudeOk(CLAUDE_WHOLE, { fallbackAt: at, fallbackTo: 'claude-opus-5', iterations })]));
    const r = await b.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.equal(r.error, undefined);
    assert.equal(r.servedModel, 'claude-opus-5');
    assert.deepEqual(Object.keys(r.graph.nodes).sort(), ['app', 'db']);
    assert.equal(r.badLines.length, 0, 'the line split by the hop parses whole');
    const expected = (2000 * 4 + 15000 * 0.2 + 100 * 20) / 1e6 + (17000 * 5 + 300 * 25) / 1e6;
    assert.ok(Math.abs(r.costUsd - expected) < 1e-9, `cost ${r.costUsd} vs ${expected}`);
    assert.equal(r.usage?.completion_tokens, 400, 'tokens summed over both attempts');
    assert.ok(Math.abs(claudeCost('claude-opus-5-5', { ...START_USAGE, output_tokens: 300 } as unknown as Anthropic.Beta.BetaUsage) - CLAUDE_CALL_COST) < 1e-9);
  });
});

describe('no key configured', () => {
  test('without a backup a filtered turn behaves exactly as before: one call, no status, memory unchanged', async () => {
    for (const qwen of [qwenFilteredMid, qwenFilteredHttp]) {
      const calls: Call[] = [];
      const statuses: RunStatus[] = [];
      const mem = createMemory();
      const r = await runTurn(mem, 'x', CAT, { ...TURN, fetchImpl: router([qwen], [], calls), onStatus: (s) => statuses.push(s) });
      assert.equal(calls.length, 1);
      assert.equal(statuses.length, 0);
      assert.equal(r.memory, mem);
      assert.equal(r.stats.error?.code, 'content-filtered');
      assert.equal(r.stats.backupUsed, false);
      assert.equal(r.stats.rescue, undefined);
      assert.equal(r.stats.repair, undefined);
      assert.deepEqual(r.stats.attempts.map((a) => a.provider), ['qwen']);
    }
  });

  test('a backup is never used for anything but a content filter: stalls still go to qwen3.7-max', async () => {
    const calls: Call[] = [];
    const ok = qev({ choices: [{ index: 0, delta: { content: CLAUDE_WHOLE } }] }) + qev({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n';
    const fetchImpl = router([() => new Response('busy', { status: 503 }), (c) => sseResponse(c, ok)], [], calls);
    const r = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl) });
    assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'dashscope-intl.aliyuncs.com']);
    assert.equal(r.stats.backupUsed, false);
    assert.ok(r.stats.finalDone);
  });
});

describe('the Anthropic key', () => {
  test('never appears in events, statuses, stats or errors, whatever the upstream echoes', async () => {
    for (const claude of [claudeOk(CLAUDE_REST), claudeHttp(401, 'authentication_error'), claudeHttp(400, 'invalid_request_error'), (c: Call) => sseResponse(c, cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: CLAUDE_BACKUP_MODEL, content: [], stop_reason: null, stop_sequence: null, usage: START_USAGE } }) + cev('error', { error: { type: 'overloaded_error', message: `echo ${KEY}` } }))]) {
      const seen: string[] = [];
      const calls: Call[] = [];
      const fetchImpl = router([qwenFilteredMid], [claude], calls);
      const r = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => seen.push(JSON.stringify(s)), onEvent: (e) => seen.push(JSON.stringify(e)) });
      seen.push(JSON.stringify(r.stats), JSON.stringify(r.memory));
      for (const s of seen) assert.ok(!s.includes(KEY) && !s.includes(KEY.slice(0, 16)), s.slice(0, 200));
      const auth = calls[1].headers.get('authorization') ?? calls[1].headers.get('x-api-key') ?? '';
      assert.ok(auth.includes(KEY), 'only in the request header');
    }
  });

  test('typed SDK errors map to codes; messages are built from status and type, never from response text', () => {
    const h = new Headers();
    const body = { type: 'error', error: { type: 'x', message: `leak ${KEY}` } };
    const cases: Array<[unknown, string, boolean]> = [
      [new Anthropic.AuthenticationError(401, body, `leak ${KEY}`, h), 'auth', false],
      [new Anthropic.PermissionDeniedError(403, body, `leak ${KEY}`, h), 'auth', false],
      [new Anthropic.RateLimitError(429, body, `leak ${KEY}`, h), 'rate-limited', true],
      [new Anthropic.InternalServerError(529, body, `leak ${KEY}`, h, 'overloaded_error'), 'overloaded', true],
      [new Anthropic.APIError(undefined, body, `leak ${KEY}`, undefined, 'overloaded_error'), 'overloaded', true],
      [new Anthropic.InternalServerError(500, body, `leak ${KEY}`, h, 'api_error'), 'server-error', true],
      [new Anthropic.BadRequestError(400, body, `leak ${KEY}`, h, 'invalid_request_error'), 'http-400:invalid_request_error', false],
      [new Anthropic.APIConnectionError({ message: `leak ${KEY}` }), 'network', true],
      [new Anthropic.APIConnectionTimeoutError(), 'network', true],
      [new Anthropic.APIUserAbortError(), 'aborted', false],
      [new Error(`leak ${KEY}`), 'stream-error', true],
    ];
    for (const [e, code, retryable] of cases) {
      const te = claudeError(e);
      assert.deepEqual([te.code, te.retryable], [code, retryable], code);
      assert.ok(!te.message.includes(KEY), te.message);
    }
  });
});

describe('abort and watchdogs', () => {
  const START = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: CLAUDE_BACKUP_MODEL, content: [], stop_reason: null, stop_sequence: null, usage: START_USAGE } });

  test('the caller signal (client disconnect) aborts the Claude request at once', async () => {
    const calls: Call[] = [];
    const ac = new AbortController();
    const head = START + cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) + cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: QWEN_PART } });
    const b = backupWith(router([], [(c) => sseResponse(c, head, { hang: true })], calls), { watchdogs: { firstByteTimeoutMs: 20000, idleTimeoutMs: 20000, totalTimeoutMs: 60000 } });
    const t0 = Date.now();
    const p = b.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT, signal: ac.signal });
    await new Promise((res) => setTimeout(res, 150));
    ac.abort();
    const r = await p;
    assert.equal(r.error?.code, 'aborted');
    assert.ok(Date.now() - t0 < 3000, `took ${Date.now() - t0} ms`);
    assert.ok(calls[0].signal.aborted, 'the upstream fetch was aborted');
    assert.deepEqual(Object.keys(r.graph.nodes), ['app'], 'what arrived before the abort was applied');
  });

  test('runTurn: a disconnect during the rescue returns promptly and commits nothing', async () => {
    const calls: Call[] = [];
    const ac = new AbortController();
    const fetchImpl = router([qwenFilteredHttp], [(c) => sseResponse(c, START, { hang: true })], calls);
    const mem = createMemory();
    const t0 = Date.now();
    const p = runTurn(mem, 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl, { watchdogs: { firstByteTimeoutMs: 20000, idleTimeoutMs: 20000, totalTimeoutMs: 60000 } }), signal: ac.signal });
    await new Promise((res) => setTimeout(res, 150));
    ac.abort();
    const r = await p;
    assert.ok(Date.now() - t0 < 3000);
    assert.equal(r.memory, mem);
    assert.ok(calls[1].signal.aborted);
  });

  test('a stream that goes silent after its first event hits the idle watchdog; one that never starts, the first-byte one', async () => {
    const idle = backupWith(router([], [(c) => sseResponse(c, START, { hang: true })]), { watchdogs: { firstByteTimeoutMs: 2000, idleTimeoutMs: 120, totalTimeoutMs: 10000 } });
    const r1 = await idle.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.deepEqual([r1.error?.code, r1.error?.retryable], ['idle-timeout', true]);
    const never = backupWith(router([], [(c) => new Promise<Response>((_, rej) => c.signal.addEventListener('abort', () => rej(abortError()), { once: true }))]), { watchdogs: { firstByteTimeoutMs: 120, idleTimeoutMs: 2000, totalTimeoutMs: 10000 } });
    const r2 = await never.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.equal(r2.error?.code, 'first-byte-timeout');
    assert.equal(r2.costUsd, 0, 'nothing was billed');
  });
});

// ---------- spending guards: broken streams, the output budget, the gate, the deadline, what the browser sees ----------

describe('a stream that breaks before its final usage record', () => {
  const START = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: CLAUDE_BACKUP_MODEL, content: [], stop_reason: null, stop_sequence: null, usage: START_USAGE } });
  const THINK = 't'.repeat(2000);
  const SAY = line({ t: 'say', text: 'a'.repeat(3000) }) + '\n';
  const head = START
    + cev('content_block_start', { index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } }) + cev('content_block_delta', { index: 0, delta: { type: 'thinking_delta', thinking: THINK } }) + cev('content_block_stop', { index: 0 })
    + cev('content_block_start', { index: 1, content_block: { type: 'text', text: '' } }) + cev('content_block_delta', { index: 1, delta: { type: 'text_delta', text: SAY } });
  const streamed = THINK.length + SAY.length;
  /** The upper bound: all input as reported, one output token per two streamed characters. */
  const BOUND = (2000 * 4 + 15000 * 0.2 + Math.ceil(streamed / 2) * 20) / 1e6;
  const REPORTED_ONLY = (2000 * 4 + 15000 * 0.2 + 1 * 20) / 1e6;

  test('a watchdog abort books the input tokens reported plus output chars / 2 at the output price, and says it is an estimate', async () => {
    const b = backupWith(router([], [(c) => sseResponse(c, head, { hang: true })]), { watchdogs: { firstByteTimeoutMs: 2000, idleTimeoutMs: 150, totalTimeoutMs: 10000 } });
    const r = await b.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.equal(r.error?.code, 'idle-timeout');
    assert.ok(r.costUsd > REPORTED_ONLY * 2, `booked ${r.costUsd}: more than message_start's one output token`);
    assert.ok(Math.abs(r.costUsd - BOUND) < 1e-9, `booked ${r.costUsd}, bound ${BOUND}`);
    assert.equal(r.costEstimated, true);
    assert.equal(r.usage?.completion_tokens, Math.ceil(streamed / 2));
  });

  test("the caller's abort (a client disconnect) books the same bound", async () => {
    const ac = new AbortController();
    const b = backupWith(router([], [(c) => sseResponse(c, head, { hang: true })]), { watchdogs: { firstByteTimeoutMs: 20000, idleTimeoutMs: 20000, totalTimeoutMs: 60000 } });
    const p = b.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT, signal: ac.signal });
    await new Promise((res) => setTimeout(res, 150));
    ac.abort();
    const r = await p;
    assert.equal(r.error?.code, 'aborted');
    assert.ok(Math.abs(r.costUsd - BOUND) < 1e-9, `booked ${r.costUsd}, bound ${BOUND}`);
    assert.equal(r.costEstimated, true);
  });

  test('a complete stream books the reported usage exactly and is not an estimate', async () => {
    const r = await backupWith(router([], [claudeOk(CLAUDE_WHOLE)])).stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.ok(Math.abs(r.costUsd - CLAUDE_CALL_COST) < 1e-9);
    assert.equal(r.costEstimated, false);
  });

  test('a stream with no event at all books nothing (no usage was ever reported)', async () => {
    const never = backupWith(router([], [(c) => new Promise<Response>((_, rej) => c.signal.addEventListener('abort', () => rej(abortError()), { once: true }))]), { watchdogs: { firstByteTimeoutMs: 120, idleTimeoutMs: 2000, totalTimeoutMs: 10000 } });
    const r = await never.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.equal(r.costUsd, 0);
  });
});

describe('the output budget', () => {
  const START = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: CLAUDE_BACKUP_MODEL, content: [], stop_reason: null, stop_sequence: null, usage: START_USAGE } });
  const textStream = (text: string): string => {
    let s = START + cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    for (let i = 0; i < text.length; i += 40) s += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } });
    return s;
  };

  test('a call that writes past maxOutputChars is aborted with a non-retryable output-budget error and booked as an estimate', async () => {
    const calls: Call[] = [];
    const big = line({ t: 'say', text: 'a'.repeat(1500) }) + '\n';
    const b = backupWith(router([], [(c) => sseResponse(c, textStream(big), { hang: true })], calls), { maxOutputChars: 500, watchdogs: { firstByteTimeoutMs: 5000, idleTimeoutMs: 5000, totalTimeoutMs: 20000 } });
    const t0 = Date.now();
    const r = await b.stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.deepEqual([r.error?.code, r.error?.retryable], ['output-budget', false]);
    assert.ok(Date.now() - t0 < 3000, 'aborted at once, not by a watchdog');
    assert.ok(calls[0].signal.aborted, 'the upstream request was aborted');
    assert.ok(r.content.length <= 500, `${r.content.length} characters were taken`);
    assert.equal(r.costEstimated, true);
  });

  test('the default budget is 40000 characters, above any real reply (longest of 30 live conversations: 6.6k)', async () => {
    assert.equal(CLAUDE_MAX_OUTPUT_CHARS, 40000);
    const r = await backupWith(router([], [claudeOk(CLAUDE_WHOLE)])).stream({ messages: [{ role: 'user', content: 'x' }], catalog: CAT });
    assert.equal(r.error, undefined);
  });
});

describe('runTurn: the rescue gate and the turn deadline', () => {
  const noBackupAsserts = (r: Awaited<ReturnType<typeof runTurn>>, mem: unknown, calls: Call[], statuses: RunStatus[]): void => {
    assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com'], 'no call to Claude');
    assert.equal(statuses.length, 0, 'no status: the user is never told Claude is coming');
    assert.equal(r.memory, mem);
    assert.equal(r.stats.error?.code, 'content-filtered');
    assert.equal(r.stats.backupUsed, false);
    assert.equal(r.stats.rescue, undefined);
    assert.equal(r.stats.repair, undefined);
  };

  test('a gate that says no behaves as no backup configured, for a filter before and after the first op', async () => {
    for (const qwen of [qwenFilteredHttp, qwenFilteredMid]) {
      const calls: Call[] = [];
      const statuses: RunStatus[] = [];
      const fetchImpl = router([qwen], [claudeOk(CLAUDE_WHOLE)], calls);
      const mem = createMemory();
      let asked = 0;
      const r = await runTurn(mem, 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s), backupGate: () => (asked++, { ok: false, reason: 'limit', detail: 'user-cap' }) });
      assert.equal(asked, 1);
      noBackupAsserts(r, mem, calls, statuses);
      assert.deepEqual(r.stats.backupSkipped, { reason: 'limit', detail: 'user-cap' });
    }
  });

  test('a gate that throws or cannot decide blocks too (fail closed)', async () => {
    const gates: Array<() => Promise<BackupGateResult> | BackupGateResult> = [
      () => Promise.reject(new Error('D1 is down')),
      () => {
        throw new Error('boom');
      },
      () => ({ ok: false, reason: 'unavailable' }),
    ];
    for (const gate of gates) {
      const calls: Call[] = [];
      const statuses: RunStatus[] = [];
      const fetchImpl = router([qwenFilteredHttp], [claudeOk(CLAUDE_WHOLE)], calls);
      const mem = createMemory();
      const r = await runTurn(mem, 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s), backupGate: gate });
      noBackupAsserts(r, mem, calls, statuses);
      assert.equal(r.stats.backupSkipped?.reason, 'unavailable');
    }
  });

  test('the gate is lazy: asked once when the filter stops a turn (even with two Claude calls), never for a turn that is not filtered', async () => {
    let asked = 0;
    const gate = (): BackupGateResult => (asked++, { ok: true });
    const calls: Call[] = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeOk(QWEN_PART, { stop: 'max_tokens' }), claudeOk(CLAUDE_REST)], calls);
    const r = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), backupGate: gate });
    assert.equal(calls.filter((c) => c.host === 'api.anthropic.com').length, 2);
    assert.equal(asked, 1, 'one rescue, one question');
    assert.equal(r.stats.backupSkipped, undefined);
    assert.ok(r.stats.finalDone);

    asked = 0;
    const ok = qev({ choices: [{ index: 0, delta: { content: CLAUDE_WHOLE } }] }) + qev({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n';
    const f2 = router([(c) => sseResponse(c, ok)], []);
    const r2 = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl: f2, backup: backupWith(f2), backupGate: gate });
    assert.equal(asked, 0);
    assert.ok(r2.stats.finalDone);
  });

  test('less than 60 s of the turn deadline left: no rescue, and the gate (and its cap) is not touched', async () => {
    for (const left of [59_999, 0, -5000]) {
      const calls: Call[] = [];
      const statuses: RunStatus[] = [];
      const fetchImpl = router([qwenFilteredHttp], [claudeOk(CLAUDE_WHOLE)], calls);
      const mem = createMemory();
      let asked = 0;
      const r = await runTurn(mem, 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onStatus: (s) => statuses.push(s), msLeft: () => left, backupGate: () => (asked++, { ok: true }) });
      noBackupAsserts(r, mem, calls, statuses);
      assert.deepEqual(r.stats.backupSkipped, { reason: 'deadline' }, String(left));
      assert.equal(asked, 0);
    }
  });

  test('60 s left is enough; backupMinMsLeft moves the line', async () => {
    const cases: Array<[number, number | undefined, boolean]> = [[60_000, undefined, true], [120_000, undefined, true], [100_000, 120_000, false], [100_000, 90_000, true]];
    for (const [left, min, runs] of cases) {
      const calls: Call[] = [];
      const fetchImpl = router([qwenFilteredHttp], [claudeOk(CLAUDE_WHOLE)], calls);
      const r = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), msLeft: () => left, ...(min ? { backupMinMsLeft: min } : {}) });
      assert.equal(calls.some((c) => c.host === 'api.anthropic.com'), runs, `${left} left, minimum ${min}`);
      assert.equal(r.stats.backupUsed, runs);
    }
  });

  test("the backup's second call, on its own cut-off reply, needs time left too: without it the partial reply is committed with the warning", async () => {
    const calls: Call[] = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeOk(QWEN_PART, { stop: 'max_tokens' }), claudeOk(CLAUDE_REST)], calls);
    let n = 0;
    const r = await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), msLeft: () => (n++ === 0 ? 100_000 : 5_000) });
    assert.equal(calls.filter((c) => c.host === 'api.anthropic.com').length, 1, 'no second Claude call');
    assert.equal(r.stats.rescue?.ok, false);
    assert.ok(r.stats.warningsAfter.some((w) => w.code === 'reply-incomplete'));
    assert.deepEqual(Object.keys(r.memory.graph.nodes), ['app']);
  });

  test('onBackupCall runs after each backup call with its cost; a failing bookkeeper does not break the turn', async () => {
    const booked: Array<{ first: boolean; costUsd: number; error?: string }> = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeOk(QWEN_PART, { stop: 'max_tokens' }), claudeOk(CLAUDE_REST)]);
    const r = await runTurn(createMemory(), 'x', CAT, {
      ...TURN,
      fetchImpl,
      backup: backupWith(fetchImpl),
      onBackupCall: (c) => {
        booked.push({ first: c.first, costUsd: c.costUsd, error: c.error });
      },
    });
    assert.deepEqual(booked.map((b) => b.first), [true, false]);
    assert.ok(Math.abs(booked.reduce((s, b) => s + b.costUsd, 0) - (r.stats.rescue?.costUsd ?? -1)) < 1e-9, 'the booked costs add up to the rescue');

    const f2 = router([qwenFilteredMid], [claudeOk(CLAUDE_REST)]);
    const r2 = await runTurn(createMemory(), 'x', CAT, {
      ...TURN,
      fetchImpl: f2,
      backup: backupWith(f2),
      onBackupCall: () => {
        throw new Error('D1 is down');
      },
    });
    assert.ok(r2.stats.finalDone, 'the rescue still completes');

    const failed: string[] = [];
    const f3 = router([qwenFilteredHttp], [claudeHttp(529, 'overloaded_error')]);
    await runTurn(createMemory(), 'x', CAT, {
      ...TURN,
      fetchImpl: f3,
      backup: backupWith(f3),
      onBackupCall: (c) => {
        failed.push(`${c.first}:${c.error}:${c.costUsd}`);
      },
    });
    assert.deepEqual(failed, ['true:overloaded:0'], 'a failed attempt is booked too (it counts as a rescue)');
  });
});

describe('runTurn: what the browser is sent about the backup', () => {
  test("Claude's usage and error events never reach onEvent (they go to onBackupDetail); Qwen's own events and Claude's drawing still do", async () => {
    const events: Array<TurnEvent & { phase: string }> = [];
    const detail: Array<TurnEvent & { phase: string }> = [];
    const fetchImpl = router([qwenFilteredMid], [claudeOk(CLAUDE_REST)]);
    await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onEvent: (e) => events.push(e), onBackupDetail: (e) => detail.push(e) });
    const fromClaude = events.filter((e) => e.phase === 'repair');
    assert.ok(fromClaude.some((e) => e.type === 'op' && e.op.t === 'node' && e.op.id === 'db'), "Claude's drawing is forwarded");
    assert.ok(fromClaude.some((e) => e.type === 'say'), "Claude's say lines are forwarded");
    assert.deepEqual(fromClaude.filter((e) => e.type === 'usage' || e.type === 'error'), [], 'no usage or error event from Claude');
    for (const e of fromClaude.filter((x) => x.type === 'done')) assert.equal((e as { finishReason: string | null }).finishReason, null, "Claude's stop reason stays out");
    assert.ok(events.some((e) => e.phase === 'main' && e.type === 'error' && e.error.code === 'content-filtered'), "Model Studio's own error event is forwarded as before");
    assert.deepEqual(detail.map((e) => `${e.phase}:${e.type}`), ['repair:usage'], 'the usage record is kept for the log');
    assert.ok(Math.abs((detail[0] as { costUsd: number }).costUsd - CLAUDE_CALL_COST) < 1e-9);
  });

  test("a failing Claude call's error event stays out of onEvent and reaches onBackupDetail with its code", async () => {
    const events: Array<TurnEvent & { phase: string }> = [];
    const detail: Array<TurnEvent & { phase: string }> = [];
    const fetchImpl = router([qwenFilteredHttp], [claudeHttp(529, 'overloaded_error')]);
    await runTurn(createMemory(), 'x', CAT, { ...TURN, fetchImpl, backup: backupWith(fetchImpl), onEvent: (e) => events.push(e), onBackupDetail: (e) => detail.push(e) });
    assert.ok(!events.some((e) => e.type === 'error' && e.error.code === 'overloaded'), 'the browser is not told Claude was overloaded');
    assert.deepEqual(detail.filter((e) => e.type === 'error').map((e) => (e as { error: { code: string } }).error.code), ['overloaded']);
  });
});

test('workflow backup voices on streaming and completion allow step models, while cloud notes stay identical', async () => {
  const models = createModelTable(modelsFile as ModelFile);
  for (const mode of ['cloud', 'workflow'] as const) {
    const calls: Call[] = [];
    const fetchImpl = router([], [claudeOk(line({ t: 'done', summary: 'Ready' }) + '\n'), claudeOk('Ready')], calls);
    const backup = backupWith(fetchImpl);
    await backup.stream({ mode, models, catalog: CAT, messages: [{ role: 'system', content: 'System' }] });
    await backup.complete!({ mode, messages: [{ role: 'system', content: 'System' }] });
    for (let i = 0; i < calls.length; i++) {
      const system = calls[i].body.system as Array<{ text: string }>;
      const note = mode === 'workflow' ? BACKUP_WORKFLOW_VOICE_NOTE : i ? BACKUP_TEXT_VOICE_NOTE : BACKUP_VOICE_NOTE;
      assert.ok(system[0].text.endsWith(note));
    }
  }
  assert.match(BACKUP_WORKFLOW_VOICE_NOTE, /Qwen models used by the workflow steps/);
  assert.match(BACKUP_WORKFLOW_VOICE_NOTE, /Never identify yourself/);
});

test('filtered partial workflow continues on backup even with repair disabled', async () => {
  const partial = line({ t: 'step', id: 'start', kind: 'trigger', label: 'Input' }) + '\n';
  const rest = [
    { t: 'step', id: 'end', kind: 'end', label: 'Ready' },
    { t: 'link', id: 'route', from: 'start', to: 'end' },
    { t: 'done', summary: 'Ready' },
  ].map(line).join('\n') + '\n';
  const filtered: Handler = (c) => sseResponse(c, qev({ choices: [{ delta: { content: partial } }] })
    + qev({ error: { code: 'DataInspectionFailed' } }) + 'data: [DONE]\n\n');
  const fetchImpl = router([filtered], [claudeOk(rest)]);
  const r = await runTurn(createMemory(), 'Design', CAT, { ...TURN, mode: 'workflow', models: createModelTable(modelsFile as ModelFile),
    repair: false, fetchImpl, backup: backupWith(fetchImpl) });
  assert.equal(r.stats.rescue!.kind, 'continue');
  assert.equal(r.stats.finalDone, true);
  assert.deepEqual(Object.keys(r.memory.workflow!.nodes), ['start', 'end']);
  assert.ok(r.memory.workflow!.edges.route);
});
