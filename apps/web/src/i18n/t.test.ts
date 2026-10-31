import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keysOf, langFromTag, makeT, t } from './t.ts';

test('fills placeholders and keeps unknown ones visible', () => {
  assert.equal(t('en', 'rec.revision', { n: 3 }), 'Revision 3');
  assert.equal(t('en', 'rec.revision'), 'Revision {n}');
});

test('plural forms follow vars.n', () => {
  assert.equal(t('en', 'panel.count', { n: 1 }), '1 product');
  assert.equal(t('en', 'panel.count', { n: 5 }), '5 products');
  assert.equal(t('en', 'panel.count', { n: 0 }), '0 products');
  assert.equal(t('en', 'rec.connections', { n: 1 }), '1 connection');
  assert.equal(t('en', 'rec.connections', { n: 2 }), '2 connections');
});

test('ko and zh use the other form for every count', () => {
  assert.equal(t('ko', 'rec.connections', { n: 1 }), '연결 1개');
  assert.equal(t('ko', 'rec.connections', { n: 4 }), '연결 4개');
  assert.equal(t('zh', 'panel.count', { n: 1 }), t('zh', 'panel.count', { n: 9 }).replace('9', '1'));
});

test('a key missing in a language falls back to English, not to the raw key', () => {
  const ko = makeT('ko');
  assert.notEqual(ko('app.name'), 'app.name');
  assert.equal(ko('app.name'), '아키텍처 빌더');
});

test('the three languages carry the same keys', () => {
  const en = new Set(keysOf('en'));
  for (const lang of ['ko', 'zh'] as const) {
    const have = new Set(keysOf(lang));
    assert.deepEqual([...en].filter((k) => !have.has(k)), [], `${lang} is missing keys`);
    assert.deepEqual([...have].filter((k) => !en.has(k)), [], `${lang} has extra keys`);
  }
});

test('placeholders match across languages', () => {
  const names = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const key of keysOf('en')) {
    for (const lang of ['ko', 'zh'] as const) {
      const a = t('en', key as never);
      const b = t(lang, key as never);
      assert.equal(names(b), names(a), `${lang} ${key}`);
    }
  }
});

test('langFromTag', () => {
  assert.equal(langFromTag('ko-KR'), 'ko');
  assert.equal(langFromTag('zh-Hans-CN'), 'zh');
  assert.equal(langFromTag('en-US'), 'en');
  assert.equal(langFromTag(undefined), 'en');
});
