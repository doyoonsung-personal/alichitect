// Evidence determinism: the fingerprint must ignore transient capture data, react
// to real evidence changes, and the evidence-id set must follow the reserved-id
// rules. normalizeSnapshot must bound and trim without ever throwing.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalJson, evidenceIds, normalizeSnapshot, snapshotFingerprint } from '../src/evidence.ts';
import { conflictingNotes, richSnapshot, thinSnapshot } from '../src/fixtures.ts';
import { EVIDENCE_DESIGN, EVIDENCE_OBJECTIVE, EVIDENCE_PRICING, LIMITS } from '../src/types.ts';

test('canonicalJson sorts object keys and keeps array order', () => {
  assert.equal(canonicalJson({ b: 1, a: [2, 1] }), '{"a":[2,1],"b":1}');
  assert.equal(canonicalJson({ a: { z: 1, y: 2 } }), '{"a":{"y":2,"z":1}}');
  assert.equal(canonicalJson(null), 'null');
  assert.equal(canonicalJson(undefined), 'null');
  // unstable input order must not change the output
  assert.equal(canonicalJson(JSON.parse('{"x":1,"a":2}')), canonicalJson(JSON.parse('{"a":2,"x":1}')));
});

test('fingerprint is a 16-hex deterministic hash and ignores capturedAt', () => {
  const a = richSnapshot();
  const b = richSnapshot({ capturedAt: a.capturedAt + 60_000 });
  assert.match(snapshotFingerprint(a), /^[0-9a-f]{16}$/);
  assert.equal(snapshotFingerprint(a), snapshotFingerprint(b));
  // key order of the whole snapshot object must not matter either
  const reordered = JSON.parse(JSON.stringify(a)) as typeof a;
  assert.equal(snapshotFingerprint(reordered), snapshotFingerprint(a));
});

test('fingerprint changes when a statement, the design or the pricing changes', () => {
  const base = snapshotFingerprint(richSnapshot());
  const statementChanged = richSnapshot();
  statementChanged.statements[0].text += ' (updated)';
  assert.notEqual(snapshotFingerprint(statementChanged), base);
  const designChanged = richSnapshot();
  designChanged.design!.summary += ' plus a landing zone change';
  assert.notEqual(snapshotFingerprint(designChanged), base);
  const pricingChanged = richSnapshot({ pricing: { status: 'stale', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null } });
  assert.notEqual(snapshotFingerprint(pricingChanged), base);
  // a different source session is different evidence
  assert.notEqual(snapshotFingerprint(thinSnapshot()), base);
});

test('fingerprint ignores the BD-side inputs: objective and lang are not source changes', () => {
  const base = richSnapshot();
  const withObjective = richSnapshot({ objective: 'Agree the PoC scope before the quarter ends' });
  assert.equal(snapshotFingerprint(withObjective), snapshotFingerprint(base));
  // The staleness check re-captures without the stored objective, so a brief prepared
  // with one must not become permanently stale (plan §6).
  assert.equal(snapshotFingerprint(richSnapshot({ objective: null })), snapshotFingerprint(withObjective));
  // Switching the UI language is not a source change either.
  assert.equal(snapshotFingerprint(richSnapshot({ lang: 'ko' })), snapshotFingerprint(base));
  assert.equal(snapshotFingerprint(thinSnapshot({ lang: 'zh' })), snapshotFingerprint(thinSnapshot({ lang: 'en' })));
  // A new committed revision of the same source IS a source change.
  assert.notEqual(snapshotFingerprint(richSnapshot({ sourceRevision: base.sourceRevision + 1 })), snapshotFingerprint(base));
});

test('evidenceIds follows the reserved-id rules', () => {
  // rich: objective is null -> no objective id; design exists -> design id; pricing always
  const rich = evidenceIds(richSnapshot(), []);
  assert.ok(rich.has('st-1'));
  assert.ok(rich.has(EVIDENCE_DESIGN));
  assert.ok(rich.has(EVIDENCE_PRICING));
  assert.ok(!rich.has(EVIDENCE_OBJECTIVE));
  // thin: objective non-empty -> objective id; no design -> no design id
  const thin = evidenceIds(thinSnapshot(), []);
  assert.ok(thin.has(EVIDENCE_OBJECTIVE));
  assert.ok(!thin.has(EVIDENCE_DESIGN));
  assert.ok(thin.has(EVIDENCE_PRICING));
  // empty objective counts as absent
  assert.ok(!evidenceIds(thinSnapshot({ objective: '' }), []).has(EVIDENCE_OBJECTIVE));
  assert.ok(!evidenceIds(thinSnapshot({ objective: '   ' }), []).has(EVIDENCE_OBJECTIVE));
  // note ids join the set
  const withNotes = evidenceIds(richSnapshot(), conflictingNotes());
  for (const n of conflictingNotes()) assert.ok(withNotes.has(n.id));
});

test('normalizeSnapshot trims strings and keeps the most recent statements under the cap', () => {
  const many = Array.from({ length: LIMITS.statements + 20 }, (_, i) => ({ id: `st-${i}`, text: `statement ${i}` }));
  const s = normalizeSnapshot({
    ...richSnapshot(),
    sourceKey: '  sess-trim  ',
    objective: '  keep me  ',
    statements: many,
  });
  assert.ok(s);
  assert.equal(s.sourceKey, 'sess-trim');
  assert.equal(s.objective, 'keep me');
  assert.equal(s.statements.length, LIMITS.statements);
  // deterministic selection: keep the MOST RECENT (tail) statements up to the cap
  assert.equal(s.statements[0].id, 'st-20');
  assert.equal(s.statements[s.statements.length - 1].id, `st-${LIMITS.statements + 19}`);
  assert.equal(s.schemaVersion, 1);
  assert.equal(s.suppliedBy, 'signed-in-user');
});

test('normalizeSnapshot drops empty statements, duplicate ids and empty ids', () => {
  const s = normalizeSnapshot({
    ...thinSnapshot(),
    statements: [
      { id: ' st-a ', text: '  first  ' },
      { id: 'st-b', text: '   ' }, // empty text carries no evidence
      { id: '', text: 'no id' },
      { id: 'st-a', text: 'duplicate id' },
      'junk',
      { id: 'st-c', text: 'last' },
    ],
  });
  assert.ok(s);
  assert.deepEqual(s.statements, [
    { id: 'st-a', text: 'first' },
    { id: 'st-c', text: 'last' },
  ]);
});

test('normalizeSnapshot forces contract invariants', () => {
  const s = normalizeSnapshot({
    ...thinSnapshot(),
    lang: 'fr', // unsupported -> defaults to en
    sourceRevision: '7', // numeric string coerces
    capturedAt: 'nope', // unusable -> 0
    pricing: { status: 'stale', currency: 'USD', monthlyUsd: 999, oneTimeUsd: 5, source: 'x' },
  });
  assert.ok(s);
  assert.equal(s.lang, 'en');
  assert.equal(s.sourceRevision, 7);
  assert.equal(s.capturedAt, 0);
  // stale estimates never carry figures that could be reprinted as current
  assert.equal(s.pricing.status, 'stale');
  assert.equal(s.pricing.monthlyUsd, null);
  assert.equal(s.pricing.oneTimeUsd, null);
  assert.equal(s.pricing.source, null);
  assert.equal(s.pricing.currency, null);
});

test('normalizeSnapshot caps design arrays and lengths', () => {
  const s = normalizeSnapshot({
    ...richSnapshot(),
    objective: 'x'.repeat(LIMITS.objectiveChars + 50),
    design: {
      summary: 'y'.repeat(LIMITS.designSummaryChars + 50),
      capabilities: Array.from({ length: LIMITS.capabilities + 5 }, (_, i) => ({ id: `cap-${i}`, name: `Cap ${i}` })),
      boundaries: Array.from({ length: LIMITS.boundaries + 5 }, (_, i) => `boundary ${i}`),
    },
  });
  assert.ok(s);
  assert.equal(s.objective!.length, LIMITS.objectiveChars);
  assert.equal(s.design!.summary.length, LIMITS.designSummaryChars);
  assert.equal(s.design!.capabilities.length, LIMITS.capabilities);
  assert.equal(s.design!.boundaries.length, LIMITS.boundaries);
});

test('normalizeSnapshot returns null for unusable shapes and never throws', () => {
  assert.equal(normalizeSnapshot(null), null);
  assert.equal(normalizeSnapshot(42), null);
  assert.equal(normalizeSnapshot([]), null);
  assert.equal(normalizeSnapshot({ sourceKey: '   ' }), null);
  assert.equal(normalizeSnapshot({ sourceKey: 7 }), null);
  // junk in nested positions degrades to empty defaults, not exceptions
  const s = normalizeSnapshot({ sourceKey: 'ok', statements: 'nope', design: 42, pricing: null, objective: {} });
  assert.ok(s);
  assert.deepEqual(s.statements, []);
  assert.equal(s.design, null);
  assert.equal(s.pricing.status, 'missing');
  assert.equal(s.objective, null);
});
