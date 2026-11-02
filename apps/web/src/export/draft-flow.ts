// The proposal overlay as a pure state machine: what has been written so far (driven by the sections that arrive), the
// steps it shows, the latest written line (changed no faster than once every PREVIEW_MIN_MS, so it reads calmly), the
// quiet "taking a little longer" note, laying out the PDF, and how it failed. No React, no timers: the overlay feeds it
// events and a clock tick.
import type { ProposalSection, WorkflowGraph } from '@ali/core/types.ts';
import type { DraftFailure } from './draft-client.ts';

export type FlowPhase = 'drafting' | 'layout' | 'done' | 'failed' | 'unavailable';

/** The steps in the order the writer works through them. */
export const STEPS = ['read', 'exec', 'needs', 'outcomes', 'why', 'close', 'layout'] as const;
export type StepId = (typeof STEPS)[number];
export type StepStatus = 'done' | 'active' | 'pending';

/** The latest written line shows for at least this long before the next one replaces it. */
export const PREVIEW_MIN_MS = 1600;
/** After the download starts, the finished overlay stays this long before it closes. */
export const DONE_HOLD_MS = 900;
const PREVIEW_MAX = 160;

export interface FlowError {
  /** 'layout': the draft arrived but the PDF could not be made. */
  kind: DraftFailure | 'layout';
  code: string;
  /** The server's own localized words, when it sent any. */
  message: string;
  /** Whether trying again can help: false when the server says so (today's turns are used up, for example). */
  retryable: boolean;
}

export interface FlowState {
  phase: FlowPhase;
  startedAt: number;
  now: number;
  /** Catalog ids of the products in the design: N in "Why each component (k of N)". */
  products: string[];
  stepIds: string[];
  steps: string[];
  workflowOnly: boolean;
  exec: boolean;
  needs: number;
  outcomes: number;
  why: string[];
  tradeoffs: number;
  next: number;
  /** Index in STEPS of the furthest step that has received a section. */
  reached: number;
  /** The line on show, with a sequence number so the view can fade one line into the next. */
  preview: { text: string; seq: number } | null;
  /** The newest line, waiting for the one on show to have had its time. */
  pending: string | null;
  previewAt: number;
  /** A status event arrived: the draft is taking longer than usual. */
  slow: boolean;
  /** Laying out the basic version (no draft), after a failure. */
  basic: boolean;
  error: FlowError | null;
}

export type FlowEvent =
  | { type: 'section'; section: ProposalSection; now: number }
  | { type: 'status'; now: number }
  | { type: 'tick'; now: number }
  /** The draft is complete: the PDF is being laid out with it. */
  | { type: 'drafted'; now: number }
  /** The person chose the basic version: the PDF is being laid out without a draft. */
  | { type: 'basic'; now: number }
  | { type: 'saved'; now: number }
  | { type: 'failed'; error: FlowError; now: number };

export function startFlow(now: number, products: string[], workflow?: WorkflowGraph, workflowOnly = false): FlowState {
  const stepIds = Object.values(workflow?.nodes ?? {}).filter((n) => !n.on && n.kind !== 'trigger' && n.kind !== 'end').map((n) => n.id);
  return {
    phase: 'drafting', startedAt: now, now, products: [...new Set(products)], stepIds, steps: [], workflowOnly,
    exec: false, needs: 0, outcomes: 0, why: [], tradeoffs: 0, next: 0, reached: 0,
    preview: null, pending: null, previewAt: 0, slow: false, basic: false, error: null,
  };
}

const STEP_OF: Record<ProposalSection['k'], number> = { exec: 1, need: 2, outcome: 3, why: 4, step: 4, tradeoff: 5, next: 5 };

/** The first sentence of a paragraph, cut to a readable length at a word boundary where there is one. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  // a Latin stop ends a sentence before a space; a CJK full stop ends one wherever it is
  const m = /^(.+?(?:[.!?](?=\s|$)|[。！？]))/u.exec(flat);
  const s = m ? m[1] : flat;
  const chars = Array.from(s);
  if (chars.length <= PREVIEW_MAX) return s;
  const cut = chars.slice(0, PREVIEW_MAX).join('');
  const space = cut.lastIndexOf(' ');
  return (space > PREVIEW_MAX * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—，、]+$/u, '') + '…';
}

/** The line a section adds to the preview: the need or outcome title, the first sentence of anything else. */
export function previewOf(s: ProposalSection, productName: (id: string) => string): string {
  switch (s.k) {
    case 'need':
      return firstSentence(s.need);
    case 'outcome':
      return firstSentence(s.title);
    case 'why': {
      // a reason that already names its product is not prefixed with the name again
      const first = firstSentence(s.text);
      const name = productName(s.product);
      return first.includes(name) ? first : `${name}: ${first}`;
    }
    default:
      return firstSentence(s.text);
  }
}

function showPreview(s: FlowState, text: string, now: number): FlowState {
  if (!s.preview || now - s.previewAt >= PREVIEW_MIN_MS) return { ...s, preview: { text, seq: (s.preview?.seq ?? 0) + 1 }, pending: null, previewAt: now };
  return { ...s, pending: text };
}

export function reduceFlow(s: FlowState, ev: FlowEvent, productName: (id: string) => string = (id) => id): FlowState {
  switch (ev.type) {
    case 'section': {
      if (s.phase !== 'drafting') return s;
      const sec = ev.section;
      let next: FlowState = { ...s, now: ev.now, reached: Math.max(s.reached, STEP_OF[sec.k]) };
      if (sec.k === 'exec') next.exec = true;
      else if (sec.k === 'need') next.needs++;
      else if (sec.k === 'outcome') next.outcomes++;
      else if (sec.k === 'why') next.why = next.why.includes(sec.product) ? next.why : [...next.why, sec.product];
      else if (sec.k === 'step') next.steps = next.steps.includes(sec.id) ? next.steps : [...next.steps, sec.id];
      else if (sec.k === 'tradeoff') next.tradeoffs++;
      else next.next++;
      next = showPreview(next, previewOf(sec, productName), ev.now);
      return next;
    }
    case 'status':
      return s.phase === 'drafting' ? { ...s, now: ev.now, slow: true } : s;
    case 'tick': {
      const next = { ...s, now: ev.now };
      if (s.pending !== null && ev.now - s.previewAt >= PREVIEW_MIN_MS) return showPreview({ ...next, preview: next.preview }, s.pending, ev.now);
      return next;
    }
    case 'drafted':
      // from writing, or again after the PDF failed to lay out (Try again keeps the narrative already written)
      if (s.phase !== 'drafting' && !(s.phase === 'failed' && s.error?.kind === 'layout')) return s;
      return { ...s, phase: 'layout', now: ev.now, reached: STEPS.indexOf('layout'), slow: false, error: null };
    case 'basic':
      return { ...s, phase: 'layout', now: ev.now, basic: true, error: null, slow: false };
    case 'saved':
      return s.phase === 'layout' ? { ...s, phase: 'done', now: ev.now } : s;
    case 'failed':
      return { ...s, phase: ev.error.kind === 'unavailable' ? 'unavailable' : 'failed', now: ev.now, error: ev.error, slow: false };
  }
}

export interface StepView {
  id: StepId;
  status: StepStatus;
  /** A count of what has been written ("3"), or progress against the design ("4 of 9"). */
  count: { k: number; n?: number } | null;
}

/** The steps the overlay lists, each done, active or still to come. */
export function stepsOf(s: FlowState): StepView[] {
  const k = (s.workflowOnly ? 0 : s.why.filter((id) => s.products.includes(id)).length)
    + s.steps.filter((id) => s.stepIds.includes(id)).length;
  const n = (s.workflowOnly ? 0 : s.products.length) + s.stepIds.length;
  const counts: Partial<Record<StepId, StepView['count']>> = {
    needs: s.needs ? { k: s.needs } : null,
    outcomes: s.outcomes ? { k: s.outcomes } : null,
    why: n ? { k: Math.min(k, n), n } : null,
  };
  const at = s.phase === 'layout' ? STEPS.indexOf('layout') : s.phase === 'done' ? STEPS.length : s.reached;
  return STEPS.map((id, i): StepView => ({
    id,
    status: i < at ? 'done' : i === at && s.phase !== 'failed' && s.phase !== 'unavailable' ? 'active' : 'pending',
    count: counts[id] ?? null,
  })).filter((v) => !s.workflowOnly || (v.id !== 'outcomes' && v.id !== 'close'));
}

/** The active step, for the polite live region (one short line per step, never the streaming text). */
export function activeStep(s: FlowState): StepId | null {
  return stepsOf(s).find((v) => v.status === 'active')?.id ?? null;
}

/** "0:07", "1:05", "12:40". */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * The catalog ids of every product in the design that gets a why line: drawn cards and product-need answers, less what
 * `isProduct` turns down. The server (core proposal-prompt.ts designProducts) writes none for constructs (users,
 * devices, a data center) or ids the catalog does not know, so the caller passes a catalog test and the count can reach N.
 */
export function designProducts(
  graph: { nodes: Record<string, { product: string }>; recs: Array<{ product: string }> },
  isProduct: (id: string) => boolean = () => true,
  workflow?: WorkflowGraph,
): string[] {
  const workflowProducts = Object.values(workflow?.nodes ?? {}).flatMap((n) => [n.product, n.runs]);
  return [...new Set([
    ...Object.values(graph.nodes).map((n) => n.product), ...graph.recs.map((r) => r.product),
    ...workflowProducts.filter((p): p is string => !!p && p !== 'customer'),
  ])].filter(isProduct);
}
