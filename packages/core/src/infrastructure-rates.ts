import snapshot from '../catalog/ecs-budget-rates.json' with { type: 'json' };
import { regionInfo, regionMentions } from './regions.ts';

/** Published reference rates for rough estimates. The unit, region and configuration are part of each rate. */
export interface InfrastructureRate {
  id: string;
  description: string;
  unit: string;
  unitUsd: number;
  source: string;
  asOf: string;
  region: string;
  retired?: true;
}

const checked = '2026-11-04';
const ecs = 'https://www.alibabacloud.com/en/product/ecs/pricing';
const oss = 'https://www.alibabacloud.com/en/product/oss/pricing?_p_lc=1';

// International ECS calculator snapshot, version 2.0.421. For Linux, I/O-optimized VPC instances the source
// instanceTypePrice_2.js fields [4], [5], [8][0], [8][1] are vCPUs, RAM, standard hour and standard month.
// diskPrice.js lists the hourly price for a 100 GiB ESSD data disk. Exclude discounts, images and egress.
const ecsRates: InfrastructureRate[] = [];
for (const [region, table] of Object.entries(snapshot.regions)) {
  const location = regionInfo(region)?.name ?? region;
  for (const [sku, [cpu, ram, hourly, monthly]] of Object.entries(table.linux)) {
    const key = region === 'ap-southeast-1' && sku === 'ecs.g7.large' ? 'sg-g7-large' : region + '-' + sku;
    const name = location + ' ' + sku + ' Linux (' + cpu + ' vCPU, ' + ram + ' GiB); compute only';
    ecsRates.push(
      { id: key + '-hour', region, description: name + ', standard pay-as-you-go.', unit: 'instance-hour', unitUsd: hourly, source: ecs, asOf: checked },
      { id: key + '-subscription', region, description: name + ', one-month subscription.', unit: 'instance-month', unitUsd: monthly, source: ecs, asOf: checked },
    );
  }
  for (const [level, hourly] of Object.entries(table.essd100GiBHourly)) {
    ecsRates.push({ id: region + '-essd-' + level, region, description: location + ' ESSD ' + level + ' data-disk capacity only, pay as you go (100 GiB reference).',
      unit: 'GiB-hour', unitUsd: hourly / 100, source: ecs, asOf: checked });
  }
}

// IDs are permanent snapshots because saved estimates reference them. To change a rate, retire the old
// row and add a new ID; decoding an old report must still yield the rate used when it was prepared.
export const infrastructureRates: readonly InfrastructureRate[] = [
  ...ecsRates,
  { id: 'sg-oss-lrs', region: 'ap-southeast-1', description: 'Singapore OSS Standard LRS storage in the paid tier above 5 GB. Use billable GB only; exclude requests and transfer.',
    unit: 'GB-month', unitUsd: 0.017, source: oss, asOf: checked },
  { id: 'sg-oss-zrs', region: 'ap-southeast-1', description: 'Singapore OSS Standard ZRS storage, all capacity. Requests and transfer billed separately.',
    unit: 'GB-month', unitUsd: 0.02, source: oss, asOf: checked },
  { id: 'seoul-oss-lrs', region: 'ap-northeast-2', description: 'Seoul OSS Standard LRS storage in the paid tier above 5 GB. Use billable GB only; exclude requests and transfer.',
    unit: 'GB-month', unitUsd: 0.016, source: oss, asOf: checked },
  { id: 'smc-tool', region: 'all', description: 'Server Migration Center service fee only. Source egress, intermediate instances, disks, snapshots and labor are separate.',
    unit: 'migration', unitUsd: 0, source: 'https://www.alibabacloud.com/help/en/smc/product-overview/pricing', asOf: checked },
];

/** Limit each model prompt to relevant region/SKU combinations. The full snapshot remains available for validation. */
export function infrastructureRatesForContext(text: string): InfrastructureRate[] {
  const lower = text.toLowerCase();
  const regionIds = new Set(regionMentions(text));
  const skus = new Set(Array.from(lower.matchAll(/\b(?:ecs\.)?([cgr]\d+[a-z]*\.(?:\d+xlarge|xlarge|large))\b/g), m => 'ecs.' + m[1]));
  return infrastructureRates.filter(rate => {
    if (rate.retired) return false;
    if (rate.region !== 'all' && !regionIds.has(rate.region)) return false;
    if (rate.source !== ecs) return true;
    const sku = rate.description.match(/\becs\.[\w.]+/)?.[0];
    if (!sku) return true; // disks in the candidate regions
    if (skus.size) return skus.has(sku);
    return /^ecs\.[cgr]7\.(large|xlarge|2xlarge)$/.test(sku);
  });
}
