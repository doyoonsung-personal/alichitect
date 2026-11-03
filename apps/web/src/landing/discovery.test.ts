import assert from 'node:assert/strict';
import test from 'node:test';
import { LANGS } from '../i18n/t.ts';
import { buildDiscoveryBrief, discoveryQuestion } from './discovery.ts';
import type { DiscoveryAnswer } from './discovery.ts';

const choose = (id: string): DiscoveryAnswer => ({ kind: 'choice', id });
const write = (text: string): DiscoveryAnswer => ({ kind: 'text', text });

test('the bottleneck changes the recommended support workflow', () => {
  const work = choose('support');
  const followUp = discoveryQuestion('en', work);
  assert.deepEqual(followUp.choices.map(({ id }) => id), ['find', 'draft', 'approve']);
  assert.match(buildDiscoveryBrief('en', work, choose('find')), /relevant passage/);
  assert.match(buildDiscoveryBrief('en', work, choose('draft')), /drafts a reply/);
  assert.match(buildDiscoveryBrief('en', work, choose('approve')), /request for changes/);
});

test('recognized free-text topics get relevant questions and keep the prospect’s own details', () => {
  for (const [lang, text] of [
    ['en', 'Our team spends too long on customer emails written in two languages.'],
    ['ko', '고객 문의 중 일본어 문의는 처리 시간이 길어요.'],
    ['zh', '我们处理客户邮件很慢，尤其是日语邮件。'],
  ] as const) {
    const first = write(text);
    assert.deepEqual(discoveryQuestion(lang, first), discoveryQuestion(lang, choose('support')));
    assert.ok(buildDiscoveryBrief(lang, first, choose('find')).includes(text));
  }
});

test('unfamiliar or mixed topics keep an open question and a usable brief', () => {
  for (const work of ['Auditing orchid greenhouse records', 'Customer emails about invoices']) {
    const first = write(work);
    const followUp = discoveryQuestion('en', first);
    assert.deepEqual(followUp.choices.map(({ id }) => id), ['gather', 'prepare', 'handover']);
    const brief = buildDiscoveryBrief('en', first, choose('prepare'));
    assert.ok(brief.includes(work));
    assert.match(brief, /prepare a first draft/);
  }
});

test('changing language translates choices and instructions, but preserves free-form answers', () => {
  const focus = 'matching 案件番号 to the original 担当者';
  for (const lang of LANGS) {
    const selectedWork = discoveryQuestion(lang).choices.find(({ id }) => id === 'documents')!;
    const brief = buildDiscoveryBrief(lang, choose(selectedWork.id), write(focus));
    assert.ok(brief.includes(selectedWork.label));
    assert.ok(brief.includes(focus));
    const first = write('{focus}\nE-mails for $& repairs');
    const both = buildDiscoveryBrief(lang, first, write(focus));
    assert.ok(both.includes('{focus}\nE-mails for $& repairs'));
    assert.ok(both.includes(focus));
  }
});

test('empty answers, a stale branch selection and unknown IDs cannot produce a brief', () => {
  for (const [first, second] of [
    [write(' '), choose('gather')], [choose('support'), write('\n ')],
    [choose('documents'), choose('find')], [choose('missing'), write('Help with this')],
  ]) {
    assert.equal(buildDiscoveryBrief('en', first, second), '');
  }
});
