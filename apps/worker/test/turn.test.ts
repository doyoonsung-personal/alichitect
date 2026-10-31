// POST /api/turn on the Worker with a fake upstream: the NDJSON stream (say, op, commit), usage recorded and the slot
// released, quotas (per user per UTC day; admins unlimited), one turn in flight per user, request validation, abort
// on client disconnect, key redaction and a metadata-only log.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTurn, makeRedactor, sharedTurnState } from '../src/turn.ts';
import * as db from '../src/db.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { SessionMemory } from '../../../packages/core/src/types.ts';
import { API_KEY, ADMIN, makeCtx, makeEnv, ndjson, signIn } from './helpers.ts';
import type { D1PreparedStatement, Env } from '../src/env.ts';

const line = (o: unknown): string => JSON.stringify(o);
const sseEv = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
const USAGE = { prompt_tokens: 12000, completion_tokens: 400, prompt_tokens_details: { cached_tokens: 11500 } };

function sseText(content: string, step = 25): string {
  let s = sseEv({ choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] });
  for (let i = 0; i < content.length; i += step) s += sseEv({ choices: [{ index: 0, delta: { content: content.slice(i, i + step) } }] });
  return s + sseEv({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + sseEv({ choices: [], usage: USAGE }) + 'data: [DONE]\n\n';
}

const abortError = (): Error => Object.assign(new Error('aborted'), { name: 'AbortError' });

interface UpCall {
  body: Record<string, unknown>;
  auth: string;
  signal: AbortSignal;
}

/** A fake Model Studio: each call is answered by the next handler. */
function upstream(handlers: Array<(c: UpCall) => Response | Promise<Response>>): { fetchImpl: typeof fetch; calls: UpCall[] } {
  const calls: UpCall[] = [];
  const fetchImpl = (async (_u: string | URL | Request, init?: RequestInit) => {
    const c: UpCall = { body: JSON.parse(String(init!.body)) as Record<string, unknown>, auth: String((init!.headers as Record<string, string>).Authorization), signal: init!.signal! };
    calls.push(c);
    const h = handlers.shift();
    if (!h) throw new Error('fake upstream: no handler queued');
    return h(c);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function streamed(c: UpCall, text: string, o: { hangAt?: number } = {}): Response {
  const bytes = new TextEncoder().encode(text);
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(ctl) {
      c.signal.addEventListener('abort', () => {
        try {
          ctl.error(abortError());
        } catch {
          /* closed */
        }
      });
    },
    async pull(ctl) {
      if (o.hangAt !== undefined && i >= o.hangAt) return new Promise<void>(() => undefined);
      if (i >= bytes.length) return ctl.close();
      const end = Math.min(bytes.length, i + 64, o.hangAt ?? Infinity);
      ctl.enqueue(bytes.slice(i, end));
      i = end;
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const DIAGRAM = [
  line({ t: 'say', text: 'A small API with a database, kept in Singapore.' }),
  line({ t: 'group', id: 'sg', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null }),
  line({ t: 'group', id: 'vpc', kind: 'vpc', label: 'App VPC', parent: 'sg' }),
  line({ t: 'node', id: 'app', product: 'sae', label: 'API', group: 'vpc', why: 'Runs the API.' }),
  line({ t: 'node', id: 'db', product: 'rds', label: 'Orders DB', group: 'vpc', zones: ['a', 'b'], why: 'Stores orders.' }),
  line({ t: 'edge', id: 'e-app-db', from: 'app', to: 'db', label: 'SQL' }),
  line({ t: 'done', summary: 'API on SAE with RDS.' }),
].join('\n');

const OPTS = { firstByteTimeoutMs: 2000, idleTimeoutMs: 2000, totalTimeoutMs: 5000, retries: 0, backoffMs: 1 } as Record<string, unknown>;

const body = (ask: string, memory: SessionMemory = createMemory()): string => JSON.stringify({ sessionId: 'sess_1', ask, memory });

async function approved(env: Env, email = 'user@example.com'): Promise<db.UserRow> {
  return (await signIn(env, email, { status: 'approved' })).user;
}

const turnReq = (b: string, o: { type?: string; signal?: AbortSignal } = {}): Request =>
  new Request('https://architect.alikorea-demo.com/api/turn', { method: 'POST', headers: { 'Content-Type': o.type ?? 'application/json', Origin: 'https://architect.alikorea-demo.com' }, body: b, signal: o.signal });

describe('POST /api/turn streaming', () => {
  test('streams say and op lines, then commit; records usage and frees the slot', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const up = upstream([(c) => streamed(c, sseText(DIAGRAM))]);
    const logs: string[] = [];
    const ctx = makeCtx();
    const res = await handleTurn(turnReq(body('Design a small API with a database in Singapore')), env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: OPTS, log: (l) => logs.push(l) });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Type')!, /^application\/x-ndjson/);
    const events = await ndjson(res);
    await ctx.flush();
    const types = events.map((e) => e.type);
    assert.equal(types[0], 'say', 'narration first');
    assert.ok(types.includes('op'));
    assert.equal(types.at(-1), 'commit');
    const commit = events.at(-1) as { memory: SessionMemory };
    assert.deepEqual(Object.keys(commit.memory.graph.nodes).sort(), ['app', 'db']);
    assert.equal(up.calls[0].auth, `Bearer ${API_KEY}`, 'the key goes upstream in the header');
    assert.equal(await db.turnsToday(env.DB, user.id, Date.now()), 1);
    const usage = await env.DB.prepare('SELECT est_cost_usd FROM usage WHERE user_id = ?').bind(user.id).first<{ est_cost_usd: number }>();
    assert.ok((usage?.est_cost_usd ?? 0) > 0, 'cost estimate recorded');
    assert.equal(await env.DB.prepare('SELECT * FROM inflight').first(), null, 'slot released');
    const turnLog = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'turn')!;
    assert.equal(turnLog.outcome, 'commit');
    assert.ok(!logs.join('\n').includes('Design a small API'), 'the ask never reaches the log');
    assert.ok(!logs.join('\n').includes(API_KEY), 'nor the key');
  });

  test('usage is recorded before the slot is released, so the next turn cannot read a stale count', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const log: string[] = [];
    const orig = env.DB.prepare.bind(env.DB);
    env.DB.prepare = ((sql: string) => {
      const kind = /INSERT INTO usage/.test(sql) ? 'usage' : /DELETE FROM inflight/.test(sql) ? 'release' : null;
      const wrap = (st: D1PreparedStatement): D1PreparedStatement =>
        new Proxy(st, {
          get(t, k) {
            if (k === 'bind') return (...a: unknown[]) => wrap(t.bind(...a));
            if (k === 'run' && kind) {
              return async () => {
                log.push(`${kind}:start`);
                await new Promise((r) => setTimeout(r, 15)); // a real D1 round trip: concurrent calls interleave
                const out = await t.run();
                log.push(`${kind}:end`);
                return out;
              };
            }
            const v = (t as unknown as Record<string | symbol, unknown>)[k];
            return typeof v === 'function' ? v.bind(t) : v;
          },
        });
      return wrap(orig(sql));
    }) as typeof env.DB.prepare;
    const up = upstream([(c) => streamed(c, sseText(DIAGRAM))]);
    const ctx = makeCtx();
    const res = await handleTurn(turnReq(body('Design a small API with a database in Singapore')), env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: OPTS, log: () => undefined });
    await ndjson(res);
    await ctx.flush();
    assert.deepEqual(log, ['usage:start', 'usage:end', 'release:start', 'release:end']);
  });

  /** An upstream that keeps narrating, one say line every 20 ms, until it is aborted. */
  const endless = (c: UpCall): Response => {
    let n = 0;
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(ctl) {
        ctl.enqueue(enc.encode(sseEv({ choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] })));
        c.signal.addEventListener('abort', () => {
          try {
            ctl.error(abortError());
          } catch {
            /* closed */
          }
        });
      },
      async pull(ctl) {
        await new Promise((r) => setTimeout(r, 20));
        ctl.enqueue(enc.encode(sseEv({ choices: [{ index: 0, delta: { content: `${line({ t: 'say', text: `step ${n++}` })}\n` } }] })));
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const LONG = { ...OPTS, idleTimeoutMs: 60_000, totalTimeoutMs: 60_000 };

  test('when the browser goes away (the stream is cancelled), the upstream request is aborted and the slot freed', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const up = upstream([endless]);
    const ctx = makeCtx();
    const t0 = Date.now();
    const res = await handleTurn(turnReq(body('Design it')), env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: LONG, log: () => undefined });
    const reader = res.body!.getReader();
    await reader.read(); // the first line arrived: the turn is live
    await reader.cancel(); // the browser goes away
    await ctx.flush();
    assert.ok(Date.now() - t0 < 5000, 'stopped at once, not by a watchdog');
    assert.equal(up.calls[0].signal.aborted, true, 'upstream aborted');
    assert.equal(await env.DB.prepare('SELECT * FROM inflight').first(), null);
    assert.equal(await db.turnsToday(env.DB, user.id, Date.now()), 1, 'a started turn counts');
  });

  test('request.signal (enable_request_signal) aborts the upstream request too', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const up = upstream([endless]);
    const ctx = makeCtx();
    const ac = new AbortController();
    const t0 = Date.now();
    const r = turnReq(body('Design it'));
    // workerd hands the Worker a request whose signal aborts on disconnect; Node's Request only follows a signal through
    // a weak reference, so the test gives the request the runtime's signal directly
    Object.defineProperty(r, 'signal', { value: ac.signal });
    const res = await handleTurn(r, env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: LONG, log: () => undefined });
    const reader = res.body!.getReader();
    await reader.read();
    ac.abort(); // the runtime signals the disconnect; the response is never read again
    await ctx.flush();
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(up.calls[0].signal.aborted, true);
    assert.ok(r.signal.aborted);
  });

  test('the key is redacted from anything that would echo it', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const echo = [line({ t: 'say', text: `debug ${API_KEY} and ${API_KEY.slice(0, 12)}...` }), DIAGRAM].join('\n');
    const up = upstream([(c) => streamed(c, sseText(echo))]);
    const ctx = makeCtx();
    const res = await handleTurn(turnReq(body('x')), env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: OPTS, log: () => undefined });
    const text = await res.text();
    await ctx.flush();
    assert.ok(!text.includes(API_KEY.slice(0, 8)));
    assert.match(text, /\[redacted\]/);
    assert.equal(makeRedactor(API_KEY)(`a ${API_KEY} b`), 'a [redacted] b');
  });
});

describe('POST /api/turn limits', () => {
  test('the daily quota: the next turn is refused with 429 and a reset time; admins are unlimited', async () => {
    const env = makeEnv({ TURNS_PER_DAY: '2' });
    const user = await approved(env);
    const today = db.utcDay(Date.now());
    await db.recordUsage(env.DB, user.id, today, 0.01);
    await db.recordUsage(env.DB, user.id, today, 0.01);
    const res = await handleTurn(turnReq(body('one more')), env, makeCtx(), user, { log: () => undefined });
    assert.equal(res.status, 429);
    const ev = (await res.json()) as { type: string; code: string; message: string; retryable: boolean };
    assert.deepEqual([ev.type, ev.code, ev.retryable], ['fatal', 'quota-exceeded', true]);
    assert.match(ev.message, /today's 2 turns/);
    const ra = Number(res.headers.get('Retry-After'));
    assert.ok(ra > 0 && ra <= 86_400);

    const admin = (await signIn(env, ADMIN)).user;
    for (let i = 0; i < 3; i++) await db.recordUsage(env.DB, admin.id, today, 0.01);
    const up = upstream([(c) => streamed(c, sseText(DIAGRAM))]);
    const ctx = makeCtx();
    const ok = await handleTurn(turnReq(body('admin turn')), env, ctx, admin, { fetchImpl: up.fetchImpl, turnOptions: OPTS, log: () => undefined });
    assert.equal(ok.status, 200);
    await ok.text();
    await ctx.flush();
  });

  test('yesterday does not count against today', async () => {
    const env = makeEnv({ TURNS_PER_DAY: '1' });
    const user = await approved(env);
    await db.recordUsage(env.DB, user.id, db.utcDay(Date.now() - 86_400_000), 0);
    const up = upstream([(c) => streamed(c, sseText(DIAGRAM))]);
    const ctx = makeCtx();
    const res = await handleTurn(turnReq(body('x')), env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: OPTS, log: () => undefined });
    assert.equal(res.status, 200);
    await res.text();
    await ctx.flush();
  });

  test('one turn in flight per user: a second is 409 user-busy; a stale slot is taken over', async () => {
    const env = makeEnv();
    const user = await approved(env);
    assert.equal(await db.acquireTurnSlot(env.DB, user.id, 'other-request', Date.now(), 300_000), true);
    const res = await handleTurn(turnReq(body('x')), env, makeCtx(), user, { log: () => undefined });
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { code: string }).code, 'user-busy');
    await env.DB.prepare('UPDATE inflight SET started_at = ?').bind(Date.now() - 301_000 - 240_000).run();
    const up = upstream([(c) => streamed(c, sseText(DIAGRAM))]);
    const ctx = makeCtx();
    const ok = await handleTurn(turnReq(body('x')), env, ctx, user, { fetchImpl: up.fetchImpl, turnOptions: OPTS, log: () => undefined });
    assert.equal(ok.status, 200, 'the dead turn no longer blocks');
    await ok.text();
    await ctx.flush();
  });

  test('another user is not blocked by your turn', async () => {
    const env = makeEnv();
    const a = await approved(env, 'a@example.com');
    const b = await approved(env, 'b@example.com');
    await db.acquireTurnSlot(env.DB, a.id, 'busy', Date.now(), 300_000);
    assert.equal(await db.acquireTurnSlot(env.DB, b.id, 'mine', Date.now(), 300_000), true);
  });

  test('the same request checks as apps/server, in the same order', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const code = async (r: Request, e: Env = env): Promise<string> => {
      const res = await handleTurn(r, e, makeCtx(), user, { log: () => undefined });
      return `${res.status} ${((await res.json()) as { code: string }).code}`;
    };
    assert.equal(await code(turnReq(body('x'), { type: 'text/plain' })), '415 unsupported-media-type');
    assert.equal(await code(turnReq('x'.repeat(512 * 1024 + 1))), '413 body-too-large');
    assert.equal(await code(turnReq('{not json')), '400 bad-json');
    assert.equal(await code(turnReq(JSON.stringify({ sessionId: 'bad id!', ask: 'x', memory: createMemory() }))), '400 bad-request');
    assert.equal(await code(turnReq(JSON.stringify({ sessionId: 's', ask: 'x'.repeat(6001), memory: createMemory() }))), '400 bad-request');
    assert.equal(await code(turnReq(body('x')), { ...env, DASHSCOPE_API_KEY: undefined }), '503 no-key');
    assert.equal(await db.turnsToday(env.DB, user.id, Date.now()), 0, 'rejected requests are not counted');
  });

  test('a Korean ask gets Korean fatal copy', async () => {
    const env = makeEnv({ TURNS_PER_DAY: '0' });
    const user = await approved(env);
    const res = await handleTurn(turnReq(body('싱가포르에 API 서버를 설계해 주세요')), env, makeCtx(), user, { log: () => undefined });
    assert.match(((await res.json()) as { message: string }).message, /오늘의 요청 0회/);
  });
});

describe('Workers compatibility of the shared code', () => {
  test('the catalog and system prompt are built from the imported JSON (no fs)', () => {
    const s = sharedTurnState();
    assert.ok(s.catalog.entries.length > 100);
    assert.ok(s.system.length > 1000);
  });
});
