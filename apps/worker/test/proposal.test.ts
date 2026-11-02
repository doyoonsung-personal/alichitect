// POST /api/proposal on the Worker: request checks (each 4xx, in turn's order), the daily quota and the one-in-flight
// slot it shares with turns (a busy turn blocks a draft and a busy draft blocks a turn; the slot is freed after done,
// fatal, a client abort and the deadline), usage counted as 1 turn or 2 when the backup ran, NDJSON lines in order
// ending with done or fatal, the failure codes, no provider or model on the wire even when the backup wrote the draft,
// key redaction, a log line without text, and the routes (401 / 403 / 405). Most tests inject the drafting engine
// (deps.draft); two run the real draftProposal over a fake Model Studio and a fake backup.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { handleProposal, proposalDeadlineMs } from '../src/proposal.ts';
import { handleTurn } from '../src/turn.ts';
import * as db from '../src/db.ts';
import type { Env } from '../src/env.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import type { DraftProposalOptions, DraftProposalResult, DraftStats } from '../../../packages/core/src/proposal.ts';
import type { Catalog, ProposalDraft, ProposalRequest, ProposalSection, SessionMemory } from '../../../packages/core/src/types.ts';
import { ADMIN, API_KEY, call, makeCtx, makeEnv, ndjson, req, signIn } from './helpers.ts';

const CLAUDE_KEY = 'sk-ant-api03-WORKER-SECRET-0123456789abcdef';
// the words no browser may receive (assembled so this file stays greppable for the real thing)
// A design's own Qwen models may be named in step sections (PLAN.md D7); the backend's vendor names may not.
const HIDDEN = new RegExp(['cl' + 'aude', 'anth' + 'ropic', 'DataInspection', 'inappropriate'].join('|'), 'i');
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);
const abortError = (): Error => Object.assign(new Error('aborted'), { name: 'AbortError' });

const ASK = 'Our ticket site crashed for 40 minutes during a big sale. Keep PostgreSQL.';

function memory(): SessionMemory {
  const m = createMemory();
  m.turns = [
    { role: 'user', text: ASK },
    { role: 'assistant', text: 'Here is a design.' },
  ];
  m.graph.groups = { sg: { id: 'sg', kind: 'region', label: 'Singapore', parent: null }, vpc: { id: 'vpc', kind: 'vpc', label: 'App VPC', parent: 'sg' } };
  m.graph.nodes = {
    app: { id: 'app', product: 'ecs', label: 'Web', group: 'vpc', why: 'Runs the site.' },
    db: { id: 'db', product: 'rds', label: 'Orders DB', group: 'vpc', why: 'Keeps PostgreSQL.' },
  };
  m.graph.edges = { 'e-app-db': { id: 'e-app-db', from: 'app', to: 'db' } };
  return m;
}

const proposal = (o: Partial<ProposalRequest> = {}): ProposalRequest => ({ sessionId: 'sess_1', lang: 'en', title: 'Ticketing platform', customer: 'Seoul Live', memory: memory(), ...o });

const propReq = (b: string, o: { type?: string; signal?: AbortSignal } = {}): Request =>
  new Request('https://architect.alikorea-demo.com/api/proposal', { method: 'POST', headers: { 'Content-Type': o.type ?? 'application/json', Origin: 'https://architect.alikorea-demo.com' }, body: b, signal: o.signal });
const turnReq = (): Request =>
  new Request('https://architect.alikorea-demo.com/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://architect.alikorea-demo.com' }, body: JSON.stringify({ sessionId: 'sess_1', ask: 'x', memory: createMemory() }) });

async function approved(env: Env, email = 'user@example.com'): Promise<db.UserRow> {
  return (await signIn(env, email, { status: 'approved' })).user;
}

/* ---------- an injected drafting engine ---------- */

const S: Record<string, ProposalSection> = {
  exec: { k: 'exec', text: 'Seoul Live lost 40 minutes of sales during a big on-sale.\n\nThis design keeps the site up during spikes.' },
  need: { k: 'need', id: 'n1', need: 'Stay up during on-sales', source: 'stated', quote: 'crashed for 40 minutes', answer: 'Compute scales out before the spike.', products: ['ecs'] },
  whyEcs: { k: 'why', product: 'ecs', text: 'Outages during on-sales lose revenue. ECS adds capacity in minutes.' },
  whyRds: { k: 'why', product: 'rds', text: 'Your team knows PostgreSQL. RDS keeps it managed.' },
  next: { k: 'next', text: 'Run a load test at 30x traffic.' },
};

const DRAFT: ProposalDraft = {
  lang: 'en',
  exec: (S.exec as { text: string }).text,
  needs: [{ id: 'n1', need: 'Stay up during on-sales', source: 'stated', quote: 'crashed for 40 minutes', answer: 'Compute scales out before the spike.', products: ['ecs'] }],
  outcomes: [],
  why: { ecs: (S.whyEcs as { text: string }).text, rds: (S.whyRds as { text: string }).text },
  tradeoffs: [],
  next: ['Run a load test at 30x traffic.'],
  complete: false,
};

const stats = (o: Partial<DraftStats> = {}): DraftStats => ({
  model: 'qwen3.8-max',
  servedBy: 'qwen',
  fallbackUsed: false,
  backupUsed: false,
  calls: 1,
  costUsd: 0.02,
  ms: 1234,
  sections: 4,
  rejectedLines: 0,
  lint: {},
  heldUsed: 0,
  missing: ['outcomes', 'tradeoffs'],
  promptTokens: 3200,
  completionTokens: 900,
  ...o,
});

type Script = (o: DraftProposalOptions, req: ProposalRequest) => Promise<DraftProposalResult>;

/** A fake draftProposal: records what it was given and runs the script. */
function fakeDraft(script: Script): { draft: (req: ProposalRequest, cat: Catalog, o: DraftProposalOptions) => Promise<DraftProposalResult>; seen: DraftProposalOptions[] } {
  const seen: DraftProposalOptions[] = [];
  return {
    seen,
    draft: async (req, _cat, o) => {
      seen.push(o);
      return script(o, req);
    },
  };
}

const happy: Script = async (o) => {
  o.onSection?.(S.exec);
  o.onStatus?.('retry');
  o.onSection?.(S.need);
  o.onSection?.(S.whyEcs);
  o.onStatus?.('finish');
  o.onSection?.(S.whyRds);
  o.onSection?.(S.next);
  return { outcome: 'done', draft: DRAFT, stats: stats({ fallbackUsed: true }) };
};

/** Waits until the signal fires (or `release` resolves), then reports an abort (or `then`). */
const waitFor = (signal: AbortSignal | undefined, release?: Promise<void>, then?: DraftProposalResult): Promise<DraftProposalResult> =>
  new Promise((resolve) => {
    signal?.addEventListener('abort', () => resolve({ outcome: 'aborted', draft: null, stats: stats({ sections: 1 }) }), { once: true });
    release?.then(() => resolve(then ?? { outcome: 'done', draft: DRAFT, stats: stats() }));
  });

const inflight = (env: Env): Promise<unknown> => env.DB.prepare('SELECT * FROM inflight').first();
const usageRow = (env: Env, userId: string) => env.DB.prepare('SELECT turns, est_cost_usd, rescues, claude_cost_usd FROM usage WHERE user_id = ?').bind(userId).first<{ turns: number; est_cost_usd: number; rescues: number; claude_cost_usd: number }>();

describe('POST /api/proposal streaming', () => {
  test('streams sections and statuses in order, ends with done; one turn counted; the slot freed', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const f = fakeDraft(happy);
    const ctx = makeCtx();
    const logs: string[] = [];
    const res = await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: (l) => logs.push(l) });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Type')!, /^application\/x-ndjson/);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    const events = await ndjson(res);
    await ctx.flush();
    assert.deepEqual(
      events.map((e) => (e.type === 'section' ? `section:${(e.section as ProposalSection).k}` : e.type === 'status' ? `status:${e.code}` : e.type)),
      ['section:exec', 'status:retry', 'section:need', 'section:why', 'status:finish', 'section:why', 'section:next', 'done'],
    );
    assert.deepEqual(events.at(-1), { type: 'done', draft: DRAFT });
    const status = events.find((e) => e.type === 'status' && e.code === 'finish')!;
    assert.deepEqual(Object.keys(status).sort(), ['code', 'text', 'type'], 'a status carries no provider, model or reason');
    assert.equal(status.text, 'Still writing the proposal…');

    // the engine got the key, the turn models, the deadline, an abort signal; no backup without the secret
    const o = f.seen[0];
    assert.equal(o.apiKey, API_KEY);
    assert.equal(o.model, 'qwen3.8-max');
    assert.equal(o.fallbackModel, 'qwen3.7-max');
    assert.ok(o.signal instanceof AbortSignal);
    const left = o.msLeft!();
    assert.ok(left > 190_000 && left <= 200_000, `msLeft ${left}`);
    assert.equal(o.backup, undefined);
    assert.equal(o.backupGate, undefined);

    const u = await usageRow(env, user.id);
    assert.equal(u?.turns, 1);
    assert.ok(Math.abs((u?.est_cost_usd ?? 0) - 0.02) < 1e-9, 'the draft cost is booked');
    assert.equal(await inflight(env), null, 'slot released');

    const log = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'proposal')!;
    assert.equal(log.outcome, 'done');
    assert.equal(log.fatal, null);
    assert.equal(log.sections, 4);
    assert.equal(log.missing, 2);
    assert.equal(log.fallbackUsed, true);
    assert.equal(log.lang, 'en');
    const all = logs.join('\n');
    for (const text of [ASK, 'Seoul Live', 'Ticketing platform', 'Outages during on-sales', 'crashed for 40 minutes', 'load test']) assert.ok(!all.includes(text), `the log holds no text: ${text}`);
  });

  test('when the backup wrote the draft: 2 turns, its call booked, and no provider or model in any line', async () => {
    const env = makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY });
    const user = await approved(env);
    const f = fakeDraft(async (o) => {
      o.onSection?.(S.exec);
      assert.ok(o.backup, 'the backup is passed when the secret is set');
      assert.deepEqual(await o.backupGate!(), { ok: true });
      o.onStatus?.('finish');
      await o.onBackupCall!({ model: 'claude-opus-5-5', costUsd: 0.4, estimated: false, usage: null, first: true });
      o.onSection?.(S.need);
      o.onSection?.(S.whyEcs);
      o.onSection?.(S.whyRds);
      return { outcome: 'done', draft: DRAFT, stats: stats({ servedBy: 'claude', backupUsed: true, costUsd: 0.42 }) };
    });
    const ctx = makeCtx();
    const logs: string[] = [];
    const res = await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: (l) => logs.push(l) });
    const text = await res.text();
    await ctx.flush();
    assert.ok(!HIDDEN.test(text), 'no provider, model or vendor on the wire');
    assert.ok(!/provider|servedBy|"model"/.test(text));
    assert.ok(!text.includes(CLAUDE_KEY) && !text.includes(API_KEY));
    const events = text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
    assert.equal(events.at(-1)!.type, 'done');
    const u = await usageRow(env, user.id);
    assert.equal(u?.turns, 2, 'a draft the backup helped counts 2');
    assert.equal(u?.rescues, 1);
    assert.ok(Math.abs((u?.claude_cost_usd ?? 0) - 0.4) < 1e-9);
    const log = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'proposal')!;
    assert.equal(log.backupUsed, true, 'the log (server side) may say so');
  });

  test('the backup gate applies the rescue caps', async () => {
    const env = makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY, CLAUDE_RESCUES_PER_USER_DAY: '1' });
    const user = await approved(env);
    await db.bookRescue(env.DB, user.id, db.utcDay(Date.now()), 0.1, true);
    let gate: unknown;
    const f = fakeDraft(async (o) => {
      gate = await o.backupGate!();
      return { outcome: 'failed', draft: null, error: { code: 'content-filtered', message: 'The draft was stopped by a content check.' }, stats: stats({ backupSkipped: { reason: 'limit', detail: 'user-cap' } }) };
    });
    const ctx = makeCtx();
    const events = await ndjson(await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: () => undefined }));
    await ctx.flush();
    assert.deepEqual(gate, { ok: false, reason: 'limit', detail: 'user-cap' });
    assert.equal(events.at(-1)!.code, 'content-filtered');
    assert.equal((await usageRow(env, user.id))?.turns, 1, 'a backup that did not run counts 1');
  });

  test('failures map to neutral, localized fatals; never the engine error text', async () => {
    const cases: Array<[DraftProposalResult['error'] | 'throw', string, boolean]> = [
      [{ code: 'content-filtered', message: 'The draft was stopped by a content check.' }, 'content-filtered', false],
      [{ code: 'timeout', message: 'The writer did not answer in time.' }, 'draft-timeout', true],
      [{ code: 'upstream', message: 'The drafting service failed.' }, 'draft-failed', true],
      [{ code: 'empty', message: 'The draft came back without its required parts.' }, 'draft-failed', true],
      ['throw', 'internal', true],
    ];
    for (const [err, code, retryable] of cases) {
      const env = makeEnv();
      const user = await approved(env);
      const f = fakeDraft(async (o) => {
        o.onSection?.(S.exec);
        if (err === 'throw') throw new Error('boom at /src/secret/path.ts:12 with ' + API_KEY);
        return { outcome: 'failed', draft: null, error: err, stats: stats() };
      });
      const ctx = makeCtx();
      const logs: string[] = [];
      const res = await handleProposal(propReq(line(proposal({ lang: 'ko' }))), env, ctx, user, { draft: f.draft, log: (l) => logs.push(l) });
      const text = await res.text();
      await ctx.flush();
      const events = text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
      assert.equal(events[0].type, 'section', 'sections already written still arrive');
      const last = events.at(-1)!;
      assert.deepEqual([last.type, last.code, last.retryable], ['fatal', code, retryable], code);
      assert.match(String(last.message), /[가-힣]/, 'Korean copy for lang ko');
      if (code === 'content-filtered') assert.match(String(last.message), /기본 버전/);
      assert.ok(!/boom|secret\/path|writer did not|drafting service|content check|required parts/.test(text), 'no engine text or stack');
      assert.ok(!text.includes(API_KEY));
      assert.equal(await inflight(env), null, 'slot released after a fatal');
      assert.equal((await usageRow(env, user.id))?.turns, 1);
      const log = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'proposal')!;
      assert.equal(log.fatal, code);
      assert.ok(!logs.join('\n').includes('boom'), 'nor in the log');
    }
  });

  test('an incomplete draft is still done', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const f = fakeDraft(async (o) => {
      o.onSection?.(S.exec);
      return { outcome: 'done', draft: { ...DRAFT, complete: false }, stats: stats() };
    });
    const ctx = makeCtx();
    const events = await ndjson(await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: () => undefined }));
    await ctx.flush();
    assert.equal(events.at(-1)!.type, 'done');
  });

  test('the deadline aborts the draft: fatal draft-timeout, usage counted, slot freed', async () => {
    const env = makeEnv();
    const user = await approved(env);
    let signal: AbortSignal | undefined;
    const f = fakeDraft(async (o) => {
      signal = o.signal;
      o.onSection?.(S.exec);
      return waitFor(o.signal);
    });
    const ctx = makeCtx();
    const logs: string[] = [];
    const t0 = Date.now();
    const events = await ndjson(await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, deadlineMs: 80, log: (l) => logs.push(l) }));
    await ctx.flush();
    assert.ok(Date.now() - t0 < 3000);
    assert.equal(signal?.aborted, true);
    assert.deepEqual([events.at(-1)!.type, events.at(-1)!.code], ['fatal', 'draft-timeout']);
    assert.equal(await inflight(env), null);
    assert.equal((await usageRow(env, user.id))?.turns, 1);
    const log = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'proposal')!;
    assert.equal(log.deadlineHit, true);
  });

  test('PROPOSAL_DEADLINE_MS: 30000-600000, else 200000', () => {
    assert.equal(proposalDeadlineMs(makeEnv()), 200_000);
    assert.equal(proposalDeadlineMs(makeEnv({ PROPOSAL_DEADLINE_MS: '90000' })), 90_000);
    assert.equal(proposalDeadlineMs(makeEnv({ PROPOSAL_DEADLINE_MS: '1000' })), 200_000);
    assert.equal(proposalDeadlineMs(makeEnv({ PROPOSAL_DEADLINE_MS: '700000' })), 200_000);
    assert.equal(proposalDeadlineMs(makeEnv({ PROPOSAL_DEADLINE_MS: 'soon' })), 200_000);
  });

  test('Stop in the browser (the stream is cancelled) aborts the draft and frees the slot; no done', async () => {
    const env = makeEnv();
    const user = await approved(env);
    let signal: AbortSignal | undefined;
    const f = fakeDraft(async (o) => {
      signal = o.signal;
      o.onSection?.(S.exec);
      // keeps writing until aborted, as a real draft does
      const tick = setInterval(() => o.onSection?.({ k: 'next', text: `step ${Date.now()}` }), 10);
      const r = await waitFor(o.signal);
      clearInterval(tick);
      return r;
    });
    const ctx = makeCtx();
    const logs: string[] = [];
    const res = await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: (l) => logs.push(l) });
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();
    await ctx.flush();
    assert.equal(signal?.aborted, true);
    assert.equal(await inflight(env), null);
    assert.equal((await usageRow(env, user.id))?.turns, 1, 'a started draft counts');
    const log = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'proposal')!;
    assert.deepEqual([log.outcome, log.fatal, log.clientGone], ['aborted', null, true]);
  });

  test('request.signal (the runtime disconnect) aborts the draft too', async () => {
    const env = makeEnv();
    const user = await approved(env);
    let signal: AbortSignal | undefined;
    const f = fakeDraft(async (o) => {
      signal = o.signal;
      o.onSection?.(S.exec);
      return waitFor(o.signal);
    });
    const ctx = makeCtx();
    const ac = new AbortController();
    const r = propReq(line(proposal()));
    Object.defineProperty(r, 'signal', { value: ac.signal });
    const res = await handleProposal(r, env, ctx, user, { draft: f.draft, log: () => undefined });
    const reader = res.body!.getReader();
    await reader.read();
    ac.abort();
    await ctx.flush();
    assert.equal(signal?.aborted, true);
    assert.equal(await inflight(env), null);
  });

  test('a key-shaped string inside a section is redacted', async () => {
    const env = makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY });
    const user = await approved(env);
    const f = fakeDraft(async (o) => {
      o.onSection?.({ k: 'next', text: `Rotate ${API_KEY}, ${CLAUDE_KEY.slice(0, 16)} and sk-live-ABCDEFGH12345678.` });
      return { outcome: 'done', draft: { ...DRAFT, next: [`Rotate ${API_KEY}`] }, stats: stats() };
    });
    const ctx = makeCtx();
    const text = await (await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: () => undefined })).text();
    await ctx.flush();
    assert.ok(!text.includes(API_KEY.slice(0, 12)) && !text.includes(CLAUDE_KEY.slice(0, 12)) && !text.includes('sk-live-ABCDEFGH'));
    assert.match(text, /\[redacted\]/);
  });
});

describe('POST /api/proposal limits', () => {
  test('the same request checks as /api/turn, in the same order, plus lang, title and customer', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const f = fakeDraft(happy);
    const code = async (r: Request, e: Env = env): Promise<string> => {
      const res = await handleProposal(r, e, makeCtx(), user, { draft: f.draft, log: () => undefined });
      return `${res.status} ${((await res.json()) as { code: string }).code}`;
    };
    assert.equal(await code(propReq(line(proposal()), { type: 'text/plain' })), '415 unsupported-media-type');
    assert.equal(await code(propReq('x'.repeat(512 * 1024 + 1))), '413 body-too-large');
    assert.equal(await code(propReq('{not json')), '400 bad-json');
    assert.equal(await code(propReq(line(proposal({ sessionId: 'bad id!' })))), '400 bad-request');
    assert.equal(await code(propReq(line(proposal({ lang: 'ja' as 'en' })))), '400 bad-request');
    assert.equal(await code(propReq(line({ ...proposal(), lang: undefined }))), '400 bad-request');
    assert.equal(await code(propReq(line(proposal({ title: 'x'.repeat(161) })))), '400 bad-request');
    assert.equal(await code(propReq(line(proposal({ customer: '가'.repeat(81) })))), '400 bad-request');
    assert.equal(await code(propReq(line(proposal({ title: 3 as unknown as string })))), '400 bad-request');
    assert.equal(await code(propReq(line({ ...proposal(), memory: { ...memory(), turns: 'no' } }))), '400 bad-request');
    assert.equal(await code(propReq(line(proposal())), { ...env, DASHSCOPE_API_KEY: undefined }), '503 no-key');
    assert.equal(f.seen.length, 0, 'nothing was drafted');
    assert.equal(await db.turnsToday(env.DB, user.id, Date.now()), 0, 'rejected requests are not counted');
    assert.equal(await inflight(env), null);

    // at the limits, and with the cover fields left out, the request is fine
    const ctx = makeCtx();
    const ok = await handleProposal(propReq(line({ ...proposal({ title: 'x'.repeat(160), customer: '가'.repeat(80) }) })), env, ctx, user, { draft: f.draft, log: () => undefined });
    assert.equal(ok.status, 200);
    await ok.text();
    const bare = { sessionId: 's', lang: 'zh', memory: memory() };
    const ok2 = await handleProposal(propReq(line(bare)), env, ctx, user, { draft: f.draft, log: () => undefined });
    assert.equal(ok2.status, 200);
    await ok2.text();
    await ctx.flush();
  });

  test('the daily quota: 429 quota-exceeded, not retryable, with a reset time and proposal copy; admins are unlimited', async () => {
    const env = makeEnv({ TURNS_PER_DAY: '2' });
    const user = await approved(env);
    const today = db.utcDay(Date.now());
    await db.recordUsage(env.DB, user.id, today, 0.01);
    await db.recordUsage(env.DB, user.id, today, 0.01);
    const f = fakeDraft(happy);
    const res = await handleProposal(propReq(line(proposal())), env, makeCtx(), user, { draft: f.draft, log: () => undefined });
    assert.equal(res.status, 429);
    const ev = (await res.json()) as { type: string; code: string; message: string; retryable: boolean };
    assert.deepEqual([ev.type, ev.code, ev.retryable], ['fatal', 'quota-exceeded', false]);
    assert.match(ev.message, /today's 2 turns/);
    assert.match(ev.message, /basic version/);
    const ra = Number(res.headers.get('Retry-After'));
    assert.ok(ra > 0 && ra <= 86_400);
    assert.equal(f.seen.length, 0);

    const zh = await handleProposal(propReq(line(proposal({ lang: 'zh' }))), env, makeCtx(), user, { draft: f.draft, log: () => undefined });
    assert.match(((await zh.json()) as { message: string }).message, /2 次请求/);

    const admin = (await signIn(env, ADMIN)).user;
    for (let i = 0; i < 3; i++) await db.recordUsage(env.DB, admin.id, today, 0.01);
    const ctx = makeCtx();
    const ok = await handleProposal(propReq(line(proposal())), env, ctx, admin, { draft: f.draft, log: () => undefined });
    assert.equal(ok.status, 200);
    await ok.text();
    await ctx.flush();
  });

  test('one request in flight per user: a running turn refuses a draft (409 user-busy)', async () => {
    const env = makeEnv();
    const user = await approved(env);
    assert.equal(await db.acquireTurnSlot(env.DB, user.id, 'a-turn', Date.now(), 300_000), true);
    const f = fakeDraft(happy);
    const res = await handleProposal(propReq(line(proposal())), env, makeCtx(), user, { draft: f.draft, log: () => undefined });
    assert.equal(res.status, 409);
    const ev = (await res.json()) as { code: string; message: string; retryable: boolean };
    assert.deepEqual([ev.code, ev.retryable], ['user-busy', true]);
    assert.match(ev.message, /try again/);
    assert.equal(f.seen.length, 0);
  });

  test('and a running draft refuses a turn; once it is done both are free again', async () => {
    const env = makeEnv();
    const user = await approved(env);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const f = fakeDraft(async (o) => {
      o.onSection?.(S.exec);
      return waitFor(o.signal, gate);
    });
    const ctx = makeCtx();
    const res = await handleProposal(propReq(line(proposal())), env, ctx, user, { draft: f.draft, log: () => undefined });
    const reader = res.body!.getReader();
    await reader.read(); // the draft is live
    const turn = await handleTurn(turnReq(), env, makeCtx(), user, { log: () => undefined });
    assert.equal(turn.status, 409);
    assert.equal(((await turn.json()) as { code: string }).code, 'user-busy');
    const second = await handleProposal(propReq(line(proposal())), env, makeCtx(), user, { draft: f.draft, log: () => undefined });
    assert.equal(second.status, 409, 'nor a second draft');
    release();
    while (!(await reader.read()).done);
    await ctx.flush();
    assert.equal(await inflight(env), null);
    assert.equal(await db.acquireTurnSlot(env.DB, user.id, 'next-turn', Date.now(), 300_000), true, 'the slot is free');
  });

  test('another user is not blocked by your draft', async () => {
    const env = makeEnv();
    const a = await approved(env, 'a@example.com');
    const b = await approved(env, 'b@example.com');
    await db.acquireTurnSlot(env.DB, a.id, 'busy', Date.now(), 300_000);
    const ctx = makeCtx();
    const res = await handleProposal(propReq(line(proposal())), env, ctx, b, { draft: fakeDraft(happy).draft, log: () => undefined });
    assert.equal(res.status, 200);
    await res.text();
    await ctx.flush();
  });
});

/* ---------- the real draftProposal over a fake Model Studio and a fake backup ---------- */

interface Call {
  host: string;
  body: Record<string, unknown>;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response;

function router(q: Handler[], c: Handler[], calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url instanceof Request ? url.url : url));
    const call: Call = { host: u.host, body: JSON.parse(String(init!.body)) as Record<string, unknown>, signal: init!.signal! };
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
const QUSAGE = qev({ choices: [], usage: { prompt_tokens: 3000, completion_tokens: 800 } });
const L = {
  exec: line({ k: 'exec', text: 'Seoul Live lost 40 minutes of sales during a big on-sale.\n\nThis design keeps the site up and keeps PostgreSQL.' }),
  need1: line({ k: 'need', id: 'x', need: 'Stay up during on-sales', source: 'stated', quote: 'crashed for 40 minutes', answer: 'Compute scales out before the spike.', products: ['ecs'] }),
  need2: line({ k: 'need', id: 'x', need: 'Keep the database the team knows', source: 'stated', quote: 'Keep PostgreSQL', answer: 'A managed PostgreSQL keeps skills and tools.', products: ['rds'] }),
  outcome: line({ k: 'outcome', title: 'Sales keep flowing', text: 'Spikes no longer take the site down.' }),
  whyEcs: line({ k: 'why', product: 'ecs', text: 'Outages during on-sales lose revenue. ECS adds capacity in minutes.' }),
  whyRds: line({ k: 'why', product: 'rds', text: `Your team knows PostgreSQL. RDS keeps it managed (${CLAUDE_KEY}).` }),
  tradeoff: line({ k: 'tradeoff', text: 'Scaling has a short warm-up.', mitigation: 'Scale out before each on-sale.' }),
  next: line({ k: 'next', text: 'Run a load test at 30x traffic.' }),
  // a line naming the backup is dropped by the validator
  named: line({ k: 'next', text: 'Written by ' + 'Cl' + 'aude.' }),
};
const qwenOk = (lines: string[]): Handler => (c) => {
  const text = lines.join('\n') + '\n';
  let s = qev({ choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] });
  for (let i = 0; i < text.length; i += 60) s += qev({ choices: [{ index: 0, delta: { content: text.slice(i, i + 60) } }] });
  return sse(c, s + qev({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + QUSAGE + 'data: [DONE]\n\n');
};
const qwenFiltered: Handler = () => new Response('{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content."}', { status: 400 });
const qwenFilteredMid = (lines: string[]): Handler => (c) =>
  sse(c, qev({ choices: [{ index: 0, delta: { content: lines.join('\n') + '\n' } }] }) + qev({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } }) + 'data: [DONE]\n\n');
const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const claudeOk = (lines: string[]): Handler => (c) => {
  const text = lines.join('\n') + '\n';
  let s = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 4000, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } });
  s += cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  for (let i = 0; i < text.length; i += 40) s += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } });
  s += cev('content_block_stop', { index: 0 }) + cev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null, stop_details: null }, usage: { output_tokens: 600 } }) + cev('message_stop');
  return sse(c, s);
};
const BACKUP_OPTS = { maxRetries: 0, watchdogs: { firstByteTimeoutMs: 2000, idleTimeoutMs: 2000, totalTimeoutMs: 5000 } };

describe('POST /api/proposal with the real drafting engine', () => {
  test('a full draft from Model Studio streams section by section and ends with a complete draft', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const calls: Call[] = [];
    const fetchImpl = router([qwenOk([L.exec, L.need1, L.need2, L.outcome, L.whyEcs, L.whyRds, L.tradeoff, L.next])], [], calls);
    const ctx = makeCtx();
    const events = await ndjson(await handleProposal(propReq(line(proposal())), env, ctx, user, { fetchImpl, log: () => undefined }));
    await ctx.flush();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.model, 'qwen3.8-max');
    assert.equal(events.filter((e) => e.type === 'section').length, 8);
    const done = events.at(-1) as { type: string; draft: ProposalDraft };
    assert.equal(done.type, 'done');
    assert.equal(done.draft.complete, true);
    assert.deepEqual(Object.keys(done.draft.why).sort(), ['ecs', 'rds']);
    assert.equal((await usageRow(env, user.id))?.turns, 1);
  });

  test('the content filter stops Model Studio and there is no backup: fatal content-filtered, nothing upstream leaks', async () => {
    const env = makeEnv();
    const user = await approved(env);
    const ctx = makeCtx();
    const res = await handleProposal(propReq(line(proposal())), env, ctx, user, { fetchImpl: router([qwenFiltered], [], []), log: () => undefined });
    const text = await res.text();
    await ctx.flush();
    const last = JSON.parse(text.trim().split('\n').at(-1)!) as Record<string, unknown>;
    assert.deepEqual([last.type, last.code], ['fatal', 'content-filtered']);
    assert.match(String(last.message), /basic version/);
    assert.ok(!HIDDEN.test(text));
    assert.equal(await inflight(env), null);
  });

  test('the filter stops Model Studio mid-draft and the backup finishes it: done, 2 turns, its cost booked, no trace of it on the wire', async () => {
    const env = makeEnv({ ANTHROPIC_API_KEY: CLAUDE_KEY, CLAUDE_BACKUP_MODEL: 'claude-opus-5-5' });
    const user = await approved(env);
    const calls: Call[] = [];
    const fetchImpl = router([qwenFilteredMid([L.exec, L.need1])], [claudeOk([L.need2, L.outcome, L.whyEcs, L.whyRds, L.named, L.tradeoff, L.next])], calls);
    const ctx = makeCtx();
    const logs: string[] = [];
    const res = await handleProposal(propReq(line(proposal())), env, ctx, user, { fetchImpl, backupOptions: BACKUP_OPTS, log: (l) => logs.push(l) });
    const text = await res.text();
    await ctx.flush();
    assert.deepEqual(calls.map((c) => c.host), ['dashscope-intl.aliyuncs.com', 'api.anthropic.com']);
    const events = text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
    assert.deepEqual(events.filter((e) => e.type === 'status').map((e) => e.code), ['finish']);
    const done = events.at(-1) as { type: string; draft: ProposalDraft };
    assert.equal(done.type, 'done');
    assert.equal(done.draft.complete, true);
    assert.ok(!HIDDEN.test(text), 'the wire never names who wrote a line');
    assert.ok(!text.includes(CLAUDE_KEY.slice(0, 12)) && !text.includes(API_KEY.slice(0, 12)), 'keys redacted');
    const u = await usageRow(env, user.id);
    assert.equal(u?.turns, 2);
    assert.equal(u?.rescues, 1);
    assert.ok((u?.claude_cost_usd ?? 0) > 0);
    assert.equal(await inflight(env), null);
    const log = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.evt === 'proposal')!;
    assert.equal(log.backupUsed, true);
    assert.ok(!logs.join('\n').includes('PostgreSQL'), 'no drafted text in the log');
  });
});

describe('POST /api/proposal routes', () => {
  const body = line(proposal());
  test('signed out: 401 with a fatal body and the proposal copy (no "Your diagram is unchanged")', async () => {
    const env = makeEnv();
    const res = await call(env, req('/api/proposal', { method: 'POST', type: 'application/json', body }));
    assert.equal(res.status, 401);
    const ev = (await res.json()) as { type: string; code: string; message: string };
    assert.deepEqual([ev.type, ev.code], ['fatal', 'signed-out']);
    assert.match(ev.message, /basic version/);
    assert.doesNotMatch(ev.message, /diagram/);
  });

  test('not approved: 403 with a fatal body', async () => {
    const env = makeEnv();
    const { cookie } = await signIn(env, 'pending@example.com');
    const res = await call(env, req('/api/proposal', { method: 'POST', type: 'application/json', body, cookie }));
    assert.equal(res.status, 403);
    const ev = (await res.json()) as { type: string; code: string; message: string };
    assert.deepEqual([ev.type, ev.code], ['fatal', 'not-approved']);
    assert.match(ev.message, /basic version/);
  });

  test('approved: GET is 405; a cross-site POST is refused; a POST reaches the handler', async () => {
    const env = makeEnv();
    const { cookie } = await signIn(env, 'user@example.com', { status: 'approved' });
    const get = await call(env, req('/api/proposal', { cookie }));
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('Allow'), 'POST');
    assert.equal(((await get.json()) as { code: string }).code, 'method-not-allowed');
    const cross = await call(env, req('/api/proposal', { method: 'POST', type: 'application/json', body, cookie, origin: 'https://evil.example' }));
    assert.equal(cross.status, 403);
    // the request checks run (a bad body is the handler's 400, not a 404)
    const bad = await call(env, req('/api/proposal', { method: 'POST', type: 'application/json', body: '{bad', cookie }));
    assert.equal(bad.status, 400);
    assert.equal(((await bad.json()) as { code: string }).code, 'bad-json');
  });
});
