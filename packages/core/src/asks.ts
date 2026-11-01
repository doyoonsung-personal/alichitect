// Assumptions and open questions ("draw first, then ask", research/phase1-asks-and-scope.md section 1): the limits the
// validator enforces, the rule that a pinned requirement settles an assumption, and how memory.assumptions is kept.
// One copy of each fact; validate.ts, llm.ts and prompt.ts import from here. Browser-safe: no Node APIs.
import type { SessionMemory } from './types.ts';

export type Assumption = NonNullable<SessionMemory['assumptions']>[number];
export type Question = NonNullable<SessionMemory['questions']>[number];

/** Spec limits. Text is counted in code points. Anything beyond is truncated or dropped with a warning. */
export const ASK_LIMITS = {
  assumePerTurn: 3,
  askPerTurn: 2,
  assumeText: 60,
  assumeAlt: 60,
  askText: 160,
  optionText: 40,
  optionsMin: 2,
  optionsMax: 4,
  /** Assumptions kept in memory; the newest win. Bounds the final user message. */
  assumptionsKept: 8,
} as const;

const key = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const CJK = /[぀-ヿ㐀-鿿가-힯]/u;

/** Normalized texts shorter than this (4 letters, 2 CJK characters) are too thin to say that a requirement settles them. */
const minLen = (k: string): number => (CJK.test(k) ? 2 : 4);

/**
 * True when a pinned requirement states the assumption's own text or its alternative: "Internal only, no public
 * access" settles "Public-facing / Internal only", and "The portal is public-facing" settles "Public-facing".
 * The console applies the same rule to its chips (apps/web/src/store/asks.ts), so the chip and the server agree.
 */
export function settles(requirement: string, a: { text: string; alt?: string }): boolean {
  const r = key(requirement);
  const hit = (s: string | undefined): boolean => {
    if (!s) return false;
    const k = key(s);
    return k.length >= minLen(k) && r.includes(k);
  };
  return hit(a.text) || hit(a.alt);
}

/** Quotation marks around the assumption's text in the follow-up the console sends ("About the assumption “Public-facing”: ..."). */
const QUOTES: ReadonlyArray<readonly [string, string]> = [['“', '”'], ['‘', '’'], ['"', '"'], ["'", "'"], ['「', '」'], ['『', '』'], ['«', '»']];
const flat = (s: string): string => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

/**
 * True when the user's message corrects this assumption: it quotes the assumption's exact text, which is how the console's
 * inline editor words every answer ("About the assumption “Public-facing”: it should be internal only."). The answer is
 * what the user says is true, so the assumption is retired whatever the model does with it, and a model that ignores the
 * rule and re-emits the same id cannot bring it back. Exact and quoted, so a message that merely mentions the words ("add
 * a public-facing API") retires nothing.
 */
export function correctedBy(ask: string, a: { text: string }): boolean {
  const m = flat(ask);
  const t = flat(a.text);
  if (!t) return false;
  return QUOTES.some(([open, close]) => m.includes(open + t + close));
}

/** The assumptions that no pinned requirement settles. */
export function unsettled(assumptions: readonly Assumption[], requirements: readonly string[]): Assumption[] {
  return assumptions.filter((a) => !requirements.some((r) => settles(r, a)));
}

/**
 * The assumptions the diagram rests on after a turn: the earlier ones with this turn's assume ops merged in by id (the
 * same id replaces in place, a new id is appended), minus every assumption a pinned requirement settles and every one the
 * user's message `ask` corrects (correctedBy). The newest `max` are kept.
 */
export function mergeAssumptions(prior: readonly Assumption[], added: readonly Assumption[], requirements: readonly string[], max: number = ASK_LIMITS.assumptionsKept, ask: string = ''): Assumption[] {
  // the user corrected these this turn: they are retired, and the model's assume op for the same id (a re-guess) is dropped
  const corrected = new Set(prior.filter((a) => correctedBy(ask, a)).map((a) => a.id));
  const out: Assumption[] = prior.filter((a) => !corrected.has(a.id)).map((a) => ({ ...a }));
  for (const a of added) {
    if (corrected.has(a.id)) continue;
    const i = out.findIndex((x) => x.id === a.id);
    if (i < 0) out.push({ ...a });
    else out[i] = { ...a };
  }
  return unsettled(out, requirements).slice(-max);
}

/** Keeps the last occurrence of each id, in first-seen order, at most `max` of them. */
export function latestById<T extends { id: string }>(list: readonly T[], max: number): T[] {
  const out: T[] = [];
  for (const x of list) {
    const i = out.findIndex((y) => y.id === x.id);
    if (i < 0) out.push(x);
    else out[i] = x;
  }
  return out.slice(0, max);
}
