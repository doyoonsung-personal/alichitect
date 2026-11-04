import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';
import { handlePricing } from '../src/pricing.ts';
import * as db from '../src/db.ts';
import { call, makeCtx, makeEnv, req, signIn } from './helpers.ts';

const memory = createMemory();
memory.graph.nodes.web = { id: 'web', product: 'ecs', label: 'Application host', group: null };
const ask = 'Estimate two existing application servers.';
const pricingRequest = (cookie?: string) => req('/api/pricing', {
  method: 'POST', type: 'application/json', cookie, body: JSON.stringify({ sessionId: 'example', lang: 'en', ask, memory }),
});

test('pricing is approved-user only and shares the daily drawing quota', async () => {
  const env = makeEnv({ TURNS_PER_DAY: '1' });
  assert.equal((await call(env, pricingRequest())).status, 401);
  const pending = await signIn(env, 'pending@example.com', { status: 'pending' });
  assert.equal((await call(env, pricingRequest(pending.cookie))).status, 403);
  const { user, cookie } = await signIn(env, 'approved@example.com', { status: 'approved' });
  const price = async () => ({
    costUsd: 0.12, pricing: { designKey: pricingDesignKey(memory), messages: [{ role: 'assistant' as const, text: 'Which region?' }],
      estimate: { currency: 'USD' as const, items: [], monthlyUsd: null, oneTimeUsd: null, assumptions: [], unknowns: ['Region'] } },
  });
  const first = await handlePricing(pricingRequest(cookie), env, makeCtx(), user, price);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).pricing.estimate.monthlyUsd, null);
  assert.equal(await db.turnsToday(env.DB, user.id, Date.now()), 1);
  const denied = await call(env, pricingRequest(cookie));
  assert.equal(denied.status, 429);
  assert.equal((await denied.json()).code, 'quota-exceeded');
  const verified = await signIn(env, 'verified@example.com', { status: 'approved', role: 'verified' });
  await db.recordUsage(env.DB, verified.user.id, db.utcDay(Date.now()), 0.01, 5);
  assert.equal((await handlePricing(pricingRequest(verified.cookie), env, makeCtx(), verified.user, price)).status, 200);
  assert.equal(await db.turnsToday(env.DB, verified.user.id, Date.now()), 6);
});

test('a busy turn blocks pricing and a failed model call releases the slot', async () => {
  const env = makeEnv();
  const { user } = await signIn(env, 'buyer@example.com', { status: 'approved' });
  assert.ok(await db.acquireTurnSlot(env.DB, user.id, 'drawing', Date.now(), 60000));
  const fail = async () => { throw new Error('private upstream detail'); };
  const invoke = () => handlePricing(pricingRequest(), env, makeCtx(), user, fail);
  assert.equal((await invoke()).status, 409);
  await db.releaseTurnSlot(env.DB, user.id, 'drawing');
  const failure = await invoke();
  assert.equal(failure.status, 502);
  assert.ok(!(await failure.text()).includes('private upstream detail'));
  assert.equal(await db.turnsToday(env.DB, user.id, Date.now()), 1);
  assert.ok(await db.acquireTurnSlot(env.DB, user.id, 'drawing_again', Date.now(), 60000));
});
