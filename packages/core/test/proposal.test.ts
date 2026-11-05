// The proposal writer (proposal.ts, proposal-prompt.ts) with no network: the line validator and its caps, the draft
// assembly, the prompt (the customer's corrections in, only the design's catalog facts in), and draftProposal over a fake
// Model Studio stream: the happy path, a stall retried once, a cut-off draft continued once, the content
// filter handing the draft to the backup (gated, booked, never named), and the caller's abort. Also the Claude backup's
// complete() over a stubbed SDK fetch.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../src/catalog-node.ts';
import { assembleDraft, buildProposalMessages, capText, draftProposal, leadWithEngagement, lintSection, parseProposalLine, proposalCtx, PROPOSAL_LIMITS, regionWords } from '../src/proposal.ts';
import type { DraftProposalOptions } from '../src/proposal.ts';
import { PROPOSAL_KEEP_LAST, estimateProposalTokens, proposalEditorialMessages } from '../src/proposal-prompt.ts';
import { calculateSolutionEstimate, pricingDesignKey } from '../src/solution-pricing.ts';
import { BACKUP_MIN_MS_LEFT } from '../src/llm.ts';
import { needsApproval } from '../src/approval.ts';
import type { BackupCall, BackupCompleteOptions, BackupCompleteResult, BackupProvider } from '../src/llm.ts';
import { BACKUP_TEXT_VOICE_NOTE, createClaudeBackup } from '../src/claude.ts';
import type { ProposalRequest, ProposalSection, SessionMemory } from '../src/types.ts';

const CAT = loadCatalog();
const enc = new TextEncoder();
const line = (o: unknown): string => JSON.stringify(o);

// ---------- the session ----------

const PAIN = 'Last Black Friday our ticket site crashed for two hours and we lost a lot of sales.';
const CORRECTION = 'About the assumption “MySQL is the database”: we must use PostgreSQL because our team already knows it.';

function memory(): SessionMemory {
  return {
    turns: [
      { role: 'user', text: `We sell concert tickets online from Singapore. ${PAIN} We need the site to survive sales spikes.` },
      { role: 'assistant', text: 'I drew a web tier behind a load balancer across two zones, with a managed database.', changes: '+alb +ecs(a,b) +rds +waf(badge on alb) +oss' },
      { role: 'user', text: CORRECTION },
      { role: 'assistant', text: 'Switched the database to PostgreSQL on RDS.', changes: '~rds' },
    ],
    summary: '',
    requirements: ['Customer data stays in Singapore', 'No Kubernetes'],
    constraints: [
      { text: 'Customer data stays in Singapore', regions: ['ap-southeast-1'] },
      { text: 'No Kubernetes', avoid: ['ack'] },
    ],
    assumptions: [{ id: 'traffic', text: 'Peak traffic is about ten times normal', alt: 'Peak is fifty times normal' }],
    questions: [{ id: 'dr', text: 'Do you need a disaster recovery copy in a second region?', options: ['Yes', 'No'] }],
    graph: {
      groups: {
        sg: { id: 'sg', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
        vpc: { id: 'vpc', kind: 'vpc', label: 'Ticketing VPC', parent: 'sg' },
      },
      nodes: {
        users: { id: 'users', product: 'users', label: 'Ticket buyers', group: null },
        oss: { id: 'oss', product: 'oss', label: 'Static assets', group: 'sg', why: 'Holds images and the static site.' },
        rds: { id: 'rds', product: 'rds', label: 'Orders DB (PostgreSQL)', group: 'vpc', why: 'Stores orders.' },
        ecs: { id: 'ecs', product: 'ecs', label: 'Web servers', group: 'vpc', zones: ['a', 'b'], why: 'Runs the ticket site.' },
        alb: { id: 'alb', product: 'alb', label: 'Load balancer', group: 'vpc', why: 'Spreads traffic.' },
        waf: { id: 'waf', product: 'waf', label: 'WAF', group: 'vpc', attachTo: 'alb', why: 'Blocks bots.' },
      },
      edges: {
        e1: { id: 'e1', from: 'users', to: 'alb', label: 'HTTPS' },
        e2: { id: 'e2', from: 'alb', to: 'ecs' },
        e3: { id: 'e3', from: 'ecs', to: 'rds', label: 'SQL' },
      },
      recs: [],
    },
    tombstones: [],
  };
}

const request = (o: Partial<ProposalRequest> = {}): ProposalRequest => ({ sessionId: 's1', lang: 'en', title: 'Ticketing platform', customer: 'Acme Tickets', memory: memory(), ...o });
const CTX = proposalCtx(request(), CAT);
const PRODUCTS = ['alb', 'waf', 'ecs', 'rds', 'oss'];

const L = {
  exec: line({ k: 'exec', text: 'Acme Tickets lost sales when the site crashed on Black Friday.\n\nWe propose a web tier that grows with demand.\n\nSales keep flowing at peak.' }),
  need1: line({ k: 'need', id: 'x', need: 'Stay online during sales spikes', source: 'stated', quote: 'ticket site crashed for two hours', answer: 'Two zones and a load balancer keep selling when one part fails.', products: ['alb', 'ecs'] }),
  need2: line({ k: 'need', id: 'x', need: 'Keep the database the team knows', source: 'stated', quote: 'our team already knows it', answer: 'Keeping PostgreSQL, which the team knows, avoids retraining.', products: ['rds'] }),
  outcome1: line({ k: 'outcome', title: 'Sales protected at peak', text: 'Capacity follows demand.' }),
  outcome2: line({ k: 'outcome', title: 'Lower risk of fraud', text: 'Bots are filtered before they reach checkout.' }),
  whys: PRODUCTS.map((p) => line({ k: 'why', product: p, text: `Why ${p} matters to the business.` })),
  tradeoff: line({ k: 'tradeoff', text: 'Peak traffic is assumed.', mitigation: 'Confirm the expected peak.' }),
  next1: line({ k: 'next', text: 'Confirm the expected peak traffic.' }),
  next2: line({ k: 'next', text: 'Run a load test before the next big sale.' }),
};
const FULL = [L.exec, L.need1, L.need2, L.outcome1, L.outcome2, ...L.whys, L.tradeoff, L.next1, L.next2];

const CHAPTERS = [
  { k: 'section' as const, title: 'Protect the next ticket release', text: 'Alibaba Cloud ECS places the ticketing application behind a shared entry point so demand can be spread across the proposed web servers. This addresses the sales spike the customer described.\n\nA load test using the expected ticket-release pattern would show whether this arrangement is sufficient before rollout.' },
  { k: 'section' as const, title: 'Keep the database the team knows', text: 'The proposed RDS database retains PostgreSQL, matching the team’s stated experience. This makes database familiarity part of the design choice rather than introducing a separate retraining decision.\n\nThe first validation should exercise a representative ticket reservation and confirm that the recorded order matches the response seen by the buyer.' },
];

describe('audience-specific authored reports', () => {
  test('compact editorial evidence preserves rejection, revision loops and selected AI models', () => {
    const req = workflowRequest();
    req.memory.workflow!.edges = {
      reject: { id: 'reject', from: 'review', to: 'end', outcome: 'reject' },
      edit: { id: 'edit', from: 'review', to: 'draft', outcome: 'edit', kind: 'loop', max: 2 },
    };
    const messages = proposalEditorialMessages(req, CAT, []);
    const evidence = JSON.parse(String(messages[1].content));
    assert.deepEqual(evidence.workflow.links, [
      { id: 'reject', from: 'review', to: 'end', outcome: 'reject' },
      { id: 'edit', from: 'review', to: 'draft', outcome: 'edit', kind: 'loop', max: 2 },
    ]);
    assert.equal(evidence.workflow.steps.find((step: { id: string }) => step.id === 'end').kind, 'end');
    assert.equal(evidence.workflow.steps.find((step: { id: string }) => step.id === 'draft').ai, 'qwen3.5-plus');
    assert.match(String(messages[0].content), /only an explicit loop returns for revision/);
  });
  test('both writing passes follow the diagram approval policy, including settings-only changes and explicit node precedence', () => {
    const req = workflowRequest();
    req.memory.workflow!.nodes.send = { id: 'send', kind: 'act', label: 'Send reply', effect: 'send', runs: 'customer' };
    req.memory.workflow!.nodes.edit = { id: 'edit', kind: 'act', label: 'Update stock', effect: 'write', approval: 'skip' };
    req.memory.workflow!.nodes.pay = { id: 'pay', kind: 'act', label: 'Pay supplier', effect: 'pay', approval: 'required' };
    const evidence = () => {
      const editorial = JSON.parse(String(proposalEditorialMessages(req, CAT, [])[1].content));
      const continuation = String(buildProposalMessages(req, CAT)[1].content).split('\n')
        .filter(line => line.startsWith('{')).map(line => JSON.parse(line))
        .filter(value => 'effectiveApproval' in value);
      return [editorial.workflow.steps, continuation] as Array<Array<{ id: string; effect?: string; effectiveApproval: string }>>;
    };
    const original = String(proposalEditorialMessages(req, CAT, [])[1].content);
    for (const pass of evidence()) assert.equal(pass.find(step => step.id === 'send')!.effectiveApproval, 'required');
    req.memory.workflowSettings = { approvalOff: ['send', 'pay'], approvalOn: ['write'] };
    assert.notEqual(String(proposalEditorialMessages(req, CAT, [])[1].content), original, 'a setting-only edit changes writer evidence');
    for (const pass of evidence()) {
      for (const node of Object.values(req.memory.workflow!.nodes)) {
        assert.equal(pass.find(step => step.id === node.id)!.effectiveApproval,
          needsApproval(node, req.memory.workflowSettings) ? 'required' : 'not-required', node.id);
      }
      assert.equal(pass.find(step => step.id === 'send')!.effectiveApproval, 'not-required');
      assert.equal(pass.find(step => step.id === 'edit')!.effectiveApproval, 'not-required', 'explicit skip beats approvalOn');
      assert.equal(pass.find(step => step.id === 'pay')!.effectiveApproval, 'required', 'explicit required beats approvalOff');
      assert.equal(pass.find(step => step.id === 'send')!.effect, 'send');
    }
  });

  test('region, repeat and usage changes are preserved in both evidence packs with consistent aliased references', () => {
    const req = workflowRequest();
    const baseline = String(proposalEditorialMessages(req, CAT, [])[1].content);
    req.memory.workflowSettings = { region: 'ap-northeast-1', approvalOn: ['write'] };
    req.memory.workflow!.groups['claude-items'] = { id: 'claude-items', over: 'Each store', parallel: true };
    req.memory.workflow!.nodes.draft.repeat = 'claude-items';
    req.memory.workflow!.nodes.review.subject = 'draft';
    req.memory.workflow!.edges.edit = { id: 'edit', from: 'review', to: 'draft', kind: 'loop', outcome: 'edit', max: 2 };
    req.memory.estimate = { runsPerMonth: 1200, scope: 'international', items: { 'claude-items': { typical: 2, upper: 5 } },
      loops: { edit: { typical: 1, upper: 2 } }, steps: { draft: { inTokens: 1800, outTokens: 250, thinking: true } } };
    const raw = String(proposalEditorialMessages(req, CAT, [])[1].content);
    assert.notEqual(raw, baseline);
    const workflow = JSON.parse(raw).workflow;
    assert.equal(workflow.settings.region, 'Tokyo');
    assert.equal(workflow.settings.regionSource, 'selected');
    assert.deepEqual(workflow.settings.approvalOn, ['write']);
    assert.equal(workflow.groups[0].over, 'Each store');
    assert.equal(workflow.groups[0].parallel, true);
    const groupId = workflow.groups[0].id;
    assert.notEqual(groupId, 'claude-items');
    assert.equal(workflow.steps.find((step: { id: string }) => step.id === 'draft').repeat, groupId);
    assert.equal(workflow.steps.find((step: { id: string }) => step.id === 'review').subject, 'draft');
    assert.deepEqual(workflow.usage.items[groupId], { typical: 2, upper: 5 });
    assert.equal(workflow.usage.runsPerMonth, 1200);
    assert.deepEqual(workflow.usage.loops.edit, { typical: 1, upper: 2 });
    assert.equal(workflow.usage.steps.draft.thinking, true);
    const continuation = String(buildProposalMessages(req, CAT)[1].content);
    assert.ok(continuation.includes(JSON.stringify(workflow.settings)));
    assert.ok(continuation.includes(JSON.stringify(workflow.groups[0])));
    assert.ok(continuation.includes(JSON.stringify(workflow.usage)));
    assert.doesNotMatch(raw + continuation, /claude-items/);
    assert.match(continuation, /scenario settings, not confirmed customer quantities/);
  });

  test('compact catalog evidence keeps restrictions and caveats so a service is not pitched as generally available', () => {
    const req = workflowRequest();
    const catalog = { ...CAT, byId: new Map(CAT.byId) };
    catalog.byId.set('model-studio', { ...catalog.byId.get('model-studio')!, status: 'preview', availability: 'restricted',
      regions: ['ap-southeast-1'], note: 'Existing approved accounts only.', avoidWhen: 'New accounts without access.' });
    const evidence = JSON.parse(String(proposalEditorialMessages(req, catalog, ['model-studio'])[1].content));
    assert.equal(evidence.services[0].status, 'preview');
    assert.equal(evidence.services[0].availability, 'restricted');
    assert.equal(evidence.services[0].note, 'Existing approved accounts only.');
    assert.equal(evidence.services[0].avoidWhen, 'New accounts without access.');
    assert.deepEqual(evidence.services[0].regions, ['Singapore']);
    assert.ok(evidence.services[0].verified);
    const continuation = String(buildProposalMessages(req, catalog)[1].content);
    assert.match(continuation, /in preview; restricted for new international accounts/);
    assert.match(continuation, /Existing approved accounts only/);
    assert.match(continuation, /Known international regions: Singapore/);
  });

  test('custom chapters preserve paragraphs and products, and replace fixed inventories for both audiences', () => {
    for (const audience of ['client', 'alibaba'] as const) {
      const ctx = proposalCtx(request({ audience }), CAT);
      const chapters = CHAPTERS.map(s => parseProposalLine(line(s), ctx)!);
      assert.deepEqual(chapters, CHAPTERS);
      const draft = assembleDraft([parseProposalLine(L.exec, ctx)!, ...chapters, parseProposalLine(L.next2, ctx)!], ctx);
      assert.equal(draft.audience, audience);
      assert.equal(draft.complete, true);
      assert.equal(draft.sections?.length, 2);
      assert.deepEqual(draft.needs, []);
      assert.deepEqual(draft.why, {});
      assert.equal(assembleDraft([parseProposalLine(L.exec, ctx)!, chapters[0], parseProposalLine(L.next2, ctx)!], ctx).complete, false);
    }
    assert.equal(assembleDraft([], CTX).audience, 'client');
  });

  test('chapters remain subject to factual checks and minimum substance', () => {
    assert.equal(parseProposalLine(line({ ...CHAPTERS[0], text: 'A heading with no explanation.' }), CTX), null);
    assert.equal(parseProposalLine(line({ ...CHAPTERS[0], text: CHAPTERS[0].text + ' This guarantees zero downtime.' }), CTX), null);
    assert.equal(parseProposalLine(line({ ...CHAPTERS[0], text: CHAPTERS[0].text + ' This meets the legal compliance requirement.' }), CTX), null);
    assert.equal(parseProposalLine(line({ ...CHAPTERS[0], text: CHAPTERS[0].text + ' The model is Qwen99-max.' }), CTX), null);
    assert.equal(parseProposalLine(line({ ...CHAPTERS[0], text: CHAPTERS[0].text + ' This costs USD 500.' }), CTX), null);
  });

  test('an authored cloud report cannot quote money in the summary or next steps before a chapter arrives', async () => {
    const calls: Call[] = [];
    const streamed: ProposalSection[] = [];
    const bad = [{ k: 'exec', text: 'The project costs USD 500.' }, { k: 'next', text: 'Approve the USD 500 quote.' }];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([
      ok([...bad.map(line), L.exec, ...CHAPTERS.map(line), L.next2]), ok([]),
    ], calls), { onSection: s => streamed.push(s) }));
    assert.equal(r.draft?.complete, true);
    assert.equal(r.stats.lint.price, 2);
    assert.doesNotMatch(JSON.stringify(streamed), /500/);
    const assembled = assembleDraft([...bad as ProposalSection[], ...CHAPTERS], CTX);
    assert.equal(assembled.exec, '');
    assert.deepEqual(assembled.next, []);
  });

  test('initial and continuation briefs preserve the same audience and forbid unsupported marketing claims', () => {
    for (const audience of ['client', 'alibaba'] as const) {
      const req = request({ audience });
      for (const messages of [buildProposalMessages(req, CAT), proposalEditorialMessages(req, CAT, PRODUCTS)]) {
        const system = String(messages[0].content);
        assert.match(system, audience === 'client' ? /AUDIENCE: CLIENT/ : /AUDIENCE: ALIBABA PERSONNEL/);
        assert.match(system, /unsupported exclusivity, superiority, lower prices/);
        assert.match(system, /two to four section lines/);
        assert.doesNotMatch(system, /one line for EVERY|For each inline workflow step/);
      }
    }
    assert.match(String(buildProposalMessages(request(), CAT)[0].content), /AUDIENCE: CLIENT/);
  });

  test('one high-effort call can deliver an authored report without product or workflow inventories', async () => {
    const calls: Call[] = [];
    const streamed: ProposalSection[] = [];
    const req = workflowRequest();
    req.audience = 'alibaba';
    const r = await draftProposal(req, CAT, opts(fakeFetch([ok([L.exec, ...CHAPTERS.map(line), L.next2])], calls), { onSection: s => streamed.push(s) }));
    assert.equal(r.outcome, 'done');
    assert.equal(r.draft?.audience, 'alibaba');
    assert.equal(r.draft?.complete, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.thinking_budget, PROPOSAL_LIMITS.thinkingBudget);
    assert.ok(PROPOSAL_LIMITS.thinkingBudget > 16_384);
    assert.equal(calls[0].body.reasoning_effort, undefined);
    assert.deepEqual(streamed.map(s => s.k), ['exec', 'section', 'section', 'next']);
    assert.deepEqual(r.stats.missing, []);
  });

  test('a stream cut off after the summary continues with authored chapters rather than legacy inventories', async () => {
    const calls: Call[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok([L.exec]), ok([...CHAPTERS.map(line), L.next2])], calls)));
    assert.equal(r.draft?.complete, true);
    assert.equal(calls.length, 2);
    assert.match(lastUser(calls[1]), /authored section lines/);
    assert.doesNotMatch(lastUser(calls[1]), /why lines for|need lines:|outcome lines:/);
  });

  test('current pricing requires a qualitative cost interpretation before an authored draft is complete', () => {
    const req = request();
    req.pricing = { designKey: pricingDesignKey(req.memory), messages: [],
      estimate: calculateSolutionEstimate({ items: [], assumptions: [], unknowns: ['Provider transfer charge'] }) };
    const ctx = proposalCtx(req, CAT);
    const sections = [parseProposalLine(L.exec, ctx)!, ...CHAPTERS, parseProposalLine(L.next2, ctx)!];
    assert.equal(assembleDraft(sections, ctx).complete, false);
    assert.equal(assembleDraft([...sections, { k: 'cost', text: 'Confirm the provider transfer charge before choosing a migration window.' }], ctx).complete, true);
    req.memory.requirements.push('Another application');
    const stale = proposalCtx(req, CAT);
    assert.equal(stale.pricing, 'stale');
    assert.equal(assembleDraft(sections, stale).complete, true);
    assert.equal(parseProposalLine(line({ k: 'cost', text: 'The old estimate still applies.' }), stale), null);
  });
});

// ---------- fake Model Studio ----------

interface Call {
  body: Record<string, unknown>;
  signal: AbortSignal;
}
type Handler = (c: Call) => Response;

function fakeFetch(handlers: Handler[], calls: Call[] = []): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const c: Call = { body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>, signal: init!.signal! };
    calls.push(c);
    const h = handlers.shift();
    if (!h) throw new Error('fake upstream: no handler queued');
    return h(c);
  }) as typeof fetch;
}

const chunk = (delta: Record<string, unknown>, finish: string | null = null): string => `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
const USAGE = `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 3000, completion_tokens: 800, total_tokens: 3800 } })}\n\n`;

/** An SSE body that streams `text` in 37-character deltas, then a finish reason, usage and [DONE]. */
function sseOf(text: string, o: { finish?: string; tail?: string } = {}): string {
  let s = chunk({ role: 'assistant', content: '' });
  for (let i = 0; i < text.length; i += 37) s += chunk({ content: text.slice(i, i + 37) });
  if (o.tail) return s + o.tail;
  return s + chunk({}, o.finish ?? 'stop') + USAGE + 'data: [DONE]\n\n';
}

/** A 200 event stream of `body` in small reads; `hang` keeps it open afterwards until the request is aborted. */
function streamResponse(c: Call, body: string, o: { hang?: boolean; onRead?: (n: number) => void } = {}): Response {
  const bytes = enc.encode(body);
  let i = 0;
  let reads = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(ctl) {
      c.signal.addEventListener('abort', () => {
        try {
          ctl.error(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        } catch {
          /* closed */
        }
      });
    },
    pull(ctl) {
      if (i >= bytes.length) {
        if (o.hang) return new Promise<void>(() => undefined);
        ctl.close();
        return;
      }
      const end = Math.min(bytes.length, i + 96);
      ctl.enqueue(bytes.slice(i, end));
      i = end;
      o.onRead?.(++reads);
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const ok = (lines: string[], o: { finish?: string } = {}): Handler => (c) => streamResponse(c, sseOf(lines.join('\n') + '\n', o));
const hang: Handler = (c) => streamResponse(c, '', { hang: true });
const filteredHttp: Handler = () => new Response('{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content."}', { status: 400 });
const filteredMid = (lines: string[]): Handler => (c) =>
  streamResponse(c, sseOf(lines.join('\n') + '\n', { tail: `data: ${JSON.stringify({ error: { code: 'DataInspectionFailed', message: 'Output data may contain inappropriate content.' } })}\n\ndata: [DONE]\n\n` }));

/** A backup whose complete() returns `texts` in turn, streaming them through onText; records each call's messages. */
function fakeBackup(texts: string[], seen: BackupCompleteOptions[] = [], o: { finish?: string } = {}): BackupProvider {
  return {
    provider: 'claude',
    model: 'claude-opus-5-5',
    stream: () => Promise.reject(new Error('not used')),
    async complete(co: BackupCompleteOptions): Promise<BackupCompleteResult> {
      seen.push(co);
      const text = texts.shift() ?? '';
      for (let i = 0; i < text.length; i += 50) co.onText?.(text.slice(i, i + 50));
      return { text, usage: { prompt_tokens: 5000, completion_tokens: 900 }, costUsd: 0.05, costEstimated: false, finishReason: o.finish ?? 'end_turn' };
    },
  };
}

const opts = (fetchImpl: typeof fetch, o: Partial<DraftProposalOptions> = {}): DraftProposalOptions => ({ apiKey: 'sk-test-QWEN-0123', fetchImpl, ...o });
const lastUser = (c: Call): string => {
  const msgs = c.body.messages as Array<{ role: string; content: string }>;
  return msgs[msgs.length - 1].content;
};

// ---------- validation ----------

describe('parseProposalLine', () => {
  test('ignores blank lines, code fences, prose, malformed JSON and unknown kinds', () => {
    for (const l of ['', '   ', '```json', '```', 'Here is the draft:', '{"k":"exec","text":"cut off', '{"k":"intro","text":"Hello"}', '[1,2]', '{"k":"exec"}', '{"k":"exec","text":"   "}']) {
      assert.equal(parseProposalLine(l, CTX), null, l);
    }
  });

  test('exec keeps its paragraph breaks; markdown, headings, control characters and extra whitespace go', () => {
    const s = parseProposalLine(line({ k: 'exec', text: '## Summary\n**Acme**   loses  sales\u0007 at peak.\n\n\n_We propose_ a `web` tier.\nIt grows.' }), CTX);
    assert.deepEqual(s, { k: 'exec', text: 'Summary Acme loses sales at peak.\n\nWe propose a web tier. It grows.' });
  });

  test('a why names a product of the design (case-insensitive) or is dropped', () => {
    assert.deepEqual(parseProposalLine(line({ k: 'why', product: 'ALB', text: 'Keeps selling.' }), CTX), { k: 'why', product: 'alb', text: 'Keeps selling.' });
    assert.equal(parseProposalLine(line({ k: 'why', product: 'ack', text: 'Not in the design.' }), CTX), null);
    assert.equal(parseProposalLine(line({ k: 'why', product: 'users', text: 'A construct, not a product.' }), CTX), null);
  });

  test('a stated quote is kept only when it is in the customer\'s own words (case, spacing and punctuation aside)', () => {
    const n = parseProposalLine(line({ k: 'need', id: 'a', need: 'Survive spikes', source: 'stated', quote: '"Ticket site CRASHED   for two hours"', answer: 'Two zones.', products: ['alb', 'ack', 'ecs', 'alb'] }), CTX);
    assert.deepEqual(n, { k: 'need', id: 'a', need: 'Survive spikes', source: 'stated', quote: 'Ticket site CRASHED for two hours', answer: 'Two zones.', products: ['alb', 'ecs'] });
    const made = parseProposalLine(line({ k: 'need', id: 'b', need: 'Cut costs', source: 'stated', quote: 'we want to halve our bill', answer: 'Pay as you go.', products: [] }), CTX);
    assert.equal(made?.k === 'need' && made.source, 'inferred');
    assert.equal(made?.k === 'need' && 'quote' in made, false);
  });

  test('a quote of the assumption inside a correction, or a quote under 4 characters, is not the customer\'s words', () => {
    const asm = parseProposalLine(line({ k: 'need', id: 'a', need: 'Database', source: 'stated', quote: 'MySQL is the database', answer: 'PostgreSQL.', products: ['rds'] }), CTX);
    assert.equal(asm?.k === 'need' && asm.source, 'inferred');
    const short = parseProposalLine(line({ k: 'need', id: 'a', need: 'Database', source: 'stated', quote: 'We', answer: 'PostgreSQL.', products: [] }), CTX);
    assert.equal(short?.k === 'need' && short.quote, undefined);
    const own = parseProposalLine(line({ k: 'need', id: 'a', need: 'Database', source: 'stated', quote: 'we must use PostgreSQL', answer: 'Kept as asked.', products: ['rds'] }), CTX);
    assert.equal(own?.k === 'need' && own.quote, 'we must use PostgreSQL');
  });

  test('an unknown source becomes inferred; a general need keeps no quote', () => {
    const a = parseProposalLine(line({ k: 'need', id: 'a', need: 'Logs', source: 'guess', answer: 'Kept.', products: [] }), CTX);
    assert.equal(a?.k === 'need' && a.source, 'inferred');
    const g = parseProposalLine(line({ k: 'need', id: 'a', need: 'Logs', source: 'general', quote: 'ticket site crashed for two hours', answer: 'Kept.', products: [] }), CTX);
    assert.deepEqual(g?.k === 'need' && [g.source, g.quote], ['general', undefined]);
  });

  test('the hidden-backend rule drops a line naming the backup; Claude Code as a product name passes', () => {
    assert.equal(parseProposalLine(line({ k: 'next', text: 'Ask Claude to review the plan.' }), CTX), null);
    assert.equal(parseProposalLine(line({ k: 'tradeoff', text: 'Risk.', mitigation: 'Written with Anthropic models.' }), CTX), null);
    assert.ok(parseProposalLine(line({ k: 'next', text: 'Give the team Qoder or Claude Code seats.' }), CTX));
  });

  test('a placeholder copied from the format examples is dropped; a comparison with < and > is not a placeholder', () => {
    assert.equal(parseProposalLine(line({ k: 'why', product: 'alb', text: '<the problem it removes or the outcome it enables here>.' }), CTX), null);
    assert.equal(parseProposalLine(line({ k: 'exec', text: 'Acme Tickets keeps selling.\n\n<the proposal in one or two sentences, no product names>' }), CTX), null);
    const cmp = (t: string): ProposalSection | null => parseProposalLine(line({ k: 'tradeoff', text: t, mitigation: 'Measure it in a load test.' }), CTX);
    assert.ok(cmp('Checkout latency should stay <50 ms in Jakarta while uptime stays >99.9% during sales.'));
    assert.ok(cmp('The target is p99 < 200 ms for buyers while availability stays > 99.95%.'));
  });

  test('region ids read as places, in the text and in the prompt', () => {
    assert.equal(regionWords('Every regional component runs in ap-southeast-5.'), 'Every regional component runs in Jakarta.');
    assert.equal(regionWords('서울(ap-northeast-2) 리전'), '서울 리전');
    assert.equal(regionWords('Singapore (ap-southeast-1)'), 'Singapore');
    const s = parseProposalLine(line({ k: 'next', text: 'Run a load test in ap-southeast-1 before the next sale.' }), CTX);
    assert.deepEqual(s, { k: 'next', text: 'Run a load test in Singapore before the next sale.' });
  });

  test('long text is cut at a sentence or word boundary, never rejected', () => {
    const long = 'Sales keep flowing. '.repeat(40);
    const s = parseProposalLine(line({ k: 'why', product: 'alb', text: long }), CTX);
    assert.ok(s && s.k === 'why');
    assert.ok(Array.from(s.text).length <= PROPOSAL_LIMITS.why);
    assert.match(s.text, /flowing\.$/);
    const words = capText('word '.repeat(100).trim(), 60);
    assert.ok(Array.from(words).length <= 60);
    assert.match(words, /word…$/);
    const cjk = capText('가'.repeat(300), 100);
    assert.equal(Array.from(cjk).length, 100);
    assert.match(cjk, /…$/);
  });
});

describe('lintSection', () => {
  const lint = (o: unknown, ctx = CTX): string | null => {
    const s = parseProposalLine(line(o), { ...ctx, products: ctx.products }) ?? null;
    if (s) return null;
    // parseProposalLine refuses a line that breaks a rule: re-read it without the rules to see which one
    const raw = JSON.parse(line(o)) as ProposalSection;
    const p = lintSection(raw, ctx);
    return p ? `${p.level} ${p.rule}` : 'invalid';
  };
  test('absolute promises are refused in exec, answers, outcomes and whys (the reviewers\' phrases), not in trade-offs', () => {
    assert.equal(lint({ k: 'why', product: 'rds', text: 'Checkout queues so the database never stalls.' }), 'hard absolute');
    assert.equal(lint({ k: 'outcome', title: 'Orders survive the spike', text: 'Workers drain the queue, so no order is dropped when traffic jumps 50x.' }), 'hard absolute');
    assert.equal(lint({ k: 'need', id: 'x', need: 'Survive spikes', source: 'general', answer: 'Auto Scaling adds compute instantly.', products: [] }), 'hard absolute');
    assert.equal(lint({ k: 'exec', text: 'Acme loses sales at peak.\n\nWe queue every checkout so no order is lost.' }), 'hard absolute');
    assert.equal(lint({ k: 'outcome', title: 'Orders captured', text: 'Workers drain the queue, so the fifty-fold spike does not drop orders.' }), 'hard absolute');
    assert.equal(lint({ k: 'tradeoff', text: 'Queued checkout means confirmation is not instant at peak.', mitigation: 'Show an order-received status.' }), null);
    const ko = proposalCtx(request({ lang: 'ko' }), CAT);
    assert.equal(lint({ k: 'why', product: 'alb', text: '두 가용 영역으로 나누어 단일 장애점을 제거합니다.' }, ko), 'hard absolute');
    assert.equal(lint({ k: 'need', id: 'x', need: '서버 관리 부담 해소 필요', source: 'general', answer: '관리형 서비스로 운영 부담을 줄입니다.', products: [] }, ko), null);
    const zh = proposalCtx(request({ lang: 'zh' }), CAT);
    assert.equal(lint({ k: 'why', product: 'rds', text: '彻底消除结算页面的阻塞。' }, zh), 'hard absolute');
    assert.equal(lint({ k: 'why', product: 'rds', text: '跨境零售大促期间降低结算阻塞的风险。' }, zh), null);
  });
  test('prices and other parts of the document: refused when no product of the design has a catalog price', () => {
    assert.equal(CTX.hasPrice, false);
    assert.equal(lint({ k: 'next', text: 'Review the catalog prices attached below to approve the estimated monthly budget.' }), 'hard price');
    assert.equal(lint({ k: 'next', text: 'Review the pricing for ApsaraDB RDS.' }), 'hard price');
    assert.equal(lint({ k: 'next', text: 'Book a cost-estimate session with your Alibaba Cloud account team before the next sale.' }), null);
    assert.equal(lint({ k: 'next', text: 'Confirm the estimated peak traffic.' }), null);
    assert.equal(lint({ k: 'next', text: 'See the appendix for the sizing.' }, { ...CTX, hasPrice: true }), 'hard price');
    assert.equal(lint({ k: 'next', text: 'Check the Model Studio price per million tokens.' }, { ...CTX, hasPrice: true }), null);
  });
  test('a requirement or regulation the customer never named is refused in exec, needs and outcomes', () => {
    assert.equal(lint({ k: 'outcome', title: 'Data stays in Singapore', text: 'The regional components run in Singapore, keeping data local as required.' }), 'hard requirement');
    assert.equal(lint({ k: 'need', id: 'x', need: 'Regulatory constraints keep data in Singapore.', source: 'general', answer: 'Everything runs in Singapore.', products: [] }), 'hard requirement');
    assert.equal(lint({ k: 'next', text: 'Ask your legal team whether customer data may be cached at the edge.' }), null);
    // the customer named compliance: the word is theirs
    const m = memory();
    m.turns[0] = { role: 'user', text: '我们是跨境电商，需要支付安全和合规。' };
    const zh = proposalCtx(request({ lang: 'zh', memory: m }), CAT);
    assert.equal(lint({ k: 'need', id: 'x', need: '跨境支付需满足合规要求。', source: 'stated', quote: '需要支付安全和合规', answer: '加密支付数据并集中审计。', products: [] }, zh), null);
  });
  test('a model or version named from memory is refused; one the customer named passes', () => {
    assert.equal(lint({ k: 'tradeoff', text: 'GPU sizing depends on the model.', mitigation: 'Confirm whether Qwen2.5-7B or Llama 3.1-8B will be used.' }), 'hard model');
    const m = memory();
    m.turns[0] = { role: 'user', text: 'We want to fine-tune Llama-3.1-8B on our tickets.' };
    assert.equal(lint({ k: 'tradeoff', text: 'GPU sizing depends on the model.', mitigation: 'Confirm Llama-3.1-8B as the base.' }, proposalCtx(request({ memory: m }), CAT)), null);
  });
  test('a misspelt customer name and a copied catalog Price line are refused', () => {
    assert.equal(CTX.customer, 'Acme Tickets');
    const nm = proposalCtx(request({ customer: 'Nusantara Mart' }), CAT);
    assert.equal(lint({ k: 'exec', text: 'Nusara Mart, your site goes down every flash sale.' }, nm), 'hard name');
    assert.equal(lint({ k: 'exec', text: 'Nusantara Mart, your site goes down every flash sale.' }, nm), null);
    assert.equal(lint({ k: 'why', product: 'rds', text: 'Orders matter. Price: Pay as you go (Singapore) $0.6/hour (as of 2026-10-31).' }, { ...CTX, hasPrice: true }), 'hard price');
  });

  test('the Korean inversion is refused; colloquial words are held back (soft)', () => {
    const ko = proposalCtx(request({ lang: 'ko' }), CAT);
    assert.equal(lint({ k: 'need', id: 'x', need: '세일 시 결제 페이지가 멈추어 매출이 발생합니다.', source: 'general', answer: '자동 확장으로 대응합니다.', products: [] }, ko), 'hard inversion');
    assert.equal(lint({ k: 'next', text: '출시 전에 예상 동접 수를 확인합니다.' }, ko), 'soft register');
    const zh = proposalCtx(request({ lang: 'zh' }), CAT);
    assert.equal(lint({ k: 'why', product: 'waf', text: '大促期间拦截机器批量刷单。' }, zh), 'soft register');
  });
  test('a why that opens with what the product does, or says only "without it there is no ...", is soft', () => {
    assert.equal(lint({ k: 'why', product: 'ecs', text: 'Runs the ticket site. Without it, there is no compute to serve pages.' }), 'soft why-shape');
    assert.equal(lint({ k: 'why', product: 'ecs', text: 'The sale traffic is unknown, so pay-as-you-go servers keep the cost tied to demand.' }), null);
  });
  test('exec and outcomes name no product and no unexplained technical term (soft); whys may', () => {
    assert.equal(lint({ k: 'outcome', title: 'Orders kept', text: 'RocketMQ holds each order until it is saved.' }), null); // not a product of this design
    assert.equal(lint({ k: 'outcome', title: 'Costs track demand', text: 'Elastic Compute Service adds web servers only during the sale.' }), 'soft jargon');
    assert.equal(lint({ k: 'outcome', title: 'App stays fast', text: 'The load balancer handles the raw TCP burst.' }), 'soft jargon');
    assert.equal(lint({ k: 'outcome', title: 'Attacks filtered', text: 'Flood attacks (DDoS) are filtered before they reach the site.' }), null);
    assert.equal(lint({ k: 'why', product: 'alb', text: 'Acme lost sales when one server failed; ALB keeps selling across two zones.' }), null);
  });
});

describe('assembleDraft', () => {
  test('the first next step is the engagement asked of the customer, not homework; the rest keep their order', () => {
    assert.deepEqual(leadWithEngagement(['Confirm the peak order rate.', 'Share the checkout stack.', 'Run a load test before the next 11.11 sale.']), ['Run a load test before the next 11.11 sale.', 'Confirm the peak order rate.', 'Share the checkout stack.']);
    assert.deepEqual(leadWithEngagement(['Confirm what kind of app this is.', 'Decide on a launch date.']), ['Decide on a launch date.', 'Confirm what kind of app this is.']);
    assert.deepEqual(leadWithEngagement(['Approve a proof of concept.', 'Confirm the peak.']), ['Approve a proof of concept.', 'Confirm the peak.']);
    assert.deepEqual(leadWithEngagement(['请确认支付网关类型。', '建议在下一次大促前安排概念验证。']), ['建议在下一次大促前安排概念验证。', '请确认支付网关类型。']);
    assert.deepEqual(leadWithEngagement(['Confirm A.', 'Confirm B.']), ['Confirm A.', 'Confirm B.']);
    const d = assembleDraft([parseProposalLine(L.next1, CTX)!, parseProposalLine(L.next2, CTX)!], CTX);
    assert.deepEqual(d.next, ['Run a load test before the next big sale.', 'Confirm the expected peak traffic.']);
  });

  test('counts, one why per product (first wins), no repeated lines, need ids n1..., the complete flag', () => {
    const parse = (l: string): ProposalSection => parseProposalLine(l, CTX)!;
    const needs = Array.from({ length: 8 }, (_, i) => parse(line({ k: 'need', id: 'same', need: `Need number ${i}`, source: 'general', answer: 'Answer.', products: [] })));
    const d = assembleDraft([parse(L.exec), parse(L.exec.replace('Acme', 'Other')), ...needs, parse(L.need1), parse(L.outcome1), parse(L.outcome1), ...L.whys.map(parse), parse(line({ k: 'why', product: 'alb', text: 'A second why.' })), parse(L.tradeoff), parse(L.next1)], CTX);
    assert.match(d.exec, /^Acme/);
    assert.equal(d.needs.length, PROPOSAL_LIMITS.needs);
    assert.deepEqual(d.needs.map((n) => n.id), ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
    assert.equal(d.outcomes.length, 1);
    assert.equal(d.why.alb, 'Why alb matters to the business.');
    assert.deepEqual(Object.keys(d.why), PRODUCTS);
    assert.equal(d.complete, true);
    const partial = assembleDraft([parse(L.exec), parse(L.need1), parse(L.whys[0])], CTX);
    assert.equal(partial.complete, false);
    assert.equal(partial.lang, 'en');
  });

  test('re-validates what it is given (a section from elsewhere cannot carry a product outside the design)', () => {
    const d = assembleDraft([{ k: 'why', product: 'ack', text: 'Sneaked in.' }, { k: 'next', text: 'Ask Claude.' }], CTX);
    assert.deepEqual(d.why, {});
    assert.deepEqual(d.next, []);
  });
});

// ---------- the prompt ----------

describe('buildProposalMessages', () => {
  test('a request whose graph lacks parts still builds (no throw), with an empty product list', () => {
    const m = { ...memory(), graph: {} as SessionMemory['graph'] };
    const msgs = buildProposalMessages(request({ memory: m }), CAT);
    assert.match(String(msgs[1].content), /no infrastructure drawn/);
    assert.deepEqual(proposalCtx(request({ memory: m }), CAT).products, []);
  });

  test('the browser-safe sources never spell the backup vendor or model family outside comments (apps/web check-dist)', () => {
    const words = new RegExp(['an' + 'thropic', 'cl' + 'aude(?![ -]?code)'].join('|'), 'i');
    for (const f of ['proposal.ts', 'proposal-prompt.ts']) {
      const code = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      assert.doesNotMatch(code, words, f);
    }
  });

  test('holds the customer\'s messages verbatim (the correction included), constraints by name, and the design', () => {
    const [sys, user] = buildProposalMessages(request(), CAT);
    assert.equal(sys.role, 'system');
    assert.match(String(sys.content), /Why before what/);
    const u = String(user.content);
    assert.ok(u.includes(`[Customer message 1] We sell concert tickets online from Singapore. ${PAIN}`));
    assert.ok(u.includes(`[Customer message 2] ${CORRECTION}`));
    assert.ok(u.includes('[Architect reply] Switched the database to PostgreSQL on RDS. (diagram changes: ~rds)'));
    // the customer never asked for the data to stay in Singapore: the region is the design's choice, with its note
    assert.match(u, /Region chosen for the design: Singapore \(from the architect's note "Customer data stays in Singapore"; the customer did not ask for the data to stay there\)/);
    assert.doesNotMatch(u, /must stay in/);
    assert.doesNotMatch(u, /ap-southeast-1/);
    assert.match(u, /Requirements the architect noted \(check each against the customer's own messages/);
    assert.match(u, /Ruled out for this design: Container Service for Kubernetes \(ACK\)/);
    assert.match(u, /Peak traffic is about ten times normal \(alternative: Peak is fifty times normal\)/);
    assert.match(u, /Do you need a disaster recovery copy/);
    assert.match(u, /Customer: Acme Tickets/);
    assert.match(u, /- rds \| Orders DB \(PostgreSQL\) \| Stores orders\./);
    assert.match(u, /Web servers -> Orders DB \(PostgreSQL\): SQL \(data\)/);
    assert.match(u, /WRITE IN: English/);
  });

  test('the catalog excerpt and the product list cover the design\'s products only, in reading order', () => {
    const u = String(buildProposalMessages(request(), CAT)[1].content);
    const list = u.slice(u.indexOf('# PRODUCTS IN THE DESIGN'), u.indexOf('# CATALOG EXCERPT'));
    assert.deepEqual([...list.matchAll(/^\d+\. ([a-z0-9-]+) /gm)].map((m) => m[1]), PRODUCTS);
    const excerpt = u.slice(u.indexOf('# CATALOG EXCERPT'));
    for (const p of PRODUCTS) assert.ok(excerpt.includes(`- ${p}: ${CAT.byId.get(p)!.name}`), p);
    assert.ok(!excerpt.includes('Container Service for Kubernetes'));
    assert.ok(!excerpt.includes('- users:'));
    assert.deepEqual(CTX.products, PRODUCTS);
  });

  test('Korean and Chinese drafts are asked in their business register', () => {
    assert.match(String(buildProposalMessages(request({ lang: 'ko' }), CAT)[1].content), /WRITE IN: Korean, in the formal 합니다체/);
    assert.match(String(buildProposalMessages(request({ lang: 'zh' }), CAT)[1].content), /WRITE IN: Simplified Chinese/);
  });

  test('a long history is trimmed from the middle: the first customer message and the last six entries stay', () => {
    const m = memory();
    const turns: SessionMemory['turns'] = [{ role: 'user', text: 'FIRST: we sell tickets. ' + 'x'.repeat(1500) }];
    for (let i = 0; i < 60; i++) turns.push({ role: i % 2 ? 'user' : 'assistant', text: `message ${i} ` + 'filler words '.repeat(120) });
    m.turns = turns;
    const u = String(buildProposalMessages(request({ memory: m }), CAT)[1].content);
    assert.ok(u.includes('FIRST: we sell tickets.'));
    for (const t of turns.slice(-PROPOSAL_KEEP_LAST)) assert.ok(u.includes(t.text.slice(0, 30)), t.text.slice(0, 12));
    assert.match(u, /earlier messages left out/);
    const total = estimateProposalTokens(String(buildProposalMessages(request({ memory: m }), CAT)[0].content)) + estimateProposalTokens(u);
    assert.ok(total < 12_000, `prompt of ${total} tokens`);
  });
});

// ---------- drafting ----------

describe('draftProposal', () => {
  test('a current price review informs the authored cost analysis, while old figures and private reasoning stay out', async () => {
    const req = request();
    const estimate = calculateSolutionEstimate({ items: [{ label: 'Migration labour', period: 'one-time',
      quantity: 8, unit: 'hour', unitUsd: 85, basis: 'user', source: 'Customer planning rate' }],
      assumptions: ['One transition window'], unknowns: ['Provider egress charges'] });
    req.pricing = { designKey: pricingDesignKey(req.memory), estimate, messages: [{ role: 'user', text: 'We need one transition window.' }] };
    const cost = 'The transfer charge is still open. Confirm the provider fee before choosing the migration window.';
    const body = chunk({ reasoning_content: 'Private reasoning must not appear on the wire.' }) +
      sseOf([L.exec, line({ k: 'cost', text: 'The project costs $9943.' }), line({ k: 'cost', text: cost })].join('\n'));
    const calls: Call[] = [];
    const run = await draftProposal(req, CAT, opts(fakeFetch([c => streamResponse(c, body), ok(FULL.slice(1))], calls)));
    assert.equal(run.draft?.cost, cost);
    assert.equal(run.draft?.complete, true);
    assert.deepEqual(calls.map(c => [c.body.model, c.body.enable_thinking, c.body.thinking_budget]),
      [['qwen3.8-max', true, PROPOSAL_LIMITS.thinkingBudget], ['qwen3.8-max', true, PROPOSAL_LIMITS.thinkingBudget]]);
    assert.ok(lastUser(calls[1]).includes(cost));
    assert.equal(run.stats.lint.price, 1);
    assert.doesNotMatch(JSON.stringify(run.draft), /Private reasoning|9943/);
    assert.match(lastUser(calls[0]), /Migration labour/);
    assert.match(lastUser(calls[0]), /Provider egress charges/);
    req.memory.requirements.push('A second application server is required.');
    const stale = String(buildProposalMessages(req, CAT)[1].content);
    assert.match(stale, /earlier design/);
    assert.doesNotMatch(stale, /Migration labour|Provider egress charges/);
    assert.equal(parseProposalLine(line({ k: 'cost', text: cost }), proposalCtx(req, CAT)), null);
  });
  test('happy path: one high-reasoning qwen3.8-max call; sections stream out in order as their lines complete', async () => {
    const calls: Call[] = [];
    const got: ProposalSection[] = [];
    const statuses: string[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok(FULL)], calls), { onSection: (s) => got.push(s), onStatus: (c) => statuses.push(c) }));
    assert.equal(r.outcome, 'done');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.model, 'qwen3.8-max');
    assert.equal(calls[0].body.enable_thinking, true);
    assert.equal(calls[0].body.reasoning_effort, undefined);
    assert.equal(calls[0].body.thinking_budget, PROPOSAL_LIMITS.thinkingBudget);
    assert.equal(calls[0].body.temperature, PROPOSAL_LIMITS.temperature);
    assert.equal(calls[0].body.max_completion_tokens, PROPOSAL_LIMITS.maxTokens);
    assert.deepEqual(got.map((s) => s.k), ['exec', 'need', 'need', 'outcome', 'outcome', 'why', 'why', 'why', 'why', 'why', 'tradeoff', 'next', 'next']);
    assert.deepEqual(statuses, []);
    assert.equal(r.draft?.complete, true);
    assert.equal(r.draft?.needs[0].quote, 'ticket site crashed for two hours');
    assert.equal(r.stats.servedBy, 'qwen');
    assert.equal(r.stats.sections, 13);
    assert.deepEqual(r.stats.missing, []);
    assert.equal(r.stats.promptTokens, 3000);
    assert.ok(r.stats.costUsd > 0);
  });

  test('sections reach onSection while the stream is still open', async () => {
    let firstAt = -1;
    let reads = 0;
    const handler: Handler = (c) => streamResponse(c, sseOf(FULL.join('\n') + '\n'), { onRead: (n) => (reads = n) });
    await draftProposal(request(), CAT, opts(fakeFetch([handler]), { onSection: () => (firstAt = firstAt < 0 ? reads : firstAt) }));
    assert.ok(firstAt > 0 && firstAt < reads, `first section after read ${firstAt} of ${reads}`);
  });

  test('a stall before any section retries the same high-reasoning report model', async () => {
    const calls: Call[] = [];
    const statuses: string[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([hang, ok(FULL)], calls), { onStatus: (c) => statuses.push(c), timeouts: { firstByteMs: 60 } }));
    assert.equal(r.outcome, 'done');
    assert.deepEqual(calls.map((c) => c.body.model), ['qwen3.8-max', 'qwen3.8-max']);
    assert.deepEqual(statuses, ['retry']);
    assert.equal(r.stats.fallbackUsed, false);
    assert.equal(r.stats.model, 'qwen3.8-max');
  });

  test('two stalls: failed with timeout, never a third call', async () => {
    const calls: Call[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([hang, hang], calls), { timeouts: { firstByteMs: 40 } }));
    assert.equal(r.outcome, 'failed');
    assert.equal(r.error?.code, 'timeout');
    assert.equal(r.draft, null);
    assert.equal(calls.length, 2);
  });

  test("finish_reason 'length': one continuation listing the written lines and what is missing, status finish, no duplicates", async () => {
    const calls: Call[] = [];
    const got: ProposalSection[] = [];
    const statuses: string[] = [];
    const first = [L.exec, L.need1, L.need2, L.outcome1, L.whys[0], L.whys[1], '{"k":"why","product":"ecs","text":"Cut of'];
    const second = [L.need2, L.whys[1], L.whys[2], L.whys[3], L.whys[4], L.tradeoff, L.next1, L.next2];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([(c) => streamResponse(c, sseOf(first.join('\n'), { finish: 'length' })), ok(second)], calls), { onSection: (s) => got.push(s), onStatus: (c) => statuses.push(c) }));
    assert.equal(r.outcome, 'done');
    assert.equal(calls.length, 2);
    assert.deepEqual(statuses, ['finish']);
    const cont = lastUser(calls[1]);
    assert.ok(cont.includes('Do not repeat'));
    assert.ok(cont.includes('"k":"exec"'));
    assert.ok(cont.includes('why lines for these products, in this order: ecs, rds, oss'));
    assert.ok(cont.includes('tradeoff lines'));
    assert.equal(got.filter((s) => s.k === 'need').length, 2);
    assert.equal(got.filter((s) => s.k === 'why' && s.product === 'waf').length, 1);
    assert.equal(r.draft?.complete, true);
    assert.equal(r.stats.rejectedLines, 3); // the cut-off line, the repeated need and the repeated why
  });

  test('content filter mid-draft: the backup continues from the accepted lines (gate ok), booked, never named', async () => {
    const calls: Call[] = [];
    const got: ProposalSection[] = [];
    const statuses: string[] = [];
    const booked: BackupCall[] = [];
    const seen: BackupCompleteOptions[] = [];
    let gateAsked = 0;
    const rest = [L.need2, L.outcome1, ...L.whys, line({ k: 'tradeoff', text: 'Drafted by Claude.' }), L.tradeoff, L.next1].join('\n');
    const r = await draftProposal(
      request(),
      CAT,
      opts(fakeFetch([filteredMid([L.exec, L.need1])], calls), {
        backup: fakeBackup([rest], seen),
        backupGate: () => (gateAsked++, { ok: true }),
        onBackupCall: async (c) => {
          booked.push(c);
        },
        msLeft: () => 120_000,
        onSection: (s) => got.push(s),
        onStatus: (c) => statuses.push(c),
      }),
    );
    assert.equal(r.outcome, 'done');
    assert.equal(calls.length, 1, 'no Qwen continuation after the filter');
    assert.deepEqual(statuses, ['finish']);
    assert.equal(gateAsked, 1);
    assert.equal(booked.length, 1);
    assert.equal(booked[0].first, true);
    assert.equal(booked[0].costUsd, 0.05);
    const cont = seen[0].messages[seen[0].messages.length - 1].content as string;
    assert.ok(cont.includes(L.exec.slice(0, 40)));
    assert.equal(got.filter((s) => s.k === 'exec').length, 1);
    assert.equal(r.draft?.complete, true);
    assert.equal(r.stats.servedBy, 'claude');
    assert.equal(r.stats.backupUsed, true);
    const wire = JSON.stringify(got) + JSON.stringify(r.draft) + JSON.stringify(r.error ?? null);
    assert.doesNotMatch(wire, /claude|anthropic|opus|qwen|provider|model/i);
  });

  test('content filter before any line: the backup writes the whole draft from the original messages', async () => {
    const seen: BackupCompleteOptions[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([filteredHttp]), { backup: fakeBackup([FULL.join('\n')], seen) }));
    assert.equal(r.outcome, 'done');
    assert.equal(seen[0].messages.length, 2);
    assert.equal(r.draft?.complete, true);
  });

  test('a backup reply cut off at its token cap gets one more backup call (first: false), never a third', async () => {
    const booked: BackupCall[] = [];
    const seen: BackupCompleteOptions[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([filteredHttp]), { backup: fakeBackup([[L.exec, L.need1].join('\n'), [L.whys[0]].join('\n'), 'x'], seen, { finish: 'max_tokens' }), onBackupCall: (c) => void booked.push(c) }));
    assert.equal(r.outcome, 'done');
    assert.deepEqual(booked.map((b) => b.first), [true, false]);
    assert.equal(seen.length, PROPOSAL_LIMITS.backupCalls);
    assert.equal(r.draft?.complete, false);
  });

  test('gate blocked, gate throwing, or too little time left: failed content-filtered, backupSkipped says why', async () => {
    const seen: BackupCompleteOptions[] = [];
    const blocked = await draftProposal(request(), CAT, opts(fakeFetch([filteredHttp]), { backup: fakeBackup([FULL.join('\n')], seen), backupGate: () => ({ ok: false, reason: 'limit', detail: 'daily' }) }));
    assert.equal(blocked.outcome, 'failed');
    assert.equal(blocked.error?.code, 'content-filtered');
    assert.deepEqual(blocked.stats.backupSkipped, { reason: 'limit', detail: 'daily' });
    const threw = await draftProposal(request(), CAT, opts(fakeFetch([filteredHttp]), { backup: fakeBackup([FULL.join('\n')], seen), backupGate: () => { throw new Error('kv down'); } }));
    assert.deepEqual(threw.stats.backupSkipped, { reason: 'unavailable', detail: 'gate-error' });
    let gateAsked = 0;
    const late = await draftProposal(request(), CAT, opts(fakeFetch([filteredHttp]), { backup: fakeBackup([FULL.join('\n')], seen), msLeft: () => BACKUP_MIN_MS_LEFT - 1, backupGate: () => (gateAsked++, { ok: true }) }));
    assert.equal(late.error?.code, 'content-filtered');
    assert.deepEqual(late.stats.backupSkipped, { reason: 'deadline' });
    assert.equal(gateAsked, 0, 'the deadline is checked before the gate');
    assert.equal(seen.length, 0);
    const none = await draftProposal(request(), CAT, opts(fakeFetch([filteredHttp])));
    assert.equal(none.error?.code, 'content-filtered');
    assert.equal(none.stats.backupSkipped, undefined);
  });

  test("the caller's abort: outcome aborted, no draft, no further call", async () => {
    const calls: Call[] = [];
    const ctl = new AbortController();
    const handler: Handler = (c) => streamResponse(c, sseOf([L.exec, L.need1].join('\n') + '\n', { tail: '' }), { hang: true });
    const r = await draftProposal(request(), CAT, opts(fakeFetch([handler, ok(FULL)], calls), { signal: ctl.signal, onSection: () => ctl.abort() }));
    assert.equal(r.outcome, 'aborted');
    assert.equal(r.draft, null);
    assert.equal(calls.length, 1);
  });

  test('a line breaking a hard rule is never printed; the continuation is told why and writes it again', async () => {
    const calls: Call[] = [];
    const got: ProposalSection[] = [];
    const bad = line({ k: 'why', product: 'rds', text: 'Orders are never lost, so the team can sell.' });
    const good = line({ k: 'why', product: 'rds', text: 'Acme lost sales on Black Friday; a managed database across two zones keeps orders when one fails.' });
    const first = [L.exec, L.need1, L.need2, L.outcome1, L.whys[0], L.whys[1], L.whys[2], bad, L.whys[4], L.tradeoff, L.next1];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok(first), ok([good])], calls), { onSection: (s) => got.push(s) }));
    assert.equal(r.outcome, 'done');
    assert.equal(calls.length, 2);
    const cont = lastUser(calls[1]);
    assert.ok(cont.includes('not accepted: it makes an absolute promise'), cont);
    assert.ok(cont.includes('why lines for these products, in this order: rds'));
    assert.match(r.draft!.why.rds, /^Acme lost sales/);
    assert.ok(!got.some((s) => s.k === 'why' && /never/.test(s.text)));
    assert.equal(r.stats.lint.absolute, 1);
    assert.equal(r.stats.heldUsed, 0);
  });

  test('a refused line alone (nothing missing) still gets the rewrite call, with no "taking longer" status; a stated need it loses is kept as held', async () => {
    const calls: Call[] = [];
    // a third need whose answer names a product: soft; the draft has two needs already, so nothing is missing
    const softNeed = line({ k: 'need', id: 'x', need: 'Keep the site up', source: 'stated', quote: 'We need the site to survive sales spikes', answer: 'Application Load Balancer spreads traffic over two zones.', products: ['alb'] });
    const statuses: string[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok([...FULL.slice(0, 3), softNeed, ...FULL.slice(3)]), ok([softNeed])], calls), { onStatus: (c) => statuses.push(c) }));
    assert.equal(calls.length, 2, 'the rewrite call');
    assert.deepEqual(statuses, [], 'a rewrite with nothing missing is not "taking longer"');
    assert.ok(lastUser(calls[1]).includes('Nothing else is missing: write again only the lines listed as not accepted.'));
    assert.equal(r.draft?.needs.length, 3, 'the customer\'s stated point is not lost');
    assert.equal(r.stats.heldUsed, 1);
  });

  test('a why opening with the same sentence as an earlier one is held back and written again', async () => {
    const calls: Call[] = [];
    const same = (p: string, rest: string): string => line({ k: 'why', product: p, text: `You asked for a ticket site that survives sales. ${rest}` });
    const whys = [same('alb', 'Two zones keep selling.'), same('waf', 'Bots are filtered.'), same('ecs', 'Servers grow with demand.'), same('rds', 'Orders are kept.'), same('oss', 'Images load fast.')];
    const fresh = ['waf', 'ecs', 'rds', 'oss'].map((p) => line({ k: 'why', product: p, text: `Acme loses sales when ${p} is not sized for the peak; this keeps cost tied to demand.` }));
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok([L.exec, L.need1, L.need2, L.outcome1, ...whys, L.tradeoff, L.next1]), ok(fresh)], calls)));
    assert.equal(calls.length, 2);
    assert.ok(lastUser(calls[1]).includes('opens with the same sentence as another why line'));
    assert.match(r.draft!.why.alb, /^You asked/);
    assert.match(r.draft!.why.waf, /^Acme loses sales/);
    assert.equal(r.stats.heldUsed, 0);
  });

  test('a line breaking a soft rule is held back: printed only when the continuation brings nothing better', async () => {
    const soft = line({ k: 'why', product: 'rds', text: 'Stores orders across two zones. Without it, there is no database.' });
    const first = [L.exec, L.need1, L.need2, L.outcome1, L.whys[0], L.whys[1], L.whys[2], soft, L.whys[4], L.tradeoff, L.next1];
    // the continuation sends the same line back: the held line is printed rather than leaving rds without a why
    const got: ProposalSection[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok(first), ok([soft])]), { onSection: (s) => got.push(s) }));
    assert.equal(r.outcome, 'done');
    assert.equal(r.draft?.complete, true);
    assert.match(r.draft!.why.rds, /^Stores orders/);
    assert.equal(r.stats.heldUsed, 1);
    assert.equal(got.filter((s) => s.k === 'why' && s.product === 'rds').length, 1, 'emitted once, at the end');
    // a better line from the continuation wins
    const better = line({ k: 'why', product: 'rds', text: 'Acme cannot lose paid orders; a managed database in two zones keeps them when one fails.' });
    const r2 = await draftProposal(request(), CAT, opts(fakeFetch([ok(first), ok([better])])));
    assert.match(r2.draft!.why.rds, /^Acme cannot lose/);
    assert.equal(r2.stats.heldUsed, 0);
  });

  test('the deadline: no continuation with under 45 s left; a call cut by the deadline keeps the sections written', async () => {
    const calls: Call[] = [];
    const first = [L.exec, L.need1, L.need2, L.outcome1, L.whys[0], L.whys[1]];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok(first, { finish: 'length' })], calls), { msLeft: () => PROPOSAL_LIMITS.continueMinMs - 1 }));
    assert.equal(calls.length, 1, 'no continuation');
    assert.equal(r.outcome, 'done');
    assert.equal(r.draft?.complete, false);

    // the caller's signal fires at the deadline while the stream is open: the draft so far is kept, not thrown away
    const ac = new AbortController();
    let dead = false;
    const r2 = await draftProposal(
      request(),
      CAT,
      opts(fakeFetch([(c) => streamResponse(c, sseOf(first.join('\n') + '\n', { tail: '' }), { hang: true })]), {
        signal: ac.signal,
        msLeft: () => (dead ? -1 : 200_000),
        onSection: (s) => {
          if (s.k === 'why' && s.product === 'waf') {
            dead = true;
            setTimeout(() => ac.abort(), 5);
          }
        },
      }),
    );
    assert.equal(r2.outcome, 'done');
    assert.ok(r2.draft?.exec);
    assert.equal(r2.draft?.needs.length, 2);

    // the browser leaving (the signal with time left) is still an abort: no draft
    const ac3 = new AbortController();
    const r3 = await draftProposal(
      request(),
      CAT,
      opts(fakeFetch([(c) => streamResponse(c, sseOf(first.join('\n') + '\n', { tail: '' }), { hang: true })]), {
        signal: ac3.signal,
        msLeft: () => 200_000,
        onSection: (s) => {
          if (s.k === 'why' && s.product === 'waf') setTimeout(() => ac3.abort(), 5);
        },
      }),
    );
    assert.equal(r3.outcome, 'aborted');
    assert.equal(r3.draft, null);
  });

  test('the backup call is ended before the deadline by its own signal', async () => {
    const seen: BackupCompleteOptions[] = [];
    const ac = new AbortController();
    const rest = [L.need2, L.outcome1, ...L.whys, L.tradeoff, L.next1].join('\n');
    const r = await draftProposal(request(), CAT, opts(fakeFetch([filteredMid([L.exec, L.need1])]), { signal: ac.signal, backup: fakeBackup([rest], seen), msLeft: () => 90_000 }));
    assert.equal(r.outcome, 'done');
    assert.ok(seen[0].signal && seen[0].signal !== ac.signal, 'a signal of its own, joined to the caller\'s');
    assert.equal(seen[0].signal.aborted, false);
  });

  test('an auth error: failed upstream at once, no retry and no continuation', async () => {
    const calls: Call[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([() => new Response('{"code":"InvalidApiKey","message":"bad key"}', { status: 401 })], calls)));
    assert.equal(r.outcome, 'failed');
    assert.equal(r.error?.code, 'upstream');
    assert.equal(calls.length, 1);
  });

  test('prose only: one continuation, then failed empty', async () => {
    const calls: Call[] = [];
    const r = await draftProposal(request(), CAT, opts(fakeFetch([ok(['Sure! Here is a proposal.']), ok(['Still prose.'])], calls)));
    assert.equal(r.outcome, 'failed');
    assert.equal(r.error?.code, 'empty');
    assert.equal(calls.length, 2);
    assert.equal(r.stats.rejectedLines, 2);
  });
});

// ---------- the Claude backup's complete() ----------

describe('Claude backup complete()', () => {
  const cev = (type: string, data: Record<string, unknown> = {}): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const KEY = 'sk-ant-api03-SECRET-proposal-0123456789';

  test('one SDK call: text deltas stream to onText, the text voice note ends the system prompt, cost from usage', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const text = [L.exec, L.need1].join('\n');
    let sse = cev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 4000, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } });
    sse += cev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    for (let i = 0; i < text.length; i += 40) sse += cev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 40) } });
    sse += cev('content_block_stop', { index: 0 }) + cev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null, stop_details: null }, usage: { output_tokens: 500 } }) + cev('message_stop');
    const fetchImpl = (async (_u: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }) as typeof fetch;
    const backup = createClaudeBackup({ apiKey: KEY, fetchImpl, maxRetries: 0 });
    const deltas: string[] = [];
    const r = await backup.complete!({ messages: buildProposalMessages(request(), CAT), onText: (d) => deltas.push(d), maxTokens: 9000 });
    assert.equal(r.text, text);
    assert.equal(deltas.join(''), text);
    assert.equal(r.finishReason, 'end_turn');
    assert.equal(r.error, undefined);
    assert.ok(Math.abs(r.costUsd - (4000 * 4 + 500 * 20) / 1e6) < 1e-9);
    assert.equal(r.costEstimated, false);
    const system = bodies[0].system as Array<{ text: string }>;
    assert.ok(system[0].text.endsWith(BACKUP_TEXT_VOICE_NOTE));
    assert.match(system[0].text, /Why before what/);
    assert.equal(bodies[0].max_tokens, 9000);
    assert.doesNotMatch(JSON.stringify(r), new RegExp(KEY));
  });
});

// Workflow proposals share the cloud writer, but explain steps by node id.
function workflowRequest(mixed = false): ProposalRequest {
  const req = request();
  if (!mixed) req.memory.graph = { nodes: {}, edges: {}, groups: {}, recs: [] };
  req.memory.workflow = {
    nodes: {
      start: { id: 'start', kind: 'trigger', label: 'Incoming email', product: 'eventbridge' },
      draft: { id: 'draft', kind: 'ai', label: 'Draft an answer', ai: 'qwen3.5-plus', product: 'model-studio', runs: 'fc' },
      review: { id: 'review', kind: 'human', label: 'Review answer', runs: 'customer' },
      docs: { id: 'docs', kind: 'knowledge', label: 'Help articles', on: 'draft', product: 'tablestore' },
      end: { id: 'end', kind: 'end', label: 'Finished' },
    }, edges: {}, groups: {},
  };
  return req;
}
const WORKFLOW_LINES = [
  line({ k: 'exec', text: 'The support team can focus on requests that need personal attention.' }),
  line({ k: 'need', id: 'a', need: 'Answer routine requests', source: 'general', answer: 'Draft answers reduce repetitive work.', products: ['model-studio'] }),
  line({ k: 'need', id: 'b', need: 'Review outgoing answers', source: 'general', answer: 'Staff review the answer before sending.', products: [] }),
  line({ k: 'step', id: 'draft', text: 'qwen3.5-plus drafts an answer using help articles through an API. Staff have less text to write.' }),
  line({ k: 'step', id: 'review', text: 'Staff review the draft so errors can be corrected before an answer is sent.' }),
];

test('workflow-only completes with exec, needs and every inline step, without product whys', async () => {
  const calls: Call[] = [];
  const sections: ProposalSection[] = [];
  const r = await draftProposal(workflowRequest(), CAT, {
    apiKey: 'fake', fetchImpl: fakeFetch([ok(WORKFLOW_LINES)], calls), onSection: (s) => sections.push(s),
  });
  assert.equal(r.outcome, 'done');
  assert.equal(r.draft?.complete, true);
  assert.deepEqual(Object.keys(r.draft!.steps!), ['draft', 'review']);
  assert.deepEqual(r.draft!.why, {});
  assert.deepEqual(r.stats.missing, []);
  assert.equal(calls.length, 1);
  assert.equal(sections.filter((s) => s.k === 'step').length, 2);
});

test('step assembly validates ids, sanitizes text and keeps the first section per step', () => {
  const ctx = proposalCtx(workflowRequest(), CAT);
  const sections = WORKFLOW_LINES.map((s) => JSON.parse(s) as ProposalSection);
  sections.push({ k: 'step', id: 'draft', text: 'A duplicate.' }, { k: 'step', id: 'unknown', text: 'Unknown.' });
  sections.push({ k: 'step', id: 'docs', text: 'Attached.' }, { k: 'step', id: 'start', text: 'Trigger.' });
  const d = assembleDraft(sections, ctx);
  assert.deepEqual(Object.keys(d.steps!), ['draft', 'review']);
  assert.match(d.steps!.draft, /^qwen3.5-plus/);
  assert.equal(assembleDraft(sections.filter((s) => s.k !== 'step' || s.id !== 'review'), ctx).complete, false);
  assert.equal(assembleDraft(sections, proposalCtx(workflowRequest(true), CAT)).complete, false);
  assert.deepEqual(parseProposalLine(line({ k: 'step', id: 'review', text: '**Staff** review.  ' }), ctx),
    { k: 'step', id: 'review', text: 'Staff review.' });
});

test('missing workflow steps are requested in continuation; partial workflow is not marked usable', async () => {
  const calls: Call[] = [];
  const r = await draftProposal(workflowRequest(), CAT, {
    apiKey: 'fake', fetchImpl: fakeFetch([ok(WORKFLOW_LINES.slice(0, -1)), ok(WORKFLOW_LINES.slice(-1))], calls),
  });
  assert.equal(r.draft?.complete, true);
  assert.match(JSON.stringify(calls[1].body.messages), /step lines for these workflow node ids: review/);
  const partial = await draftProposal(workflowRequest(), CAT, {
    apiKey: 'fake', msLeft: () => 20_000, fetchImpl: fakeFetch([ok(WORKFLOW_LINES.slice(0, -1))]),
  });
  assert.equal(partial.outcome, 'failed');
  assert.deepEqual(partial.stats.missing, ['step:review']);
});

test('only the design model ids may be named; workflow vocabulary is relaxed only in steps', () => {
  const ctx = proposalCtx(workflowRequest(), CAT);
  const parse = (text: string, k: 'step' | 'exec' = 'step') => parseProposalLine(line({ k, id: 'draft', text }), ctx);
  assert.ok(parse('qwen3.5-plus uses RAG and an API after the webhook arrives.'));
  assert.equal(parse('qwen3.5-plus-extra drafts the answer.'), null);
  assert.equal(parse('qwen99 drafts the answer.'), null);
  const namedProduct = { ...ctx, productNames: [...ctx.productNames, 'Container Service for Kubernetes'] };
  assert.equal(lintSection({ k: 'step', id: 'draft', text: 'Container Service for Kubernetes runs this step.' }, namedProduct), null);
  assert.equal(lintSection({ k: 'step', id: 'draft', text: 'Kubernetes runs this step.' }, ctx)?.rule, 'jargon');
  assert.equal(parse('RAG uses an API.', 'exec'), null);
  assert.equal(parse('qwen3.5-plus drafts answers.', 'exec'), null);
  for (const text of ['I am qwen3.5-plus.', 'Written by qwen3.5-plus.', 'Qwen generated this proposal.', 'Drafted by Claude.', 'Anthropic wrote this.']) {
    assert.equal(parse(text), null, text);
    assert.deepEqual(assembleDraft([{ k: 'step', id: 'draft', text }], ctx).steps, {});
  }
});

test('workflow prompt has steps, attachments, runtime products and generated-table instructions', () => {
  const req = workflowRequest(true);
  const ctx = proposalCtx(req, CAT);
  assert.deepEqual(ctx.products, [...PRODUCTS, 'eventbridge', 'model-studio', 'fc', 'tablestore']);
  const messages = buildProposalMessages(req, CAT);
  const text = messages.map((m) => m.content).join('\n');
  assert.match(text, /"ai":"qwen3.5-plus"/);
  assert.match(text, /"on":"draft"/);
  assert.match(text, /Write no cost figures/);
  assert.match(text, /saved solution-estimate table when one exists/);
  assert.match(text, /critical path and the meaningful review or system handoff/);
  assert.doesNotMatch(text, /This is workflow-only/);
});

test('finding 4: workflow model tokens exclude punctuation and include digitless ids', () => {
  const ctx = proposalCtx(workflowRequest(), CAT);
  for (const text of ['The draft uses qwen3.5-plus.', 'The draft uses qwen3.5-plus', 'The draft uses (qwen3.5-plus).']) {
    assert.ok(parseProposalLine(line({ k: 'step', id: 'draft', text }), ctx), text);
  }
  assert.equal(parseProposalLine(line({ k: 'step', id: 'draft', text: 'qwen-max drafts an answer.' }), ctx), null);
  const allowed = { ...ctx, customerWords: 'Use qwen-max-extra.', catalogText: 'qwen-max-extra' };
  assert.equal(lintSection({ k: 'step', id: 'draft', text: 'qwen-max drafts an answer.' }, allowed)?.rule, 'model');
  assert.ok(parseProposalLine(line({ k: 'step', id: 'draft', text: 'qwen-max drafts an answer.' }),
    { ...ctx, modelNames: ['qwen-max'] }));
});

test('finding 5: output generation is allowed but proposal attribution is refused', () => {
  const ctx = proposalCtx(workflowRequest(), CAT);
  for (const text of [
    'The reply is generated by qwen3.5-plus and reviewed by staff.',
    'qwen3.5-plus generated the reply for staff review.',
    'The answer is written by staff after reviewing the draft.',
  ]) {
    const s: ProposalSection = { k: 'step', id: 'draft', text };
    assert.deepEqual(parseProposalLine(line(s), ctx), s, text);
    assert.equal(lintSection(s, ctx), null, text);
  }
  for (const text of [
    'This proposal comes from qwen3.5-plus',
    'This document was generated by qwen3.5-plus.',
    'The proposal was prepared with qwen3.5-plus.',
    'qwen3.5-plus authored this proposal.',
    'This proposal is courtesy of qwen3.5-plus.',
    'I am qwen3.5-plus.', 'Written by qwen3.5-plus.',
  ]) {
    const s: ProposalSection = { k: 'step', id: 'draft', text };
    assert.equal(parseProposalLine(line(s), ctx), null, text);
    assert.equal(lintSection(s, ctx)?.rule, 'model', text);
  }
});

test('finding 6: invented workflow money is never emitted, even with catalog prices', async () => {
  const bad = line({ k: 'step', id: 'draft', text: 'The step costs $99 per month.' });
  const calls: Call[] = [];
  const sections: ProposalSection[] = [];
  const first = [...WORKFLOW_LINES.slice(0, 3), bad, WORKFLOW_LINES[4]];
  const r = await draftProposal(workflowRequest(), CAT, opts(fakeFetch([ok(first), ok([WORKFLOW_LINES[3]])], calls), {
    onSection: (s) => sections.push(s),
  }));
  assert.doesNotMatch(JSON.stringify(sections), /\$99/);
  assert.equal(r.outcome, 'done');
  assert.equal(r.draft?.complete, true);
  assert.equal(r.stats.lint.price, 1);
  assert.equal(calls.length, 2);
  assert.match(lastUser(calls[1]), /step lines for these workflow node ids: draft/);
  for (const hasPrice of [false, true]) {
    const ctx = { ...proposalCtx(workflowRequest(true), CAT), hasPrice };
    for (const amount of ['$99', 'USD 99', 'USD99', '99 USD', '99 dollars', '€99.50', '₩10,000', '99元', '99원', '99']) {
      const s: ProposalSection = { k: 'step', id: 'draft', text: `The step costs ${amount} per month.` };
      assert.equal(lintSection(s, ctx)?.rule, 'price', amount);
      assert.equal(parseProposalLine(line(s), ctx), null, amount);
      assert.deepEqual(assembleDraft([s], ctx).steps, {}, amount);
    }
    const quote: ProposalSection = {
      k: 'need', id: 'a', need: 'Limit spending', source: 'stated', quote: 'Spend $99 per month',
      answer: 'Track usage.', products: [],
    };
    assert.equal(lintSection(quote, ctx)?.rule, 'price');
    assert.equal(lintSection({ k: 'step', id: 'draft', text: 'Staff review 99 answers per month.' }, ctx), null);
  }
  assert.equal(lintSection(JSON.parse(bad) as ProposalSection, CTX), null, 'legacy cloud price behavior');
});

test('finding 7: forbidden workflow ids are remapped in prompts, sections and completeness checks', async () => {
  const req = workflowRequest();
  const wf = req.memory.workflow!;
  delete wf.nodes.review;
  wf.nodes['anthropic-review'] = { id: 'anthropic-review', kind: 'human', label: 'Review answer', subject: 'draft' };
  wf.nodes.docs.on = 'anthropic-review';
  wf.nodes.end.after = 'anthropic-review';
  wf.nodes.draft.subject = 'anthropic-review';
  wf.edges['claude-link'] = { id: 'claude-link', from: 'draft', to: 'anthropic-review' };
  wf.nodes.docs.repeat = 'claude-code-group';
  wf.groups['claude-code-group'] = { id: 'claude-code-group', over: 'Requests' };
  wf.nodes['workflow-1'] = { id: 'workflow-1', kind: 'end', label: 'Reserved id' };
  const before = JSON.stringify(req);
  const ctx = proposalCtx(req, CAT);
  const alias = ctx.steps.find((id) => id !== 'draft')!;
  assert.doesNotMatch(alias, /anthropic|claude/i);
  assert.notEqual(alias, 'workflow-1');
  const messages = buildProposalMessages(req, CAT);
  assert.doesNotMatch(JSON.stringify(messages), /anthropic|claude/i);
  const content = messages[1].content;
  assert.equal(typeof content, 'string');
  const facts = String(content).split('\n').filter((s) => s.startsWith('{')).map((s) => JSON.parse(s));
  assert.equal(facts.find((n) => n.id === 'docs').on, alias);
  assert.equal(facts.find((n) => n.id === 'end').after, alias);
  assert.equal(facts.find((n) => n.id === 'draft').subject, alias);
  assert.equal(facts.find((n) => n.from === 'draft').to, alias);
  assert.doesNotMatch(facts.find((n) => n.id === 'docs').repeat, /claude/i);
  const raw = { k: 'step', id: 'anthropic-review', text: 'Staff review the answer.' } as const;
  const safe = { ...raw, id: alias };
  assert.deepEqual(parseProposalLine(line(raw), ctx), safe);
  assert.deepEqual(parseProposalLine(line(safe), ctx), safe);
  const calls: Call[] = [];
  const sections: ProposalSection[] = [];
  const r = await draftProposal(req, CAT, opts(fakeFetch([ok(WORKFLOW_LINES.slice(0, 4)), ok([line(raw)])], calls), {
    onSection: (s) => sections.push(s),
  }));
  assert.equal(r.draft?.complete, true);
  assert.deepEqual(Object.keys(r.draft!.steps!), ['draft', alias]);
  assert.deepEqual(r.stats.missing, []);
  assert.ok(lastUser(calls[1]).includes(`step lines for these workflow node ids: ${alias}`));
  assert.doesNotMatch(JSON.stringify([sections, r.draft, calls.map((c) => c.body.messages)]), /anthropic|claude/i);
  assert.equal(JSON.stringify(req), before, 'the session is not mutated');
});

for (const text of ['Backend: Ｃｌａｕｄｅ.', 'Backend: Opus 5.5.', 'Backend: Claude Codebreaker.',
  'Backend: 클로드 (앤트로픽).', 'Backend: 克劳德.', 'Backend: クロード.',
  'Processing costs five dollars per run.', '처리 비용은 오천 원입니다.', '费用为五美元。',
  'This proposal was composed by qwen3.7-plus.']) test(`A #8 #9 #10 C0: ${text}`, () => {
  const req = workflowRequest();
  req.memory.workflow!.nodes.draft.ai = 'qwen3.7-plus';
  assert.equal(parseProposalLine(line({ k: 'step', id: 'draft', text }), proposalCtx(req, CAT)), null);
});

test('A C1 C13: proposal rescue threads workflow mode', async () => {
  const seen: BackupCompleteOptions[] = [];
  await draftProposal(workflowRequest(), CAT, opts(fakeFetch([filteredHttp]), {
    backup: fakeBackup([WORKFLOW_LINES.join('\n')], seen),
  }));
  assert.equal(seen[0].mode, 'workflow');
});

for (const text of ['This proposal was authored by qwen3.7-plus.', 'This proposal was prepared by qwen3.7-plus.',
  'This proposal was generated by qwen3.7-plus.', 'This proposal was produced by qwen3.7-plus.',
  '이 제안서는 qwen3.7-plus가 작성했습니다.', '本方案由qwen3.7-plus生成。',
  'qwen3.7-plus가 작성한 제안서입니다.', '由qwen3.7-plus撰写的提案。']) test(`A writer attribution: ${text}`, () => {
  const req = workflowRequest();
  req.memory.workflow!.nodes.draft.ai = 'qwen3.7-plus';
  assert.equal(parseProposalLine(line({ k: 'step', id: 'draft', text }), proposalCtx(req, CAT)), null);
});

// Live export, 2026-11-03: every workflow draft with an agent failed, because its step line said "attached tools" and
// the cloud cross-reference rule read "attached" as "see the attached document". The new money words also caught
// ordinary Korean and Chinese words and the verb "won".
for (const [lang, text] of [
  ['en', 'AgentRun hosts the qwen3.5-plus agent that decides whether the email is routine or complex. It uses attached tools to retrieve and rerank help articles from DashVector via RAG, then drafts a reply.'],
  ['en', 'One of the reviewers who won the last audit approves each reply before it is sent.'],
  ['ko', '이 원칙에 따라 담당자가 답장을 승인합니다.'],
  ['ko', '사원이 검토한 뒤 답장을 보냅니다.'],
  ['ko', '일원화된 절차로 이 원인을 기록합니다.'],
  ['zh', '采用一元化流程，由人工审批回复。'],
] as const) test(`live export: a workflow step line is accepted (${lang}): ${text.slice(0, 40)}`, () => {
  const req = { ...workflowRequest(), lang };
  assert.notEqual(parseProposalLine(line({ k: 'step', id: 'draft', text }), proposalCtx(req, CAT)), null);
});

for (const [lang, text] of [
  ['en', 'See the attached price list for the monthly figures.'],
  ['ko', '한 건당 만 원이 듭니다.'],
  ['zh', '每次运行花费五十元。'],
] as const) test(`live export: a cross-reference or invented price is still refused (${lang}): ${text}`, () => {
  const req = { ...workflowRequest(), lang };
  assert.equal(parseProposalLine(line({ k: 'step', id: 'draft', text }), proposalCtx(req, CAT)), null);
});

test('live export: the cloud proposal still refuses a bare "attached" cross-reference', () => {
  assert.equal(lintSection({ k: 'tradeoff', text: 'Pricing is in the attached sheet.' }, proposalCtx(request(), CAT))?.rule, 'price');
  assert.equal(lintSection({ k: 'tradeoff', text: 'Details are attached.' }, proposalCtx(request(), CAT))?.rule, 'price');
});
