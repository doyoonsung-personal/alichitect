import { AvoidLib } from 'libavoid-js';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../routing/avoid.ts';
await AvoidLib.load();
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import type { WorkflowOp } from '@ali/core/types.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { normalizeWorkflowLayout } from './layout-adapter.ts';
import { buildWorkflowScene } from './scene.ts';
import { models } from './models.ts';
import { makeT } from '../i18n/t.ts';
import { planWorkflowEdges, drawWorkflowEdges, checkedWorkflowRoutes } from './edges.ts';
import { routeChannels } from '../routing/channel.ts';
const dir = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
test('fixture corpus has all 32 workflows', () => assert.equal(files.length, 32));
for (const file of files) test('scene and routing: ' + file, () => {
  const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const ctx = createWorkflowCtx();
  let wf = emptyWorkflow(), raw = layoutWorkflow(wf);
  for (const op of fixture.ops as WorkflowOp[]) {
    wf = applyWorkflowOp(wf, op, ctx).workflow;
    raw = layoutWorkflow(wf, raw);
  }
  const layout = normalizeWorkflowLayout(wf, raw);
  const scene = buildWorkflowScene({ workflow: wf, layout, catalog: loadCatalog(), models,
    settings: fixture.settings ?? {}, lang: 'en', t: makeT('en'), measure: { title: (s, px) => s.length * px / 2, body: (s) => s.length * 6 } });
  assert.equal(scene.cards.length + scene.hiddenAttachmentIds.length, Object.keys(wf.nodes).length);
  for (const card of scene.cards) {
    assert.equal(card.w, 168);
    assert.equal(card.titlePx, 14);
    assert.equal(card.titleLines.join('').replace(/\s/g, ''), card.label.replace(/\s/g, ''));
    assert.ok(card.h >= 18 + card.titleLines.length * card.titlePx * 1.25);
    if (!card.model && !card.product && !card.badges.length && !card.hidden.length && card.titleLines.length <= 2) {
      assert.equal(card.h, 60);
    }
  }
  for (const a of scene.cards) for (const b of scene.cards) {
    if (a.id >= b.id) continue;
    assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, a.id + '/' + b.id);
  }
  const plan = planWorkflowEdges({ workflow: wf, layout, scene });
  const avoid = createAvoidState(AvoidLib.getInstance());
  const avoided = routeWithAvoid(avoid, plan.request);
  disposeAvoidState(avoid);
  assert.deepEqual(avoided.failed, []);
  assert.equal(Object.keys(avoided.routes).length, plan.request.edges.length);
  const result = routeChannels(plan.request);
  assert.deepEqual(result.failed, []);
  const drawings = drawWorkflowEdges({ plan, routes: result.routes, measure: (s) => s.length * 6 });
  assert.equal(drawings.length, Object.keys(plan.semantics).length);
  for (const routes of [checkedWorkflowRoutes(plan, result.routes), checkedWorkflowRoutes(plan, avoided.routes)]) {
    const all = drawWorkflowEdges({ plan, routes, measure: (s) => s.length * 6 });
    for (const d of all) {
      assert.ok(d.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), JSON.stringify(d));
      for (let i = 1; i < d.points.length; i++) {
        const a = d.points[i - 1], b = d.points[i];
        for (const r of plan.request.obstacles.filter((r) => r.id !== d.edge.from && r.id !== d.edge.to)) {
          const crosses = a.x === b.x ? a.x > r.x + 0.01 && a.x < r.x + r.w - 0.01
            && Math.max(a.y, b.y) > r.y + 0.01 && Math.min(a.y, b.y) < r.y + r.h - 0.01
            : a.y === b.y && a.y > r.y + 0.01 && a.y < r.y + r.h - 0.01
            && Math.max(a.x, b.x) > r.x + 0.01 && Math.min(a.x, b.x) < r.x + r.w - 0.01;
          assert.ok(!crosses, (routes === result.routes ? 'channel ' : 'avoid ') + d.id + ' crosses ' + r.id);
        }
      }
    }
  }
});
