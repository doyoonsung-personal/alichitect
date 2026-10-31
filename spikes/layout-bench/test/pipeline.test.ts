// The replay trace on a tiny hand-written session, the variant loader, and the display hold-back rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { emptyGraph } from '../../../packages/core/src/reducer.ts';
import type { Graph } from '../../../packages/core/src/types.ts';
import { buildTrace } from '../src/trace.ts';
import type { SessionSpec } from '../src/inputs.ts';
import { loadProbeSessions, parseContent } from '../src/inputs.ts';
import { cardIds, displayDuringTurn, spikeDisplay } from '../src/display.ts';
import { checkState, loadLayout } from '../src/layouts.ts';
import { runLayout } from '../src/runner.ts';

const catalog = loadCatalog();
const CONTENT = [
  '{"t":"say","text":"A small web app."}',
  '{"t":"group","id":"sg","kind":"region","label":"Singapore","parent":null}',
  '{"t":"group","id":"vpc","kind":"vpc","label":"App VPC","parent":"sg"}',
  '{"t":"node","id":"users","product":"users","label":"Users","group":null}',
  '{"t":"node","id":"alb","product":"alb","label":"ALB","group":"vpc"}',
  '{"t":"node","id":"ecs","product":"ecs","label":"App servers","group":"vpc"}',
  '{"t":"edge","id":"e1","from":"users","to":"alb"}',
  '{"t":"edge","id":"e2","from":"alb","to":"ecs"}',
  'this line is not json',
  '{"t":"done","summary":"ok"}',
].join('\n');

const session = (): SessionSpec => ({ id: 'test:web#1', source: 'final', case: 'web', category: 'pattern', base: null, turns: [{ index: 0, raws: parseContent(CONTENT), validated: false, count: true, first: true }] });

test('parseContent drops bad lines and keeps op objects in order', () => {
  const raws = parseContent(CONTENT) as Array<{ t: string }>;
  assert.equal(raws.length, 9);
  assert.equal(raws[0].t, 'say');
  assert.equal(raws[8].t, 'done');
});

test('op batching gives one frame per graph-changing op plus the commit', () => {
  const tr = buildTrace([session()], catalog, 'op');
  const frames = tr.sessions[0].frames;
  // group, group, node, node, node, edge, edge change the graph; say and done do not
  assert.equal(frames.filter((f) => f.kind === 'mid').length, 7);
  assert.equal(frames[frames.length - 1].kind, 'commit');
  assert.deepEqual(Object.keys(frames[frames.length - 1].display.nodes).sort(), ['alb', 'ecs', 'users']);
  assert.equal(tr.exceptions.length, 0);
});

test('turn batching gives one mid frame and the commit', () => {
  const tr = buildTrace([session()], catalog, 'turn');
  assert.deepEqual(tr.sessions[0].frames.map((f) => f.kind), ['mid', 'commit']);
});

test('a base session starts with an uncounted base frame', () => {
  const base: Graph = buildTrace([session()], catalog, 'turn').sessions[0].frames[1].display;
  const s: SessionSpec = { ...session(), id: 'test:edit#1', base, turns: [{ index: 0, raws: parseContent('{"t":"remove","id":"ecs"}\n{"t":"done","summary":"x"}'), validated: false, count: true, first: false }] };
  const frames = buildTrace([s], catalog, 'op').sessions[0].frames;
  assert.equal(frames[0].kind, 'base');
  assert.equal(frames[0].count, false);
  assert.ok(!('ecs' in frames[frames.length - 1].display.nodes));
});

test('display hold-back keeps an untouched new card off the canvas until the turn ends', () => {
  const g = buildTrace([session()], catalog, 'turn').sessions[0].frames[1].display;
  const shown = new Set(['users', 'alb']);
  const d = displayDuringTurn({ working: g, catalog, prevCards: shown, shownAtTurnStart: shown, touched: new Set() });
  assert.deepEqual(d.held, ['ecs']);
  assert.ok(!('e2' in d.graph.edges));
  const none = displayDuringTurn({ working: g, catalog, prevCards: null, shownAtTurnStart: new Set(), touched: new Set() });
  assert.deepEqual(none.held, []);
  assert.deepEqual([...cardIds(emptyGraph())], []);
});

test('the template variant reproduces the core layout frame for frame', async () => {
  const core = await loadLayout('core');
  const variant = await loadLayout(fileURLToPath(new URL('../variants/example-core.ts', import.meta.url)));
  assert.equal(variant.name, 'example-core');
  assert.deepEqual(variant.METRICS, core.METRICS);
  const tr = buildTrace([session()], catalog, 'op');
  const table = { styles: Object.fromEntries(['title', 'subtitle', 'frame', 'caption', 'attach'].map((k) => [k, { widths: { n: 0.6 }, cjk: { hangul: 1, han: 1, kana: 1 } }])) };
  const opts = { routes: 'none' as const, avoid: null, snapshots: new Set<string>(['test:web#1@0']) };
  const a = runLayout(tr, core, catalog, table, { w: 1040, h: 800 }, opts);
  const b = runLayout(tr, variant, catalog, table, { w: 1040, h: 800 }, opts);
  assert.deepEqual(b.size, a.size);
  assert.deepEqual(b.snapshots.get('test:web#1@0')!.layout, a.snapshots.get('test:web#1@0')!.layout);
});

test('checkState rejects a state without slots', () => {
  const bad = { cards: { a: { id: 'a', x: 0, y: 0, w: 1, h: 1 } }, frames: {}, badges: {} } as unknown as Parameters<typeof checkState>[0];
  assert.throws(() => checkState(bad, 'x'), /slot and frame/);
});

test('the core display rule and the spike copy give the same frames on the probe streams', () => {
  const specs = loadProbeSessions();
  const a = buildTrace(specs, catalog, 'op');
  const b = buildTrace(specs, catalog, 'op', 'repaired', spikeDisplay);
  assert.equal(a.sessions.length, b.sessions.length);
  for (let i = 0; i < a.sessions.length; i++) {
    assert.equal(a.sessions[i].frames.length, b.sessions[i].frames.length);
    a.sessions[i].frames.forEach((f, k) => {
      assert.deepEqual(f.display, b.sessions[i].frames[k].display, `${a.sessions[i].spec.id} frame ${k}`);
      assert.equal(f.held, b.sessions[i].frames[k].held);
    });
  }
});
