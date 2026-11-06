// Pure extraction tests for buildSnapshot (plan §6): bounded, deterministic, copies only.
// The fingerprint test imports the package's evidence.ts (pinned parallel export); if that
// module is not in place yet this file fails on import — deliberately, never stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SessionMemory } from '@ali/core/types.ts';
import type { PricingSession } from '@ali/core/solution-pricing.ts';
import { pricingDesignKey } from '@ali/core/solution-pricing.ts';
import type { SessionRecord } from '../../store/types.ts';
import { LIMITS } from '@ali/bd-brief/types.ts';
import { snapshotFingerprint } from '@ali/bd-brief/evidence.ts';
import { buildSnapshot } from './snapshot.ts';

const emptyMemory = (over: Partial<SessionMemory> = {}): SessionMemory => ({
  turns: [],
  requirements: [],
  graph: { groups: {}, nodes: {}, edges: {}, recs: [] },
  tombstones: [],
  ...over,
});

const makeSession = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  mode: 'cloud',
  id: 'sess-test-1',
  createdAt: 0,
  updatedAt: 0,
  title: 'test',
  memory: emptyMemory(),
  revisions: [],
  reqPinnedIn: {},
  provenance: {},
  summarizedThrough: 0,
  summarizing: false,
  replayOf: null,
  ...over,
});

const lookups = {
  nameOf: (id: string): string | null => (id === 'maxcompute' ? 'MaxCompute' : id === 'dataworks' ? 'DataWorks' : null),
};

const opts = { lang: 'en' as const, objective: null, now: 1_700_000_000_000 };

test('workflow-only sessions retain workflow evidence and newest-first revisions use the latest number', () => {
  const session = makeSession({ memory: emptyMemory({ workflow: { nodes: {
    review: { id: 'review', kind: 'human', label: 'Manager review', subject: 'draft', approval: 'required' },
    draft: { id: 'draft', kind: 'agent', label: 'Prepare inventory plan', product: 'maxcompute', runs: 'customer', effect: 'send' },
  }, edges: { retry: { id: 'retry', from: 'review', to: 'draft', kind: 'loop', outcome: 'edit', max: 2 } }, groups: {} } }) });
  session.revisions = [{ n: 5 }, { n: 3 }] as SessionRecord['revisions'];
  const snap = buildSnapshot(session, lookups, opts);
  assert.equal(snap.sourceRevision, 5);
  assert.ok(snap.design);
  assert.match(snap.design.summary, /Manager review/);
  assert.match(snap.design.summary, /loop; edit/);
  assert.match(snap.design.summary, /max 2/);
  assert.deepEqual(snap.design.capabilities, [{ id: 'maxcompute', name: 'MaxCompute' }]);
  assert.ok(snap.design.boundaries.some(text => text.includes('Approval required before draft')));
  assert.ok(snap.design.boundaries.some(text => text.includes('Customer-managed runtime boundary: draft')));
  assert.match(snap.design.summary, /effect send; runtime customer/);
  const before = snapshotFingerprint(snap);
  session.memory.workflow!.nodes.draft.label = 'Prepare a revised inventory plan';
  assert.notEqual(snapshotFingerprint(buildSnapshot(session, lookups, opts)), before);
});

test('statements: requirements first (rq-<i>), then user turns by turn index (st-<n>), most recent last', () => {
  const session = makeSession({
    memory: emptyMemory({
      requirements: ['stay in ap-southeast-1', 'no external transfer'],
      turns: [
        { role: 'user', text: 'first ask' },
        { role: 'assistant', text: 'narration' },
        { role: 'user', text: 'second ask' },
      ],
    }),
  });
  const snap = buildSnapshot(session, lookups, opts);
  assert.deepEqual(snap.statements, [
    { id: 'rq-0', text: 'stay in ap-southeast-1' },
    { id: 'rq-1', text: 'no external transfer' },
    { id: 'st-0', text: 'first ask' },
    // st-1 is the assistant turn: user-turn ids stay stable at their index in memory.turns
    { id: 'st-2', text: 'second ask' },
  ]);
});

test('statements: bounded to LIMITS.statements keeping the most recent, each cut to LIMITS.statementChars', () => {
  const turns = Array.from({ length: 80 }, (_, i) => ({ role: 'user' as const, text: i === 79 ? 'x'.repeat(LIMITS.statementChars + 100) : `ask ${i}` }));
  const session = makeSession({ memory: emptyMemory({ requirements: ['r1', 'r2', 'r3'], turns }) });
  const snap = buildSnapshot(session, lookups, opts);
  assert.equal(snap.statements.length, LIMITS.statements);
  // the newest entry survives and is truncated; the oldest (requirements) were dropped first
  const last = snap.statements.at(-1)!;
  assert.equal(last.id, 'st-79');
  assert.equal(last.text.length, LIMITS.statementChars);
  assert.ok(!snap.statements.some((s) => s.id.startsWith('rq-')));
});

test('pricing: missing without session.pricing; current copies exact figures; stale nulls them', () => {
  const memory = emptyMemory({ requirements: ['keep it cheap'] });
  const missing = buildSnapshot(makeSession({ memory }), lookups, opts);
  assert.deepEqual(missing.pricing, { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null });

  const estimate = { currency: 'USD' as const, items: [], monthlyUsd: 4820, oneTimeUsd: 1500, assumptions: [], unknowns: [] };
  // the SAME freshness rule export/model.ts uses: designKey vs pricingDesignKey(memory)
  const current: PricingSession = { messages: [], estimate, designKey: pricingDesignKey(memory) };
  const cur = buildSnapshot(makeSession({ memory, pricing: current }), lookups, opts);
  assert.deepEqual(cur.pricing, { status: 'current', currency: 'USD', monthlyUsd: 4820, oneTimeUsd: 1500, source: 'session-pricing' });

  const stale: PricingSession = { messages: [], estimate, designKey: 'price1:deadbeef:1' };
  const st = buildSnapshot(makeSession({ memory, pricing: stale }), lookups, opts);
  assert.deepEqual(st.pricing, { status: 'stale', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null });
});

test('capturedAt is excluded from the fingerprint (transient timestamp)', () => {
  const session = makeSession({ memory: emptyMemory({ turns: [{ role: 'user', text: 'we need a warehouse' }] }) });
  const a = buildSnapshot(session, lookups, { ...opts, now: 1 });
  const b = buildSnapshot(session, lookups, { ...opts, now: 2 });
  assert.notEqual(a.capturedAt, b.capturedAt);
  assert.equal(snapshotFingerprint(a), snapshotFingerprint(b));
});

test('design is null when the committed graph has no nodes', () => {
  const snap = buildSnapshot(makeSession(), lookups, opts);
  assert.equal(snap.design, null);
});

test('design: bounded summary, distinct capabilities mapped through the catalog, capped and cut boundaries', () => {
  const session = makeSession({
    memory: emptyMemory({
      summary: 's'.repeat(LIMITS.designSummaryChars + 50),
      graph: {
        groups: {},
        nodes: {
          a: { id: 'a', product: 'maxcompute', label: 'MC', group: null },
          b: { id: 'b', product: 'maxcompute', label: 'MC 2', group: null },
          c: { id: 'c', product: 'dataworks', label: 'DW', group: null },
          d: { id: 'd', product: 'unknown-thing', label: '?', group: null },
        },
        edges: {},
        recs: [],
      },
      constraints: Array.from({ length: LIMITS.boundaries + 5 }, (_, i) => ({ text: i === 0 ? 'b'.repeat(LIMITS.boundaryChars + 10) : `boundary ${i}` })),
    }),
  });
  const snap = buildSnapshot(session, lookups, opts);
  assert.ok(snap.design);
  assert.equal(snap.design!.summary.length, LIMITS.designSummaryChars);
  // distinct product ids in node order; an unknown id falls back to the id as its name
  assert.deepEqual(snap.design!.capabilities, [
    { id: 'maxcompute', name: 'MaxCompute' },
    { id: 'dataworks', name: 'DataWorks' },
    { id: 'unknown-thing', name: 'unknown-thing' },
  ]);
  assert.equal(snap.design!.boundaries.length, LIMITS.boundaries);
  assert.equal(snap.design!.boundaries[0].length, LIMITS.boundaryChars);
});

test('snapshot is a copy: mutating it (and its objective) never reaches the session', () => {
  const session = makeSession({
    memory: emptyMemory({
      requirements: ['pinned'],
      turns: [{ role: 'user', text: 'customer words' }],
      constraints: [{ text: 'boundary' }],
      graph: { groups: {}, nodes: { a: { id: 'a', product: 'maxcompute', label: 'MC', group: null } }, edges: {}, recs: [] },
    }),
  });
  const snap = buildSnapshot(session, lookups, { ...opts, objective: 'o'.repeat(LIMITS.objectiveChars + 10) });
  snap.statements[0].text = 'tampered';
  snap.design!.capabilities[0].name = 'tampered';
  snap.design!.boundaries[0] = 'tampered';
  assert.equal(session.memory.requirements[0], 'pinned');
  assert.equal(session.memory.turns[0].text, 'customer words');
  assert.equal(session.memory.constraints![0].text, 'boundary');
  // the objective is trimmed to the contract bound
  assert.equal(snap.objective!.length, LIMITS.objectiveChars);
});

test('identity fields: sourceKey, last committed revision, capturedAt', () => {
  const session = makeSession({
    id: 'sess-42',
    revisions: [{ n: 2 }, { n: 3 }] as unknown as SessionRecord['revisions'],
  });
  const snap = buildSnapshot(session, lookups, { ...opts, now: 999 });
  assert.equal(snap.sourceKey, 'sess-42');
  assert.equal(snap.sourceRevision, 3);
  assert.equal(snap.capturedAt, 999);
  assert.equal(snap.sourceKind, 'browser-session');
  assert.equal(snap.suppliedBy, 'signed-in-user');
  assert.equal(buildSnapshot(makeSession(), lookups, opts).sourceRevision, 0);
});
