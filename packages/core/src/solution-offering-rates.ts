import type { InfrastructureRate } from './infrastructure-rates.ts';

/** Immutable USD rate snapshots. Keep an old ID for saved estimates when a plan changes. */
interface OfferingRate extends InfrastructureRate {
  product: string;
  minimumSeats?: number;
}
const checked = '2026-11-04';
const qoder = 'https://docs.qoder.com/account/enterprise/pricing';
const personal = 'https://www.alibabacloud.com/help/en/qwenwork/personal-benefits';
export const offeringRates: readonly OfferingRate[] = [
  { product: 'qoder-teams', id: 'qoder-teams-20261104', description: 'Qoder Teams direct purchase: minimum two seats. Each includes 3,000 credits per month; extra credits are separate.',
    unit: 'seat-month', minimumSeats: 2, unitUsd: 40, region: 'International', asOf: checked, source: qoder },
  { product: 'qoder-enterprise', id: 'qoder-enterprise-20261104', description: 'Qoder Enterprise direct purchase: minimum two seats. No usage credits included; shared credit packs are separate.',
    unit: 'seat-month', minimumSeats: 2, unitUsd: 20, region: 'International', asOf: checked, source: qoder },
  { product: 'qwenwork', id: 'qwenwork-personal-standard-20261104', description: 'QwenWork Personal Standard, monthly subscription per person; excludes annual discounts or add-ons.',
    unit: 'user-month', unitUsd: 20, region: 'International', asOf: checked, source: personal },
  { product: 'qwenwork', id: 'qwenwork-personal-pro-20261104', description: 'QwenWork Personal Pro, monthly subscription per person; excludes annual discounts or add-ons.',
    unit: 'user-month', unitUsd: 40, region: 'International', asOf: checked, source: personal },
  { product: 'qwenwork', id: 'qwenwork-enterprise-standard-20261104', description: 'QwenWork Enterprise Standard advertised seat fee including 2,000 credits per seat per month. Confirm billing commitment at checkout; extra credit packs are separate.',
    unit: 'seat-month', unitUsd: 30, region: 'International', asOf: checked,
    source: 'https://www.alibabacloud.com/en/product/qwenwork?_p_lc=1' },
  { product: 'ai-guardrails', id: 'guardrails-detection-20261104', description: 'AI Guardrails advanced text, sensitive content or prompt injection moderation, per detection call. Each enabled moderation type is billed separately.',
    unit: 'detection call', unitUsd: 6 / 10000, region: 'International', asOf: checked,
    source: 'https://www.alibabacloud.com/help/en/content-moderation/latest/billing-overview' },
];
