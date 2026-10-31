import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileStem, proposalFileName } from './filename.ts';

test('the file name follows <title>-architecture-proposal-<date>.pdf', () => {
  assert.equal(proposalFileName('Cross-border e-commerce', '2026-10-31'), 'Cross-border-e-commerce-architecture-proposal-2026-10-31.pdf');
});

test('characters Windows forbids never reach the name', () => {
  const name = proposalFileName('a<b>c:d"e/f\\g|h?i*j', '2026-10-31');
  assert.ok(!/[<>:"/\\|?*]/.test(name), name);
  assert.ok(!name.includes('\\'), 'the backslash is removed too');
  assert.ok(!/[\u0000-\u001f]/.test(name));
  assert.equal(fileStem('a\\b/c'), 'a-b-c');
});

test('Korean and Chinese titles stay readable', () => {
  assert.equal(fileStem('음식 배달 앱 백엔드'), '음식-배달-앱-백엔드');
  assert.equal(fileStem('跨境电商网站，需要高可用'), '跨境电商网站，需要高可用');
});

test('dots, spaces and dashes at the ends are trimmed, and an empty or reserved title falls back', () => {
  assert.equal(fileStem('  ..My design..  '), 'My-design');
  assert.equal(fileStem('???'), 'architecture');
  assert.equal(fileStem('CON'), 'architecture');
  assert.equal(fileStem(''), 'architecture');
});

test('long titles are cut on a character boundary, not inside a surrogate pair', () => {
  const long = '😀'.repeat(100);
  const stem = fileStem(long, 20);
  assert.equal(Array.from(stem).length, 20);
  assert.ok(!stem.includes('�'));
  assert.ok(fileStem('word '.repeat(40)).length <= 80);
});
