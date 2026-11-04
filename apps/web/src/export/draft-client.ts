// The browser side of POST /api/proposal: builds the ProposalRequest from the session on screen, reads the NDJSON
// ProposalEvents as they arrive (sharing the turn client's line reader), hands each written section to the overlay, and
// resolves with the assembled ProposalDraft. Every other way a draft can end is a DraftError the overlay can explain.
// Pure apart from fetch, which the caller can replace; the AbortSignal is the overlay's Stop.
import type { NeedSource, ProposalDraft, ProposalEvent, ProposalNeed, ProposalRequest, ProposalSection } from '@ali/core/types.ts';
import { createLineDecoder } from '../stream/ndjson-client.ts';
import type { AppState } from '../store/types.ts';

/**
 * How a draft failed. 'fatal': the server said so (its code and localized message are kept); 'unavailable': there is no
 * server that drafts (no such route, an older server, a replay or offline session); 'network': the request or the stream
 * broke; 'incomplete': the stream ended without a draft; 'aborted': Stop.
 */
export type DraftFailure = 'fatal' | 'unavailable' | 'network' | 'incomplete' | 'aborted';

export class DraftError extends Error {
  readonly kind: DraftFailure;
  readonly code: string;
  readonly retryable: boolean;
  constructor(kind: DraftFailure, code: string, message: string, retryable: boolean) {
    super(message);
    this.name = 'DraftError';
    this.kind = kind;
    this.code = code;
    this.retryable = retryable;
  }
}

export interface DraftOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  signal: AbortSignal;
  onSection?(section: ProposalSection): void;
  /** 'retry' or 'finish': the draft is taking longer than usual. The text is for logs; the overlay shows its own words. */
  onStatus?(code: 'retry' | 'finish', text: string): void;
}

/** The request for the session on screen: the cover fields as typed, in the UI's language. */
export function buildProposalRequest(s: Pick<AppState, 'session' | 'lang'>, title: string, customer: string): ProposalRequest {
  return { sessionId: s.session.id, lang: s.lang, title: title.trim(), customer: customer.trim(), memory: s.session.memory,
    ...(s.session.pricing ? { pricing: s.session.pricing } : {}) };
}

// ---------- reading the wire ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const SOURCES: ReadonlySet<string> = new Set<NeedSource>(['stated', 'inferred', 'general']);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter(str) : []);

/** One section line, checked field by field. Anything malformed or of a kind this build does not know is dropped. */
export function asSection(v: unknown): ProposalSection | null {
  if (!isObj(v)) return null;
  switch (v.k) {
    case 'exec':
    case 'cost':
      return text(v.text) ? { k: v.k, text: v.text } : null;
    case 'need':
      if (!str(v.id) || !text(v.need) || !text(v.answer) || !str(v.source) || !SOURCES.has(v.source)) return null;
      return { k: 'need', id: v.id, need: v.need, source: v.source as NeedSource, ...(text(v.quote) ? { quote: v.quote } : {}), answer: v.answer, products: strings(v.products) };
    case 'outcome':
      return text(v.title) && text(v.text) ? { k: 'outcome', title: v.title, text: v.text } : null;
    case 'why':
      return str(v.product) && text(v.text) ? { k: 'why', product: v.product, text: v.text } : null;
    case 'step':
      return text(v.id) && text(v.text) ? { k: 'step', id: v.id, text: v.text } : null;
    case 'tradeoff':
      return text(v.text) ? { k: 'tradeoff', text: v.text, ...(text(v.mitigation) ? { mitigation: v.mitigation } : {}) } : null;
    case 'next':
      return text(v.text) ? { k: 'next', text: v.text } : null;
    default:
      return null;
  }
}

/** The assembled draft from a 'done' event, with every part checked so a malformed field can never break the PDF. */
export function asDraft(v: unknown): ProposalDraft | null {
  if (!isObj(v) || !str(v.exec)) return null;
  const lang = v.lang === 'ko' || v.lang === 'zh' ? v.lang : 'en';
  const needs: ProposalNeed[] = [];
  for (const n of Array.isArray(v.needs) ? v.needs : []) {
    const s = asSection({ ...(isObj(n) ? n : {}), k: 'need' });
    if (s && s.k === 'need') {
      const { k: _k, ...need } = s;
      needs.push(need);
    }
  }
  const why: Record<string, string> = {};
  if (isObj(v.why)) for (const [id, w] of Object.entries(v.why)) if (text(w)) why[id] = w;
  return {
    lang,
    exec: v.exec,
    ...(text(v.cost) ? { cost: v.cost } : {}),
    needs,
    outcomes: (Array.isArray(v.outcomes) ? v.outcomes : []).filter((o): o is { title: string; text: string } => isObj(o) && text(o.title) && text(o.text)).map((o) => ({ title: o.title, text: o.text })),
    why,
    ...(isObj(v.steps) ? { steps: Object.fromEntries(Object.entries(v.steps).filter(([, value]) => text(value))) as Record<string, string> } : {}),
    tradeoffs: (Array.isArray(v.tradeoffs) ? v.tradeoffs : [])
      .filter((t): t is { text: string; mitigation?: unknown } => isObj(t) && text(t.text))
      .map((t) => (text(t.mitigation) ? { text: t.text, mitigation: t.mitigation } : { text: t.text })),
    next: strings(v.next).filter((s) => s.trim()),
    complete: v.complete === true,
  };
}

/** A 'done' whose draft could not be read still ends the stream; the client reports it as incomplete. */
export type WireProposalEvent = ProposalEvent | { type: 'done'; draft: null };

/** One NDJSON line as a ProposalEvent, or null when it is not one this build understands. */
export function parseProposalEvent(line: string): WireProposalEvent | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isObj(v)) return null;
  switch (v.type) {
    case 'section': {
      const section = asSection(v.section);
      return section ? { type: 'section', section } : null;
    }
    case 'status':
      return v.code === 'retry' || v.code === 'finish' ? { type: 'status', code: v.code, text: str(v.text) ? v.text : '' } : null;
    case 'done':
      return { type: 'done', draft: asDraft(v.draft) };
    case 'fatal':
      return { type: 'fatal', code: str(v.code) ? v.code : 'error', message: str(v.message) ? v.message : '', retryable: v.retryable === true };
    default:
      return null;
  }
}

const isAbort = (e: unknown): boolean => e instanceof Error && e.name === 'AbortError';
const aborted = (): DraftError => new DraftError('aborted', 'aborted', '', true);
const describe = (e: unknown): string => String((e as Error)?.message ?? e);

/**
 * POSTs the request and streams the draft. Resolves with the ProposalDraft on 'done'; rejects with a DraftError for a
 * 'fatal' (mid-stream or as a JSON error body before streaming), a missing route, a network failure, a stream that ends
 * without 'done', and Stop.
 */
export async function requestDraft(req: ProposalRequest, o: DraftOptions): Promise<ProposalDraft> {
  const f = o.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(o.url ?? '/api/proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), signal: o.signal });
  } catch (e) {
    if (isAbort(e) || o.signal.aborted) throw aborted();
    throw new DraftError('network', 'network', describe(e), true);
  }
  // no such route: a server from before drafting, or a host that answers unknown paths with the app's own page
  const type = res.headers.get('Content-Type') ?? '';
  if (res.status === 404 || res.status === 405 || res.status === 501 || /text\/html/i.test(type)) {
    void res.body?.cancel().catch(() => {});
    throw new DraftError('unavailable', `http-${res.status}`, '', false);
  }
  if (!res.ok) {
    let ev: WireProposalEvent | null = null;
    try {
      ev = parseProposalEvent(await res.text());
    } catch {
      ev = null;
    }
    if (ev?.type === 'fatal') throw new DraftError('fatal', ev.code, ev.message, ev.retryable);
    throw new DraftError('fatal', `http-${res.status}`, '', res.status >= 500 || res.status === 429);
  }
  if (!res.body) throw new DraftError('incomplete', 'no-body', '', true);

  const reader = res.body.getReader();
  // set from inside the line callback, so kept on an object the compiler does not narrow
  const end: { finished: boolean; draft: ProposalDraft | null; fatal: DraftError | null } = { finished: false, draft: null, fatal: null };
  const decoder = createLineDecoder((line) => {
    if (end.finished) return;
    const ev = parseProposalEvent(line);
    if (!ev) return;
    if (ev.type === 'section') o.onSection?.(ev.section);
    else if (ev.type === 'status') o.onStatus?.(ev.code, ev.text);
    else if (ev.type === 'done') {
      end.finished = true;
      end.draft = ev.draft;
    } else if (ev.type === 'fatal') {
      end.finished = true;
      end.fatal = new DraftError('fatal', ev.code, ev.message, ev.retryable);
    }
  });
  try {
    while (!end.finished) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) decoder.push(value);
    }
    if (!end.finished) decoder.end();
  } catch (e) {
    if (isAbort(e) || o.signal.aborted) throw aborted();
    if (!end.finished) throw new DraftError('network', 'network', describe(e), true);
  }
  // the server ends the stream after 'done' or 'fatal' anyway; nothing after them is read
  if (end.finished) void reader.cancel().catch(() => {});
  if (end.fatal) throw end.fatal;
  if (o.signal.aborted) throw aborted();
  if (!end.finished) throw new DraftError('incomplete', 'stream-ended', '', true);
  if (!end.draft) throw new DraftError('incomplete', 'bad-draft', '', true);
  return end.draft;
}
