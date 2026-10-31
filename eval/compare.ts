// Before/after comparison of two results directories on the cases they share (the cases re-run after a fix).
//   node eval/compare.ts <before dir> <after dir> [--json]
// Per case: runs passed before and after. Overall: run pass rate, pass@N, majority and assertion pass rate on the shared
// cases, pre-repair warnings per turn by code, and the assertion failures that disappeared or appeared.
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

export interface Comparison {
  cases: Array<{ id: string; before: string; after: string; beforeFailed: string[]; afterFailed: string[] }>;
  before: { runs: number; runPass: number; casesPassAtN: number; casesMajority: number; assertions: number; assertionsPassed: number; warningsPerTurn: Record<string, number>; turns: number; costPerTurn: number };
  after: { runs: number; runPass: number; casesPassAtN: number; casesMajority: number; assertions: number; assertionsPassed: number; warningsPerTurn: Record<string, number>; turns: number; costPerTurn: number };
}

function agg(rs: RunRecord[]): Comparison['before'] {
  const turns = rs.flatMap((r) => r.turns);
  const asserts = turns.flatMap((t) => t.assertions);
  const perCase = [...by(rs, (r) => r.case).values()];
  const warn: Record<string, number> = {};
  for (const t of turns) for (const w of t.stats.warningsBefore ?? []) if (w.severity !== 'info') warn[w.code] = (warn[w.code] ?? 0) + 1;
  for (const k of Object.keys(warn)) warn[k] = Math.round((warn[k] / Math.max(1, turns.length)) * 1000) / 1000;
  return {
    runs: rs.length,
    runPass: rs.filter((r) => r.pass).length,
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
  const ids = new Set(after.map((r) => r.case));
  const b = before.filter((r) => ids.has(r.case));
  const bc = by(b, (r) => r.case);
  const ac = by(after, (r) => r.case);
  const failedOf = (rs: RunRecord[]): string[] => [...new Set(rs.flatMap((r) => r.turns.flatMap((t) => t.assertions.filter((a) => !a.pass).map((a) => `${a.type}: ${a.name.slice(0, 60)}`))))];
  const cases = [...ids].sort().map((id) => ({
    id,
    before: `${(bc.get(id) ?? []).filter((r) => r.pass).length}/${(bc.get(id) ?? []).length}`,
    after: `${(ac.get(id) ?? []).filter((r) => r.pass).length}/${(ac.get(id) ?? []).length}`,
    beforeFailed: failedOf(bc.get(id) ?? []),
    afterFailed: failedOf(ac.get(id) ?? []),
  }));
  return { cases, before: agg(b), after: agg(after) };
}

export function renderComparison(c: Comparison): string {
  const out: string[] = [];
  const rows = (k: 'before' | 'after'): string => `${c[k].runPass}/${c[k].runs} (${pc(c[k].runPass, c[k].runs)})`;
  out.push('| measure (shared cases) | before | after |', '| --- | ---: | ---: |');
  out.push(`| conversations passing every assertion | ${rows('before')} | ${rows('after')} |`);
  out.push(`| cases with some run passing | ${c.before.casesPassAtN}/${c.cases.length} | ${c.after.casesPassAtN}/${c.cases.length} |`);
  out.push(`| cases with a majority of runs passing | ${c.before.casesMajority}/${c.cases.length} | ${c.after.casesMajority}/${c.cases.length} |`);
  out.push(`| assertions passing | ${pc(c.before.assertionsPassed, c.before.assertions)} (${c.before.assertionsPassed}/${c.before.assertions}) | ${pc(c.after.assertionsPassed, c.after.assertions)} (${c.after.assertionsPassed}/${c.after.assertions}) |`);
  out.push(`| list-price cost per turn | $${c.before.costPerTurn} | $${c.after.costPerTurn} |`);
  const codes = [...new Set([...Object.keys(c.before.warningsPerTurn), ...Object.keys(c.after.warningsPerTurn)])];
  for (const k of codes) out.push(`| pre-repair ${k} per turn (warn and error) | ${c.before.warningsPerTurn[k] ?? 0} | ${c.after.warningsPerTurn[k] ?? 0} |`);
  out.push('', '| case | runs passed before | after | still failing after |', '| --- | ---: | ---: | --- |');
  for (const k of c.cases) out.push(`| ${k.id} | ${k.before} | ${k.after} | ${k.afterFailed.slice(0, 2).join('; ').replace(/\|/g, '/')} |`);
  return out.join('\n');
}

if (process.argv[1] && path.basename(process.argv[1]) === 'compare.ts') {
  const [a, b] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const cmp = compare(load(a), load(b));
  console.log(process.argv.includes('--json') ? JSON.stringify(cmp, null, 2) : renderComparison(cmp));
}
