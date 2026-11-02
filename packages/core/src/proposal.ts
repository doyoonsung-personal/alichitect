// The proposal writer: drafts the business narrative of the exported PDF (POST /api/proposal) from the session the
// browser holds. qwen3.8-max (thinking off, as for turns) writes NDJSON section lines (types.ts ProposalSection); each
// complete line is validated (parseProposalLine), checked against what was already accepted (counts, duplicates, one
// why per product) and handed to onSection at once, so the export overlay shows progress as the draft grows.
//
// Every line also passes the writing rules (lintSection): a line making a claim nobody made is never printed; a line
// breaking a style rule is held back as a last resort. Either way the continuation below is asked to write it again.
//
// Recovery, in the order it can happen:
//   no first token in 20 s, 20 s of silence, 150 s in all, or a retryable error before any section arrived: one retry
//   on the fallback model (qwen3.7-max), onStatus('retry'). Once sections arrived nothing restarts: the draft continues;
//   a stream cut off (finish_reason 'length', a watchdog), a draft missing required parts (exec, two needs, an outcome,
//   a why for every product in the design, a tradeoff, a next step) or lines set aside by the rules gets ONE
//   continuation call that lists the accepted lines, the set-aside ones with the reason and exactly what is missing,
//   onStatus('finish'), when at least PROPOSAL_LIMITS.continueMinMs of the deadline is left. Every call ends
//   deadlineMarginMs before the caller's deadline, so a deadline keeps the sections written;
//   Model Studio's content filter on any call: the backup (claude.ts, BackupProvider.complete) continues the draft from
//   the accepted lines, when it exists, the deadline leaves BACKUP_MIN_MS_LEFT and backupGate (the spending caps)
//   allows it, onStatus('finish'). Its text goes through the same parser and checks; onBackupCall books each call.
// The result never says who wrote a line: sections carry no provider or model, and statuses are only 'retry' and
// 'finish'. Upstream failures never throw: the outcome is 'failed' with a neutral error code, and the PDF falls back to
// the version without a narrative. Browser-safe like llm.ts; the API key only goes to complete().
import type { Catalog, ProposalDraft, ProposalNeed, ProposalRequest, ProposalSection, Provider } from './types.ts';
import { BACKUP_MIN_MS_LEFT, DEFAULT_MODEL, FALLBACK_MODEL, complete, isContentFilter } from './llm.ts';
import type { BackupCall, BackupGateResult, BackupProvider, BackupSkipped, CompleteResult, TurnError, Usage } from './llm.ts';
import type { Price } from './pricing.ts';
import { normalizeKey } from './catalog.ts';
import type { ChatMessage } from './prompt.ts';
import { RESIDENCY_ASK, continuationMessage, customerWords, designProducts, proposalMessages, regionWords } from './proposal-prompt.ts';
import { PROPOSAL_HIDDEN as HIDDEN, proposalWorkflowIds } from './proposal-prompt.ts';

export { PROPOSAL_SYSTEM, designProducts, regionWords } from './proposal-prompt.ts';

/** Caps of the drafted narrative and of the drafting calls. Text lengths are in code points. */
export const PROPOSAL_LIMITS = {
  exec: 1400,
  need: 220,
  quote: 160,
  answer: 700,
  outcomeTitle: 70,
  outcomeText: 360,
  why: 600,
  step: 700,
  tradeoff: 360,
  mitigation: 360,
  next: 240,
  /** Section counts kept; later lines past a cap are dropped. */
  needs: 6,
  outcomes: 4,
  tradeoffs: 4,
  nextSteps: 5,
  /** A quote shorter than this (after normalising) proves nothing and is dropped. */
  quoteMin: 4,
  /** Needs a draft must have before it counts as complete enough to skip the continuation call. */
  needsWanted: 2,
  maxTokens: 6000,
  temperature: 0.5,
  /** Watchdogs of one Qwen call. */
  firstByteMs: 20_000,
  idleMs: 20_000,
  totalMs: 150_000,
  /** Backup calls at most: the continuation, and one more when that was cut off at its token cap. */
  backupCalls: 2,
  /** The continuation call starts only with this much of the caller's deadline left (msLeft). */
  continueMinMs: 45_000,
  /** Every call ends this long before the caller's deadline, so the caller's abort never throws written sections away. */
  deadlineMarginMs: 5_000,
} as const;

// ---------- validation ----------

/** What the validator needs to know about the session. */
export interface ProposalCtx {
  lang: ProposalRequest['lang'];
  /** Catalog ids in the design, in reading order (designProducts): the only ids a why or a need may name. */
  products: string[];
  steps: string[];
  stepIds: ReadonlyMap<string, string>;
  workflow: boolean;
  workflowOnly: boolean;
  modelNames: string[];
  /** The customer's own messages (memory.turns role 'user', correction prefixes removed), normalised for the quote check. */
  customerText: string[];
  /** The same messages, lowercased with spacing kept: the words a claim must be backed by (lintSection). */
  customerWords: string;
  /** Catalog names and short names of the design's products the customer never wrote: kept out of exec and outcomes. */
  productNames: string[];
  /** Lowercased names and catalog text of the design's products: the model names a line may repeat. */
  catalogText: string;
  /** Whether any product of the design has a catalog price: without one, no line may talk about prices or a budget. */
  hasPrice: boolean;
  /** The customer's name from the cover, as typed: a line may not misspell it. */
  customer: string;
}

export function proposalCtx(req: ProposalRequest, catalog: Catalog): ProposalCtx {
  const memory = req.memory;
  const stepIds = proposalWorkflowIds(memory.workflow);
  const products = designProducts(memory.graph, catalog, memory.workflow);
  const own = (memory.turns ?? []).filter((t) => t.role === 'user').map((t) => customerWords(t.text));
  const words = own.join('\n').normalize('NFKC').toLowerCase();
  const modelNames = [...new Set(Object.values(memory.workflow?.nodes ?? {}).flatMap((n) => n.ai ? [n.ai.toLowerCase()] : []))];
  const entries = products.map((p) => catalog.byId.get(p)).filter((e): e is NonNullable<typeof e> => !!e);
  // "Elastic Compute Service (ECS)" is also written "Elastic Compute Service" and "ECS"
  const names = [...new Set(entries.flatMap((e) => [e.name, e.name.replace(/\s*\([^)]*\)$/, ''), e.short]).map((n) => n.trim()).filter((n) => Array.from(n).length >= 2))];
  return {
    lang: req.lang === 'ko' || req.lang === 'zh' ? req.lang : 'en',
    products,
    steps: Object.values(memory.workflow?.nodes ?? {})
      .filter((n) => !n.on && n.kind !== 'trigger' && n.kind !== 'end').map((n) => stepIds.get(n.id) ?? n.id),
    stepIds,
    workflow: Object.keys(memory.workflow?.nodes ?? {}).length > 0,
    workflowOnly: Object.keys(memory.workflow?.nodes ?? {}).length > 0
      && Object.keys(memory.graph.nodes).length === 0 && memory.graph.recs.length === 0,
    modelNames,
    customerText: own.map((t) => normalizeKey(t)).filter(Boolean),
    customerWords: words,
    productNames: [...names, ...modelNames].filter((n) => !words.includes(n.toLowerCase())).sort((a, b) => b.length - a.length),
    catalogText: entries.map((e) => [e.name, e.short, e.purpose, e.useWhen ?? ''].join(' ')).join('\n').toLowerCase(),
    hasPrice: entries.some((e) => !!e.price),
    customer: String(req.customer ?? '').trim(),
  };
}

/** The messages of a first draft: the writing brief, then the session as facts (proposal-prompt.ts). */
export function buildProposalMessages(req: ProposalRequest, catalog: Catalog): ChatMessage[] {
  return proposalMessages(req, catalog, designProducts(req.memory.graph, catalog, req.memory.workflow));
}

// Workflow model names describe the design, never the writer.
const DOCUMENT = String.raw`(?:this|the|our) (?:proposal|document|text|report|narrative)`;
const AUTHOR_VERB = '(?:written|generated|drafted|prepared|authored|created|produced)';
const WRITER = new RegExp([
  String.raw`\b(?:I am|I'm|as an? (?:AI|language model))\b`,
  String.raw`(?:^|[.!?]\s+)${AUTHOR_VERB} (?:by|with|using)\b`,
  String.raw`\b${DOCUMENT}\s+(?:(?:is|was|has been)\s+)?${AUTHOR_VERB}\s+(?:by|with|using)\b`,
  String.raw`\b${DOCUMENT}\s+(?:comes? from|is (?:from|by)|is (?:the work|courtesy) of)\b`,
  String.raw`\b(?:wrote|generated|drafted|prepared|authored|created|produced)\s+${DOCUMENT}\b`,
  '(?:\uC774 \uC81C\uC548\uC11C|\uC774 \uBB38\uC11C|\uC774 \uAE00).{0,30}(?:\uC791\uC131|\uC0DD\uC131)',
  '(?:\u672C\u6587|\u672C\u63D0\u6848|\u672C\u65B9\u6848).{0,30}(?:\u64B0\u5199|\u751F\u6210)',
].join('|'), 'i');
// Format placeholders, never comparisons such as "latency <50 ms".
const PLACEHOLDER = /<[a-z][a-z ,'’-]{2,90}>/i;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u2060\ufeff]/g;

/** Markdown emphasis, headings, list markers and code ticks out; control characters out; whitespace collapsed. */
function plain(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(CONTROL, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*(?:[-*•·]|\d{1,2}[.)])[ \t]+/gm, '')
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/__([^_\n]+?)__/g, '$1')
    .replace(/(^|[^\p{L}\p{N}*])\*(?!\s)([^*\n]+?)\*(?![\p{L}\p{N}])/gu, '$1$2')
    .replace(/(^|[^\p{L}\p{N}_])_(?!\s)([^_\n]+?)_(?![\p{L}\p{N}])/gu, '$1$2')
    .replace(/\*\*|`+/g, '');
}

/**
 * At most `max` code points: cut at the last sentence end in the last 40% of the room, else at the last space there
 * (with an ellipsis), else hard (with an ellipsis).
 */
export function capText(s: string, max: number): string {
  const cps = Array.from(s);
  if (cps.length <= max) return s;
  const head = cps.slice(0, max - 1).join('');
  const floor = Math.floor(head.length * 0.6);
  let end = -1;
  const re = /[.!?](?=\s)|[。！？]/gu;
  for (let m = re.exec(head); m; m = re.exec(head)) end = m.index + m[0].length;
  if (end >= floor) return head.slice(0, end).trimEnd();
  const space = head.search(/\s\S*$/);
  if (space >= floor) return head.slice(0, space).replace(/[\s,;:、，；：\-–—]+$/u, '') + '…';
  return head.trimEnd() + '…';
}

/** A text field as the PDF prints it, or null when it is missing or empty. `paragraphs` keeps \n\n breaks (exec). */
function text(v: unknown, max: number, paragraphs = false): string | null {
  if (typeof v !== 'string') return null;
  const p = regionWords(plain(v));
  const out = paragraphs
    ? p.split(/\n\s*\n/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n')
    : p.replace(/\s+/g, ' ').trim();
  if (!out) return null;
  return capText(out, max).replace(/\n\n…$/, '…');
}

const SOURCES: ReadonlySet<string> = new Set(['stated', 'inferred', 'general']);

/** True when the quote, normalised, is in one of the customer's own messages. */
function quoted(q: string, ctx: ProposalCtx): boolean {
  const k = normalizeKey(q);
  return Array.from(k).length >= PROPOSAL_LIMITS.quoteMin && ctx.customerText.some((m) => m.includes(k));
}

const productId = (v: unknown, ctx: ProposalCtx): string | null => {
  if (typeof v !== 'string') return null;
  const id = v.trim().toLowerCase();
  return ctx.products.includes(id) ? id : null;
};

/** One section object as the PDF may print it, or null. Shared by parseProposalLine and assembleDraft. */
function sanitize(raw: unknown, ctx: ProposalCtx): ProposalSection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const L = PROPOSAL_LIMITS;
  let s: ProposalSection | null = null;
  switch (o.k) {
    case 'exec': {
      const t = text(o.text, L.exec, true);
      if (t) s = { k: 'exec', text: t };
      break;
    }
    case 'need': {
      const need = text(o.need, L.need);
      const answer = text(o.answer, L.answer);
      if (!need || !answer) break;
      let source = typeof o.source === 'string' && SOURCES.has(o.source) ? (o.source as ProposalNeed['source']) : 'inferred';
      let quote = text(typeof o.quote === 'string' ? o.quote.replace(/^[\s"'“”‘’「」『』]+|[\s"'“”‘’「」『』]+$/gu, '') : o.quote, L.quote);
      if (quote && (source === 'general' || !quoted(quote, ctx))) quote = null;
      if (source === 'stated' && !quote) source = 'inferred';
      const products = Array.isArray(o.products) ? [...new Set(o.products.map((p) => productId(p, ctx)).filter((p): p is string => !!p))] : [];
      s = { k: 'need', id: typeof o.id === 'string' ? o.id : '', need, source, ...(quote ? { quote } : {}), answer, products };
      break;
    }
    case 'outcome': {
      const title = text(o.title, L.outcomeTitle);
      const t = text(o.text, L.outcomeText);
      if (title && t) s = { k: 'outcome', title, text: t };
      break;
    }
    case 'why': {
      const product = productId(o.product, ctx);
      const t = text(o.text, L.why);
      if (product && t) s = { k: 'why', product, text: t };
      break;
    }
    case 'step': {
      const rawId = typeof o.id === 'string' ? o.id.trim() : '';
      const id = ctx.stepIds.get(rawId) ?? rawId;
      const t = text(o.text, L.step);
      if (ctx.steps.includes(id) && t) s = { k: 'step', id, text: t };
      break;
    }
    case 'tradeoff': {
      const t = text(o.text, L.tradeoff);
      const mitigation = text(o.mitigation, L.mitigation);
      if (t) s = mitigation ? { k: 'tradeoff', text: t, mitigation } : { k: 'tradeoff', text: t };
      break;
    }
    case 'next': {
      const t = text(o.text, L.next);
      if (t) s = { k: 'next', text: t };
      break;
    }
  }
  if (!s) return null;
  if (ctx.workflow && HIDDEN.test(JSON.stringify(s))) return null;
  const words = Object.entries(s).filter(([k]) => k !== 'k' && k !== 'product' && k !== 'products' && k !== 'id').map(([, v]) => String(v)).join('\n');
  if (HIDDEN.test(words) || PLACEHOLDER.test(words) || (ctx.workflow && WRITER.test(words))) return null;
  return s;
}


// ---------- the post-check: what the prompt asks for, enforced on each line ----------
//
// A 'hard' problem is a claim nobody made (an absolute promise, a price or a regulation that is not there, a model name
// from memory, a Korean line that says the opposite): the line is never printed. A 'soft' problem is style (a why that
// describes the product, jargon on the executive page, a colloquial word): the line is held back and printed only when
// the continuation cannot write a better one, so a draft never loses its exec or a why to a style rule. Either way the
// line and the reason go to the continuation call, which is asked to write it again.

export interface LintProblem {
  level: 'hard' | 'soft';
  /** Machine name of the rule, for stats and tests. */
  rule: 'absolute' | 'price' | 'requirement' | 'model' | 'name' | 'inversion' | 'why-shape' | 'jargon' | 'register';
  /** What is wrong, as the continuation message tells the writer. */
  reason: string;
}

const ABSOLUTE: Record<ProposalCtx['lang'], RegExp> = {
  en: /\b(?:never|zero(?!-trust)\b|instant(?:ly)?\b|in seconds\b|guarantee[sd]?\b|eliminat\w*|always\b(?!-on)|without (?:any )?interruption|(?:every|all) components?\b|(?:does|do|will) not (?:drop|lose|go down|fail|crash|stall)\b|no (?:order|orders|downtime|risk|outage|outages|sale|sales)\b(?! (?:is |are )?(?:needed|required)))|100 ?%/i,
  ko: /제거|해소|완전히|절대|즉시|보장|없앱|원천 ?차단/,
  zh: /彻底|消除|杜绝|绝不|瞬间|不再|万无一失|百分之百|100 ?%|零(?:停机|宕机|风险|丢失|丢单|延迟|故障|中断)/,
};
const PRICE_ALWAYS = /\b(?:attached|appendix|enclosed|(?:listed|shown|see|set out|detailed) below)\b|아래(?:의|에)? ?(?:표|내용|참고)|첨부|附件|附录|见下|如下表/i;
// the catalog's Price line copied into a line: the PDF prints it next to its product already
const PRICE_LINE = /\bPrice:|가격\s*:|价格\s*[:：]/;
const PRICE_WORDS = /\b(?:pric(?:e|es|ed|ing)|budget\w*|monthly (?:spend|cost|bill)|estimated (?:monthly )?(?:spend|cost|budget|bill))\b|가격|요금표|예산|价格|报价|预算/i;
// A requirement, regulation or compliance claim: allowed only when the customer's own words name one (in any language).
const REGULATION = /\b(?:regulat\w*|complian\w*|laws?|legal\w*|legislat\w*)\b|규제|법규|법령|법적|법률|컴플라이언스|규정 준수|法规|法律|合规|监管/i;
// "as required", "data residency": allowed when the customer wrote such a word or asked for the data to stay in a place
const REQUIRED = /\b(?:requir\w*|residen\w*|mandat\w*)\b/i;
const CUSTOMER_REGULATION = /regulat|complian|\blaws?\b|legal|legislat|규제|법규|법령|법적|법률|컴플라이언스|규정|法规|法律|合规|监管/i;
const CUSTOMER_REQUIRED = /requir|mandat/i;
const MODEL_NAME = /\b(?:Qwen|Llama|GPT|Mistral|Gemma|DeepSeek|Baichuan|GLM)[\w.-]*\d[\w.-]*/gi;
// Dots inside versions are part of the id; punctuation after the final component is not.
const WORKFLOW_MODEL_NAME = /\b(?:Qwen|Llama|GPT|Mistral|Gemma|DeepSeek|Baichuan|GLM)\w*(?:[.-]\w+)*/gi;
const MONEY_NUMBER = String.raw`\d+(?:[.,]\d+)*`;
const MONEY_UNIT = String.raw`(?:USD|EUR|GBP|CNY|RMB|KRW|JPY|SGD|HKD|AUD|CAD|INR|dollars?|cents?|euros?|pounds?|yuan|won|yen)`;
const WORKFLOW_MONEY = new RegExp([
  String.raw`\p{Sc}\s*[+-]?\s*${MONEY_NUMBER}`,
  String.raw`\b${MONEY_UNIT}\s*${MONEY_NUMBER}`,
  String.raw`${MONEY_NUMBER}\s*(?:${MONEY_UNIT}\b|元|块|圓|円|원|달러|유로|\p{Sc})`,
  String.raw`\b(?:costs?|prices?|budget|spend|fee|charge)\s*(?:(?:is|of|are)\s*)?[:=]?\s*${MONEY_NUMBER}`,
].join('|'), 'iu');

function workflowMoney(s: ProposalSection): boolean {
  const words = [...fieldsOf(s), ...(s.k === 'need' && s.quote ? [s.quote] : [])].join('\n').normalize('NFKC');
  return WORKFLOW_MONEY.test(words);
}
const WHY_VERBS = new Set(
  'routes runs stores provides holds centralizes centralises collects distributes caches adds directs splits handles allows orchestrates serves scales enforces isolates buffers schedules traces challenges blocks prevents absorbs hosts manages delivers protects monitors balances encrypts connects accelerates offers enables'.split(' '),
);
const WITHOUT_IT = /without (?:it|them|this)\b.{0,40}\b(?:cannot|can't|there (?:is|would be) no|no compute|no application|nothing)/i;
const JARGON = /\b(?:TCP|UDP|VPCs?|VMs?|pods?|SDKs?|layer-?[47]|RAG|LLMs?|APIs?|Kubernetes|serverless|async\w*|threads?|webhooks?|WebSockets?|polling|DDoS|QPS|TPS)\b|서버리스|비동기|웹훅|폴링|동접/gi;
const KO_COLLOQUIAL = /유저|동접/;
const ZH_SLANG = /黑产|薅|刷单/;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Levenshtein distance, for names (short strings). */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** A word that is nearly, but not, the first word of the customer's name ("Nusara" for "Nusantara"), or null. */
function misspeltName(t: string, ctx: ProposalCtx): string | null {
  const first = /^[A-Za-z][A-Za-z'-]{3,}/.exec(ctx.customer)?.[0];
  if (!first) return null;
  for (const m of t.matchAll(/[A-Za-z][A-Za-z'-]{3,}/g)) {
    const w = m[0];
    if (w === first || w.slice(0, 3).toLowerCase() !== first.slice(0, 3).toLowerCase() || ctx.customerWords.includes(w.toLowerCase())) continue;
    if (editDistance(w.toLowerCase(), first.toLowerCase()) <= Math.max(1, Math.floor(first.length / 3)) && w.toLowerCase() !== first.toLowerCase()) return w;
  }
  return null;
}

/** True when the term at `i` is explained in parentheses right after it, or is itself in parentheses after a plain explanation. */
function explained(t: string, i: number, len: number): boolean {
  return /^\s*[(（]/.test(t.slice(i + len)) || /[(（][^)）]*$/.test(t.slice(0, i));
}

/** A product name or technical term in business text (exec, outcomes, need answers) that is not explained in parentheses. */
function jargonIn(t: string, ctx: ProposalCtx, step = false): string | null {
  let terms = t;
  if (step) {
    for (const name of ctx.productNames) {
      terms = terms.replace(new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`, 'gi'), '');
    }
    terms = terms.replace(/\b(?:RAG|APIs?|webhooks?)\b/gi, '');
  }
  for (const m of terms.matchAll(JARGON)) if (!explained(terms, m.index, m[0].length) && !ctx.customerWords.includes(m[0].toLowerCase())) return m[0];
  if (step) return null;
  for (const name of ctx.productNames) {
    const m = new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`, 'i').exec(t);
    if (m && !explained(t, m.index, m[0].length)) return m[0];
  }
  return null;
}

/** The text of a section, field by field, for the checks. */
function fieldsOf(s: ProposalSection): string[] {
  switch (s.k) {
    case 'exec':
    case 'why':
    case 'step':
    case 'next':
      return [s.text];
    case 'need':
      return [s.need, s.answer];
    case 'outcome':
      return [s.title, s.text];
    case 'tradeoff':
      return [s.text, s.mitigation ?? ''];
  }
}

/**
 * What a valid section breaks of the writing rules, or null. Hard: an absolute promise (in exec, a need's answer,
 * outcomes and whys); prices, a budget or other parts
 * of the document when the design has no catalog price (other parts of the document always); a requirement, regulation
 * or compliance need the customer never named (exec, needs, outcomes); a model or version named from memory; a
 * misspelt customer name; a copied catalog Price line; the
 * Korean "revenue occurs" inversion. Soft: an English why that opens with what the product does or says only "without
 * it there is no ..."; a product name or jargon in exec, outcomes and need answers; the colloquial register (유저, 동접;
 * 黑产, 刷单).
 */
export function lintSection(s: ProposalSection, ctx: ProposalCtx): LintProblem | null {
  const all = fieldsOf(s).join('\n');
  if (ctx.workflow && WRITER.test(all))
    return { level: 'hard', rule: 'model', reason: 'never identify the writer or say who generated the text' };
  if (ctx.workflow && workflowMoney(s))
    return { level: 'hard', rule: 'price', reason: 'write no monetary figures in workflow narrative; the app generates the estimate table' };
  // Promises live in exec, a need's answer, outcomes and whys. A need states the problem ("관리 부담 해소 필요"), and
  // trade-offs and next steps may say honestly what the design does not do ("confirmation is not instant").
  const claims = s.k === 'need' ? s.answer : s.k === 'tradeoff' || s.k === 'next' ? '' : all;
  if (ABSOLUTE[ctx.lang].test(claims) || (ctx.lang !== 'en' && ABSOLUTE.en.test(claims)))
    return { level: 'hard', rule: 'absolute', reason: 'it makes an absolute promise (never, instantly, eliminates, guarantees, no order is lost); say what the design reduces or makes less likely' };
  if (PRICE_LINE.test(all)) return { level: 'hard', rule: 'price', reason: "it copies a catalog Price line, which the PDF already prints next to the product; give the business reason only" };
  if (PRICE_ALWAYS.test(all)) return { level: 'hard', rule: 'price', reason: 'it refers to another part of the document; every line must stand on its own' };
  if (!ctx.hasPrice && PRICE_WORDS.test(all))
    return { level: 'hard', rule: 'price', reason: 'it mentions prices or a budget; this design has no catalog price, so describe the cost shape (fixed or pay-as-you-go) without numbers' };
  const typo = misspeltName(all, ctx);
  if (typo) return { level: 'hard', rule: 'name', reason: `it writes "${typo}" for the customer's name; write ${ctx.customer} exactly` };
  const allowedModels = ctx.workflow ? new Set([
    ...ctx.modelNames,
    ...Array.from(`${ctx.customerWords}\n${ctx.catalogText}`.matchAll(WORKFLOW_MODEL_NAME), (m) => m[0].toLowerCase()),
  ]) : null;
  for (const m of all.matchAll(ctx.workflow ? WORKFLOW_MODEL_NAME : MODEL_NAME)) {
    const name = m[0].toLowerCase();
    const allowed = allowedModels ? allowedModels.has(name)
      : ctx.customerWords.includes(name) || ctx.catalogText.includes(name) || ctx.modelNames.includes(name);
    if (!allowed)
      return {
        level: 'hard', rule: 'model',
        reason: `it names ${m[0]}, which is neither in the catalog excerpt nor in the customer's messages`,
      };
  }
  if ((s.k === 'exec' || s.k === 'need' || s.k === 'outcome') && ((REGULATION.test(all) && !CUSTOMER_REGULATION.test(ctx.customerWords)) || (REQUIRED.test(all) && !CUSTOMER_REQUIRED.test(ctx.customerWords) && !RESIDENCY_ASK.test(ctx.customerWords))))
    return { level: 'hard', rule: 'requirement', reason: 'it presents a requirement, regulation or compliance need the customer never stated; say only what the customer said, and present a region or other design choice as a choice' };
  if (ctx.lang === 'ko' && s.k === 'need' && /매출이 발생합니다/.test(all)) return { level: 'hard', rule: 'inversion', reason: 'it says revenue occurs where a loss is meant; write 매출 손실이 발생합니다' };
  if (s.k === 'why' && ctx.lang === 'en') {
    const first = /^[A-Za-z]+/.exec(s.text)?.[0].toLowerCase() ?? '';
    if (WHY_VERBS.has(first) || WITHOUT_IT.test(s.text))
      return { level: 'soft', rule: 'why-shape', reason: "it opens by describing what the product does, or says only that nothing works without it; open with the customer's problem or goal, then how this choice changes their money, risk or effort" };
  }
  if (s.k === 'exec' || s.k === 'outcome' || s.k === 'need') {
    const j = jargonIn(s.k === 'need' ? s.answer : all, ctx);
    if (j) return { level: 'soft', rule: 'jargon', reason: `it names "${j}"; the executive summary, the outcomes and the answers to needs name no product and no technical term: describe the effect for the business` };
  }
  if (s.k === 'step' && jargonIn(all, ctx, true))
    return { level: 'soft', rule: 'jargon', reason: 'explain technical terms in plain language; RAG, API and webhook may stand alone in steps' };
  if ((ctx.lang === 'ko' && KO_COLLOQUIAL.test(all)) || (ctx.lang === 'zh' && ZH_SLANG.test(all)))
    return { level: 'soft', rule: 'register', reason: ctx.lang === 'ko' ? 'it uses colloquial words (유저, 동접); write 이용자 or 고객, and 동시 접속자' : 'it uses internet slang (黑产, 薅, 刷单); write 恶意批量下单, or 应用层流量攻击 for CC attacks' };
  return null;
}

/** One NDJSON line as a valid section and what it breaks of the writing rules (lintSection), or null when it is not one. */
function readLine(line: string, ctx: ProposalCtx): { section: ProposalSection; problem: LintProblem | null } | null {
  const t = String(line ?? '').trim().replace(/,$/, '');
  if (!t.startsWith('{') || !t.endsWith('}')) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(t);
  } catch {
    return null;
  }
  const section = sanitize(raw, ctx);
  return section ? { section, problem: lintSection(section, ctx) } : null;
}

/**
 * One NDJSON line of the writer as a validated section, or null: blank lines, code fences, prose, malformed JSON,
 * unknown kinds, missing fields, products outside the design, placeholders, lines naming the backup, and lines that
 * break a writing rule (lintSection; draftProposal may still print a soft one as a last resort). Text is cleaned and
 * capped (PROPOSAL_LIMITS) and region ids read as places; a quote not found in the customer's messages is dropped and
 * 'stated' becomes 'inferred'. Counts and duplicates are checked across lines by assembleDraft (and by draftProposal
 * as lines arrive).
 */
export function parseProposalLine(line: string, ctx: ProposalCtx): ProposalSection | null {
  const r = readLine(line, ctx);
  return r && !r.problem ? r.section : null;
}

/** Accepts sections in order, enforcing the counts, one exec, one why per product (first wins), no repeated text, and need ids n1, n2, ... */
function createGate(): { add(s: ProposalSection): ProposalSection | null; sections: ProposalSection[] } {
  const sections: ProposalSection[] = [];
  const seen = new Set<string>();
  const count = (k: ProposalSection['k']): number => sections.filter((s) => s.k === k).length;
  const L = PROPOSAL_LIMITS;
  return {
    sections,
    add(s) {
      let key: string;
      if (s.k === 'exec') key = 'exec';
      else if (s.k === 'why') key = `why:${s.product}`;
      else if (s.k === 'step') key = `step:${s.id}`;
      else if (s.k === 'need') key = `need:${normalizeKey(s.need)}`;
      else if (s.k === 'outcome') key = `outcome:${normalizeKey(s.title)}`;
      else key = `${s.k}:${normalizeKey(s.text)}`;
      if (seen.has(key)) return null;
      const cap = s.k === 'need' ? L.needs : s.k === 'outcome' ? L.outcomes : s.k === 'tradeoff' ? L.tradeoffs : s.k === 'next' ? L.nextSteps : Infinity;
      if (count(s.k) >= cap) return null;
      seen.add(key);
      const out: ProposalSection = s.k === 'need' ? { ...s, id: `n${count('need') + 1}` } : s;
      sections.push(out);
      return out;
    },
  };
}

/** Machine names of the parts a draft still lacks: exec, needs (fewer than two), outcomes, why:<id> per product, tradeoffs, next. */
function missingOf(sections: readonly ProposalSection[], ctx: ProposalCtx): string[] {
  const n = (k: ProposalSection['k']): number => sections.filter((s) => s.k === k).length;
  const whys = new Set(sections.flatMap((s) => (s.k === 'why' ? [s.product] : [])));
  const out: string[] = [];
  if (!n('exec')) out.push('exec');
  if (n('need') < PROPOSAL_LIMITS.needsWanted) out.push('needs');
  const steps = new Set(sections.flatMap((s) => s.k === 'step' ? [s.id] : []));
  for (const id of ctx.steps) if (!steps.has(id)) out.push(`step:${id}`);
  if (ctx.workflowOnly) return out;
  if (!n('outcome')) out.push('outcomes');
  for (const p of ctx.products) if (!whys.has(p)) out.push(`why:${p}`);
  if (!n('tradeoff')) out.push('tradeoffs');
  if (!n('next')) out.push('next');
  return out;
}

/** The missing parts as the continuation message states them. */
function describeMissing(missing: readonly string[], sections: readonly ProposalSection[]): string[] {
  const needs = sections.filter((s) => s.k === 'need').length;
  const whys = missing.filter((m) => m.startsWith('why:')).map((m) => m.slice(4));
  const out: string[] = [];
  if (missing.includes('exec')) out.push('the exec line');
  if (missing.includes('needs')) out.push(`need lines: ${needs ? `${needs} written, add more to reach 2 to 5 in all, each a different need` : '2 to 5'}`);
  if (missing.includes('outcomes')) out.push('outcome lines: 3 or 4');
  if (whys.length) out.push(`why lines for these products, in this order: ${whys.join(', ')}`);
  const steps = missing.filter((m) => m.startsWith('step:')).map((m) => m.slice(5));
  if (steps.length) out.push(`step lines for these workflow node ids: ${steps.join(', ')}`);
  if (missing.includes('tradeoffs')) out.push('tradeoff lines: 2 to 4');
  if (missing.includes('next')) out.push('next lines: 3 to 5');
  return out;
}

// The first next step is what the reader is asked to decide or start (the exec page prints the first two): a proof of
// concept, a load test, a workshop or a cost-estimate session, else any step that is not homework ("Confirm ...").
const ENGAGEMENT = /proof[- ]of[- ]concept|\bPoC\b|pilot|load[- ]test|workshop|session|kick-?off|\bapprove|\bbook\b|\bschedule|개념 ?검증|부하 ?(?:테스트|검증)|워크숍|세션|파일럿|概念验证|压测|压力测试|研讨|试点|评估会/i;
const HOMEWORK = /^(?:Confirm|Provide|Share|Send|Tell us|Clarify|Verify|Check|확인|확정|제공|알려|请确认|请提供|请明确|确认|提供|明确)/i;

/** The next steps with the engagement asked of the customer first; the rest keep their order. */
export function leadWithEngagement(next: string[]): string[] {
  if (!next.length || (ENGAGEMENT.test(next[0]) && !HOMEWORK.test(next[0]))) return next;
  let i = next.findIndex((t) => ENGAGEMENT.test(t) && !HOMEWORK.test(t));
  if (i < 0 && HOMEWORK.test(next[0])) i = next.findIndex((t) => !HOMEWORK.test(t));
  if (i <= 0) return next;
  return [next[i], ...next.slice(0, i), ...next.slice(i + 1)];
}

/** The validated sections as the PDF's narrative. Lines past a cap, repeated lines and a second why for a product are dropped. */
export function assembleDraft(sections: ProposalSection[], ctx: ProposalCtx): ProposalDraft {
  const gate = createGate();
  for (const s of sections) {
    const clean = sanitize(s, ctx);
    if (clean && !(ctx.workflow && workflowMoney(clean))) gate.add(clean);
  }
  const d: ProposalDraft = { lang: ctx.lang, exec: '', needs: [], outcomes: [], why: {}, tradeoffs: [], next: [], complete: false };
  if (ctx.workflow) d.steps = {};
  for (const s of gate.sections) {
    if (s.k === 'exec') d.exec = s.text;
    else if (s.k === 'need') d.needs.push({ id: s.id, need: s.need, source: s.source, ...(s.quote ? { quote: s.quote } : {}), answer: s.answer, products: s.products });
    else if (s.k === 'outcome') d.outcomes.push({ title: s.title, text: s.text });
    else if (s.k === 'why') d.why[s.product] = s.text;
    else if (s.k === 'step') Object.defineProperty(d.steps!, s.id, { value: s.text, enumerable: true, configurable: true });
    else if (s.k === 'tradeoff') d.tradeoffs.push(s.mitigation ? { text: s.text, mitigation: s.mitigation } : { text: s.text });
    else d.next.push(s.text);
  }
  d.next = leadWithEngagement(d.next);
  d.complete = !!d.exec && d.needs.length > 0 && d.outcomes.length > 0 && d.tradeoffs.length > 0 && d.next.length > 0 && ctx.products.every((p) => Object.prototype.hasOwnProperty.call(d.why, p));
  if (ctx.workflow) {
    const stepsComplete = ctx.steps.every((id) => Object.hasOwn(d.steps!, id));
    d.complete = (ctx.workflowOnly ? !!d.exec && d.needs.length >= PROPOSAL_LIMITS.needsWanted : d.complete) && stepsComplete;
  }
  return d;
}

// ---------- drafting ----------

export interface DraftProposalOptions {
  apiKey: string;
  baseUrl?: string;
  /** Default DEFAULT_MODEL (qwen3.8-max). */
  model?: string;
  /** Model of the one retry after a stall or a retryable error before any section. Default FALLBACK_MODEL (qwen3.7-max); null turns the retry off. */
  fallbackModel?: string | null;
  /** Continues a draft Model Studio's content filter stopped (claude.ts createClaudeBackup; needs its complete()). */
  backup?: BackupProvider | null;
  /** Asked once, right before the backup would run; blocked or throwing, the backup does not run. */
  backupGate?: () => Promise<BackupGateResult> | BackupGateResult;
  /** Awaited after each backup call with its cost. Errors are ignored. */
  onBackupCall?: (c: BackupCall) => Promise<void> | void;
  /** Milliseconds left of the caller's deadline; the backup starts only with BACKUP_MIN_MS_LEFT left. */
  msLeft?: () => number;
  signal?: AbortSignal;
  /** Each accepted section, as soon as its line is complete. Listener errors are ignored. */
  onSection?: (s: ProposalSection) => void;
  /** 'retry': the retry after a stall or error starts; 'finish': a continuation (Qwen or backup) starts. */
  onStatus?: (code: 'retry' | 'finish') => void;
  fetchImpl?: typeof fetch;
  prices?: Record<string, Price>;
  timeouts?: Partial<{ firstByteMs: number; idleMs: number; totalMs: number }>;
}

/** Server-side record of a draft (logs and spending); never sent to a browser. */
export interface DraftStats {
  /** The Qwen model of the last Qwen call. */
  model: string;
  /** 'claude' when the backup wrote any accepted line. */
  servedBy: Provider;
  fallbackUsed: boolean;
  backupUsed: boolean;
  backupSkipped?: BackupSkipped;
  calls: number;
  costUsd: number;
  ms: number;
  /** Sections accepted (and emitted). */
  sections: number;
  /** Non-blank lines not accepted: malformed, invalid, breaking a writing rule (lintSection), over a cap or repeated. */
  rejectedLines: number;
  /** Lines that broke a writing rule, by rule (lintSection). */
  lint: Partial<Record<LintProblem['rule'], number>>;
  /** Held-back lines (a soft rule) printed at the end because nothing better replaced them. */
  heldUsed: number;
  /** Parts still missing at the end (missingOf). */
  missing: string[];
  promptTokens: number;
  completionTokens: number;
}

export interface DraftProposalResult {
  outcome: 'done' | 'aborted' | 'failed';
  /** The narrative when the outcome is 'done' (it may be incomplete: see draft.complete); null otherwise. */
  draft: ProposalDraft | null;
  error?: { code: 'content-filtered' | 'timeout' | 'upstream' | 'empty'; message: string };
  stats: DraftStats;
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const TIMEOUT_CODES: ReadonlySet<string> = new Set(['first-byte-timeout', 'idle-timeout', 'total-timeout']);
const STALL_CODES: ReadonlySet<string> = new Set([...TIMEOUT_CODES, 'unexpected-reasoning']);
const isFiltered = (e: TurnError | undefined): boolean => !!e && (e.code === 'content-filtered' || isContentFilter(e.code, e.message));

type ErrorCode = NonNullable<DraftProposalResult['error']>['code'];

const ERRORS: Record<ErrorCode, string> = {
  'content-filtered': 'The draft was stopped by a content check.',
  timeout: 'The writer did not answer in time.',
  upstream: 'The drafting service failed.',
  empty: 'The draft came back without its required parts.',
};

/**
 * Drafts the proposal's narrative for a session. Streams accepted sections through onSection, and returns the
 * assembled draft ('done': an exec, a need and a why at least), 'aborted' (the caller's signal; no further calls) or
 * 'failed' with a neutral error code. Never throws for upstream problems.
 */
export async function draftProposal(req: ProposalRequest, catalog: Catalog, o: DraftProposalOptions): Promise<DraftProposalResult> {
  const t0 = now();
  const ctx = proposalCtx(req, catalog);
  const messages = proposalMessages(req, catalog, ctx.products);
  const model = o.model ?? DEFAULT_MODEL;
  const fb = o.fallbackModel === undefined ? FALLBACK_MODEL : o.fallbackModel;
  const fallback = fb && fb !== model ? fb : undefined;
  const dog = {
    firstByteMs: o.timeouts?.firstByteMs ?? PROPOSAL_LIMITS.firstByteMs,
    idleMs: o.timeouts?.idleMs ?? PROPOSAL_LIMITS.idleMs,
    totalMs: o.timeouts?.totalMs ?? PROPOSAL_LIMITS.totalMs,
  };
  const gate = createGate();
  const stats: DraftStats = { model, servedBy: 'qwen', fallbackUsed: false, backupUsed: false, calls: 0, costUsd: 0, ms: 0, sections: 0, rejectedLines: 0, lint: {}, heldUsed: 0, missing: [], promptTokens: 0, completionTokens: 0 };
  /** Lines that broke a soft rule, in arrival order: printed at the end only where their part is still missing. */
  const held: ProposalSection[] = [];
  /** Lines that broke a rule, with the reason: the continuation is asked to write them again without the problem. */
  const refused: Array<{ section: ProposalSection; reason: string }> = [];
  /** The opening sentences of the accepted why lines: a why that opens like another is held back (the shape rule). */
  const openings = new Set<string>();
  const openingOf = (t: string): string => normalizeKey(/^[^.!?。！？]*/u.exec(t)?.[0] ?? t);
  /** Milliseconds left of the caller's deadline; Infinity without one, or when it cannot be read. */
  const left = (): number => {
    if (!o.msLeft) return Infinity;
    try {
      const v = o.msLeft();
      return Number.isFinite(v) ? v : Infinity;
    } catch {
      return Infinity;
    }
  };
  // The caller's abort is the browser leaving (no draft is wanted) unless the deadline has passed: then the sections
  // already written still make a draft (the calls end before the deadline, so this is only a fallback).
  const aborted = (): boolean => !!o.signal?.aborted && left() > 0;
  /** A call's total watchdog: the usual one, or the time left before the deadline (less the margin) when that is shorter. */
  const totalFor = (ms: number): number => Math.max(1_000, Math.min(ms, left() - PROPOSAL_LIMITS.deadlineMarginMs));
  const status = (code: 'retry' | 'finish'): void => {
    try {
      o.onStatus?.(code);
    } catch {
      /* a listener error must not break the draft */
    }
  };
  const book = (r: { costUsd: number; usage: Usage | null }): void => {
    stats.costUsd += r.costUsd;
    stats.promptTokens += r.usage?.prompt_tokens ?? 0;
    stats.completionTokens += r.usage?.completion_tokens ?? 0;
  };
  const emit = (a: ProposalSection): void => {
    stats.sections++;
    try {
      o.onSection?.(a);
    } catch {
      /* a listener error must not break the draft */
    }
  };
  /** Splits streamed text into lines and accepts each valid, new section at once; one that breaks a rule is set aside. */
  const feed = (): { push(d: string): void; end(): void; accepted: number } => {
    let buf = '';
    const f = {
      accepted: 0,
      push(d: string): void {
        buf += d;
        for (let i = buf.indexOf('\n'); i >= 0; i = buf.indexOf('\n')) {
          line(buf.slice(0, i));
          buf = buf.slice(i + 1);
        }
      },
      end(): void {
        line(buf);
        buf = '';
      },
    };
    const line = (l: string): void => {
      if (!l.trim()) return;
      const r = readLine(l, ctx);
      if (r && !r.problem && r.section.k === 'why' && openings.has(openingOf(r.section.text)))
        r.problem = { level: 'soft', rule: 'why-shape', reason: 'it opens with the same sentence as another why line; open with the business problem this product answers' };
      if (r?.problem) {
        stats.rejectedLines++;
        stats.lint[r.problem.rule] = (stats.lint[r.problem.rule] ?? 0) + 1;
        refused.push({ section: r.section, reason: r.problem.reason });
        if (r.problem.level === 'soft') held.push(r.section);
        return;
      }
      const a = r && gate.add(r.section);
      if (!a) {
        stats.rejectedLines++;
        return;
      }
      if (a.k === 'why') openings.add(openingOf(a.text));
      f.accepted++;
      emit(a);
    };
    return f;
  };
  const qwen = async (m: string, msgs: ChatMessage[]): Promise<{ r: CompleteResult; accepted: number }> => {
    const f = feed();
    stats.calls++;
    stats.model = m;
    const r = await complete({
      apiKey: o.apiKey,
      baseUrl: o.baseUrl,
      model: m,
      messages: msgs,
      maxTokens: PROPOSAL_LIMITS.maxTokens,
      temperature: PROPOSAL_LIMITS.temperature,
      signal: o.signal,
      firstByteTimeoutMs: dog.firstByteMs,
      idleTimeoutMs: dog.idleMs,
      totalTimeoutMs: totalFor(dog.totalMs),
      prices: o.prices,
      fetchImpl: o.fetchImpl,
      onDelta: (d) => f.push(d),
    });
    f.end();
    book(r);
    return { r, accepted: f.accepted };
  };
  const stop = (): DraftProposalResult => {
    stats.ms = Math.round(now() - t0);
    stats.missing = missingOf(gate.sections, ctx);
    return { outcome: 'aborted', draft: null, stats };
  };
  /** The continuation's message: what is written, what is missing, and the set-aside lines to write again. */
  const continueWith = (missing: string[]): ChatMessage =>
    continuationMessage(gate.sections, describeMissing(missing, gate.sections), ctx.lang, refused.slice(-12).map((x) => `${JSON.stringify(x.section)} (not accepted: ${x.reason})`));
  /**
   * 'done' when the draft is usable (an exec, a need and a why), whatever went wrong on the way; else 'failed' with
   * `err`. A held-back line fills its part first when nothing better arrived for it (an exec, a why, the minimum needs).
   */
  const finish = (err: ErrorCode | null): DraftProposalResult => {
    for (const s of held) {
      const slot = s.k === 'step' ? `step:${s.id}` : s.k === 'why' ? `why:${s.product}` : s.k === 'exec' ? 'exec' : s.k === 'next' ? 'next' : `${s.k}s`;
      // a stated need is the customer's own point: kept when no accepted need carries its quote, even past the minimum
      const lostQuote = s.k === 'need' && !!s.quote && !gate.sections.some((x) => x.k === 'need' && x.quote === s.quote);
      if (!lostQuote && !missingOf(gate.sections, ctx).includes(slot)) continue;
      const a = gate.add(s);
      if (a) {
        stats.heldUsed++;
        emit(a);
      }
    }
    stats.ms = Math.round(now() - t0);
    stats.missing = missingOf(gate.sections, ctx);
    const draft = assembleDraft(gate.sections, ctx);
    if (draft.exec && draft.needs.length && (ctx.workflowOnly ? draft.complete : Object.keys(draft.why).length)) return { outcome: 'done', draft, stats };
    const code = err ?? 'empty';
    return { outcome: 'failed', draft: null, error: { code, message: ERRORS[code] }, stats };
  };
  // a call ended by the caller's deadline (the signal fired with no time left) failed for want of time
  const errCode = (e: TurnError | undefined): ErrorCode | null =>
    !e ? null : isFiltered(e) ? 'content-filtered' : TIMEOUT_CODES.has(e.code) || o.signal?.aborted ? 'timeout' : 'upstream';

  // 1. The draft, with one retry on the fallback model when it failed before any section arrived.
  let useModel = model;
  let call = await qwen(useModel, messages);
  if (aborted()) return stop();
  if (call.r.error && !isFiltered(call.r.error) && call.r.error.retryable && gate.sections.length === 0 && fallback && !o.signal?.aborted) {
    status('retry');
    stats.fallbackUsed = true;
    useModel = fallback;
    call = await qwen(useModel, messages);
    if (aborted()) return stop();
  }
  let lastError = call.r.error;
  let filtered = isFiltered(lastError);

  // 2. One continuation for a cut-off or incomplete draft (never for an error a new call cannot fix, such as auth).
  if (!filtered) {
    const missing = missingOf(gate.sections, ctx);
    const fixable = !lastError || lastError.retryable;
    // not when the deadline is near: a continuation cut off by it would gain nothing, and the draft as it is still prints
    // Also for lines set aside for breaking a rule: the person asked for a careful document and waits for it.
    if ((missing.length || refused.length) && fixable && (gate.sections.length > 0 || !lastError) && left() >= PROPOSAL_LIMITS.continueMinMs) {
      const contModel = lastError && STALL_CODES.has(lastError.code) && fallback ? fallback : useModel;
      if (contModel !== model) stats.fallbackUsed = true;
      // "Taking a little longer" only when parts are missing; rewriting set-aside lines is part of the usual work
      if (missing.length) status('finish');
      const cont = await qwen(contModel, [...messages, continueWith(missing)]);
      if (aborted()) return stop();
      // A failed continuation leaves the draft as it was; its error explains a draft that is still unusable.
      if (cont.r.error) lastError = cont.r.error;
      filtered = isFiltered(cont.r.error);
    }
  }

  // 3. The content filter stopped a call: the backup continues from the accepted lines, when it may.
  if (filtered && o.backup?.complete) {
    let admitted = true;
    // an unreadable deadline does not block (left() is then Infinity)
    if (left() < BACKUP_MIN_MS_LEFT) {
      stats.backupSkipped = { reason: 'deadline' };
      admitted = false;
    }
    if (admitted && o.backupGate) {
      let g: BackupGateResult;
      try {
        g = await o.backupGate();
      } catch {
        g = { ok: false, reason: 'unavailable', detail: 'gate-error' };
      }
      if (!g.ok) {
        stats.backupSkipped = { reason: g.reason, ...(g.detail ? { detail: g.detail } : {}) };
        admitted = false;
      }
    }
    if (admitted && !aborted()) {
      status('finish');
      stats.backupUsed = true;
      for (let i = 0; i < PROPOSAL_LIMITS.backupCalls; i++) {
        const missing = missingOf(gate.sections, ctx);
        if (!missing.length) break;
        const msgs = gate.sections.length || refused.length ? [...messages, continueWith(missing)] : messages;
        const f = feed();
        stats.calls++;
        // The backup's own watchdogs can outlast the deadline (BACKUP_MIN_MS_LEFT is less than its total), so its
        // call is also ended before the deadline: a slow backup then leaves the sections written so far, not nothing.
        const room = left();
        const timer = Number.isFinite(room) ? AbortSignal.timeout(Math.max(1_000, room - PROPOSAL_LIMITS.deadlineMarginMs)) : null;
        const signal = timer ? (o.signal ? AbortSignal.any([o.signal, timer]) : timer) : o.signal;
        const b = await o.backup.complete({ messages: msgs, signal, onText: (d) => f.push(d), prices: o.prices });
        f.end();
        book(b);
        if (f.accepted) stats.servedBy = o.backup.provider;
        if (o.onBackupCall) {
          try {
            await o.onBackupCall({ model: b.servedModel ?? o.backup.model, costUsd: b.costUsd, estimated: b.costEstimated, usage: b.usage, ...(b.error ? { error: b.error.code } : {}), first: i === 0 });
          } catch {
            /* bookkeeping must not break the draft */
          }
        }
        if (aborted()) return stop();
        lastError = b.error;
        // A second call only for a reply cut off at its token cap; a refusal or a failure ends the backup's part.
        if (b.error || b.finishReason !== 'max_tokens') break;
      }
    }
  }
  return finish(errCode(lastError));
}
