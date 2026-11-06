// repository.ts: owner scoping (plan §7 — other owners' ids read as not-found and can never be changed),
// optimistic concurrency, bounded history pruning with inline evidence, note dedup, the daily quota count and the
// opportunistic lease expiry. Runs on the real migrations through helpers.makeD1 (SQLite-backed D1 fake).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BriefCandidate, BriefContent } from '../../../packages/bd-brief/src/types.ts';
import { LIMITS, makeEmptyContent } from '../../../packages/bd-brief/src/types.ts';
import { sampleContent } from '../../../packages/bd-brief/src/fixtures.ts';
import * as repo from '../src/features/bd-brief/repository.ts';
import type { UserRow } from '../src/db.ts';
import { makeEnv, makeUser } from './helpers.ts';
import type { TestEnv } from './helpers.ts';

const T0 = Date.UTC(2026, 10, 5, 12, 0, 0);

// claimRequest takes the quota limits as parameters (the repository never reads env); tests that are not about the
// limits claim with everything wide open.
const openLimits = { dayStart: 0, perDay: 1000, maxConcurrent: 100, maxGlobalConcurrent: 1000 };

async function setup(): Promise<{ env: TestEnv; a: UserRow; b: UserRow; briefId: string }> {
  const env = makeEnv();
  const a = await makeUser(env, 'bd-a@example.com', { status: 'approved' });
  const b = await makeUser(env, 'bd-b@example.com', { status: 'approved' });
  const brief = await repo.createBrief(env.DB, a.id, { id: 'brief-a1', sourceKey: 'sess-1', lang: 'en', now: T0 });
  return { env, a, b, briefId: brief.id };
}

const candidateFixture: BriefCandidate = { kind: 'content', baseVersion: 0, snapshotFingerprint: 'fp-1', content: sampleContent(), changes: null };

test('createBrief makes a version-0 container and is create-if-absent per (owner, source)', async () => {
  const { env, a } = await setup();
  const first = await repo.getBrief(env.DB, a.id, 'brief-a1');
  assert.ok(first);
  assert.equal(first.version, 0);
  assert.equal(first.sourceKind, 'browser-session');
  assert.equal(first.lang, 'en');
  assert.deepEqual(first.content, makeEmptyContent());
  assert.equal(first.snapshotFingerprint, '');
  // a second create for the same source returns the EXISTING row (two racing tabs get one brief)
  const again = await repo.createBrief(env.DB, a.id, { id: 'brief-a2', sourceKey: 'sess-1', lang: 'ko', now: T0 + 1 });
  assert.equal(again.id, 'brief-a1');
  assert.equal(again.lang, 'en', 'the stored brief is untouched');
  assert.equal(await repo.getBrief(env.DB, a.id, 'brief-a2'), null, 'no second row was made');
});

test('owner scoping: user B never sees, updates or deletes user A rows', async () => {
  const { env, a, b, briefId } = await setup();
  await repo.saveVersion(env.DB, a.id, briefId, 0, sampleContent(), 'generated', { snapshotFingerprint: 'fp-1', sourceRevision: 3, evidence: ['st-1'], now: T0 });
  await repo.addNote(env.DB, a.id, briefId, { id: 'n1', requestId: 'r1', text: 'note text', meetingDate: null, source: null, now: T0 });
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'q1', requestId: 'g1', payloadHash: 'h1', versionBase: 1, now: T0, expiresAt: T0 + 86_400_000 }, openLimits);

  assert.equal(await repo.getBrief(env.DB, b.id, briefId), null);
  assert.equal(await repo.findActiveBySource(env.DB, b.id, 'browser-session', 'sess-1'), null);
  assert.equal(await repo.getPayload(env.DB, b.id, briefId), null);
  assert.deepEqual(await repo.listNotes(env.DB, b.id, briefId), []);
  assert.deepEqual(await repo.getNotesByIds(env.DB, b.id, briefId, ['n1']), []);
  assert.deepEqual(await repo.latestVersionEvidence(env.DB, b.id, briefId), []);
  assert.deepEqual(await repo.saveVersion(env.DB, b.id, briefId, 1, makeEmptyContent(), 'edit', { snapshotFingerprint: '', sourceRevision: 0, evidence: [], now: T0 }), { ok: false, currentVersion: -1 });
  assert.deepEqual(await repo.addNote(env.DB, b.id, briefId, { id: 'n2', requestId: 'r1', text: 'x', meetingDate: null, source: null, now: T0 }), { ok: false, error: 'not-found' });
  assert.equal(await repo.findRequest(env.DB, b.id, briefId, 'g1'), null);
  assert.equal(await repo.completeRequest(env.DB, b.id, briefId, 'g1', candidateFixture, null, T0), false);
  assert.equal(await repo.failRequest(env.DB, b.id, briefId, 'g1', 'model', null, T0), false);
  assert.equal(await repo.countGenerationsToday(env.DB, b.id, 0), 0);
  assert.equal(await repo.deleteBrief(env.DB, b.id, briefId), false);
  // A's data is intact after all of B's attempts
  assert.ok(await repo.getBrief(env.DB, a.id, briefId));
  assert.equal((await repo.listNotes(env.DB, a.id, briefId)).length, 1);
  assert.equal((await repo.findRequest(env.DB, a.id, briefId, 'g1'))?.state, 'in-progress');
});

test('saveVersion: optimistic concurrency, and a stale expectedVersion conflicts with the current version', async () => {
  const { env, a, briefId } = await setup();
  const content = sampleContent();
  assert.deepEqual(await repo.saveVersion(env.DB, a.id, briefId, 0, content, 'generated', { snapshotFingerprint: 'fp-1', sourceRevision: 3, evidence: ['st-1'], now: T0 }), { ok: true, version: 1 });
  const after = await repo.getBrief(env.DB, a.id, briefId);
  assert.equal(after?.version, 1);
  assert.deepEqual(after?.content, content);
  assert.equal(after?.snapshotFingerprint, 'fp-1');
  assert.equal(after?.sourceRevision, 3);
  assert.equal(after?.updatedAt, T0);
  // the stale save is refused and changes nothing
  assert.deepEqual(await repo.saveVersion(env.DB, a.id, briefId, 0, makeEmptyContent(), 'edit', { snapshotFingerprint: 'fp-2', sourceRevision: 4, evidence: [], now: T0 + 1 }), { ok: false, currentVersion: 1 });
  assert.equal((await repo.getBrief(env.DB, a.id, briefId))?.version, 1);
  assert.equal((await repo.getPayload(env.DB, a.id, briefId))?.versions.length, 1);
});

test('saveVersion prunes to the newest LIMITS.acceptedVersions and retained versions keep their inline evidence', async () => {
  const { env, a, briefId } = await setup();
  const total = LIMITS.acceptedVersions + 2;
  for (let v = 0; v < total; v++) {
    const content: BriefContent = { ...makeEmptyContent(), opportunity: { ...makeEmptyContent().opportunity, text: `v${v + 1}` } };
    const r = await repo.saveVersion(env.DB, a.id, briefId, v, content, 'edit', { snapshotFingerprint: `fp-${v + 1}`, sourceRevision: v, evidence: [`st-${v + 1}`], now: T0 + v });
    assert.deepEqual(r, { ok: true, version: v + 1 });
  }
  const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM bd_brief_versions WHERE brief_id = ?').bind(briefId).first<{ n: number }>();
  assert.equal(Number(rows?.n), LIMITS.acceptedVersions);
  const payload = await repo.getPayload(env.DB, a.id, briefId);
  assert.equal(payload?.versions.length, LIMITS.acceptedVersions);
  assert.equal(payload?.versions[0].version, total, 'newest first');
  assert.equal(payload?.versions.at(-1)?.version, total - LIMITS.acceptedVersions + 1, 'oldest pruned');
  // the newest version's evidence survived (evidence lives inline, so pruning never orphans retained claims)
  assert.deepEqual(await repo.latestVersionEvidence(env.DB, a.id, briefId), [`st-${total}`]);
});

test('addNote dedups only an IDENTICAL replay; any difference under the same requestId conflicts', async () => {
  const { env, a, briefId } = await setup();
  const req = { id: 'n1', requestId: 'r1', text: 'they confirmed the PoC scope', meetingDate: '2026-11-03', source: 'Seoul office', now: T0 };
  const first = await repo.addNote(env.DB, a.id, briefId, req);
  assert.deepEqual(first, { ok: true, deduplicated: false, note: { id: 'n1', briefId, requestId: 'r1', text: req.text, meetingDate: '2026-11-03', source: 'Seoul office', savedAt: T0 } });
  const replay = await repo.addNote(env.DB, a.id, briefId, { ...req, id: 'n2' });
  assert.ok(replay.ok);
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.note.id, 'n1', 'the stored note comes back, not a new row');
  const conflict = await repo.addNote(env.DB, a.id, briefId, { ...req, id: 'n3', text: 'different text under the same requestId' });
  assert.deepEqual(conflict, { ok: false, error: 'request-conflict' });
  // a corrected meetingDate or source under the same requestId must NOT silently return the old note
  assert.deepEqual(await repo.addNote(env.DB, a.id, briefId, { ...req, id: 'n4', meetingDate: '2026-11-04' }), { ok: false, error: 'request-conflict' });
  assert.deepEqual(await repo.addNote(env.DB, a.id, briefId, { ...req, id: 'n5', source: 'Busan office' }), { ok: false, error: 'request-conflict' });
  assert.deepEqual(await repo.addNote(env.DB, a.id, briefId, { ...req, id: 'n6', meetingDate: null }), { ok: false, error: 'request-conflict' });
  assert.deepEqual(await repo.addNote(env.DB, a.id, briefId, { ...req, id: 'n7', source: null }), { ok: false, error: 'request-conflict' });
  assert.equal((await repo.listNotes(env.DB, a.id, briefId)).length, 1);
});

test('getNotesByIds returns only the brief\'s own notes', async () => {
  const { env, a, briefId } = await setup();
  await repo.addNote(env.DB, a.id, briefId, { id: 'n1', requestId: 'r1', text: 'one', meetingDate: null, source: null, now: T0 });
  await repo.addNote(env.DB, a.id, briefId, { id: 'n2', requestId: 'r2', text: 'two', meetingDate: null, source: null, now: T0 + 1 });
  const got = await repo.getNotesByIds(env.DB, a.id, briefId, ['n2', 'missing', 'n1']);
  assert.deepEqual(got.map((n) => n.id).sort(), ['n1', 'n2']);
  assert.deepEqual(await repo.getNotesByIds(env.DB, a.id, briefId, []), []);
});

test('claimRequest: same requestId+payloadHash is existing, a different hash conflicts', async () => {
  const { env, a, briefId } = await setup();
  const req = { id: 'q1', requestId: 'g1', payloadHash: 'hash-1', versionBase: 0, now: T0, expiresAt: T0 + 86_400_000 };
  assert.deepEqual(await repo.claimRequest(env.DB, a.id, briefId, req, openLimits), { state: 'claimed' });
  const again = await repo.claimRequest(env.DB, a.id, briefId, { ...req, id: 'q2' }, openLimits);
  assert.equal(again.state, 'existing');
  assert.ok(again.state === 'existing' && again.row.payloadHash === 'hash-1' && again.row.state === 'in-progress');
  assert.deepEqual(await repo.claimRequest(env.DB, a.id, briefId, { ...req, id: 'q3', payloadHash: 'hash-2' }, openLimits), { state: 'conflict' });
  // complete books the candidate and usage on the claim row (feature-only accounting)
  assert.equal(await repo.completeRequest(env.DB, a.id, briefId, 'g1', candidateFixture, { inputTokens: 11, outputTokens: 7 }, T0 + 5), true);
  const done = await repo.findRequest(env.DB, a.id, briefId, 'g1');
  assert.equal(done?.state, 'completed');
  assert.deepEqual(done?.candidate, candidateFixture);
  assert.deepEqual(done?.usage, { inputTokens: 11, outputTokens: 7 });
  assert.equal(await repo.completeRequest(env.DB, a.id, briefId, 'g1', candidateFixture, null, T0 + 6), false, 'only an in-progress claim completes');
  // a failed claim releases the lease but keeps the row so a same-id replay is refused
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'q4', requestId: 'g2', payloadHash: 'h', versionBase: 0, now: T0, expiresAt: T0 + 86_400_000 }, openLimits);
  assert.equal(await repo.failRequest(env.DB, a.id, briefId, 'g2', 'timeout', null, T0 + 1), true);
  assert.equal((await repo.findRequest(env.DB, a.id, briefId, 'g2'))?.state, 'failed');
  assert.equal(await repo.failRequest(env.DB, a.id, briefId, 'g2', 'model', null, T0 + 2), false);
});

test('claimRequest is the atomic daily gate: a parallel burst inserts exactly perDay rows and the rest are limit', async () => {
  const { env, a, briefId } = await setup();
  const perDay = LIMITS.generationsPerUserDay;
  const dayStart = Date.UTC(2026, 10, 5);
  // maxConcurrent wide open: this burst is about the daily cap only (concurrency has its own test below)
  const limits = { dayStart, perDay, maxConcurrent: 1000, maxGlobalConcurrent: 1000 };
  // distinct requestIds, fired in parallel: the conditional INSERT re-checks the count per statement, so a
  // count-then-insert race (all N passing the count before any claim lands) cannot exceed the cap
  const results = await Promise.all(
    Array.from({ length: perDay + 2 }, (_, i) =>
      repo.claimRequest(env.DB, a.id, briefId, { id: `q${i}`, requestId: `g${i}`, payloadHash: 'h', versionBase: 0, now: T0 + i, expiresAt: T0 + 86_400_000 }, limits),
    ),
  );
  assert.equal(results.filter((r) => r.state === 'claimed').length, perDay);
  assert.equal(results.filter((r) => r.state === 'limit').length, 2);
  const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM bd_brief_requests').first<{ n: number }>();
  assert.equal(Number(rows?.n), perDay, 'exactly perDay rows landed');
  // a fresh UTC-day window starts with a fresh cap: the spent day's rows are all before the new dayStart
  const nextDay = dayStart + 86_400_000;
  const burst2 = await Promise.all(
    Array.from({ length: 2 }, (_, i) =>
      repo.claimRequest(env.DB, a.id, briefId, { id: `r${i}`, requestId: `r${i}`, payloadHash: 'h', versionBase: 0, now: nextDay + 3_600_000 + i, expiresAt: nextDay + 90_000_000 }, { ...limits, dayStart: nextDay }),
    ),
  );
  assert.deepEqual(burst2.map((r) => r.state), ['claimed', 'claimed']);
});

test('claimRequest enforces maxConcurrent: a live lease blocks, completing/failing/expiring it frees the slot', async () => {
  const { env, a, briefId } = await setup();
  const limits = { dayStart: 0, perDay: 1000, maxConcurrent: LIMITS.maxConcurrentGenerations };
  const claim = (id: string, requestId: string, now: number, expiresAt: number): Promise<repo.ClaimResult> =>
    repo.claimRequest(env.DB, a.id, briefId, { id, requestId, payloadHash: 'h', versionBase: 0, now, expiresAt }, limits);
  assert.equal((await claim('q1', 'g1', T0, T0 + 60_000)).state, 'claimed');
  // a second DISTINCT requestId while the lease is live: the bounded-concurrency gate refuses it
  assert.deepEqual(await claim('q2', 'g2', T0 + 1, T0 + 60_001), { state: 'limit' });
  // completing releases the slot
  assert.equal(await repo.completeRequest(env.DB, a.id, briefId, 'g1', candidateFixture, null, T0 + 2), true);
  assert.equal((await claim('q3', 'g3', T0 + 3, T0 + 60_003)).state, 'claimed');
  // failing releases it too
  assert.equal(await repo.failRequest(env.DB, a.id, briefId, 'g3', 'timeout', null, T0 + 4), true);
  assert.equal((await claim('q4', 'g4', T0 + 5, T0 + 60_005)).state, 'claimed');
  // an EXPIRED in-progress lease (expires_at <= now, a crashed isolate not yet pruned) does not count
  const later = T0 + 90_000;
  assert.equal((await claim('q5', 'g5', later, later + 60_000)).state, 'claimed', 'q4 expired at T0+60005, so the slot is free');
  assert.deepEqual(await claim('q6', 'g6', later + 1, later + 60_001), { state: 'limit' }, 'q5 is live at `later`');
});

test('countGenerationsToday counts claims since the UTC-day start only', async () => {
  const { env, a, briefId } = await setup();
  const dayStart = Date.UTC(2026, 10, 5);
  const claim = (id: string, requestId: string, createdAt: number): Promise<unknown> =>
    repo.claimRequest(env.DB, a.id, briefId, { id, requestId, payloadHash: 'h', versionBase: 0, now: createdAt, expiresAt: createdAt + 86_400_000 }, openLimits);
  await claim('q1', 'g1', dayStart - 1); // yesterday, just before the boundary
  await claim('q2', 'g2', dayStart); // exactly the boundary counts
  await claim('q3', 'g3', dayStart + 3_600_000);
  assert.equal(await repo.countGenerationsToday(env.DB, a.id, dayStart), 2);
  assert.equal(await repo.countGenerationsToday(env.DB, a.id, dayStart - 86_400_000), 3);
});

test('global admission admits at most four concurrent owners and completion frees one slot', async () => {
  const { env } = await setup();
  const owners = await Promise.all(Array.from({ length: repo.BD_BRIEF_MAX_GLOBAL_CONCURRENT + 2 }, (_, i) => makeUser(env, `bd-global-${i}@example.org`, { status: 'approved' })));
  const briefs = await Promise.all(owners.map((owner, i) => repo.createBrief(env.DB, owner.id, { id: `global-brief-${i}`, sourceKey: 'global-source', lang: 'en', now: T0 })));
  const claims = await Promise.all(owners.map((owner, i) => repo.claimRequest(env.DB, owner.id, briefs[i].id,
    { id: `global-q-${i}`, requestId: `global-r-${i}`, payloadHash: 'h', versionBase: 0, now: T0, expiresAt: T0 + 60_000 },
    { dayStart: 0, perDay: 20, maxConcurrent: 1 })));
  assert.equal(claims.filter(claim => claim.state === 'claimed').length, repo.BD_BRIEF_MAX_GLOBAL_CONCURRENT);
  assert.equal(claims.filter(claim => claim.state === 'limit').length, 2);
  await repo.completeRequest(env.DB, owners[0].id, briefs[0].id, 'global-r-0', candidateFixture, null, T0 + 1);
  assert.equal((await repo.claimRequest(env.DB, owners.at(-1)!.id, briefs.at(-1)!.id,
    { id: 'global-after-completion', requestId: 'after-completion', payloadHash: 'h', versionBase: 0, now: T0 + 2, expiresAt: T0 + 60_000 },
    { dayStart: 0, perDay: 20, maxConcurrent: 1 })).state, 'claimed');
});

test('expireStaleRequests fails stale in-progress leases and deletes rows past expires_at', async () => {
  const { env, a, briefId } = await setup();
  const staleMs = 60_000;
  const T = T0 + 3_600_000;
  // a lease whose isolate died: in-progress, created long before now, retention not yet reached
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'q1', requestId: 'stale', payloadHash: 'h', versionBase: 0, now: T0, expiresAt: T0 + 86_400_000 }, openLimits);
  // a fresh lease: must stay in-progress
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'q2', requestId: 'fresh', payloadHash: 'h', versionBase: 0, now: T - 1_000, expiresAt: T + 86_400_000 }, openLimits);
  // a finished record past its retention: deleted outright
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'q3', requestId: 'old', payloadHash: 'h', versionBase: 0, now: T0 - 90_000, expiresAt: T - 1 }, openLimits);
  await repo.completeRequest(env.DB, a.id, briefId, 'old', candidateFixture, null, T0 - 89_000);
  // completeRequest pushed expires_at out again; pull it back into the past like a row aged past retention
  await env.DB.prepare('UPDATE bd_brief_requests SET expires_at = ? WHERE request_id = ?').bind(T - 1, 'old').run();

  const changed = await repo.expireStaleRequests(env.DB, T, staleMs);
  assert.equal(changed, 2);
  assert.equal((await repo.findRequest(env.DB, a.id, briefId, 'stale'))?.state, 'failed');
  assert.equal((await repo.findRequest(env.DB, a.id, briefId, 'stale'))?.reason, 'timeout');
  assert.equal((await repo.findRequest(env.DB, a.id, briefId, 'fresh'))?.state, 'in-progress');
  assert.equal(await repo.findRequest(env.DB, a.id, briefId, 'old'), null);
});

test('expired short leases retain failed accounting instead of refunding the daily cap', async () => {
  const { env, a, briefId } = await setup();
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'short-q', requestId: 'short-r', payloadHash: 'h', versionBase: 0, now: T0, expiresAt: T0 + 30_000 }, openLimits);
  await repo.expireStaleRequests(env.DB, T0 + 30_001);
  const retained = await repo.findRequest(env.DB, a.id, briefId, 'short-r');
  assert.equal(retained?.state, 'failed');
  assert.equal(retained?.reason, 'timeout');
  assert.ok(retained!.expiresAt > T0 + 86_400_000);
  assert.equal(await repo.countGenerationsToday(env.DB, a.id, 0), 1);
  assert.equal((await repo.claimRequest(env.DB, a.id, briefId,
    { id: 'after-timeout', requestId: 'after-timeout', payloadHash: 'h', versionBase: 0, now: T0 + 30_002, expiresAt: T0 + 60_000 },
    { ...openLimits, perDay: 1 })).state, 'limit');
});

test('deleteBrief removes private content but retains daily accounting and the pending model slot', async () => {
  const { env, a, briefId } = await setup();
  await repo.saveVersion(env.DB, a.id, briefId, 0, sampleContent(), 'generated', { snapshotFingerprint: 'fp', sourceRevision: 1, evidence: [], now: T0 });
  await repo.addNote(env.DB, a.id, briefId, { id: 'n1', requestId: 'r1', text: 't', meetingDate: null, source: null, now: T0 });
  await repo.claimRequest(env.DB, a.id, briefId, { id: 'q1', requestId: 'g1', payloadHash: 'h', versionBase: 1, now: T0, expiresAt: T0 + 86_400_000 }, openLimits);
  assert.equal(await repo.deleteBrief(env.DB, a.id, briefId), true);
  assert.equal(await repo.deleteBrief(env.DB, a.id, briefId), false);
  assert.equal(await repo.deleteBrief(env.DB, a.id, 'missing'), false);
  for (const t of ['bd_brief_versions', 'bd_brief_notes']) {
    const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first<{ n: number }>();
    assert.equal(Number(r?.n), 0, t);
  }
  const retained = await repo.findRequest(env.DB, a.id, briefId, 'g1');
  assert.equal(retained?.payloadHash, '');
  assert.equal(retained?.candidate, null);
  assert.equal(retained?.state, 'in-progress', 'deleting a brief does not cancel the provider request');
  assert.equal(await repo.countGenerationsToday(env.DB, a.id, 0), 1);
  const replacement = await repo.createBrief(env.DB, a.id, { id: 'replacement', sourceKey: 'sess-1', lang: 'en', now: T0 + 1 });
  const claim = { id: 'q2', requestId: 'g2', payloadHash: 'h2', versionBase: 0, now: T0 + 2, expiresAt: T0 + 60_000 };
  assert.equal((await repo.claimRequest(env.DB, a.id, replacement.id, claim, { ...openLimits, maxConcurrent: 1 })).state, 'limit');
  assert.equal(await repo.completeRequest(env.DB, a.id, briefId, 'g1', candidateFixture, { inputTokens: 11, outputTokens: 7 }, T0 + 3), true);
  const finished = await repo.findRequest(env.DB, a.id, briefId, 'g1');
  assert.equal(finished?.candidate, null, 'late completion cannot restore deleted customer content');
  assert.deepEqual(finished?.usage, { inputTokens: 11, outputTokens: 7 });
  assert.equal((await repo.claimRequest(env.DB, a.id, replacement.id, claim, { ...openLimits, perDay: 1 })).state, 'limit', 'delete/recreate cannot refund the daily quota');
});

test('a corrupt content JSON projects to null instead of throwing out of the repository', async () => {
  const { env, a, briefId } = await setup();
  await env.DB.prepare('UPDATE bd_briefs SET content = ? WHERE id = ?').bind('{not json', briefId).run();
  assert.equal(await repo.getBrief(env.DB, a.id, briefId), null);
  assert.equal(await repo.findActiveBySource(env.DB, a.id, 'browser-session', 'sess-1'), null);
  assert.equal(await repo.getPayload(env.DB, a.id, briefId), null);
});
