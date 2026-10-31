// Lists the failed assertions of a results directory, grouped by case, with the model's own words for context.
//   node eval/failures.ts <results dir> [--case prefix] [--type escapes] [--say]
// Read-only; works while a run is still appending to runs.jsonl.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RunRecord } from './records.ts';

const argv = process.argv.slice(2);
const dir = path.resolve(argv.find((a) => !a.startsWith('--')) ?? '.');
const opt = (n: string): string | undefined => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : undefined;
};
const casePrefix = opt('case');
const type = opt('type');
const showSay = argv.includes('--say');

const runs = readFileSync(path.join(dir, 'runs.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as RunRecord)
  .filter((r) => !casePrefix || r.case.startsWith(casePrefix))
  .sort((a, b) => a.case.localeCompare(b.case) || a.run - b.run);

let shown = 0;
for (const r of runs) {
  const bad = r.turns.flatMap((t) => t.assertions.filter((a) => !a.pass && (!type || a.type === type)).map((a) => ({ t, a })));
  if (!bad.length && !r.apiError) continue;
  console.log(`\n${r.id} ${r.pass ? 'pass' : 'FAIL'}${r.apiError ? ' API: ' + r.apiError : ''}`);
  for (const { t, a } of bad) {
    console.log(`  turn ${t.index + 1} [${a.type}] ${a.name.slice(0, 90)}: ${(a.detail ?? '').slice(0, 220)}`);
    if (showSay) console.log(`      say: ${t.says.join(' | ').slice(0, 260)}`);
  }
  shown++;
}
console.log(`\n${shown} conversation(s) with failures out of ${runs.length}`);
