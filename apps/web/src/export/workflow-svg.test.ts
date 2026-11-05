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
import { fanoutWorkflowFixture, inventoryWorkflowFixture, workflowFixture } from './workflow-fixtures.ts';
import { renderWorkflowSvg, workflowWindowEdges } from './workflow-svg.ts';
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
  const legend = { next: 'Next', attached: 'Attached', loop: 'Repeat', escalate: 'Escalate' };
  for (const page of d.pages.slice(1)) for (const bounds of page.windows ?? [page.bounds]) {
    const input = { scene: d.scene, edges: d.edges, bounds, fonts, legend, tile: true };
    const window = workflowWindowEdges(input);
    const tile = renderWorkflowSvg(input);
    for (const edge of d.edges) {
      const drawn = tile.svg.includes(`data-kind="edge" data-id="${edge.id}"`);
      assert.equal(drawn, window.full.includes(edge));
      if (drawn) {
        assert.ok(window.visible.has(edge.edge.from) && window.visible.has(edge.edge.to));
        for (const point of edge.points) assert.ok(contains(bounds, { ...point, w: 0, h: 0 }));
      }
      if (window.continued.includes(edge)) {
        const ref = `C${d.edges.indexOf(edge) + 1}`;
        assert.ok(tile.continuations?.some(row => row.ref === ref));
        assert.ok([...tile.svg.matchAll(/data-refs="([^"]*)"/g)].some(m => m[1].split(' ').includes(ref)));
      }
    }
    assert.match(tile.svg, /overflow="hidden"/);
    assertClearConnectors(tile.svg, d.scene.cards, bounds);
  }
});
for (const count of [20, 30]) for (const fragmented of [false, true]) {
test(`high fanout connector references remain bounded and complete: ${count}, fragmented=${fragmented}`, async () => {
  const workflow = fanoutWorkflowFixture(count, fragmented);
  const prepared = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: {}, lang: 'en', route: async r => routeChannels(r) });
  const fonts = createFontSet(nodeFontSource());
  let diagram = drawWorkflowDiagram(prepared, fonts);
  while (fonts.missing) { await fonts.load(); diagram = drawWorkflowDiagram(prepared, fonts); }
  const groupsByNode = new Map<string, Set<string>>();
  let grouped = 0;
  const legend = { next: 'Next', attached: 'Attached', loop: 'Repeat', escalate: 'Escalate' };
  for (const page of diagram.pages.slice(1)) for (const bounds of page.windows ?? [page.bounds]) {
    const input = { scene: diagram.scene, edges: diagram.edges, bounds, fonts, legend, tile: true };
    const tile = renderWorkflowSvg(input);
    assertClearConnectors(tile.svg, diagram.scene.cards, bounds);
    for (const match of tile.svg.matchAll(/<g data-kind="continuation"([^>]*)>([\s\S]*?)<\/g>/g)) {
      const marker = attrs(match[1]), box = attrs(/<rect\b([^>]*)/.exec(match[2])![1]);
      assert.ok(+box.width <= diagram.scene.byId.get(marker['data-node'])!.w - 4, 'a marker remains associated with one card');
    }
    const refs = new Set<string>();
    for (const match of tile.svg.matchAll(/<g data-kind="continuation"([^>]*)>/g)) {
      const a = attrs(match[1]), members = a['data-refs'].split(' ');
      for (const ref of members) refs.add(ref);
      const label = decode(a['data-label']);
      if (label.startsWith('G')) {
        grouped++;
        const groups = groupsByNode.get(a['data-node']) ?? new Set();
        groups.add(label); groupsByNode.set(a['data-node'], groups);
        for (const ref of members) assert.ok(tile.continuations?.find(row => row.ref === ref)?.groups?.includes(label));
      } else {
        const expanded = label.split(', ').flatMap(part => {
          const [start, end = start] = part.split('–').map(ref => Number(ref.slice(1)));
          return Array.from({ length: end - start + 1 }, (_, index) => `C${start + index}`);
        });
        assert.deepEqual(expanded, [...members].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))), 'ranges include exactly their members');
      }
    }
    for (const edge of workflowWindowEdges(input).continued) {
      const ref = `C${diagram.edges.indexOf(edge) + 1}`;
      assert.ok(refs.has(ref), `${ref} retains an endpoint marker`);
      assert.ok(tile.continuations?.some(row => row.ref === ref), `${ref} retains its connection-table row`);
    }
    for (const row of tile.continuations ?? []) for (const group of row.groups ?? []) {
      assert.ok(page.drawing.continuations?.find(r => r.ref === row.ref)?.groups?.includes(group), 'strip composition retains group membership');
    }
  }
  if (fragmented) assert.ok(grouped > 0, 'nonconsecutive references exercise the bounded group fallback');
  for (const groups of groupsByNode.values()) assert.equal(groups.size, 1, 'the shared port keeps its group ID across windows');
});
}
const dir = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
const contains = (a: Rect, b: Rect) => b.x >= a.x - .01 && b.y >= a.y - .01
  && b.x + b.w <= a.x + a.w + .01 && b.y + b.h <= a.y + a.h + .01;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const attrs = (s: string) => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
function assertClearConnectors(svg: string, cards: readonly Rect[], bounds: Rect): void {
  for (const group of svg.matchAll(/<g data-kind="continuation"[^>]*>([\s\S]*?)<\/g>/g)) {
    const a = attrs(/<rect\b([^>]*)/.exec(group[1])![1]);
    const box = { x: +a.x, y: +a.y, w: +a.width, h: +a.height };
    assert.ok(contains(bounds, box), 'continuation reference stays within the diagram view');
    for (const card of cards) assert.ok(!overlaps(box, card), 'continuation reference does not cover a node');
  }
}
test('inventory workflow keeps return loops whole and continuation references clear of node text', async () => {
  const workflow = inventoryWorkflowFixture();
  const prepared = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: {}, lang: 'ko', route: async r => routeChannels(r) });
  const fonts = createFontSet(nodeFontSource());
  let diagram = drawWorkflowDiagram(prepared, fonts);
  while (fonts.missing) { await fonts.load(); diagram = drawWorkflowDiagram(prepared, fonts); }
  assert.equal(diagram.pages.length, 3, 'one overview and two readable details');
  const loop = diagram.edges.find(e => e.loop)!;
  assert.ok(loop);
  const legend = { next: 'Next', attached: 'Attached', loop: 'Repeat', escalate: 'Escalate' };
  for (const page of diagram.pages.slice(1)) for (const bounds of page.windows ?? [page.bounds]) {
    const input = { scene: diagram.scene, edges: diagram.edges, bounds, fonts, legend, tile: true };
    const tile = renderWorkflowSvg(input);
    assertClearConnectors(tile.svg, diagram.scene.cards, bounds);
    assert.ok(workflowWindowEdges(input).full.includes(loop), 'a return path with both endpoints is kept whole when space permits');
    assert.match(tile.svg, /data-kind="repetition"/);
  }
  const bounds = { x: 0, y: 0, w: 340, h: 140 };
  const cards = diagram.scene.cards.slice(0, 3).map((c, k) => ({ ...c, id: ['a', 'b', 'outside'][k],
    x: [20, 200, 1000][k], y: 20, w: 100, h: 60 }));
  const scene = { ...diagram.scene, cards, byId: new Map(cards.map(c => [c.id, c])), brackets: [] };
  const routed = (id: string, from: string, to: string, points: {x: number; y: number}[], label = '',
    labelBox = { x: 145, y: 30, w: 40, h: 20 }) => ({ ...loop, id, edge: { ...loop.edge, from, to }, points, label, labelBox });
  const crossing = routed('crossing', 'outside', 'missing', [{ x: -100, y: 10 }, { x: 400, y: 10 }]);
  const cutLoop = routed('cut-loop', 'a', 'b', [{ x: 120, y: 50 }, { x: 120, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 50 }]);
  const hiddenLabel = routed('hidden-label', 'a', 'b', [{ x: 120, y: 50 }, { x: 200, y: 50 }], 'Approved', { x: 145, y: -30, w: 40, h: 20 });
  const complete = routed('complete', 'a', 'b', [{ x: 120, y: 50 }, { x: 200, y: 50 }]);
  const visible = workflowWindowEdges({ scene, bounds, edges: [crossing, cutLoop, hiddenLabel, complete] });
  assert.deepEqual(visible.full, [complete]);
  assert.deepEqual(visible.continued, [cutLoop, hiddenLabel], 'unowned route fragments disappear; clipped loops or labels get a reference');
});
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
  for (const page of svg.pages.filter((p) => !p.overview)) {
    assert.ok(page.drawing.counts.cards > 0);
    assert.ok(page.scale * 14 >= 11);
    for (const window of page.windows ?? [page.bounds]) {
      assert.ok(svg.scene.cards.some((c) => contains(window, c)));
      const tile = renderWorkflowSvg({ scene: svg.scene, edges: svg.edges, bounds: window, fonts,
        legend: { next: 'Next', attached: 'Attached', loop: 'Repeat', escalate: 'Escalate' }, tile: true });
      assertClearConnectors(tile.svg, svg.scene.cards, window);
    }
  }
  for (const card of svg.scene.cards) assert.ok(svg.pages.filter((p) => !p.overview)
    .some((p) => (p.windows ?? [p.bounds]).some((b) => contains(b, card))), `${card.id}: readable whole card`);
  for (const edge of svg.edges) {
    if (edge.label) for (const card of svg.scene.cards) assert.ok(!overlaps(edge.labelBox, card), `${edge.id}: label on ${card.id}`);
    for (let k = 1; k < edge.points.length; k++) {
      const a = edge.points[k - 1], b = edge.points[k];
      assert.ok(a.x === b.x || a.y === b.y, `${edge.id}: diagonal segment`);
      for (const card of svg.scene.cards.filter((c) => c.id !== edge.edge.from && c.id !== edge.edge.to)) {
        const hit = a.x === b.x
          ? a.x > card.x && a.x < card.x + card.w && Math.max(a.y, b.y) > card.y && Math.min(a.y, b.y) < card.y + card.h
          : a.y > card.y && a.y < card.y + card.h && Math.max(a.x, b.x) > card.x && Math.min(a.x, b.x) < card.x + card.w;
        assert.equal(hit, false, `${edge.id}: crosses ${card.id}`);
      }
    }
  }
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

test('PDF compaction pulls aligned rows up, preserves x and attachment slot order, and leaves label clearance', async () => {
  const workflow = workflowFixture(10);
  const prepared = await prepareWorkflowDiagram({ workflow, layout: layoutWorkflow(workflow), catalog, models,
    settings: {}, lang: 'en', route: async (r) => routeChannels(r) });
  const fonts = createFontSet(nodeFontSource());
  drawWorkflowDiagram(prepared, fonts);
  await fonts.load();
  const base = drawWorkflowDiagram(prepared, fonts).scene;
  const cards = base.cards.slice(0, 5).map((c, k) => ({ ...c, x: k === 2 ? 300 : 0,
    y: k === 0 ? 0 : k <= 2 ? 900 : (k - 1) * 900,
    node: { ...c.node, ...(k >= 3 ? { on: base.cards[1].id } : {}) } }));
  const source = { ...base, cards, brackets: [], byId: new Map(cards.map((c) => [c.id, c])) };
  const before = structuredClone(source);
  const fitted = fitWorkflowPdfScene(source, fonts);
  assert.deepEqual(source, before);
  for (const [k, card] of fitted.cards.entries()) {
    assert.equal(card.x, cards[k].x);
    assert.ok(card.y <= cards[k].y);
    for (const other of fitted.cards.slice(k + 1)) assert.ok(!overlaps(card, other));
  }
  assert.equal(fitted.cards[1].y, fitted.cards[2].y);
  assert.equal(fitted.cards[1].y, fitted.cards[0].y + fitted.cards[0].h + 44);
  for (const k of [3, 4]) assert.ok(fitted.cards[k].y >= fitted.cards[k - (k === 3 ? 2 : 1)].y
    + fitted.cards[k - (k === 3 ? 2 : 1)].h + 44);
  assert.ok(fitted.bounds.h < 900);
});

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
