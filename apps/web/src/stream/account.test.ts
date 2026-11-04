import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authHandoff, fetchAccount, loginUrl, nextResetMs, parseAccount, quotaOf, shortName } from './account.ts';
import { probeHealth } from './ndjson-client.ts';

const ME = { email: 'mina@example.com', name: 'Mina Park', role: 'member', status: 'approved', lang: 'en', createdAt: 1, turnsToday: 12, turnsPerDay: 60, links: { account: '/account', admin: null, signOut: '/auth/logout' } };
const json = (body: unknown, status = 200, type = 'application/json; charset=utf-8'): Response => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': type } });

test('parseAccount reads the Worker shape and refuses anything else', () => {
  const a = parseAccount(ME)!;
  assert.equal(a.email, 'mina@example.com');
  assert.equal(a.role, 'member');
  const verified = parseAccount({ ...ME, role: 'verified', turnsPerDay: null })!;
  assert.equal(verified.role, 'verified');
  assert.equal(quotaOf(verified).kind, 'unlimited');
  assert.equal(verified.links.admin, null);
  assert.deepEqual(a.links, { account: '/account', admin: null, signOut: '/auth/logout' });
  assert.equal(parseAccount({ ...ME, role: 'admin', turnsPerDay: null, links: { account: '/account', admin: '/admin', signOut: '/auth/logout' } })!.turnsPerDay, null);
  for (const bad of [null, [], 'x', {}, { ...ME, email: '' }, { ...ME, turnsToday: 'many' }, { ...ME, turnsPerDay: -1 }, { ...ME, links: null }, { ...ME, links: { ...ME.links, signOut: 'https://evil.example/out' } }, { ...ME, links: { ...ME.links, account: '//evil.example' } }, { ...ME, links: { ...ME.links, admin: 7 } }]) {
    assert.equal(parseAccount(bad), null, JSON.stringify(bad)?.slice(0, 60));
  }
});

test('fetchAccount is null for a missing route, an HTML page, a 401, a network error and a timeout', async () => {
  assert.equal((await fetchAccount({ fetchImpl: (async () => json(ME)) as typeof fetch }))?.name, 'Mina Park');
  assert.equal(await fetchAccount({ fetchImpl: (async () => json({ error: 'not-found' }, 404)) as typeof fetch }), null);
  assert.equal(await fetchAccount({ fetchImpl: (async () => json('<!doctype html><p>app</p>', 200, 'text/html')) as typeof fetch }), null);
  assert.equal(await fetchAccount({ fetchImpl: (async () => json({ error: 'signed-out' }, 401)) as typeof fetch }), null);
  assert.equal(await fetchAccount({ fetchImpl: (async () => Promise.reject(new TypeError('fetch failed'))) as typeof fetch }), null);
  assert.equal(await fetchAccount({ timeoutMs: 10, fetchImpl: ((_u: string, i?: RequestInit) => new Promise((_r, rej) => i?.signal?.addEventListener('abort', () => rej(new DOMException('x', 'AbortError'))))) as typeof fetch }), null);
});

test('quota: unlimited accounts show usage, limited accounts count down to zero', () => {
  assert.deepEqual(quotaOf({ turnsToday: 5, turnsPerDay: null }), { kind: 'unlimited', used: 5 });
  assert.deepEqual(quotaOf({ turnsToday: 12, turnsPerDay: 60 }), { kind: 'limited', used: 12, limit: 60, left: 48 });
  assert.equal((quotaOf({ turnsToday: 61, turnsPerDay: 60 }) as { left: number }).left, 0);
});

test('the daily count resets at the next UTC midnight', () => {
  assert.equal(nextResetMs(Date.UTC(2026, 10, 1, 15, 30)), Date.UTC(2026, 10, 2));
  assert.equal(nextResetMs(Date.UTC(2026, 11, 31, 23, 59)), Date.UTC(2027, 0, 1));
});

test('shortName prefers the name, then the part of the address before the @', () => {
  assert.equal(shortName({ name: 'Mina Park', email: 'mina@example.com' }), 'Mina Park');
  assert.equal(shortName({ name: '', email: 'mina@example.com' }), 'mina');
});

test('loginUrl returns to this page and never to another site', () => {
  assert.equal(loginUrl('/'), '/login');
  assert.equal(loginUrl('/?lang=ko'), '/login?next=%2F%3Flang%3Dko');
  assert.equal(loginUrl('//evil.example'), '/login');
  assert.equal(loginUrl('/\\evil.example'), '/login');
  assert.equal(loginUrl('https://evil.example'), '/login');
});

test('only the session codes leave the page', () => {
  assert.equal(authHandoff('signed-out'), 'login');
  assert.equal(authHandoff('http-401'), 'login');
  assert.equal(authHandoff('not-approved'), 'pending');
  for (const c of ['quota-exceeded', 'user-busy', 'rate-limited', 'http-403', 'http-429', 'network', 'whatever', '']) assert.equal(authHandoff(c), null, c);
});

test('probeHealth tells the anonymous { ok: true } of the hosted Worker from a missing server', async () => {
  const f = (b: unknown, status = 200) => ((async () => json(b, status)) as typeof fetch);
  assert.deepEqual(await probeHealth({ fetchImpl: f({ ok: true }) }), { health: null, anonymous: true });
  assert.deepEqual(await probeHealth({ fetchImpl: f({ ok: true, other: 1 }) }), { health: null, anonymous: false });
  assert.deepEqual(await probeHealth({ fetchImpl: f({ error: 'x' }, 500) }), { health: null, anonymous: false });
  assert.deepEqual(await probeHealth({ fetchImpl: (async () => Promise.reject(new TypeError('fetch failed'))) as typeof fetch }), { health: null, anonymous: false });
});
