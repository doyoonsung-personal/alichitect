import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCatalog } from '../src/catalog-node.ts';
import { calculateSolutionEstimate, pricingDesignKey, validatePricingSession, type PricingRequest } from '../src/solution-pricing.ts';
import { PricingTurnError, runPricingTurn } from '../src/solution-pricing-engine.ts';
import type { SessionMemory } from '../src/types.ts';

const memory: SessionMemory = {
  graph: { groups: {}, nodes: { web: { id: 'web', product: 'ecs', label: 'Web servers', group: null } }, edges: {}, recs: [] },
  turns: [{ role: 'user', text: 'Our fleet runs in Singapore.' }], tombstones: [], requirements: ['Stay in Singapore'],
};
const ask = 'We pay USD 0.08 per GB for one-time transfer of 2000 GB.';
const req: PricingRequest = { sessionId: 'prices', lang: 'en', ask, memory };
const cat = loadCatalog();
const quote = { label: 'Source egress', period: 'one-time', basis: 'user', unit: 'GB', unitUsd: 0.08, quantity: 2000, source: 'USD 0.08 per GB' };
const ecs = { label: 'Singapore ECS', period: 'monthly', basis: 'catalog', rateId: 'sg-g7-large-hour' };

test('restore recalculates arithmetic and only uses the verified unit rate for catalog rows', () => {
  const admitted = calculateSolutionEstimate({ currency: 'USD', monthlyUsd: 50000, oneTimeUsd: 11,
    items: [{ ...ecs, unitUsd: 999, quantity: 2920, amountUsd: 99999 }, quote], assumptions: [], unknowns: ['OS fees'] });
  assert.equal(admitted.items[0].unitUsd, 0.108);
  assert.equal(admitted.monthlyUsd, 315.36);
  assert.equal(admitted.oneTimeUsd, 160);
  const empty = calculateSolutionEstimate({ items: [], assumptions: [], unknowns: ['Region'] });
  assert.equal(empty.monthlyUsd, null);
  const zero = calculateSolutionEstimate({ items: [{ ...ecs, rateId: 'smc-tool', period: 'one-time', quantity: 1 }], assumptions: [], unknowns: ['Source egress'] });
  assert.equal(zero.oneTimeUsd, 0);
  assert.equal(zero.monthlyUsd, null);
  const saas = calculateSolutionEstimate({ items: [{ label: 'Direct Qoder Teams plan', period: 'monthly',
    basis: 'catalog', rateId: 'qoder-teams-20261104', quantity: 1 }], assumptions: [], unknowns: ['Add-on credits'] });
  assert.equal(saas.monthlyUsd, 80, 'two billable seats at the direct purchase minimum');
});

function model(text: string, options: { finish?: string; observe?: (body: Record<string, unknown>) => void } = {}): typeof fetch {
  return async (_url, init) => {
    options.observe?.(JSON.parse(String(init?.body)));
    const chunks = [
      { choices: [{ delta: { reasoning_content: 'Private reasoning' } }] },
      { choices: [{ delta: { content: text }, finish_reason: options.finish ?? 'stop' }] },
      { choices: [], usage: { prompt_tokens: 100, completion_tokens: 75 } },
    ];
    return new Response(chunks.map(c => 'data: ' + JSON.stringify(c) + '\n\n').join('') + 'data: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } });
  };
}

test('Flash uses the committed design and earlier pricing answers without waiting for reasoning', async () => {
  const previous = validatePricingSession({ designKey: pricingDesignKey(memory),
    messages: [{ role: 'assistant', text: 'Where are you migrating from?' }],
    estimate: { items: [], assumptions: [], unknowns: ['Data to move'] } });
  const modelReply = { reply: 'The four servers run continuously. Are disks already contracted?',
    changes: [{ ...ecs, factors: [4, 730], quantityNote: '4 servers × 730 hours' }, quote,
      { ...quote, label: 'Temporary labor', source: 'USD 125 per hour', unitUsd: 125, unit: 'hour', quantity: 4 }],
    addAssumptions: ['The selected SKU matches all four VMs.'], addUnknowns: ['OS fees'] };
  const result = await runPricingTurn({ ...req, pricing: previous }, cat, { apiKey: 'test', fetchImpl: model(JSON.stringify(modelReply), {
    observe(body) {
      assert.equal(body.model, 'qwen3.8-flash');
      assert.equal(body.enable_thinking, false);
      const sent = JSON.stringify(body.messages);
      for (const fact of ['Stay in Singapore', 'Web servers', 'Where are you migrating from?', ask]) assert.ok(sent.includes(fact));
    },
  }) });
  assert.equal(result.pricing.estimate.monthlyUsd, 315.36);
  assert.equal(result.pricing.estimate.oneTimeUsd, 660);
  assert.equal(result.pricing.estimate.items[1].basis, 'user');
  assert.equal(result.pricing.estimate.items[2].basis, 'assumption');
  assert.ok(!JSON.stringify(result).includes('Private reasoning'));
  assert.deepEqual(result.pricing.messages.slice(-2), [{ role: 'user', text: ask }, { role: 'assistant', text: modelReply.reply }]);
});

test('bad model output never replaces the previous completed estimate', async () => {
  for (const response of ['incomplete json', JSON.stringify({ reply: 'Done', changes: [{ ...ecs, rateId: 'made-up', quantity: 1 }] })]) {
    await assert.rejects(runPricingTurn(req, cat, { apiKey: 'test', fetchImpl: model(response) }), (error: unknown) =>
      error instanceof PricingTurnError && error.costUsd > 0);
  }
});

test('a correction preserves every untouched row and note, and only invokes Plus when needed', async () => {
  const previous = validatePricingSession({ designKey: pricingDesignKey(memory), messages: [{ role: 'user', text: ask }],
    estimate: { items: [{ ...ecs, quantity: 600, quantityNote: '2 servers × 300 hours' }, quote],
      assumptions: ['Database stays elsewhere'], unknowns: ['Disk size'] } });
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const which = JSON.parse(String(init?.body)).model;
    seen.push(which);
    return model(JSON.stringify(which === 'qwen3.8-flash' ? { needsPlus: true } : {
      reply: 'Updated the second server.', changes: [{ index: 0, quantity: 400, quantityNote: '300 + 100 hours' }],
    }))(url, init);
  };
  const result = await runPricingTurn({ ...req, ask: 'Only the second server changes to 100 hours.', pricing: previous }, cat, { apiKey: 'test', fetchImpl });
  assert.deepEqual(seen, ['qwen3.8-flash', 'qwen3.7-plus']);
  assert.equal(result.pricing.estimate.monthlyUsd, 43.2);
  assert.deepEqual(result.pricing.estimate.items[1], previous.estimate.items[1]);
  assert.deepEqual(result.pricing.estimate.unknowns, previous.estimate.unknowns);
  assert.deepEqual(result.pricing.estimate.assumptions, previous.estimate.assumptions);
});

test('Max reviews the current figures once and a new pricing answer invalidates the review', async () => {
  const previous = validatePricingSession({ designKey: pricingDesignKey(memory), messages: [{ role: 'user', text: ask }],
    estimate: { items: [quote], assumptions: [], unknowns: ['Disk size'] } });
  const reviewReq = { ...req, pricing: previous, intent: 'review' as const };
  const reviewed = await runPricingTurn(reviewReq, cat, { apiKey: 'test', fetchImpl: model(JSON.stringify({ reply: 'Check disk capacity before finalizing.' }), {
    observe(body) { assert.equal(body.model, 'qwen3.8-max'); assert.equal(body.reasoning_effort, 'medium'); },
  }) });
  assert.deepEqual(reviewed.pricing.estimate, previous.estimate);
  assert.deepEqual(reviewed.pricing.messages, previous.messages);
  assert.match(reviewed.pricing.review!.text, /disk capacity/);
  const cached = await runPricingTurn({ ...reviewReq, pricing: reviewed.pricing }, cat, { apiKey: 'test', fetchImpl: async () => assert.fail('unexpected call') });
  assert.equal(cached.costUsd, 0);
  const correction = await runPricingTurn({ ...req, pricing: cached.pricing }, cat, { apiKey: 'test', fetchImpl: model(JSON.stringify({
    reply: 'Thanks.', changes: [], dropUnknowns: [0],
  })) });
  assert.equal(correction.pricing.review, undefined);
  assert.deepEqual(correction.pricing.estimate.items, previous.estimate.items);
  assert.equal(validatePricingSession({ ...cached.pricing, estimate: correction.pricing.estimate }).review, undefined);
  await assert.rejects(runPricingTurn({ ...reviewReq, memory: { ...memory, requirements: [] } }, cat, { apiKey: 'test', fetchImpl: async () => assert.fail() }), PricingTurnError);
});

test('a fee quoted only in won stays unpriced until a USD equivalent is available', async () => {
  const ask = 'KRW 100 per GB';
  const result = await runPricingTurn({ ...req, ask }, cat, { apiKey: 'test',
    fetchImpl: model(JSON.stringify({ reply: 'What USD rate should we use?', changes: [{ ...quote, unitUsd: 100, source: ask }] })) });
  assert.equal(result.pricing.estimate.oneTimeUsd, null);
  assert.match(result.pricing.estimate.unknowns.join(' '), /Confirm a USD unit price/);
});

test('an explicit scenario comparison uses Max with high reasoning and preserves the baseline', async () => {
  const previous = validatePricingSession({ designKey: pricingDesignKey(memory), messages: [{ role: 'user', text: ask }],
    estimate: { items: [quote], assumptions: [], unknowns: [] } });
  const result = await runPricingTurn({ ...req, ask: '현재 기준과 예약 요금을 비교해 주세요.', lang: 'ko', pricing: previous }, cat, {
    apiKey: 'test', fetchImpl: model(JSON.stringify({ reply: '사용 시간이 일정하다면 예약 요금도 확인해 보세요.',
      changes: [{ ...ecs, rateId: 'sg-g7-large-subscription', quantity: 1 }] }), {
      observe(body) { assert.equal(body.model, 'qwen3.8-max'); assert.equal(body.reasoning_effort, 'xhigh'); },
    }),
  });
  assert.deepEqual(result.pricing.estimate, previous.estimate);
  assert.equal(result.pricing.messages.length, 3);
  assert.match(result.pricing.messages[2].text, /시나리오 소계/);
  assert.match(result.pricing.messages[2].text, /160\.00/);
});

test('a region inferred from the drawn graph is disclosed; a missing region cannot produce a catalog ECS rate', async () => {
  const graph = { ...memory.graph, groups: { sg: { id: 'sg', kind: 'region' as const, label: 'Singapore', parent: null } } };
  const noRegion = { ...memory, turns: [], requirements: [] };
  const ask = 'How much do two standard ECS instances cost monthly?';
  const reply = JSON.stringify({ reply: 'Is this the right region?', changes: [{ ...ecs, quantity: 1460 }], addUnknowns: ['Confirm SKU'] });
  const regional = await runPricingTurn({ ...req, ask, memory: { ...noRegion, graph } }, cat, { apiKey: 'test', fetchImpl: model(reply) });
  assert.ok(regional.pricing.estimate.assumptions.some(a => a.includes('ap-southeast-1')));
  await assert.rejects(runPricingTurn({ ...req, ask, memory: noRegion }, cat, { apiKey: 'test', fetchImpl: model(reply) }), PricingTurnError);
});

test('new deployment facts invalidate the estimate; map key order does not', () => {
  const withSettings = { ...memory, workflowSettings: { region: 'ap-southeast-1' } };
  assert.notEqual(pricingDesignKey(memory), pricingDesignKey(withSettings));
  assert.notEqual(pricingDesignKey(memory), pricingDesignKey({ ...memory,
    turns: [...memory.turns, { role: 'user', text: 'Double our numbers.' }] }));
  assert.equal(pricingDesignKey(memory), pricingDesignKey({ ...memory, graph: { recs: [], edges: {}, nodes: memory.graph.nodes, groups: {} } }));
  const workflow = { nodes: {}, edges: {}, groups: {} };
  assert.equal(pricingDesignKey({ ...memory, workflow, estimate: { loops: { deleted: { typical: 2, upper: 3 } } } }),
    pricingDesignKey({ ...memory, workflow, estimate: { loops: {} } }), 'orphaned loop settings disappear during request admission');
});
