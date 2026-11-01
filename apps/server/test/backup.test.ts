// The local turn server with the optional backup, over HTTP with fake upstreams (one fetch answers Model Studio and,
// through the Anthropic SDK, api.anthropic.com): health says nothing about the backup, a filtered turn is finished with a
// neutral localized status, nothing a browser receives (stream lines, health, headers) names the backup's vendor or
// carries a provider or model field while the log keeps both, the backup's key never reaches a stream line, health or
// the log, and a client disconnect aborts the backup request. Each test server listens on 127.0.0.1 in the 8790-8799 range.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { configFromEnv } from '../src/config.ts';
import { createTurnServer } from '../src/server.ts';
import type { ServerDeps, TurnServer } from '../src/server.ts';
import { statusMessage } from '../src/messages.ts';

const CAT = loadCatalog();
const KEY = 'sk-test-SECRET-0123456789abcdef';
const CLAUDE_KEY = 'sk-ant-api03-CLAUDE-SECRET-0123456789abcdef';
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);
const abortError = (): Error => Object.assign(new Error('aborted'), { name: 'AbortError' });

interface Call {
  host: string;
  headers: Headers;
  body: Record<string, unknown>;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response | Promise<Response>;

function router(q: Handler[], c: Handler[], calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url instanceof Request ? url.url : url));
    const call: Call = { host: u.host, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, signal: init!.signal! };
    calls.push(call);
    const h = u.host === 'api.anthropic.com' ? c.shift() : q.shift();
    if (!h) throw new Error(`fake upstream: no handler for ${u.host}`);
    return h(call);
  }) as typeof fetch;
}

function sse(c: Call, text: string, hang = false): Response {
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
        if (hang) return new Promise<void>(() => undefined);
        ctl.close();
        return;
      }
      ctl.enqueue(bytes.slice(i, i + 64));
      i += 64;
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const qev = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
const PART = [line({ t: 'say', text: 'A web tier.' }), line({ t: 'node', id: 'app', product: 'ecs', label: 'Web' })].join('\n') + '\n';
const qwenFilteredMid: Handler = (c) => sse(c, qev({ choices: [{ index: 0, delta: { content: PART } }] }) + qev({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } }) + 'data: [DONE]\n\n');
const qwenFilteredHttp: Handler = () => new Response('{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content."}', { status: 400 });

const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const START = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 2000, output_tokens: 1, cache_read_input_tokens: 15000, cache_creation_input_tokens: 0 } } });
function claudeText(text: string): string {
  let s = START + cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  for (let i = 0; i < text.length; i += 40) s += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } });
  return s + cev('content_block_stop', { index: 0 }) + cev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null, stop_details: null }, usage: { output_tokens: 300 } }) + cev('message_stop');
}
const REST = [line({ t: 'node', id: 'db', product: 'rds', label: 'DB' }), line({ t: 'edge', id: 'e1', from: 'app', to: 'db' }), line({ t: 'say', text: `Done, ${CLAUDE_KEY} echoed.` }), line({ t: 'done', summary: 'ok' })].join('\n') + '\n';

let nextPort = 8790;
const logDir = mkdtempSync(path.join(tmpdir(), 'turn-backup-test-'));

async function start(over: Partial<ServerDeps> = {}): Promise<{ srv: TurnServer; base: string; logFile: string }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const port = nextPort++;
    if (nextPort > 8799) nextPort = 8790;
    const logFile = path.join(logDir, `turns-${port}-${Date.now()}.jsonl`);
    const config = configFromEnv({ PORT: String(port), TURN_LOG: logFile, LOG_CONTENT: '1' });
    const srv = createTurnServer({ catalog: CAT, apiKey: KEY, turnOptions: { backoffMs: 1, retries: 0 }, ...over, config });
    try {
      await srv.listen(port);
      return { srv, base: `http://127.0.0.1:${port}`, logFile };
    } catch (e) {
      if ((e as { code?: string }).code !== 'EADDRINUSE') throw e;
    }
  }
  throw new Error('no free port in 8790-8799');
}

const backupOpts = { maxRetries: 0, watchdogs: { firstByteTimeoutMs: 3000, idleTimeoutMs: 3000, totalTimeoutMs: 10000 } };
const post = (base: string, ask: string, signal?: AbortSignal): Promise<Response> =>
  fetch(`${base}/api/turn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', ask, memory: createMemory() }), signal });
// the words no browser may receive (assembled so this file stays greppable for the real thing)
const HIDDEN = new RegExp(['cl' + 'aude', 'anth' + 'ropic'].join('|'), 'i');
const lines = (text: string): Array<Record<string, unknown>> => text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>);

describe('server: the backup', () => {
  test('health says nothing about the backup, configured or not', async () => {
    for (const backup of [undefined, { apiKey: CLAUDE_KEY }]) {
      const { srv, base } = await start({ backup, fetchImpl: router([], [], []) });
      try {
        const text = await (await fetch(`${base}/api/health`)).text();
        const h = JSON.parse(text) as Record<string, unknown>;
        assert.equal('backupConfigured' in h, false);
        assert.doesNotMatch(text, HIDDEN, 'no vendor, no key, no model');
        assert.doesNotMatch(text, /backup/i);
      } finally {
        await srv.close();
      }
    }
  });

  test('a filtered turn is finished by the backup: neutral localized statuses, commit, and no key anywhere', async () => {
    const calls: Call[] = [];
    const { srv, base, logFile } = await start({ backup: { apiKey: CLAUDE_KEY, options: backupOpts }, fetchImpl: router([qwenFilteredMid], [(c) => sse(c, claudeText(REST))], calls) });
    let text = '';
    let streamed = '';
    let headers = '';
    try {
      const res = await post(base, '싱가포르에 웹 서비스와 데이터베이스를 설계해 주세요');
      headers = [...res.headers].map(([k, v]) => `${k}: ${v}`).join(String.fromCharCode(10));
      text = await res.text();
      streamed = text;
      text += await (await fetch(`${base}/api/health`)).text();
    } finally {
      await srv.close();
    }
    const evs = lines(text.slice(0, text.lastIndexOf('\n') + 1));
    const statuses = evs.filter((e) => e.type === 'status');
    assert.deepEqual(statuses.map((s) => s.code), ['finish', 'continue']);
    assert.deepEqual(statuses.map((s) => Object.keys(s).sort()), [['code', 'text', 'type'], ['code', 'text', 'type']], 'a status carries a code and a line, no provider');
    assert.equal(statuses[0].text, statusMessage('finish', 'ko'));
    assert.equal(statuses[1].text, statusMessage('finish', 'ko'), 'the continuation reads the same calm line');
    assert.equal(statuses[0].text, '다이어그램을 마무리하는 중…');
    // the filter stop of the first pass is not shown either, and no event holds a provider or model field
    assert.equal(evs.some((e) => e.type === 'error'), false);
    const FIELDS = new Set(['provider', 'model', 'servedModel', 'fallbackModel', 'reason', 'rescue', 'backup']);
    const walk = (v: unknown, at: string): void => {
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${at}[${i}]`));
      if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) {
          assert.ok(!FIELDS.has(k), `${at}.${k} must not reach the browser`);
          if (k !== 'memory') walk(x, `${at}.${k}`);
        }
      }
    };
    evs.forEach((e, i) => walk(e, `event ${i} (${String(e.type)})`));
    // the one assertion the owner asked for: nothing browser-bound names the vendor, in any case
    assert.doesNotMatch(streamed, HIDDEN, 'no stream line names the backup vendor');
    assert.doesNotMatch(text, HIDDEN, 'nor does health');
    assert.doesNotMatch(headers, HIDDEN, 'nor do the response headers');
    const commit = evs.find((e) => e.type === 'commit') as { memory: { graph: { nodes: Record<string, unknown> } } } | undefined;
    assert.ok(commit, 'the turn commits');
    assert.deepEqual(Object.keys(commit.memory.graph.nodes).sort(), ['app', 'db']);
    assert.ok(!text.includes(CLAUDE_KEY), 'the key Claude echoed was redacted from every line');
    assert.ok(text.includes('[redacted]'));
    const log = readFileSync(logFile, 'utf8');
    assert.ok(!log.includes(CLAUDE_KEY) && !log.includes(KEY), 'no key in the log');
    const entry = JSON.parse(log.trim().split('\n').at(-1)!) as { backupUsed: boolean; rescue: { kind: string; provider: string; ok: boolean }; repair: { provider: string }; attempts: Array<{ provider: string }> };
    assert.equal(entry.backupUsed, true);
    assert.deepEqual([entry.rescue.kind, entry.rescue.provider, entry.rescue.ok], ['continue', 'claude', true], 'the log keeps the provider, for spend tracking');
    assert.equal(entry.repair.provider, 'claude');
    assert.deepEqual(entry.attempts.map((a) => a.provider), ['qwen']);
    const claudeCall = calls.find((c) => c.host === 'api.anthropic.com')!;
    assert.ok((claudeCall.headers.get('authorization') ?? claudeCall.headers.get('x-api-key') ?? '').includes(CLAUDE_KEY), 'only in the request header');
  });

  test('without the backup a filtered turn is a content-filtered fatal, as before', async () => {
    const calls: Call[] = [];
    const { srv, base } = await start({ fetchImpl: router([qwenFilteredHttp], [], calls) });
    try {
      const evs = lines(await (await post(base, 'a web tier')).text());
      assert.deepEqual(evs.filter((e) => e.type === 'status'), []);
      assert.equal(evs.at(-1)!.type, 'fatal');
      assert.equal(evs.at(-1)!.code, 'content-filtered');
      assert.equal(calls.length, 1);
    } finally {
      await srv.close();
    }
  });

  test('a client disconnect during the backup call aborts the backup request', async () => {
    const calls: Call[] = [];
    const { srv, base } = await start({ backup: { apiKey: CLAUDE_KEY, options: backupOpts }, fetchImpl: router([qwenFilteredHttp], [(c) => sse(c, START, true)], calls) });
    try {
      const ac = new AbortController();
      const res = await post(base, 'a web tier', ac.signal);
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (!buf.includes('"code":"finish"')) {
        const { value, done } = await reader.read();
        assert.ok(!done, 'the stream ended before the fallback status');
        buf += dec.decode(value, { stream: true });
      }
      const t0 = Date.now();
      while (!calls.some((c) => c.host === 'api.anthropic.com')) {
        assert.ok(Date.now() - t0 < 3000, 'the Claude request never started');
        await new Promise((r) => setTimeout(r, 10));
      }
      ac.abort();
      const claude = calls.find((c) => c.host === 'api.anthropic.com')!;
      while (!claude.signal.aborted) {
        assert.ok(Date.now() - t0 < 3000, 'the Claude request was not aborted');
        await new Promise((r) => setTimeout(r, 10));
      }
    } finally {
      await srv.close();
    }
  });
});
