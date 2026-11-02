import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasHiddenIdentity, identityBoundary, neutralIdentity } from '../src/identity-matcher.ts';

test('identity matches normalized names and versioned families, allowing ordinary words and exact products', () => {
  for (const text of ['Ｃｌａｕｄｅ', 'Claude Codebreaker', 'Anthropic', 'Opus 5.5', 'Sonnet-4', 'Haiku 4.5',
    'Anthropic Opus', 'Opus Anthropic', '클로드', '앤트로픽', '克劳德', '克勞德', 'クロード', 'アンソロピック', 'ソネット 4']) {
    assert.ok(hasHiddenIdentity(text), text);
    assert.ok(!hasHiddenIdentity(neutralIdentity(text)), text);
  }
  for (const text of ['magnum opus', 'a sonnet or a haiku poem', 'Claude Code', 'Claude-Code',
    'Anthropic-compatible API', 'Qwen3.7-plus', 'Plain ＵＴＦ text']) {
    assert.equal(hasHiddenIdentity(text), false, text);
    assert.equal(neutralIdentity(text), text);
  }
});

test('identity aliases reserve ids and cover references across continuation calls', () => {
  const clean = identityBoundary(['assistant-1']);
  const first: any = clean({ id: 'claude-opus-5-5', label: 'Claude drafts' });
  assert.equal(first.id, 'assistant-2');
  const refs: any = clean({ from: 'claude-opus-5-5', to: 'end', after: 'claude-opus-5-5', on: 'claude-opus-5-5',
    subject: 'claude-opus-5-5', repeat: 'claude-opus-5-5', into: 'claude-opus-5-5', attachTo: 'claude-opus-5-5' });
  for (const [key, value] of Object.entries(refs)) assert.equal(value, key === 'to' ? 'end' : first.id);
  assert.notEqual((clean({ id: 'claude-code-group' }) as any).id, 'claude-code-group');
});
