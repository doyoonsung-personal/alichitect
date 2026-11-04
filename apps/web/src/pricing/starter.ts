import { infrastructureRatesForContext, type InfrastructureRate } from '@ali/core/infrastructure-rates.ts';
import { offeringRates } from '@ali/core/solution-offering-rates.ts';
import { regionMentions } from '@ali/core/regions.ts';
import { calculateSolutionEstimate, pricingDesignKey, type PricingSession } from '@ali/core/solution-pricing.ts';
import type { SessionMemory } from '@ali/core/types.ts';
import { estimateWorkflow } from '@ali/core/workflow-estimate.ts';
import { catalog } from '../catalog/catalog.ts';
import { makeT, type Lang } from '../i18n/t.ts';
import { models } from '../workflow/models.ts';

function pricingScope(memory: SessionMemory): string {
  return JSON.stringify([memory.graph, memory.workflowSettings, memory.requirements, memory.constraints,
    memory.turns.filter(t => t.role === 'user').map(t => t.text)]);
}

function pricingProducts(memory: SessionMemory) {
  return new Set([...Object.values(memory.graph.nodes).map(n => n.product), ...memory.graph.recs.map(r => r.product),
    ...Object.values(memory.workflow?.nodes ?? {}).flatMap(n => [n.product, n.runs])]);
}

function ecsSkus(scope: string): Set<string> {
  return new Set(Array.from(scope.toLowerCase().matchAll(/\b(?:ecs\.([a-z0-9-]+\.[a-z0-9]+)|([cgr]\d+[a-z]*\.(?:\d+xlarge|xlarge|large)))\b/g),
    match => 'ecs.' + (match[1] ?? match[2])));
}

/** Unit prices are references until a billable quantity is known. Never infer a fleet size from diagram icons. */
export function openingRates(memory: SessionMemory): InfrastructureRate[] {
  const scope = pricingScope(memory);
  const products = pricingProducts(memory);
  const skus = ecsSkus(scope);
  const references = infrastructureRatesForContext(scope).filter(rate => {
    const sku = rate.description.match(/\becs\.[\w.]+/)?.[0];
    if (sku) return products.has('ecs') && skus.has(sku);
    if (rate.id === 'smc-tool') return products.has('smc');
    if (rate.id.includes('-oss-')) return products.has('oss') && /\bLRS\b|\bZRS\b/i.test(scope) &&
      scope.toLowerCase().includes(rate.id.endsWith('lrs') ? 'lrs' : 'zrs');
    return false;
  });
  return [...references, ...offeringRates.filter(rate => products.has(rate.product))];
}

/** A single published regional example helps a customer who hasn't chosen an instance type yet. */
export function regionalEcsExample(memory: SessionMemory): InfrastructureRate | undefined {
  if (!pricingProducts(memory).has('ecs')) return;
  const scope = pricingScope(memory);
  if (ecsSkus(scope).size || new Set(regionMentions(scope)).size !== 1) return;
  return infrastructureRatesForContext(scope).find(rate => rate.unit === 'instance-hour' && rate.description.includes(' ecs.g7.large '));
}

export function startPricing(memory: SessionMemory, lang: Lang): PricingSession {
  const t = makeT(lang);
  const products = pricingProducts(memory);
  const rates = openingRates(memory);
  const questions: string[] = [];
  const intros: string[] = [];
  if (memory.workflow && Object.keys(memory.workflow.nodes).length) {
    const usage = estimateWorkflow(memory.workflow, models, catalog, memory.estimate);
    if (usage.lines.length) intros.push(t('pricing.perRun', { rate: new Intl.NumberFormat(lang, { maximumSignificantDigits: 6 }).format(usage.typical.perRunUsd) }));
    questions.push(t(memory.estimate?.runsPerMonth === undefined ? 'pricing.askRuns' : 'pricing.askWorkflowScope'));
  }
  if (products.has('ecs')) {
    const scope = pricingScope(memory);
    const region = regionMentions(scope).length > 0;
    const sku = ecsSkus(scope).size > 0;
    questions.push(t(region && sku ? 'pricing.askHours' : region ? 'pricing.askSku' : sku ? 'pricing.askRegion' : 'pricing.askFleet'));
  }
  if (rates.some(r => r.unit === 'seat-month' || r.unit === 'user-month')) questions.push(t('pricing.askSeats'));
  if (products.has('oss')) questions.push(t('pricing.askStorage'));
  const brief = memory.turns.filter(t => t.role === 'user').map(t => t.text).join('\n');
  if (/migra|egress|이전|마이그레이션|迁移|迁出|搬迁/i.test(brief) || products.has('smc')) questions.push(t('pricing.askMigration'));
  if (!questions.length) questions.push(t('pricing.askScope'));
  const message = [...intros, ...questions.slice(0, 2)].join('\n\n');
  return { designKey: pricingDesignKey(memory), messages: [{ role: 'assistant', text: message }],
    estimate: calculateSolutionEstimate({ items: [], assumptions: [], unknowns: [] }) };
}
