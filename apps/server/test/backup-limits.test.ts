// What a user and the browser see when the Claude backup does not, or cannot, finish a turn the content filter stopped,
// through executeTurn (the code both the local server and the Worker run): a distinct, localized fatal for a spending cap
// (backup-limit) and for a rescue that was not started or failed (backup-failed), the old content-filtered fatal only when
// no backup is configured, and none of Claude's usage or error events on the wire (they are kept in outcome.backupLog).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { DEFAULT_BASE_URL, createCacheTracker } from '../../../packages/core/src/llm.ts';
import { buildSystemPrompt, createMemory } from '../../../packages/core/src/prompt.ts';
import { createClaudeBackup } from '../../../packages/core/src/claude.ts';
import { FATAL_COPY, fatalMessage } from '../src/messages.ts';
import type { Lang } from '../src/messages.ts';
import { executeTurn } from '../src/turn.ts';
import type { TurnDeps, WireEvent } from '../src/turn.ts';

const CAT = loadCatalog();
const SYSTEM = buildSystemPrompt(CAT);
const QWEN_KEY = 'sk-test-QWEN-0123456789abcdef';
const CLAUDE_KEY = 'sk-ant-api03-CLAUDE-SECRET-0123456789abcdef';
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);
const abortError = (): Error => Object.assign(new Error('aborted'), { name: 'AbortError' });

interface Call {
  host: string;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response;

function router(q: Handler[], c: Handler[], calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url instanceof Request ? url.url : url));
    const call: Call = { host: u.host, signal: init!.signal! };
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
const qwenFilteredHttp: Handler = () => new Response('{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content."}', { status: 400 });

const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const START = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 2000, output_tokens: 1, cache_read_input_tokens: 15000, cache_creation_input_tokens: 0 } } });
function claudeText(text: string, stop = 'end_turn'): string {
  let s = START + cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  for (let i = 0; i < text.length; i += 40) s += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } });
  return s + cev('content_block_stop', { index: 0 }) + cev('message_delta', { delta: { stop_reason: stop, stop_sequence: null, stop_details: stop === 'refusal' ? { type: 'refusal', category: 'cyber', explanation: null } : null }, usage: { output_tokens: 300 } }) + cev('message_stop');
}
const REST = [line({ t: 'node', id: 'db', product: 'rds', label: 'DB' }), line({ t: 'edge', id: 'e1', from: 'app', to: 'db' }), line({ t: 'say', text: 'Done.' }), line({ t: 'done', summary: 'ok' })].join('\n') + '\n';
const claudeOk: Handler = (c) => sse(c, claudeText(REST));
const claudeHttp = (status: number, type: string): Handler => () => new Response(JSON.stringify({ type: 'error', error: { type, message: 'upstream says no' } }), { status, headers: { 'content-type': 'application/json' } });

const ASKS: Record<Lang, string> = { en: 'a web tier with a database', ko: '싱가포르에 웹 서비스와 데이터베이스를 설계해 주세요', zh: '请在新加坡设计一个带数据库的网站' };

async function run(ask: string, fetchImpl: typeof fetch, over: Partial<TurnDeps> = {}) {
  const events: WireEvent[] = [];
  const out = await executeTurn(
    { sessionId: 's1', ask, memory: createMemory() },
    {
      apiKey: QWEN_KEY,
      catalog: CAT,
      system: SYSTEM,
      model: 'qwen3.8-max',
      fallbackModel: null,
      baseUrl: DEFAULT_BASE_URL,
      tracker: createCacheTracker(),
      fetchImpl,
      turnOptions: { retries: 0, backoffMs: 1 },
      backup: createClaudeBackup({ apiKey: CLAUDE_KEY, fetchImpl, maxRetries: 0, watchdogs: { firstByteTimeoutMs: 3000, idleTimeoutMs: 3000, totalTimeoutMs: 10000 } }),
      ...over,
    },
    (e) => events.push(e),
    new AbortController().signal,
  );
  return { out, events, fatal: events.find((e) => e.type === 'fatal') as Extract<WireEvent, { type: 'fatal' }> | undefined };
}

describe('the fatal when the Claude backup cannot be used', () => {
  test('both new codes have English, Korean and Chinese copy, distinct from content-filtered and from each other', () => {
    const script: Record<Lang, RegExp> = { en: /[A-Za-z]/, ko: /[가-힣]/, zh: /[一-鿿]/ };
    for (const code of ['backup-limit', 'backup-failed']) {
      for (const lang of ['en', 'ko', 'zh'] as Lang[]) {
        const m = fatalMessage(code, lang);
        assert.notEqual(m, fatalMessage('unknown', lang), `${code}/${lang} is its own message`);
        assert.notEqual(m, fatalMessage('content-filtered', lang));
        assert.match(m, script[lang]);
        assert.match(m, /Claude/);
      }
    }
    for (const lang of ['en', 'ko', 'zh'] as Lang[]) assert.notEqual(FATAL_COPY['backup-limit'][lang], FATAL_COPY['backup-failed'][lang]);
    assert.match(FATAL_COPY['backup-limit'].en, /limit/i);
  });

  test('a cap that blocks the rescue: fatal backup-limit in the language of the ask, Claude never called, no status line', async () => {
    for (const qwen of [qwenFilteredHttp, qwenFilteredMid]) {
      for (const lang of ['en', 'ko', 'zh'] as Lang[]) {
        const calls: Call[] = [];
        const { out, events, fatal } = await run(ASKS[lang], router([qwen], [claudeOk], calls), { backupGate: () => ({ ok: false, reason: 'limit', detail: 'user-cap' }) });
        assert.equal(out.outcome, 'fatal');
        assert.deepEqual([fatal?.code, fatal?.retryable], ['backup-limit', false]);
        assert.equal(fatal?.message, fatalMessage('backup-limit', lang));
        assert.equal(out.fatalCode, 'backup-limit');
        assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com']);
        assert.deepEqual(events.filter((e) => e.type === 'status'), []);
        assert.equal(out.stats?.error?.code, 'content-filtered', 'the stats keep the real error for the log');
        assert.equal(out.stats?.backupSkipped?.detail, 'user-cap');
        assert.equal(events.some((e) => e.type === 'commit'), false);
      }
    }
  });

  test('a rescue that was not started (too little time left, or the cap check failed): fatal backup-failed, retryable', async () => {
    const cases: Array<Partial<TurnDeps>> = [{ msLeft: () => 30_000 }, { backupGate: () => Promise.reject(new Error('D1 is down')) }, { backupGate: () => ({ ok: false, reason: 'unavailable' }) }];
    for (const over of cases) {
      const calls: Call[] = [];
      const { fatal, out } = await run(ASKS.ko, router([qwenFilteredHttp], [claudeOk], calls), over);
      assert.deepEqual([fatal?.code, fatal?.retryable], ['backup-failed', true]);
      assert.equal(fatal?.message, fatalMessage('backup-failed', 'ko'));
      assert.equal(calls.length, 1);
      assert.equal(out.stats?.backupSkipped !== undefined, true);
    }
  });

  test('a rescue that was asked and could not answer, with nothing drawn: fatal backup-failed; retryable unless Claude refused', async () => {
    const cases: Array<[Handler, boolean]> = [[claudeHttp(529, 'overloaded_error'), true], [claudeHttp(401, 'authentication_error'), false], [(c) => sse(c, claudeText(PART, 'refusal')), false]];
    for (const [claude, retryable] of cases) {
      const calls: Call[] = [];
      const { fatal, events } = await run(ASKS.en, router([qwenFilteredHttp], [claude], calls));
      assert.equal(fatal?.code, 'backup-failed');
      assert.equal(fatal?.retryable, retryable);
      assert.equal(fatal?.message, fatalMessage('backup-failed', 'en'));
      assert.deepEqual(events.filter((e) => e.type === 'status').map((e) => (e as { provider?: string }).provider), ['claude'], 'Claude was asked, so the status line says so');
      assert.equal(calls.length, 2);
    }
  });

  test('no backup configured: the turn still ends as content-filtered', async () => {
    const { fatal } = await run(ASKS.en, router([qwenFilteredHttp], [], []), { backup: undefined });
    assert.deepEqual([fatal?.code, fatal?.message], ['content-filtered', fatalMessage('content-filtered', 'en')]);
  });

  test('a partial diagram whose rescue fails is still committed with the warning (the backup was asked), as before', async () => {
    const { events, out } = await run(ASKS.en, router([qwenFilteredMid], [claudeHttp(529, 'overloaded_error')], []));
    assert.equal(out.outcome, 'commit');
    const commit = events.find((e) => e.type === 'commit') as Extract<WireEvent, { type: 'commit' }>;
    assert.ok(commit.warnings.some((w) => w.code === 'reply-incomplete'));
  });
});

describe('what the wire carries about Claude', () => {
  test("a rescue's wire has Claude's drawing, but no usage or error event from it; the log record has them", async () => {
    const { events, out } = await run(ASKS.en, router([qwenFilteredMid], [claudeOk], []));
    assert.equal(out.outcome, 'commit');
    const repair = events.filter((e): e is Exclude<WireEvent, { type: 'status' | 'commit' | 'summary' | 'fatal' }> => 'phase' in e && e.phase === 'repair');
    assert.ok(repair.some((e) => e.type === 'op'));
    assert.deepEqual(repair.filter((e) => e.type === 'usage' || e.type === 'error'), []);
    assert.equal(out.backupLog.length, 1);
    const u = out.backupLog[0];
    assert.equal(u.type, 'usage');
    if (u.type === 'usage') assert.deepEqual([u.promptTokens, u.cachedTokens, u.completionTokens], [17000, 15000, 300]);
  });

  test("Claude's failure is not on the wire in any form, only in the log record", async () => {
    const { events, out } = await run(ASKS.en, router([qwenFilteredHttp], [claudeHttp(529, 'overloaded_error')], []));
    const wire = JSON.stringify(events.filter((e) => e.type !== 'status'));
    assert.ok(!/overloaded|529|claude-opus/i.test(wire), wire.slice(0, 300));
    assert.deepEqual(out.backupLog.filter((e) => e.type === 'error').map((e) => (e as { code: string }).code), ['overloaded']);
  });
});
