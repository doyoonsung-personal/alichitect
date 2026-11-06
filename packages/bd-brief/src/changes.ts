// Reviewed application of proposed changes (plan §2 "After a meeting", §6).
// Pure: no clock reads, no id randomness beyond the injected factories, and the
// input content is NEVER mutated — the result is a fresh object.
//
// Documented interpretation choices (the contract leaves them open):
// - Only changes with an explicit acceptance decision are processed. A change
//   without a decision is left alone entirely, which is what protects BD-edited
//   and confirmed items: nothing touches them unless the BD decided on a change
//   that targets them.
// - appliedIds lists every change id whose decision was carried out (including
//   rejections, which are decisions); skippedIds lists accepted changes that
//   could not be applied (unknown target, section limit reached) plus acceptance
//   ids that match no change.
// - 'update'/'new-fact'/'conflict' replace the section's primary text field:
//   text for opportunity/value points/questions/concerns, role for stakeholders,
//   decision for nextEngagement. ProposedChange carries no label/name field, so
//   labels and names are never rewritten by a change.
// - 'proposed-action' on section 'questions' appends the action to that
//   question's context; otherwise it creates/updates the single next engagement.
//   owner/date are never parsed out of free text (invention risk): an update
//   keeps the existing values, a create leaves them null.
// - An accepted UNTARGETED 'new-fact'/'update' addition to valuePoints creates
//   an item with label '' — ProposedChange carries no label field and inventing
//   one is forbidden; the web layer renders a localized fallback for the empty
//   label. The created item is otherwise fully specified: review 'confirmed'
//   (the BD explicitly accepted it), origin 'model' (the text came from the
//   notes review), sourceIds copied from the change, edited only when the BD
//   changed the proposed wording.

import type {
  BriefContent,
  BriefItemBase,
  ChangeAcceptance,
  Clock,
  ContentSection,
  IdFactory,
  ProposedChange,
} from './types.ts';
import { LIMITS } from './types.ts';

export interface ApplyChangesResult {
  content: BriefContent;
  appliedIds: string[];
  skippedIds: string[];
}

/** noteIds is optional: when the caller supplies the reviewed note ids, an
 * answered-question records which note answered it; without it noteId stays null
 * rather than guessing from id shapes. */
export interface ApplyChangesDeps {
  ids: IdFactory;
  clock: Clock;
  noteIds?: readonly string[];
}

const SECTION_LIMITS: Record<ContentSection, number> = {
  opportunity: 1,
  valuePoints: LIMITS.valuePoints,
  stakeholders: LIMITS.stakeholders,
  questions: LIMITS.questions,
  concerns: LIMITS.concerns,
  nextEngagement: 1,
};

const SECTION_ID_PREFIX: Record<string, string> = {
  valuePoints: 'vp',
  stakeholders: 'sh',
  questions: 'q',
  concerns: 'cn',
};

function cloneContent(c: BriefContent): BriefContent {
  return {
    schemaVersion: c.schemaVersion,
    opportunity: { ...c.opportunity, sourceIds: [...c.opportunity.sourceIds] },
    valuePoints: c.valuePoints.map((x) => ({ ...x, sourceIds: [...x.sourceIds] })),
    stakeholders: c.stakeholders.map((x) => ({ ...x, sourceIds: [...x.sourceIds] })),
    questions: c.questions.map((x) => ({ ...x, sourceIds: [...x.sourceIds], answer: x.answer ? { ...x.answer } : null })),
    concerns: c.concerns.map((x) => ({ ...x, sourceIds: [...x.sourceIds] })),
    nextEngagement: c.nextEngagement ? { ...c.nextEngagement, sourceIds: [...c.nextEngagement.sourceIds] } : null,
  };
}

function mergeSourceIds(existing: string[], added: string[]): string[] {
  return [...new Set([...existing, ...added])];
}

export function applyChanges(
  content: BriefContent,
  changes: ProposedChange[],
  acceptances: ChangeAcceptance[],
  deps: ApplyChangesDeps,
): ApplyChangesResult {
  const next = cloneContent(content);
  const decisions = new Map<string, ChangeAcceptance>();
  for (const a of acceptances) decisions.set(a.changeId, a);

  const appliedIds: string[] = [];
  const skippedIds: string[] = [];
  const decided = new Set<string>();

  for (const change of changes) {
    const acc = decisions.get(change.id);
    if (!acc) continue; // undecided: the item stays exactly as the BD left it
    decided.add(change.id);
    if (applyOne(next, change, acc, deps)) appliedIds.push(change.id);
    else skippedIds.push(change.id);
  }
  // Acceptances that match no proposed change are reported, not silently dropped.
  for (const a of acceptances) {
    if (!decided.has(a.changeId)) skippedIds.push(a.changeId);
  }

  return { content: next, appliedIds, skippedIds };
}

function applyOne(content: BriefContent, change: ProposedChange, acc: ChangeAcceptance, deps: ApplyChangesDeps): boolean {
  const accepted = acc.decision === 'accepted';
  const text = acc.editedText ?? change.proposedText;
  const wasEdited = acc.editedText !== null && acc.editedText !== change.proposedText;

  if (!accepted) {
    // Rejection only marks visible disagreement for conflicts; every other
    // rejection leaves the content alone (the decision itself counts as carried
    // out, so it lands in appliedIds).
    if (change.kind === 'conflict') {
      const found = findItem(content, change.section, change.targetId);
      if (!found) return false;
      setReview(content, found, 'conflicted'); // unresolved disagreement stays visible
    }
    return true;
  }

  switch (change.kind) {
    case 'answered-question':
      return applyAnsweredQuestion(content, change, text, wasEdited, deps);
    case 'proposed-action':
      return applyProposedAction(content, change, text, wasEdited, deps);
    case 'update':
    case 'new-fact':
    case 'conflict':
      return applyTextChange(content, change, text, wasEdited, deps);
  }
}

interface FoundItem {
  section: ContentSection;
  index: number; // -1 for the single opportunity/nextEngagement slots
}

function findItem(content: BriefContent, section: ContentSection, targetId: string | null): FoundItem | null {
  if (section === 'opportunity') {
    if (targetId !== null && targetId !== content.opportunity.id) return null;
    return { section, index: -1 };
  }
  if (section === 'nextEngagement') {
    if (!content.nextEngagement) return null;
    if (targetId !== null && targetId !== content.nextEngagement.id) return null;
    return { section, index: -1 };
  }
  if (targetId === null) return null; // additions are handled by the callers
  const index = listOf(content, section).findIndex((x) => x.id === targetId);
  if (index === -1) return null;
  return { section, index };
}

/** The list sections' items share the base fields, so callers can read and update
 * review/edited/sourceIds without a cast; 'text' covers every section except
 * stakeholders, whose primary text lives in 'role' (see the header comment). */
type MutableListItem = BriefItemBase & { text?: string; role?: string };

function listOf(content: BriefContent, section: ContentSection): MutableListItem[] {
  switch (section) {
    case 'valuePoints':
      return content.valuePoints;
    case 'stakeholders':
      return content.stakeholders;
    case 'questions':
      return content.questions;
    case 'concerns':
      return content.concerns;
    case 'opportunity':
    case 'nextEngagement':
      return [];
  }
}

function setReview(content: BriefContent, found: FoundItem, review: 'conflicted' | 'confirmed'): void {
  if (found.section === 'opportunity') {
    content.opportunity.review = review;
    return;
  }
  if (found.section === 'nextEngagement') {
    if (content.nextEngagement) content.nextEngagement.review = review;
    return;
  }
  const item = listOf(content, found.section)[found.index];
  if (item) item.review = review;
}

/** Accepted 'update'/'new-fact'/'conflict': replace the primary text of the
 * targeted item and confirm it, or append a new item when untargeted. False
 * means "report as skipped": unknown target or the section is full. */
function applyTextChange(content: BriefContent, change: ProposedChange, text: string, wasEdited: boolean, deps: ApplyChangesDeps): boolean {
  if (change.targetId !== null) {
    const found = findItem(content, change.section, change.targetId);
    if (!found) return false;
    if (found.section === 'opportunity') {
      const o = content.opportunity;
      o.text = text;
      o.review = 'confirmed'; // accepting a conflict/update resolves it (clears 'conflicted')
      o.edited = o.edited === true || wasEdited;
      o.sourceIds = mergeSourceIds(o.sourceIds, change.sourceIds);
      return true;
    }
    if (found.section === 'nextEngagement' && content.nextEngagement) {
      const n = content.nextEngagement;
      n.decision = text;
      n.review = 'confirmed';
      n.edited = n.edited === true || wasEdited;
      n.sourceIds = mergeSourceIds(n.sourceIds, change.sourceIds);
      return true;
    }
    const item = listOf(content, found.section)[found.index];
    // Stakeholders carry their primary text in 'role' (see header comment).
    if (found.section === 'stakeholders') item.role = text;
    else item.text = text;
    item.review = 'confirmed';
    item.edited = item.edited === true || wasEdited;
    item.sourceIds = mergeSourceIds(item.sourceIds, change.sourceIds);
    return true;
  }

  // Untargeted addition. The single slots are filled instead of duplicated.
  if (change.section === 'opportunity') {
    const o = content.opportunity;
    o.text = text;
    o.review = 'confirmed';
    o.edited = o.edited === true || wasEdited;
    o.sourceIds = mergeSourceIds(o.sourceIds, change.sourceIds);
    return true;
  }
  if (change.section === 'nextEngagement') {
    if (content.nextEngagement) {
      const n = content.nextEngagement;
      n.decision = text;
      n.review = 'confirmed';
      n.edited = n.edited === true || wasEdited;
      n.sourceIds = mergeSourceIds(n.sourceIds, change.sourceIds);
      return true;
    }
    content.nextEngagement = {
      id: deps.ids.next('next'),
      kind: 'discovery',
      decision: text,
      owner: null,
      date: null,
      sourceIds: [...new Set(change.sourceIds)],
      review: 'confirmed', // the BD explicitly accepted it
      origin: 'model',
      edited: wasEdited,
    };
    return true;
  }

  if (listOf(content, change.section).length >= SECTION_LIMITS[change.section]) {
    return false; // limit-blocked: reported as skipped, never silently dropped
  }
  const sourceIds = [...new Set(change.sourceIds)];
  const id = deps.ids.next(SECTION_ID_PREFIX[change.section] ?? 'item');
  const base = { id, sourceIds, review: 'confirmed' as const, origin: 'model' as const, edited: wasEdited };
  switch (change.section) {
    case 'valuePoints':
      // ProposedChange has no label field; an accepted addition starts unlabeled
      // rather than inventing a label.
      content.valuePoints.push({ ...base, label: '', text });
      break;
    case 'stakeholders':
      // A note-proposed person is still only a role until the BD names them.
      content.stakeholders.push({ ...base, kind: 'suggested-role', name: null, role: text });
      break;
    case 'questions':
      content.questions.push({ ...base, text, priority: false, context: null, answer: null });
      break;
    case 'concerns':
      // Concerns added from reviewed notes are model-proposed: label hypothesis.
      content.concerns.push({ ...base, kind: 'hypothesis', text, investigation: null });
      break;
  }
  return true;
}

/** Accepted 'answered-question': the target question gets the answer, becomes
 * confirmed, and records which reviewed note answered it (when known). */
function applyAnsweredQuestion(content: BriefContent, change: ProposedChange, text: string, wasEdited: boolean, deps: ApplyChangesDeps): boolean {
  if (change.section !== 'questions') return false; // answering targets a question by definition
  const q = content.questions.find((x) => x.id === change.targetId);
  if (!q) return false;
  const noteSet = deps.noteIds ? new Set(deps.noteIds) : null;
  const noteId = noteSet ? (change.sourceIds.find((s) => noteSet.has(s)) ?? null) : null;
  q.answer = { text, noteId, answeredAt: deps.clock.now() };
  q.review = 'confirmed';
  q.edited = q.edited === true || wasEdited;
  q.sourceIds = mergeSourceIds(q.sourceIds, change.sourceIds);
  return true;
}

/** Accepted 'proposed-action': an action aimed at a question becomes expandable
 * context; anything else creates/updates the single next engagement. Owner/date
 * are never extracted from free text — existing values survive, new ones stay null. */
function applyProposedAction(content: BriefContent, change: ProposedChange, text: string, wasEdited: boolean, deps: ApplyChangesDeps): boolean {
  if (change.section === 'questions') {
    const q = content.questions.find((x) => x.id === change.targetId);
    if (!q) return false;
    const merged = q.context ? `${q.context} ${text}` : text;
    q.context = merged.length > LIMITS.contextChars ? merged.slice(0, LIMITS.contextChars) : merged;
    q.sourceIds = mergeSourceIds(q.sourceIds, change.sourceIds);
    // The question itself stays unconfirmed: an action beside it is not an answer.
    q.edited = q.edited === true || wasEdited;
    return true;
  }
  const n = content.nextEngagement;
  if (n) {
    n.decision = text;
    n.review = 'confirmed';
    n.edited = n.edited === true || wasEdited;
    n.sourceIds = mergeSourceIds(n.sourceIds, change.sourceIds);
    return true;
  }
  content.nextEngagement = {
    id: deps.ids.next('next'),
    kind: 'discovery', // default when the input supports no specific format
    decision: text,
    owner: null,
    date: null,
    sourceIds: [...new Set(change.sourceIds)],
    review: 'confirmed',
    origin: 'model',
    edited: wasEdited,
  };
  return true;
}
