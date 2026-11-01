// The caps on the Claude backup (src/turn.ts, src/db.ts, migration 0003): a turn Model Studio's content filter stops is
// finished by Claude only while the user is under their daily rescue count and the day's Claude cost, all users together,
// is under the budget. Past a cap the turn behaves as if there were no backup, with a localized "backup limit" message.
// A rescued turn counts 2 of TURNS_PER_DAY, and each backup call is booked as it ends. Also: no deadline for a rescue,
// the model var, what the browser is sent, and the redactor's prefix rule.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTurn, makeRedactor } from '../src/turn.ts';
import { claudeBudgetUsdPerDay, rescuesPerDay } from '../src/env.ts';
import * as db from '../src/db.ts';
import type { Env } from '../src/env.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { fatalMessage } from '../../server/src/messages.ts';
import { ADMIN, API_KEY, makeCtx, makeEnv, ndjson, signIn } from './helpers.ts';
import type { TestEnv } from './helpers.ts';

const CLAUDE_KEY = 'sk-ant-api03-WORKER-SECRET-0123456789abcdef';
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);
const abortError = (): Error => Object.assign(new Error('aborted'), { name: 'AbortError' });

interface Call {
  host: string;
  body: Record<string, unknown>;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response;

function router(q: Handler[], c: Handler[], calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url instanceof Request ? url.url : url));
    const call: Call = { host: u.host, body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, signal: init!.signal! };
    calls.push(call);
    const h = u.host === 'api.anthropic.com' ? c.shift() : q.shift();
    if (!h) throw new Error(`fake upstream: no handler for ${u.host}`);
    return h(call);
  }) as typeof fetch;
}

function sse(c: Call, text: string): Response {
  const bytes = enc.encode(text);
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
    pull(ctl) {
      if (i >= bytes.length) return ctl.close();
      ctl.enqueue(bytes.slice(i, i + 64));
      i += 64;
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const qev = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
const PART = [line({ t: 'say', text: 'A web tier.' }), line({ t: 'node', id: 'app', product: 'ecs', label: 'Web' })].join('\n') + '\n';
const qwenFilteredMid: Handler = (c) => sse(c, qev({ choices: [{ index: 0, delta: { content: PART } }] }) + qev({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } }) + 'data: [DONE]\n\n');
const qwenFilteredHttp: Handler = () => new Response('{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content."}', { status: 400 });

const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const START = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 2000, output_tokens: 1, cache_read_input_tokens: 15000, cache_creation_input_tokens: 0 } } });
function claudeText(text: string, stop = 'end_turn'): string {
  let s = START + cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  for (let i = 0; i < text.length; i += 40) s += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } });
  return s + cev('content_block_stop', { index: 0 }) + cev('message_delta', { delta: { stop_reason: stop, stop_sequence: null, stop_details: null }, usage: { output_tokens: 300 } }) + cev('message_stop');
}
const REST = [line({ t: 'node', id: 'db', product: 'rds', label: 'DB' }), line({ t: 'edge', id: 'e1', from: 'app', to: 'db' }), line({ t: 'say', text: 'Added it.' }), line({ t: 'done', summary: 'ok' })].join('\n') + '\n';
const claudeOk: Handler = (c) => sse(c, claudeText(REST));
const claudeCutOff: Handler = (c) => sse(c, claudeText(PART, 'max_tokens'));
const claudeHttp = (status: number, type: string): Handler => () => new Response(JSON.stringify({ type: 'error', error: { type, message: 'upstream says no' } }), { status, headers: { 'content-type': 'application/json' } });
/** 2000 uncached + 15000 cache reads + 300 out at claude-opus-5-5 prices. */
const ONE_CALL = (2000 * 4 + 15000 * 0.2 + 300 * 20) / 1e6;

const OPTS = { firstByteTimeoutMs: 2000, idleTimeoutMs: 2000, totalTimeoutMs: 5000, retries: 0, backoffMs: 1 } as Record<string, unknown>;
const BACKUP_OPTS = { maxRetries: 0, watchdogs: { firstByteTimeoutMs: 2000, idleTimeoutMs: 2000, totalTimeoutMs: 5000 } };
const ASKS = { en: 'Web tier with a database', ko: '싱가포르에 웹 서비스와 데이터베이스를 설계해 주세요' };
const turnReq = (ask: string): Request =>
  new Request('https://architect.alikorea-demo.com/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://architect.alikorea-demo.com' }, body: JSON.stringify({ sessionId: 'sess_1', ask, memory: createMemory() }) });

const today = (): string => db.utcDay(Date.now());
const usageRow = async (env: TestEnv, userId: string, day = today()): Promise<{ turns: number; est_cost_usd: number; rescues: number; claude_cost_usd: number } | null> =>
  env.DB.prepare('SELECT turns, est_cost_usd, rescues, claude_cost_usd FROM usage WHERE user_id = ? AND day = ?').bind(userId, day).first();
async function seedUsage(env: TestEnv, userId: string, o: { rescues?: number; cost?: number; turns?: number; day?: string }): Promise<void> {
  await env.DB.prepare('INSERT INTO usage (user_id, day, turns, est_cost_usd, rescues, claude_cost_usd) VALUES (?, ?, ?, 0, ?, ?)').bind(userId, o.day ?? today(), o.turns ?? 0, o.rescues ?? 0, o.cost ?? 0).run();
}

interface Run {
  events: Array<Record<string, unknown>>;
  text: string;
  calls: Call[];
  logs: Array<Record<string, unknown>>;
  fatal?: Record<string, unknown>;
}
async function turn(env: TestEnv, userEmail: string, ask: string, q: Handler[], c: Handler[], over: { admin?: boolean } = {}): Promise<Run> {
  const { user } = await signIn(env, userEmail, over.admin ? { status: 'approved', role: 'admin' } : { status: 'approved' });
  const calls: Call[] = [];
  const logs: string[] = [];
  const ctx = makeCtx();
  const res = await handleTurn(turnReq(ask), env, ctx, user, { fetchImpl: router(q, c, calls), turnOptions: OPTS, backupOptions: BACKUP_OPTS, log: (l) => logs.push(l) });
  const text = await res.clone().text();
  const events = await ndjson(res);
  await ctx.flush();
  return { events, text, calls, logs: logs.map((l) => JSON.parse(l) as Record<string, unknown>), fatal: events.find((e) => e.type === 'fatal') };
}
const userIdOf = async (env: TestEnv, email: string): Promise<string> => (await db.userByEmail(env.DB, email))!.id;
const claudeCalls = (r: Run): number => r.calls.filter((c) => c.host === 'api.anthropic.com').length;
const withKey = (over: Partial<Env> = {}): TestEnv => makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY, TURNS_PER_DAY: '60', ...over });

describe('Worker: the per-user rescue cap', () => {
  test('a user at the cap (10) gets the "backup limit" fatal, Claude is never called, and the turn counts once', async () => {
    const env = withKey();
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 10, turns: 7 });
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.deepEqual([r.fatal?.code, r.fatal?.retryable], ['backup-limit', false]);
    assert.equal(r.fatal?.message, fatalMessage('backup-limit', 'en'));
    assert.equal(claudeCalls(r), 0);
    assert.deepEqual(r.events.filter((e) => e.type === 'status'), [], 'the user is not told Claude is coming');
    assert.equal(r.events.some((e) => e.type === 'commit'), false);
    const u = await usageRow(env, user.id);
    assert.deepEqual([u?.turns, u?.rescues, u?.claude_cost_usd], [8, 10, 0]);
    assert.equal(await usageRow(env, '*'), null, 'nothing booked globally');
    const log = r.logs.find((l) => l.evt === 'turn') as { fatal: string; backupUsed: boolean; backupSkipped: { reason: string; detail: string } };
    assert.deepEqual([log.fatal, log.backupUsed, log.backupSkipped.reason, log.backupSkipped.detail], ['backup-limit', false, 'limit', 'user-cap']);
  });

  test('the message is in the language of the ask', async () => {
    const env = withKey();
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 10 });
    const r = await turn(env, 'u@example.com', ASKS.ko, [qwenFilteredHttp], []);
    assert.equal(r.fatal?.message, fatalMessage('backup-limit', 'ko'));
    assert.match(String(r.fatal?.message), /[가-힣]/);
  });

  test('a filter after the first op is blocked the same way: fatal, memory unchanged, no Claude', async () => {
    const env = withKey();
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 10 });
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredMid], [claudeOk]);
    assert.equal(r.fatal?.code, 'backup-limit');
    assert.equal(claudeCalls(r), 0);
    assert.equal(r.events.some((e) => e.type === 'commit'), false);
  });

  test('one under the cap (9) is allowed, and the user then stands at 10', async () => {
    const env = withKey();
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 9 });
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredMid], [claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
    assert.equal(claudeCalls(r), 1);
    assert.equal((await usageRow(env, user.id))?.rescues, 10);
    const again = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.equal(again.fatal?.code, 'backup-limit');
  });

  test('yesterday does not count', async () => {
    const env = withKey();
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 10, day: db.utcDay(Date.now() - 86_400_000) });
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
    assert.equal((await usageRow(env, user.id))?.rescues, 1);
  });

  test('an admin has a higher cap (30): allowed at 10, blocked at 30', async () => {
    const env = withKey();
    const { user } = await signIn(env, ADMIN);
    await seedUsage(env, user.id, { rescues: 10 });
    const ok = await turn(env, ADMIN, ASKS.en, [qwenFilteredHttp], [claudeOk], { admin: true });
    assert.equal(ok.events.at(-1)?.type, 'commit');
    await env.DB.prepare('UPDATE usage SET rescues = 30 WHERE user_id = ?').bind(user.id).run();
    const blocked = await turn(env, ADMIN, ASKS.en, [qwenFilteredHttp], [claudeOk], { admin: true });
    assert.equal(blocked.fatal?.code, 'backup-limit');
    assert.equal(claudeCalls(blocked), 0);
  });

  test('the caps are vars: CLAUDE_RESCUES_PER_USER_DAY and CLAUDE_RESCUES_PER_ADMIN_DAY; 0 turns the backup off for that group', async () => {
    const env = withKey({ CLAUDE_RESCUES_PER_USER_DAY: '2', CLAUDE_RESCUES_PER_ADMIN_DAY: '0' });
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 1 });
    assert.equal((await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk])).events.at(-1)?.type, 'commit');
    assert.equal((await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk])).fatal?.code, 'backup-limit');
    assert.equal((await turn(env, ADMIN, ASKS.en, [qwenFilteredHttp], [claudeOk], { admin: true })).fatal?.code, 'backup-limit');
  });

  test('rescuesPerDay and claudeBudgetUsdPerDay: defaults 10 / 30 / $5, and a bad value falls back to the default', () => {
    const e = (o: Partial<Env>): Env => ({ ...o }) as Env;
    assert.deepEqual([rescuesPerDay(e({}), false), rescuesPerDay(e({}), true), claudeBudgetUsdPerDay(e({}))], [10, 30, 5]);
    for (const bad of ['', 'abc', '-1', '1.5', '999999999']) assert.deepEqual([rescuesPerDay(e({ CLAUDE_RESCUES_PER_USER_DAY: bad }), false), rescuesPerDay(e({ CLAUDE_RESCUES_PER_ADMIN_DAY: bad }), true)], [10, 30], bad);
    assert.equal(rescuesPerDay(e({ CLAUDE_RESCUES_PER_USER_DAY: '0' }), false), 0);
    assert.equal(claudeBudgetUsdPerDay(e({ CLAUDE_BUDGET_USD_PER_DAY: '2.5' })), 2.5);
    assert.equal(claudeBudgetUsdPerDay(e({ CLAUDE_BUDGET_USD_PER_DAY: '0' })), 0);
    for (const bad of ['', 'abc', '-3', 'NaN', 'Infinity']) assert.equal(claudeBudgetUsdPerDay(e({ CLAUDE_BUDGET_USD_PER_DAY: bad })), 5, bad);
  });
});

describe('Worker: the global daily budget', () => {
  test('at $5 of Claude cost today, every user is blocked, whatever their own count', async () => {
    const env = withKey();
    await seedUsage(env, '*', { rescues: 40, cost: 5 });
    const r = await turn(env, 'fresh@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.deepEqual([r.fatal?.code, claudeCalls(r)], ['backup-limit', 0]);
    const log = r.logs.find((l) => l.evt === 'turn') as { backupSkipped: { detail: string } };
    assert.equal(log.backupSkipped.detail, 'global-cap');
  });

  test('just under it ($4.99) a rescue runs, and the cost is added to the total', async () => {
    const env = withKey();
    await seedUsage(env, '*', { rescues: 40, cost: 4.99 });
    const r = await turn(env, 'fresh@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
    const g = await usageRow(env, '*');
    assert.equal(g?.rescues, 41);
    assert.ok(Math.abs((g?.claude_cost_usd ?? 0) - (4.99 + ONE_CALL)) < 1e-9);
    const next = await turn(env, 'other@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.equal(next.fatal?.code, 'backup-limit', 'the total is now past $5');
  });

  test('the budget is a var, in dollars; yesterday does not count', async () => {
    const env = withKey({ CLAUDE_BUDGET_USD_PER_DAY: '1' });
    await seedUsage(env, '*', { cost: 3, day: db.utcDay(Date.now() - 86_400_000) });
    await seedUsage(env, '*', { cost: 0.99 });
    assert.equal((await turn(env, 'a@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk])).events.at(-1)?.type, 'commit');
    assert.equal((await turn(env, 'b@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk])).fatal?.code, 'backup-limit');
  });

  test('a budget of 0 turns the backup off for everyone', async () => {
    const env = withKey({ CLAUDE_BUDGET_USD_PER_DAY: '0' });
    const r = await turn(env, 'a@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.deepEqual([r.fatal?.code, claudeCalls(r)], ['backup-limit', 0]);
  });
});

describe('Worker: booking a rescue', () => {
  test('a rescued turn counts 2 of TURNS_PER_DAY, books one rescue and its cost on the user and on everybody, and shows in the log', async () => {
    const env = withKey({ TURNS_PER_DAY: '3' });
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredMid], [claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
    const id = await userIdOf(env, 'u@example.com');
    const u = await usageRow(env, id);
    assert.deepEqual([u?.turns, u?.rescues], [2, 1]);
    assert.ok(Math.abs((u?.claude_cost_usd ?? 0) - ONE_CALL) < 1e-9, `claude cost ${u?.claude_cost_usd}`);
    assert.ok((u?.est_cost_usd ?? 0) >= ONE_CALL, "the turn's estimated cost includes Claude's");
    const g = await usageRow(env, '*');
    assert.deepEqual([g?.rescues, g?.turns], [1, 0]);
    assert.ok(Math.abs((g?.claude_cost_usd ?? 0) - ONE_CALL) < 1e-9);
    // 2 used of 3: one more turn fits, then the quota is spent
    const second = await turn(env, 'u@example.com', ASKS.en, [(c) => sse(c, qev({ choices: [{ index: 0, delta: { content: PART + REST } }] }) + qev({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n')], []);
    assert.equal(second.events.at(-1)?.type, 'commit');
    const third = await turn(env, 'u@example.com', ASKS.en, [], []);
    assert.equal(third.fatal?.code, 'quota-exceeded', 'a rescued turn used two of the three');
    const log = r.logs.find((l) => l.evt === 'turn') as { backupLog: Array<{ type: string; promptTokens: number; cachedTokens: number; completionTokens: number }> };
    assert.deepEqual(log.backupLog.map((e) => `${e.type}:${e.promptTokens}:${e.cachedTokens}:${e.completionTokens}`), ['usage:17000:15000:300'], "Claude's usage is in the log");
  });

  test('a turn that is not rescued counts 1 and books no rescue', async () => {
    const env = withKey({ TURNS_PER_DAY: '3' });
    const ok = (c: Call): Response => sse(c, qev({ choices: [{ index: 0, delta: { content: PART + REST } }] }) + qev({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n');
    const r = await turn(env, 'u@example.com', ASKS.en, [ok], [claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
    const u = await usageRow(env, await userIdOf(env, 'u@example.com'));
    assert.deepEqual([u?.turns, u?.rescues, u?.claude_cost_usd], [1, 0, 0]);
    assert.equal(await usageRow(env, '*'), null);
  });

  test('a rescue with two Claude calls is one rescue and both costs', async () => {
    const env = withKey();
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeCutOff, claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
    assert.equal(claudeCalls(r), 2);
    const u = await usageRow(env, await userIdOf(env, 'u@example.com'));
    assert.deepEqual([u?.rescues, u?.turns], [1, 2]);
    assert.ok(Math.abs((u?.claude_cost_usd ?? 0) - 2 * ONE_CALL) < 1e-9);
    assert.equal((await usageRow(env, '*'))?.rescues, 1);
  });

  test('a rescue that fails is still counted (it was asked), at no cost', async () => {
    const env = withKey();
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeHttp(529, 'overloaded_error')]);
    assert.equal(r.fatal?.code, 'backup-failed');
    const u = await usageRow(env, await userIdOf(env, 'u@example.com'));
    assert.deepEqual([u?.rescues, u?.turns, u?.claude_cost_usd], [1, 2, 0]);
  });

  test("each backup call is booked as it ends, not at the end of the turn: it survives a failure of the turn's own usage record", async () => {
    const env = withKey();
    const real = env.DB.prepare.bind(env.DB);
    env.DB.prepare = (sql: string) => {
      if (sql.includes('turns = turns + excluded.turns')) throw new Error('D1 write failed');
      return real(sql);
    };
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredMid], [claudeOk]);
    env.DB.prepare = real;
    assert.equal(r.events.at(-1)?.type, 'commit');
    const u = await usageRow(env, await userIdOf(env, 'u@example.com'));
    assert.deepEqual([u?.rescues, u?.turns], [1, 0]);
    assert.ok(Math.abs((u?.claude_cost_usd ?? 0) - ONE_CALL) < 1e-9);
    assert.equal((await usageRow(env, '*'))?.rescues, 1);
  });

  test('a broken stream is booked at its upper bound, not at the one output token message_start reports', async () => {
    const env = withKey();
    const big = line({ t: 'say', text: 'a'.repeat(3000) }) + '\n';
    const broken: Handler = (c) => {
      const head = START + cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) + cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: big } });
      const bytes = enc.encode(head);
      let sent = false;
      return new Response(
        new ReadableStream<Uint8Array>({
          start(ctl) {
            c.signal.addEventListener('abort', () => {
              try {
                ctl.error(abortError());
              } catch {
                /* closed */
              }
            });
          },
          pull(ctl) {
            if (sent) return new Promise<void>(() => undefined);
            sent = true;
            ctl.enqueue(bytes);
          },
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      );
    };
    const calls: Call[] = [];
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    const ctx = makeCtx();
    const res = await handleTurn(turnReq(ASKS.en), env, ctx, user, { fetchImpl: router([qwenFilteredHttp], [broken], calls), turnOptions: OPTS, backupOptions: { maxRetries: 0, watchdogs: { firstByteTimeoutMs: 2000, idleTimeoutMs: 200, totalTimeoutMs: 5000 } }, log: () => undefined });
    await ndjson(res);
    await ctx.flush();
    const bound = (2000 * 4 + 15000 * 0.2 + Math.ceil(big.length / 2) * 20) / 1e6;
    const u = await usageRow(env, user.id);
    assert.ok(Math.abs((u?.claude_cost_usd ?? 0) - bound) < 1e-9, `booked ${u?.claude_cost_usd}, bound ${bound}`);
  });
});

describe('Worker: a rescue that cannot start', () => {
  test('less than a minute of the turn deadline left: no rescue (TURN_DEADLINE_MS 10 s), a "backup failed" fatal, and no cap used', async () => {
    const env = withKey({ TURN_DEADLINE_MS: '10000' });
    const r = await turn(env, 'u@example.com', ASKS.ko, [qwenFilteredHttp], [claudeOk]);
    assert.deepEqual([r.fatal?.code, r.fatal?.retryable], ['backup-failed', true]);
    assert.equal(r.fatal?.message, fatalMessage('backup-failed', 'ko'));
    assert.equal(claudeCalls(r), 0);
    const u = await usageRow(env, await userIdOf(env, 'u@example.com'));
    assert.deepEqual([u?.turns, u?.rescues], [1, 0]);
    const log = r.logs.find((l) => l.evt === 'turn') as { backupSkipped: { reason: string } };
    assert.equal(log.backupSkipped.reason, 'deadline');
  });

  test('the default deadline (240 s) leaves room for a rescue', async () => {
    const env = withKey();
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    assert.equal(r.events.at(-1)?.type, 'commit');
  });

  test('a cap check that fails (D1 error) blocks the rescue, fails closed, and says "backup failed", not "limit"', async () => {
    const env = withKey();
    const real = env.DB.prepare.bind(env.DB);
    env.DB.prepare = (sql: string) => {
      if (sql.includes('claude_cost_usd FROM usage WHERE day')) throw new Error('D1 read failed');
      return real(sql);
    };
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], [claudeOk]);
    env.DB.prepare = real;
    assert.deepEqual([r.fatal?.code, claudeCalls(r)], ['backup-failed', 0]);
  });
});

describe('Worker: the model var and what the browser is sent', () => {
  test('CLAUDE_BACKUP_MODEL outside the PRICES table falls back to claude-opus-5-5 in the request', async () => {
    for (const [model, sent] of [['claude-made-up-9', 'claude-opus-5-5'], ['gpt-5', 'claude-opus-5-5'], ['claude-opus-5', 'claude-opus-5']]) {
      const env = withKey({ CLAUDE_BACKUP_MODEL: model });
      const r = await turn(env, `u${Math.random().toString(36).slice(2, 8)}@example.com`, ASKS.en, [qwenFilteredHttp], [claudeOk]);
      assert.equal(r.calls.find((c) => c.host === 'api.anthropic.com')?.body.model, sent, model);
    }
  });

  test("Claude's usage and error events are not in the NDJSON the browser gets", async () => {
    const env = withKey();
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredMid], [claudeOk]);
    assert.ok(r.events.some((e) => e.type === 'op' && e.phase === 'repair'), "Claude's drawing is streamed");
    assert.deepEqual(r.events.filter((e) => e.phase === 'repair' && (e.type === 'usage' || e.type === 'error')), []);
    const env2 = withKey();
    const f = await turn(env2, 'v@example.com', ASKS.en, [qwenFilteredHttp], [claudeHttp(529, 'overloaded_error')]);
    assert.ok(!/overloaded|529/i.test(f.events.filter((e) => e.type !== 'status').map((e) => JSON.stringify(e)).join('\n')), 'Claude was overloaded; the browser is not told');
  });

  test('no key anywhere, with a capped user too', async () => {
    const env = withKey();
    const { user } = await signIn(env, 'u@example.com', { status: 'approved' });
    await seedUsage(env, user.id, { rescues: 10 });
    const r = await turn(env, 'u@example.com', ASKS.en, [qwenFilteredHttp], []);
    assert.ok(!r.text.includes(CLAUDE_KEY) && !r.text.includes(API_KEY));
    assert.ok(!r.logs.map((l) => JSON.stringify(l)).join('\n').includes(CLAUDE_KEY));
  });
});

describe('Worker: the redactor prefix rule', () => {
  test('a start of a key shorter than 12 characters is left alone; 12 or more is redacted', () => {
    const r = makeRedactor(API_KEY, CLAUDE_KEY);
    for (const cut of [4, 6, 7, 8, 11]) {
      const s = `see ${CLAUDE_KEY.slice(0, cut)} here and ${API_KEY.slice(0, cut)} there`;
      // the generic sk- token rule still takes an "sk-" run of 8+ characters after the dash, so only count the keys' own starts
      if (cut <= 10) assert.equal(r(s), s, `a ${cut}-character start is ordinary text`);
    }
    for (const cut of [12, 16, CLAUDE_KEY.length - 1]) assert.ok(!r(`x ${CLAUDE_KEY.slice(0, cut)} y`).includes(CLAUDE_KEY.slice(4, 12)), `a ${cut}-character start`);
    for (const cut of [12, 20]) assert.ok(!r(`x ${API_KEY.slice(0, cut)} y`).includes(API_KEY.slice(3, 12)), `a ${cut}-character start of the other key`);
    assert.equal(r(`k ${CLAUDE_KEY}`), 'k [redacted]');
    assert.equal(r('The sk-ant prefix and sk-test are only words.'), 'The sk-ant prefix and sk-test are only words.');
    assert.equal(makeRedactor()('a sk-AbCd1234EfGh5678 b'), 'a [redacted] b', 'any sk- token');
  });
});
