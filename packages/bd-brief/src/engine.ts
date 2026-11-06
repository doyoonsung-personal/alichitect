// Bounded generation (plan §8): ONE model call, at most ONE format repair inside
// the SAME total deadline, deterministic id normalization and strict validation.
// The engine never reads global state, registers timers at import time or touches
// credentials: model, clock and ids are injected (plan §4 rule 4).

import type {
  BriefCandidate,
  BriefContent,
  BriefItemBase,
  BriefNextEngagement,
  EngineDeps,
  GenerateInput,
  GenerateResult,
  ModelUsage,
  ProposedChange,
} from './types.ts';
import { LIMITS } from './types.ts';
import { evidenceIds, snapshotFingerprint } from './evidence.ts';
import { buildGeneratePrompt, buildRepairPrompt } from './prompt.ts';
import { validateChanges, validateModelContent } from './validate.ts';

export type EngineOutcome =
  | { ok: true; result: GenerateResult }
  | { ok: false; reason: 'timeout' | 'model' | 'validation'; partialUsage: ModelUsage | null };

/** Defensive JSON extraction: models wrap output in code fences or chatter
 * despite instructions; take the outermost braces and let JSON.parse decide. */
function parseModelJson(text: string): unknown | null {
  let t = text.trim();
  const fenced = t.match(/^```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```$/);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

function addUsage(a: ModelUsage | null, b: ModelUsage | null): ModelUsage | null {
  if (!a) return b;
  if (!b) return a;
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}

type CallOutcome =
  | { ok: true; text: string; usage: ModelUsage | null }
  | { ok: false; reason: 'timeout' | 'model'; usage: ModelUsage | null };

async function callModel(
  deps: EngineDeps,
  prompt: { system: string; user: string },
  input: GenerateInput,
  signal: AbortSignal,
  remainingMs: number,
): Promise<CallOutcome> {
  if (signal.aborted || remainingMs <= 0) return { ok: false, reason: 'timeout', usage: null };
  try {
    const res = await deps.model.complete({
      system: prompt.system,
      user: prompt.user,
      lang: input.lang,
      maxOutputTokens: LIMITS.modelOutputTokens,
      signal,
      deadlineMs: remainingMs,
    });
    return { ok: true, text: res.text, usage: res.usage };
  } catch {
    // A caller abort and a deadline abort are both surfaced as 'timeout'; the
    // routes layer distinguishes them by checking its own signal.
    return { ok: false, reason: signal.aborted ? 'timeout' : 'model', usage: null };
  }
}

/** Model ids are untrusted: replace a generated item id with a host-minted one
 * (opportunity keeps its reserved id) and force machine-owned attribution fields.
 * Owner-side state ('edited', 'confirmed') can never ride along on a fresh item. */
function mintItem<T extends BriefItemBase>(item: T, id: string): T {
  const copy = { ...item, id, review: 'unreviewed', origin: 'model' } as T;
  delete (copy as BriefItemBase).edited;
  return copy;
}

/** Regenerate preservation (plan §6): a generated item whose primary text matches
 * a base item verbatim is the model ECHOING owner-decided content. Preserve the
 * entire base item, not just its badge: otherwise an omitted answer, changed
 * owner/date, or changed concern kind could inherit a false confirmation.
 * sourceIds become the union, base order first, deduped. */
function inheritItem<T extends BriefItemBase>(item: T, base: BriefItemBase): T {
  const copy = structuredClone(base) as T;
  copy.sourceIds = [...new Set([...base.sourceIds, ...item.sourceIds])];
  return copy;
}

/** Match key for regeneration preservation: the normalized primary text
 * (trim + collapse whitespace). Primary field is 'role' for stakeholders and
 * 'decision' for nextEngagement, 'text' everywhere else (same convention as
 * changes.ts). */
function primaryText(item: BriefItemBase): string {
  const rec = item as unknown as Record<string, unknown>;
  const raw = typeof rec.role === 'string' ? rec.role : typeof rec.decision === 'string' ? rec.decision : rec.text;
  const normalized = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  // Equal roles do not establish equal people. A new named person or suggested
  // role must never inherit the confirmation of the previous stakeholder.
  return typeof rec.role === 'string' && normalized
    ? JSON.stringify([rec.kind, typeof rec.name === 'string' ? rec.name.trim().replace(/\s+/g, ' ') : null, normalized])
    : normalized;
}

interface MatchPoolEntry {
  key: string;
  item: BriefItemBase;
  used: boolean;
}

function makePool(items: readonly BriefItemBase[]): MatchPoolEntry[] {
  return items.map((item) => ({ key: primaryText(item), item, used: false }));
}

/** First unused base item with the same normalized primary text. Each base item
 * matches at most once, so duplicate generated text cannot clone one owner-
 * confirmed id onto two items. */
function takeMatch(pool: MatchPoolEntry[], key: string): BriefItemBase | null {
  if (key.length === 0) return null; // empty text is never an inheritance anchor
  const hit = pool.find((e) => !e.used && e.key === key);
  if (!hit) return null;
  hit.used = true;
  return hit.item;
}

/** null pool = re-mint everything (mode 'initial', or regenerate without a base). */
function normalizeList<T extends BriefItemBase>(items: T[], pool: MatchPoolEntry[] | null, prefix: string, ids: EngineDeps['ids']): T[] {
  return items.map((item) => {
    const base = pool ? takeMatch(pool, primaryText(item)) : null;
    return base ? inheritItem(item, base) : mintItem(item, ids.next(prefix));
  });
}

function normalizeContent(content: BriefContent, ids: EngineDeps['ids'], base: BriefContent | null): BriefContent {
  const oppPool = base ? makePool([base.opportunity]) : null;
  const nextPool = base && base.nextEngagement ? makePool([base.nextEngagement]) : null;
  // Opportunity id is fixed either way: a match only restores review/edited/origin.
  const oppBase = oppPool ? takeMatch(oppPool, primaryText(content.opportunity)) : null;
  const opportunity = oppBase ? inheritItem(content.opportunity, oppBase) : mintItem(content.opportunity, 'opportunity');

  // Section order matters: ids are minted in the same sequence as before
  // (valuePoints, stakeholders, questions, concerns, nextEngagement).
  const valuePoints = normalizeList(content.valuePoints, base ? makePool(base.valuePoints) : null, 'vp', ids);
  const stakeholders = normalizeList(content.stakeholders, base ? makePool(base.stakeholders) : null, 'sh', ids);
  const questions = normalizeList(content.questions, base ? makePool(base.questions) : null, 'q', ids);
  const concerns = normalizeList(content.concerns, base ? makePool(base.concerns) : null, 'cn', ids);

  // m2: model output can exceed the priority-question cap; clamping deterministically
  // keeps the candidate savable — a repair round would cost a second paid call and a
  // strict PATCH would later reject the over-cap content anyway.
  let prioritySeen = 0;
  const clampedQuestions = questions.map((q) => {
    if (!q.priority) return q;
    prioritySeen += 1;
    return prioritySeen <= LIMITS.priorityQuestions ? q : { ...q, priority: false };
  });

  let nextEngagement: BriefNextEngagement | null = null;
  if (content.nextEngagement) {
    const nextBase = nextPool ? takeMatch(nextPool, primaryText(content.nextEngagement)) : null;
    nextEngagement = nextBase ? inheritItem(content.nextEngagement, nextBase) : mintItem(content.nextEngagement, ids.next('next'));
  }

  return {
    schemaVersion: content.schemaVersion,
    opportunity: { ...opportunity, id: 'opportunity' },
    valuePoints,
    stakeholders,
    questions: clampedQuestions,
    concerns,
    nextEngagement,
  };
}

function normalizeChanges(changes: ProposedChange[], ids: EngineDeps['ids']): ProposedChange[] {
  // Change ids are host-minted too; targetIds are NOT — they were validated to
  // exist in the base content and must stay stable for the review UI.
  return changes.map((c) => ({ ...c, id: ids.next('chg') }));
}

type Attempt =
  | { ok: true; content: BriefContent | null; changes: ProposedChange[] | null }
  | { ok: false; issues: string[] };

/** Narrow output checks supplement editorial instructions; they are not proof
 * of every qualitative claim. Financial arithmetic belongs to pricing/business
 * case, and job titles must not be presented as individual person names. */
function modelGroundingIssues(value: BriefContent | ProposedChange[]): string[] {
  const serialized = JSON.stringify(value);
  const amount = /(?:[$€£₩¥￥]|\b(?:USD|KRW|CNY|RMB|EUR)\b)\s*[\d０-９]|[\d０-９][\d０-９.,]*(?:\s*(?:[kmb]|thousand|million|만|억|천|千|万|亿))?\s*(?:\b(?:USD|KRW|CNY|RMB|EUR|dollars?|euros?|yuan)\b|달러|원|美元|人民币|元)/iu;
  const issues = amount.test(serialized) ? ['Model prose must not contain monetary amounts; refer to the separate pricing panel without quoting figures.'] : [];
  if (!Array.isArray(value)) for (const person of value.stakeholders) {
    if (person.kind === 'named' && /^(?:C[EFITO]O|CISO|CDO|SA|BD|CEO|CFO|CTO|CIO|COO)$/i.test(person.name?.trim() ?? '')) {
      issues.push('Job titles such as CTO/CFO are suggested-role stakeholders with name null, not named people.');
    }
  }
  return issues;
}

function attemptValidate(parsed: unknown, input: GenerateInput, evidence: Set<string>): Attempt {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, issues: ['output must be a single JSON object'] };
  }
  const rec = parsed as Record<string, unknown>;
  if (input.mode === 'review-notes') {
    // base is guaranteed non-null by generateBrief's precondition check.
    const base = input.base;
    if (!base) return { ok: false, issues: ['review-notes requires a base brief'] };
    const v = validateChanges(rec.changes ?? parsed, evidence, base.content);
    if (!v.ok) return { ok: false, issues: v.issues };
    const groundingIssues = modelGroundingIssues(v.value);
    if (groundingIssues.length) return { ok: false, issues: groundingIssues };
    return { ok: true, content: null, changes: v.value };
  }
  if (rec.content === undefined || rec.content === null) {
    return { ok: false, issues: ['output must contain a "content" object'] };
  }
  const v = validateModelContent(rec.content, evidence);
  if (!v.ok) return { ok: false, issues: v.issues };
  const groundingIssues = modelGroundingIssues(v.value);
  if (groundingIssues.length) return { ok: false, issues: groundingIssues };
  return { ok: true, content: v.value, changes: null };
}

export async function generateBrief(
  input: GenerateInput,
  opts: { signal?: AbortSignal; deadlineMs?: number },
  deps: EngineDeps,
): Promise<EngineOutcome> {
  // review-notes proposes changes beside a saved version; without a base there is
  // nothing to target — fail before spending a model call.
  if (input.mode === 'review-notes' && input.base === null) {
    return { ok: false, reason: 'validation', partialUsage: null };
  }
  // Same bounding as buildGeneratePrompt: notes beyond the per-generate cap are
  // not shown to the model, so their ids are not valid evidence either.
  const boundedNotes = input.mode === 'review-notes' ? input.notes.slice(0, LIMITS.notesPerGenerate) : [];
  const evidence = evidenceIds(input.snapshot, boundedNotes);
  const totalMs = opts.deadlineMs ?? LIMITS.generationDeadlineMs;
  const startedAt = deps.clock.now();

  // ONE internal controller chained to the caller's signal: the deadline and the
  // caller share a single abort path into the model transport.
  const controller = new AbortController();
  const onCallerAbort = (): void => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', onCallerAbort);
  }
  const timer = setTimeout(() => controller.abort(), totalMs);

  let usage: ModelUsage | null = null;
  const remaining = (): number => Math.max(0, totalMs - (deps.clock.now() - startedAt));
  try {
    const originalPrompt = buildGeneratePrompt(input);
    const first = await callModel(deps, originalPrompt, input, controller.signal, remaining());
    if (!first.ok) return { ok: false, reason: first.reason, partialUsage: addUsage(usage, first.usage) };
    usage = addUsage(usage, first.usage);

    let repairs = 0;
    let text = first.text;
    let parsed = parseModelJson(text);
    let attempt: Attempt = parsed === null ? { ok: false, issues: ['output was not parseable as a JSON object'] } : attemptValidate(parsed, input, evidence);

    if (!attempt.ok) {
      // Exactly one bounded format repair, inside the SAME total deadline.
      if (controller.signal.aborted || remaining() <= 0) return { ok: false, reason: 'timeout', partialUsage: usage };
      const repairInstructions = buildRepairPrompt(text, attempt.issues);
      // A format repair needs the same language, allowed evidence and editorial
      // rules. The rejected output is untrusted data, never a replacement brief.
      const repairPrompt = {
        system: `${originalPrompt.system}\n\n${repairInstructions.system}`,
        user: `${originalPrompt.user}\n\n${repairInstructions.user}`,
      };
      const repair = await callModel(deps, repairPrompt, input, controller.signal, remaining());
      if (!repair.ok) return { ok: false, reason: repair.reason, partialUsage: addUsage(usage, repair.usage) };
      usage = addUsage(usage, repair.usage);
      repairs = 1;
      text = repair.text;
      parsed = parseModelJson(text);
      attempt = parsed === null ? { ok: false, issues: ['output was not parseable as a JSON object'] } : attemptValidate(parsed, input, evidence);
      if (!attempt.ok) return { ok: false, reason: 'validation', partialUsage: usage };
    }

    // The deadline may have passed while the successful call was in flight.
    if (controller.signal.aborted) return { ok: false, reason: 'timeout', partialUsage: usage };

    const reviewMode = input.mode === 'review-notes';
    // Owner state survives regeneration only (plan §6): 'initial' always starts
    // clean, 'review-notes' proposes changes beside the base instead of content.
    const preservationBase = input.mode === 'regenerate' ? (input.base?.content ?? null) : null;
    const candidate: BriefCandidate = {
      kind: reviewMode ? 'changes' : 'content',
      baseVersion: input.base ? input.base.version : 0,
      snapshotFingerprint: snapshotFingerprint(input.snapshot),
      content: !reviewMode && attempt.content ? normalizeContent(attempt.content, deps.ids, preservationBase) : null,
      changes: reviewMode && attempt.changes ? normalizeChanges(attempt.changes, deps.ids) : null,
    };
    return { ok: true, result: { candidate, usage, repairs } };
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onCallerAbort);
  }
}
