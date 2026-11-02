import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadCatalog, loadModels } from '../src/catalog-node.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow, endWorkflowTurn } from '../src/workflow.ts';
import { checkWorkflow, repairWorkflow, validateWorkflowOp } from '../src/workflow-validate.ts';
import type { Warning, WarningCode, WorkflowSettings } from '../src/types.ts';

interface Sample {
  id: string;
  title: string;
  ask: string;
  oneRun: string;
  settings: WorkflowSettings;
  ops: unknown[];
  expect: { codes: Array<{ code: WarningCode; why: string }> };
}

const directory = new URL('./fixtures/workflows/', import.meta.url);
const samples = readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) => {
  const sample = JSON.parse(readFileSync(new URL(name, directory), 'utf8')) as Sample;
  assert.equal(name, `${sample.id}.json`);
  return sample;
});
const catalog = loadCatalog();
const models = loadModels();
// Add only independently diagnosed checker defects here, never observed output as an expectation.
const checkerIssues: Readonly<Record<string, string>> = {};
const describe = (warnings: Warning[]): string => JSON.stringify(warnings, null, 2);

test('canonical workflow samples cover all 32 sketches', () => {
  const source = new URL('../../../research/ai-workflows/usecases/', import.meta.url);
  const ids = readdirSync(source).filter((name) => name.endsWith('.json')).flatMap((name) => {
    const file = JSON.parse(readFileSync(new URL(name, source), 'utf8')) as { workflows: Array<{ id: string }> };
    assert.equal(file.workflows.length, 8, name);
    return file.workflows.map(({ id }) => id);
  });
  assert.equal(samples.length, 32);
  assert.equal(new Set(samples.map(({ id }) => id)).size, 32);
  assert.deepEqual(samples.map(({ id }) => id).sort(), ids.sort());
});

for (const sample of samples) {
  const issue = checkerIssues[sample.id];
  test(`workflow sample: ${sample.id}`, issue ? { todo: `checker issue: ${issue}` } : {}, () => {
    assert.ok(sample.title.trim() && sample.ask.trim() && sample.oneRun.trim());
    assert.ok(sample.ops.length > 0);
    assert.equal(new Set(sample.expect.codes.map(({ code }) => code)).size, sample.expect.codes.length);
    for (const expected of sample.expect.codes) {
      assert.ok(expected.why.trim(), `${expected.code} needs a sketch-specific reason`);
      assert.ok(!/[\r\n]/.test(expected.why), 'Expected-code reasons must be one line');
    }
    const ctx = createWorkflowCtx();
    let workflow = emptyWorkflow();
    const warnings: Warning[] = [];
    const withinCaps = (): void => {
      assert.ok(Object.keys(workflow.nodes).length <= ctx.limits.maxNodes);
      assert.ok(Object.keys(workflow.edges).length <= ctx.limits.maxEdges);
      assert.ok(Object.keys(workflow.groups).length <= ctx.limits.maxGroups);
    };
    for (const raw of sample.ops) {
      const validated = validateWorkflowOp(raw, catalog, models);
      assert.deepEqual(validated.warnings.filter(({ code }) => code === 'wf-unknown-ref' || code === 'wf-bad-op'), [], describe(validated.warnings));
      warnings.push(...validated.warnings);
      const op = validated.op;
      assert.ok(op, `Dropped op: ${JSON.stringify(raw)}`);
      if (op.t !== 'step' && op.t !== 'link' && op.t !== 'each' && op.t !== 'splice' && op.t !== 'unstep') {
        assert.fail(`Non-workflow op in sample: ${op.t}`);
      }
      const applied = applyWorkflowOp(workflow, op, ctx);
      workflow = applied.workflow;
      warnings.push(...applied.warnings);
      withinCaps();
    }
    warnings.push(...endWorkflowTurn(ctx));
    const repaired = repairWorkflow(workflow, catalog, models, sample.settings);
    workflow = repaired.workflow;
    warnings.push(...repaired.warnings);
    const final = checkWorkflow(workflow, catalog, models, sample.settings);
    warnings.push(...final);
    assert.deepEqual([...new Set(final.map(({ code }) => code))].sort(), sample.expect.codes.map(({ code }) => code).sort(), describe(final));
    assert.deepEqual(warnings.filter(({ severity }) => severity === 'error'), [], describe(warnings));
    assert.deepEqual(warnings.filter(({ code }) => ['cap-exceeded', 'dangling-edge', 'wf-id-collision', 'wf-bad-op'].includes(code)), [], describe(warnings));
    withinCaps();
  });
}
