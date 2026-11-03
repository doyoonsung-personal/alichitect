import { AvoidLib } from 'libavoid-js';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../routing/avoid.ts';
await AvoidLib.load();
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import type { WorkflowGraph, WorkflowOp } from '@ali/core/types.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { normalizeWorkflowLayout, workflowTitle, WORKFLOW_CARD_H } from './layout-adapter.ts';
import { buildWorkflowScene, workflowCardDetails } from './scene.ts';
import { models } from './models.ts';
import { makeT } from '../i18n/t.ts';
import { planWorkflowEdges, drawWorkflowEdges, checkedWorkflowRoutes } from './edges.ts';
import { routeChannels } from '../routing/channel.ts';
const dir = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const measure = { title: (s: string, px: number) => s.length * px / 2, body: (s: string) => s.length * 6 };
function clearGeometry(wf: WorkflowGraph, raw: ReturnType<typeof layoutWorkflow>): void {
  const layout = normalizeWorkflowLayout(wf, raw, { measure: measure.title });
  const scene = buildWorkflowScene({ workflow: wf, layout, catalog: loadCatalog(), models,
    settings: {}, lang: 'en', t: makeT('en'), measure });
  const rects = [...scene.cards, ...scene.brackets];
  for (const bracket of scene.brackets) for (const card of scene.cards) {
    if (card.y >= bracket.y + bracket.h && card.x < bracket.x + bracket.w && bracket.x < card.x + card.w) {
      assert.ok(card.y - bracket.y - bracket.h >= 24, `${bracket.id}/${card.id}: bracket gap`);
    }
  }
  for (const a of rects) {
    assert.ok(Number.isInteger(a.y + a.h / 2), `Integer centre: ${a.id}`);
    for (const b of rects) if (a.id < b.id) {
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, a.id + '/' + b.id);
    }
  }
}
test('fixture corpus has all 32 workflows', () => assert.equal(files.length, 32));
for (const file of files) test('scene and routing: ' + file, () => {
  const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const ctx = createWorkflowCtx();
  let wf = emptyWorkflow(), raw = layoutWorkflow(wf);
  for (const op of fixture.ops as WorkflowOp[]) {
    wf = applyWorkflowOp(wf, op, ctx).workflow;
    raw = layoutWorkflow(wf, raw);
    clearGeometry(wf, raw);
  }
  clearGeometry(wf, layoutWorkflow(wf));
  const layout = normalizeWorkflowLayout(wf, raw, { measure: measure.title, settings: fixture.settings ?? {} });
  const scene = buildWorkflowScene({ workflow: wf, layout, catalog: loadCatalog(), models,
    settings: fixture.settings ?? {}, lang: 'en', t: makeT('en'), measure });
  assert.equal(scene.cards.length + scene.hiddenAttachmentIds.length, Object.keys(wf.nodes).length);
  for (const card of scene.cards) {
    assert.equal(layout.source.cards[card.id].h, card.h, `Adapter and scene must agree: ${card.id}`);
    assert.equal(card.w, 168);
    assert.equal(card.titlePx, 14);
    const full = workflowTitle(card.label, measure.title, card.w - 48);
    assert.ok(card.titleLines.length <= 2);
    assert.equal(card.h, WORKFLOW_CARD_H);
    if (full.lines.length <= 2) assert.deepEqual(card.titleLines, full.lines);
    else assert.ok(card.titleLines[1].endsWith('…'));
    assert.ok(card.h >= 18 + card.titleLines.length * card.titlePx * 1.25);
    if (!card.model && !card.product && !card.badges.length && !card.hidden.length && card.titleLines.length <= 2) {
      assert.equal(card.h, WORKFLOW_CARD_H);
    }
  }
  for (const a of [...scene.cards, ...scene.brackets]) for (const b of [...scene.cards, ...scene.brackets]) {
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
      if (d.loop) {
        for (const [id, end] of [[d.edge.from, d.points[0]], [d.edge.to, d.points.at(-1)!]] as const) {
          const card = scene.byId.get(id)!;
          const onSide = (end.x === card.x || end.x === card.x + card.w) && end.y >= card.y && end.y <= card.y + card.h;
          const onTopOrBottom = (end.y === card.y || end.y === card.y + card.h) && end.x >= card.x && end.x <= card.x + card.w;
          assert.ok(onSide || onTopOrBottom, `${d.id}: return arrow must touch ${id}`);
        }
      }
      for (let i = 1; i < d.points.length; i++) {
        const a = d.points[i - 1], b = d.points[i];
        if (d.loop) {
          assert.ok(a.x === b.x || a.y === b.y, `${d.id}: diagonal in return arrow`);
          const c = d.points[i + 1];
          if (c) {
            const doublesBack = (b.x - a.x) * (c.x - b.x) < 0 || (b.y - a.y) * (c.y - b.y) < 0;
            assert.ok(!doublesBack, `${d.id}: return arrow doubles back at (${b.x}, ${b.y})`);
          }
        }
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

for (const lang of ['en', 'ko', 'zh'] as const) test('C38 repeat plural: ' + lang, () => {
  const t = makeT(lang);
  assert.ok(!t('workflow.edge.loop', { n: 1 }).includes('{'));
  if (lang === 'en') {
    assert.equal(t('workflow.edge.loop', { n: 1 }), 'Repeat, up to 1 extra pass');
    assert.equal(t('workflow.edge.loop', { n: 2 }), 'Repeat, up to 2 extra passes');
  }
});

for (const lang of ['en', 'ko', 'zh'] as const) test('C30 edge semantics without invented bounds: ' + lang, async () => {
  const { workflowEdgeText } = await import('./scene.ts'), t = makeT(lang);
  const branch = { id: 'l11', from: 'human', to: 'send', kind: 'branch' as const, outcome: 'approve' as const };
  assert.equal(workflowEdgeText(branch, false, t), t('workflow.outcome.approve'));
  assert.equal(workflowEdgeText({ id: 'lr', from: 'check', to: 'draft', kind: 'loop' }, true, t), '');
  assert.equal(workflowEdgeText({ id: 'lr', from: 'check', to: 'draft', kind: 'loop', label: 'Revise', max: 2 }, true, t),
    'Revise \u00b7 ' + t('workflow.edge.loop', { n: 2 }));
});


test('fresh support-email manual branch is within 170 web units of the main row', () => {
  const fixture = JSON.parse(readFileSync(new URL('support-email-triage.json', dir), 'utf8'));
  let wf = emptyWorkflow();
  const ctx = createWorkflowCtx();
  for (const op of fixture.ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
  const layout = normalizeWorkflowLayout(wf, layoutWorkflow(wf), { measure: measure.title });
  const manual = Object.values(layout.source.cards).find((c) => wf.nodes[c.id].label === 'Resolve manually')!;
  assert.ok(manual.y > 0);
  assert.ok(manual.y <= 170);
});

for (const count of [10, 15, 25]) test(`web geometry throughout a ${count}-step synthetic stream`, () => {
  const ops: WorkflowOp[] = [];
  for (let i = 0; i < count; i++) {
    ops.push({ t: 'step', id: 'n' + i, kind: i === 3 ? 'human' : 'agent',
      label: 'A deliberately long workflow card title', ai: 'qwen-plus', turns: 5 });
    if (i) ops.push({ t: 'link', id: 'e' + i, from: 'n' + (i - 1), to: 'n' + i });
  }
  ops.push({ t: 'step', id: 'branch', kind: 'human', label: 'Review', after: 'n2' });
  ops.push({ t: 'link', id: 'branch-link', from: 'n2', to: 'branch' });
  ops.push({ t: 'link', id: 'loop', from: 'n5', to: 'n2', kind: 'loop' });
  ops.push({ t: 'step', id: 'sub', kind: 'agent', label: 'Sub agent', on: 'n1' });
  for (const host of ['n1', 'sub']) for (let i = 0; i < 4; i++) {
    ops.push({ t: 'step', id: host + 'tool' + i, kind: 'tool', label: 'Search', on: host });
  }
  let wf = emptyWorkflow(), raw = layoutWorkflow(wf);
  const ctx = createWorkflowCtx();
  for (const op of ops) {
    wf = applyWorkflowOp(wf, op, ctx).workflow;
    raw = layoutWorkflow(wf, raw, { op });
    clearGeometry(wf, raw);
  }
  clearGeometry(wf, layoutWorkflow(wf));
});


test('minimal cards leave the full repeat-bracket head clear', () => {
  const wf: WorkflowGraph = { nodes: {
    a: { id: 'a', kind: 'trigger', label: 'A' }, b: { id: 'b', kind: 'human', label: 'B', repeat: 'r' },
    c: { id: 'c', kind: 'end', label: 'C' },
  }, edges: { ab: { id: 'ab', from: 'a', to: 'b' }, ac: { id: 'ac', from: 'a', to: 'c' } },
  groups: { r: { id: 'r', over: 'Items' } } };
  clearGeometry(wf, layoutWorkflow(wf));
});


for (const lang of ['en', 'ko', 'zh'] as const) test(`uniform cards and folded details: all fixtures and long labels in ${lang}`, () => {
  const t = makeT(lang);
  const label = { en: 'A very long title with unbrokenwordsanddetails ', ko: '아주 긴 워크플로 단계 제목과 세부 정보 ',
    zh: '包含许多细节的非常长的工作流步骤标题' }[lang].repeat(30);
  for (const file of files) {
    const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const ctx = createWorkflowCtx();
    let wf = emptyWorkflow();
    for (const op of fixture.ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
    for (const stress of [false, true]) {
      const workflow = stress ? { ...wf, nodes: Object.fromEntries(Object.entries(wf.nodes).map(([id, n]) =>
        [id, { ...n, label, product: 'model-studio', ai: 'qwen-plus', turns: 50, approval: 'required' as const }])) } : wf;
      const layout = normalizeWorkflowLayout(workflow, layoutWorkflow(workflow), { measure: measure.title });
      const scene = buildWorkflowScene({ workflow, layout, catalog: loadCatalog(), models, settings: {}, lang, t, measure });
      for (const card of scene.cards) {
        assert.equal(card.h, WORKFLOW_CARD_H);
        assert.ok(card.titleLines.length <= 2);
        if (stress) {
          assert.equal(card.label, label);
          assert.equal(card.titleLines.length, 2);
          assert.ok(card.titleLines[1].endsWith('…'));
          assert.ok(workflowTitle(label, measure.title, card.w - 48).lines.length > 3, 'PDF wrapper stays unrestricted');
        }
        const details = workflowCardDetails(card, t);
        assert.equal(details.expandable, !!details.lines.length || !!card.hidden.length);
        if (stress) assert.ok(details.lines.includes(label));
        const before = JSON.stringify({ scene, layout });
        workflowCardDetails(card, t);
        assert.equal(JSON.stringify({ scene, layout }), before, 'Unfolding has no geometry input or mutation');
      }
    }
  }
});


test('PDF heights ignore the uniform canvas height and retain every folded detail', async () => {
  const { fitWorkflowPdfScene } = await import('../export/workflow-diagram.ts');
  const { workflowCardContent } = await import('../export/workflow-svg.ts');
  const workflow: WorkflowGraph = { nodes: {
    host: { id: 'host', kind: 'agent', label: 'Full detailed title '.repeat(20), product: 'model-studio',
      ai: 'qwen3.8-flash', turns: 50, effect: 'send', approval: 'required' },
    ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['t' + i,
      { id: 't' + i, kind: 'tool' as const, label: 'Tool ' + i, on: 'host' }])),
  }, edges: {}, groups: {} };
  const layout = normalizeWorkflowLayout(workflow, layoutWorkflow(workflow), { measure: measure.title });
  const scene = buildWorkflowScene({ workflow, layout, catalog: loadCatalog(), models, settings: {}, lang: 'en', t: makeT('en'), measure });
  const fonts = { width: (s: string) => s.length * 6, metrics: () => ({ ascent: 1.16, descent: .288, cap: .733 }) };
  const pdf = fitWorkflowPdfScene(scene, fonts);
  assert.deepEqual(fitWorkflowPdfScene({ ...scene, cards: scene.cards.map((c) => ({ ...c, h: 1 })) }, fonts), pdf);
  const card = pdf.byId.get('host')!;
  assert.ok(card.h > WORKFLOW_CARD_H);
  const text = workflowCardContent(card, fonts).texts.map((r) => r.value).join('').replace(/\s/g, '');
  for (const detail of [card.label, card.product!, card.model!, ...card.badges, '+2']) {
    assert.ok(text.includes(detail.replace(/\s/g, '')), detail);
  }
});
