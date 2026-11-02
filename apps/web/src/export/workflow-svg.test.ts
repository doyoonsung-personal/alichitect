import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Font } from 'fontkit';
import type { Rect } from '@ali/core/layout.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import type { WorkflowOp } from '@ali/core/types.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { catalog } from '../test/fixtures.ts';
import { models } from '../workflow/models.ts';
import { routeChannels } from '../routing/channel.ts';
import { createFontSet } from './fonts.ts';
import { nodeFontSource } from './fonts-node.ts';
import { prepareWorkflowDiagram, drawWorkflowDiagram, fitWorkflowPdfScene } from './workflow-diagram.ts';
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
  const title = [...d.svg.matchAll(/<text[^>]*font-size="14"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
  assert.match(title, /&lt;review\s+&amp;\s+respond&gt;/);
  assert.doesNotMatch(title, /[<>]|&(?!lt;|amp;|gt;|quot;)/);
  assert.match(d.svg, /stroke-dasharray/);
  assert.match(d.svg, /Needs review/);
  assert.match(d.svg, /Limit reached/);
  assert.doesNotMatch(d.svg, /foreignObject|<image|<style/);
  for (const id of Object.keys(prepared.input.layout.cards)) {
    assert.ok(d.pages.slice(1).some((p) => p.drawing.svg.includes(`data-id="${id}"`)), id);
  }
});
const dir = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
const contains = (a: Rect, b: Rect) => b.x >= a.x - .01 && b.y >= a.y - .01
  && b.x + b.w <= a.x + a.w + .01 && b.y + b.h <= a.y + a.h + .01;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const attrs = (s: string) => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) for (const lang of ['en', 'ko', 'zh'] as const) {
test(`SVG fixture: ${file} ${lang}`, async () => {
  const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const ctx = createWorkflowCtx(); let workflow = emptyWorkflow();
  for (const op of fixture.ops as WorkflowOp[]) workflow = applyWorkflowOp(workflow, op, ctx).workflow;
  const d = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: fixture.settings ?? {}, lang, route: async (r) => routeChannels(r) });
  const fonts = createFontSet(nodeFontSource());
  let svg = drawWorkflowDiagram(d, fonts);
  for (let pass = 0; fonts.missing && pass < 5; pass++) { await fonts.load(); svg = drawWorkflowDiagram(d, fonts); }
  assert.equal(fonts.missing, false);
  const faces = new Map<string, Font>();
  fonts.register({ registerFont: (name, font) => faces.set(name, font) });
  assert.equal(svg.counts.cards, Object.keys(d.input.layout.cards).length);
  assert.ok(svg.width > 0 && svg.height > 0);
  const rects = [...svg.scene.cards, ...svg.scene.brackets];
  for (let i = 0; i < rects.length; i++) for (const b of rects.slice(i + 1)) {
    assert.ok(!overlaps(rects[i], b), `${rects[i].id} overlaps ${b.id}`);
  }
  for (const c of svg.scene.cards) {
    const start = svg.svg.indexOf(`<g data-kind="card" data-id="${c.id}">`);
    const tail = svg.svg.slice(start);
    let depth = 0, end = 0;
    for (const m of tail.matchAll(/<\/?g\b[^>]*>/g)) {
      depth += m[0].startsWith('</') ? -1 : 1;
      if (!depth) { end = m.index + m[0].length; break; }
    }
    const card = tail.slice(0, end);
    assert.ok(card.length);
    for (const m of card.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
      const a = attrs(m[1]), face = faces.get(a['font-family'])!;
      assert.ok(face, 'every text run uses a loaded export font');
      const px = +a['font-size'], scale = px / face.unitsPerEm;
      const text = decode(m[2]);
      assert.ok(contains(c, { x: +a.x, y: +a.y - face.ascent * scale,
        w: face.layout(text).advanceWidth * scale, h: (face.ascent - face.descent) * scale }), `${c.id}: ${text}`);
    }
    for (const m of card.matchAll(/<rect\b([^>]*)/g)) {
      const a = attrs(m[1]);
      if (a.fill !== '#f1f5f9' && a.fill !== '#ffffff') continue;
      assert.ok(contains(c, { x: +a.x, y: +a.y, w: +a.width, h: +a.height }), `${c.id}: chip`);
    }
    if (c.approval) {
      const lock = /<path d="M([\d.-]+) ([\d.-]+) v-3 a3 3 0 0 1 6 0 v3 m-8 0 h10 v8 h-10 Z"/.exec(card);
      assert.ok(lock, `${c.id}: lock drawn`);
      assert.ok(contains(c, { x: +lock[1] - 2, y: +lock[2] - 6, w: 10, h: 14 }), `${c.id}: lock`);
    }
    if (c.kind === 'human') {
      const clock = [...card.matchAll(/<circle\b([^>]*)/g)].map((m) => attrs(m[1])).find((a) => a.r === '7');
      assert.ok(clock, `${c.id}: clock drawn`);
      assert.ok(contains(c, { x: +clock.cx - 7, y: +clock.cy - 7, w: 14, h: 14 }), `${c.id}: clock`);
    }
  }
  assert.equal(svg.edges.length, Object.values(d.input.workflow.edges).filter((e) =>
    svg.scene.byId.has(e.from) && svg.scene.byId.has(e.to)).length
    + svg.scene.cards.filter((c) => c.node.on && svg.scene.byId.has(c.node.on)).length);
  for (const e of svg.edges) for (const [id, p] of [[e.edge.from, e.points[0]], [e.edge.to, e.points.at(-1)!]] as const) {
    const c = svg.scene.byId.get(id)!;
    assert.ok(contains(c, { ...p, w: 0, h: 0 }), `${e.id}: final port on ${id}`);
    assert.ok(p.x === c.x || p.x === c.x + c.w || p.y === c.y || p.y === c.y + c.h);
  }
});
}

test('PDF fitting moves lower cards and brackets without mutating the web scene', async () => {
  const workflow = workflowFixture(10);
  const d = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: {}, lang: 'en', route: async (r) => routeChannels(r) });
  const fonts = createFontSet(nodeFontSource());
  const base = drawWorkflowDiagram(d, fonts).scene;
  const cards = base.cards.slice(0, 2).map((c, k) => ({ ...c, x: 0, y: k * 40,
    label: k ? c.label : 'A long title that needs multiple lines '.repeat(8) }));
  const source = { ...base, cards, byId: new Map(cards.map((c) => [c.id, c])),
    brackets: [{ id: 'repeat:test', group: 'test', label: 'Repeat', nodes: cards.map((c) => c.id), x: 0, y: 80, w: 200, h: 24 }] };
  const before = structuredClone(source);
  fitWorkflowPdfScene(source, fonts);
  await fonts.load();
  const fitted = fitWorkflowPdfScene(source, fonts);
  assert.deepEqual(source, before);
  assert.ok(fitted.cards[0].h > 40);
  assert.ok(fitted.cards[1].y >= fitted.cards[0].y + fitted.cards[0].h + 24);
  assert.ok(fitted.brackets[0].y >= fitted.cards[1].y + fitted.cards[1].h + 24);
  assert.ok(fitted.bounds.h >= fitted.brackets[0].y + fitted.brackets[0].h);
});
