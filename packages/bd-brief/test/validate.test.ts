// Boundary validation rules: every rejection the plan demands (invented evidence,
// owner-only review states, stale pricing figures, request-id hygiene, mode-specific
// snapshot/noteIds requirements) plus the tolerant-read behaviors.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evidenceIds } from '../src/evidence.ts';
import { conflictingNotes, richSnapshot, sampleContent, thinSnapshot } from '../src/fixtures.ts';
import { LIMITS, makeEmptyContent } from '../src/types.ts';
import {
  validateAddNoteRequest,
  validateChanges,
  validateContent,
  validateCreateBriefRequest,
  validateGenerateRequest,
  validateModelContent,
  validatePatchRequest,
  validateSnapshot,
} from '../src/validate.ts';

const evidence = evidenceIds(richSnapshot(), conflictingNotes());

test('validateSnapshot accepts the fixtures', () => {
  for (const s of [thinSnapshot(), richSnapshot()]) {
    const r = validateSnapshot(s);
    assert.equal(r.ok, true, JSON.stringify(s.sourceKey));
    if (r.ok) assert.deepEqual(r.value, s);
  }
});

test('validateSnapshot rejects wrong contract constants', () => {
  assert.equal(validateSnapshot(null).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), schemaVersion: 2 }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), sourceKind: 'mcp-design' }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), suppliedBy: 'server' }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), lang: 'fr' }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), sourceKey: '' }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), sourceRevision: -1 }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), capturedAt: 'yesterday' }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), capturedAt: Number.MAX_SAFE_INTEGER }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), capturedAt: 1.5 }).ok, false);
  assert.equal(validateSnapshot({ ...thinSnapshot(), sourceRevision: Number.MAX_SAFE_INTEGER + 1 }).ok, false);
});

test('generated content cannot silently invent an answer; accepted owner answers remain valid', () => {
  const content = sampleContent();
  for (const item of [content.opportunity, ...content.valuePoints, ...content.stakeholders, ...content.questions, ...content.concerns]) {
    item.review = 'unreviewed'; item.origin = 'model';
  }
  content.questions[0].answer = { text: 'A supposed customer answer.', noteId: 'note-2', answeredAt: 1700000000000 };
  assert.equal(validateContent(content, evidence).ok, true);
  const modelResult = validateModelContent(content, evidence);
  assert.equal(modelResult.ok, false);
  if (!modelResult.ok) assert.ok(modelResult.issues.some(issue => issue.includes('answer must be null')));
});

test('proposed changes fit the accepted destination field rather than becoming unsavable after review', () => {
  const changes = [{ id: 'chg-long', kind: 'answered-question', section: 'questions', targetId: 'q-1',
    proposedText: 'x'.repeat(LIMITS.itemChars + 1), sourceIds: ['note-2'], conflict: null }];
  const result = validateChanges(changes, evidence, sampleContent());
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some(issue => issue.includes('proposedText exceeds')));
});

test('validateSnapshot rejects pricing figures that are not current', () => {
  const stale = validateSnapshot({
    ...thinSnapshot(),
    pricing: { status: 'stale', currency: 'USD', monthlyUsd: 4820, oneTimeUsd: null, source: null },
  });
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.ok(stale.issues.some((i) => i.includes('monthlyUsd')));
  const missing = validateSnapshot({
    ...thinSnapshot(),
    pricing: { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: 10, source: null },
  });
  assert.equal(missing.ok, false);
  // current figures with a source are fine
  assert.equal(validateSnapshot(richSnapshot()).ok, true);
  // a source string under a non-current status is also rejected
  const sourced = validateSnapshot({
    ...thinSnapshot(),
    pricing: { status: 'stale', currency: null, monthlyUsd: null, oneTimeUsd: null, source: 'session-pricing' },
  });
  assert.equal(sourced.ok, false);
});

test('validateSnapshot enforces statement bounds and unique ids', () => {
  const dupes = validateSnapshot({
    ...thinSnapshot(),
    statements: [
      { id: 'st-1', text: 'a' },
      { id: 'st-1', text: 'b' },
    ],
  });
  assert.equal(dupes.ok, false);
  const tooMany = validateSnapshot({
    ...thinSnapshot(),
    statements: Array.from({ length: LIMITS.statements + 1 }, (_, i) => ({ id: `st-${i}`, text: 'x' })),
  });
  assert.equal(tooMany.ok, false);
  const longText = validateSnapshot({
    ...thinSnapshot(),
    statements: [{ id: 'st-1', text: 'x'.repeat(LIMITS.statementChars + 1) }],
  });
  assert.equal(longText.ok, false);
});

test('validateContent accepts the sample content and the empty content', () => {
  assert.equal(validateContent(sampleContent(), evidence).ok, true);
  // the empty container references no evidence at all
  assert.equal(validateContent(makeEmptyContent(), new Set()).ok, true);
});

test('validateContent rejects invented evidence ids', () => {
  const c = sampleContent();
  c.valuePoints[0].sourceIds = ['st-1', 'made-up-id'];
  const r = validateContent(c, evidence);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.issues.some((i) => i.includes('made-up-id')));
});

test('validateContent rejects duplicate ids and a renamed opportunity', () => {
  const dupes = sampleContent();
  dupes.questions[1].id = dupes.questions[0].id;
  assert.equal(validateContent(dupes, evidence).ok, false);
  const renamed = sampleContent();
  renamed.opportunity.id = 'opp-2';
  assert.equal(validateContent(renamed, evidence).ok, false);
});

test('validateContent enforces stakeholder rules', () => {
  const noSource = sampleContent();
  noSource.stakeholders[0].sourceIds = [];
  assert.equal(validateContent(noSource, evidence).ok, false);
  const emptyName = sampleContent();
  emptyName.stakeholders[0].name = '  ';
  assert.equal(validateContent(emptyName, evidence).ok, false);
  const inventedPerson = sampleContent();
  inventedPerson.stakeholders[1].name = 'Mr. Budget'; // suggested-role must stay nameless
  assert.equal(validateContent(inventedPerson, evidence).ok, false);
});

test('a named stakeholder requires a non-reserved evidence anchor in both postures', () => {
  // Strict posture: reserved whole-object ids alone cannot anchor a named person
  // ("an IT contact is not automatically the budget approver", plan §2/§6).
  const reservedOnly = sampleContent();
  reservedOnly.stakeholders[0].sourceIds = ['design'];
  const r = validateContent(reservedOnly, evidence);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.issues.some((i) => i.includes('non-reserved')));
  const allReserved = sampleContent();
  allReserved.stakeholders[0].sourceIds = ['design', 'pricing']; // 'objective' is not evidence for this snapshot
  assert.equal(validateContent(allReserved, evidence).ok, false);
  // Model posture rejects the same weak citation
  const model = modelContent();
  (model.stakeholders as Record<string, unknown>[])[0].sourceIds = ['pricing'];
  const r2 = validateModelContent(model, evidence);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.ok(r2.issues.some((i) => i.includes('non-reserved')));
  // A statement/note id anchors the person; reserved + non-reserved mixes are fine
  const anchored = sampleContent();
  anchored.stakeholders[0].sourceIds = ['st-1'];
  assert.equal(validateContent(anchored, evidence).ok, true);
  const mixed = sampleContent();
  mixed.stakeholders[0].sourceIds = ['design', 'st-1'];
  assert.equal(validateContent(mixed, evidence).ok, true);
  // 'suggested-role' items are unaffected by the anchor rule
  const suggested = modelContent();
  (suggested.stakeholders as Record<string, unknown>[])[0] = { id: 's', kind: 'suggested-role', name: null, role: 'Budget approval path contact', sourceIds: ['design'], review: 'unreviewed', origin: 'model' };
  assert.equal(validateModelContent(suggested, evidence).ok, true);
  // The shared fixture still validates: its named stakeholder cites note-2
  assert.equal(validateContent(sampleContent(), evidence).ok, true);
});

test('validateContent enforces editorial bounds', () => {
  const tooManyVp = sampleContent();
  for (let i = 0; i < LIMITS.valuePoints + 1; i++) tooManyVp.valuePoints.push({ ...tooManyVp.valuePoints[0], id: `vp-x${i}` });
  assert.equal(validateContent(tooManyVp, evidence).ok, false);
  const tooManyPriority = sampleContent();
  tooManyPriority.questions = Array.from({ length: LIMITS.priorityQuestions + 1 }, (_, i) => ({
    ...sampleContent().questions[0],
    id: `q-p${i}`,
    priority: true,
  }));
  assert.equal(validateContent(tooManyPriority, evidence).ok, false);
  const longOpportunity = sampleContent();
  longOpportunity.opportunity.text = 'x'.repeat(LIMITS.opportunityChars + 1);
  assert.equal(validateContent(longOpportunity, evidence).ok, false);
  const longItem = sampleContent();
  longItem.concerns[0].text = 'x'.repeat(LIMITS.itemChars + 1);
  assert.equal(validateContent(longItem, evidence).ok, false);
  const badReview = sampleContent();
  badReview.concerns[0].review = 'approved' as never;
  assert.equal(validateContent(badReview, evidence).ok, false);
  assert.equal(validateContent({ ...sampleContent(), schemaVersion: 2 }, evidence).ok, false);
});

test('validateContent strips unknown fields instead of rejecting them', () => {
  const raw = { ...sampleContent(), extraTop: 'x', opportunity: { ...sampleContent().opportunity, secret: 1 } } as unknown;
  const r = validateContent(raw, evidence);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal('extraTop' in r.value, false);
    assert.equal('secret' in r.value.opportunity, false);
    assert.equal(r.value.schemaVersion, 1);
  }
});

/** Minimal valid raw model output; sampleContent carries owner-only state
 * (confirmed/edited) that model validation must reject, so tests start here. */
function modelContent(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    opportunity: { id: 'o', text: 'Problem statement.', sourceIds: ['st-1'], review: 'unreviewed', origin: 'model' },
    valuePoints: [{ id: 'v', label: 'L', text: 'T', sourceIds: ['design'], review: 'unreviewed', origin: 'model' }],
    stakeholders: [{ id: 's', kind: 'named', name: 'Kim', role: 'PoC owner', sourceIds: ['note-2'], review: 'unreviewed', origin: 'model' }],
    questions: [],
    concerns: [],
    nextEngagement: null,
  };
}

test('validateModelContent rejects confirmed review and foreign origins', () => {
  assert.equal(validateModelContent(modelContent(), evidence).ok, true);
  const confirmed = modelContent();
  (confirmed.valuePoints as Record<string, unknown>[])[0].review = 'confirmed'; // only the owner confirms
  const r = validateModelContent(confirmed, evidence);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.issues.some((i) => i.includes('valuePoints[0].review')));
  const userOrigin = modelContent();
  (userOrigin.opportunity as Record<string, unknown>).origin = 'user';
  const r2 = validateModelContent(userOrigin, evidence);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.ok(r2.issues.some((i) => i.includes('origin')));
  // strict validateContent accepts owner-confirmed items
  assert.equal(validateContent(sampleContent(), evidence).ok, true);
});

test('validateModelContent normalizes absent origin/review and tolerates model ids', () => {
  const raw = {
    schemaVersion: 1,
    opportunity: { text: 'Short problem statement.', sourceIds: ['st-1'] },
    valuePoints: [{ label: 'L', text: 'T', sourceIds: ['design'] }],
    stakeholders: [],
    questions: [{ text: 'Q?', priority: true, context: null, answer: null, sourceIds: ['st-2'] }],
    concerns: [],
    nextEngagement: null,
  };
  const r = validateModelContent(raw, evidence);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.opportunity.origin, 'model');
    assert.equal(r.value.opportunity.review, 'unreviewed');
    assert.equal(r.value.opportunity.id, ''); // the engine replaces ids anyway
    assert.equal(r.value.opportunity.edited, undefined);
  }
  // duplicate ids pass model validation (engine mints fresh ones) but fail strict
  const dupes = {
    ...raw,
    valuePoints: [
      { id: 'x', label: 'a', text: 'one', sourceIds: ['st-1'] },
      { id: 'x', label: 'b', text: 'two', sourceIds: ['st-1'] },
    ],
  };
  assert.equal(validateModelContent(dupes, evidence).ok, true);
});

function change(over: Record<string, unknown> = {}) {
  return {
    id: 'chg-1',
    kind: 'answered-question',
    section: 'questions',
    targetId: 'q-1',
    proposedText: 'Window functions and CTEs must survive unchanged.',
    sourceIds: ['note-2'],
    conflict: null,
    ...over,
  };
}

test('validateChanges accepts a well-formed change set', () => {
  const r = validateChanges([change()], evidence, sampleContent());
  assert.equal(r.ok, true);
  // the {"changes": [...]} wrapper the prompt asks for is accepted too
  assert.equal(validateChanges({ changes: [change()] }, evidence, sampleContent()).ok, true);
});

test('validateChanges rejects unknown targets, bad kinds/sections and duplicate ids', () => {
  assert.equal(validateChanges([change({ targetId: 'q-nope' })], evidence, sampleContent()).ok, false);
  assert.equal(validateChanges([change({ targetId: 'vp-1' })], evidence, sampleContent()).ok, false); // right id, wrong section
  assert.equal(validateChanges([change({ kind: 'rewrite' })], evidence, sampleContent()).ok, false);
  assert.equal(validateChanges([change({ section: 'budget' })], evidence, sampleContent()).ok, false);
  assert.equal(validateChanges([change(), change()], evidence, sampleContent()).ok, false);
  assert.equal(validateChanges('nope', evidence, sampleContent()).ok, false);
});

test('validateChanges enforces conflict rules and evidence existence', () => {
  const noConflict = validateChanges([change({ kind: 'conflict', conflict: null })], evidence, sampleContent());
  assert.equal(noConflict.ok, false);
  if (!noConflict.ok) assert.ok(noConflict.issues.some((i) => i.includes('conflict')));
  const strayConflict = validateChanges([change({ conflict: { existingText: 'old', existingSourceIds: ['st-1'] } })], evidence, sampleContent());
  assert.equal(strayConflict.ok, false);
  const goodConflict = validateChanges(
    [change({ kind: 'conflict', targetId: 'q-3', conflict: { existingText: 'Security review is a hard gate.', existingSourceIds: ['st-2'] } })],
    evidence,
    sampleContent(),
  );
  assert.equal(goodConflict.ok, true);
  assert.equal(validateChanges([change({ sourceIds: ['note-9'] })], evidence, sampleContent()).ok, false);
  const longText = validateChanges([change({ proposedText: 'x'.repeat(LIMITS.itemChars * 2 + 1) })], evidence, sampleContent());
  assert.equal(longText.ok, false);
  const inventedOldSource = change({ kind: 'conflict', targetId: 'q-3', conflict: { existingText: 'Old claim', existingSourceIds: ['unknown-old-source'] } });
  assert.equal(validateChanges([inventedOldSource], evidence, sampleContent()).ok, false);
  assert.equal(validateChanges([change({ targetId: null })], evidence, sampleContent()).ok, false);
  assert.equal(validateChanges([change({ section: 'valuePoints', targetId: 'vp-1' })], evidence, sampleContent()).ok, false);
});

test('validateGenerateRequest enforces requestId hygiene', () => {
  const base = { mode: 'initial', expectedVersion: 0, lang: 'en', snapshot: thinSnapshot(), noteIds: null };
  assert.equal(validateGenerateRequest({ ...base, requestId: 'req_1-A' }).ok, true);
  for (const bad of ['', 'has space', 'emoji-é', 'a'.repeat(129), 42, null]) {
    assert.equal(validateGenerateRequest({ ...base, requestId: bad }).ok, false, String(bad));
  }
});

test('validateGenerateRequest enforces mode-specific snapshot and noteIds', () => {
  const initial = { requestId: 'r1', mode: 'initial', expectedVersion: 0, lang: 'en', snapshot: thinSnapshot(), noteIds: null };
  assert.equal(validateGenerateRequest(initial).ok, true);
  assert.equal(validateGenerateRequest({ ...initial, snapshot: null }).ok, false); // required for initial/regenerate
  assert.equal(validateGenerateRequest({ ...initial, noteIds: ['note-1'] }).ok, false); // forbidden outside review-notes
  assert.equal(validateGenerateRequest({ ...initial, expectedVersion: -1 }).ok, false);
  assert.equal(validateGenerateRequest({ ...initial, expectedVersion: 1.5 }).ok, false);
  assert.equal(validateGenerateRequest({ ...initial, mode: 'nope' }).ok, false);

  const review = { requestId: 'r2', mode: 'review-notes', expectedVersion: 2, lang: 'ko', snapshot: null, noteIds: ['note-1', 'note-2'] };
  assert.equal(validateGenerateRequest(review).ok, true);
  assert.equal(validateGenerateRequest({ ...review, noteIds: null }).ok, false); // required for review-notes
  assert.equal(validateGenerateRequest({ ...review, noteIds: [] }).ok, false);
  assert.equal(validateGenerateRequest({ ...review, snapshot: thinSnapshot() }).ok, false); // forbidden for review-notes
  assert.equal(
    validateGenerateRequest({ ...review, noteIds: Array.from({ length: LIMITS.notesPerGenerate + 1 }, (_, i) => `note-${i}`) }).ok,
    false,
  );
  assert.equal(validateGenerateRequest({ ...review, noteIds: ['note-1', 'note-1'] }).ok, false);
});

test('validatePatchRequest checks concurrency fields, content and acceptances', () => {
  const base = {
    expectedVersion: 2,
    content: sampleContent(),
    origin: 'edit',
    acceptances: null,
    snapshotFingerprint: 'abc123',
    sourceRevision: 7,
  };
  assert.equal(validatePatchRequest(base, evidence).ok, true);
  assert.equal(validatePatchRequest({ ...base, expectedVersion: -1 }, evidence).ok, false);
  assert.equal(validatePatchRequest({ ...base, origin: 'teleport' }, evidence).ok, false);
  assert.equal(validatePatchRequest({ ...base, sourceRevision: 'x' }, evidence).ok, false);
  assert.equal(validatePatchRequest({ ...base, snapshotFingerprint: 42 }, evidence).ok, false);
  // permissive evidence rule: the caller supplies the evidence set; edits may only
  // reference ids inside it
  const invented = { ...base, content: { ...sampleContent(), concerns: [{ ...sampleContent().concerns[0], sourceIds: ['ghost'] }] } };
  assert.equal(validatePatchRequest(invented, evidence).ok, false);
  const goodAcceptances = {
    ...base,
    origin: 'notes-review',
    acceptances: [
      { changeId: 'chg-1', decision: 'accepted', editedText: null },
      { changeId: 'chg-2', decision: 'rejected', editedText: null },
      { changeId: 'chg-3', decision: 'accepted', editedText: 'BD wording' },
    ],
  };
  assert.equal(validatePatchRequest(goodAcceptances, evidence).ok, true);
  assert.equal(validatePatchRequest({ ...base, acceptances: [{ changeId: 'c', decision: 'maybe', editedText: null }] }, evidence).ok, false);
  assert.equal(validatePatchRequest({ ...base, acceptances: [{ changeId: 'c', decision: 'accepted', editedText: null }, { changeId: 'c', decision: 'rejected', editedText: null }] }, evidence).ok, false);
  assert.equal(validatePatchRequest({ ...base, content: { ...sampleContent(), schemaVersion: 2 } }, evidence).ok, false);
});

test('validateAddNoteRequest bounds the note', () => {
  assert.equal(validateAddNoteRequest({ requestId: 'req-1', text: 'They confirmed the pipeline target.', meetingDate: '2026-11-03', source: 'In-person' }).ok, true);
  assert.equal(validateAddNoteRequest({ requestId: 'req-1', text: '   ', meetingDate: null, source: null }).ok, false);
  assert.equal(validateAddNoteRequest({ requestId: 'req-1', text: 'x'.repeat(LIMITS.noteChars + 1), meetingDate: null, source: null }).ok, false);
  assert.equal(validateAddNoteRequest({ requestId: 'bad id!', text: 'ok', meetingDate: null, source: null }).ok, false);
  assert.equal(validateAddNoteRequest({ requestId: 'req-1', text: 'ok', meetingDate: 42, source: null }).ok, false);
});

test('validateCreateBriefRequest requires a lang, key and valid snapshot', () => {
  assert.equal(validateCreateBriefRequest({ sourceKey: 'sess-1', lang: 'zh', snapshot: thinSnapshot({ sourceKey: 'sess-1' }) }).ok, true);
  assert.equal(validateCreateBriefRequest({ sourceKey: 'different', lang: 'zh', snapshot: thinSnapshot() }).ok, false);
  assert.equal(validateCreateBriefRequest({ sourceKey: '', lang: 'zh', snapshot: thinSnapshot() }).ok, false);
  assert.equal(validateCreateBriefRequest({ sourceKey: 'sess-1', lang: 'de', snapshot: thinSnapshot() }).ok, false);
  assert.equal(validateCreateBriefRequest({ sourceKey: 'sess-1', lang: 'zh', snapshot: { ...thinSnapshot(), schemaVersion: 9 } }).ok, false);
  assert.equal(validateCreateBriefRequest({ sourceKey: 'sess-1', lang: 'zh' }).ok, false);
});
