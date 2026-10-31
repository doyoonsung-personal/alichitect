import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../store/reducer.ts';
import { createStore } from '../store/store.ts';
import type { AppState } from '../store/types.ts';
import { catalog, loadFixtureFile, play } from '../test/fixtures.ts';
import type { Lang } from '../i18n/t.ts';
import { buildProposal, defaultTitle, isoDate, modelStrings } from './model.ts';
import type { ProposalModel } from './model.ts';
import { makeXT } from './strings.ts';

const NOW = new Date(2026, 9, 31, 12, 0, 0);

function stateOf(id: string, lang: Lang = 'en'): AppState {
  const store = createStore(catalog, createInitialState({ lang, canvas: { w: 1040, h: 800 }, id: 's-' + id, now: 0 }));
  play(store, loadFixtureFile(id));
  return store.getState();
}

function modelOf(s: AppState, o: { title?: string; customer?: string } = {}): ProposalModel {
  return buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: s.lang, title: o.title, customer: o.customer, now: NOW });
}

test('a four-revision session becomes one entry per product, with its role, purpose, price and link', () => {
  const s = stateOf('residency');
  const m = modelOf(s);
  const products = new Set(Object.values(s.display.graph.nodes).map((n) => n.product));
  assert.equal(m.components.length, products.size, 'one entry per product in the diagram');
  assert.equal(new Set(m.components.map((c) => c.product)).size, m.components.length, 'no product twice');
  for (const c of m.components) {
    const e = catalog.byId.get(c.product)!;
    assert.equal(c.name, e.name, 'the official name');
    assert.equal(c.what, e.purpose, 'What it does is the catalog purpose');
    assert.ok(c.roles.length >= 1);
    assert.ok(c.roles.some((r) => r.why.length > 0) || c.roles.every((r) => r.why === ''), 'a role is the model reason or empty');
    if (e.price) assert.equal(c.price, `${e.price.summary}, as of ${e.price.asOf}`, 'a price always carries its date');
    else assert.equal(c.price, null, 'no price is invented');
  }
  // the role is the node's own why, verbatim
  const alb = Object.values(s.display.graph.nodes).find((n) => n.product === 'alb')!;
  assert.equal(m.components.find((c) => c.product === 'alb')!.roles[0].why, alb.why?.trim());
});

test('documentation links are the catalog docs field or nothing: a URL is never invented', () => {
  const m = modelOf(stateOf('residency'));
  let linked = 0;
  let missing = 0;
  for (const c of m.components) {
    const docs = catalog.byId.get(c.product)!.docs;
    if (docs) {
      assert.equal(c.docs, docs);
      assert.match(c.docs!, /^https:\/\//);
      linked++;
    } else {
      assert.equal(c.docs, null, `${c.product} has no docs field`);
      missing++;
    }
  }
  assert.ok(linked > 10, 'most products have a link');
  assert.ok(missing >= 1, 'this session draws a construct with no docs URL (Users)');
});

test('connections list every edge with its ends, label and kind', () => {
  const s = stateOf('residency');
  const m = modelOf(s);
  assert.equal(m.connections.length, Object.keys(s.display.graph.edges).length);
  const kinds = new Set(m.connections.map((c) => c.kind));
  for (const k of kinds) assert.ok(['data', 'async', 'control', 'resolve'].includes(k));
  assert.ok(m.connections.every((c) => c.from && c.to && c.kindText));
});

test('revision history keeps each ask verbatim and its change set', () => {
  const s = stateOf('residency');
  const fx = loadFixtureFile('residency');
  const m = modelOf(s);
  assert.equal(m.revisions.length, fx.turns.length);
  m.revisions.forEach((r, i) => {
    assert.equal(r.ask, fx.turns[i].ask.trim());
    assert.equal(r.n, i + 1);
    assert.ok(r.applied);
    assert.ok(r.drawn?.endsWith(' s'));
  });
  assert.ok(m.revisions[0].changes.length > 5, 'the first revision adds many cards');
  assert.ok(m.revisions[0].changes.every((c) => c.text.length > 0 && ['plus', 'minus', 'arrow', 'ring', 'info'].includes(c.mark)));
  assert.ok(m.revisions[0].changes.some((c) => c.mark === 'plus'));
});

test('the summary carries the first revision narration and the pinned requirements', () => {
  const s = stateOf('residency');
  const m = modelOf(s);
  assert.equal(m.summary.narration, s.session.revisions[0].note.trim());
  assert.ok(m.summary.requirements.length >= 1);
  assert.ok(m.summary.requirements.every((r) => r.stateText === 'Held' && r.pinned.startsWith('Pinned in revision')));
  assert.ok(m.summary.constraints.some((c) => c.includes('ap-southeast-1')), 'a pinned region reads as a constraint');
  assert.match(m.summary.facts, /products, .* connections, 4 revisions/);
});

test('cover data: title from the first ask, editable; customer optional; date and catalog date', () => {
  const s = stateOf('residency');
  const m = modelOf(s);
  assert.equal(m.title, "We're a Singapore fintech and customer data must stay in Singapore");
  assert.equal(m.customer, '');
  assert.equal(m.date, '2026-10-31');
  assert.equal(m.catalogDate, catalog.version);
  const edited = modelOf(s, { title: '  My proposal ', customer: ' Acme ' });
  assert.equal(edited.title, 'My proposal');
  assert.equal(edited.customer, 'Acme');
  assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05');
});

test('a product-need answer lists its recommendations, primary first, with prices', () => {
  const s = stateOf('ai-agent');
  const m = modelOf(s);
  assert.equal(m.mode, 'solution');
  assert.equal(m.recs.length, 3);
  assert.equal(m.recs[0].fit, 'primary');
  assert.ok(m.recs.every((r) => r.why.length > 0 && r.name));
  assert.ok(m.recs.some((r) => r.price?.includes('as of')));
  assert.equal(m.components.length, 3, 'the solution map cards are components too');
  assert.ok(m.recs.every((r) => !r.docs || r.docs.startsWith('https://')));
});

test('Korean and Chinese sessions get their own words, and the model carries every string the PDF will print', () => {
  const ko = modelOf(stateOf('korean', 'ko'));
  assert.match(ko.summary.facts, /제품/);
  assert.equal(ko.dateText, '2026년 10월 31일');
  const zh = modelOf(stateOf('chinese', 'zh'));
  assert.match(zh.summary.facts, /个产品/);
  assert.equal(zh.dateText, '2026年10月31日');
  assert.ok(modelStrings(zh).some((t) => /[一-鿿]/.test(t)));
});

test('a session whose only revision failed still makes a model (no diagram, not applied)', () => {
  const s = stateOf('stub-fatal');
  const m = modelOf(s);
  assert.equal(m.mode, 'empty');
  assert.equal(m.components.length, 0);
  assert.equal(m.revisions.length, 1);
  assert.equal(m.revisions[0].applied, false);
  assert.equal(m.revisions[0].drawn, null);
});

test('default titles: the first sentence of a long ask, the whole of a short one, a cut with an ellipsis otherwise', () => {
  const xt = makeXT('en');
  const sess = (title: string) => ({ title, revisions: [] }) as never;
  assert.equal(defaultTitle(sess('Design a web app.'), xt), 'Design a web app.');
  assert.equal(defaultTitle(sess('Design a highly available web app for us. Make it cheap. Use RDS.'), xt), 'Design a highly available web app for us');
  assert.equal(defaultTitle(sess('我们在做一个外卖应用的后端：大约 12 个微服务。团队没有 Kubernetes 经验。'), makeXT('zh')), '我们在做一个外卖应用的后端：大约 12 个微服务');
  const long = defaultTitle(sess('word '.repeat(60)), xt);
  assert.ok(long.endsWith('…') && Array.from(long).length <= 91, long);
  assert.equal(defaultTitle(sess(''), xt), 'Untitled architecture');
});
