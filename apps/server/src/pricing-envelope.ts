/** Keep the existing design body budget. Pricing adds up to 32 bounded chat messages plus 40 sourced line items. */
export const PRICING_ATTACHMENT_BYTES = 1536 * 1024;
type ReadResult = { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; code: 'bad-json' | 'body-too-large'; message: string };

/** Shared by local and hosted pricing/proposal handlers. All sizes are bytes, including non-ASCII JSON. */
export function decodeDesignBody(raw: Uint8Array, designLimit: number, pricingAllowed: boolean): ReadResult {
  const tooLarge = { ok: false, status: 413, code: 'body-too-large', message: 'Request is too large' } as const;
  if (raw.byteLength > designLimit + (pricingAllowed ? PRICING_ATTACHMENT_BYTES : 0)) return tooLarge;
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(raw)); }
  catch {
    return raw.byteLength > designLimit ? tooLarge : { ok: false, status: 400, code: 'bad-json', message: 'body is not valid JSON' };
  }
  if (raw.byteLength > designLimit) {
    if (!pricingAllowed || !body || typeof body !== 'object' || !Object.hasOwn(body, 'pricing')) return tooLarge;
    const { pricing, ...design } = body as Record<string, unknown>;
    const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;
    if (bytes(design) > designLimit || bytes(pricing) > PRICING_ATTACHMENT_BYTES) return tooLarge;
  }
  return { ok: true, body };
}
