import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SessionMemory } from '@ali/core/types.ts';
import { makeT, type Lang } from '../i18n/t.ts';
import { openingRates, regionalEcsExample, startPricing } from './starter.ts';

function design(brief: string): SessionMemory {
  return { graph: { nodes: { web: { id: 'web', group: null, label: 'Web servers', product: 'ecs' } }, groups: {}, edges: {}, recs: [] },
    turns: [{ role: 'user', text: brief }], requirements: [], tombstones: [] };
}

test('the opening shows only exact price references and keeps unknown quantities unpriced', () => {
  const memory = design('Singapore ecs.g7.large');
  assert.deepEqual(openingRates(memory).map(rate => rate.id), ['sg-g7-large-hour', 'sg-g7-large-subscription']);
  assert.equal(startPricing(memory, 'en').estimate.monthlyUsd, null);
  for (const brief of ['Singapore', 'ecs.g7.large', 'Singapore ecs.foo9.large']) assert.deepEqual(openingRates(design(brief)), []);
  assert.equal(regionalEcsExample(design('Singapore'))?.id, 'sg-g7-large-hour');
  for (const brief of ['Singapore or Seoul', 'ecs.g7.large', 'Singapore ecs.foo9.large', 'No region chosen']) {
    assert.equal(regionalEcsExample(design(brief)), undefined);
  }
});

test('opening questions use the known region or configuration in each language', () => {
  for (const lang of ['en', 'ko', 'zh'] as Lang[]) {
    const t = makeT(lang);
    assert.equal(startPricing(design('Singapore'), lang).messages[0].text, t('pricing.askSku'));
    assert.equal(startPricing(design('ecs.g7.large'), lang).messages[0].text, t('pricing.askRegion'));
    assert.equal(startPricing(design('Singapore ecs.g7.large'), lang).messages[0].text, t('pricing.askHours'));
    assert.equal(startPricing(design('Qwen3.8'), lang).messages[0].text, t('pricing.askFleet'));
  }
});
