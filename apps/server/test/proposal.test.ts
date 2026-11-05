// POST /api/proposal on the local server: the same request checks as /api/turn (Host, Origin, method, content type,
// body size, JSON, then the ProposalRequest shape and lang/title/customer limits, key configured, the in-flight cap),
// CORS as /api/turn, NDJSON lines in order ending with done or fatal, the failure codes, abort on disconnect and on the
// deadline, the backup passed to the engine but never named on the wire, key redaction, and a log entry without text
// even with LOG_CONTENT=1. Most tests inject the drafting engine (deps.draft); one runs the real draftProposal over a
// fake Model Studio. Each test server listens on 127.0.0.1 in the 5160-5169 range.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Catalog, ProposalDraft, ProposalRequest, ProposalSection, SessionMemory } from '../../../packages/core/src/types.ts';
import type { DraftProposalOptions, DraftProposalResult, DraftStats } from '../../../packages/core/src/proposal.ts';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { configFromEnv } from '../src/config.ts';
import type { ServerConfig } from '../src/config.ts';
import { createTurnServer } from '../src/server.ts';
import type { ServerDeps, TurnServer } from '../src/server.ts';
import { checkProposalRequest } from '../src/request.ts';
import { PROPOSAL_FATAL_COPY, PROPOSAL_STATUS_COPY, proposalEndEvent } from '../src/messages.ts';

const CAT = loadCatalog();
const KEY = 'sk-test-SECRET-0123456789abcdef';
const CLAUDE_KEY = 'sk-ant-api03-CLAUDE-SECRET-0123456789abcdef';
const ORIGIN = 'http://localhost:5174';
// A design's own Qwen models may be named in step sections (PLAN.md D7); the backend's vendor names may not.
const HIDDEN = new RegExp(['cl' + 'aude', 'anth' + 'ropic', 'DataInspection', 'inappropriate'].join('|'), 'i');
const line = (o: unknown): string => JSON.stringify(o);
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

const proposal = (o: Partial<ProposalRequest> = {}): ProposalRequest => ({ sessionId: 'sess-1', lang: 'en', title: 'Ticketing platform', customer: 'Seoul Live', memory: memory(), ...o });

// ---------- an injected drafting engine ----------

const S: Record<string, ProposalSection> = {
  exec: { k: 'exec', text: 'Seoul Live lost 40 minutes of sales during a big on-sale.\n\nThis design keeps the site up during spikes.' },
  need: { k: 'need', id: 'n1', need: 'Stay up during on-sales', source: 'stated', quote: 'crashed for 40 minutes', answer: 'Compute scales out before the spike.', products: ['ecs'] },
  whyEcs: { k: 'why', product: 'ecs', text: 'Outages during on-sales lose revenue. ECS adds capacity in minutes.' },
};
const DRAFT: ProposalDraft = { lang: 'en', exec: 'Seoul Live lost 40 minutes of sales.', needs: [], outcomes: [], why: { ecs: 'Outages lose revenue.' }, tradeoffs: [], next: [], complete: false };
const stats = (o: Partial<DraftStats> = {}): DraftStats => ({ model: 'qwen3.8-max', servedBy: 'qwen', fallbackUsed: false, backupUsed: false, calls: 1, costUsd: 0.02, ms: 900, sections: 3, rejectedLines: 0, lint: {}, heldUsed: 0, missing: ['outcomes'], promptTokens: 3200, completionTokens: 900, ...o });

type Script = (o: DraftProposalOptions) => Promise<DraftProposalResult>;
function fakeDraft(script: Script): { draft: (req: ProposalRequest, cat: Catalog, o: DraftProposalOptions) => Promise<DraftProposalResult>; seen: DraftProposalOptions[] } {
  const seen: DraftProposalOptions[] = [];
  return {
    seen,
    draft: async (_req, _cat, o) => {
      seen.push(o);
      return script(o);
    },
  };
}
const happy: Script = async (o) => {
  o.onSection?.(S.exec);
  o.onStatus?.('finish');
  o.onSection?.(S.need);
  o.onSection?.(S.whyEcs);
  return { outcome: 'done', draft: DRAFT, stats: stats() };
};
const untilAborted = (o: DraftProposalOptions): Promise<DraftProposalResult> =>
  new Promise((resolve) => o.signal?.addEventListener('abort', () => resolve({ outcome: 'aborted', draft: null, stats: stats() }), { once: true }));

// ---------- server and client helpers ----------

let nextPort = 5160;
const logDir = mkdtempSync(path.join(tmpdir(), 'proposal-server-test-'));

async function start(over: Partial<ServerDeps> & { configPatch?: Partial<ServerConfig> } = {}): Promise<{ srv: TurnServer; base: string; logFile: string }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const port = nextPort++;
    if (nextPort > 5169) nextPort = 5160;
    const logFile = path.join(logDir, `turns-${port}-${Date.now()}.jsonl`);
    const config: ServerConfig = { ...configFromEnv({ PORT: String(port), TURN_LOG: logFile, LOG_CONTENT: '1' }), ...(over.configPatch ?? {}) };
    const { configPatch: _patch, ...deps } = over;
    const srv = createTurnServer({ catalog: CAT, apiKey: KEY, ...deps, config });
    try {
      await srv.listen(port);
      return { srv, base: `http://127.0.0.1:${port}`, logFile };
    } catch (e) {
      if ((e as { code?: string }).code !== 'EADDRINUSE') throw e;
    }
  }
  throw new Error('no free port in 5160-5169');
}

const post = (base: string, body: string, headers: Record<string, string> = {}): Promise<Response> =>
  fetch(`${base}/api/proposal`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers }, body });

async function events(res: Response): Promise<Array<Record<string, unknown>>> {
  return (await res.text())
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

const until = async (cond: () => boolean, ms = 3000): Promise<void> => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 10));
  }
};

const logLines = (file: string): Array<Record<string, unknown>> => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []);

// ---------- tests ----------

test('proposal audience accepts both perspectives and rejects unknown audiences', () => {
  for (const audience of ['client', 'alibaba'] as const) {
    const result = checkProposalRequest(proposal({ audience }));
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.audience, audience);
  }
  assert.equal(checkProposalRequest(proposal()).ok, true);
  assert.equal(checkProposalRequest({ ...proposal(), audience: 'sales-pitch' }).ok, false);
});

describe('POST /api/proposal on the local server', () => {
  test('streams sections and statuses, ends with done; CORS as /api/turn; a log entry without text', async () => {
    const f = fakeDraft(happy);
    const { srv, base, logFile } = await start({ draft: f.draft });
    try {
      const res = await post(base, line(proposal()));
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/x-ndjson; charset=utf-8');
      assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
      const evs = await events(res);
      assert.deepEqual(
        evs.map((e) => (e.type === 'section' ? `section:${(e.section as ProposalSection).k}` : e.type === 'status' ? `status:${e.code}` : e.type)),
        ['section:exec', 'status:finish', 'section:need', 'section:why', 'done'],
      );
      assert.deepEqual(evs.at(-1), { type: 'done', draft: DRAFT });
      assert.deepEqual(evs[1], { type: 'status', code: 'finish', text: PROPOSAL_STATUS_COPY.finish.en });
      const o = f.seen[0];
      assert.equal(o.apiKey, KEY);
      assert.equal(o.model, 'qwen3.8-max');
      assert.ok(o.signal instanceof AbortSignal);
      assert.ok(o.msLeft!() > 350_000);
      assert.equal(o.backup, undefined);
      assert.equal(srv.inFlight().turns, 0);
      await srv.close();
      const entry = logLines(logFile).find((l) => l.route === '/api/proposal')!;
      assert.equal(entry.outcome, 'done');
      assert.equal(entry.sections, 3);
      const text = readFileSync(logFile, 'utf8');
      for (const s of [ASK, 'Seoul Live', 'Ticketing platform', 'Outages during on-sales', 'sess-1']) assert.ok(!text.includes(s), `no text in the log, even with LOG_CONTENT=1: ${s}`);
    } finally {
      await srv.close();
    }
  });

  test('request checks: each 4xx, in /api/turn order; nothing drafted', async () => {
    const f = fakeDraft(happy);
    const { srv, base } = await start({ draft: f.draft });
    const noKey = await start({ draft: f.draft, apiKey: undefined });
    try {
      const code = async (res: Response): Promise<string> => `${res.status} ${((await res.json()) as { code: string }).code}`;
      assert.equal(await code(await post(base, line(proposal()), { 'Content-Type': 'text/plain' })), '415 unsupported-media-type');
      assert.equal(await code(await post(base, 'x'.repeat(512 * 1024 + 1))), '413 body-too-large');
      assert.equal(await code(await post(base, '{nope')), '400 bad-json');
      assert.equal(await code(await post(base, line(proposal({ sessionId: 'bad id!' })))), '400 bad-request');
      assert.equal(await code(await post(base, line(proposal({ lang: 'fr' as 'en' })))), '400 bad-request');
      assert.equal(await code(await post(base, line(proposal({ title: 'x'.repeat(161) })))), '400 bad-request');
      assert.equal(await code(await post(base, line(proposal({ customer: 'y'.repeat(81) })))), '400 bad-request');
      assert.equal(await code(await post(base, line({ ...proposal(), memory: null }))), '400 bad-request');
      assert.equal(await code(await post(base, line(proposal()), { Origin: 'http://evil.example' })), '403 bad-origin');
      assert.equal(await code(await fetch(`${base}/api/proposal`, { headers: { Origin: ORIGIN } })), '405 method-not-allowed');
      assert.equal(await code(await post(noKey.base, line(proposal({ lang: 'ko' })))), '503 no-key');
      const pre = await fetch(`${base}/api/proposal`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' } });
      assert.equal(pre.status, 204);
      assert.equal(pre.headers.get('access-control-allow-origin'), ORIGIN);
      assert.equal(f.seen.length, 0);
    } finally {
      await srv.close();
      await noKey.srv.close();
    }
  });

  test('a draft counts against the in-flight cap: 429 server-busy while one runs', async () => {
    const f = fakeDraft(async (o) => {
      o.onSection?.(S.exec);
      return untilAborted(o);
    });
    const { srv, base } = await start({ draft: f.draft, configPatch: { maxInFlight: 1 } });
    try {
      const ac = new AbortController();
      const first = await fetch(`${base}/api/proposal`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: line(proposal()), signal: ac.signal });
      const reader = first.body!.getReader();
      await reader.read();
      const second = await post(base, line(proposal({ sessionId: 'other' })));
      assert.equal(second.status, 429);
      assert.equal(((await second.json()) as { code: string }).code, 'server-busy');
      ac.abort();
      await until(() => srv.inFlight().turns === 0);
      assert.equal(f.seen[0].signal?.aborted, true, 'a disconnect aborts the draft');
    } finally {
      await srv.close();
    }
  });

  test('failures map to neutral fatals in the PDF language; a throw is internal; nothing upstream leaks', async () => {
    const cases: Array<[DraftProposalResult['error'] | 'throw', string]> = [
      [{ code: 'content-filtered', message: 'The draft was stopped by a content check.' }, 'content-filtered'],
      [{ code: 'timeout', message: 'The writer did not answer in time.' }, 'draft-timeout'],
      [{ code: 'upstream', message: 'The drafting service failed.' }, 'draft-failed'],
      ['throw', 'internal'],
    ];
    for (const [err, code] of cases) {
      const f = fakeDraft(async () => {
        if (err === 'throw') throw new Error('boom ' + KEY);
        return { outcome: 'failed', draft: null, error: err, stats: stats() };
      });
      const { srv, base } = await start({ draft: f.draft });
      try {
        const text = await (await post(base, line(proposal({ lang: 'zh' })))).text();
        const last = JSON.parse(text.trim().split('\n').at(-1)!) as Record<string, unknown>;
        assert.deepEqual([last.type, last.code], ['fatal', code]);
        assert.equal(last.message, PROPOSAL_FATAL_COPY[code as keyof typeof PROPOSAL_FATAL_COPY].zh);
        assert.ok(!/boom|writer did not|drafting service|content check/.test(text));
        assert.ok(!text.includes(KEY));
      } finally {
        await srv.close();
      }
    }
  });

  test('the deadline aborts the draft: fatal draft-timeout', async () => {
    const f = fakeDraft(async (o) => {
      o.onSection?.(S.exec);
      return untilAborted(o);
    });
    const { srv, base } = await start({ draft: f.draft, proposalDeadlineMs: 80 });
    try {
      const evs = await events(await post(base, line(proposal())));
      assert.deepEqual([evs[0].type, evs.at(-1)!.type, evs.at(-1)!.code], ['section', 'fatal', 'draft-timeout']);
      assert.equal(f.seen[0].signal?.aborted, true);
      assert.equal(srv.inFlight().turns, 0);
    } finally {
      await srv.close();
    }
  });

  test('with the backup configured: the engine gets it; the wire never names it; keys are redacted', async () => {
    const f = fakeDraft(async (o) => {
      assert.ok(o.backup, 'the backup is passed');
      o.onStatus?.('finish');
      o.onSection?.({ k: 'next', text: `Rotate ${KEY} and ${CLAUDE_KEY}.` });
      return { outcome: 'done', draft: DRAFT, stats: stats({ servedBy: 'claude', backupUsed: true }) };
    });
    const { srv, base } = await start({ draft: f.draft, backup: { apiKey: CLAUDE_KEY, model: 'claude-opus-5-5' } });
    try {
      const text = await (await post(base, line(proposal()))).text();
      assert.ok(!HIDDEN.test(text));
      assert.ok(!/provider|servedBy|"model"/.test(text));
      assert.ok(!text.includes(KEY.slice(0, 12)) && !text.includes(CLAUDE_KEY.slice(0, 12)));
      assert.match(text, /\[redacted\]/);
    } finally {
      await srv.close();
    }
  });

  test('the real drafting engine over a fake Model Studio', async () => {
    const sseEv = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
    const lines = [
      line({ k: 'exec', text: 'Seoul Live lost 40 minutes of sales.\n\nThis design keeps the site up.' }),
      line({ k: 'need', id: 'x', need: 'Stay up during on-sales', source: 'stated', quote: 'crashed for 40 minutes', answer: 'Compute scales out.', products: ['ecs'] }),
      line({ k: 'need', id: 'x', need: 'Keep PostgreSQL', source: 'stated', quote: 'Keep PostgreSQL', answer: 'Managed PostgreSQL.', products: ['rds'] }),
      line({ k: 'outcome', title: 'Sales keep flowing', text: 'Spikes no longer take the site down.' }),
      line({ k: 'why', product: 'ecs', text: 'Outages lose revenue. ECS adds capacity in minutes.' }),
      line({ k: 'why', product: 'rds', text: 'Your team knows PostgreSQL. RDS keeps it managed.' }),
      line({ k: 'tradeoff', text: 'Scaling has a short warm-up.', mitigation: 'Scale out before each on-sale.' }),
      line({ k: 'next', text: 'Run a load test at 30x traffic.' }),
    ].join('\n') + '\n';
    let body = sseEv({ choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] });
    for (let i = 0; i < lines.length; i += 50) body += sseEv({ choices: [{ index: 0, delta: { content: lines.slice(i, i + 50) } }] });
    body += sseEv({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + sseEv({ choices: [], usage: { prompt_tokens: 3000, completion_tokens: 800 } }) + 'data: [DONE]\n\n';
    const models: string[] = [];
    const fetchImpl = (async (_u: string | URL | Request, init?: RequestInit) => {
      models.push(String((JSON.parse(String(init!.body)) as { model: string }).model));
      return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }) as typeof fetch;
    const { srv, base } = await start({ fetchImpl });
    try {
      const evs = await events(await post(base, line(proposal())));
      assert.deepEqual(models, ['qwen3.8-max']);
      assert.equal(evs.filter((e) => e.type === 'section').length, 8);
      const done = evs.at(-1) as { type: string; draft: ProposalDraft };
      assert.equal(done.type, 'done');
      assert.equal(done.draft.complete, true);
    } finally {
      await srv.close();
    }
  });
});

describe('checkProposalRequest and the end event', () => {
  test('a fresh copy from known fields; cover fields default to empty; limits in code points', () => {
    const r = checkProposalRequest({ ...proposal(), extra: 'x', __proto__: { polluted: true } });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(Object.keys(r.value).sort(), ['customer', 'lang', 'memory', 'sessionId', 'title']);
    const bare = checkProposalRequest({ sessionId: 's', lang: 'ko', memory: memory() });
    assert.ok(bare.ok && bare.value.title === '' && bare.value.customer === '');
    assert.ok(checkProposalRequest({ ...proposal(), customer: '가'.repeat(80) }).ok);
    const bad = checkProposalRequest({ ...proposal(), customer: '가'.repeat(81) });
    assert.ok(!bad.ok && /customer/.test(bad.message));
    const lang = checkProposalRequest({ ...proposal(), lang: 'EN' });
    assert.ok(!lang.ok && /lang/.test(lang.message));
  });

  test('proposalEndEvent: done, timeouts, failures, and nothing when the browser left', () => {
    const x = { deadlineHit: false, clientGone: false };
    assert.deepEqual(proposalEndEvent({ outcome: 'done', draft: DRAFT }, x, 'en'), { type: 'done', draft: DRAFT });
    assert.equal(proposalEndEvent({ outcome: 'aborted', draft: null }, { deadlineHit: true, clientGone: false }, 'en')?.type === 'fatal' && 'draft-timeout', 'draft-timeout');
    assert.equal(proposalEndEvent({ outcome: 'aborted', draft: null }, { deadlineHit: false, clientGone: true }, 'en'), null);
    const f = proposalEndEvent({ outcome: 'failed', draft: null, error: { code: 'empty', message: 'm' } }, x, 'ko');
    assert.deepEqual(f, { type: 'fatal', code: 'draft-failed', message: PROPOSAL_FATAL_COPY['draft-failed'].ko, retryable: true });
    const cf = proposalEndEvent({ outcome: 'failed', draft: null, error: { code: 'content-filtered', message: 'm' } }, x, 'en');
    assert.deepEqual(cf, { type: 'fatal', code: 'content-filtered', message: PROPOSAL_FATAL_COPY['content-filtered'].en, retryable: false });
  });

  test('the proposal copy never names a vendor, a model or a content filter', () => {
    const all = [...Object.values(PROPOSAL_FATAL_COPY), ...Object.values(PROPOSAL_STATUS_COPY)].flatMap((c) => Object.values(c)).join('\n');
    assert.ok(!HIDDEN.test(all));
    assert.ok(!/model|filter|provider|AI\b/i.test(all));
  });
});
