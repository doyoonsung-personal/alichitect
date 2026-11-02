// Local PDF matrix and optional visual samples. Run from apps/web with --import ./scripts/alias.mjs.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
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
  if (render && (count === 10 || (lang === 'en' && count === 25))) {
    mkdirSync(output, { recursive: true });
    const stem = `${lang}-${count}`;
    writeFileSync(new URL(`${stem}.pdf`, output), result.bytes);
    await renderPdf(result.bytes, output, stem, 1);
  }
}
if (render) {
  const fixture = JSON.parse(readFileSync(new URL(
    '../../../../packages/core/test/fixtures/workflows/support-email-triage.json', import.meta.url), 'utf8'));
  const state = createInitialState({ lang: 'en', id: fixture.id, now: 0 });
  const ctx = createWorkflowCtx();
  let workflow = emptyWorkflow();
  for (const op of fixture.ops) workflow = applyWorkflowOp(workflow, op, ctx).workflow;
  state.session.mode = 'workflow';
  state.session.memory.workflow = workflow;
  state.session.memory.workflowSettings = fixture.settings;
  const result = await generateFromState(state, { title: fixture.title });
  const check = await checkPdf(result.bytes, state, { title: fixture.title });
  assert.deepEqual(check.problems, []);
  writeFileSync(new URL(`${fixture.id}.pdf`, output), result.bytes);
  await renderPdf(result.bytes, output, fixture.id, 1);
  console.log(`${fixture.id}: ${result.report.pages} pages, ${result.report.diagramPages.length} diagram pages`);
}
