// The module table must stay parallel across EN/KO/ZH (same discipline as
// export/workflow-strings.test.ts): identical key sets, real translations in the target
// script, matching {placeholder} sets and no empty values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from './strings.json' with { type: 'json' };
import { bt, bdbKeys, makeBT } from './strings.ts';

test('all three languages have identical keys, placeholders and real translations', () => {
  for (const lang of ['ko', 'zh'] as const) {
    assert.deepEqual(Object.keys(data[lang]), Object.keys(data.en));
    for (const key of Object.keys(data.en) as Array<keyof typeof data.en>) {
      const value = data[lang][key];
      assert.ok(value.trim().length > 0, `${lang}/${key} is empty`);
      assert.deepEqual(value.match(/\{\w+\}/g), data.en[key].match(/\{\w+\}/g), `${lang}/${key} placeholder mismatch`);
      assert.match(value, lang === 'ko' ? /[가-힣]/ : /[一-鿿]/, `${lang}/${key} is not translated`);
    }
  }
});

test('every key is namespaced under bdb. and the helper table stays in sync', () => {
  for (const key of Object.keys(data.en)) assert.ok(key.startsWith('bdb.'), key);
  assert.deepEqual(bdbKeys('ko'), Object.keys(data.en));
  assert.deepEqual(bdbKeys('zh'), Object.keys(data.en));
});

test('bt substitutes vars, falls back to EN and then to the key itself', () => {
  assert.equal(bt('en', 'bdb.brief.version', { version: 3 }), 'Version 3');
  assert.ok(bt('ko', 'bdb.conflict.body', { version: 4 }).includes('4'));
  assert.ok(bt('zh', 'bdb.brief.moreQuestions', { n: 5 }).includes('5'));
  // an unknown var placeholder survives verbatim; a missing template falls back to EN, then the key
  assert.equal(bt('en', 'bdb.brief.version', {}), 'Version {version}');
  assert.equal(bt('ko', 'no.such.key' as never), 'no.such.key');
  const ko = makeBT('ko');
  assert.equal(ko('bdb.entry.trigger'), data.ko['bdb.entry.trigger']);
});
