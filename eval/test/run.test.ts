// Case selection (prefixes, categories, languages, failing-from / passing-from) and the before/after comparison.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { selectCases } from '../run.ts';
import { compare, renderComparison } from '../compare.ts';
import type { EvalCase } from '../lib.ts';
import type { RunRecord } from '../records.ts';

const c = (id: string, category: EvalCase['category'], lang?: EvalCase['lang']): EvalCase => ({ id, category, lang, title: id, reference: 'r', turns: [{ ask: 'x' }] });
const ALL = [c('pat-01', 'pattern'), c('pat-02', 'pattern'), c('trap-01', 'trap'), c('ko-trap-01', 'i18n', 'ko'), c('zh-trap-01', 'i18n', 'zh')];

const run = (caseId: string, n: number, pass: boolean, extra: Partial<RunRecord['turns'][number]['stats']> = {}): RunRecord =>
  ({
    id: `${caseId}#${n}`,
    case: caseId,
    run: n,
    pass,
    turns: [{ index: 0, assertions: [{ type: 'include', name: 'include x', pass }], stats: { warningsBefore: [], costUsd: 0.01, ...extra } }],
  }) as unknown as RunRecord;

function dirWith(records: RunRecord[]): string {
  const d = mkdtempSync(path.join(tmpdir(), 'eval-run-test-'));
  writeFileSync(path.join(d, 'runs.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return d;
}

describe('selectCases', () => {
  test('ids match exactly or by prefix; category and language filter', () => {
    assert.deepEqual(selectCases(ALL, { cases: 'pat-' }).map((x) => x.id), ['pat-01', 'pat-02']);
    assert.deepEqual(selectCases(ALL, { cases: 'trap-01,pat-02' }).map((x) => x.id), ['pat-02', 'trap-01']);
    assert.deepEqual(selectCases(ALL, { category: 'i18n' }).map((x) => x.id), ['ko-trap-01', 'zh-trap-01']);
    assert.deepEqual(selectCases(ALL, { lang: 'ko' }).map((x) => x.id), ['ko-trap-01']);
    assert.deepEqual(selectCases(ALL, { lang: 'en' }).map((x) => x.id), ['pat-01', 'pat-02', 'trap-01']);
    assert.equal(selectCases(ALL, {}).length, 5);
  });

  test('failing-from keeps cases with any failing run, passing-from the rest; cases never run are in neither', () => {
    const d = dirWith([run('pat-01', 1, true), run('pat-01', 2, true), run('pat-02', 1, true), run('pat-02', 2, false), run('trap-01', 1, false)]);
    assert.deepEqual(selectCases(ALL, { 'failing-from': d }).map((x) => x.id), ['pat-02', 'trap-01']);
    assert.deepEqual(selectCases(ALL, { 'passing-from': d }).map((x) => x.id), ['pat-01']);
    assert.deepEqual(selectCases(ALL, { 'failing-from': d, cases: 'trap' }).map((x) => x.id), ['trap-01']);
  });
});

describe('compare', () => {
  test('only the shared cases count; pass counts, majority and warnings per turn are compared', () => {
    const before = [run('a', 1, false), run('a', 2, false), run('a', 3, true), run('b', 1, true), run('z', 1, false)];
    const after = [run('a', 1, true), run('a', 2, true), run('a', 3, true), run('b', 1, false)];
    const cmp = compare(before, after);
    assert.deepEqual(cmp.cases.map((x) => [x.id, x.before, x.after]), [['a', '1/3', '3/3'], ['b', '1/1', '0/1']]);
    assert.equal(cmp.before.runs, 4);
    assert.equal(cmp.before.runPass, 2);
    assert.equal(cmp.after.runPass, 3);
    assert.equal(cmp.before.casesMajority, 1);
    assert.equal(cmp.after.casesMajority, 1);
    // pass@1 is the mean of per-case pass rates: before (1/3 + 1/1) / 2, after (3/3 + 0/1) / 2
    assert.equal(cmp.before.casePassRate, 0.667);
    assert.equal(cmp.after.casePassRate, 0.5);
    assert.equal(cmp.before.casesAllRuns, 1);
    assert.equal(cmp.after.casesAllRuns, 1);
    assert.deepEqual(cmp.cases[1].afterFailed, ['include: include x']);
    const md = renderComparison(cmp);
    assert.match(md, /conversations passing every assertion \| 2\/4 \(50%\) \| 3\/4 \(75%\)/);
    assert.match(md, /\| a \| 1\/3 \| 3\/3 \|/);
    assert.deepEqual(cmp.onlyBefore, ['z']);
    assert.deepEqual(cmp.onlyAfter, []);
  });

  test('a case that exists only in the after directory (a new case) is left out of both sides', () => {
    const before = [run('a', 1, true), run('a', 2, false)];
    const after = [run('a', 1, true), run('a', 2, true), run('new', 1, false), run('new', 2, false)];
    const cmp = compare(before, after);
    assert.deepEqual(cmp.cases.map((x) => x.id), ['a']);
    assert.equal(cmp.after.runs, 2);
    assert.equal(cmp.after.casePassRate, 1);
    assert.equal(cmp.after.casesAllRuns, 1);
    assert.deepEqual(cmp.onlyAfter, ['new']);
    assert.match(renderComparison(cmp), /only in the after directory \(1\): new/);
  });

  test('pre-repair warnings count warn and error only, per turn', () => {
    const w = (code: string, severity: string) => ({ code, severity, ids: [], msg: '', repaired: false });
    const before = [run('a', 1, false, { warningsBefore: [w('orphan-node', 'warn'), w('orphan-node', 'info'), w('path-order', 'error')] as never })];
    const after = [run('a', 1, true)];
    const cmp = compare(before, after);
    assert.deepEqual(cmp.before.warningsPerTurn, { 'orphan-node': 1, 'path-order': 1 });
    assert.deepEqual(cmp.after.warningsPerTurn, {});
  });
});
