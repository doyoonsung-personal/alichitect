// Draw first, then ask (research/phase1-asks-and-scope.md section 1): what the assume and ask ops become in the console.
// Pure derivations over the session record, never stored, so a reload, a replay and a test all agree.
//
//  - Assumption chips: memory.assumptions as the server kept them, plus the assume ops of the revision in flight,
//    minus every assumption a pinned requirement settles. "Change" sends a follow-up; the requirement that follows
//    settles the assumption and the chip goes.
//  - Questions live in the revision that asked them. They are open while that revision is the newest one; the next
//    revision closes them: an option clicked (or typed word for word) is the answer to its question, anything else
//    typed is a reply that clears the rest.
import type { AskNote, AssumeNote, Revision, SessionRecord, TurnWork } from './types.ts';

const key = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const CJK = /[぀-ヿ㐀-鿿가-힯]/u;

/** Normalized texts shorter than this (4 letters, 2 CJK characters) are too thin to say that a requirement settles them. */
const minLen = (k: string): number => (CJK.test(k) ? 2 : 4);

/**
 * True when a requirement states the assumption's own text or its alternative: "Internal only, no public access"
 * settles "Public-facing / Internal only", and "The portal is public-facing" settles "Public-facing".
 */
export function settles(requirement: string, a: AssumeNote): boolean {
  const r = key(requirement);
  const hit = (s: string | undefined): boolean => {
    if (!s) return false;
    const k = key(s);
    return k.length >= minLen(k) && r.includes(k);
  };
  return hit(a.text) || hit(a.alt);
}

export interface AssumptionView {
  id: string;
  text: string;
  /** The one-click alternative; without it the chip states the assumption and offers no Change. */
  alt?: string;
}

function upsert(list: readonly AssumeNote[], a: AssumeNote): AssumeNote[] {
  const i = list.findIndex((x) => x.id === a.id);
  if (i < 0) return [...list, a];
  const out = list.slice();
  out[i] = a;
  return out;
}

/** The chips to show now. While a turn streams, its own assume ops appear at once and its pinned requirements already settle. */
export function assumptionViews(session: SessionRecord, work: TurnWork | null): AssumptionView[] {
  const mem = session.memory;
  const last = session.revisions[session.revisions.length - 1];
  const inFlight = !!work && !!last && (last.status === 'waiting' || last.status === 'streaming');
  let list: readonly AssumeNote[] = mem.assumptions ?? [];
  const reqs: string[] = [...mem.requirements];
  if (inFlight && last) {
    for (const a of last.assumes ?? []) list = upsert(list, a);
    reqs.push(...last.reqs);
  }
  return list.filter((a) => !reqs.some((r) => settles(r, a))).map((a) => (a.alt ? { id: a.id, text: a.text, alt: a.alt } : { id: a.id, text: a.text }));
}

/** open: waiting for an answer. answered: one of its options was the next ask. replied: something else was typed instead. */
export type AskState = 'open' | 'answered' | 'replied';

export interface AskView {
  id: string;
  text: string;
  options: string[];
  state: AskState;
  /** answered: the option that was chosen. */
  answer: string | null;
  /** answered and replied: the revision whose ask closed the question. */
  closedIn: number | null;
}

/** The questions of revisions[index] with their state. */
export function askViews(revisions: readonly Revision[], index: number): AskView[] {
  const r = revisions[index];
  const asks: readonly AskNote[] = r?.asks ?? [];
  if (!r || !asks.length) return [];
  const next = revisions[index + 1];
  return asks.map((q) => {
    const options = q.options ?? [];
    if (!next) return { id: q.id, text: q.text, options, state: 'open', answer: null, closedIn: null };
    const hit = options.find((o) => key(o) === key(next.ask));
    return hit ? { id: q.id, text: q.text, options, state: 'answered', answer: hit, closedIn: next.n } : { id: q.id, text: q.text, options, state: 'replied', answer: null, closedIn: next.n };
  });
}
