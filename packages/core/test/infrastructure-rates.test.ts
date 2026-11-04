import assert from 'node:assert/strict';
import { test } from 'node:test';
import { infrastructureRatesForContext } from '../src/infrastructure-rates.ts';

test('regional ECS prices use the exact SKU and standard hourly rate', () => {
  const sg = infrastructureRatesForContext('Singapore ecs.g7.large');
  const kr = infrastructureRatesForContext('서울에서 ecs.g7.large 인스턴스 2대 사용');
  const hourly = (rows: typeof sg) => rows.filter(row => row.unit === 'instance-hour');
  assert.deepEqual(hourly(sg).map(row => [row.region, row.unitUsd]), [['ap-southeast-1', 0.108]]);
  assert.deepEqual(hourly(kr).map(row => [row.region, row.unitUsd]), [['ap-northeast-2', 0.106682]]);
  assert.ok(kr.every(row => row.region === 'all' || row.region === 'ap-northeast-2'));
});

test('an uncovered or unspecified region does not borrow a rate from Singapore', () => {
  for (const scope of ['台北 ECS', 'Our ECS region is undecided']) {
    assert.ok(infrastructureRatesForContext(scope).every(rate => rate.region === 'all'));
  }
});
