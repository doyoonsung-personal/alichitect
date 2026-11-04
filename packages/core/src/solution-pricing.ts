import type { SessionMemory } from './types.ts';
import { prefixKey } from './prefix-key.ts';
import { infrastructureRates } from './infrastructure-rates.ts';
import { offeringRates } from './solution-offering-rates.ts';
import { normalizeWorkflowEstimateSettings } from './workflow-estimate-settings.ts';

export const PRICING_ASK_LIMIT = 2000;
export const PRICING_HISTORY_LIMIT = 32;
export interface PricingMessage { role: 'user' | 'assistant'; text: string }
export interface PricingItem {
  label: string;
  period: 'monthly' | 'one-time';
  quantity: number;
  quantityNote?: string;
  unit: string;
  unitUsd: number;
  amountUsd: number;
  basis: 'catalog' | 'user' | 'assumption';
  rateId?: string;
  source: string;
}
export interface SolutionEstimate {
  currency: 'USD';
  items: PricingItem[];
  monthlyUsd: number | null;
  oneTimeUsd: number | null;
  assumptions: string[];
  unknowns: string[];
}
export interface PricingSession {
  messages: PricingMessage[];
  estimate: SolutionEstimate;
  designKey: string;
  review?: { key: string; lang: PricingRequest['lang']; text: string };
}
export interface PricingRequest {
  sessionId: string;
  lang: 'en' | 'ko' | 'zh';
  memory: SessionMemory;
  ask: string;
  pricing?: PricingSession;
  intent?: 'review';
}

/** A review belongs to the exact facts and conversation that were reviewed, in the requested language. */
export function pricingReviewKey(pricing: PricingSession, lang: PricingRequest['lang']): string {
  return prefixKey('review1', JSON.stringify([pricing.designKey, pricing.estimate, pricing.messages, lang]));
}

/** Replaying a completed review should not reserve a model slot or spend a daily turn. */
export function cachedPricingReview(req: PricingRequest): PricingSession | undefined {
  const { pricing } = req;
  if (req.intent === 'review' && pricing?.review?.lang === req.lang && pricing.designKey === pricingDesignKey(req.memory) &&
      pricing.review.key === pricingReviewKey(pricing, req.lang)) return pricing;
}

/** Only inputs to the estimate affect this key, independent of map insertion order or canvas layout. */
export function pricingDesignKey(memory: SessionMemory): string {
  let usage = memory.estimate;
  if (usage) {
    try { usage = normalizeWorkflowEstimateSettings(usage, memory.workflow); }
    catch { /* A malformed saved override still gets a distinct key; the API will reject the request. */ }
  }
  const design = {
    graph: memory.graph, workflow: memory.workflow, settings: memory.workflowSettings, usage,
    requirements: memory.requirements, constraints: memory.constraints, assumptions: memory.assumptions,
    originalAsk: memory.turns.find(t => t.role === 'user')?.text,
    latestAsks: memory.turns.filter(t => t.role === 'user').slice(-12).map(t => t.text),
  };
  const stable = JSON.stringify(design, (_key, value: unknown) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  });
  return prefixKey('price1', stable);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid pricing record');
  return value as Record<string, unknown>;
}
function text(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2 * limit || Array.from(value).length > limit) {
    throw new Error('invalid pricing text');
  }
  return value.trim();
}
function list(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error('invalid pricing list');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12) throw new Error('invalid pricing number');
  return value;
}
const notes = (x: unknown): string[] => list(x, 24).map(item => text(item, 500));
const cents = (usd: number): number => Math.round((usd + Number.EPSILON) * 100);
const ratesById = new Map([...infrastructureRates, ...offeringRates].map(rate => [rate.id, rate]));
const seatMinimums = new Map(offeringRates.map(rate => [rate.id, rate.minimumSeats]));

function pricingItem(value: unknown): PricingItem {
  const row = record(value);
  const label = text(row.label, 180);
  const period = row.period;
  if (period !== 'monthly' && period !== 'one-time') throw new Error('invalid pricing period');
  let quantity = number(row.quantity);
  const basis = row.basis;
  if (basis !== 'catalog' && basis !== 'user' && basis !== 'assumption') throw new Error('invalid rate basis');
  let unitUsd: number, unit: string, source: string;
  let rateId: string | undefined;
  if (basis === 'catalog') {
    rateId = text(row.rateId, 100);
    const rate = ratesById.get(rateId);
    if (!rate) throw new Error('unknown catalog rate');
    unitUsd = rate.unitUsd;
    unit = rate.unit;
    source = `${rate.description} · ${rate.region} · ${rate.asOf} · ${rate.source}`;
    const minimum = seatMinimums.get(rateId);
    if (minimum && quantity > 0) quantity = Math.max(minimum, Math.ceil(quantity));
  } else {
    unitUsd = number(row.unitUsd);
    unit = text(row.unit, 100);
    source = text(row.source, 500);
  }
  const rounded = cents(quantity * unitUsd);
  if (!Number.isSafeInteger(rounded)) throw new Error('price exceeds supported range');
  const quantityNote = row.quantityNote == null || row.quantityNote === '' ? undefined : text(row.quantityNote, 300);
  return { label, period, quantity, ...(quantityNote ? { quantityNote } : {}), unit, unitUsd, amountUsd: rounded / 100,
    basis, ...(rateId ? { rateId } : {}), source };
}

/** Never trust line amounts, supplied catalog rates or period subtotals from a model, saved session or HTTP client. */
export function calculateSolutionEstimate(value: unknown): SolutionEstimate {
  const raw = record(value);
  if (raw.currency !== undefined && raw.currency !== 'USD') throw new Error('unsupported estimate currency');
  const items = list(raw.items, 40).map(pricingItem);
  function subtotal(period: PricingItem['period']): number | null {
    const selected = items.filter(item => item.period === period);
    if (!selected.length) return null;
    const total = selected.reduce((sum, item) => sum + cents(item.amountUsd), 0);
    if (!Number.isSafeInteger(total)) throw new Error('subtotal exceeds supported range');
    return total / 100;
  }
  return { currency: 'USD', items, monthlyUsd: subtotal('monthly'), oneTimeUsd: subtotal('one-time'),
    assumptions: notes(raw.assumptions), unknowns: notes(raw.unknowns) };
}

export function validatePricingSession(value: unknown): PricingSession {
  const raw = record(value);
  const designKey = text(raw.designKey, 40);
  if (!/^price1:[0-9a-f]{1,8}:\d{1,9}$/.test(designKey)) throw new Error('invalid pricing design key');
  const messages = list(raw.messages, PRICING_HISTORY_LIMIT).map((item): PricingMessage => {
    const { role, text: message } = record(item);
    if (role !== 'assistant' && role !== 'user') throw new Error('invalid pricing speaker');
    return { role, text: text(message, role === 'user' ? PRICING_ASK_LIMIT : 4000) };
  });
  const session: PricingSession = { messages, estimate: calculateSolutionEstimate(raw.estimate), designKey };
  if (raw.review != null) {
    const review = record(raw.review);
    if ((review.lang === 'en' || review.lang === 'ko' || review.lang === 'zh') && review.key === pricingReviewKey(session, review.lang)) {
      session.review = { lang: review.lang, key: review.key, text: text(review.text, 4000) };
    }
  }
  return session;
}
