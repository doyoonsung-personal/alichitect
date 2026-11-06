// Hand-written boundary validators (plan §6/§8). Every persisted, transported or
// model-produced value is validated here before it enters the domain. No zod:
// the package stays dependency-free and browser/worker safe.
//
// Two reading postures:
// - strict (validateContent/validateSnapshot): stored data must satisfy the contract.
// - tolerant (validateModelContent): raw model output gets defaults for machine-owned
//   fields (ids are replaced by the engine anyway) but is REJECTED when it claims
//   owner-only state ('confirmed') or references evidence that does not exist.
// Unknown fields are stripped, never rejected — except schemaVersion, which pins
// the contract generation.

import type {
  AddNoteRequest,
  BriefConcern,
  BriefContent,
  BriefNextEngagement,
  BriefOpportunity,
  BriefQuestion,
  BriefSnapshot,
  BriefStakeholder,
  BriefValuePoint,
  ChangeAcceptance,
  ChangeKind,
  ContentSection,
  CreateBriefRequest,
  GenerateHttpRequest,
  GenerateMode,
  ItemOrigin,
  Lang,
  NextEngagementKind,
  PatchBriefRequest,
  ProposedChange,
  ReviewState,
  VersionOrigin,
} from './types.ts';
import { BD_BRIEF_SCHEMA_VERSION, EVIDENCE_DESIGN, EVIDENCE_OBJECTIVE, EVIDENCE_PRICING, LIMITS } from './types.ts';

export type Validation<T> = { ok: true; value: T } | { ok: false; issues: string[] };

function ok<T>(value: T): Validation<T> {
  return { ok: true, value };
}
function bad<T>(issues: string[]): Validation<T> {
  return { ok: false, issues };
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function inUnion(v: unknown, union: readonly string[]): v is string {
  return typeof v === 'string' && union.includes(v);
}

const LANGS: readonly string[] = ['en', 'ko', 'zh'];
const REVIEWS: readonly string[] = ['unreviewed', 'confirmed', 'rejected', 'conflicted'];
const ORIGINS: readonly string[] = ['user', 'model', 'edit'];
const MODES: readonly string[] = ['initial', 'regenerate', 'review-notes'];
const CHANGE_KINDS: readonly string[] = ['new-fact', 'answered-question', 'conflict', 'proposed-action', 'update'];
const SECTIONS: readonly string[] = ['opportunity', 'valuePoints', 'stakeholders', 'questions', 'concerns', 'nextEngagement'];
const NEXT_KINDS: readonly string[] = ['discovery', 'sa-workshop', 'poc-scoping'];
const VERSION_ORIGINS: readonly string[] = ['initial', 'generated', 'edit', 'notes-review'];
const CONCERN_KINDS: readonly string[] = ['stated', 'hypothesis'];
const STAKEHOLDER_KINDS: readonly string[] = ['named', 'suggested-role'];
const PRICING_STATUSES: readonly string[] = ['missing', 'current', 'stale'];

const REQUEST_ID_RE = /^[A-Za-z0-9_-]+$/;
const REQUEST_ID_MAX = 128;
const ID_MAX = 128;

/** Whole-object references. A NAMED person must be anchored in a concrete
 * statement or note: reserved ids alone are too weak (plan §2/§6 — "an IT
 * contact is not automatically the budget approver"), so citing only them is
 * the invented-person case. */
const RESERVED_EVIDENCE_IDS: ReadonlySet<string> = new Set([EVIDENCE_OBJECTIVE, EVIDENCE_DESIGN, EVIDENCE_PRICING]);

// ---------------------------------------------------------------------------
// Shared small checks
// ---------------------------------------------------------------------------

function checkRequestId(v: unknown, issues: string[]): string | null {
  if (typeof v !== 'string' || v.length === 0) {
    issues.push('requestId must be a non-empty string');
    return null;
  }
  if (v.length > REQUEST_ID_MAX) {
    issues.push(`requestId exceeds ${REQUEST_ID_MAX} chars`);
    return null;
  }
  if (!REQUEST_ID_RE.test(v)) {
    issues.push('requestId may contain only [A-Za-z0-9_-]');
    return null;
  }
  return v;
}

function checkNonEmptyString(v: unknown, max: number, where: string, issues: string[]): string | null {
  if (typeof v !== 'string' || v.trim().length === 0) {
    issues.push(`${where} must be a non-empty string`);
    return null;
  }
  if (v.length > max) {
    // Length bounds keep content concise; factual grounding is a separate check.
    issues.push(`${where} exceeds ${max} chars`);
    return null;
  }
  return v;
}

function checkBoundedString(v: unknown, max: number, where: string, issues: string[], allowEmpty: boolean): string | null {
  if (typeof v !== 'string') {
    issues.push(`${where} must be a string`);
    return null;
  }
  if (!allowEmpty && v.trim().length === 0) {
    issues.push(`${where} must be non-empty`);
    return null;
  }
  if (v.length > max) {
    issues.push(`${where} exceeds ${max} chars`);
    return null;
  }
  return v;
}

function checkOptionalString(v: unknown, max: number, where: string, issues: string[]): string | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') {
    issues.push(`${where} must be a string or null`);
    return undefined;
  }
  if (v.length > max) {
    issues.push(`${where} exceeds ${max} chars`);
    return undefined;
  }
  return v;
}

function checkNonNegativeInt(v: unknown, where: string, issues: string[]): number | null {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) {
    issues.push(`${where} must be an integer >= 0`);
    return null;
  }
  return v;
}

function checkSourceIds(v: unknown, where: string, evidence: Set<string>, issues: string[], modelOutput: boolean): string[] | null {
  if (v === undefined || v === null) {
    if (modelOutput) return []; // the prompt requires sources; absence is repaired by normalization, not rejection
    issues.push(`${where}.sourceIds must be an array`);
    return null;
  }
  if (!Array.isArray(v)) {
    issues.push(`${where}.sourceIds must be an array`);
    return null;
  }
  const out: string[] = [];
  for (const s of v) {
    if (typeof s !== 'string' || s.trim().length === 0) {
      issues.push(`${where}.sourceIds entries must be non-empty strings`);
      return null;
    }
    if (!evidence.has(s)) {
      // Invented evidence references are the core anti-hallucination guard (plan §8).
      issues.push(`${where}.sourceIds references unknown evidence id "${s}"`);
      return null;
    }
    out.push(s);
  }
  return out;
}

interface ItemBaseOut {
  id: string;
  sourceIds: string[];
  review: ReviewState;
  origin: ItemOrigin;
  edited?: boolean;
}

function readItemBase(raw: Record<string, unknown>, where: string, evidence: Set<string>, issues: string[], modelOutput: boolean): ItemBaseOut | null {
  let failed = false;
  // id: strict for stored content; the engine replaces model ids wholesale, so
  // model output only needs a placeholder-free shape.
  let id = '';
  if (typeof raw.id === 'string' && raw.id.trim().length > 0 && raw.id.length <= ID_MAX) {
    id = raw.id;
  } else if (!modelOutput) {
    issues.push(`${where}.id must be a non-empty string <= ${ID_MAX} chars`);
    failed = true;
  }

  // review: only the owner confirms; model output claiming 'confirmed' is rejected outright.
  let review: ReviewState = 'unreviewed';
  if (raw.review === undefined || raw.review === null) {
    if (!modelOutput) {
      issues.push(`${where}.review is required`);
      failed = true;
    }
  } else if (!inUnion(raw.review, REVIEWS)) {
    issues.push(`${where}.review must be one of ${REVIEWS.join('|')}`);
    failed = true;
  } else if (modelOutput && raw.review === 'confirmed') {
    issues.push(`${where}.review: model output cannot confirm items; only the owner can`);
    failed = true;
  } else {
    review = raw.review as ReviewState;
  }

  // origin: model output is always 'model' (absent is normalized, a different value is a lie).
  let origin: ItemOrigin = 'model';
  if (raw.origin === undefined || raw.origin === null) {
    if (!modelOutput) {
      issues.push(`${where}.origin is required`);
      failed = true;
    }
  } else if (!inUnion(raw.origin, ORIGINS)) {
    issues.push(`${where}.origin must be one of ${ORIGINS.join('|')}`);
    failed = true;
  } else if (modelOutput && raw.origin !== 'model') {
    issues.push(`${where}.origin: model output must use origin 'model'`);
    failed = true;
  } else {
    origin = raw.origin as ItemOrigin;
  }

  const sourceIds = checkSourceIds(raw.sourceIds, where, evidence, issues, modelOutput);
  if (sourceIds === null) failed = true;
  if (failed) return null;

  const base: ItemBaseOut = { id, sourceIds: sourceIds ?? [], review, origin };
  // 'edited' is an owner-side marker; strip anything a model claims about it.
  if (!modelOutput && typeof raw.edited === 'boolean' && raw.edited) base.edited = true;
  else if (!modelOutput && raw.edited !== undefined && typeof raw.edited !== 'boolean') {
    issues.push(`${where}.edited must be a boolean when present`);
    return null;
  }
  return base;
}

function readSection<T>(raw: unknown, where: string, max: number, issues: string[], read: (item: Record<string, unknown>, index: number) => T | null): T[] | null {
  if (!Array.isArray(raw)) {
    issues.push(`${where} must be an array`);
    return null;
  }
  if (raw.length > max) {
    issues.push(`${where} exceeds limit of ${max} items`);
    return null;
  }
  const out: T[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isRecord(item)) {
      issues.push(`${where}[${i}] must be an object`);
      continue;
    }
    const value = read(item, i);
    if (value !== null) out.push(value);
  }
  return out;
}

function checkUniqueIds(items: readonly { id: string }[], where: string, issues: string[]): void {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) issues.push(`${where}: duplicate item id "${it.id}"`);
    seen.add(it.id);
  }
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export function validateSnapshot(v: unknown): Validation<BriefSnapshot> {
  if (!isRecord(v)) return bad(['snapshot must be an object']);
  const issues: string[] = [];
  if (v.schemaVersion !== BD_BRIEF_SCHEMA_VERSION) issues.push('snapshot.schemaVersion must be 1');
  if (v.sourceKind !== 'browser-session' && v.sourceKind !== 'discovery') issues.push('snapshot.sourceKind must be browser-session or discovery');
  if (v.suppliedBy !== 'signed-in-user') issues.push("snapshot.suppliedBy must be 'signed-in-user'");
  const sourceKey = checkNonEmptyString(v.sourceKey, 512, 'snapshot.sourceKey', issues);
  const sourceRevision = checkNonNegativeInt(v.sourceRevision, 'snapshot.sourceRevision', issues);
  if (typeof v.capturedAt !== 'number' || !Number.isSafeInteger(v.capturedAt) || v.capturedAt < 0 || v.capturedAt > 8_640_000_000_000_000) {
    issues.push('snapshot.capturedAt must be a supported nonnegative timestamp');
  }
  const lang = inUnion(v.lang, LANGS) ? (v.lang as Lang) : null;
  if (lang === null) issues.push(`snapshot.lang must be one of ${LANGS.join('|')}`);

  let objective: string | null = null;
  if (v.objective === null || v.objective === undefined) {
    objective = null;
  } else {
    const o = checkBoundedString(v.objective, LIMITS.objectiveChars, 'snapshot.objective', issues, false);
    objective = o === null ? null : o;
  }

  let statements: BriefSnapshot['statements'] = [];
  const rawStatements = readSection<{ id: string; text: string }>(v.statements, 'snapshot.statements', LIMITS.statements, issues, (raw, i) => {
    const id = checkNonEmptyString(raw.id, ID_MAX, `snapshot.statements[${i}].id`, issues);
    const text = checkNonEmptyString(raw.text, LIMITS.statementChars, `snapshot.statements[${i}].text`, issues);
    if (id === null || text === null) return null;
    return { id, text };
  });
  if (rawStatements === null) {
    issues.push('snapshot.statements is invalid');
  } else {
    checkUniqueIds(rawStatements, 'snapshot.statements', issues);
    statements = rawStatements;
  }

  let design: BriefSnapshot['design'] = null;
  if (v.design === null || v.design === undefined) {
    design = null;
  } else if (!isRecord(v.design)) {
    issues.push('snapshot.design must be an object or null');
  } else {
    const summary = checkBoundedString(v.design.summary, LIMITS.designSummaryChars, 'snapshot.design.summary', issues, true);
    const capabilities = readSection<{ id: string; name: string }>(v.design.capabilities, 'snapshot.design.capabilities', LIMITS.capabilities, issues, (raw, i) => {
      const id = checkNonEmptyString(raw.id, ID_MAX, `snapshot.design.capabilities[${i}].id`, issues);
      const name = checkNonEmptyString(raw.name, LIMITS.itemChars, `snapshot.design.capabilities[${i}].name`, issues);
      if (id === null || name === null) return null;
      return { id, name };
    });
    // Boundaries are plain strings, so readSection (objects only) does not fit.
    let boundaries: string[] | null = null;
    if (!Array.isArray(v.design.boundaries)) {
      issues.push('snapshot.design.boundaries must be an array');
    } else if (v.design.boundaries.length > LIMITS.boundaries) {
      issues.push(`snapshot.design.boundaries exceeds limit of ${LIMITS.boundaries} items`);
    } else {
      boundaries = [];
      for (let i = 0; i < v.design.boundaries.length; i++) {
        const b = checkNonEmptyString(v.design.boundaries[i], LIMITS.boundaryChars, `snapshot.design.boundaries[${i}]`, issues);
        if (b !== null) boundaries.push(b);
      }
    }
    if (summary !== null && capabilities !== null && boundaries !== null) {
      design = { summary, capabilities, boundaries };
    }
  }

  let pricing: BriefSnapshot['pricing'] | null = null;
  if (!isRecord(v.pricing)) {
    issues.push('snapshot.pricing must be an object');
  } else if (!inUnion(v.pricing.status, PRICING_STATUSES)) {
    issues.push(`snapshot.pricing.status must be one of ${PRICING_STATUSES.join('|')}`);
  } else {
    const status = v.pricing.status as BriefSnapshot['pricing']['status'];
    if (v.pricing.currency !== null && v.pricing.currency !== 'USD') issues.push("snapshot.pricing.currency must be 'USD' or null");
    const figure = (raw: unknown, where: string): number | null | undefined => {
      if (raw === null || raw === undefined) return null;
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
        issues.push(`${where} must be a finite number >= 0 or null`);
        return undefined;
      }
      // Exact figures exist only for a CURRENT estimate: numbers under 'stale' or
      // 'missing' could be reprinted as live prices (plan §6).
      if (status !== 'current') {
        issues.push(`${where} must be null unless pricing.status is 'current'`);
        return undefined;
      }
      return raw;
    };
    const monthly = figure(v.pricing.monthlyUsd, 'snapshot.pricing.monthlyUsd');
    const oneTime = figure(v.pricing.oneTimeUsd, 'snapshot.pricing.oneTimeUsd');
    let source: string | null = null;
    if (v.pricing.source === null || v.pricing.source === undefined) {
      source = null;
    } else if (typeof v.pricing.source !== 'string' || v.pricing.source.length > 200) {
      issues.push('snapshot.pricing.source must be a string <= 200 chars or null');
    } else if (status !== 'current') {
      issues.push("snapshot.pricing.source must be null unless pricing.status is 'current'");
    } else {
      source = v.pricing.source;
    }
    if (monthly !== undefined && oneTime !== undefined && source !== undefined) {
      pricing = { status, currency: v.pricing.currency === 'USD' ? 'USD' : null, monthlyUsd: monthly, oneTimeUsd: oneTime, source };
    }
  }

  if (v.sourceKind === 'discovery' && (design !== null || sourceRevision !== 0 || pricing?.status !== 'missing')) {
    issues.push('discovery starts without a design, estimate or architecture revision');
  }
  if (issues.length > 0 || sourceKey === null || sourceRevision === null || lang === null || pricing === null) {
    if (issues.length === 0) issues.push('snapshot is invalid');
    return bad(issues);
  }
  return ok({
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    sourceKind: v.sourceKind as BriefSnapshot['sourceKind'],
    sourceKey,
    sourceRevision,
    suppliedBy: 'signed-in-user',
    capturedAt: v.capturedAt as number,
    lang,
    objective,
    statements,
    design,
    pricing,
  });
}

// ---------------------------------------------------------------------------
// Brief content
// ---------------------------------------------------------------------------

function validateContentCore(v: unknown, evidence: Set<string>, modelOutput: boolean): Validation<BriefContent> {
  if (!isRecord(v)) return bad(['content must be an object']);
  const issues: string[] = [];
  if (v.schemaVersion !== BD_BRIEF_SCHEMA_VERSION) issues.push('content.schemaVersion must be 1');

  let opportunity: BriefOpportunity | null = null;
  if (!isRecord(v.opportunity)) {
    issues.push('content.opportunity must be an object');
  } else {
    if (!modelOutput && v.opportunity.id !== 'opportunity') issues.push("content.opportunity.id must be 'opportunity'");
    const base = readItemBase(v.opportunity, 'opportunity', evidence, issues, modelOutput);
    const text = checkBoundedString(v.opportunity.text, LIMITS.opportunityChars, 'opportunity.text', issues, true);
    if (base !== null && text !== null) opportunity = { ...base, text };
  }

  const valuePoints = readSection<BriefValuePoint>(v.valuePoints, 'content.valuePoints', LIMITS.valuePoints, issues, (raw, i) => {
    const base = readItemBase(raw, `valuePoints[${i}]`, evidence, issues, modelOutput);
    const label = checkBoundedString(raw.label, LIMITS.itemChars, `valuePoints[${i}].label`, issues, true);
    const text = checkNonEmptyString(raw.text, LIMITS.itemChars, `valuePoints[${i}].text`, issues);
    if (base === null || label === null || text === null) return null;
    return { ...base, label, text };
  });

  const stakeholders = readSection<BriefStakeholder>(v.stakeholders, 'content.stakeholders', LIMITS.stakeholders, issues, (raw, i) => {
    const base = readItemBase(raw, `stakeholders[${i}]`, evidence, issues, modelOutput);
    if (!inUnion(raw.kind, STAKEHOLDER_KINDS)) {
      issues.push(`stakeholders[${i}].kind must be one of ${STAKEHOLDER_KINDS.join('|')}`);
      return null;
    }
    const kind = raw.kind as BriefStakeholder['kind'];
    const role = checkNonEmptyString(raw.role, LIMITS.itemChars, `stakeholders[${i}].role`, issues);
    let name: string | null = null;
    if (raw.name === null || raw.name === undefined) {
      name = null;
    } else if (typeof raw.name !== 'string' || raw.name.length > LIMITS.itemChars) {
      issues.push(`stakeholders[${i}].name must be a string <= ${LIMITS.itemChars} chars or null`);
      return null;
    } else {
      name = raw.name;
    }
    if (base === null || role === null) return null;
    // A named person requires a source; a sourced-less "name" is an invention (plan §6).
    if (kind === 'named' && (name === null || name.trim().length === 0)) {
      issues.push(`stakeholders[${i}]: a named stakeholder requires a non-empty name`);
      return null;
    }
    if (kind === 'named' && base.sourceIds.length === 0) {
      issues.push(`stakeholders[${i}]: a named stakeholder requires at least one sourceId`);
      return null;
    }
    // Reserved whole-object ids alone cannot anchor a person; require at least one
    // statement/note id so a named stakeholder is traceable to real evidence.
    if (kind === 'named' && !base.sourceIds.some((s) => !RESERVED_EVIDENCE_IDS.has(s))) {
      issues.push(`stakeholders[${i}]: a named stakeholder requires at least one non-reserved evidence id (a statement or note)`);
      return null;
    }
    // A suggested role must not smuggle in an invented person.
    if (kind === 'suggested-role' && name !== null) {
      issues.push(`stakeholders[${i}]: a suggested-role stakeholder must have name null`);
      return null;
    }
    return { ...base, kind, name, role };
  });

  const questions = readSection<BriefQuestion>(v.questions, 'content.questions', LIMITS.questions, issues, (raw, i) => {
    const base = readItemBase(raw, `questions[${i}]`, evidence, issues, modelOutput);
    const text = checkNonEmptyString(raw.text, LIMITS.itemChars, `questions[${i}].text`, issues);
    let priority: boolean;
    if (typeof raw.priority === 'boolean') priority = raw.priority;
    else if (modelOutput && (raw.priority === undefined || raw.priority === null)) priority = false;
    else {
      issues.push(`questions[${i}].priority must be a boolean`);
      return null;
    }
    const context = checkOptionalString(raw.context, LIMITS.contextChars, `questions[${i}].context`, issues);
    let answer: BriefQuestion['answer'] = null;
    if (raw.answer !== null && raw.answer !== undefined) {
      if (modelOutput) {
        issues.push(`questions[${i}].answer must be null in generated content; propose note answers as reviewed changes`);
        return null;
      }
      if (!isRecord(raw.answer)) {
        issues.push(`questions[${i}].answer must be an object or null`);
        return null;
      }
      const aText = checkNonEmptyString(raw.answer.text, LIMITS.itemChars, `questions[${i}].answer.text`, issues);
      const noteId = checkOptionalString(raw.answer.noteId, ID_MAX, `questions[${i}].answer.noteId`, issues);
      let answeredAt: number;
      if (typeof raw.answer.answeredAt === 'number' && Number.isSafeInteger(raw.answer.answeredAt) && raw.answer.answeredAt >= 0 && raw.answer.answeredAt <= 8_640_000_000_000_000) {
        answeredAt = raw.answer.answeredAt;
      } else {
        issues.push(`questions[${i}].answer.answeredAt must be a supported nonnegative timestamp`);
        return null;
      }
      if (aText === null || noteId === undefined) return null;
      answer = { text: aText, noteId, answeredAt };
    }
    if (base === null || text === null || context === undefined) return null;
    return { ...base, text, priority, context, answer };
  });

  const concerns = readSection<BriefConcern>(v.concerns, 'content.concerns', LIMITS.concerns, issues, (raw, i) => {
    const base = readItemBase(raw, `concerns[${i}]`, evidence, issues, modelOutput);
    if (!inUnion(raw.kind, CONCERN_KINDS)) {
      issues.push(`concerns[${i}].kind must be one of ${CONCERN_KINDS.join('|')}`);
      return null;
    }
    const text = checkNonEmptyString(raw.text, LIMITS.itemChars, `concerns[${i}].text`, issues);
    const investigation = checkOptionalString(raw.investigation, LIMITS.investigationChars, `concerns[${i}].investigation`, issues);
    if (base === null || text === null || investigation === undefined) return null;
    return { ...base, kind: raw.kind as BriefConcern['kind'], text, investigation };
  });

  let nextEngagement: BriefNextEngagement | null = null;
  if (v.nextEngagement !== null && v.nextEngagement !== undefined) {
    if (!isRecord(v.nextEngagement)) {
      issues.push('content.nextEngagement must be an object or null');
    } else {
      const base = readItemBase(v.nextEngagement, 'nextEngagement', evidence, issues, modelOutput);
      if (!inUnion(v.nextEngagement.kind, NEXT_KINDS)) {
        issues.push(`nextEngagement.kind must be one of ${NEXT_KINDS.join('|')}`);
      } else {
        const decision = checkNonEmptyString(v.nextEngagement.decision, LIMITS.itemChars, 'nextEngagement.decision', issues);
        const owner = checkOptionalString(v.nextEngagement.owner, LIMITS.itemChars, 'nextEngagement.owner', issues);
        const date = checkOptionalString(v.nextEngagement.date, LIMITS.itemChars, 'nextEngagement.date', issues);
        if (base !== null && decision !== null && owner !== undefined && date !== undefined) {
          // owner/date may be null but are otherwise owner-typed facts; the model is
          // forbidden from inventing them by the prompt, and validation only enforces
          // structure + evidence here.
          nextEngagement = { ...base, kind: v.nextEngagement.kind as NextEngagementKind, decision, owner, date };
        }
      }
    }
  }

  if (!modelOutput) {
    if (valuePoints) checkUniqueIds(valuePoints, 'content.valuePoints', issues);
    if (stakeholders) checkUniqueIds(stakeholders, 'content.stakeholders', issues);
    if (questions) checkUniqueIds(questions, 'content.questions', issues);
    if (concerns) checkUniqueIds(concerns, 'content.concerns', issues);
    if (questions && questions.filter((q) => q.priority).length > LIMITS.priorityQuestions) {
      issues.push(`content.questions has more than ${LIMITS.priorityQuestions} priority questions`);
    }
  }

  if (issues.length > 0 || opportunity === null || valuePoints === null || stakeholders === null || questions === null || concerns === null) {
    if (issues.length === 0) issues.push('content is invalid');
    return bad(issues);
  }
  return ok({
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    opportunity,
    valuePoints,
    stakeholders,
    questions,
    concerns,
    nextEngagement,
  });
}

/** Strict validation of stored/patched brief content. Unknown fields are stripped. */
export function validateContent(v: unknown, evidence: Set<string>): Validation<BriefContent> {
  return validateContentCore(v, evidence, false);
}

/** Validation of RAW model output: like validateContent, plus review 'confirmed'
 * is rejected (only the owner confirms) and origin must be 'model' (absent is
 * normalized). Item ids need not be unique/known — the engine replaces them all. */
export function validateModelContent(v: unknown, evidence: Set<string>): Validation<BriefContent> {
  return validateContentCore(v, evidence, true);
}

// ---------------------------------------------------------------------------
// Proposed changes
// ---------------------------------------------------------------------------

function sectionItemIds(content: BriefContent, section: ContentSection): string[] {
  switch (section) {
    case 'opportunity':
      return [content.opportunity.id];
    case 'valuePoints':
      return content.valuePoints.map((x) => x.id);
    case 'stakeholders':
      return content.stakeholders.map((x) => x.id);
    case 'questions':
      return content.questions.map((x) => x.id);
    case 'concerns':
      return content.concerns.map((x) => x.id);
    case 'nextEngagement':
      return content.nextEngagement ? [content.nextEngagement.id] : [];
  }
}

export function validateChanges(v: unknown, evidence: Set<string>, baseContent: BriefContent): Validation<ProposedChange[]> {
  // Tolerate the {"changes": [...]} wrapper the prompt asks for as well as a bare array.
  let arr: unknown = v;
  if (isRecord(v) && Array.isArray(v.changes)) arr = v.changes;
  if (!Array.isArray(arr)) return bad(['changes must be an array']);
  const issues: string[] = [];
  const existingEvidence = new Set(evidence);
  for (const item of [baseContent.opportunity, ...baseContent.valuePoints, ...baseContent.stakeholders,
    ...baseContent.questions, ...baseContent.concerns, ...(baseContent.nextEngagement ? [baseContent.nextEngagement] : [])]) {
    for (const id of item.sourceIds) existingEvidence.add(id);
  }
  const seen = new Set<string>();
  const out: ProposedChange[] = [];
  for (let i = 0; i < arr.length; i++) {
    const raw = arr[i];
    const where = `changes[${i}]`;
    if (!isRecord(raw)) {
      issues.push(`${where} must be an object`);
      continue;
    }
    let failed = false;
    const id = checkNonEmptyString(raw.id, ID_MAX, `${where}.id`, issues);
    if (id === null) failed = true;
    else if (seen.has(id)) {
      issues.push(`${where}.id: duplicate change id "${id}"`);
      failed = true;
    } else seen.add(id);

    if (!inUnion(raw.kind, CHANGE_KINDS)) {
      issues.push(`${where}.kind must be one of ${CHANGE_KINDS.join('|')}`);
      failed = true;
    }
    if (!inUnion(raw.section, SECTIONS)) {
      issues.push(`${where}.section must be one of ${SECTIONS.join('|')}`);
      failed = true;
    }
    // A candidate must fit the accepted field it will populate; otherwise review
    // can succeed only for PATCH to reject the accepted change as too long.
    const proposedText = checkNonEmptyString(raw.proposedText, raw.section === 'opportunity' ? LIMITS.opportunityChars : LIMITS.itemChars, `${where}.proposedText`, issues);
    if (proposedText === null) failed = true;
    const sourceIds = checkSourceIds(raw.sourceIds, where, evidence, issues, true);
    if (sourceIds === null) failed = true;

    let targetId: string | null = null;
    if (raw.targetId !== null && raw.targetId !== undefined) {
      if (typeof raw.targetId !== 'string' || raw.targetId.length === 0 || raw.targetId.length > ID_MAX) {
        issues.push(`${where}.targetId must be null or a non-empty string <= ${ID_MAX} chars`);
        failed = true;
      } else {
        targetId = raw.targetId;
        // A change may only target items that actually exist in the base version.
        if (inUnion(raw.section, SECTIONS) && !sectionItemIds(baseContent, raw.section as ContentSection).includes(targetId)) {
          issues.push(`${where}.targetId "${targetId}" does not exist in base content section "${raw.section}"`);
          failed = true;
        }
      }
    }

    let conflict: ProposedChange['conflict'] = null;
    if (raw.kind === 'answered-question' && (raw.section !== 'questions' || targetId === null)) {
      issues.push(`${where}: answered-question must target an existing question`);
      failed = true;
    }
    if (raw.kind === 'conflict' && targetId === null) {
      issues.push(`${where}: conflict must target an existing item`);
      failed = true;
    }
    if (raw.conflict !== null && raw.conflict !== undefined) {
      if (!isRecord(raw.conflict)) {
        issues.push(`${where}.conflict must be an object or null`);
        failed = true;
      } else {
        const existingText = checkNonEmptyString(raw.conflict.existingText, LIMITS.itemChars * 2, `${where}.conflict.existingText`, issues);
        let existingSourceIds: string[] = [];
        if (!Array.isArray(raw.conflict.existingSourceIds)) {
          issues.push(`${where}.conflict.existingSourceIds must be an array`);
          failed = true;
        } else {
          for (const s of raw.conflict.existingSourceIds) {
            if (typeof s !== 'string' || !existingEvidence.has(s)) {
              issues.push(`${where}.conflict.existingSourceIds must reference supplied or accepted evidence`);
              failed = true;
              break;
            }
            existingSourceIds.push(s);
          }
        }
        if (existingText !== null && !failed) conflict = { existingText, existingSourceIds };
      }
      if (inUnion(raw.kind, CHANGE_KINDS) && raw.kind !== 'conflict') {
        issues.push(`${where}.conflict must be null unless kind is 'conflict'`);
        failed = true;
      }
    } else if (inUnion(raw.kind, CHANGE_KINDS) && raw.kind === 'conflict') {
      // A conflict without the existing claim cannot be shown for review (plan §6).
      issues.push(`${where}.conflict is required when kind is 'conflict'`);
      failed = true;
    }

    if (failed || id === null || proposedText === null || sourceIds === null) continue;
    out.push({
      id,
      kind: raw.kind as ChangeKind,
      section: raw.section as ContentSection,
      targetId,
      proposedText,
      sourceIds,
      conflict,
    });
  }
  if (issues.length > 0) return bad(issues);
  return ok(out);
}

// ---------------------------------------------------------------------------
// HTTP request bodies (plan §7)
// ---------------------------------------------------------------------------

export function validateGenerateRequest(v: unknown): Validation<GenerateHttpRequest> {
  if (!isRecord(v)) return bad(['request body must be an object']);
  const issues: string[] = [];
  const requestId = checkRequestId(v.requestId, issues);
  if (!inUnion(v.mode, MODES)) {
    issues.push(`mode must be one of ${MODES.join('|')}`);
    return bad(issues);
  }
  const mode = v.mode as GenerateMode;
  const expectedVersion = checkNonNegativeInt(v.expectedVersion, 'expectedVersion', issues);
  const lang = inUnion(v.lang, LANGS) ? (v.lang as Lang) : null;
  if (lang === null) issues.push(`lang must be one of ${LANGS.join('|')}`);

  let snapshot: BriefSnapshot | null = null;
  if (mode === 'review-notes') {
    // Notes review works against the STORED brief and its saved snapshot; a
    // client-supplied snapshot here could smuggle unreviewed evidence in.
    if (v.snapshot !== null && v.snapshot !== undefined) issues.push('snapshot must be null for mode review-notes');
  } else {
    const snap = validateSnapshot(v.snapshot);
    if (!snap.ok) issues.push(...snap.issues.map((x) => `snapshot: ${x}`));
    else snapshot = snap.value;
  }

  let noteIds: string[] | null = null;
  if (mode === 'review-notes') {
    if (!Array.isArray(v.noteIds) || v.noteIds.length === 0) {
      issues.push('noteIds must be a non-empty array for mode review-notes');
    } else if (v.noteIds.length > LIMITS.notesPerGenerate) {
      issues.push(`noteIds exceeds limit of ${LIMITS.notesPerGenerate}`);
    } else {
      const ids: string[] = [];
      const seen = new Set<string>();
      for (const n of v.noteIds) {
        if (typeof n !== 'string' || n.trim().length === 0 || n.length > ID_MAX) {
          issues.push('noteIds entries must be non-empty strings');
          break;
        }
        if (seen.has(n)) {
          issues.push(`noteIds contains duplicate id "${n}"`);
          break;
        }
        seen.add(n);
        ids.push(n);
      }
      if (issues.length === 0) noteIds = ids;
    }
  } else if (v.noteIds !== null && v.noteIds !== undefined) {
    if (!Array.isArray(v.noteIds) || v.noteIds.length > 0) {
      issues.push(`noteIds must be null or empty for mode ${mode}`);
    }
  }

  if (issues.length > 0 || requestId === null || expectedVersion === null || lang === null) {
    if (issues.length === 0) issues.push('generate request is invalid');
    return bad(issues);
  }
  return ok({ requestId, mode, expectedVersion, lang, snapshot, noteIds });
}

export function validatePatchRequest(v: unknown, evidence: Set<string>): Validation<PatchBriefRequest> {
  if (!isRecord(v)) return bad(['request body must be an object']);
  const issues: string[] = [];
  const expectedVersion = checkNonNegativeInt(v.expectedVersion, 'expectedVersion', issues);
  // Edits may only reference evidence that already exists for this brief; the
  // caller supplies the authoritative evidence set.
  const content = validateContent(v.content, evidence);
  if (!content.ok) issues.push(...content.issues.map((x) => `content: ${x}`));
  if (!inUnion(v.origin, VERSION_ORIGINS)) issues.push(`origin must be one of ${VERSION_ORIGINS.join('|')}`);

  let acceptances: ChangeAcceptance[] | null = null;
  if (v.acceptances !== null && v.acceptances !== undefined) {
    if (!Array.isArray(v.acceptances)) {
      issues.push('acceptances must be an array or null');
    } else {
      const list: ChangeAcceptance[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < v.acceptances.length; i++) {
        const raw = v.acceptances[i];
        if (!isRecord(raw)) {
          issues.push(`acceptances[${i}] must be an object`);
          continue;
        }
        const changeId = checkNonEmptyString(raw.changeId, ID_MAX, `acceptances[${i}].changeId`, issues);
        if (changeId !== null && seen.has(changeId)) {
          issues.push(`acceptances[${i}]: duplicate changeId "${changeId}"`);
          continue;
        }
        if (changeId !== null) seen.add(changeId);
        if (raw.decision !== 'accepted' && raw.decision !== 'rejected') {
          issues.push(`acceptances[${i}].decision must be 'accepted' or 'rejected'`);
          continue;
        }
        const editedText = checkOptionalString(raw.editedText, LIMITS.itemChars * 2, `acceptances[${i}].editedText`, issues);
        if (changeId === null || editedText === undefined) continue;
        list.push({ changeId, decision: raw.decision, editedText });
      }
      acceptances = list;
    }
  }

  if (typeof v.snapshotFingerprint !== 'string' || v.snapshotFingerprint.length > REQUEST_ID_MAX) {
    issues.push(`snapshotFingerprint must be a string <= ${REQUEST_ID_MAX} chars`);
  }
  const sourceRevision = checkNonNegativeInt(v.sourceRevision, 'sourceRevision', issues);

  if (issues.length > 0 || expectedVersion === null || !content.ok || sourceRevision === null) {
    if (issues.length === 0) issues.push('patch request is invalid');
    return bad(issues);
  }
  return ok({
    expectedVersion,
    content: content.ok ? content.value : v.content as PatchBriefRequest['content'],
    origin: v.origin as VersionOrigin,
    acceptances,
    snapshotFingerprint: v.snapshotFingerprint as string,
    sourceRevision,
  });
}

export function validateAddNoteRequest(v: unknown): Validation<AddNoteRequest> {
  if (!isRecord(v)) return bad(['request body must be an object']);
  const issues: string[] = [];
  const requestId = checkRequestId(v.requestId, issues);
  const text = checkNonEmptyString(v.text, LIMITS.noteChars, 'text', issues);
  const meetingDate = checkOptionalString(v.meetingDate, 64, 'meetingDate', issues);
  const source = checkOptionalString(v.source, 200, 'source', issues);
  if (issues.length > 0 || requestId === null || text === null || meetingDate === undefined || source === undefined) {
    if (issues.length === 0) issues.push('add-note request is invalid');
    return bad(issues);
  }
  return ok({ requestId, text, meetingDate, source });
}

export function validateCreateBriefRequest(v: unknown): Validation<CreateBriefRequest> {
  if (!isRecord(v)) return bad(['request body must be an object']);
  const issues: string[] = [];
  const sourceKey = checkNonEmptyString(v.sourceKey, 512, 'sourceKey', issues);
  const lang = inUnion(v.lang, LANGS) ? (v.lang as Lang) : null;
  if (lang === null) issues.push(`lang must be one of ${LANGS.join('|')}`);
  const snapshot = validateSnapshot(v.snapshot);
  if (!snapshot.ok) issues.push(...snapshot.issues.map((x) => `snapshot: ${x}`));
  if (snapshot.ok && snapshot.value.sourceKey !== sourceKey) issues.push('sourceKey must match snapshot.sourceKey');
  const title = v.title === undefined ? undefined : checkBoundedString(v.title, LIMITS.discoveryTitleChars, 'title', issues, true);
  if (issues.length > 0 || sourceKey === null || lang === null || !snapshot.ok) {
    if (issues.length === 0) issues.push('create-brief request is invalid');
    return bad(issues);
  }
  return ok({ sourceKey, lang, snapshot: snapshot.value, ...(title !== undefined && title !== null ? { title } : {}) });
}
