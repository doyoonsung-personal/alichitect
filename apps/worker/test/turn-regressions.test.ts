import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTurn } from '../src/turn.ts';
import { makeCtx, makeEnv, ndjson, signIn } from './helpers.ts';
import { crowded, fake, request } from '../../server/test/turn-regressions-fixture.ts';
import type { SessionMemory } from '../../../packages/core/src/types.ts';

for (const history of [true, false]) test(`finding ${history ? 2 : 3}: Worker dual-document budget`, async () => {
  const env = makeEnv();
  const { user } = await signIn(env, 'user@example.com', { status: 'approved' });
  const ctx = makeCtx(), bodies: any[] = [];
  const input = request(crowded(history), history ? '中'.repeat(6000) : 'Keep');
  assert.ok(Buffer.byteLength(JSON.stringify(input)) < 524288);
  const res = await handleTurn(new Request('https://example.com/api/turn', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }), env, ctx, user, { fetchImpl: fake(bodies), log: () => {} });
  if (!history) {
    assert.equal(res.status, 400);
    assert.equal(bodies.length, 0);
  } else {
    const events = await ndjson(res);
    await ctx.flush();
    assert.equal(bodies.length, 2);
    assert.match(bodies[1].messages.at(-1).content, /Remember blue:/);
    const memory = events.find((e) => e.type === 'commit')!.memory as SessionMemory;
    assert.match(memory.summary!, /Remember blue/);
    assert.ok(Buffer.byteLength(JSON.stringify(request(memory, '한'.repeat(6000)))) <= 524288);
  }
});

for (const large of [true, false]) test(`Worker preserves unsummarized exchanges on summary failure (large=${large})`, async () => {
  const env = makeEnv();
  const { user } = await signIn(env, 'user@example.com', { status: 'approved' });
  const ctx = makeCtx(), bodies: any[] = [];
  const memory = crowded(true);
  if (!large) memory.turns = memory.turns.map((t) => ({ ...t, text: t.text.slice(0, 100) }));
  const res = await handleTurn(new Request('https://example.com/api/turn', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request(memory)),
  }), env, ctx, user, { fetchImpl: fake(bodies, true), log: () => {} });
  const events = await ndjson(res);
  await ctx.flush();
  assert.equal(bodies.length, 2);
  if (large) {
    assert.ok(events.some((e) => e.type === 'fatal' && e.code === 'memory-budget'));
    assert.ok(!events.some((e) => e.type === 'commit'));
  } else {
    const committed = events.find((e) => e.type === 'commit')!.memory as SessionMemory;
    assert.deepEqual(committed.turns.slice(0, 20), memory.turns);
  }
});
