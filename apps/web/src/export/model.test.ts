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

test('a draft becomes a narrative: paragraphs, source lines, product names from the design, drafted reasons on entries', () => {
  const s = stateOf('residency');
  const draft = {
    lang: 'en' as const,
    exec: 'First paragraph\nstill first.\n\n  Second paragraph.  \n\n',
    needs: [
      { id: 'a', need: 'Data stays in Singapore', source: 'stated' as const, quote: 'customer data must stay in Singapore', answer: 'One region.', products: ['rds', 'oss', 'rds', 'not-a-product', 'kafka'] },
      { id: 'b', need: 'Europe is slow', source: 'inferred' as const, answer: 'Global Accelerator.', products: ['ga'] },
      { id: 'c', need: 'Audit trail', source: 'general' as const, answer: 'Logs.', products: [] },
      { id: 'd', need: 'Said but not quoted', source: 'stated' as const, answer: 'x', products: [] },
    ],
    outcomes: [{ title: 'Compliance', text: 'Auditors see one boundary.' }],
    why: { alb: '  Spreads load over two zones.  ', 'not-in-design': 'x' },
    tradeoffs: [{ text: 'Costs more.', mitigation: 'Scales down at night.' }, { text: 'One region.' }],
    next: ['Workshop', ' '],
    complete: false,
  };
  const m = buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: 'en', now: NOW, draft });
  const n = m.narrative!;
  assert.deepEqual(n.exec, ['First paragraph still first.', 'Second paragraph.']);
  assert.deepEqual(n.needs.map((x) => x.sourceText), ['“customer data must stay in Singapore”', 'Implied by what you described', 'Typical for businesses like yours', 'Stated in the conversation']);
  assert.equal(n.mostlyTypical, false, 'a stated need: the page is headed "What you told us"');
  assert.deepEqual(n.needs[0].products, [catalog.byId.get('rds')!.name, catalog.byId.get('oss')!.name], 'design products only, once each, by official name');
  assert.deepEqual(n.next, ['Workshop']);
  assert.equal(m.components.find((c) => c.product === 'alb')!.draftWhy, 'Spreads load over two zones.');
  assert.equal(m.components.filter((c) => c.draftWhy).length, 1);
  // without a draft the model is exactly what it was: no narrative and no drafted reasons, not even as undefined keys
  const plain = modelOf(s);
  assert.equal('narrative' in plain, false);
  assert.ok(plain.components.every((c) => !('draftWhy' in c) && !('construct' in c)));
  assert.deepEqual(modelOf(s), buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: 'en', now: NOW, draft: null }));
});

test('the Korean and Chinese source lines use their own quotation marks and words', () => {
  for (const lang of ['ko', 'zh'] as const) {
    const s = stateOf('residency', lang);
    const m = buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang, now: NOW, draft: { lang, exec: 'x', needs: [{ id: 'a', need: 'n', source: 'stated', quote: '데이터', answer: 'a', products: [] }, { id: 'b', need: 'n', source: 'inferred', answer: 'a', products: [] }], outcomes: [], why: {}, tradeoffs: [], next: [], complete: true } });
    const xt = makeXT(lang);
    // a Korean quote in a Chinese document is marked as the customer's original wording
    assert.deepEqual(m.narrative!.needs.map((x) => x.sourceText), [lang === 'ko' ? '“데이터”' : '“데이터”（原话）', xt('needs.inferred')]);
  }
});

test('with fewer than half of the needs stated the needs page is headed as typical; with no catalog price the next steps say who estimates the cost', () => {
  const s = stateOf('residency', 'en');
  const draft = { lang: 'en' as const, exec: 'x', needs: [{ id: 'a', need: 'Traffic can change quickly', source: 'general' as const, answer: 'a', products: [] }, { id: 'b', need: 'n', source: 'inferred' as const, answer: 'a', products: [] }], outcomes: [], why: {}, tradeoffs: [], next: ['Book a proof of concept.'], complete: true };
  const m = buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: 'en', now: NOW, draft });
  assert.equal(m.narrative!.mostlyTypical, true);
  // one stated need (the one-line request itself) among three: still headed as typical
  const thin = buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: 'en', now: NOW, draft: { ...draft, needs: [{ id: 'r', need: 'A web app', source: 'stated', quote: 'customer data must stay', answer: 'a', products: [] }, ...draft.needs] } });
  assert.equal(thin.narrative!.mostlyTypical, true);
  const priced = m.components.some((c) => c.price) || m.recs.some((r) => r.price);
  assert.equal(m.narrative!.pricingNote, priced ? null : 'Pricing: your Alibaba Cloud account team will prepare a cost estimate for this design.');
  // an English quote in an English document carries no mark
  const en = buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: 'en', now: NOW, draft: { ...draft, needs: [{ id: 'a', need: 'n', source: 'stated', quote: 'stay in Singapore', answer: 'a', products: [] }] } });
  assert.deepEqual(en.narrative!.needs.map((x) => x.sourceText), ['“stay in Singapore”']);
  const ko = buildProposal({ session: s.session, graph: s.display.graph, layout: s.display.layout, catalog, lang: 'en', now: NOW, draft: { ...draft, needs: [{ id: 'a', need: 'n', source: 'stated', quote: '데이터', answer: 'a', products: [] }] } });
  assert.deepEqual(ko.narrative!.needs.map((x) => x.sourceText), ['“데이터” (original wording)']);
});
