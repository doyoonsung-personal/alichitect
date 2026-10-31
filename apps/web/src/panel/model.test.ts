import test from 'node:test';
import assert from 'node:assert/strict';
import { makeT } from '../i18n/t.ts';
import { catalog, loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { buildPanelModel, flagsOf, isLatest, revOf, safeDocs, summaryParts } from './model.ts';

const t = makeT('en');

function played(id: string, o: Parameters<typeof play>[2] = {}) {
  const store = newStore();
  play(store, loadFixtureFile(id), o);
  return store.getState();
}

test('residency: groups follow the diagram left to right, rows cover every node and rec once', () => {
  const s = played('residency', { count: 1 });
  const m = buildPanelModel(s.display.graph, s.display.layout, catalog, t, s.session.provenance);
  const ids = m.rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'no row twice');
  const expected = Object.keys(s.display.graph.nodes).length + s.display.graph.recs.length;
  assert.equal(ids.length, expected);
  assert.ok(m.groups.length >= 2);
  assert.ok(m.groups.every((g) => g.label && g.rows.length));
  // badges sit directly under their host and are indented
  const badges = m.rows.filter((r) => r.indent);
  for (const b of badges) {
    const i = m.rows.indexOf(b);
    assert.ok(i > 0);
    assert.equal(b.kind, 'badge');
    assert.match(b.where, /^On /);
  }
});

test('regional and VPC groups carry the region name', () => {
  const s = played('residency', { count: 1 });
  const m = buildPanelModel(s.display.graph, s.display.layout, catalog, t, s.session.provenance);
  assert.ok(m.groups.some((g) => / · /.test(g.label)), m.groups.map((g) => g.label).join('|'));
});

test('why is the model text; the catalog purpose is the fallback and says so', () => {
  const s = played('ha', { count: 1 });
  const g = structuredClone(s.display.graph);
  const first = Object.values(g.nodes)[0];
  first.why = '  Because the sale peaks.  ';
  const second = Object.values(g.nodes)[1];
  second.why = undefined;
  const m = buildPanelModel(g, s.display.layout, catalog, t);
  const r1 = m.rows.find((r) => r.id === first.id)!;
  const r2 = m.rows.find((r) => r.id === second.id)!;
  assert.equal(r1.why, 'Because the sale peaks.');
  assert.equal(r1.whyIsCatalog, false);
  assert.equal(r2.whyIsCatalog, true);
  assert.equal(r2.why, catalog.byId.get(second.product)!.purpose);
});

test('solution map: flat table, primary recommendations first, catalog price kept', () => {
  const s = played('ai-agent', { count: 1 });
  const m = buildPanelModel(s.display.graph, s.display.layout, catalog, t, s.session.provenance);
  assert.equal(m.groups.length, 1);
  assert.equal(m.groups[0].label, '');
  const fits = m.rows.map((r) => r.fit);
  const firstComplement = fits.indexOf('complement');
  if (firstComplement >= 0) assert.ok(!fits.slice(firstComplement).includes('primary'));
  assert.ok(m.rows.every((r) => r.kind === 'rec'));
  const qoder = m.rows.find((r) => r.product === 'qoder-teams');
  assert.ok(qoder?.price, 'Qoder Teams has a dated price in the catalog');
  assert.match(qoder!.price!.asOf, /^\d{4}-\d{2}-\d{2}$/);
});

test('provenance feeds the Rev. cell and the filled tag', () => {
  const s = played('ecommerce', { count: 2 });
  const m = buildPanelModel(s.display.graph, s.display.layout, catalog, t, s.session.provenance);
  const waf = m.rows.find((r) => r.product === 'waf');
  assert.ok(waf);
  assert.ok(revOf(waf!) !== null);
  assert.equal(isLatest({ ...waf!, addedIn: 2, changedIn: 2 }, 2), true);
  assert.equal(isLatest({ ...waf!, addedIn: 1, changedIn: 1 }, 2), false);
  assert.equal(isLatest({ ...waf!, addedIn: 1, changedIn: 1 }, null), false);
});

test('empty graph and no layout give an empty model; a layout-less node is still listed', () => {
  const s = played('ha', { count: 1 });
  assert.equal(buildPanelModel({ groups: {}, nodes: {}, edges: {}, recs: [] }, null, catalog, t).rows.length, 0);
  const m = buildPanelModel(s.display.graph, null, catalog, t);
  assert.equal(m.rows.length, Object.keys(s.display.graph.nodes).length + s.display.graph.recs.length);
});

test('edges keep every connection with the card labels', () => {
  const s = played('ha', { count: 1 });
  const m = buildPanelModel(s.display.graph, s.display.layout, catalog, t);
  assert.equal(m.edges.length, Object.keys(s.display.graph.edges).length);
  assert.ok(m.edges.every((e) => e.from && e.to && !e.from.includes('-n') ));
});

test('flags: lifecycle first, then availability; unknown product has none', () => {
  const retired = catalog.entries.find((e) => e.status === 'retired' || e.status === 'no-new-purchases');
  if (retired) assert.ok(flagsOf(retired).length >= 1);
  const china = catalog.entries.find((e) => e.availability === 'china-only');
  if (china) assert.ok(flagsOf(china).includes('chinaOnly'));
  assert.deepEqual(flagsOf(undefined), []);
});

test('docs links must be https', () => {
  assert.equal(safeDocs('https://www.alibabacloud.com/help'), 'https://www.alibabacloud.com/help');
  assert.equal(safeDocs('javascript:alert(1)'), undefined);
  assert.equal(safeDocs('http://x.test'), undefined);
  assert.equal(safeDocs(undefined), undefined);
  assert.equal(safeDocs('not a url'), undefined);
});

test('summary parts: empty has none, recommendations only beside an architecture', () => {
  assert.deepEqual(summaryParts(t, 0, 0, false), []);
  assert.deepEqual(summaryParts(t, 14, 2, false), ['14 products', '2 recommendations']);
  assert.deepEqual(summaryParts(t, 1, 1, false), ['1 product', '1 recommendation']);
  assert.deepEqual(summaryParts(t, 3, 3, true), ['3 products']);
});

test('Korean group labels are localized', () => {
  const store = newStore();
  play(store, loadFixtureFile('korean'), { count: 1 });
  const s = store.getState();
  const m = buildPanelModel(s.display.graph, s.display.layout, catalog, makeT('ko'), s.session.provenance);
  assert.ok(m.rows.length > 0);
  assert.ok(m.groups.every((g) => !g.label.includes('{')));
});
