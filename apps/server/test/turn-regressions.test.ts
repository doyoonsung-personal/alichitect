import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeTurn, compactTurnMemory } from '../src/turn.ts';
import { checkTurnRequest } from '../src/request.ts';
import { sharedTurnState } from '../../worker/src/turn.ts';
import { crowded, fake, request } from './turn-regressions-fixture.ts';

test('finding 2: summarize the departing Korean exchange before byte compaction', async () => {
  const input = request(crowded(true));
  assert.ok(Buffer.byteLength(JSON.stringify(input)) < 524288);
  assert.ok(checkTurnRequest(input).ok);
  const bodies: any[] = [], events: any[] = [];
  await executeTurn(input, { ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null,
    baseUrl: 'https://fake.invalid', fetchImpl: fake(bodies) }, (e) => events.push(e), new AbortController().signal);
  assert.equal(bodies.length, 2);
  assert.match(bodies[1].messages.at(-1).content, /Remember blue:/);
  const memory = events.find((e) => e.type === 'commit').memory;
  assert.match(memory.summary, /Remember blue/);
  assert.ok(Buffer.byteLength(JSON.stringify(request(memory, '\u0001'.repeat(6000)))) <= 524288);
});

test('finding 3: documents alone exhaust the reserved next-ask budget', () => {
  const input = request(crowded(false), 'Keep');
  assert.ok(Buffer.byteLength(JSON.stringify(input)) < 524288);
  assert.equal(checkTurnRequest(input).ok, false);
  assert.throws(() => compactTurnMemory(input.memory), /budget/);
  delete input.memory.workflow;
  assert.equal(checkTurnRequest(input).ok, false, 'entering workflow mode also reserves the next ask');
});

for (const large of [true, false]) test(`summary failure preserves unsummarized history (large=${large})`, async () => {
  const memory = crowded(true);
  if (!large) memory.turns = memory.turns.map((t) => ({ ...t, text: t.text.slice(0, 100) }));
  const before = structuredClone(memory), bodies: any[] = [], events: any[] = [];
  const out = await executeTurn(request(memory), { ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null,
    baseUrl: 'https://fake.invalid', fetchImpl: fake(bodies, true) }, (e) => events.push(e), new AbortController().signal);
  assert.equal(bodies.length, 2);
  assert.deepEqual(memory, before);
  if (large) {
    assert.equal(out.fatalCode, 'memory-budget');
    assert.ok(!events.some((e) => e.type === 'commit'));
  } else {
    const commit = events.find((e) => e.type === 'commit');
    assert.deepEqual(commit.memory.turns.slice(0, 20), before.turns);
  }
});

test('byte compaction summarizes every departing exchange, including more than the prompt window', async () => {
  const memory = crowded(true);
  memory.turns[2].text = 'Remember green:' + memory.turns[2].text;
  memory.turns.push(...structuredClone(memory.turns.slice(4, 8)));
  const bodies: any[] = [], events: any[] = [];
  await executeTurn(request(memory), { ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null,
    baseUrl: 'https://fake.invalid', fetchImpl: fake(bodies) }, (e) => events.push(e), new AbortController().signal);
  assert.match(bodies[1].messages.at(-1).content, /Remember blue:/);
  assert.match(bodies[1].messages.at(-1).content, /Remember green:/);
  assert.ok(events.some((e) => e.type === 'commit'));
});

test('commit refuses documents that exceed the reserved budget even when admission was bypassed', async () => {
  const events: any[] = [];
  const out = await executeTurn(request(crowded(false), 'Keep'), {
    ...sharedTurnState(), apiKey: 'fake', model: 'fake', fallbackModel: null,
    baseUrl: 'https://fake.invalid', fetchImpl: fake([]),
  }, (e) => events.push(e), new AbortController().signal);
  assert.equal(out.fatalCode, 'memory-budget');
  assert.ok(!events.some((e) => e.type === 'commit'));
});
