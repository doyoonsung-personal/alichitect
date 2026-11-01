// One price table for every model call the project books: the app (llm.ts, and claude.ts for the Claude backup), the
// eval ledger, the latency spike and the Qwen offload helper (tools/qwen/ask.ts). USD per 1M tokens. Browser-safe: no
// Node APIs.

/** USD per 1M tokens (Singapore list prices, 2026-10-31). */
export interface Price {
  in: number;
  out: number;
  /** Implicit-cache hit (no marker; the default caching mode). */
  implicitHit: number;
  /** Explicit-cache hit (a cache_control marker). */
  explicitHit: number;
  /** Explicit-cache creation. */
  explicitCreate: number;
}

/**
 * Known models. The qwen rows are llm.ts PRICES as of 2026-10-31 (the authoritative copy); qwen3.8-max-0902 and
 * qwen3.7-plus are the extra rows of tools/qwen/ask.ts. The judge rows (kimi-k3, deepseek-v4-pro, glm-5.3) carry the
 * conservative UNKNOWN_PRICE that the eval ledger booked them at: their list prices were not researched.
 */
export const PRICES: Record<string, Price> = {
  'qwen3.8-max': { in: 2, out: 6, implicitHit: 0.25, explicitHit: 0.17, explicitCreate: 2.5 },
  // Snapshot of qwen3.8-max (ask.ts lists it at the same input, output and cache-hit prices).
  'qwen3.8-max-0902': { in: 2, out: 6, implicitHit: 0.25, explicitHit: 0.17, explicitCreate: 2.5 },
  // Only the cache-hit price was given for flash; creation is assumed at 125% of input, as for max.
  'qwen3.8-flash': { in: 0.15, out: 0.47, implicitHit: 0.016, explicitHit: 0.016, explicitCreate: 0.1875 },
  // Fallback model. Its cache price was not researched, so hits are billed at the full input price (an overstatement).
  'qwen3.7-max': { in: 2.5, out: 7.5, implicitHit: 2.5, explicitHit: 2.5, explicitCreate: 3.125 },
  // ask.ts row (input, output, implicit hit). Explicit caching is not used with it: explicit hit = implicit hit, creation 125% of input.
  'qwen3.7-plus': { in: 0.4, out: 1.6, implicitHit: 0.08, explicitHit: 0.08, explicitCreate: 0.5 },
  // Claude backup (claude.ts), Anthropic first-party list prices from the claude-api skill (cached 2026-10-06). Mapped onto
  // these fields: implicitHit and explicitHit are the cache-read price, explicitCreate the 5-minute cache-write price.
  // claude-opus-5-5: $4 in, $20 out, cache reads $0.20, 5-minute writes $5.
  'claude-opus-5-5': { in: 4, out: 20, implicitHit: 0.2, explicitHit: 0.2, explicitCreate: 5 },
  // Targets of its server-side refusal fallback ("default" routes by refusal category; expect these two). Base prices
  // $5 / $25 from the same table; the cache rows use the standard multipliers (reads 0.1x, 5-minute writes 1.25x).
  'claude-opus-5': { in: 5, out: 25, implicitHit: 0.5, explicitHit: 0.5, explicitCreate: 6.25 },
  'claude-opus-4-8': { in: 5, out: 25, implicitHit: 0.5, explicitHit: 0.5, explicitCreate: 6.25 },
  // Eval judges (other model families), booked at UNKNOWN_PRICE in eval/results/ledger.jsonl.
  'kimi-k3': { in: 3, out: 15, implicitHit: 3, explicitHit: 3, explicitCreate: 3.75 },
  'deepseek-v4-pro': { in: 3, out: 15, implicitHit: 3, explicitHit: 3, explicitCreate: 3.75 },
  'glm-5.3': { in: 3, out: 15, implicitHit: 3, explicitHit: 3, explicitCreate: 3.75 },
};

/**
 * A Claude model the project can book: its id starts with claude- and is in the PRICES table. The Claude backup runs only
 * these (claude.ts claudeModelOf, scripts/preflight.ts): a model without a price would be booked at UNKNOWN_PRICE, below an
 * Opus-class call's real cost, and the daily Claude budget would not hold.
 */
export function isClaudeModelId(id: unknown): id is string {
  return typeof id === 'string' && id.startsWith('claude-') && Object.prototype.hasOwnProperty.call(PRICES, id);
}

/** Conservative price for models without a known price: no cache discount. */
export const UNKNOWN_PRICE: Price = { in: 3, out: 15, implicitHit: 3, explicitHit: 3, explicitCreate: 3.75 };

export function priceOf(model: string, table: Record<string, Price> = PRICES): Price {
  return Object.prototype.hasOwnProperty.call(table, model) ? table[model] : UNKNOWN_PRICE;
}

/** The usage fields the cost functions read (an OpenAI-compatible usage record; llm.ts Usage fits it). */
export interface UsageLike {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_creation?: Record<string, unknown>;
    cache_type?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export function creationTokens(u: UsageLike | null | undefined): number {
  const d = u && u.prompt_tokens_details;
  if (!d) return 0;
  if (typeof d.cache_creation_input_tokens === 'number') return d.cache_creation_input_tokens;
  if (d.cache_creation && typeof d.cache_creation === 'object') {
    return Object.values(d.cache_creation).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  }
  return 0;
}

export function cachedTokens(u: UsageLike | null | undefined): number {
  return (u && u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
}

/** List-price cost of one call: plain input, explicit-cache creation, cache reads (explicit or implicit) and output. */
export function costOf(model: string, u: UsageLike | null | undefined, table: Record<string, Price> = PRICES): number {
  if (!u) return 0;
  const p = priceOf(model, table);
  const prompt = u.prompt_tokens ?? 0;
  const cached = cachedTokens(u);
  const created = creationTokens(u);
  const d = u.prompt_tokens_details;
  const explicit = !!d && (d.cache_type === 'ephemeral' || created > 0);
  const plain = Math.max(0, prompt - cached - created);
  const hit = explicit ? p.explicitHit : p.implicitHit;
  return (plain * p.in + created * p.explicitCreate + cached * hit + (u.completion_tokens ?? 0) * p.out) / 1e6;
}

/** Upper-bound cost when a stream ended without a usage record: every prompt character as an uncached token. */
export function estimateCost(model: string, promptChars: number, outputChars: number, table: Record<string, Price> = PRICES): number {
  const p = priceOf(model, table);
  return ((promptChars / 3) * Math.max(p.in, p.explicitCreate) + (outputChars / 2) * p.out) / 1e6;
}
