// The judge's reply parser and prompt: tolerant of fences and prose around the JSON, strict about the rubric fields.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
import { JUDGE_SYSTEM, judgePrompt, parseJudge } from '../judge.ts';
import type { RunRecord } from '../records.ts';
import type { EvalCase } from '../lib.ts';

const GOOD = '{"completeness":5,"accuracy":4,"rationality":4,"readability":3,"signoff":"yes","reasons":["sound"],"defects":["label too long"]}';

describe('parseJudge', () => {
  test('plain JSON, fenced JSON and JSON surrounded by prose all parse', () => {
    for (const text of [GOOD, '```json\n' + GOOD + '\n```', 'Here is my verdict: ' + GOOD + ' Hope that helps.']) {
      const r = parseJudge(text);
      assert.equal(r.error, undefined);
      assert.deepEqual(r.scores && [r.scores.completeness, r.scores.accuracy, r.scores.rationality, r.scores.readability, r.scores.signoff], [5, 4, 4, 3, true]);
    }
  });

  test('braces and quotes inside strings do not end the object early', () => {
    const r = parseJudge('{"completeness":3,"accuracy":3,"rationality":3,"readability":3,"signoff":"no","reasons":["uses } and \\" in text {"],"defects":[]}');
    assert.equal(r.error, undefined);
    assert.equal(r.scores?.signoff, false);
    assert.equal(r.scores?.reasons[0], 'uses } and " in text {');
  });

  test('scores are clamped to 1-5, numeric strings accepted, booleans accepted for signoff', () => {
    const r = parseJudge('{"completeness":"7","accuracy":0,"rationality":4.6,"readability":2,"signoff":true}');
    assert.deepEqual(r.scores && [r.scores.completeness, r.scores.accuracy, r.scores.rationality, r.scores.readability, r.scores.signoff], [5, 1, 5, 2, true]);
  });

  test('missing scores, a bad signoff, truncated JSON and no JSON are errors', () => {
    assert.match(parseJudge('{"completeness":5,"signoff":"yes"}').error ?? '', /score/);
    assert.match(parseJudge('{"completeness":5,"accuracy":5,"rationality":5,"readability":5,"signoff":"maybe"}').error ?? '', /signoff/);
    assert.match(parseJudge('{"completeness":5,"accuracy":5,').error ?? '', /unterminated/);
    assert.match(parseJudge('I cannot judge this.').error ?? '', /no JSON/);
  });
});

describe('judgePrompt', () => {
  const catalog = loadCatalog();
  const c: EvalCase = { id: 'x', category: 'trap', title: 'Lingma', reference: 'Qoder Teams, no price.', turns: [{ ask: 'Set up Tongyi Lingma for 10 developers.' }] };
  const run = {
    id: 'x#1',
    case: 'x',
    run: 1,
    turns: [
      {
        index: 0,
        ask: c.turns[0].ask,
        says: ['Lingma is now Qoder.'],
        gaps: [],
        changes: '+rec:qoder-teams(primary)',
        requirements: ['10 developers'],
        graph: { groups: {}, nodes: {}, edges: {}, recs: [{ product: 'qoder-teams', fit: 'primary', why: 'Seats for engineering teams.' }] },
      },
    ],
  } as unknown as RunRecord;

  test('carries the conversation, reference, catalog facts and diagram, and hides nothing the judge needs', () => {
    const p = judgePrompt(c, run, null, catalog);
    for (const needle of ['CASE: Lingma', 'Set up Tongyi Lingma for 10 developers.', 'Qoder Teams, no price.', 'CATALOG FACTS', '- qoder-teams | Qoder Teams', 'recommendations:', 'BEFORE the last turn: empty diagram', 'Lingma is now Qoder.', '10 developers']) {
      assert.ok(p.includes(needle), needle);
    }
  });

  test('the system prompt names the rubric and the JSON shape, and the judge never sees assertion results', () => {
    for (const needle of ['completeness', 'accuracy', 'rationality', 'readability', 'signoff', 'overrides your memory']) assert.ok(JUDGE_SYSTEM.includes(needle), needle);
    assert.ok(!judgePrompt(c, run, null, catalog).toLowerCase().includes('assertion'));
  });
});
