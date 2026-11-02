import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from './workflow-strings.json' with { type: 'json' };
import { wt } from './workflow-strings.ts';
test('all three languages have identical keys and placeholders and real translations', () => {
  for (const lang of ['ko', 'zh'] as const) {
    assert.deepEqual(Object.keys(data[lang]), Object.keys(data.en));
    for (const key of Object.keys(data.en) as Array<keyof typeof data.en>) {
      assert.deepEqual(data[lang][key].match(/\{\w+\}/g), data.en[key].match(/\{\w+\}/g));
      assert.match(data[lang][key], lang === 'ko' ? /[가-힣]/ : /[一-鿿]/);
    }
    assert.ok(wt(lang, 'diagram.detail', { n: 2, total: 5 }).includes('2'));
  }
});
