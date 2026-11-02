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
test('landing uses native focus choice before submit and hides cloud examples', () => {
  const source = readFileSync(new URL('../landing/Landing.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('type="radio"')); assert.ok(source.includes('c.setMode(value)'));
  assert.ok(source.includes("hidden={mode === 'workflow'}"));
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
