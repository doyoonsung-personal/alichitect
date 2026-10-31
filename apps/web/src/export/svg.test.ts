import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { routeChannels } from '../routing/channel.ts';
import { createInitialState } from '../store/reducer.ts';
import { createStore } from '../store/store.ts';
import { catalog, loadFixtureFile, play } from '../test/fixtures.ts';
import type { Lang } from '../i18n/t.ts';
import { drawDiagram, routeDiagram } from './diagram.ts';
import type { RoutedDiagram } from './diagram.ts';
import type { FontSet, Run, Weight } from './fonts.ts';
import { iconMarkup } from './svg.ts';
import { iconFor } from '../icons/index.ts';

/** Fixed-width fake: every character is 0.55 em, so layout is deterministic and needs no font files. */
const fake = {
  runs: (text: string, _w: Weight): Run[] => [{ text, face: 'fake', width: Array.from(text).length * 0.55 }],
  width: (text: string, px: number, _w: Weight): number => Array.from(text).length * 0.55 * px,
  metrics: () => ({ ascent: 1.16, descent: 0.288, cap: 0.733 }),
} as unknown as FontSet;

async function routed(id: string, lang: Lang = 'en'): Promise<RoutedDiagram> {
  const store = createStore(catalog, createInitialState({ lang, canvas: { w: 1040, h: 800 }, id: 's-' + id, now: 0 }));
  play(store, loadFixtureFile(id));
  const s = store.getState();
  return routeDiagram(s.display.graph, s.display.layout!, catalog, lang, async (r) => routeChannels(r));
}

const attr = (svg: string, kind: string): string[] => [...svg.matchAll(new RegExp(`<g data-kind="${kind}" data-id="([^"]*)"`, 'g'))].map((m) => m[1]);

test('every card, badge and frame of the layout is in the SVG, and every drawn edge with it', async () => {
  const d = await routed('residency');
  const out = drawDiagram(d, fake);
  const cards = attr(out.svg, 'card');
  const badges = attr(out.svg, 'badge');
  assert.deepEqual(cards.sort(), Object.keys(d.layout.cards).sort(), 'one group per card');
  assert.deepEqual(badges.sort(), Object.keys(d.layout.badges).sort(), 'one group per badge and attachment');
  assert.deepEqual(attr(out.svg, 'frame').sort(), Object.keys(d.layout.frames).sort(), 'one group per frame');
  // edges: every planned route that the canvas shows (control edges stay hidden) is there once
  const shown = d.planned.edges.filter((e) => e.kind !== 'control' && (d.routes[e.id]?.length ?? 0) >= 2).map((e) => e.id);
  assert.deepEqual(attr(out.svg, 'edge').sort(), shown.sort());
  assert.ok(shown.length >= 10);
  // and every graph edge is accounted for by a planned route or is a hidden control edge
  const covered = new Set(d.planned.edges.flatMap((e) => e.edges));
  for (const id of Object.keys(d.graph.edges)) assert.ok(covered.has(id), `graph edge ${id} has a route`);
  assert.equal(out.counts.cards, cards.length);
  assert.equal(out.counts.badges, badges.length);
});

test('edge labels, card titles and frame labels are text elements; icons are vector paths', async () => {
  const d = await routed('residency');
  const out = drawDiagram(d, fake);
  const texts = [...out.svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  for (const e of Object.values(d.graph.edges)) {
    const planned = d.planned.edges.find((p) => p.edges.includes(e.id));
    if (e.label && planned && planned.kind !== 'control' && out.svg.includes(`data-kind="edge-label" data-id="${planned.id}"`)) assert.ok(texts.includes(e.label), `label "${e.label}" is drawn`);
  }
  for (const c of Object.values(d.layout.cards)) {
    const node = d.graph.nodes[c.id];
    const short = catalog.byId.get(c.product)!.short;
    assert.ok(texts.some((t) => t.includes(short) || (node && t.includes(node.label.split(' ')[0]))), `card ${c.id} is titled`);
  }
  assert.ok(out.svg.includes('Request path'), 'the legend is drawn');
  // each card group holds its official icon as paths in the brand orange (decorative: the name carries the meaning)
  const alb = out.svg.slice(out.svg.indexOf('data-product="alb"'));
  assert.match(alb, /<g transform="translate\([^)]*\) scale\([^)]*\)" fill="#ff6a00"><path d="/);
  assert.ok(!/<image|<foreignObject|data:image/.test(out.svg), 'vector only: no raster, no foreignObject');
});

test('the SVG is well formed and has no NaN, undefined or stray text', async () => {
  for (const [id, lang] of [['residency', 'en'], ['korean', 'ko'], ['chinese', 'zh'], ['ai-agent', 'en']] as const) {
    const out = drawDiagram(await routed(id, lang), fake);
    assert.ok(!/NaN|undefined|\[object/.test(out.svg), `${id}: no NaN or undefined`);
    const stack: string[] = [];
    for (const m of out.svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
      if (m[4] === '/') continue;
      if (m[1]) assert.equal(stack.pop(), m[2], `${id}: balanced </${m[2]}>`);
      else stack.push(m[2]);
    }
    assert.deepEqual(stack, [], `${id}: every tag is closed`);
    assert.match(out.svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="[-\d. ]+"/);
    for (const m of out.svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" font-family="([^"]+)" font-size="([\d.]+)" fill="(#[0-9a-f]{6})">/g)) assert.ok(Number.isFinite(+m[1]) && Number.isFinite(+m[2]) && +m[4] >= 8);
  }
});

test('the legend lists the four line styles the canvas legend shows', async () => {
  const d = await routed('ha');
  const out = drawDiagram(d, fake);
  const legend = out.svg.slice(out.svg.indexOf('data-kind="legend"'));
  for (const word of ['Request path', 'Data flow', 'Asynchronous', 'DNS resolution']) assert.ok(legend.includes(word));
  assert.ok(legend.includes('stroke-dasharray="5 4"') && legend.includes('stroke-dasharray="0.1 4.5"'));
});

test('icon geometry keeps its fills and sits in its box', () => {
  const g = iconFor('ecs').geometry;
  const m = iconMarkup(g, 10, 20, 20, '#ff6a00');
  assert.match(m, /^<g transform="translate\(10 20\) scale\(0\.019531\)" fill="#ff6a00">/);
});

// ---- the structure snapshot: what is drawn, in order, with ids, products and styles but no coordinates ----
function outline(svg: string): string {
  // z-order: frames, then edges, then edge labels, then cards (badges inside their cards), then the legend
  const order = [...svg.matchAll(/<g data-kind="([a-z-]+)"/g)].map((m) => m[1]);
  const rank: Record<string, number> = { frame: 0, edge: 1, 'edge-label': 2, card: 3, badge: 3, legend: 4 };
  assert.deepEqual(order, [...order].sort((x, y) => rank[x] - rank[y]), 'frames under edges under cards');
  const lines: string[] = [];
  for (const m of svg.matchAll(/<g data-kind="([a-z-]+)"(?: data-id="([^"]*)")?(?: data-product="([^"]*)")?(?: data-edge-kind="([^"]*)")?/g)) {
    lines.push([m[1], m[2], m[3] ? `product=${m[3]}` : '', m[4] ? `kind=${m[4]}` : ''].filter(Boolean).join(' '));
  }
  // the structure, not the order the layout happened to emit it in
  lines.sort();
  const counts: Record<string, number> = {};
  for (const m of svg.matchAll(/<(rect|path|text|g)\b/g)) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  lines.push('--', ...Object.entries(counts).sort().map(([k, v]) => `${k}: ${v}`));
  return lines.join('\n') + '\n';
}

test('structure snapshot of the Singapore fintech diagram', async () => {
  const out = outline(drawDiagram(await routed('residency'), fake).svg);
  const file = new URL('./__snapshots__/residency-diagram.txt', import.meta.url);
  if (process.env.UPDATE_SNAPSHOTS === '1' || !existsSync(file)) {
    mkdirSync(new URL('./__snapshots__/', import.meta.url), { recursive: true });
    writeFileSync(file, out);
  }
  assert.equal(out, readFileSync(file, 'utf8'), 'the diagram structure changed: review it, then run with UPDATE_SNAPSHOTS=1');
});
