import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposalDraft, ProposalRequest, ProposalSection } from '@ali/core/types.ts';
import { DraftError, asDraft, buildProposalRequest, parseProposalEvent, requestDraft } from './draft-client.ts';
import { createInitialState } from '../store/reducer.ts';

const enc = new TextEncoder();
const MEMORY = { turns: [], requirements: [], graph: { groups: {}, nodes: {}, edges: {}, recs: [] }, tombstones: [] };
const REQ: ProposalRequest = { sessionId: 's1', lang: 'ko', title: '배달 앱', customer: '한빛푸드', memory: MEMORY };

const DRAFT: ProposalDraft = {
  lang: 'ko',
  exec: '한빛푸드의 주문 피크를 견디는 설계입니다.\n\n비용은 사용한 만큼만 냅니다.',
  needs: [{ id: 'n1', need: '점심 피크에도 주문이 끊기지 않아야 함', source: 'stated', quote: '점심시간에 서버가 멈춰요', answer: 'ALB와 Auto Scaling이 트래픽을 나눕니다.', products: ['alb', 'ess'] }],
  outcomes: [{ title: '피크에도 안정적', text: '트래픽이 늘면 서버가 자동으로 늘어납니다.' }],
  why: { alb: '주문 트래픽을 여러 서버로 나눠 한 대가 멈춰도 주문이 계속됩니다.' },
  tradeoffs: [{ text: '단일 리전입니다.', mitigation: '두 개의 가용 영역에 나눠 배치합니다.' }],
  next: ['트래픽 수치를 확인합니다.'],
  complete: true,
};

test('audience and authored chapters survive the streamed proposal boundary', async () => {
  const section = { k: 'section' as const, title: 'Why Alibaba Cloud fits', text: 'A customer-specific rationale.\n\nA second paragraph.' };
  const draft: ProposalDraft = { ...DRAFT, audience: 'alibaba', sections: [{ title: section.title, text: section.text }] };
  const req = buildProposalRequest(createInitialState({ lang: 'ko', id: 's1', now: 0 }), 'Title', 'Client', 'alibaba');
  assert.equal(req.audience, 'alibaba');
  assert.deepEqual(parseProposalEvent(JSON.stringify({ type: 'section', section })), { type: 'section', section });
  assert.deepEqual(asDraft(draft), draft);
  assert.equal(parseProposalEvent(JSON.stringify({ type: 'section', section: { ...section, title: '' } })), null);
  assert.deepEqual(asDraft({ ...draft, sections: [null, { title: '', text: 'bad' }, draft.sections![0]] })?.sections, draft.sections);
});

const SECTIONS: ProposalSection[] = [
  { k: 'exec', text: DRAFT.exec },
  { k: 'need', ...DRAFT.needs[0] },
  { k: 'outcome', ...DRAFT.outcomes[0] },
  { k: 'why', product: 'alb', text: DRAFT.why.alb },
  { k: 'tradeoff', ...DRAFT.tradeoffs[0] },
  { k: 'next', text: DRAFT.next[0] },
];

function streamOf(chunks: Uint8Array[], o: { failAfter?: Error; signal?: AbortSignal } = {}): Response {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(ctl) {
      if (o.signal?.aborted) return ctl.error(new DOMException('The operation was aborted.', 'AbortError'));
      if (i < chunks.length) ctl.enqueue(chunks[i++]);
      else if (o.failAfter) ctl.error(o.failAfter);
      else ctl.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
}

const lines = (evs: unknown[]): string => evs.map((e) => JSON.stringify(e)).join('\n') + '\n';
const bytewise = (s: string): Uint8Array[] => {
  const b = enc.encode(s);
  return Array.from({ length: b.length }, (_, i) => b.slice(i, i + 1));
};
const fetchOf = (res: Response | (() => Response)): typeof fetch => (async () => (typeof res === 'function' ? res() : res)) as typeof fetch;

async function rejection(p: Promise<unknown>): Promise<DraftError> {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof DraftError, `a DraftError, got ${String(e)}`);
    return e;
  }
  assert.fail('expected a rejection');
}

test('the request carries the session, the UI language and the cover fields as typed (trimmed)', () => {
  const session = { id: 'abc', memory: MEMORY } as unknown as Parameters<typeof buildProposalRequest>[0]['session'];
  const r = buildProposalRequest({ session, lang: 'zh' }, '  外卖应用  ', ' 星河餐饮 ');
  assert.deepEqual(r, { sessionId: 'abc', lang: 'zh', title: '外卖应用', customer: '星河餐饮', memory: MEMORY });
});

test('sections arrive one by one, byte by byte, and the draft resolves on done', async () => {
  const seen: ProposalSection[] = [];
  const status: string[] = [];
  const text = lines([
    ...SECTIONS.slice(0, 3).map((section) => ({ type: 'section', section })),
    { type: 'status', code: 'retry', text: 'x' },
    ...SECTIONS.slice(3).map((section) => ({ type: 'section', section })),
    { type: 'done', draft: DRAFT },
  ]);
  let posted: RequestInit | undefined;
  const draft = await requestDraft(REQ, {
    signal: new AbortController().signal,
    fetchImpl: (async (_url: string, init: RequestInit) => {
      posted = init;
      return streamOf(bytewise(text));
    }) as unknown as typeof fetch,
    onSection: (s) => seen.push(s),
    onStatus: (c) => status.push(c),
  });
  assert.deepEqual(draft, DRAFT);
  assert.deepEqual(seen, SECTIONS, 'every section, intact through split multi-byte characters');
  assert.deepEqual(status, ['retry']);
  assert.equal(posted?.method, 'POST');
  assert.deepEqual(JSON.parse(String(posted?.body)), REQ);
});

test('every two-way split of the stream, including inside Hangul and Han characters, reads the same', async () => {
  const text = lines([{ type: 'section', section: { k: 'exec', text: '数据留在新加坡。데이터는 싱가포르에.' } }, { type: 'done', draft: DRAFT }]);
  const b = enc.encode(text);
  for (let k = 1; k < b.length; k += 3) {
    const seen: ProposalSection[] = [];
    const draft = await requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(() => streamOf([b.slice(0, k), b.slice(k)])), onSection: (s) => seen.push(s) });
    assert.equal(draft.exec, DRAFT.exec, `split at ${k}`);
    assert.equal((seen[0] as { text: string }).text, '数据留在新加坡。데이터는 싱가포르에.', `split at ${k}`);
  }
});

test('a fatal mid-stream rejects with its code and message, after the sections before it', async () => {
  const seen: ProposalSection[] = [];
  const text = lines([{ type: 'section', section: SECTIONS[0] }, { type: 'fatal', code: 'model-error', message: '제안서를 작성하지 못했습니다.', retryable: true }, { type: 'section', section: SECTIONS[1] }]);
  const e = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(streamOf(bytewise(text))), onSection: (s) => seen.push(s) }));
  assert.equal(e.kind, 'fatal');
  assert.equal(e.code, 'model-error');
  assert.equal(e.message, '제안서를 작성하지 못했습니다.');
  assert.equal(e.retryable, true);
  assert.equal(seen.length, 1, 'nothing after the fatal is read');
});

test('a JSON fatal body before streaming (quota, busy, signed out) keeps the server message', async () => {
  for (const [status, code] of [[429, 'quota-exceeded'], [409, 'user-busy'], [401, 'signed-out']] as const) {
    const body = { type: 'fatal', code, message: `server says ${code}`, retryable: false };
    const e = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) }));
    assert.deepEqual([e.kind, e.code, e.message, e.retryable], ['fatal', code, `server says ${code}`, false]);
  }
});

test('an HTTP error with no usable body is a fatal named by its status', async () => {
  const e = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(new Response('Bad gateway', { status: 502 })) }));
  assert.deepEqual([e.kind, e.code, e.message, e.retryable], ['fatal', 'http-502', '', true]);
});

test('no such route (an older or local server, or an HTML fallback page) is unavailable, not an error to retry', async () => {
  for (const res of [new Response('Not found', { status: 404 }), new Response('', { status: 405 }), new Response('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })]) {
    const e = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(res) }));
    assert.equal(e.kind, 'unavailable');
    assert.equal(e.retryable, false);
  }
});

test('a network failure before or during the stream is a network error', async () => {
  const before = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch }));
  assert.deepEqual([before.kind, before.retryable], ['network', true]);
  const during = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(streamOf([enc.encode(lines([{ type: 'section', section: SECTIONS[0] }]))], { failAfter: new TypeError('network error') })) }));
  assert.equal(during.kind, 'network');
});

test('a stream that ends without done, or with a done whose draft cannot be read, is incomplete', async () => {
  const cut = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(streamOf([enc.encode(lines(SECTIONS.map((section) => ({ type: 'section', section }))))])) }));
  assert.deepEqual([cut.kind, cut.code], ['incomplete', 'stream-ended']);
  const bad = await rejection(requestDraft(REQ, { signal: new AbortController().signal, fetchImpl: fetchOf(streamOf([enc.encode(lines([{ type: 'done', draft: 'nope' }]))])) }));
  assert.deepEqual([bad.kind, bad.code], ['incomplete', 'bad-draft']);
});

test('Stop aborts the request: before the response and while reading, it rejects as aborted', async () => {
  const early = new AbortController();
  const p1 = requestDraft(REQ, {
    signal: early.signal,
    fetchImpl: ((_u: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => init.signal?.addEventListener('abort', () => rej(new DOMException('The operation was aborted.', 'AbortError'))))) as unknown as typeof fetch,
  });
  early.abort();
  assert.equal((await rejection(p1)).kind, 'aborted');

  const late = new AbortController();
  const seen: ProposalSection[] = [];
  const first = enc.encode(lines([{ type: 'section', section: SECTIONS[0] }]));
  const p2 = requestDraft(REQ, {
    signal: late.signal,
    fetchImpl: fetchOf(streamOf([first, first, first, first], { signal: late.signal })),
    onSection: (s) => {
      seen.push(s);
      late.abort();
    },
  });
  assert.equal((await rejection(p2)).kind, 'aborted');
  assert.ok(seen.length >= 1);
});

test('malformed lines and unknown kinds are skipped; the wire never needs more than the contract', () => {
  assert.equal(parseProposalEvent('not json'), null);
  assert.equal(parseProposalEvent(JSON.stringify({ type: 'section', section: { k: 'poem', text: 'x' } })), null);
  assert.equal(parseProposalEvent(JSON.stringify({ type: 'section', section: { k: 'need', id: 'n', need: 'x', source: 'rumour', answer: 'y', products: [] } })), null);
  assert.equal(parseProposalEvent(JSON.stringify({ type: 'status', code: 'fallback', text: '' })), null, 'only retry and finish');
  assert.deepEqual(parseProposalEvent(JSON.stringify({ type: 'section', section: { k: 'tradeoff', text: 'x', mitigation: '  ' } })), { type: 'section', section: { k: 'tradeoff', text: 'x' } });
});

test('a draft is read defensively: bad parts are dropped, never passed on to the PDF', () => {
  const d = asDraft({ lang: 'fr', exec: 'E', needs: [{ id: 'a', need: 'N', source: 'stated', answer: 'A', products: ['alb', 3] }, { id: 'b' }], outcomes: [{ title: 'T' }, { title: 'T', text: 'X' }], why: { alb: 'W', ecs: 7 }, tradeoffs: [{ text: 'R', mitigation: '' }], next: ['go', 4, ' '], complete: 'yes' });
  assert.deepEqual(d, { lang: 'en', exec: 'E', needs: [{ id: 'a', need: 'N', source: 'stated', answer: 'A', products: ['alb'] }], outcomes: [{ title: 'T', text: 'X' }], why: { alb: 'W' }, tradeoffs: [{ text: 'R' }], next: ['go'], complete: false });
  assert.equal(asDraft(null), null);
  assert.equal(asDraft({ needs: [] }), null);
});


test('workflow sections and step maps survive the wire; malformed fields are discarded', async () => {
  const section: ProposalSection = { k: 'step', id: 'draft', text: 'Draft the answer with qwen3.5-plus.' };
  assert.deepEqual(parseProposalEvent(JSON.stringify({ type: 'section', section })), { type: 'section', section });
  assert.equal(parseProposalEvent(JSON.stringify({ type: 'section', section: { ...section, id: '' } })), null);
  const draft = { ...DRAFT, steps: { draft: section.text, empty: '', wrong: 3 } };
  assert.deepEqual(asDraft(draft)?.steps, { draft: section.text });
  const seen: ProposalSection[] = [];
  const result = await requestDraft(REQ, {
    signal: new AbortController().signal, onSection: (s) => seen.push(s),
    fetchImpl: (async () => streamOf([enc.encode([
      JSON.stringify({ type: 'section', section }), JSON.stringify({ type: 'done', draft }), '',
    ].join('\n'))])) as typeof fetch,
  });
  assert.deepEqual(result.steps, { draft: section.text });
  assert.deepEqual(seen, [section]);
});
