// Before/after comparison of two results directories on the cases they share (the cases re-run after a fix).
//   node eval/compare.ts <before dir> <after dir> [--json]
// Per case: runs passed before and after. Overall, on the shared cases: pass@1 and all-runs first, then majority, pass@N,
// conversation and assertion pass rates, pre-repair warnings per turn by code, and the assertion failures that
// disappeared or appeared.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { RunRecord } from './records.ts';

function load(dir: string): RunRecord[] {
  const f = path.join(path.resolve(dir), 'runs.jsonl');
  if (!existsSync(f)) throw new Error(`no runs.jsonl in ${dir}`);
  return readFileSync(f, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as RunRecord);
}

const by = <T>(xs: T[], key: (x: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return m;
};
const pc = (a: number, b: number): string => (b ? `${Math.round((100 * a) / b)}%` : '-');

export interface Agg {
  runs: number;
  runPass: number;
  /** pass@1: mean over cases of the share of runs that passed. */
  casePassRate: number;
  casesAllRuns: number;
  casesPassAtN: number;
  casesMajority: number;
  assertions: number;
  assertionsPassed: number;
  warningsPerTurn: Record<string, number>;
  turns: number;
  costPerTurn: number;
}

export interface Comparison {
  cases: Array<{ id: string; before: string; after: string; beforeFailed: string[]; afterFailed: string[] }>;
  before: Agg;
  after: Agg;
  onlyBefore: string[]; // cases with runs only in the before directory (not compared)
  onlyAfter: string[]; // cases with runs only in the after directory, for example new cases (not compared)
}

function agg(rs: RunRecord[]): Agg {
  const turns = rs.flatMap((r) => r.turns);
  const asserts = turns.flatMap((t) => t.assertions);
  const perCase = [...by(rs, (r) => r.case).values()];
  const warn: Record<string, number> = {};
  for (const t of turns) for (const w of t.stats.warningsBefore ?? []) if (w.severity !== 'info') warn[w.code] = (warn[w.code] ?? 0) + 1;
  for (const k of Object.keys(warn)) warn[k] = Math.round((warn[k] / Math.max(1, turns.length)) * 1000) / 1000;
  return {
    runs: rs.length,
    runPass: rs.filter((r) => r.pass).length,
    casePassRate: perCase.length ? Math.round((perCase.reduce((s, c) => s + c.filter((r) => r.pass).length / c.length, 0) / perCase.length) * 1000) / 1000 : 0,
    casesAllRuns: perCase.filter((c) => c.every((r) => r.pass)).length,
    casesPassAtN: perCase.filter((c) => c.some((r) => r.pass)).length,
    casesMajority: perCase.filter((c) => c.filter((r) => r.pass).length * 2 > c.length).length,
    assertions: asserts.length,
    assertionsPassed: asserts.filter((a) => a.pass).length,
    warningsPerTurn: warn,
    turns: turns.length,
    costPerTurn: Math.round((turns.reduce((s, t) => s + (t.stats.costUsd ?? 0), 0) / Math.max(1, turns.length)) * 10000) / 10000,
  };
}

export function compare(before: RunRecord[], after: RunRecord[]): Comparison {
  // Shared cases only: a case that exists on one side (a new case, or one not re-run after a fix) is left out of both
  // aggregates and listed in onlyBefore / onlyAfter.
  const inBefore = new Set(before.map((r) => r.case));
  const inAfter = new Set(after.map((r) => r.case));
  const ids = new Set([...inAfter].filter((id) => inBefore.has(id)));
  const b = before.filter((r) => ids.has(r.case));
  const a = after.filter((r) => ids.has(r.case));
  const bc = by(b, (r) => r.case);
  const ac = by(a, (r) => r.case);
  const failedOf = (rs: RunRecord[]): string[] => [...new Set(rs.flatMap((r) => r.turns.flatMap((t) => t.assertions.filter((a) => !a.pass).map((a) => `${a.type}: ${a.name.slice(0, 60)}`))))];
  const cases = [...ids].sort().map((id) => ({
    id,
    before: `${(bc.get(id) ?? []).filter((r) => r.pass).length}/${(bc.get(id) ?? []).length}`,
    after: `${(ac.get(id) ?? []).filter((r) => r.pass).length}/${(ac.get(id) ?? []).length}`,
    beforeFailed: failedOf(bc.get(id) ?? []),
    afterFailed: failedOf(ac.get(id) ?? []),
  }));
  return {
    cases,
    before: agg(b),
    after: agg(a),
    onlyBefore: [...inBefore].filter((id) => !inAfter.has(id)).sort(),
    onlyAfter: [...inAfter].filter((id) => !inBefore.has(id)).sort(),
  };
}

export function renderComparison(c: Comparison): string {
  const out: string[] = [];
  const rows = (k: 'before' | 'after'): string => `${c[k].runPass}/${c[k].runs} (${pc(c[k].runPass, c[k].runs)})`;
  out.push('| measure (shared cases) | before | after |', '| --- | ---: | ---: |');
  out.push(`| pass@1 (mean case pass rate) | ${Math.round(c.before.casePassRate * 1000) / 10}% | ${Math.round(c.after.casePassRate * 1000) / 10}% |`);
  out.push(`| cases with every run passing | ${c.before.casesAllRuns}/${c.cases.length} (${pc(c.before.casesAllRuns, c.cases.length)}) | ${c.after.casesAllRuns}/${c.cases.length} (${pc(c.after.casesAllRuns, c.cases.length)}) |`);
  out.push(`| cases with a majority of runs passing | ${c.before.casesMajority}/${c.cases.length} | ${c.after.casesMajority}/${c.cases.length} |`);
  out.push(`| cases with some run passing | ${c.before.casesPassAtN}/${c.cases.length} | ${c.after.casesPassAtN}/${c.cases.length} |`);
  out.push(`| conversations passing every assertion | ${rows('before')} | ${rows('after')} |`);
  out.push(`| assertions passing | ${pc(c.before.assertionsPassed, c.before.assertions)} (${c.before.assertionsPassed}/${c.before.assertions}) | ${pc(c.after.assertionsPassed, c.after.assertions)} (${c.after.assertionsPassed}/${c.after.assertions}) |`);
  out.push(`| list-price cost per turn | $${c.before.costPerTurn} | $${c.after.costPerTurn} |`);
  const codes = [...new Set([...Object.keys(c.before.warningsPerTurn), ...Object.keys(c.after.warningsPerTurn)])];
  for (const k of codes) out.push(`| pre-repair ${k} per turn (warn and error) | ${c.before.warningsPerTurn[k] ?? 0} | ${c.after.warningsPerTurn[k] ?? 0} |`);
  out.push('', '| case | runs passed before | after | still failing after |', '| --- | ---: | ---: | --- |');
  for (const k of c.cases) out.push(`| ${k.id} | ${k.before} | ${k.after} | ${k.afterFailed.slice(0, 2).join('; ').replace(/\|/g, '/')} |`);
  if (c.onlyAfter.length) out.push('', `Not compared, only in the after directory (${c.onlyAfter.length}): ${c.onlyAfter.join(', ')}`);
  if (c.onlyBefore.length) out.push('', `Not compared, only in the before directory (${c.onlyBefore.length}): ${c.onlyBefore.join(', ')}`);
  return out.join('\n');
}

if (process.argv[1] && path.basename(process.argv[1]) === 'compare.ts') {
  const [a, b] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const cmp = compare(load(a), load(b));
  console.log(process.argv.includes('--json') ? JSON.stringify(cmp, null, 2) : renderComparison(cmp));
}
