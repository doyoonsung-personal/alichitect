import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workflowGlyph } from './glyphs.ts';
import type { WorkflowNodeKind } from '@ali/core/types.ts';
import { readFileSync } from 'node:fs';
test('every workflow kind has pure glyph geometry; six business glyphs differ', () => {
  const kinds: WorkflowNodeKind[] = ['trigger', 'ai', 'agent', 'decide', 'guard', 'human', 'act', 'tool', 'knowledge', 'memory', 'end'];
  for (const kind of kinds) { const g = workflowGlyph(kind); assert.ok(g.viewBox); assert.ok(g.nodes.length); }
  assert.equal(new Set(['trigger', 'decide', 'guard', 'human', 'act', 'end'].map((k) =>
    JSON.stringify(workflowGlyph(k as WorkflowNodeKind)))).size, 6);
});

import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { normalizeWorkflowLayout } from './layout-adapter.ts';
import { buildWorkflowScene } from './scene.ts';
import { models } from './models.ts';
import { makeT } from '../i18n/t.ts';
import { planWorkflowEdges, drawWorkflowEdges } from './edges.ts';
import { routeChannels } from '../routing/channel.ts';
import type { WorkflowGraph } from '@ali/core/types.ts';
test('same-endpoint branches keep identities and outcomes; left-pointing dependency stays non-loop', () => {
  const wf: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'trigger', label: 'A' },
    b: { id: 'b', kind: 'human', label: 'B' } }, edges: {}, groups: {} };
  const prev = layoutWorkflow(wf);
  wf.edges = { e: { id: 'e', from: 'b', to: 'a', kind: 'branch', label: 'Ready', outcome: 'approve' },
    f: { id: 'f', from: 'b', to: 'a', kind: 'branch', label: 'No', outcome: 'reject' } };
  const layout = normalizeWorkflowLayout(wf, layoutWorkflow(wf, prev));
  const scene = buildWorkflowScene({ workflow: wf, layout, catalog: loadCatalog(), models, settings: {},
    lang: 'en', t: makeT('en'), measure: { title: (s) => s.length * 6, body: (s) => s.length * 6 } });
  const plan = planWorkflowEdges({ workflow: wf, scene, layout });
  assert.equal(plan.request.edges.length, 2);
  assert.equal(plan.semantics.e.loop, false);
  const edges = drawWorkflowEdges({ plan, routes: routeChannels(plan.request).routes, measure: (s) => s.length * 6 });
  assert.deepEqual(edges.map((e) => e.id), ['e', 'f']);
  assert.match(edges[0].label, /Approved/); assert.match(edges[1].label, /Rejected/);
  assert.notEqual(edges[0].labelBox.y, edges[1].labelBox.y);
});


import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import { AvoidLib } from 'libavoid-js';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../routing/avoid.ts';
import { checkedWorkflowRoutes } from './edges.ts';
import type { WorkflowOp } from '@ali/core/types.ts';

for (const [name, fromOp] of [
  ['claims-processing-extraction', 0],
  ['ai-tutor-socratic-hint', 28],
  ['social-listening-review-analysis', 31],
] as const) {
  test(`${name}: main-row labels stay outside branch bands`, async (t) => {
    await AvoidLib.load();
    const fixture = JSON.parse(readFileSync(new URL(`../../../../packages/core/test/fixtures/workflows/${name}.json`, import.meta.url), 'utf8'));
    const ctx = createWorkflowCtx();
    let workflow = emptyWorkflow(), raw = layoutWorkflow(workflow);
    const states: Array<{ op: number; workflow: WorkflowGraph; raw: typeof raw }> = [];
    for (const [index, op] of (fixture.ops as WorkflowOp[]).entries()) {
      workflow = applyWorkflowOp(workflow, op, ctx).workflow;
      raw = layoutWorkflow(workflow, raw, { op });
      if (fromOp && index + 1 >= fromOp) states.push({ op: index + 1, workflow, raw });
    }
    if (!fromOp) states.push({ op: 0, workflow, raw: layoutWorkflow(workflow) });
    const failures: string[] = [];
    let checked = 0;
    for (const state of states) {
      const measure = { title: (s: string, px: number) => s.length * px / 2, body: (s: string) => s.length * 6 };
      const layout = normalizeWorkflowLayout(state.workflow, state.raw, { measure: measure.title });
      const scene = buildWorkflowScene({ workflow: state.workflow, layout, catalog: loadCatalog(), models,
        settings: fixture.settings ?? {}, lang: 'en', t: makeT('en'), measure });
      const plan = planWorkflowEdges({ workflow: state.workflow, scene, layout });
      const branches = scene.cards.filter((c) => !c.node.on && layout.source.workflow.cells[c.id].row > 0);
      assert.ok(branches.length, `op ${state.op}: branch cards`);
      const avoid = createAvoidState(AvoidLib.getInstance());
      try {
        for (const result of [routeChannels(plan.request), routeWithAvoid(avoid, plan.request)]) {
          const drawings = drawWorkflowEdges({ plan,
            routes: checkedWorkflowRoutes(plan, result.routes, result.failed), measure: measure.body });
          assert.equal(drawings.length, Object.keys(plan.semantics).length);
          for (const d of drawings.filter((d) => d.label)) {
            const b = d.labelBox;
            assert.ok(b.y >= plan.bounds.y, `op ${state.op}: ${d.id} above drawing`);
            for (const r of plan.request.obstacles) {
              assert.ok(b.x + b.w <= r.x || r.x + r.w <= b.x || b.y + b.h <= r.y || r.y + r.h <= b.y,
                `op ${state.op}: ${d.id} overlaps ${r.id}`);
            }
            if (d.loop || d.attached || layout.source.workflow.cells[d.edge.from].row !== 0
              || layout.source.workflow.cells[d.edge.to].row !== 0) continue;
            checked++;
            for (const r of branches) if (b.y < r.y + r.h && r.y < b.y + b.h) {
              failures.push(`op ${state.op} ${result.router}: ${d.id} (${b.y}-${b.y + b.h}) enters ${r.id} (${r.y}-${r.y + r.h})`);
            }
          }
        }
      } finally {
        disposeAvoidState(avoid);
      }
    }
    assert.ok(checked > 0);
    t.diagnostic(`${states.length} states, ${checked} main-row labels checked across both routers`);
    assert.deepEqual(failures, []);
  });
}

for (const name of ['hr-resume-screening-and-scheduling', 'it-helpdesk-triage-and-remediation']) {
  test(`${name}: main-row labels clear obstacles within the drawing bounds`, () => {
    const fixture = JSON.parse(readFileSync(new URL(`../../../../packages/core/test/fixtures/workflows/${name}.json`, import.meta.url), 'utf8'));
    const ctx = createWorkflowCtx();
    let wf = emptyWorkflow();
    for (const op of fixture.ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
    const layout = normalizeWorkflowLayout(wf, layoutWorkflow(wf));
    const scene = buildWorkflowScene({ workflow: wf, layout, catalog: loadCatalog(), models, settings: {},
      lang: 'en', t: makeT('en'), measure: { title: (s, px) => s.length * px / 2, body: (s) => s.length * 6 } });
    const plan = planWorkflowEdges({ workflow: wf, scene, layout });
    const drawings = drawWorkflowEdges({ plan, routes: routeChannels(plan.request).routes, measure: (s) => s.length * 6 });
    const labels = drawings.filter((d) => d.label && layout.source.workflow.cells[d.edge.from].row === 0
      && layout.source.workflow.cells[d.edge.to].row === 0 && !layout.source.workflow.routes[d.id].loop);
    assert.ok(labels.length > 0);
    for (const d of labels) assert.ok(d.labelBox.y >= plan.bounds.y, d.id);
    for (const d of drawings.filter((d) => d.label)) for (const r of plan.request.obstacles) {
      const b = d.labelBox;
      assert.ok(b.x + b.w <= r.x || r.x + r.w <= b.x || b.y + b.h <= r.y || r.y + r.h <= b.y, d.id + '/' + r.id);
    }
  });
}


import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { createFontSet } from '../export/fonts.ts';
import { nodeFontSource } from '../export/fonts-node.ts';
import { prepareWorkflowDiagram, drawWorkflowDiagram } from '../export/workflow-diagram.ts';

// Load only the baseline modules in memory: no checkout, generated helper files or network.
const root = new URL('../../../../', import.meta.url);
const headPaths = new Set(['packages/core/src/workflow-layout.ts', 'apps/web/src/workflow/layout-adapter.ts',
  'apps/web/src/workflow/scene.ts', 'apps/web/src/workflow/edges.ts', 'apps/web/src/export/workflow-diagram.ts']);
const headUrls = new Map<string, string>();
function headUrl(path: string): string {
  const cached = headUrls.get(path);
  if (cached) return cached;
  const source = execFileSync('git', ['show', 'HEAD:' + path], { cwd: fileURLToPath(root), encoding: 'utf8' });
  const code = stripTypeScriptTypes(source).replace(/from\s+(['"])([^'"]+)\1/g, (_, quote: string, spec: string) => {
    if (!spec.startsWith('.')) return `from ${quote}${spec}${quote}`;
    const resolved = new URL(spec, new URL(path, root));
    const relative = resolved.href.slice(root.href.length);
    return `from ${quote}${headPaths.has(relative) ? headUrl(relative) : resolved.href}${quote}`;
  });
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  headUrls.set(path, url);
  return url;
}

test('PDF diagram page counts for 32 tidied fixtures in en, ko and zh do not grow against HEAD', async () => {
  const baseline = await import(headUrl('apps/web/src/export/workflow-diagram.ts')) as typeof import('../export/workflow-diagram.ts');
  const core = await import(headUrl('packages/core/src/workflow-layout.ts')) as typeof import('@ali/core/workflow-layout.ts');
  const directory = new URL('packages/core/test/fixtures/workflows/', root);
  const fonts = createFontSet(nodeFontSource());
  const prepared = [];
  for (const file of readdirSync(directory).filter((f) => f.endsWith('.json')).sort()) {
    const fixture = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
    const ctx = createWorkflowCtx();
    let workflow = emptyWorkflow();
    for (const op of fixture.ops) workflow = applyWorkflowOp(workflow, op, ctx).workflow;
    for (const lang of ['en', 'ko', 'zh'] as const) {
      const input = { workflow, catalog: loadCatalog(), models, settings: fixture.settings ?? {}, lang,
        route: async (request: Parameters<typeof routeChannels>[0]) => routeChannels(request) };
      const before = await baseline.prepareWorkflowDiagram({ ...input, layout: core.layoutWorkflow(workflow) });
      const after = await prepareWorkflowDiagram({ ...input, layout: layoutWorkflow(workflow) });
      baseline.drawWorkflowDiagram(before, fonts); drawWorkflowDiagram(after, fonts);
      prepared.push({ file, lang, before, after });
    }
  }
  for (let pass = 0; fonts.missing && pass < 5; pass++) {
    await fonts.load();
    for (const p of prepared) { baseline.drawWorkflowDiagram(p.before, fonts); drawWorkflowDiagram(p.after, fonts); }
  }
  assert.equal(fonts.missing, false);
  assert.equal(prepared.length, 96);
  for (const p of prepared) {
    const before = baseline.drawWorkflowDiagram(p.before, fonts), after = drawWorkflowDiagram(p.after, fonts);
    assert.ok(after.pages.length <= before.pages.length, `${p.file} ${p.lang}: ${before.pages.length} -> ${after.pages.length}`);
    assert.equal(after.scene.cards.length, before.scene.cards.length);
  }
});
