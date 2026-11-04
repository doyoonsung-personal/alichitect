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

test('a high-effort pricing turn is grounded in the committed design, old chat and latest correction', async () => {
  const previous = validatePricingSession({ designKey: pricingDesignKey(memory),
    messages: [{ role: 'assistant', text: 'Where are you migrating from?' }],
    estimate: { items: [], assumptions: [], unknowns: ['Data to move'] } });
  const modelReply = { reply: 'The four servers run continuously. Are disks already contracted?',
    items: [{ ...ecs, factors: [4, 730], quantityNote: '4 servers × 730 hours' }, quote,
      { ...quote, label: 'Temporary labor', source: 'USD 125 per hour', unitUsd: 125, unit: 'hour', quantity: 4 }],
    assumptions: ['The selected SKU matches all four VMs.'], unknowns: ['OS fees'] };
  const result = await runPricingTurn({ ...req, pricing: previous }, cat, { apiKey: 'test', fetchImpl: model(JSON.stringify(modelReply), {
    observe(body) {
      assert.equal(body.model, 'qwen3.8-max');
      assert.equal(body.reasoning_effort, 'xhigh');
      assert.equal(body.enable_thinking, true);
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
  for (const response of ['incomplete json', JSON.stringify({ reply: 'Done', items: [{ ...ecs, rateId: 'made-up', quantity: 1 }], assumptions: [], unknowns: [] })]) {
    await assert.rejects(runPricingTurn(req, cat, { apiKey: 'test', fetchImpl: model(response) }), (error: unknown) =>
      error instanceof PricingTurnError && error.costUsd > 0);
  }
});

test('a fee quoted only in won stays unpriced until a USD equivalent is available', async () => {
  const ask = 'KRW 100 per GB';
  const result = await runPricingTurn({ ...req, ask }, cat, { apiKey: 'test',
    fetchImpl: model(JSON.stringify({ reply: 'What USD rate should we use?', items: [{ ...quote, unitUsd: 100, source: ask }],
      assumptions: [], unknowns: [] })) });
  assert.equal(result.pricing.estimate.oneTimeUsd, null);
  assert.match(result.pricing.estimate.unknowns.join(' '), /Confirm a USD unit price/);
});

test('a region inferred from the drawn graph is disclosed; a missing region cannot produce a catalog ECS rate', async () => {
  const graph = { ...memory.graph, groups: { sg: { id: 'sg', kind: 'region' as const, label: 'Singapore', parent: null } } };
  const noRegion = { ...memory, turns: [], requirements: [] };
  const ask = 'How much do two standard ECS instances cost monthly?';
  const reply = JSON.stringify({ reply: 'Is this the right region?', items: [{ ...ecs, quantity: 1460 }],
    assumptions: [], unknowns: ['Confirm SKU'] });
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
