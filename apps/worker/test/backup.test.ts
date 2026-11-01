// The Worker with the optional ANTHROPIC_API_KEY secret: health reports only a boolean, a turn Model Studio's content
// filter stopped is finished by the Claude backup (statuses with provider 'claude', commit, the rescue in the log and its
// cost in the usage row), the Anthropic key never reaches a line or the log, and a missing secret changes nothing.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTurn, health, makeRedactor } from '../src/turn.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { UserRow } from '../src/db.ts';
import type { Env } from '../src/env.ts';
import { API_KEY, makeCtx, makeEnv, ndjson, signIn } from './helpers.ts';

const CLAUDE_KEY = 'sk-ant-api03-WORKER-SECRET-0123456789abcdef';
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);
const abortError = (): Error => Object.assign(new Error('aborted'), { name: 'AbortError' });

interface Call {
  host: string;
  headers: Headers;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response;

function router(q: Handler[], c: Handler[], calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url instanceof Request ? url.url : url));
    const call: Call = { host: u.host, headers: new Headers(init?.headers), signal: init!.signal! };
    calls.push(call);
    const h = u.host === 'api.anthropic.com' ? c.shift() : q.shift();
    if (!h) throw new Error(`fake upstream: no handler for ${u.host}`);
    return h(call);
  }) as typeof fetch;
}

function sse(c: Call, text: string): Response {
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
      if (i >= bytes.length) return ctl.close();
      ctl.enqueue(bytes.slice(i, i + 64));
      i += 64;
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const qev = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
const PART = [line({ t: 'say', text: 'A web tier.' }), line({ t: 'node', id: 'app', product: 'ecs', label: 'Web' })].join('\n') + '\n';
const qwenFilteredMid: Handler = (c) => sse(c, qev({ choices: [{ index: 0, delta: { content: PART } }] }) + qev({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } }) + 'data: [DONE]\n\n');
const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const REST = [line({ t: 'node', id: 'db', product: 'rds', label: 'DB' }), line({ t: 'edge', id: 'e1', from: 'app', to: 'db' }), line({ t: 'say', text: `Added it (${CLAUDE_KEY}).` }), line({ t: 'done', summary: 'ok' })].join('\n') + '\n';
const claudeOk: Handler = (c) => {
  let s = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 2000, output_tokens: 1, cache_read_input_tokens: 15000, cache_creation_input_tokens: 0 } } });
  s += cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  for (let i = 0; i < REST.length; i += 40) s += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: REST.slice(i, i + 40) } });
  s += cev('content_block_stop', { index: 0 }) + cev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null, stop_details: null }, usage: { output_tokens: 300 } }) + cev('message_stop');
  return sse(c, s);
};

const OPTS = { firstByteTimeoutMs: 2000, idleTimeoutMs: 2000, totalTimeoutMs: 5000, retries: 0, backoffMs: 1 } as Record<string, unknown>;
const BACKUP_OPTS = { maxRetries: 0, watchdogs: { firstByteTimeoutMs: 2000, idleTimeoutMs: 2000, totalTimeoutMs: 5000 } };
const turnReq = (ask: string): Request =>
  new Request('https://architect.alikorea-demo.com/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://architect.alikorea-demo.com' }, body: JSON.stringify({ sessionId: 'sess_1', ask, memory: createMemory() }) });

async function approved(env: Env): Promise<UserRow> {
  return (await signIn(env, 'user@example.com', { status: 'approved' })).user;
}

describe('Worker: the Claude backup', () => {
  test('health: backupConfigured is a boolean and no key is shown', async () => {
    for (const env of [makeEnv(), makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY, CLAUDE_BACKUP_MODEL: 'claude-opus-5-5' })]) {
      const text = await health(env).text();
      const h = JSON.parse(text) as Record<string, unknown>;
      assert.equal(h.backupConfigured, !!env.ANTHROPIC_API_KEY);
      assert.ok(!text.includes(CLAUDE_KEY) && !text.includes(API_KEY));
    }
  });

  test('a filtered turn is finished on Claude: statuses with provider claude, commit, rescue logged, no key anywhere', async () => {
    const env = makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY });
    const user = await approved(env);
    const calls: Call[] = [];
    const logs: string[] = [];
    const ctx = makeCtx();
    const res = await handleTurn(turnReq('Web tier with a database'), env, ctx, user, { fetchImpl: router([qwenFilteredMid], [claudeOk], calls), turnOptions: OPTS, backupOptions: BACKUP_OPTS, log: (l) => logs.push(l) });
    const text = await res.clone().text();
    const events = await ndjson(res);
    await ctx.flush();
    assert.deepEqual(events.filter((e) => e.type === 'status').map((e) => `${e.code}:${e.provider}`), ['fallback:claude', 'continue:claude']);
    assert.match(String(events.find((e) => e.type === 'status')!.text), /Claude/);
    const commit = events.at(-1) as { type: string; memory: { graph: { nodes: Record<string, unknown> } } };
    assert.equal(commit.type, 'commit');
    assert.deepEqual(Object.keys(commit.memory.graph.nodes).sort(), ['app', 'db']);
    assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'api.anthropic.com']);
    assert.ok((calls[1].headers.get('authorization') ?? calls[1].headers.get('x-api-key') ?? '').includes(CLAUDE_KEY));
    assert.ok(!text.includes(CLAUDE_KEY) && text.includes('[redacted]'), 'the echoed key is redacted from the stream');
    assert.ok(!logs.join('\n').includes(CLAUDE_KEY));
    const turnLog = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'turn') as { backupUsed: boolean; rescue: { kind: string; ok: boolean; costUsd: number }; costUsd: number };
    assert.equal(turnLog.backupUsed, true);
    assert.deepEqual([turnLog.rescue.kind, turnLog.rescue.ok], ['continue', true]);
    assert.ok(turnLog.costUsd >= turnLog.rescue.costUsd && turnLog.rescue.costUsd > 0, "Claude's cost is in the turn's recorded cost");
  });

  test('without ANTHROPIC_API_KEY a filtered turn is a content-filtered fatal, as before', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const calls: Call[] = [];
    const ctx = makeCtx();
    const res = await handleTurn(turnReq('Web tier'), env, ctx, user, { fetchImpl: router([qwenFilteredMid], [], calls), turnOptions: OPTS, log: () => undefined });
    const events = await ndjson(res);
    await ctx.flush();
    assert.deepEqual(events.filter((e) => e.type === 'status'), []);
    assert.deepEqual([events.at(-1)!.type, events.at(-1)!.code], ['fatal', 'content-filtered']);
    assert.equal(calls.length, 1);
  });

  test('the redactor takes both keys', () => {
    const r = makeRedactor(API_KEY, CLAUDE_KEY);
    const out = r(`a ${API_KEY} b ${CLAUDE_KEY} c ${CLAUDE_KEY.slice(0, 12)}`);
    assert.ok(!out.includes(API_KEY) && !out.includes(CLAUDE_KEY) && !out.includes(CLAUDE_KEY.slice(0, 12)));
    assert.equal(makeRedactor(API_KEY)(`x ${API_KEY}`), 'x [redacted]', 'one key, as before');
  });
});
