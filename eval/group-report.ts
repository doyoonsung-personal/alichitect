// Phase 1b report: pass rates by case group (AI, asks, scope, and the old categories), failure classes, latency and cost per turn.
// Read-only, no network.
//   node eval/group-report.ts <label=dir> [<label=dir> ...] [--md]
// A group is derived from the case id: ai-* AI, as-* asks, sc-* scope; every other case is an old case and is grouped by its
// category. Rates: pass@1 is the mean per-case run pass rate, all-runs the share of cases whose every run passes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RunRecord } from './records.ts';

export type Group = 'AI' | 'asks' | 'scope' | 'old';

export function groupOf(caseId: string): Group {
  if (caseId.startsWith('ai-')) return 'AI';
  if (caseId.startsWith('as-')) return 'asks';
  if (caseId.startsWith('sc-')) return 'scope';
  return 'old';
}

export interface Rate {
  cases: number;
  runs: number;
  passAt1: number;
  allRuns: number;
  passAt3: number;
}

export function rates(runs: RunRecord[]): Rate {
  const by = new Map<string, RunRecord[]>();
  for (const r of runs) by.set(r.case, [...(by.get(r.case) ?? []), r]);
  const cases = [...by.values()];
  const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  return {
    cases: cases.length,
    runs: runs.length,
    passAt1: mean(cases.map((rs) => rs.filter((r) => r.pass).length / rs.length)),
    allRuns: mean(cases.map((rs) => (rs.every((r) => r.pass) ? 1 : 0))),
    passAt3: mean(cases.map((rs) => (rs.some((r) => r.pass) ? 1 : 0))),
  };
}

export function readRuns(dir: string): RunRecord[] {
  return readFileSync(path.join(dir, 'runs.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as RunRecord);
}

const pc = (x: number): string => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '-');

export function table(label: string, runs: RunRecord[]): string[] {
  const rows: Array<[string, RunRecord[]]> = [['ALL', runs]];
  for (const g of ['AI', 'asks', 'scope'] as const) rows.push([g, runs.filter((r) => groupOf(r.case) === g)]);
  const old = runs.filter((r) => groupOf(r.case) === 'old');
  rows.push(['old (all)', old]);
  for (const cat of ['pattern', 'need', 'trap', 'edit', 'multiturn', 'adversarial', 'i18n']) rows.push([`old ${cat}`, old.filter((r) => r.category === cat)]);
  const out = [`### ${label}`, '', '| group | cases | runs | pass@1 | all runs | pass@3 |', '| --- | ---: | ---: | ---: | ---: | ---: |'];
  for (const [name, rs] of rows) {
    if (!rs.length) continue;
    const r = rates(rs);
    out.push(`| ${name} | ${r.cases} | ${r.runs} | ${pc(r.passAt1)} | ${pc(r.allRuns)} | ${pc(r.passAt3)} |`);
  }
  return out;
}

/** Failing assertions by type and case, for the failure-class table. */
export function failureClasses(runs: RunRecord[]): Array<{ type: string; conversations: number; cases: string[] }> {
  const m = new Map<string, { conv: Set<string>; cases: Set<string> }>();
  for (const r of runs) {
    for (const t of r.turns) {
      for (const a of t.assertions) {
        if (a.pass) continue;
        const e = m.get(a.type) ?? { conv: new Set(), cases: new Set() };
        e.conv.add(r.id);
        e.cases.add(r.case);
        m.set(a.type, e);
      }
    }
    if (r.apiError) {
      const e = m.get('api') ?? { conv: new Set(), cases: new Set() };
      e.conv.add(r.id);
      e.cases.add(r.case);
      m.set('api', e);
    }
  }
  return [...m.entries()].map(([type, e]) => ({ type, conversations: e.conv.size, cases: [...e.cases].sort() })).sort((a, b) => b.conversations - a.conversations);
}

/** Judge sign-off share and mean overall score by group, from a results directory's summary.json (judged runs only). */
export function judgeByGroup(dir: string): string[] {
  let cases: Array<{ id: string; category: string; judge?: { signoff: boolean; mean: number } }>;
  try {
    cases = (JSON.parse(readFileSync(path.join(dir, 'summary.json'), 'utf8')) as { cases: typeof cases }).cases;
  } catch {
    return [];
  }
  const rows: string[] = ['| group | judged | sign-off | mean score |', '| --- | ---: | ---: | ---: |'];
  for (const g of ['AI', 'asks', 'scope', 'old'] as const) {
    const js = cases.filter((c) => groupOf(c.id) === g && c.judge);
    if (!js.length) continue;
    const sign = js.filter((c) => c.judge!.signoff).length / js.length;
    const mean = js.reduce((s, c) => s + c.judge!.mean, 0) / js.length;
    rows.push(`| ${g} | ${js.length} | ${pc(sign)} | ${mean.toFixed(2)} |`);
  }
  return rows.length > 2 ? [...rows, ''] : [];
}

function main(): void {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const out: string[] = [];
  for (const a of args) {
    const [label, dir] = a.includes('=') ? (a.split('=') as [string, string]) : [path.basename(a), a];
    const runs = readRuns(path.resolve(dir));
    out.push(...table(label, runs), '');
    out.push(...judgeByGroup(path.resolve(dir)));
    const fc = failureClasses(runs);
    if (fc.length) {
      out.push('| failing assertion type | conversations | cases |', '| --- | ---: | --- |');
      for (const f of fc) out.push(`| ${f.type} | ${f.conversations} | ${f.cases.join(', ')} |`);
      out.push('');
    }
  }
  console.log(out.join('\n'));
}

if (process.argv[1] && path.basename(process.argv[1]) === 'group-report.ts') main();
