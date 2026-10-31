import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createController } from './controller.ts';
import type { ControllerEnv } from './controller.ts';
import { createSessionStore } from '../store/sessions.ts';
import type { KeyValueStorage } from '../store/sessions.ts';
import { loadFixtureFile, newStore } from '../test/fixtures.ts';
import type { Fixture } from '../replay/plan.ts';

const enc = new TextEncoder();
const HEALTH = { ok: true, model: 'qwen3.8-max', endpoint: 'dashscope-intl.aliyuncs.com', catalog: { version: '2026-10-31', entries: 223 }, keyConfigured: true, inFlight: 0, maxInFlight: 4, limits: { askChars: 50, turns: 200, nodes: 150, requirements: 40, bodyBytes: 1 }, uptimeS: 1 };

function memStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** Streams a fixture turn as NDJSON in small chunks, like the server does. */
function turnResponse(fx: Fixture, turn = 0, upTo = Infinity): Response {
  const lines = fx.turns[turn].ev.slice(0, upTo).map(([, e]) => JSON.stringify(e) + '\n').join('');
  const bytes = enc.encode(lines);
  let i = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(ctl) {
        await new Promise((r) => setImmediate(r));
        if (i >= bytes.length) return ctl.close();
        ctl.enqueue(bytes.slice(i, i + 700));
        i += 700;
      },
    }),
  );
}

function setup(o: { health?: unknown; turn?: () => Response | Promise<Response>; sessions?: ReturnType<typeof createSessionStore>; resumeId?: string | null } = {}) {
  const store = newStore();
  const timers = new Map<number, () => void>();
  let n = 0;
  const sessions = o.sessions ?? createSessionStore(memStorage());
  const requests: Array<{ url: string; body?: unknown }> = [];
  const env: ControllerEnv = {
    sessions,
    now: () => Date.now(),
    setTimeout: (fn) => {
      timers.set(++n, fn);
      return n;
    },
    clearTimeout: (h) => void timers.delete(h as number),
    newId: () => `id-${++n}`,
    loadFixture: async (id) => {
      try {
        return loadFixtureFile(id);
      } catch {
        return null;
      }
    },
    search: '',
    setLanguage: () => undefined,
    resumeId: o.resumeId,
    fetchImpl: (async (url: string, init?: RequestInit) => {
      requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (String(url).endsWith('/api/health')) return o.health === null ? Promise.reject(new TypeError('fetch failed')) : new Response(JSON.stringify(o.health ?? HEALTH));
      return o.turn ? o.turn() : turnResponse(loadFixtureFile('ha'));
    }) as typeof fetch,
  };
  const c = createController(store, env);
  const flushTimers = (): void => {
    for (const [k, fn] of [...timers]) {
      timers.delete(k);
      fn();
    }
  };
  return { store, c, sessions, requests, flushTimers };
}

async function until(f: () => boolean, ms = 3000): Promise<void> {
  const t0 = Date.now();
  while (!f()) {
    if (Date.now() - t0 > ms) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

test('boot checks health: live when the key is set, offline when the server is unreachable', async () => {
  const a = setup();
  await a.c.boot();
  assert.equal(a.store.getState().conn.mode, 'live');
  assert.equal(a.store.getState().conn.health?.limits.askChars, 50);
  const b = setup({ health: null });
  await b.c.boot();
  assert.equal(b.store.getState().conn.mode, 'offline');
  const c = setup({ health: { ...HEALTH, keyConfigured: false } });
  await c.c.boot();
  assert.equal(c.store.getState().conn.mode, 'offline', 'no key counts as offline');
});

test('submit streams the reply into the store, commits, and saves the session', async () => {
  const t = setup();
  await t.c.boot();
  assert.equal(t.c.submit('  '), 'empty');
  assert.equal(t.c.submit('x'.repeat(51)), 'too-long', 'the ask limit comes from /api/health');
  assert.equal(t.c.submit('We run an online store in Southeast Asia'), 'started');
  assert.equal(t.store.getState().view, 'working');
  assert.equal(t.store.getState().ui.handoff, true);
  assert.equal(t.c.submit('again'), 'busy');
  await until(() => t.store.getState().session.revisions[0]?.status === 'done');
  t.flushTimers();
  const s = t.store.getState();
  assert.equal(s.work, null);
  assert.ok(s.display.layout);
  assert.equal(t.sessions.list().length, 1, 'saved after the commit');
  assert.equal(t.sessions.list()[0].title, 'We run an online store in Southeast Asia');
  const post = t.requests.find((r) => r.url === '/api/turn')!.body as { sessionId: string; ask: string; memory: { requirements: unknown[] } };
  assert.equal(post.ask, 'We run an online store in Southeast Asia');
  assert.equal(post.sessionId, s.session.id);
  // the follow-up sends the memory the server committed
  assert.equal(t.c.submit('oh i also want waf'), 'started');
  await until(() => t.store.getState().session.revisions[1]?.status === 'done');
  const post2 = t.requests.filter((r) => r.url === '/api/turn')[1].body as { memory: { graph: { nodes: object } } };
  assert.ok(Object.keys(post2.memory.graph.nodes).length > 5);
});

test('on the landing, an unreachable service keeps the text and reports offline; in the working view it tries anyway', async () => {
  const t = setup({ health: null });
  await t.c.boot();
  assert.equal(t.c.submit('hello'), 'offline');
  assert.equal(t.store.getState().view, 'landing');
});

test('a dropped stream becomes a recoverable error, and Try again sends the same ask', async () => {
  let calls = 0;
  const t = setup({ turn: () => (calls++ === 0 ? turnResponse(loadFixtureFile('ha'), 0, 12) : turnResponse(loadFixtureFile('ha'))) });
  await t.c.boot();
  t.c.submit('We run an online store');
  await until(() => t.store.getState().session.revisions[0]?.status === 'failed');
  const rev = t.store.getState().session.revisions[0];
  assert.equal(rev.error?.code, 'network');
  assert.equal(rev.error?.client, true);
  assert.equal(t.store.getState().turn.phase, 'error');
  t.c.retry();
  await until(() => t.store.getState().session.revisions[0]?.status === 'done');
  assert.equal(t.store.getState().session.revisions.length, 1);
  assert.equal(t.store.getState().session.revisions[0].ask, 'We run an online store');
});

test('Stop aborts the request and returns to the committed graph; Edit and resend puts the ask back', async () => {
  const t = setup({ turn: () => new Response(new ReadableStream<Uint8Array>({ start() {} })) });
  await t.c.boot();
  t.c.submit('Design something');
  assert.equal(t.store.getState().turn.phase, 'waiting');
  t.c.stop();
  const s = t.store.getState();
  assert.equal(s.session.revisions[0].status, 'stopped');
  assert.equal(s.work, null);
  t.c.editAndResend();
  assert.equal(t.store.getState().session.revisions.length, 0);
  assert.equal(t.store.getState().ui.composerDraft?.text, 'Design something');
});

test('replay plays a recorded conversation through the same path, read-only, and leaves cleanly', async () => {
  const t = setup({ health: null });
  await t.c.boot();
  assert.equal(await t.c.startReplay('ha', { speed: 'instant' }), true);
  const s = t.store.getState();
  assert.equal(s.view, 'working');
  assert.equal(s.replay?.fixtureId, 'ha');
  assert.equal(s.conn.mode, 'replay');
  assert.equal(s.session.revisions[0].status, 'done');
  assert.equal(t.c.submit('anything'), 'read-only');
  assert.equal(t.sessions.list().length, 0, 'a replay is never saved');
  assert.equal(await t.c.startReplay('no-such-fixture'), false);
  t.c.exitReplay();
  const after = t.store.getState();
  assert.equal(after.view, 'landing');
  assert.equal(after.replay, null);
  assert.equal(after.conn.mode, 'offline');
});

test('new session and open session switch cleanly; opening restores the record', async () => {
  const t = setup();
  await t.c.boot();
  t.c.submit('We run an online store');
  await until(() => t.store.getState().session.revisions[0]?.status === 'done');
  const id = t.store.getState().session.id;
  t.c.newSession();
  assert.equal(t.store.getState().view, 'landing');
  assert.notEqual(t.store.getState().session.id, id);
  assert.equal(t.store.getState().sessions.length, 1);
  t.c.openSession(id);
  const s = t.store.getState();
  assert.equal(s.view, 'working');
  assert.equal(s.session.revisions[0].status, 'done');
  assert.equal(s.ui.toast?.kind, 'restored');
  assert.ok(s.display.layout);
});

test('a refresh reopens the session the tab was showing; a new tab, an unsaved id and a replay start on the landing', async () => {
  const a = setup();
  await a.c.boot();
  a.c.submit('We run an online store');
  await until(() => a.store.getState().session.revisions[0]?.status === 'done');
  const id = a.store.getState().session.id;
  assert.ok(a.sessions.get(id), 'the commit saved the session');
  const back = setup({ sessions: a.sessions, resumeId: id });
  await back.c.boot();
  const s = back.store.getState();
  assert.equal(s.view, 'working');
  assert.equal(s.session.id, id);
  assert.equal(s.session.revisions.length, 1);
  assert.equal(s.ui.toast?.kind, 'restored');
  for (const resumeId of [null, undefined, 'never-saved']) {
    const fresh = setup({ sessions: a.sessions, resumeId });
    await fresh.c.boot();
    assert.equal(fresh.store.getState().view, 'landing');
  }
});
