// The typed fetch client against a fake fetchImpl: URLs, methods, bodies, header discipline,
// structured error parsing (plan §7) and the network/abort split.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CreateBriefRequest, GenerateHttpRequest, PatchBriefRequest } from '@ali/bd-brief/types.ts';
import { BD_BRIEF_API_PREFIX } from '@ali/bd-brief/types.ts';
import { emptyBriefRecord, sampleBriefRecord, thinSnapshot } from '@ali/bd-brief/fixtures.ts';
import type { ReqOpts } from './api.ts';
import { BdBriefApiError, createBdBriefApi } from './api.ts';

interface RecordedCall {
  url: string;
  init: RequestInit;
}

/** A fake transport: records every call and answers with whatever the test programs. */
function harness(answer: (call: RecordedCall) => Response | Promise<Response>) {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const call: RecordedCall = { url: String(input), init: init ?? {} };
    calls.push(call);
    return answer(call);
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('listBriefs: GET the prefix + encoded sourceKey, same-origin credentials, no body', async () => {
  const h = harness(() => json({ brief: null }));
  const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
  const res = await api.listBriefs('sess a/1');
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, `${BD_BRIEF_API_PREFIX}/briefs?sourceKey=${encodeURIComponent('sess a/1')}`);
  assert.equal(h.calls[0].init.method, 'GET');
  assert.equal(h.calls[0].init.credentials, 'same-origin');
  assert.equal(h.calls[0].init.body, undefined);
  assert.deepEqual((h.calls[0].init.headers as Record<string, string>).Accept, 'application/json');
  assert.deepEqual(res, { brief: null });
});

test('createBrief: POST /briefs with the JSON contract body', async () => {
  const h = harness(() => json({ brief: emptyBriefRecord() }));
  const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
  const body: CreateBriefRequest = { sourceKey: 'sess-thin-001', lang: 'en', snapshot: thinSnapshot() };
  const res = await api.createBrief(body);
  assert.equal(h.calls[0].url, `${BD_BRIEF_API_PREFIX}/briefs`);
  assert.equal(h.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(h.calls[0].init.body)), body);
  assert.equal((h.calls[0].init.headers as Record<string, string>)['Content-Type'], 'application/json');
  assert.equal(res.brief.id, emptyBriefRecord().id);
});

test('getBrief / patchBrief / addNote / generate / deleteBrief: encoded id paths and methods', async () => {
  const h = harness((call) => {
    if (call.init.method === 'DELETE') return new Response(null, { status: 204 });
    if (call.init.method === 'PATCH') return json({ brief: sampleBriefRecord({ version: 3 }) });
    if (call.url.endsWith('/notes')) return json({ note: { id: 'n1' }, deduplicated: false });
    if (call.url.endsWith('/generate')) return json({ state: 'in-progress' });
    return json({ brief: sampleBriefRecord(), versions: [], notes: [] });
  });
  const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
  const id = 'brief/ünique-1';
  const enc = encodeURIComponent(id);

  await api.getBrief(id);
  assert.equal(h.calls[0].url, `${BD_BRIEF_API_PREFIX}/briefs/${enc}`);
  assert.equal(h.calls[0].init.method, 'GET');

  const patchBody: PatchBriefRequest = {
    expectedVersion: 2, content: sampleBriefRecord().content, origin: 'edit', acceptances: null,
    snapshotFingerprint: 'fp', sourceRevision: 7,
  };
  const patched = await api.patchBrief(id, patchBody);
  assert.equal(h.calls[1].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(String(h.calls[1].init.body)), patchBody);
  assert.equal(patched.brief.version, 3);

  await api.addNote(id, { requestId: 'bdb-req-1-x', text: 'notes', meetingDate: null, source: null });
  assert.equal(h.calls[2].url, `${BD_BRIEF_API_PREFIX}/briefs/${enc}/notes`);
  assert.equal(h.calls[2].init.method, 'POST');

  const genBody: GenerateHttpRequest = { requestId: 'bdb-req-2-y', mode: 'initial', expectedVersion: 0, lang: 'en', snapshot: thinSnapshot(), noteIds: null };
  const gen = await api.generate(id, genBody);
  assert.equal(h.calls[3].url, `${BD_BRIEF_API_PREFIX}/briefs/${enc}/generate`);
  assert.deepEqual(gen, { state: 'in-progress' });

  const del = await api.deleteBrief(id);
  assert.equal(h.calls[4].init.method, 'DELETE');
  assert.equal(h.calls[4].init.body, undefined);
  assert.equal(del, undefined); // 204: no body is parsed
});

test('error bodies parse into BdBriefApiError with code, status and currentVersion', async () => {
  const cases: Array<[unknown, number, string, number | undefined]> = [
    [{ error: 'not-available' }, 404, 'not-available', undefined],
    [{ error: 'version-conflict', currentVersion: 5, message: 'stale save' }, 409, 'version-conflict', 5],
    [{ error: 'request-conflict' }, 409, 'request-conflict', undefined],
    [{ error: 'limit-exceeded' }, 429, 'limit-exceeded', undefined],
    [{ error: 'totally-unknown-code' }, 500, 'internal', undefined],
    ['not-an-object', 500, 'internal', undefined],
  ];
  for (const [body, status, code, currentVersion] of cases) {
    const h = harness(() => json(body, status));
    const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
    const err = await api.getBrief('b1').then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(err instanceof BdBriefApiError, `expected BdBriefApiError for ${JSON.stringify(body)}`);
    assert.equal(err.code, code);
    assert.equal(err.status, status);
    assert.equal(err.currentVersion, currentVersion);
  }
});

test('a generation-failed body keeps its reason (worker sends { error, reason } without message)', async () => {
  const genBody: GenerateHttpRequest = {
    requestId: 'bdb-req-9-z', mode: 'initial', expectedVersion: 0, lang: 'en', snapshot: thinSnapshot(), noteIds: null,
  };
  const cases: Array<[string, number]> = [['timeout', 504], ['model', 502], ['validation', 422]];
  for (const [reason, status] of cases) {
    const h = harness(() => json({ error: 'generation-failed', reason }, status));
    const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
    const err = await api.generate('b1', genBody).catch((e: unknown) => e);
    assert.ok(err instanceof BdBriefApiError, `expected BdBriefApiError for reason ${reason}`);
    assert.equal(err.code, 'generation-failed');
    assert.equal(err.status, status);
    assert.equal(err.reason, reason);
  }
  // an unknown or missing reason degrades to undefined, never to a crash
  const h = harness(() => json({ error: 'generation-failed', reason: 'nonsense' }, 502));
  const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
  const err = await api.generate('b1', genBody).catch((e: unknown) => e);
  assert.ok(err instanceof BdBriefApiError);
  assert.equal(err.reason, undefined);
});

test('a version-conflict error keeps currentVersion and the server message', async () => {
  const h = harness(() => json({ error: 'version-conflict', currentVersion: 7, message: 'saved elsewhere' }, 409));
  const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
  const err = await api.patchBrief('b1', {
    expectedVersion: 2, content: sampleBriefRecord().content, origin: 'edit', acceptances: null, snapshotFingerprint: 'fp', sourceRevision: 1,
  }).catch((e: unknown) => e);
  assert.ok(err instanceof BdBriefApiError);
  assert.equal(err.code, 'version-conflict');
  assert.equal(err.currentVersion, 7);
  assert.equal(err.message, 'saved elsewhere');
});

test('a non-JSON error body degrades to internal, not to a crash', async () => {
  const h = harness(() => new Response('<html>500</html>', { status: 500, headers: { 'Content-Type': 'text/html' } }));
  const api = createBdBriefApi({ fetchImpl: h.fetchImpl });
  const err = await api.getBrief('b1').catch((e: unknown) => e);
  assert.ok(err instanceof BdBriefApiError);
  assert.equal(err.code, 'internal');
  assert.equal(err.status, 500);
});

test('network failure becomes code internal with status 0', async () => {
  const fetchImpl = (async () => {
    throw new TypeError('Failed to fetch');
  }) as unknown as typeof fetch;
  const api = createBdBriefApi({ fetchImpl });
  const err = await api.listBriefs('s').catch((e: unknown) => e);
  assert.ok(err instanceof BdBriefApiError);
  assert.equal(err.code, 'internal');
  assert.equal(err.status, 0);
  assert.match(err.message, /Failed to fetch/);
});

test('an aborted request stays an AbortError: the controller must tell cancel from failure', async () => {
  const ac = new AbortController();
  const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
    init?.signal?.throwIfAborted();
    return json({ brief: null });
  }) as unknown as typeof fetch;
  const api = createBdBriefApi({ fetchImpl });
  ac.abort();
  const err = await api.listBriefs('s', { signal: ac.signal } satisfies ReqOpts).catch((e: unknown) => e);
  assert.ok(err instanceof Error);
  assert.equal(err.name, 'AbortError');
  assert.ok(!(err instanceof BdBriefApiError));
});

test('a per-call fetchImpl overrides the client default', async () => {
  const def = harness(() => json({ brief: null }));
  const per = harness(() => json({ brief: { id: 'from-override' } } as never));
  const api = createBdBriefApi({ fetchImpl: def.fetchImpl });
  await api.listBriefs('s', { fetchImpl: per.fetchImpl });
  assert.equal(def.calls.length, 0);
  assert.equal(per.calls.length, 1);
});
