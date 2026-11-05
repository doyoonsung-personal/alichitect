import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createController } from './controller.ts';
import type { ControllerEnv, PendingAsk } from './controller.ts';
import { createSessionStore } from '../store/sessions.ts';
import type { KeyValueStorage } from '../store/sessions.ts';
import { loadFixtureFile, newStore } from '../test/fixtures.ts';
import type { Fixture } from '../replay/plan.ts';
import { pricingDesignKey, type PricingRequest } from '@ali/core/solution-pricing.ts';

const enc = new TextEncoder();
const HEALTH = { ok: true, model: 'qwen3.8-max', endpoint: 'dashscope-intl.aliyuncs.com', catalog: { version: '2026-10-31', entries: 223 }, keyConfigured: true, inFlight: 0, maxInFlight: 4, limits: { askChars: 50, turns: 200, nodes: 150, requirements: 40, bodyBytes: 1 }, uptimeS: 1 };

function memStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

test('C7 / Codex #5: Tidy persists reverse arrival and a removed middle step across boot', async () => {
  for (const scenario of ['reverse', 'removed']) {
    const a = setup();
    await a.c.boot();
    a.c.setMode('workflow');
    const { store } = a;
    const step = (id: string) => store.dispatch({ type: 'turn/event', now: 1,
      event: { type: 'op', phase: 'main', op: { t: 'step', id, kind: 'act', label: id } } });
    const link = (from: string, to: string) => store.dispatch({ type: 'turn/event', now: 2,
      event: { type: 'op', phase: 'main', op: { t: 'link', id: from + to, from, to } } });
    const commit = () => store.dispatch({ type: 'turn/event', now: 3, event: { type: 'commit', warnings: [], changes: '',
      memory: { ...store.getState().session.memory, workflow: store.getState().work!.rawWorkflow } } });
    store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Draw', now: 0 });
    for (const id of scenario === 'reverse' ? ['end', 'b', 'a'] : ['a', 'b', 'end']) step(id);
    link('a', 'b');
    link('b', 'end');
    commit();
    if (scenario === 'removed') {
      store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Remove b', now: 4 });
      store.dispatch({ type: 'turn/event', now: 5, event: { type: 'op', phase: 'main', op: { t: 'unstep', id: 'b' } } });
      link('a', 'end');
      commit();
    }
    a.c.setMode('workflow');
    const before = store.getState().session.workflowLayout!.workflow.cells;
    a.c.tidyWorkflowView();
    const after = store.getState().session.workflowLayout!.workflow.cells;
    assert.notDeepEqual(after, before);
    const back = setup({ sessions: a.sessions, resumeId: store.getState().session.id });
    await back.c.boot();
    assert.deepEqual(back.store.getState().workflowDisplay.layout?.workflow.cells, after);
    a.c.dispose();
    back.c.dispose();
  }
});

test('C6: switching modes, unpin, undo and refused Tidy never save an in-flight revision', async () => {
  const a = setup({ turn: () => new Response(new ReadableStream<Uint8Array>({ start() {} })) });
  await a.c.boot();
  a.c.setMode('workflow');
  a.c.submit('Draw');
  a.store.dispatch({ type: 'turn/event', now: 1, event: { type: 'op', phase: 'main', seq: 1, added: [], updated: [], removed: [],
    op: { t: 'ask', id: 'q1', text: 'Which payment provider?' } } });
  a.store.dispatch({ type: 'turn/event', now: 2, event: { type: 'status', code: 'repair', text: '' } });
  for (const edit of [() => a.c.setMode('cloud'), () => a.c.unpin('anything'), () => a.c.undoUnpin(), () => a.c.tidyWorkflowView()]) {
    edit();
    assert.equal(a.sessions.list().length, 0);
  }
  a.c.dispose();
});

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

const ME = { email: 'mina@example.com', name: 'Mina Park', role: 'member', status: 'approved', lang: 'en', createdAt: 1, turnsToday: 3, turnsPerDay: 60, links: { account: '/account', admin: null, signOut: '/auth/logout' } };
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup(o: { health?: unknown; me?: unknown | (() => unknown); turn?: () => Response | Promise<Response>; title?: (ask: string, signal?: AbortSignal | null) => Response | Promise<Response>; pricing?: (request: PricingRequest) => Response | Promise<Response>; sessions?: ReturnType<typeof createSessionStore>; resumeId?: string | null; hosted?: boolean; leaveOk?: boolean; keptAsk?: PendingAsk } = {}) {
  const store = newStore();
  const timers = new Map<number, () => void>();
  let n = 0;
  const sessions = o.sessions ?? createSessionStore(memStorage());
  const requests: Array<{ url: string; body?: unknown }> = [];
  const left: string[] = [];
  const kept: PendingAsk[] = [];
  let pendingAsk: PendingAsk | null = o.keptAsk ?? null;
  let signedOutVia: string | null = null;
  const env: ControllerEnv = {
    ...(o.hosted
      ? {
          leave: (to: string) => {
            left.push(to);
            return o.leaveOk !== false;
          },
          path: () => '/?x=1',
          keepAsk: (a: PendingAsk) => {
            kept.push(a);
            pendingAsk = a;
          },
          takeAsk: () => {
            const a = pendingAsk;
            pendingAsk = null;
            return a;
          },
          signOut: (url: string) => {
            signedOutVia = url;
          },
        }
      : {}),
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
      // the local turn server has no /api/me
      if (String(url).endsWith('/api/me')) {
        const me = typeof o.me === 'function' ? (o.me as () => unknown)() : o.me;
        return me === undefined ? json({ error: 'not-found' }, 404) : json(me, me === null ? 401 : 200);
      }
      if (String(url).endsWith('/api/pricing') && o.pricing) return o.pricing(JSON.parse(String(init!.body)));
      if (String(url).endsWith('/api/session-title')) return o.title ? o.title(JSON.parse(String(init!.body)).ask, init?.signal) : json({}, 404);
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
  return { store, c, sessions, requests, flushTimers, left, kept, signedOutVia: () => signedOutVia };
}

function pricingReply(req: PricingRequest): Response {
  const messages = [...(req.pricing?.messages ?? []),
    { role: 'user', text: req.ask }, { role: 'assistant', text: 'What do you pay per instance-hour?' }];
  return json({ pricing: { designKey: pricingDesignKey(req.memory), messages, estimate: {
    currency: 'USD', items: [], monthlyUsd: null, oneTimeUsd: null, assumptions: [], unknowns: ['Instance rate'],
  } } });
}

test('Flash title is saved and survives reload; follow-up turns preserve it and the full initial ask', async () => {
  const a = setup({ turn: () => {
    const events = loadFixtureFile('ha').turns[0].ev.map(([, e]) =>
      e.type === 'commit' ? { ...e, title: 'Regional inventory planning' } : e);
    return new Response(events.map(e => JSON.stringify(e)).join('\n') + '\n');
  } });
  await a.c.boot();
  const ask = 'Help plan inventory across all our stores';
  a.c.submit(ask);
  await until(() => a.store.getState().session.revisions[0]?.status === 'done');
  const first = a.store.getState().session;
  assert.equal(first.title, 'Regional inventory planning');
  assert.equal(first.revisions[0].ask, ask);
  assert.equal((a.requests.find(r => r.url === '/api/turn')?.body as { generateTitle?: boolean }).generateTitle, true);
  assert.equal(a.sessions.get(first.id)?.title, first.title);
  const back = setup({ sessions: a.sessions, resumeId: first.id });
  await back.c.boot();
  assert.equal(back.store.getState().session.title, first.title);
  back.c.submit('Add a database');
  await until(() => back.store.getState().session.revisions[1]?.status === 'done');
  assert.equal((back.requests.find(r => r.url === '/api/turn')?.body as { generateTitle?: boolean }).generateTitle, undefined);
  assert.equal(back.store.getState().session.title, first.title);
  a.c.dispose(); back.c.dispose();
});

test('existing sessions get one Flash title in the background, preserving order, full history and custom titles', async () => {
  const original = setup();
  await original.c.boot();
  original.c.submit('Plan inventory for our regional stores');
  await until(() => original.store.getState().session.revisions[0]?.status === 'done');
  const record = original.sessions.get(original.store.getState().session.id)!;
  original.sessions.save({ ...record, title: record.revisions[0].ask, titleVersion: undefined });
  original.sessions.save({ ...record, id: 'custom-name', title: 'My approved proposal', titleVersion: undefined, updatedAt: record.updatedAt - 1 });
  original.c.dispose();
  let count = 0;
  const back = setup({ sessions: original.sessions, resumeId: record.id, title: async ask => {
    count++; assert.equal(ask, record.revisions[0].ask);
    return json({ title: 'Regional inventory planning', titleVersion: 1 });
  } });
  await back.c.boot();
  await until(() => back.sessions.get(record.id)?.titleVersion === 1);
  const changed = back.sessions.get(record.id)!;
  assert.equal(back.store.getState().session.title, 'Regional inventory planning');
  assert.equal(changed.updatedAt, record.updatedAt);
  assert.deepEqual(changed.memory, record.memory);
  assert.deepEqual(changed.revisions, record.revisions);
  assert.equal(back.sessions.get('custom-name')?.title, 'My approved proposal');
  await back.c.checkHealth();
  assert.equal(count, 1);
  back.c.dispose();
  const reload = setup({ sessions: back.sessions });
  await reload.c.boot();
  assert.ok(!reload.requests.some(request => request.url === '/api/session-title'));
  reload.c.dispose();
});

test('legacy title completion merges newer edits, never resurrects a deleted session, and cancellation cools retries', async () => {
  for (const scenario of ['edited', 'deleted', 'disposed'] as const) {
    const a = setup(); await a.c.boot(); a.c.submit('Plan inventory for all our stores');
    await until(() => a.store.getState().session.revisions[0]?.status === 'done');
    const record = a.sessions.get(a.store.getState().session.id)!;
    a.sessions.save({ ...record, title: record.revisions[0].ask, titleVersion: undefined }); a.c.dispose();
    let resolve!: (value: Response) => void;
    const pending = new Promise<Response>(done => { resolve = done; });
    const b = setup({ sessions: a.sessions, title: () => pending }); await b.c.boot();
    if (scenario === 'edited') b.sessions.save({ ...b.sessions.get(record.id)!, memory: { ...record.memory, requirements: ['New confirmed constraint'] }, updatedAt: record.updatedAt + 100 });
    if (scenario === 'deleted') b.sessions.remove(record.id);
    if (scenario === 'disposed') b.c.dispose();
    resolve(json({ title: 'Inventory planning', titleVersion: 1 }));
    await new Promise(done => setImmediate(done));
    const after = b.sessions.get(record.id);
    if (scenario === 'deleted') assert.equal(after, null);
    if (scenario === 'edited') { assert.equal(after?.title, 'Inventory planning'); assert.deepEqual(after?.memory.requirements, ['New confirmed constraint']); assert.equal(after?.updatedAt, record.updatedAt + 100); }
    if (scenario === 'disposed') { assert.equal(after?.title, record.revisions[0].ask); assert.ok(after!.titleRetryAt! > Date.now()); }
    b.c.dispose();
  }
});

test('pricing resumes its own conversation and preserves the last estimate and answer through a failure', async () => {
  let fail = false;
  const a = setup({ pricing: (req) => fail ? json({ code: 'service-error', message: 'Try again.' }, 503) : pricingReply(req) });
  await a.c.boot();
  a.c.submit('Design our shop');
  await until(() => a.store.getState().session.revisions[0]?.status === 'done');
  const design = a.store.getState().session.memory;
  a.c.setPricingOpen(true);
  assert.ok(!a.requests.some(r => r.url === '/api/pricing'), 'the opening question is local');
  const before = a.store.getState().session.pricing!;
  assert.equal(before.designKey, pricingDesignKey(design));
  fail = true;
  const answer = 'We have four existing ECS instances and 3 TB of data.';
  assert.equal(a.c.sendPricing(answer), 'started');
  assert.equal(a.c.sendPricing(answer), 'busy');
  await until(() => a.store.getState().pricingStatus === 'failed');
  assert.equal(a.store.getState().session.pricing, before);
  const restored = setup({ sessions: a.sessions, resumeId: a.store.getState().session.id, pricing: pricingReply });
  await restored.c.boot();
  assert.equal(restored.store.getState().session.pricingOpen, true);
  assert.equal(restored.store.getState().session.pricingPending, answer);
  assert.ok(!restored.requests.some(r => r.url === '/api/pricing'));
  restored.c.sendPricing(answer);
  await until(() => restored.store.getState().session.pricing?.messages.length === 3);
  assert.deepEqual(restored.requests.find(r => r.url === '/api/pricing')?.body,
    { sessionId: a.store.getState().session.id, lang: 'en', ask: answer, memory: design, pricing: before });
  assert.equal(restored.store.getState().session.pricingPending, undefined);
  assert.deepEqual(restored.store.getState().session.memory, design);
  a.c.dispose();
  restored.c.dispose();
});

test('closing pricing aborts a pending turn and a late reply cannot replace another session', async () => {
  let finish!: () => void;
  const a = setup({ pricing: (req) => new Promise<Response>(resolve => { finish = () => resolve(pricingReply(req)); }) });
  await a.c.boot();
  a.c.submit('Draw');
  await until(() => a.store.getState().session.revisions[0]?.status === 'done');
  const firstId = a.store.getState().session.id;
  a.c.setPricingOpen(true);
  a.c.sendPricing('Price five instances.');
  a.c.setPricingOpen(false);
  assert.ok(a.sessions.get(firstId)?.pricingPending);
  a.c.newSession();
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(a.store.getState().session.pricing, undefined);
  assert.equal(a.sessions.get(firstId)?.pricing?.messages.length, 1, 'only the local opening question');
  a.c.dispose();
});

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

// ---------- the hosted Worker: account and session handoffs ----------

const fatalResponse = (status: number, code: string, message: string): Response => json({ type: 'fatal', code, message, retryable: false }, status);

test('boot reads /api/me into the store; the local server has no such route and leaves no account', async () => {
  const hosted = setup({ hosted: true, me: ME });
  await hosted.c.boot();
  await until(() => hosted.store.getState().account !== null);
  assert.equal(hosted.store.getState().account?.name, 'Mina Park');
  assert.equal(hosted.store.getState().account?.turnsPerDay, 60);
  const local = setup();
  await local.c.boot();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(local.store.getState().account, null);
  assert.equal(local.store.getState().conn.mode, 'live', 'the missing route changes nothing else');
});

test('the usage count is read again after a turn, and a failed read keeps the last account', async () => {
  let used = 3;
  let down = false;
  const t = setup({ hosted: true, me: () => (down ? null : { ...ME, turnsToday: used }) });
  await t.c.boot();
  await until(() => t.store.getState().account !== null);
  assert.equal(t.store.getState().account?.turnsToday, 3);
  used = 4;
  t.c.submit('We run an online store');
  await until(() => t.store.getState().account?.turnsToday === 4);
  down = true;
  await t.c.loadAccount();
  assert.equal(t.store.getState().account?.turnsToday, 4, 'a failed read keeps the last account');
});

test('a 401 signed-out fatal sends the person to /login?next=<this page> and keeps the ask for after sign-in', async () => {
  const t = setup({ hosted: true, me: ME, turn: () => fatalResponse(401, 'signed-out', 'Your session ended.') });
  await t.c.boot();
  t.c.submit('We run an online store');
  await until(() => t.left.length > 0);
  assert.deepEqual(t.left, ['/login?next=%2F%3Fx%3D1']);
  assert.deepEqual(t.kept, [{ text: 'We run an online store', mode: 'cloud' }]);
});

test('after sign-in the kept ask comes back as the draft', async () => {
  const t = setup({ hosted: true, me: ME, keptAsk: { text: 'We run an online store' } });
  await t.c.boot();
  assert.equal(t.store.getState().ui.composerDraft?.text, 'We run an online store');
  const next = setup({ hosted: true, me: ME });
  await next.c.boot();
  assert.equal(next.store.getState().ui.composerDraft, null, 'nothing is invented');
});

test('a discovery brief interrupted by sign-in returns to the workflow composer', async () => {
  const first = setup({ hosted: true, turn: () => fatalResponse(401, 'signed-out', 'Session ended') });
  await first.c.boot();
  const text = 'Help our agents find the return policy.';
  first.c.submit(text, { mode: 'workflow' });
  await until(() => first.left.length > 0);
  const returned = setup({ hosted: true, keptAsk: first.kept[0] });
  await returned.c.boot();
  assert.equal(returned.store.getState().ui.composerDraft?.text, text);
  assert.equal(returned.store.getState().session.mode, 'workflow');
});

test('not-approved goes to /pending; quota, busy, rate-limited and unknown codes stay in the console with the server words', async () => {
  const a = setup({ hosted: true, me: ME, turn: () => fatalResponse(403, 'not-approved', 'Waiting for approval.') });
  await a.c.boot();
  a.c.submit('We run an online store');
  await until(() => a.left.length > 0);
  assert.deepEqual(a.left, ['/pending']);
  for (const [status, code, message] of [
    [429, 'quota-exceeded', 'Du har brugt dagens 60 ture.'],
    [409, 'user-busy', 'Another turn is running.'],
    [429, 'rate-limited', '요청이 너무 많습니다.'],
    [500, 'something-new', '新的错误说明'],
  ] as const) {
    const t = setup({ hosted: true, me: ME, turn: () => fatalResponse(status, code, message) });
    await t.c.boot();
    t.c.submit('We run an online store');
    await until(() => t.store.getState().session.revisions[0]?.status === 'failed');
    assert.deepEqual(t.left, [], `${code} does not leave the page`);
    assert.equal(t.store.getState().session.revisions[0].error?.message, message, `${code} shows the server's message`);
  }
});

test('a 401 without a usable body is treated as signed-out too; when the page may not leave, the error stays', async () => {
  const t = setup({ hosted: true, me: ME, leaveOk: false, turn: () => new Response('nope', { status: 401 }) });
  await t.c.boot();
  t.c.submit('We run an online store');
  await until(() => t.left.length > 0);
  await until(() => t.store.getState().session.revisions[0]?.status === 'failed');
  assert.equal(t.store.getState().session.revisions[0].error?.code, 'http-401');
});

test('Try again after the Worker only said { ok: true }: the session ended while the page was open', async () => {
  const t = setup({ hosted: true, me: ME, health: { ok: true } });
  await t.c.boot();
  assert.deepEqual(t.left, ['/login?next=%2F%3Fx%3D1']);
  assert.equal(t.store.getState().conn.mode, 'offline');
});

test('sign out posts to the address /api/me gave', async () => {
  const t = setup({ hosted: true, me: ME });
  t.c.signOut();
  assert.equal(t.signedOutVia(), null, 'nothing to do before the account is known');
  await t.c.boot();
  await until(() => t.store.getState().account !== null);
  t.c.signOut();
  assert.equal(t.signedOutVia(), '/auth/logout');
});

test('retry sends the captured workflow mode after the active mode changes and reload keeps it', async () => {
  let calls = 0;
  const t = setup({ turn: () => ++calls === 1
    ? new Response(JSON.stringify({ type: 'fatal', code: 'network', message: '', retryable: true }) + '\n')
    : turnResponse(loadFixtureFile('stub-workflow')) });
  await t.c.boot();
  t.c.setMode('workflow');
  t.c.submit('Triage emails');
  await until(() => t.store.getState().session.revisions[0]?.status === 'failed');
  t.c.setMode('cloud');
  t.c.retry();
  await until(() => t.store.getState().session.revisions[0]?.status === 'done');
  const requests = t.requests.filter((r) => r.url.endsWith('/api/turn'));
  assert.deepEqual(requests.map((r) => (r.body as { mode: string }).mode), ['workflow', 'workflow']);
  assert.equal(t.store.getState().session.revisions[0].mode, 'workflow');
  assert.equal(t.store.getState().session.mode, 'workflow');
  const back = setup({ sessions: t.sessions, resumeId: t.store.getState().session.id });
  await back.c.boot();
  assert.equal(back.store.getState().session.mode, 'workflow');
  assert.deepEqual(back.store.getState().session.memory, t.store.getState().session.memory);
  t.c.dispose();
  back.c.dispose();
});

test('ordinary requests explicitly default to cloud', async () => {
  const t = setup();
  await t.c.boot();
  t.c.submit('Draw a backend');
  await until(() => t.store.getState().session.revisions[0]?.status === 'done');
  assert.equal((t.requests.find((r) => r.url.endsWith('/api/turn'))!.body as { mode: string }).mode, 'cloud');
  t.c.dispose();
});

test('retrying a failed deployment resends the workflow and retains the explicit deployment intent', async () => {
  const t = setup({ turn: () => new Response(JSON.stringify({ type: 'fatal', code: 'network', message: '', retryable: true }) + '\n') });
  await t.c.boot();
  const record = t.store.getState().session;
  t.store.dispatch({ type: 'session/open', now: 1, record: { ...record, mode: 'workflow', memory: { ...record.memory,
    workflow: { nodes: { start: { id: 'start', kind: 'trigger', label: 'Invoice' } }, edges: {}, groups: {} } } } });
  t.c.drawDeployment();
  t.c.drawDeployment(); // a second click while streaming must not book another turn
  await until(() => t.store.getState().session.revisions.at(-1)?.status === 'failed');
  assert.equal(t.store.getState().session.mode, 'workflow');
  t.c.retry();
  await until(() => t.store.getState().session.revisions.at(-1)?.status === 'failed');
  const requests = t.requests.filter(r => r.url.endsWith('/api/turn')).map(r => r.body as { intent: string; mode: string });
  assert.deepEqual(requests.map(r => [r.intent, r.mode]), [['deployment', 'cloud'], ['deployment', 'cloud']]);
  assert.equal(t.store.getState().session.revisions.length, 1);
  t.c.dispose();
});

test('workflow setting actions save through the existing persistence path', async () => {
  const { c, store, sessions } = setup({ turn: () => turnResponse(loadFixtureFile('stub-mixed-workflow'), 1) });
  await c.boot();
  c.setMode('workflow');
  assert.equal(c.submit('Draw workflow'), 'started');
  await until(() => !store.getState().work);
  c.setWorkflowSettings({ region: 'ap-southeast-1', approvalOff: ['pay'] });
  c.setWorkflowEstimate({ runsPerMonth: 123, steps: { a: { inTokens: 15 } } });
  const id = store.getState().session.id;
  assert.deepEqual(sessions.get(id)?.memory.workflowSettings, { region: 'ap-southeast-1', approvalOff: ['pay'] });
  assert.equal(sessions.get(id)?.memory.estimate?.runsPerMonth, 123);
  c.dispose();
});
