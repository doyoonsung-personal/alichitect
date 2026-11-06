// routes.ts, called DIRECTLY (index.ts wiring is the coordinator's seam): eligibility on every request, dispatch,
// the endpoint contract of plan §7 (create-if-absent, optimistic concurrency, note dedup, generation leases and
// quota) and failure isolation (missing bd_ tables answer a structured 500 and never throw).
//
// NOTE: this suite imports routes.ts, which imports the parallel agent's packages/bd-brief validate.ts and engine.ts.
// Until those land the suite cannot load; the injected fake engine keeps it independent of engine behavior.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Env } from '../src/env.ts';
import * as db from '../src/db.ts';
import { handleBdBrief } from '../src/features/bd-brief/routes.ts';
import type { BdBriefDeps } from '../src/features/bd-brief/routes.ts';
import type { UserRow } from '../src/db.ts';
import type { BriefCandidate, BriefContent, GenerateInput, GenerateResult, IdFactory, ModelUsage } from '../../../packages/bd-brief/src/types.ts';
import { BD_BRIEF_API_PREFIX, LIMITS, makeEmptyContent } from '../../../packages/bd-brief/src/types.ts';
import { richSnapshot, sampleContent, thinSnapshot } from '../../../packages/bd-brief/src/fixtures.ts';
import { makeCtx, makeEnv, req, signIn } from './helpers.ts';
import type { TestEnv } from './helpers.ts';

type EngineOutcome = { ok: true; result: GenerateResult } | { ok: false; reason: 'timeout' | 'model' | 'validation'; partialUsage: ModelUsage | null };

const T0 = Date.UTC(2026, 10, 5, 12, 0, 0);
const candidate: BriefCandidate = { kind: 'content', baseVersion: 0, snapshotFingerprint: 'fp-gen', content: sampleContent(), changes: null };
const okOutcome: EngineOutcome = { ok: true, result: { candidate, usage: { inputTokens: 11, outputTokens: 7 }, repairs: 0 } };

function seqIds(): IdFactory {
  let n = 0;
  return { next: (prefix) => `${prefix}-t${++n}` };
}

// ONE counter for the whole suite: row ids are primary keys, so a per-request factory would collide on the second insert
const testIds = seqIds();

/** A counting fake engine; the canned outcome can be swapped between calls. */
function fakeEngine(first: () => Promise<EngineOutcome> | EngineOutcome = () => okOutcome): { engine: NonNullable<BdBriefDeps['engine']>; calls: GenerateInput[] } {
  const calls: GenerateInput[] = [];
  const engine = (async (input: GenerateInput): Promise<EngineOutcome> => {
    calls.push(input);
    return first();
  }) as NonNullable<BdBriefDeps['engine']>;
  return { engine, calls };
}

async function setup(over: Partial<Env> = {}): Promise<{ env: TestEnv; user: UserRow }> {
  // the allowlist is now fail-closed (empty => nobody eligible), so the suite lists its signed-in addresses by default
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'bd@example.com,other@example.com', ...over });
  const { user } = await signIn(env, 'bd@example.com', { status: 'approved' });
  return { env, user };
}

const bdReq = (suffix: string, o: { method?: string; body?: unknown; type?: string | null } = {}): Request =>
  req(BD_BRIEF_API_PREFIX + suffix, {
    method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
    ...(o.body !== undefined ? { body: JSON.stringify(o.body), type: o.type === null ? undefined : (o.type ?? 'application/json') } : {}),
  });

async function callBd(env: Env, user: UserRow, request: Request, deps: BdBriefDeps = {}): Promise<Response> {
  const ctx = makeCtx();
  const res = await handleBdBrief(request, env, ctx, user, new URL(request.url), { now: () => T0, ids: testIds, ...deps });
  await ctx.flush();
  return res;
}

const createBody = (sourceKey = 'sess-1') => ({ sourceKey, lang: 'en', snapshot: thinSnapshot({ sourceKey }) });
const noteBody = (requestId = 'note-req-1', text = 'They confirmed the 15-minute requirement and want a PoC.') => ({ requestId, text, meetingDate: '2026-11-03', source: null });
const generateBody = (over: Record<string, unknown> = {}) => ({ requestId: 'gen-1', mode: 'initial', expectedVersion: 0, lang: 'en', snapshot: thinSnapshot({ sourceKey: 'sess-1' }), noteIds: null, ...over });

async function createBrief(env: TestEnv, user: UserRow, deps: BdBriefDeps = {}): Promise<string> {
  const res = await callBd(env, user, bdReq('/briefs', { body: createBody() }), deps);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { brief: { id: string } };
  return body.brief.id;
}

/* ---------- eligibility (plan §5) ---------- */

test('admin-only trial is enforced by the direct handler, including allowlisted verified accounts', async () => {
  const { env, user } = await setup({ BD_BRIEF_ADMIN_ONLY: '1' });
  const originalPrepare = env.DB.prepare;
  env.DB.prepare = () => { throw new Error('ineligible trial account must not touch storage'); };
  try {
    for (const role of ['user', 'verified'] as const) {
      const res = await callBd(env, { ...user, role }, bdReq('/briefs', { body: createBody() }));
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { error: 'not-available' });
    }
  } finally { env.DB.prepare = originalPrepare; }
  const allowed = (await signIn(env, user.email, { role: 'admin', status: 'approved' })).user;
  assert.equal((await callBd(env, allowed, bdReq('/briefs', { body: createBody() }))).status, 200);
  const outside = (await signIn(env, 'outside@example.com', { role: 'admin', status: 'approved' })).user;
  assert.equal((await callBd(env, outside, bdReq('/briefs?sourceKey=sess-1'))).status, 404);
  assert.equal((await callBd(env, { ...allowed, status: 'pending' }, bdReq('/briefs?sourceKey=sess-1'))).status, 403);
});

test('not eligible: flag off, empty allowlist or allowlist miss answers 404 not-available on every route', async () => {
  const off = await setup({ BD_BRIEF_ENABLED: undefined });
  for (const r of [bdReq('/briefs?sourceKey=s'), bdReq('/briefs', { body: createBody() })]) {
    const res = await callBd(off.env, off.user, r);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'not-available' });
  }
  // enabled but the allowlist is empty/unset: NOBODY is eligible (fail closed, not "everyone")
  for (const empty of [{ BD_BRIEF_ALLOWLIST: undefined }, { BD_BRIEF_ALLOWLIST: '' }, { BD_BRIEF_ALLOWLIST: '  ' }]) {
    const closed = await setup(empty);
    const res = await callBd(closed.env, closed.user, bdReq('/briefs?sourceKey=s'));
    assert.equal(res.status, 404, JSON.stringify(empty));
    assert.deepEqual(await res.json(), { error: 'not-available' });
  }
  const missed = await setup({ BD_BRIEF_ALLOWLIST: 'someone.else@example.com' });
  const res = await callBd(missed.env, missed.user, bdReq('/briefs?sourceKey=s'));
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not-available' });
  const listed = await setup({ BD_BRIEF_ALLOWLIST: 'BD@Example.com' });
  const ok = await callBd(listed.env, listed.user, bdReq('/briefs?sourceKey=s'));
  assert.equal(ok.status, 200, 'the listed account (case-insensitive) gets through');
});

/* ---------- dispatch ---------- */

test('dispatch: unknown suffixes 404, wrong methods 405 with Allow', async () => {
  const { env, user } = await setup();
  const cases: Array<[Request, number, string | null]> = [
    [bdReq('/nope'), 404, null],
    [bdReq('/'), 404, null],
    [bdReq('/briefs', { method: 'DELETE' }), 405, 'GET, POST'],
  ];
  for (const [r, status, allow] of cases) {
    const res = await callBd(env, user, r);
    assert.equal(res.status, status);
    assert.deepEqual(await res.json(), { error: status === 404 ? 'not-found' : 'method-not-allowed' });
    if (allow) assert.equal(res.headers.get('Allow'), allow);
  }
  const id = await createBrief(env, user);
  const more: Array<[Request, number, string | null]> = [
    [bdReq(`/briefs/${id}`, { method: 'POST' }), 405, 'GET, PATCH, DELETE'],
    [bdReq(`/briefs/${id}/notes`), 405, 'POST'],
    [bdReq(`/briefs/${id}/generate`), 405, 'POST'],
    [bdReq(`/briefs/${id}/other`, { method: 'POST', body: {} }), 404, null],
    [bdReq(`/briefs/${id}/deep/path`), 404, null],
    [bdReq('/briefs/bad!!id'), 404, null],
  ];
  for (const [r, status, allow] of more) {
    const res = await callBd(env, user, r);
    assert.equal(res.status, status, `${r.method} ${new URL(r.url).pathname}`);
    if (allow) assert.equal(res.headers.get('Allow'), allow);
  }
});

/* ---------- bodies ---------- */

test('bodies: non-JSON content type, oversized body and bad JSON are structured 4xx', async () => {
  const { env, user } = await setup();
  const wrongType = await callBd(env, user, req(BD_BRIEF_API_PREFIX + '/briefs', { method: 'POST', body: 'hi', type: 'text/plain' }));
  assert.equal(wrongType.status, 415);
  assert.deepEqual(await wrongType.json(), { error: 'invalid-request', message: 'Content-Type must be application/json' });
  const badJson = await callBd(env, user, req(BD_BRIEF_API_PREFIX + '/briefs', { method: 'POST', body: '{oops', type: 'application/json' }));
  assert.equal(badJson.status, 400);
  assert.deepEqual(await badJson.json(), { error: 'invalid-request', message: 'body is not valid JSON' });
  const huge = await callBd(env, user, req(BD_BRIEF_API_PREFIX + '/briefs', { method: 'POST', body: JSON.stringify({ sourceKey: 'x'.repeat(600 * 1024) }), type: 'application/json' }));
  assert.equal(huge.status, 413);
  assert.equal(((await huge.json()) as { error: string }).error, 'limit-exceeded');
});

/* ---------- create / get / patch ---------- */

describe('brief lifecycle', () => {
  test('create is create-if-absent (200 for fresh and existing), GET by source and by id', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const again = await callBd(env, user, bdReq('/briefs', { body: createBody() }));
    assert.equal(again.status, 200);
    assert.equal(((await again.json()) as { brief: { id: string; version: number } }).brief.id, id, 'one brief per owner+source');

    const bySource = await callBd(env, user, bdReq('/briefs?sourceKey=sess-1'));
    assert.equal(bySource.status, 200);
    const list = (await bySource.json()) as { brief: { id: string; sourceKind: string; sourceKey: string; version: number; lang: string; snapshotFingerprint: string; updatedAt: number } | null };
    assert.equal(list.brief?.id, id);
    assert.equal(list.brief?.version, 0);

    const missing = await callBd(env, user, bdReq('/briefs?sourceKey=other'));
    assert.deepEqual(await missing.json(), { brief: null });
    for (const q of ['/briefs', '/briefs?sourceKey=', '/briefs?sourceKey=%20']) {
      const res = await callBd(env, user, bdReq(q));
      assert.equal(res.status, 400, q);
      assert.equal(((await res.json()) as { error: string }).error, 'invalid-request');
    }

    const payload = await callBd(env, user, bdReq(`/briefs/${id}`));
    assert.equal(payload.status, 200);
    const got = (await payload.json()) as { brief: { id: string; content: BriefContent }; versions: unknown[]; notes: unknown[] };
    assert.equal(got.brief.id, id);
    assert.deepEqual(got.brief.content, makeEmptyContent());
    assert.deepEqual(got.versions, []);
    assert.deepEqual(got.notes, []);
    assert.equal((await callBd(env, user, bdReq('/briefs/missing-id'))).status, 404);
  });

  test('create rejects invalid bodies: bad snapshot pricing (figures while stale)', async () => {
    const { env, user } = await setup();
    const stale = richSnapshot({ sourceKey: 'sess-1', pricing: { status: 'stale', currency: 'USD', monthlyUsd: 4820, oneTimeUsd: 1500, source: 'session-pricing' } });
    const res = await callBd(env, user, bdReq('/briefs', { body: { sourceKey: 'sess-1', lang: 'en', snapshot: stale } }));
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { error: string }).error, 'invalid-request');
  });

  test('patch happy path saves a version; stale expectedVersion conflicts with currentVersion', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const patched: BriefContent = {
      ...makeEmptyContent(),
      opportunity: { id: 'opportunity', text: 'The customer wants a bounded PoC first.', sourceIds: ['objective'], review: 'confirmed', origin: 'edit', edited: true },
    };
    const body = { expectedVersion: 0, content: patched, origin: 'edit', acceptances: null, snapshotFingerprint: 'fp-1', sourceRevision: 2 };
    const res = await callBd(env, user, bdReq(`/briefs/${id}`, { method: 'PATCH', body }));
    assert.equal(res.status, 200);
    const saved = (await res.json()) as { brief: { version: number; content: BriefContent; snapshotFingerprint: string; sourceRevision: number } };
    assert.equal(saved.brief.version, 1);
    assert.deepEqual(saved.brief.content, patched);
    assert.equal(saved.brief.snapshotFingerprint, 'fp-1');

    const stale = await callBd(env, user, bdReq(`/briefs/${id}`, { method: 'PATCH', body }));
    assert.equal(stale.status, 409);
    assert.deepEqual(await stale.json(), { error: 'version-conflict', currentVersion: 1 });
    // the accepted content is unchanged after the refused save
    const after = await callBd(env, user, bdReq(`/briefs/${id}`));
    assert.equal(((await after.json()) as { brief: { version: number } }).brief.version, 1);
  });

  test('patch rejects unknown sourceIds in the content (evidence set: notes + latest version evidence + reserved)', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const note = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody() }));
    assert.equal(note.status, 200);
    const noteId = ((await note.json()) as { note: { id: string } }).note.id;
    const withNote: BriefContent = { ...makeEmptyContent(), opportunity: { id: 'opportunity', text: 'From the meeting.', sourceIds: [noteId], review: 'unreviewed', origin: 'edit' } };
    const okRes = await callBd(env, user, bdReq(`/briefs/${id}`, { method: 'PATCH', body: { expectedVersion: 0, content: withNote, origin: 'notes-review', acceptances: null, snapshotFingerprint: 'fp-1', sourceRevision: 2 } }));
    assert.equal(okRes.status, 200, 'a saved note id is allowed evidence');
    const unknown: BriefContent = { ...makeEmptyContent(), opportunity: { id: 'opportunity', text: 'Invented.', sourceIds: ['st-999'], review: 'unreviewed', origin: 'edit' } };
    const bad = await callBd(env, user, bdReq(`/briefs/${id}`, { method: 'PATCH', body: { expectedVersion: 1, content: unknown, origin: 'edit', acceptances: null, snapshotFingerprint: 'fp-1', sourceRevision: 2 } }));
    assert.equal(bad.status, 400);
    assert.equal(((await bad.json()) as { error: string }).error, 'invalid-request');
  });

  test('delete removes the brief (204, empty body), then it is gone; deleting again 404s', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody() }));
    const del = await callBd(env, user, bdReq(`/briefs/${id}`, { method: 'DELETE' }));
    assert.equal(del.status, 204);
    assert.equal(await del.text(), '');
    assert.equal((await callBd(env, user, bdReq(`/briefs/${id}`))).status, 404);
    assert.equal((await callBd(env, user, bdReq(`/briefs/${id}`, { method: 'DELETE' }))).status, 404);
    assert.deepEqual(await (await callBd(env, user, bdReq('/briefs?sourceKey=sess-1'))).json(), { brief: null });
  });

  test("another owner's ids are not-found everywhere", async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody() }));
    const { user: other } = await signIn(env, 'other@example.com', { status: 'approved' });
    assert.deepEqual(await (await callBd(env, other, bdReq('/briefs?sourceKey=sess-1'))).json(), { brief: null });
    assert.equal((await callBd(env, other, bdReq(`/briefs/${id}`))).status, 404);
    assert.equal((await callBd(env, other, bdReq(`/briefs/${id}`, { method: 'PATCH', body: { expectedVersion: 0, content: makeEmptyContent(), origin: 'edit', acceptances: null, snapshotFingerprint: '', sourceRevision: 0 } }))).status, 404);
    assert.equal((await callBd(env, other, bdReq(`/briefs/${id}/notes`, { body: noteBody('r-other') }))).status, 404);
    assert.equal((await callBd(env, other, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-other' }) }))).status, 404);
    assert.equal((await callBd(env, other, bdReq(`/briefs/${id}`, { method: 'DELETE' }))).status, 404);
    assert.equal((await callBd(env, user, bdReq(`/briefs/${id}`))).status, 200, "the owner's brief survived every attempt");
  });
});

/* ---------- notes ---------- */

describe('notes', () => {
  test('dedup: identical replay returns the stored note; same requestId with different text conflicts', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const first = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody() }));
    assert.equal(first.status, 200);
    const made = (await first.json()) as { note: { id: string; briefId: string; requestId: string; text: string; savedAt: number }; deduplicated: boolean };
    assert.equal(made.deduplicated, false);
    assert.equal(made.note.briefId, id);
    assert.equal(made.note.savedAt, T0);
    const replay = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody() }));
    assert.equal(replay.status, 200);
    const dup = (await replay.json()) as { note: { id: string }; deduplicated: boolean };
    assert.equal(dup.deduplicated, true);
    assert.equal(dup.note.id, made.note.id);
    const conflict = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody('note-req-1', 'a different note under the same requestId') }));
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { error: 'request-conflict' });
  });

  test('invalid notes: bad requestId charset and an oversized note text', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const badId = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody('bad id!!/<>') }));
    assert.equal(badId.status, 400);
    assert.equal(((await badId.json()) as { error: string }).error, 'invalid-request');
    const huge = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody('note-big', 'x'.repeat(LIMITS.noteChars + 1)) }));
    assert.equal(huge.status, 400);
    assert.equal(((await huge.json()) as { error: string }).error, 'invalid-request');
    const missing = await callBd(env, user, bdReq('/briefs/missing-id/notes', { body: noteBody() }));
    assert.equal(missing.status, 404);
  });
});

/* ---------- generate ---------- */

describe('generate', () => {
  test('happy path: completed candidate, usage booked, accepted content untouched, engine called once', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const { engine, calls } = fakeEngine();
    const res = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { state: 'completed', candidate, usage: { inputTokens: 11, outputTokens: 7 } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].mode, 'initial');
    assert.equal(calls[0].base, null, 'version 0 has no accepted base');
    // a generation NEVER overwrites the accepted content (plan §7): the client must PATCH to accept it
    const after = await callBd(env, user, bdReq(`/briefs/${id}`));
    const payload = (await after.json()) as { brief: { version: number; content: BriefContent } };
    assert.equal(payload.brief.version, 0);
    assert.deepEqual(payload.brief.content, makeEmptyContent());
  });

  test('idempotency: same requestId+payload reuses the stored candidate without a second engine call', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const { engine, calls } = fakeEngine();
    const first = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(first.status, 200);
    const replay = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { state: 'completed', candidate, usage: { inputTokens: 11, outputTokens: 7 } });
    assert.equal(calls.length, 1, 'the engine ran once; the replay reused the stored candidate');
  });

  test('same requestId with a different payload conflicts', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const { engine, calls } = fakeEngine();
    assert.equal((await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine })).status, 200);
    const changed = generateBody({ snapshot: thinSnapshot({ sourceKey: 'sess-1', objective: 'a different objective changes the payload hash' }) });
    const res = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: changed }), { engine });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { error: 'request-conflict' });
    assert.equal(calls.length, 1);
  });

  test('in-progress lease: a replay while the engine runs answers in-progress, not a second paid call', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    let release!: (o: EngineOutcome) => void;
    let hit!: () => void;
    const pending = new Promise<EngineOutcome>((r) => (release = r));
    const reached = new Promise<void>((r) => (hit = r));
    let calls = 0;
    const engine = (async (): Promise<EngineOutcome> => {
      calls++;
      hit();
      return pending;
    }) as NonNullable<BdBriefDeps['engine']>;
    const running = callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    await reached; // the claim is stored and the engine is in flight
    const replay = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { state: 'in-progress' });
    assert.equal(calls, 1);
    release(okOutcome);
    const done = await running;
    assert.equal(done.status, 200);
    assert.equal(((await done.json()) as { state: string }).state, 'completed');
  });

  test('quota: the per-day cap answers 429 limit-exceeded; 0 disables generation', async () => {
    const zero = await setup({ BD_BRIEF_MAX_PER_USER_DAY: '0' });
    const idZero = await createBrief(zero.env, zero.user);
    const { engine } = fakeEngine();
    const blocked = await callBd(zero.env, zero.user, bdReq(`/briefs/${idZero}/generate`, { body: generateBody() }), { engine });
    assert.equal(blocked.status, 429);
    assert.equal(((await blocked.json()) as { error: string }).error, 'limit-exceeded');

    const one = await setup({ BD_BRIEF_MAX_PER_USER_DAY: '1' });
    const id = await createBrief(one.env, one.user);
    const ok = await callBd(one.env, one.user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(ok.status, 200);
    const replay = await callBd(one.env, one.user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(replay.status, 200, 'an already-paid candidate stays retrievable after the daily cap');
    const next = await callBd(one.env, one.user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-2' }) }), { engine });
    assert.equal(next.status, 429);
    assert.deepEqual(await next.json(), { error: 'limit-exceeded', message: 'daily brief-generation limit (1) reached' });
  });

  test('concurrency: a live lease makes a DIFFERENT requestId answer 429 without calling the engine; after completion the next proceeds', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    let release!: (o: EngineOutcome) => void;
    let hit!: () => void;
    const pending = new Promise<EngineOutcome>((r) => (release = r));
    const reached = new Promise<void>((r) => (hit = r));
    let calls = 0;
    const engine = (async (): Promise<EngineOutcome> => {
      calls++;
      hit();
      return pending;
    }) as NonNullable<BdBriefDeps['engine']>;
    const running = callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    await reached; // the claim is stored and the engine is in flight
    const blocked = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-2' }) }), { engine });
    assert.equal(blocked.status, 429);
    assert.equal(((await blocked.json()) as { error: string }).error, 'limit-exceeded');
    assert.equal(calls, 1, 'the blocked generate never reached the engine (LIMITS.maxConcurrentGenerations = 1)');
    release(okOutcome);
    const done = await running;
    assert.equal(done.status, 200);
    // the completed lease frees the slot: the next distinct requestId proceeds
    const next = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-3' }) }), { engine: fakeEngine().engine });
    assert.equal(next.status, 200);
    assert.equal(((await next.json()) as { state: string }).state, 'completed');
  });

  test('concurrency: a FAILED generation releases the slot for the next requestId', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    let outcome: EngineOutcome = { ok: false, reason: 'model', partialUsage: null };
    const { engine, calls } = fakeEngine(() => outcome);
    const failed = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(failed.status, 502);
    outcome = okOutcome;
    const next = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-2' }) }), { engine });
    assert.equal(next.status, 200, 'the failed lease does not hold the concurrency slot');
    assert.equal(calls.length, 2);
  });

  test('concurrency: a parallel burst of distinct requestIds lands exactly one paid engine call', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    let release!: (o: EngineOutcome) => void;
    let hit!: () => void;
    const pending = new Promise<EngineOutcome>((r) => (release = r));
    const reached = new Promise<void>((r) => (hit = r));
    let calls = 0;
    const engine = (async (): Promise<EngineOutcome> => {
      calls++;
      hit();
      return pending;
    }) as NonNullable<BdBriefDeps['engine']>;
    // quota+2 parallel generates: the old count-then-insert let ALL of them pass the count before any claim landed;
    // the conditional INSERT in claimRequest serializes them (exactly one lease can exist at a time)
    const total = LIMITS.generationsPerUserDay + 2;
    const answered: Response[] = [];
    const burst = Promise.all(
      Array.from({ length: total }, (_, i) =>
        callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: `burst-${i}` }) }), { engine }).then((r) => {
          answered.push(r);
          return r;
        }),
      ),
    );
    await reached; // the winner holds the lease; every other request must now answer 429 while it is held
    const deadline = Date.now() + 5_000;
    while (answered.length < total - 1 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 5));
    release(okOutcome);
    const statuses = (await burst).map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 200).length, 1);
    assert.equal(statuses.filter((s) => s === 429).length, total - 1);
    assert.equal(calls, 1, 'one paid call, not one per racing request');
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM bd_brief_requests').first<{ n: number }>();
    assert.equal(Number(rows?.n), 1, 'only the winner claimed a row');
  });

  test('concurrency: an EXPIRED in-progress lease does not block a new generation', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    // a lease whose isolate died and the background expiry has not pruned yet: expires_at already in the past
    await env.DB.prepare(`INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, version_base, created_at, expires_at) VALUES ('dead-lease', ?, ?, 'dead', 'h', 'in-progress', 0, ?, ?)`)
      .bind(id, user.id, T0 - 3_600_000, T0 - 1)
      .run();
    const { engine, calls } = fakeEngine();
    const res = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { state: string }).state, 'completed');
    assert.equal(calls.length, 1);
  });

  test('expectedVersion must equal the stored brief version', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const { engine, calls } = fakeEngine();
    const res = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ expectedVersion: 3 }) }), { engine });
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { error: 'version-conflict', currentVersion: 0 });
    assert.equal(calls.length, 0);
  });

  test('engine failure: structured generation-failed, the brief is intact, the lease is released for a NEW requestId', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    let outcome: EngineOutcome = { ok: false, reason: 'timeout', partialUsage: { inputTokens: 3, outputTokens: 0 } };
    const { engine, calls } = fakeEngine(() => outcome);
    const failed = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(failed.status, 504, 'timeout maps to 504 (502 model, 422 validation)');
    assert.deepEqual(await failed.json(), { error: 'generation-failed', reason: 'timeout' });
    // the accepted brief is untouched
    const after = await callBd(env, user, bdReq(`/briefs/${id}`));
    assert.equal(((await after.json()) as { brief: { version: number; content: BriefContent } }).brief.version, 0);
    // retrying the FAILED generation with the same requestId is refused: no hidden repeated paid calls (plan §7)
    const replay = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(replay.status, 409);
    const conflictBody = (await replay.json()) as { error: string; message?: string };
    assert.equal(conflictBody.error, 'request-conflict');
    assert.match(conflictBody.message ?? '', /new requestId/);
    assert.equal(calls.length, 1, 'the replay never reached the engine');
    // a NEW requestId succeeds once the model works again
    outcome = okOutcome;
    const retry = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-2' }) }), { engine });
    assert.equal(retry.status, 200);
    assert.equal(((await retry.json()) as { state: string }).state, 'completed');
    assert.equal(calls.length, 2);

    // the other failure reasons map to their documented statuses
    for (const [reason, status] of [['model', 502], ['validation', 422]] as Array<['model' | 'validation', number]>) {
      outcome = { ok: false, reason, partialUsage: null };
      const res = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: `gen-${reason}` }) }), { engine });
      assert.equal(res.status, status);
      assert.deepEqual(await res.json(), { error: 'generation-failed', reason });
    }
  });

  test('a throwing engine is caught: 502 generation-failed and the lease is released', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    let throwOnce = true;
    const engine = (async (): Promise<EngineOutcome> => {
      if (throwOnce) {
        throwOnce = false;
        throw new Error('provider exploded');
      }
      return okOutcome;
    }) as NonNullable<BdBriefDeps['engine']>;
    const failed = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody() }), { engine });
    assert.equal(failed.status, 502);
    assert.deepEqual(await failed.json(), { error: 'generation-failed', reason: 'model' });
    const retry = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-2' }) }), { engine });
    assert.equal(retry.status, 200);
  });

  test('review-notes loads only this brief\'s notes; unknown note ids are invalid-request', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user);
    const n1 = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody('r1', 'first note') }));
    const noteId = ((await n1.json()) as { note: { id: string } }).note.id;
    const { engine, calls } = fakeEngine();
    // review-notes forbids a client snapshot (it could smuggle unreviewed evidence); the route synthesizes one from the stored brief
    const res = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-rn', mode: 'review-notes', snapshot: null, noteIds: [noteId] }) }), { engine });
    assert.equal(res.status, 200);
    assert.equal(calls[0].mode, 'review-notes');
    assert.deepEqual(calls[0].notes.map((n) => n.id), [noteId]);
    assert.equal(calls[0].snapshot.sourceKey, 'sess-1', 'the synthesized snapshot comes from the stored brief');
    assert.deepEqual(calls[0].snapshot.statements, []);
    const smuggled = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-rn3', mode: 'review-notes', noteIds: [noteId] }) }), { engine });
    assert.equal(smuggled.status, 400, 'a client snapshot in review-notes mode is invalid-request');
    const unknown = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-rn2', mode: 'review-notes', snapshot: null, noteIds: [noteId, 'note-missing'] }) }), { engine });
    assert.equal(unknown.status, 400);
    assert.equal(((await unknown.json()) as { error: string }).error, 'invalid-request');
    assert.equal(calls.length, 1);
  });

  test('review-notes must use the brief\'s lang: a different lang is invalid-request and never reaches the engine', async () => {
    const { env, user } = await setup();
    const id = await createBrief(env, user); // lang 'en'
    const n1 = await callBd(env, user, bdReq(`/briefs/${id}/notes`, { body: noteBody('r1', 'first note') }));
    const noteId = ((await n1.json()) as { note: { id: string } }).note.id;
    const { engine, calls } = fakeEngine();
    // change text authored in one language against content in another is refused before any claim or model call
    const mismatched = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-rn-ko', mode: 'review-notes', lang: 'ko', snapshot: null, noteIds: [noteId] }) }), { engine });
    assert.equal(mismatched.status, 400);
    const body = (await mismatched.json()) as { error: string; message?: string };
    assert.equal(body.error, 'invalid-request');
    assert.match(body.message ?? '', /lang/);
    assert.equal(calls.length, 0);
    // the matching lang still works
    const matching = await callBd(env, user, bdReq(`/briefs/${id}/generate`, { body: generateBody({ requestId: 'gen-rn-en', mode: 'review-notes', lang: 'en', snapshot: null, noteIds: [noteId] }) }), { engine });
    assert.equal(matching.status, 200);
    assert.equal(calls.length, 1);
  });
});

/* ---------- failure isolation (plan §5: missing tables fail only BD routes) ---------- */

test('missing bd_ tables: BD routes answer a structured 500 and the handler never throws; platform queries are unaffected', async () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'bd@example.com' });
  const { user } = await signIn(env, 'bd@example.com', { status: 'approved' });
  // a deployment whose migration 0011 has not been applied yet
  env.DB.sqlite.exec('DROP TABLE IF EXISTS bd_brief_notes; DROP TABLE IF EXISTS bd_brief_requests; DROP TABLE IF EXISTS bd_brief_versions; DROP TABLE IF EXISTS bd_briefs;');
  for (const r of [bdReq('/briefs?sourceKey=s'), bdReq('/briefs', { body: createBody() })]) {
    const res = await callBd(env, user, r);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'internal' });
  }
  // an /api/me-style platform query on the same database still works (capability discovery never touches bd_ tables)
  assert.equal((await db.userById(env.DB, user.id))?.email, 'bd@example.com');
  assert.equal(await db.turnsToday(env.DB, user.id, T0), 0);
});
