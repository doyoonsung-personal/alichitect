import { validatePricingSession, type PricingRequest, type PricingSession } from '@ali/core/solution-pricing.ts';

export class PricingError extends Error {
  readonly code: string;
  constructor(code: string, message = '') {
    super(message);
    this.code = code;
  }
}

export async function requestPricing(request: PricingRequest, signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<PricingSession> {
  const response = await fetchImpl('/api/pricing', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request), signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.type === 'fatal') {
    const code = body?.code ?? body?.error;
    throw new PricingError(typeof code === 'string' ? code : `http-${response.status}`,
      typeof body?.message === 'string' ? body.message : '');
  }
  return validatePricingSession(body?.pricing);
}
