import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { configFromEnv, hostsFor } from '../src/config.ts';
import { createTurnServer } from '../src/server.ts';

test('pricing and proposals accept a separate Unicode pricing history while retaining the existing design size limit', async () => {
  const config = configFromEnv({ TURN_LOG: '0' });
  const srv = createTurnServer({ config, apiKey: undefined, catalog: loadCatalog() });
  const port = await srv.listen(0);
  config.allowedHosts = hostsFor(port);
  try {
    const memory = createMemory();
    memory.turns = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: '서'.repeat(12000) }));
    const pricing = { messages: Array.from({ length: 32 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: '价'.repeat(i % 2 ? 4000 : 2000) })),
      designKey: pricingDesignKey(memory), estimate: { currency: 'USD', items: [], assumptions: [], unknowns: ['Region'] } };
    const body = { sessionId: 'example', lang: 'ko', ask: '비용을 추산해 주세요.', memory, pricing };
    const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
    assert.ok(bytes(body) > 512 * 1024 && bytes({ ...body, pricing: undefined }) < 512 * 1024);
    async function code(path: string): Promise<[number, string]> {
      const res = await fetch('http://127.0.0.1:' + port + '/api/' + path, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return [res.status, (await res.json() as { code: string }).code];
    }
    for (const route of ['pricing', 'proposal']) assert.deepEqual(await code(route), [503, 'no-key'], 'passed size and shape checks');
    assert.deepEqual(await code('turn'), [413, 'body-too-large']);
    memory.turns.push({ role: 'user', text: '大'.repeat(18000) });
    for (const route of ['pricing', 'proposal']) assert.deepEqual(await code(route), [413, 'body-too-large']);
  } finally {
    await srv.close();
  }
});
