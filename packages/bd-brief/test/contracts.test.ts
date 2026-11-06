// Contract smoke tests: the fixtures every agent codes against must satisfy the
// contracts in src/types.ts. Domain validation (validate.ts) adds the real rules;
// these checks keep the fixtures themselves honest.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  conflictingNotes,
  emptyBriefRecord,
  richSnapshot,
  sampleBriefRecord,
  sampleContent,
  thinSnapshot,
} from '../src/fixtures.ts';
import { BD_BRIEF_SCHEMA_VERSION, LIMITS, makeEmptyContent } from '../src/types.ts';

test('snapshots carry the schema version and bounded payloads', () => {
  for (const s of [thinSnapshot(), richSnapshot()]) {
    assert.equal(s.schemaVersion, BD_BRIEF_SCHEMA_VERSION);
    assert.equal(s.suppliedBy, 'signed-in-user');
    assert.equal(s.sourceKind, 'browser-session');
    assert.ok(s.sourceKey.length > 0);
    assert.ok(s.statements.length <= LIMITS.statements);
    for (const st of s.statements) assert.ok(st.text.length <= LIMITS.statementChars);
    const ids = s.statements.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length, 'statement ids must be unique within the snapshot');
  }
});

test('thin snapshot keeps pricing and design unknown instead of inventing them', () => {
  const s = thinSnapshot();
  assert.equal(s.design, null);
  assert.equal(s.pricing.status, 'missing');
  assert.equal(s.pricing.monthlyUsd, null);
  assert.equal(s.pricing.oneTimeUsd, null);
  assert.equal(s.pricing.source, null);
});

test('current pricing carries exact figures and a source; the fingerprint inputs exclude capturedAt', () => {
  const s = richSnapshot();
  assert.equal(s.pricing.status, 'current');
  assert.equal(s.pricing.monthlyUsd, 4820);
  assert.equal(s.pricing.source, 'session-pricing');
  // capturedAt differs but the evidence is otherwise identical -> snapshots must be comparable by field, not by object identity.
  const later = richSnapshot({ capturedAt: s.capturedAt + 60_000 });
  assert.equal(JSON.stringify({ ...later, capturedAt: 0 }), JSON.stringify({ ...s, capturedAt: 0 }));
});

test('notes are attributed and reference their brief', () => {
  const notes = conflictingNotes('brief-x');
  assert.equal(notes.length, 3);
  for (const n of notes) {
    assert.equal(n.briefId, 'brief-x');
    assert.ok(n.text.length <= LIMITS.noteChars);
    assert.ok(n.requestId.length > 0);
  }
  const reqIds = notes.map((n) => n.requestId);
  assert.equal(new Set(reqIds).size, reqIds.length);
});

test('empty content invents nothing', () => {
  const c = makeEmptyContent();
  assert.equal(c.schemaVersion, BD_BRIEF_SCHEMA_VERSION);
  assert.equal(c.opportunity.text, '');
  assert.equal(c.valuePoints.length, 0);
  assert.equal(c.stakeholders.length, 0);
  assert.equal(c.questions.length, 0);
  assert.equal(c.concerns.length, 0);
  assert.equal(c.nextEngagement, null);
});

test('sample content respects the editorial limits', () => {
  const c = sampleContent();
  assert.ok(c.valuePoints.length <= LIMITS.valuePoints);
  assert.ok(c.concerns.length <= LIMITS.concerns);
  assert.ok(c.questions.filter((q) => q.priority).length <= LIMITS.priorityQuestions);
  assert.ok(c.opportunity.text.length <= LIMITS.opportunityChars);
  // A named stakeholder has a name and at least one source; a suggested role has no invented person.
  for (const sh of c.stakeholders) {
    if (sh.kind === 'named') {
      assert.ok(sh.name && sh.name.length > 0);
      assert.ok(sh.sourceIds.length > 0);
    } else {
      assert.equal(sh.name, null);
    }
  }
  // A hypothesis concern is labeled as one.
  const hypo = c.concerns.find((x) => x.kind === 'hypothesis');
  assert.ok(hypo, 'fixture must include a labeled hypothesis concern');
});

test('sample records are owner-scoped and version-consistent', () => {
  const rec = sampleBriefRecord();
  assert.ok(rec.ownerId.length > 0);
  assert.ok(rec.version >= 1);
  assert.ok(rec.snapshotFingerprint.length > 0);
  const empty = emptyBriefRecord();
  assert.equal(empty.version, 0);
  assert.equal(empty.content.opportunity.text, '');
});
