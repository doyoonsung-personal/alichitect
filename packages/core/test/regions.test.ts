// Region table (src/regions.ts): the prompt's REGIONS list, aliases in English, Korean and Chinese, and mention finding.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_REGION, REGIONS, REGION_TABLE, findRegionMentions, isOpenRegion, regionLabel, regionMentions, resolveRegion, resolveRegions } from '../src/regions.ts';
import { REGIONS as PROMPT_REGIONS } from '../src/prompt.ts';

test('REGIONS keeps the prompt.ts shape and rows; every open table row is in it and the default is open', () => {
  assert.deepEqual(REGIONS, PROMPT_REGIONS);
  const open = REGION_TABLE.filter((r) => r.status === 'open').map((r) => [r.name, r.id]);
  assert.deepEqual(open, REGIONS.map(([name, id]) => [name, id]));
  assert.ok(isOpenRegion(DEFAULT_REGION));
  assert.equal(new Set(REGION_TABLE.map((r) => r.id)).size, REGION_TABLE.length, 'unique ids');
});

test('resolveRegion: ids, names and aliases in English, Korean and Chinese; ambiguous names give null', () => {
  const cases: Array<[string, string | null]> = [
    ['ap-southeast-1', 'ap-southeast-1'],
    ['Singapore', 'ap-southeast-1'],
    ['singapore', 'ap-southeast-1'],
    ['sg', 'ap-southeast-1'],
    ['싱가포르', 'ap-southeast-1'],
    ['新加坡', 'ap-southeast-1'],
    ['Singapore (ap-southeast-1)', 'ap-southeast-1'],
    ['쿠알라룸푸르', 'ap-southeast-3'],
    ['吉隆坡', 'ap-southeast-3'],
    ['Johor', 'ap-southeast-8'],
    ['柔佛', 'ap-southeast-8'],
    ['Jakarta', 'ap-southeast-5'],
    ['Indonesia', 'ap-southeast-5'],
    ['인도네시아', 'ap-southeast-5'],
    ['Japan', 'ap-northeast-1'],
    ['東京', 'ap-northeast-1'],
    ['서울', 'ap-northeast-2'],
    ['首爾', 'ap-northeast-2'],
    ['Hong Kong', 'cn-hongkong'],
    ['中国香港', 'cn-hongkong'],
    ['São Paulo', 'sa-east-1'],
    ['Frankfurt', 'eu-central-1'],
    ['Sydney', 'ap-southeast-2'],
    ['Malaysia', null],
    ['US', null],
    ['Atlantis', null],
    ['', null],
  ];
  for (const [q, want] of cases) assert.equal(resolveRegion(q), want, q);
  assert.equal(resolveRegion(42), null);
  assert.deepEqual(resolveRegions('Malaysia'), ['ap-southeast-3', 'ap-southeast-8']);
  assert.deepEqual(resolveRegions('미국'), ['us-east-1', 'us-west-1']);
  assert.equal(isOpenRegion('ap-southeast-2'), false, 'Sydney is closed');
  assert.equal(isOpenRegion('cn-hangzhou'), false, 'mainland China');
  assert.equal(regionLabel('ap-southeast-5'), 'Jakarta (ap-southeast-5)');
});

test('regionMentions: whole words for Latin names, substrings for CJK, the longest match wins, language names are not places', () => {
  assert.deepEqual(regionMentions('Replicate to Kuala Lumpur and Tokyo, not Singapore.'), ['ap-southeast-3', 'ap-northeast-1', 'ap-southeast-1']);
  assert.deepEqual(regionMentions('Parisian cafes and Londoners'), [], 'whole words only');
  assert.deepEqual(regionMentions('send it to us'), [], 'the pronoun is not the US');
  assert.deepEqual(regionMentions('US users'), ['us-east-1', 'us-west-1']);
  assert.deepEqual(regionMentions('인도네시아 사용자'), ['ap-southeast-5'], '인도네시아 is not 인도 (India)');
  assert.deepEqual(regionMentions('印度尼西亚和印度'), ['ap-southeast-5', 'ap-south-1']);
  assert.deepEqual(regionMentions('한국어로 답변합니다'), [], 'the Korean language is not Seoul');
  assert.deepEqual(regionMentions('Johor Bahru'), ['ap-southeast-8']);
  assert.deepEqual(regionMentions('ap-northeast-2 and cn-hongkong'), ['ap-northeast-2', 'cn-hongkong']);
  assert.deepEqual(regionMentions('데이터는 서울 리전에만 저장합니다'), ['ap-northeast-2']);
  const m = findRegionMentions('Malaysia, then 吉隆坡');
  assert.deepEqual(m.map((x) => [x.kind, x.ids.length]), [['country', 2], ['city', 1]]);
});
