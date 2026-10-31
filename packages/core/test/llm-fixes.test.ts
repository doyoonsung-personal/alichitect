// Phase 1 fixes after review for llm.ts: keep-alive comments do not reset the idle clock, an empty reply is not a turn,
// and a failed HTTP request books no spend.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/catalog-node.ts';
import { runTurn, streamTurn } from '../src/llm.ts';
import { createMemory } from '../src/prompt.ts';

const CAT = loadCatalog();
const enc = new TextEncoder();
const chunk = (delta: Record<string, unknown>, finish: string | null = null): string => `data: ${JSON.stringify({ id: 'c1', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

/** A 200 event stream that sends `head`, then only SSE comments (": ping") every 20 ms until aborted. */
function pingFetch(head: string): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const signal = init!.signal!;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(head));
        timer = setInterval(() => {
          try {
            c.enqueue(enc.encode(': ping\n\n'));
          } catch {
            /* closed */
          }
        }, 20);
        signal.addEventListener('abort', () => {
          clearInterval(timer);
          try {
            c.error(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          } catch {
            /* closed */
          }
        });
      },
      cancel() {
        clearInterval(timer);
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}

describe('watchdogs ignore keep-alive comments', () => {
  test('after some ops, a stream that sends only ": ping" comments hits the idle timeout, not the 120 s total', async () => {
    const t0 = Date.now();
    const head = chunk({ content: '{"t":"say","text":"Drawing."}\n{"t":"node","id":"app","product":"ecs","label":"App"}\n' });
    const r = await streamTurn({ apiKey: 'k', catalog: CAT, messages: [{ role: 'user', content: 'x' }], idleTimeoutMs: 150, totalTimeoutMs: 20000, fetchImpl: pingFetch(head) });
    assert.equal(r.error?.code, 'idle-timeout');
    assert.ok(Date.now() - t0 < 3000, `took ${Date.now() - t0} ms`);
    assert.deepEqual(Object.keys(r.graph.nodes), ['app'], 'the ops that arrived are kept');
  });

  test('a role chunk with no content, then pings, is still "no first token": the first-byte timeout fires', async () => {
    const t0 = Date.now();
    const r = await streamTurn({ apiKey: 'k', catalog: CAT, messages: [{ role: 'user', content: 'x' }], firstByteTimeoutMs: 150, idleTimeoutMs: 20000, totalTimeoutMs: 20000, fetchImpl: pingFetch(chunk({ role: 'assistant', content: '' })) });
    assert.equal(r.error?.code, 'first-byte-timeout');
    assert.equal(r.error?.retryable, true);
    assert.ok(Date.now() - t0 < 3000, `took ${Date.now() - t0} ms`);
  });
});

// ---------- runTurn: empty replies and the cost of failed requests ----------

const sseBody = (content: string): string => chunk({ role: 'assistant', content: '' }) + chunk({ content }) + chunk({}, 'stop') + `data: ${JSON.stringify({ id: 'c1', choices: [], usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } })}\n\ndata: [DONE]\n\n`;

function queueFetch(responses: Array<() => Response>, calls: number[] = []): typeof fetch {
  return (async (): Promise<Response> => {
    calls.push(calls.length);
    const next = responses.shift();
    if (!next) throw new Error('no response queued');
    return next();
  }) as typeof fetch;
}

describe('runTurn: a reply with no operation is a failed turn, not an empty answer', () => {
  test('prose with no NDJSON op: no follow-up call, memory unchanged, a retryable empty-reply error', async () => {
    const calls: number[] = [];
    const mem = createMemory();
    const r = await runTurn(mem, 'a small API', CAT, { apiKey: 'k', retries: 0, fetchImpl: queueFetch([() => new Response(sseBody('Sure, here is a nice architecture for your API.'), { status: 200 }), () => new Response(sseBody('{"t":"done","summary":"x"}'), { status: 200 })], calls) });
    assert.equal(r.stats.error?.code, 'empty-reply');
    assert.equal(r.stats.error?.retryable, true);
    assert.equal(calls.length, 1, 'no continuation call is spent on a reply with nothing to continue');
    assert.equal(r.memory, mem, 'no blank assistant turn is appended');
    assert.equal(r.stats.repair, undefined);
  });

  test('a question (a say line and done, no diagram change) is still a normal turn', async () => {
    const mem = createMemory();
    const r = await runTurn(mem, 'a thing', CAT, { apiKey: 'k', retries: 0, fetchImpl: queueFetch([() => new Response(sseBody('{"t":"say","text":"Which region do you need?"}\n{"t":"done","summary":"asked"}\n'), { status: 200 })]) });
    assert.equal(r.stats.error, undefined);
    assert.notEqual(r.memory, mem);
    assert.equal(r.memory.turns.length, 2);
  });
});

describe('runTurn: spend', () => {
  test('a rejected request (HTTP 400 content filter, HTTP 500) books $0, not an estimate of its prompt', async () => {
    const filtered = await runTurn(createMemory(), 'x', CAT, { apiKey: 'k', retries: 0, fetchImpl: queueFetch([() => new Response('{"error":{"code":"data_inspection_failed","message":"Input data may contain inappropriate content."}}', { status: 400 })]) });
    assert.equal(filtered.stats.error?.code, 'content-filtered');
    assert.equal(filtered.stats.costUsd, 0);
    assert.equal(filtered.stats.costEstimated, false);
    const down = await runTurn(createMemory(), 'x', CAT, { apiKey: 'k', retries: 0, fallbackModel: null, fetchImpl: queueFetch([() => new Response('upstream down', { status: 500 })]) });
    assert.equal(down.stats.costUsd, 0);
    assert.equal(down.stats.costEstimated, false);
  });

  test('a stream that broke after its first byte still books an estimate', async () => {
    const part = chunk({ role: 'assistant', content: '' }) + chunk({ content: '{"t":"say","text":"Drawing."}\n{"t":"node","id":"app","product":"ecs","label":"App"}\n' });
    const r = await runTurn(createMemory(), 'x', CAT, { apiKey: 'k', retries: 0, fallbackModel: null, repair: false, fetchImpl: queueFetch([() => new Response(part, { status: 200 })]) });
    assert.ok(r.stats.costEstimated && r.stats.costUsd > 0);
  });
});
