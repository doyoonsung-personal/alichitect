import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import type { WorkflowOp } from '@ali/core/types.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { catalog } from '../test/fixtures.ts';
import { models } from '../workflow/models.ts';
import { routeChannels } from '../routing/channel.ts';
import { createFontSet } from './fonts.ts';
import { nodeFontSource } from './fonts-node.ts';
import { prepareWorkflowDiagram, drawWorkflowDiagram } from './workflow-diagram.ts';
import { workflowFixture } from './workflow-fixtures.ts';
test('workflow SVG preserves semantics, escapes labels and tiles without losing a card', async () => {
  const workflow = workflowFixture(25);
  const prepared = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: {}, lang: 'en', route: async (r) => routeChannels(r) });
  const fonts = createFontSet(nodeFontSource());
  drawWorkflowDiagram(prepared, fonts);
  await fonts.load();
  const d = drawWorkflowDiagram(prepared, fonts);
  assert.ok(d.pages.length > 2);
  assert.match(d.svg, /&lt;review &amp; respond&gt;/);
  assert.match(d.svg, /stroke-dasharray/);
  assert.match(d.svg, /Needs review/);
  assert.match(d.svg, /Limit reached/);
  assert.doesNotMatch(d.svg, /foreignObject|<image|<style/);
  for (const id of Object.keys(prepared.input.layout.cards)) {
    assert.ok(d.pages.slice(1).some((p) => p.drawing.svg.includes(`data-id="${id}"`)), id);
  }
});
const dir = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) test('SVG fixture: ' + file, async () => {
  const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const ctx = createWorkflowCtx(); let workflow = emptyWorkflow();
  for (const op of fixture.ops as WorkflowOp[]) workflow = applyWorkflowOp(workflow, op, ctx).workflow;
  const d = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: fixture.settings ?? {}, lang: 'en', route: async (r) => routeChannels(r) });
  const svg = drawWorkflowDiagram(d, createFontSet(nodeFontSource()));
  assert.equal(svg.counts.cards, Object.keys(d.input.layout.cards).length);
  assert.ok(svg.width > 0 && svg.height > 0);
});
