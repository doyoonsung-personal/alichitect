import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TurnRequest } from '@ali/core/types.ts';
import { createLineDecoder, fetchHealth, postTurn } from './ndjson-client.ts';
import type { WireEvent } from './events.ts';
import { parseWireEvent } from './events.ts';

const enc = new TextEncoder();
const REQ = { sessionId: 's1', ask: 'hi', memory: { turns: [], requirements: [], graph: { groups: {}, nodes: {}, edges: {}, recs: [] }, tombstones: [] } } as TurnRequest;

function streamOf(chunks: Uint8Array[], failAfter?: Error): Response {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(ctl) {
      if (i < chunks.length) ctl.enqueue(chunks[i++]);
      else if (failAfter) ctl.error(failAfter);
      else ctl.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
}

test('line decoder joins a line split across chunks and a character split across chunks', () => {
  const lines: string[] = [];
  const d = createLineDecoder((l) => lines.push(l));
  const bytes = enc.encode('{"a":"데이터"}\n{"b":"数据 ✓"}\n{"c":1}');
  // every possible two-way split, including inside the 3-byte Hangul and Han characters
  for (let k = 1; k < bytes.length; k++) {
    lines.length = 0;
    const dd = createLineDecoder((l) => lines.push(l));
    dd.push(bytes.slice(0, k));
    dd.push(bytes.slice(k));
    dd.end();
    assert.deepEqual(lines, ['{"a":"데이터"}', '{"b":"数据 ✓"}', '{"c":1}'], `split at ${k}`);
  }
  d.end();
});

test('line decoder skips blank lines and strips carriage returns', () => {
  const lines: string[] = [];
  const d = createLineDecoder((l) => lines.push(l));
  d.push(enc.encode('x\r\n\r\n\n y \n'));
  d.end();
  assert.deepEqual(lines, ['x', ' y ']);
});

test('postTurn dispatches every event, byte by byte, and ends on commit', async () => {
  const text = [
    JSON.stringify({ type: 'say', id: 0, text: '데이터는 싱가포르에', final: false, phase: 'main' }),
    JSON.stringify({ type: 'op', seq: 1, op: { t: 'done', summary: '' }, added: [], updated: [], removed: [], phase: 'main' }),
    JSON.stringify({ type: 'something-new', x: 1 }),
    'not json',
    JSON.stringify({ type: 'commit', memory: REQ.memory, changes: '', warnings: [] }),
  ].join('\n') + '\n';
  const bytes = enc.encode(text);
  const chunks = Array.from({ length: bytes.length }, (_, i) => bytes.slice(i, i + 1));
  const seen: WireEvent[] = [];
  const end = await postTurn(REQ, { signal: new AbortController().signal, fetchImpl: (async () => streamOf(chunks)) as typeof fetch, onEvent: (e) => seen.push(e) });
  assert.deepEqual(end, { kind: 'commit' });
  assert.deepEqual(seen.map((e) => e.type), ['say', 'op', 'commit']);
  assert.equal((seen[0] as { text: string }).text, '데이터는 싱가포르에');
});

test('a turn event with no phase is a main-phase event', () => {
  const ev = parseWireEvent('{"type":"say","id":0,"text":"x","final":true}') as { phase?: string };
  assert.equal(ev.phase, 'main');
});

test('an HTTP error with a fatal body is dispatched as that fatal', async () => {
  const fatal = { type: 'fatal', code: 'session-busy', message: 'busy', retryable: true };
  const seen: WireEvent[] = [];
  const end = await postTurn(REQ, {
    signal: new AbortController().signal,
    fetchImpl: (async () => new Response(JSON.stringify(fatal), { status: 409 })) as typeof fetch,
    onEvent: (e) => seen.push(e),
  });
  assert.deepEqual(end, { kind: 'fatal' });
  assert.deepEqual(seen, [fatal]);
});

test('an HTTP error with no usable body becomes a synthetic fatal', async () => {
  const seen: WireEvent[] = [];
  const end = await postTurn(REQ, { signal: new AbortController().signal, fetchImpl: (async () => new Response('<html>', { status: 502 })) as typeof fetch, onEvent: (e) => seen.push(e) });
  assert.deepEqual(end, { kind: 'fatal' });
  assert.equal(seen.length, 1);
  assert.equal((seen[0] as { code: string }).code, 'http-502');
  assert.equal((seen[0] as { retryable: boolean }).retryable, true);
});

test('a stream that errors or ends without commit is a network end', async () => {
  const a = await postTurn(REQ, { signal: new AbortController().signal, fetchImpl: (async () => streamOf([enc.encode('{"type":"status","code":"retry","text":"t"}\n')], new Error('reset'))) as typeof fetch, onEvent: () => undefined });
  assert.equal(a.kind, 'network');
  const b = await postTurn(REQ, { signal: new AbortController().signal, fetchImpl: (async () => streamOf([enc.encode('{"type":"status","code":"retry","text":"t"}\n')])) as typeof fetch, onEvent: () => undefined });
  assert.equal(b.kind, 'network');
  const c = await postTurn(REQ, { signal: new AbortController().signal, fetchImpl: (async () => { throw new TypeError('fetch failed'); }) as typeof fetch, onEvent: () => undefined });
  assert.equal(c.kind, 'network');
});

test('abort resolves to aborted and stops reading', async () => {
  const ac = new AbortController();
  const fetchImpl = ((_u: unknown, init: RequestInit) =>
    new Promise<Response>((_res, rej) => {
      init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })) as typeof fetch;
  const p = postTurn(REQ, { signal: ac.signal, fetchImpl, onEvent: () => undefined });
  ac.abort();
  assert.deepEqual(await p, { kind: 'aborted' });
});

test('abort mid-stream resolves to aborted', async () => {
  const ac = new AbortController();
  const body = new ReadableStream<Uint8Array>({
    start(ctl) {
      ctl.enqueue(enc.encode('{"type":"status","code":"retry","text":"t"}\n'));
      ac.signal.addEventListener('abort', () => ctl.error(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    },
  });
  const seen: WireEvent[] = [];
  const p = postTurn(REQ, { signal: ac.signal, fetchImpl: (async () => new Response(body)) as typeof fetch, onEvent: (e) => { seen.push(e); ac.abort(); } });
  assert.deepEqual(await p, { kind: 'aborted' });
  assert.equal(seen.length, 1);
});

test('fetchHealth accepts the server shape and rejects the rest', async () => {
  const good = { ok: true, model: 'qwen3.8-max', endpoint: 'dashscope-intl.aliyuncs.com', catalog: { version: '2026-10-31', entries: 223 }, keyConfigured: true, inFlight: 0, maxInFlight: 8, limits: { askChars: 6000, turns: 40, nodes: 80, requirements: 20, bodyBytes: 1 }, uptimeS: 3 };
  assert.equal((await fetchHealth({ fetchImpl: (async () => new Response(JSON.stringify(good))) as typeof fetch }))?.catalog.version, '2026-10-31');
  assert.equal(await fetchHealth({ fetchImpl: (async () => new Response('{"ok":false}')) as typeof fetch }), null);
  assert.equal(await fetchHealth({ fetchImpl: (async () => new Response('x', { status: 500 })) as typeof fetch }), null);
  assert.equal(await fetchHealth({ fetchImpl: (async () => { throw new TypeError('x'); }) as typeof fetch }), null);
});
