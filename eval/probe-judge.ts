// Compares candidate judge models on stored runs: JSON compliance, latency, cost, and agreement with each other.
//   node eval/probe-judge.ts <results dir> [--models kimi-k3,deepseek-v4-pro,glm-5.3] [--cases id,id] [--no-thinking-param]
// Does one judge call per (model, run) and prints a table. Costs are booked in the ledger.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../packages/core/src/catalog-node.ts';
import type { Graph } from '../packages/core/src/types.ts';
import { appendLedger, loadBase, loadCases } from './lib.ts';
import { judgeRun } from './judge.ts';
import type { RunRecord } from './records.ts';

const argv = process.argv.slice(2);
const dir = path.resolve(argv[0] ?? '.');
const opt = (name: string): string | undefined => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const models = (opt('models') ?? 'kimi-k3,deepseek-v4-pro,glm-5.3').split(',');
const only = opt('cases')?.split(',');
const noParam = argv.includes('--no-thinking-param');
const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');

const catalog = loadCatalog();
const cases = new Map(loadCases().map((c) => [c.id, c]));
const runs = readFileSync(path.join(dir, 'runs.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as RunRecord)
  .filter((r) => !only || only.includes(r.case));

const rows: string[][] = [];
for (const run of runs) {
  const c = cases.get(run.case)!;
  let before: Graph | null = null;
  if (run.turns.length > 1) before = run.turns[run.turns.length - 2].graph;
  else if (c.base) before = loadBase(c.base, catalog).memory.graph;
  const results = await Promise.all(
    models.map(async (model) => {
      const j = await judgeRun(c, run, before, catalog, {
        apiKey,
        model,
        extraBody: noParam ? { enable_thinking: undefined } : undefined,
        onCost: (x) => appendLedger({ ts: new Date().toISOString(), label: 'judge-probe', model: x.model, phase: 'judge', costUsd: x.costUsd, estimated: x.estimated, usage: x.usage as undefined, case: run.id }),
      });
      return j;
    }),
  );
  for (const j of results) {
    const s = j.scores;
    rows.push([run.case, j.model, s ? `${s.completeness}/${s.accuracy}/${s.rationality}/${s.readability}` : 'ERR', s ? (s.signoff ? 'yes' : 'no') : (j.error ?? '').slice(0, 60), `${(j.ms / 1000).toFixed(1)}s`, `$${j.costUsd.toFixed(4)}`, (s?.defects ?? []).slice(0, 2).join(' ; ').slice(0, 140)]);
  }
}
console.log(['case', 'model', 'c/a/r/r', 'signoff', 'time', 'cost', 'defects'].join(' | '));
for (const r of rows) console.log(r.join(' | '));
