import { pricingDesignKey } from '@ali/core/solution-pricing.ts';
import type { SessionRecord } from '../../store/types.ts';
import type { BusinessCaseDocument, BusinessCaseSource } from '../../../../../packages/business-case/src/types.ts';

const clipped = (text: string, limit: number): string => {
  let result = '';
  for (const char of text) { if (result.length + char.length > limit) break; result += char; }
  return result;
};
async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Capture committed host facts only. No business-case data is ever written back to SessionRecord. */
export async function captureSource(session: SessionRecord, now = Date.now()): Promise<BusinessCaseSource> {
  const { memory, pricing } = session;
  const designKey = pricingDesignKey(memory);
  const estimateStatus = !pricing ? 'missing' : pricing.designKey === designKey ? 'current' : 'stale';
  const userAsks = memory.turns.filter(turn => turn.role === 'user').map(turn => turn.text);
  const context = [userAsks[0], userAsks.length > 1 ? userAsks.at(-1) : undefined,
    ...memory.requirements.slice(0, 8),
    ...Object.values(memory.graph.nodes).slice(0, 20).map(node => `${node.label} (${node.product})`),
    ...Object.values(memory.workflow?.nodes ?? {}).slice(0, 20).map(node => node.label)]
    .filter((value): value is string => !!value).join('\n');
  const [designFingerprint, estimateFingerprint] = await Promise.all([
    fingerprint(designKey), fingerprint(pricing ? { designKey: pricing.designKey, estimate: pricing.estimate } : null),
  ]);
  return {
    sessionId: session.id, title: clipped(session.title, 180) || 'Business case', capturedAt: now,
    designFingerprint, estimateFingerprint, estimateStatus,
    monthlyUsd: estimateStatus === 'current' ? pricing!.estimate.monthlyUsd : null,
    oneTimeUsd: estimateStatus === 'current' ? pricing!.estimate.oneTimeUsd : null,
    context: clipped(context, 4000),
    caveats: [...(pricing?.estimate.unknowns ?? []), ...(pricing?.estimate.assumptions ?? [])]
      .slice(0, 20).map(value => clipped(value, 500)),
  };
}

export function sourceChanged(saved: BusinessCaseSource, current: BusinessCaseSource): boolean {
  return saved.sessionId !== current.sessionId || saved.designFingerprint !== current.designFingerprint ||
    saved.estimateFingerprint !== current.estimateFingerprint;
}

/** Explicit refresh preserves the customer's hypotheses, including deliberate cost overrides. */
export function refreshSource(document: BusinessCaseDocument, source: BusinessCaseSource): BusinessCaseDocument {
  if (document.source.sessionId !== source.sessionId) throw new Error('session-mismatch');
  return { ...structuredClone(document), source: structuredClone(source) };
}
