// Local PDF matrix and optional visual samples. Run from apps/web with --import ./scripts/alias.mjs.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createInitialState } from '../../src/store/reducer.ts';
import { workflowFixture } from '../../src/export/workflow-fixtures.ts';
import { generateFromState } from './node-env.ts';
import { checkPdf } from './checks.ts';
import { renderPdf } from './inspect.ts';

const render = process.argv.includes('--render');
const output = new URL('../../../../tmp/pdfs/workflow/', import.meta.url);
for (const lang of ['en', 'ko', 'zh']) for (const count of [10, 15, 25]) {
  const state = createInitialState({ lang, id: 'pdf-matrix', now: 0 });
  state.session.mode = 'workflow';
  state.session.memory.workflow = workflowFixture(count, lang);
  const result = await generateFromState(state, { title: `Workflow ${lang} ${count}` });
  const check = await checkPdf(result.bytes, state, { title: `Workflow ${lang} ${count}` });
  assert.deepEqual(check.problems, []);
  assert.ok(result.report.diagramPages.every((p) => p.overview || p.scale * 14 >= 11));
  console.log(`${lang} ${count}: ${result.report.pages} pages, ${result.report.diagramPages.length} diagram pages`);
  if (render && count === 10) {
    mkdirSync(output, { recursive: true });
    writeFileSync(new URL(`${lang}.pdf`, output), result.bytes);
    await renderPdf(result.bytes, output, lang, 1);
  }
}
