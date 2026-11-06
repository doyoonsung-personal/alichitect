import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeEnv, makeUser, makeD1Without, makeCtx, req } from './helpers.ts';
import { handleBdBrief } from '../src/features/bd-brief/routes.ts';
import { createBrief, findActiveBySource, listDiscoveryBriefs, DiscoveryBriefLimitError } from '../src/features/bd-brief/repository.ts';
import { makeEmptyContent, LIMITS } from '../../../packages/bd-brief/src/types.ts';
import type { BriefSnapshot, GenerateInput, BriefRecord, BriefPayload } from '../../../packages/bd-brief/src/types.ts';
import { snapshotFingerprint } from '../../../packages/bd-brief/src/evidence.ts';

const snapshot = (key = 'first-meeting'): BriefSnapshot => ({ schemaVersion: 1, sourceKind: 'discovery', sourceKey: key, sourceRevision: 0, suppliedBy: 'signed-in-user', capturedAt: 1000, lang: 'ko', objective: null, statements: [], design: null, pricing: { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null } });
const prefix = '/api/features/bd-brief';

test('0012 preserves existing briefs, notes, versions, cached candidates and host data with FKs enabled', async () => {
  const env = makeEnv({ DB: makeD1Without('0012_') });
  const a = await makeUser(env, 'migration@example.org', { status: 'approved' });
  const d = env.DB.sqlite;
  d.prepare(`INSERT INTO bd_briefs(id,owner_id,source_kind,source_key,lang,version,content,created_at,updated_at) VALUES('old',?,'browser-session','s','ko',1,?,1,2)`).run(a.id, JSON.stringify(makeEmptyContent()));
  d.prepare(`INSERT INTO bd_brief_notes(id,brief_id,owner_id,request_id,text,saved_at) VALUES('n','old',?,'n1','retained note',2)`).run(a.id);
  d.exec(`INSERT INTO bd_brief_versions(brief_id,version,origin,content,snapshot_fingerprint,evidence,saved_at) VALUES('old',1,'generated','{}','fp','["evidence"]',2)`);
  d.prepare(`INSERT INTO bd_brief_requests(id,brief_id,owner_id,request_id,payload_hash,state,candidate,usage_json,created_at,expires_at) VALUES('r','old',?,'r1','hash','completed','cached candidate','{"inputTokens":10}',1,999)`).run(a.id);
  const tables = ['bd_brief_notes', 'bd_brief_versions', 'bd_brief_requests', 'users'];
  const before = tables.map(t => d.prepare(`SELECT * FROM ${t}`).all());
  d.exec('BEGIN');
  d.exec(readFileSync(new URL('../migrations/0012_bd_discovery.sql', import.meta.url), 'utf8'));
  d.exec('COMMIT');
  tables.forEach((t,i) => assert.deepEqual(d.prepare(`SELECT * FROM ${t}`).all(), before[i], t));
  const b = await findActiveBySource(env.DB, a.id, 'browser-session', 's');assert.equal(b?.version, 1);assert.equal(b?.discovery, undefined);
  assert.deepEqual(d.prepare('PRAGMA foreign_key_check').all(), []);
  d.exec(`DELETE FROM bd_briefs WHERE id='old'`);
  assert.equal(d.prepare('SELECT candidate FROM bd_brief_requests').get()?.candidate, null, 'scrubbing trigger restored');
  assert.equal(d.prepare('SELECT COUNT(*) n FROM bd_brief_notes').get()?.n, 0);
  assert.equal(d.prepare('SELECT COUNT(*) n FROM bd_brief_versions').get()?.n, 0);
  assert.equal(d.prepare('SELECT COUNT(*) n FROM bd_brief_requests').get()?.n, 1, 'accounting retained');
});

test('independent source identity, owner scoping, atomic library bound and idempotent create', async () => {
  const env = makeEnv();const a = await makeUser(env, 'first@example.org'), b = await makeUser(env, 'second@example.org');
  const init = (key: string) => ({ id: key, sourceKey: key, lang: 'ko' as const, now: 1000, discovery: { title: '첫 미팅', snapshot: snapshot(key) } });
  const first = await createBrief(env.DB, a.id, init('same'));
  await createBrief(env.DB, a.id, { id: 'browser', sourceKey: 'same', lang: 'ko', now: 1000 });
  assert.equal((await findActiveBySource(env.DB, a.id, 'discovery', 'same'))?.id, first.id);
  assert.equal((await findActiveBySource(env.DB, a.id, 'browser-session', 'same'))?.id, 'browser');
  assert.deepEqual(await listDiscoveryBriefs(env.DB, b.id), []);
  for (let n = 1;n < LIMITS.discoveryBriefs;n++) await createBrief(env.DB, a.id, init('meeting-'+n));
  const results = await Promise.allSettled([createBrief(env.DB, a.id, init('overflow-a')), createBrief(env.DB, a.id, init('overflow-b'))]);
  assert.ok(results.every(r => r.status === 'rejected' && r.reason instanceof DiscoveryBriefLimitError));
  assert.equal((await createBrief(env.DB, a.id, { ...init('same'), id: 'retry' })).id, first.id);
  assert.equal((await listDiscoveryBriefs(env.DB, a.id)).length, LIMITS.discoveryBriefs);
});

test('empty discovery survives create, generate, explicit save and reopen without core session or turn writes', async () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ADMIN_ONLY: '1', BD_BRIEF_ALLOWLIST: 'admin@example.org' });
  const user = await makeUser(env, 'admin@example.org', { role: 'admin', status: 'approved' });
  const other = await makeUser(env, 'other@example.org', { role: 'admin', status: 'approved' });
  const calls: GenerateInput[] = [];
  const content = makeEmptyContent();content.opportunity.text = '고객의 문제와 사업 영향은 아직 확인되지 않았습니다.';
  content.questions = [{ id: 'q', text: '현재 업무에서 가장 많은 시간이 드는 일은 무엇인가요?', priority: true, context: null, answer: null, sourceIds: [], review: 'unreviewed', origin: 'model' }];
  let id = 0;
  const call = async (suffix: string, method = 'GET', body?: unknown, account = user) => {
    const request = req(prefix + suffix, { method, ...(body ? { body: JSON.stringify(body), type: 'application/json' } : {}) });
    const ctx = makeCtx();
    const res = await handleBdBrief(request, env, ctx, account, new URL(request.url), { now: () => 1000, ids: { next: p => p + (++id) }, engine: async input => {
      calls.push(input);return { ok: true, result: { candidate: { kind: 'content', baseVersion: 0, snapshotFingerprint: snapshotFingerprint(input.snapshot), content, changes: null }, usage: null, repairs: 0 } };
    } });await ctx.flush();return res;
  };
  const made = await call('/briefs', 'POST', { sourceKey: 'first-meeting', lang: 'ko', snapshot: snapshot() });
  assert.equal(made.status, 200);const { brief } = await made.json() as { brief: BriefRecord };
  assert.equal(brief.discovery?.title, '첫 고객 미팅');assert.deepEqual(brief.discovery?.snapshot.statements, []);assert.equal(calls.length, 0);
  const before = env.DB.sqlite.prepare('SELECT * FROM usage').all();
  const base = { requestId: 'generate1', mode: 'initial', expectedVersion: 0, lang: 'ko', snapshot: snapshot(), noteIds: null };
  const bad = await call(`/briefs/${brief.id}/generate`, 'POST', { ...base, snapshot: { ...snapshot(), sourceKey: 'different' } });assert.equal(bad.status, 400);assert.equal(calls.length, 0);
  const generated = await call(`/briefs/${brief.id}/generate`, 'POST', base);assert.equal(generated.status, 200);assert.equal(calls.length, 1);assert.equal(calls[0].snapshot.design, null);
  const saved = await call(`/briefs/${brief.id}`, 'PATCH', { expectedVersion: 0, content, origin: 'generated', acceptances: null, snapshotFingerprint: snapshotFingerprint(snapshot()), sourceRevision: 0 });assert.equal(saved.status, 200);
  const reopened = await (await call(`/briefs/${brief.id}`)).json() as BriefPayload;
  assert.equal(reopened.brief.version, 1);assert.deepEqual(reopened.brief.discovery?.snapshot, snapshot());assert.equal(reopened.brief.content.questions.length, 1);
  assert.equal((await call('/discovery-briefs', 'GET', undefined, { ...user, role: 'user' })).status, 404);
  assert.equal((await call(`/briefs/${brief.id}`, 'GET', undefined, other)).status, 404);
  assert.deepEqual(env.DB.sqlite.prepare('SELECT * FROM usage').all(), before);
  assert.equal((await call(`/briefs/${brief.id}`, 'DELETE')).status, 204);
  assert.deepEqual((await (await call('/discovery-briefs')).json() as { briefs: unknown[] }).briefs, []);
});
