// Static checks of the golden cases and base diagrams. No network.
//   node eval/check-cases.ts [dir-with-case-json-files]
// Fails (exit 1) on unknown assertion keys, product ids that are not in the catalog, missing bases, duplicate case ids
// and unknown warning codes. Also prints the case counts by category and language.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../packages/core/src/catalog-node.ts';
import { EVAL_DIR, checkCases, countBy, loadBase, loadCases } from './lib.ts';

const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(EVAL_DIR, 'cases');
const catalog = loadCatalog();
const cases = process.argv[2] ? loadCases(dir) : [...loadCases(dir), ...loadCases(path.join(EVAL_DIR, 'cases-workflow'))];
const problems = checkCases(cases, catalog);

for (const f of readdirSync(path.join(EVAL_DIR, 'bases')).filter((x) => x.endsWith('.json'))) {
  const name = f.replace(/\.json$/, '');
  const { memory, warnings } = loadBase(name, catalog);
  const errors = warnings.filter((w) => w.severity === 'error' && !w.repaired);
  if (errors.length) problems.push(`base ${name}: ${errors.map((w) => `${w.code} ${w.msg}`).join('; ')}`);
  const unknown = warnings.filter((w) => w.code === 'unknown-product');
  if (unknown.length) problems.push(`base ${name}: unknown products ${unknown.map((w) => w.msg).join('; ')}`);
  console.log(`base ${name}: ${Object.keys(memory.graph.nodes).length} nodes, ${Object.keys(memory.graph.edges).length} edges, ${memory.turns.length} history turns`);
}

const turns = cases.reduce((s, c) => s + c.turns.length, 0);
console.log(`${cases.length} cases, ${turns} turns`);
console.log('by category', JSON.stringify(countBy(cases, (c) => c.category)));
console.log('by language', JSON.stringify(countBy(cases, (c) => c.lang ?? 'en')));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log('cases are well formed');
