import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FontSet } from './fonts.ts';
import { breakTokens, Typesetter } from './typeset.ts';

const CJK = /[　-鿿가-힯＀-￯]/u;
/** Latin 0.5 em, CJK 1 em: enough to test where lines break. */
const fonts = {
  width: (text: string, px: number) => Array.from(text).reduce((w, ch) => w + (CJK.test(ch) ? px : px * 0.5), 0),
  runs: (text: string) => [{ text, face: 'f', width: 0 }],
  metrics: () => ({ ascent: 1, descent: 0.25, cap: 0.7 }),
} as unknown as FontSet;
const ts = new Typesetter(null as never, fonts);

test('Latin text breaks at spaces and keeps the space with the word before it', () => {
  assert.deepEqual(breakTokens('Managed Redis cache'), ['Managed ', 'Redis ', 'cache']);
});

test('Han text may break between any two characters, Korean only at spaces', () => {
  assert.deepEqual(breakTokens('数据库服务'), ['数', '据', '库', '服', '务']);
  assert.deepEqual(breakTokens('데이터베이스 서비스'), ['데이터베이스 ', '서비스']);
  assert.deepEqual(breakTokens('用 AWS服务'), ['用 ', 'AWS', '服', '务']);
});

test('closing punctuation never starts a line and opening brackets never end one', () => {
  const t = breakTokens('通过API网关，暴露（REST）接口。');
  for (const tok of t) assert.ok(!/^[，。）]/u.test(tok), `token starts with a closer: ${tok}`);
  const lines = ts.wrap('通过API网关，暴露（REST）接口。', 12 * 6, 12, 400);
  for (const l of lines) {
    assert.ok(!/^[，。）、；：！？]/u.test(l), `a line starts with closing punctuation: ${l}`);
    assert.ok(!/[（「]$/u.test(l), `a line ends with an opening bracket: ${l}`);
  }
  assert.equal(lines.join(''), '通过API网关，暴露（REST）接口。');
});

test('a hyphen breaks after a letter, but not inside a date or a part number', () => {
  assert.deepEqual(breakTokens('cross-border'), ['cross-', 'border']);
  assert.deepEqual(breakTokens('as of 2026-10-31'), ['as ', 'of ', '2026-10-31']);
  assert.deepEqual(breakTokens('S3-compatible'), ['S3-compatible']);
});

test('wrap fills lines to the width and trims the space at each end', () => {
  const lines = ts.wrap('one two three four five six', 10 * 6, 10, 400); // 12 characters of 5 px
  assert.deepEqual(lines, ['one two', 'three four', 'five six']);
  for (const l of lines) assert.equal(l, l.trim());
});

test('a link longer than a line wraps after slashes, then by characters, and loses nothing', () => {
  const url = 'www.alibabacloud.com/product/object-storage-service/documentation/getting-started';
  const lines = ts.wrap(url, 40 * 5, 10, 400);
  assert.ok(lines.length >= 2);
  assert.equal(lines.join(''), url);
  for (const l of lines) assert.ok(fonts.width(l, 10, 400) <= 40 * 5 + 0.01, l);
  const giant = ts.wrap('x'.repeat(100), 20 * 5, 10, 400);
  assert.equal(giant.join(''), 'x'.repeat(100));
  assert.ok(giant.every((l) => l.length <= 20));
});

test('newlines are kept as line breaks, and empty input makes no lines', () => {
  assert.deepEqual(ts.wrap('first\nsecond', 500, 10, 400), ['first', 'second']);
  assert.deepEqual(ts.paragraph('   ', 100, 10, 400, 14).lines, []);
  assert.equal(ts.paragraph('a b', 100, 10, 400, 14).height, 14);
});

test('clip adds an ellipsis only when the text does not fit', () => {
  assert.equal(ts.clip('short', 100, 10, 400), 'short');
  const c = ts.clip('a very long product title indeed', 60, 10, 400);
  assert.ok(c.endsWith('…') && fonts.width(c, 10, 400) <= 60.01, c);
});
