// Reviewed application semantics: acceptances drive every mutation, conflicts stay
// visible when rejected, BD-edited/confirmed items are only touched by explicit
// decisions, limits are reported as skips, and the input content is never mutated.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyChanges } from '../src/changes.ts';
import type { ApplyChangesDeps } from '../src/changes.ts';
import { sampleContent } from '../src/fixtures.ts';
import type { BriefContent, ChangeAcceptance, ProposedChange } from '../src/types.ts';
import { LIMITS } from '../src/types.ts';

const NOW = 5_000;

function makeDeps(noteIds?: readonly string[]): ApplyChangesDeps {
  let n = 0;
  return { ids: { next: (prefix: string) => `${prefix}-${n++}` }, clock: { now: () => NOW }, noteIds };
}

function makeChange(over: Partial<ProposedChange> = {}): ProposedChange {
  return {
    id: 'chg-1',
    kind: 'update',
    section: 'valuePoints',
    targetId: 'vp-1',
    proposedText: 'DataWorks orchestration now covers ingestion and batch.',
    sourceIds: ['note-2'],
    conflict: null,
    ...over,
  };
}

function accepted(changeId: string, editedText: string | null = null): ChangeAcceptance {
  return { changeId, decision: 'accepted', editedText };
}

test('accepted answered-question records the answer, the note and confirmation', () => {
  const before = sampleContent();
  const frozen = JSON.stringify(before);
  const change = makeChange({
    id: 'chg-a',
    kind: 'answered-question',
    section: 'questions',
    targetId: 'q-1',
    proposedText: 'Only window functions and CTEs must survive unchanged.',
    sourceIds: ['note-2', 'st-3'],
  });
  const r = applyChanges(before, [change], [accepted('chg-a')], makeDeps(['note-1', 'note-2', 'note-3']));
  assert.deepEqual(r.appliedIds, ['chg-a']);
  assert.deepEqual(r.skippedIds, []);
  const q = r.content.questions.find((x) => x.id === 'q-1')!;
  assert.deepEqual(q.answer, { text: change.proposedText, noteId: 'note-2', answeredAt: NOW });
  assert.equal(q.review, 'confirmed');
  assert.notEqual(q.edited, true); // accepted as proposed: no BD wording change
  assert.deepEqual(q.sourceIds, ['st-3', 'note-2']); // merged, deduped, original order first
  // the input is never mutated
  assert.equal(JSON.stringify(before), frozen);
});

test('answered-question with edited text marks edited and uses the BD wording', () => {
  const change = makeChange({ id: 'chg-e', kind: 'answered-question', section: 'questions', targetId: 'q-2', proposedText: 'Committee needs a run-rate sheet.', sourceIds: ['note-1'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-e', 'Committee needs the monthly run-rate sheet first.')], makeDeps(['note-1']));
  const q = r.content.questions.find((x) => x.id === 'q-2')!;
  assert.equal(q.answer!.text, 'Committee needs the monthly run-rate sheet first.');
  assert.equal(q.edited, true);
  assert.equal(q.review, 'confirmed');
});

test('answered-question without supplied note ids records noteId null', () => {
  const change = makeChange({ id: 'chg-n', kind: 'answered-question', section: 'questions', targetId: 'q-1', proposedText: 'Answer.', sourceIds: ['note-2'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-n')], makeDeps());
  assert.equal(r.content.questions.find((x) => x.id === 'q-1')!.answer!.noteId, null);
});

test('accepted update replaces the item text, confirms and merges sources', () => {
  const change = makeChange({ targetId: 'vp-1', proposedText: 'Updated value wording.', sourceIds: ['note-2', 'design'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-1')], makeDeps());
  const vp = r.content.valuePoints.find((x) => x.id === 'vp-1')!;
  assert.equal(vp.text, 'Updated value wording.');
  assert.equal(vp.label, 'Managed pipeline'); // labels are never rewritten by a change
  assert.equal(vp.review, 'confirmed');
  assert.deepEqual(vp.sourceIds, ['st-1', 'design', 'note-2']); // deduped merge
});

test('accepted new-fact without target appends a confirmed item; stakeholders stay nameless', () => {
  const change = makeChange({ id: 'chg-new', kind: 'new-fact', section: 'stakeholders', targetId: null, proposedText: 'A finance analyst will join the evaluation.', sourceIds: ['note-1'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-new')], makeDeps());
  assert.deepEqual(r.appliedIds, ['chg-new']);
  const added = r.content.stakeholders[r.content.stakeholders.length - 1];
  assert.equal(added.id, 'sh-0'); // host-minted id
  assert.equal(added.kind, 'suggested-role');
  assert.equal(added.name, null);
  assert.equal(added.role, change.proposedText);
  assert.equal(added.review, 'confirmed'); // the BD explicitly accepted it
  assert.equal(added.origin, 'model');
});

test('untargeted value-point addition starts unlabeled with otherwise sane fields', () => {
  const change = makeChange({ id: 'chg-vp', kind: 'new-fact', section: 'valuePoints', targetId: null, proposedText: 'A new value point stated in the notes.', sourceIds: ['note-1'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-vp')], makeDeps());
  assert.deepEqual(r.appliedIds, ['chg-vp']);
  const added = r.content.valuePoints[r.content.valuePoints.length - 1];
  // ProposedChange carries no label: the item starts with label '' and the web
  // layer renders a localized fallback (documented in the changes.ts header).
  assert.equal(added.label, '');
  assert.equal(added.text, change.proposedText);
  assert.equal(added.review, 'confirmed'); // the BD explicitly accepted it
  assert.equal(added.origin, 'model'); // the wording came from the model proposal
  assert.deepEqual(added.sourceIds, ['note-1']); // copied from the change
  assert.equal(added.edited, false); // accepted as proposed
});

test('a full section reports the addition as skipped instead of overflowing', () => {
  const content = sampleContent();
  while (content.concerns.length < LIMITS.concerns) {
    content.concerns.push({ ...content.concerns[0], id: `cn-fill-${content.concerns.length}` });
  }
  const change = makeChange({ id: 'chg-full', kind: 'new-fact', section: 'concerns', targetId: null, proposedText: 'One more concern.', sourceIds: ['note-1'] });
  const r = applyChanges(content, [change], [accepted('chg-full')], makeDeps());
  assert.deepEqual(r.skippedIds, ['chg-full']);
  assert.deepEqual(r.appliedIds, []);
  assert.equal(r.content.concerns.length, LIMITS.concerns);
});

test('accepted conflict replaces the text and clears the conflicted state', () => {
  const change = makeChange({
    id: 'chg-c',
    kind: 'conflict',
    section: 'questions',
    targetId: 'q-3',
    proposedText: 'Security review is now described as already in motion.',
    sourceIds: ['note-3'],
    conflict: { existingText: 'Security review must approve before production.', existingSourceIds: ['st-2'] },
  });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-c')], makeDeps());
  const q = r.content.questions.find((x) => x.id === 'q-3')!;
  assert.equal(q.text, change.proposedText);
  assert.equal(q.review, 'confirmed'); // resolution clears 'conflicted'
});

test('rejected conflict keeps the text but marks the item conflicted', () => {
  const change = makeChange({
    id: 'chg-r',
    kind: 'conflict',
    section: 'questions',
    targetId: 'q-1', // q-1 starts 'unreviewed' in the fixture
    proposedText: 'Something contradictory.',
    sourceIds: ['note-1'],
    conflict: { existingText: 'Existing claim.', existingSourceIds: ['st-3'] },
  });
  const r = applyChanges(sampleContent(), [change], [{ changeId: 'chg-r', decision: 'rejected', editedText: null }], makeDeps());
  const q = r.content.questions.find((x) => x.id === 'q-1')!;
  assert.equal(q.text, 'Which SQL dialect features must survive the warehouse migration unchanged?'); // unchanged
  assert.equal(q.review, 'conflicted'); // unresolved disagreement stays visible
  assert.deepEqual(r.appliedIds, ['chg-r']); // the decision itself was carried out
});

test('rejected non-conflict changes leave content untouched', () => {
  const before = sampleContent();
  const frozen = JSON.stringify(before);
  const change = makeChange({ id: 'chg-x', proposedText: 'Ignored wording.' });
  const r = applyChanges(before, [change], [{ changeId: 'chg-x', decision: 'rejected', editedText: null }], makeDeps());
  assert.equal(JSON.stringify(r.content), frozen);
  assert.deepEqual(r.appliedIds, ['chg-x']);
});

test('items with no acceptance decision are never modified, including edited/confirmed ones', () => {
  const before = sampleContent();
  // a change targets the BD-confirmed opportunity and an unreviewed question,
  // but the BD decided on neither
  const changes = [
    makeChange({ id: 'chg-o', section: 'opportunity', targetId: 'opportunity', proposedText: 'Rewritten opportunity.' }),
    makeChange({ id: 'chg-q', section: 'questions', targetId: 'q-2', proposedText: 'Rewritten question.' }),
  ];
  const r = applyChanges(before, changes, [], makeDeps());
  assert.equal(r.content.opportunity.text, before.opportunity.text);
  assert.equal(r.content.opportunity.review, 'confirmed');
  assert.equal(r.content.questions.find((x) => x.id === 'q-2')!.text, before.questions.find((x) => x.id === 'q-2')!.text);
  assert.deepEqual(r.appliedIds, []);
  assert.deepEqual(r.skippedIds, []);
});

test('accepted proposed-action creates a next engagement with null owner/date', () => {
  const content: BriefContent = { ...sampleContent(), nextEngagement: null };
  const change = makeChange({ id: 'chg-p', kind: 'proposed-action', section: 'nextEngagement', targetId: null, proposedText: 'Scope an ingestion-only PoC with the platform team.', sourceIds: ['note-2'] });
  const r = applyChanges(content, [change], [accepted('chg-p')], makeDeps());
  const n = r.content.nextEngagement!;
  assert.equal(n.id, 'next-0');
  assert.equal(n.kind, 'discovery');
  assert.equal(n.decision, change.proposedText);
  assert.equal(n.owner, null); // never parsed out of free text
  assert.equal(n.date, null);
  assert.equal(n.review, 'confirmed');
});

test('accepted proposed-action updates an existing engagement and keeps kind/owner/date', () => {
  const change = makeChange({ id: 'chg-p2', kind: 'proposed-action', section: 'nextEngagement', targetId: 'next-1', proposedText: 'Move the PoC scoping to the Seoul workshop.', sourceIds: ['note-2'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-p2')], makeDeps());
  const n = r.content.nextEngagement!;
  assert.equal(n.id, 'next-1');
  assert.equal(n.kind, 'poc-scoping'); // kept, not reset
  assert.equal(n.owner, 'Kim (platform team) — customer side'); // kept, not invented away
  assert.equal(n.decision, change.proposedText);
  assert.equal(n.review, 'confirmed');
});

test('proposed-action aimed at a question becomes expandable context', () => {
  const change = makeChange({ id: 'chg-pq', kind: 'proposed-action', section: 'questions', targetId: 'q-2', proposedText: 'Bring the run-rate sheet to the committee meeting.', sourceIds: ['note-1'] });
  const r = applyChanges(sampleContent(), [change], [accepted('chg-pq')], makeDeps());
  const q = r.content.questions.find((x) => x.id === 'q-2')!;
  assert.equal(q.context, change.proposedText); // q-2 had no context before
  assert.equal(q.review, 'unreviewed'); // an action beside a question is not an answer
  assert.equal(r.content.nextEngagement!.decision, sampleContent().nextEngagement!.decision); // untouched
});

test('unknown targets and orphan acceptances are reported as skipped', () => {
  const changes = [makeChange({ id: 'chg-unknown', targetId: 'vp-404' })];
  const r = applyChanges(sampleContent(), changes, [accepted('chg-unknown'), accepted('chg-ghost')], makeDeps());
  assert.deepEqual(r.appliedIds, []);
  assert.deepEqual(r.skippedIds, ['chg-unknown', 'chg-ghost']);
});

test('multiple decisions apply in change order without cross-mutation', () => {
  const changes = [
    makeChange({ id: 'c1', section: 'valuePoints', targetId: 'vp-1', proposedText: 'First.' }),
    makeChange({ id: 'c2', kind: 'answered-question', section: 'questions', targetId: 'q-1', proposedText: 'Answered.', sourceIds: ['note-2'] }),
    makeChange({ id: 'c3', kind: 'new-fact', section: 'questions', targetId: null, proposedText: 'A new question?', sourceIds: ['note-3'] }),
  ];
  // typed as ChangeAcceptance[] so the literal 'rejected' is not widened to string
  const acceptances: ChangeAcceptance[] = [accepted('c1'), { changeId: 'c2', decision: 'rejected', editedText: null }, accepted('c3')];
  const r = applyChanges(sampleContent(), changes, acceptances, makeDeps(['note-2', 'note-3']));
  assert.deepEqual(r.appliedIds, ['c1', 'c2', 'c3']);
  assert.equal(r.content.valuePoints.find((x) => x.id === 'vp-1')!.text, 'First.');
  assert.equal(r.content.questions.find((x) => x.id === 'q-1')!.answer, null); // rejected
  const added = r.content.questions[r.content.questions.length - 1];
  assert.equal(added.id, 'q-0');
  assert.equal(added.text, 'A new question?');
  assert.equal(added.priority, false);
  assert.equal(added.answer, null);
});
