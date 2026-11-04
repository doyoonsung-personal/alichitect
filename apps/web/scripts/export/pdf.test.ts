// End to end in Node: a recorded conversation goes through the reducer, the exporter makes a PDF, and pdf.js reads it
// back. Nothing here trusts the generator's own report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateProposalPdf } from '../../src/export/generate.ts';
import { nodeFontSource } from '../../src/export/fonts-node.ts';
import { avoidRoute, catalog, generateFromState, loadDraft, logoFor, playFixture } from './node-env.ts';
import { bigGraph } from './big.ts';
import { HIDDEN, checkPdf } from './checks.ts';
import { inspectPdf, pageOps } from './inspect.ts';
import { calculateSolutionEstimate, pricingDesignKey } from '@ali/core/solution-pricing.ts';

test('a proposal prints the reviewed pricing, but a changed design withholds its old figures', async () => {
  const state = playFixture('residency', 'en').getState();
  state.session.pricing = { messages: [], designKey: pricingDesignKey(state.session.memory),
    estimate: calculateSolutionEstimate({ items: [
      { label: 'Planned servers', period: 'monthly', quantity: 1460, quantityNote: 'Two servers at 730 hours',
        unit: 'hour', unitUsd: .23, basis: 'user', source: 'Customer agreement' },
      { label: 'Migration assistance', period: 'one-time', quantity: 8, unit: 'hour', unitUsd: 85, basis: 'assumption', source: 'Planning input' },
    ], assumptions: ['One migration window'], unknowns: ['Egress charge not confirmed'] }) };
  const draft = { ...loadDraft('residency-en'), cost: 'Confirm the egress charge before choosing the migration window.' };
  const result = await generateFromState(state, { draft });
  const page = (await inspectPdf(result.bytes)).pages.find(p => p.text.includes('Solution price breakdown'))!;
  const words = page.text.replace(/\s+/g, ' ');
  assert.ok(!words.includes('One migration window'), 'internal assumptions are input to the writer');
  for (const value of ['USD 335.8', 'USD 680', 'Customer agreement', 'Egress charge not confirmed', draft.cost]) {
    assert.ok(words.includes(value), `missing ${value}`);
  }
  state.session.pricing.designKey += '0';
  const stale = await inspectPdf((await generateFromState(state, { draft })).bytes);
  assert.match(stale.text, /design changed after pricing/);
  assert.doesNotMatch(stale.text, /USD 335\.8|USD 680|Customer agreement|Confirm the egress charge/);
});

test('English: a four-revision session makes a complete, checkable PDF', async () => {
  const state = playFixture('residency', 'en').getState();
  const r = await generateFromState(state, { title: 'Customer portal', customer: 'Acme Pay Pte Ltd' });
  assert.equal(r.fileName, 'Customer-portal-architecture-proposal-2026-10-31.pdf');
  const check = await checkPdf(r.bytes, state, { title: 'Customer portal', customer: 'Acme Pay Pte Ltd' });
  assert.deepEqual(check.problems, []);
  assert.equal(check.info.title, 'Customer portal');
  const pages = check.info.pages;
  assert.ok(pages.length >= 8 && pages.length <= 12, `${pages.length} pages`);
  assert.deepEqual([pages[0].width, pages[0].height], [595, 842], 'the cover is A4 portrait');
  assert.ok(pages[2].width > pages[2].height, 'the diagram page is landscape');
  // the order of the sections
  const order = ['Summary', 'Architecture diagram', 'Components', 'Connections', 'Revision history'].map((h) => pages.findIndex((p) => p.text.includes(h)));
  assert.ok(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), `section pages in order: ${order.join(',')}`);
  assert.ok(pages[0].text.includes('AI-generated. Review with a solutions architect before you build.'));
  assert.ok(check.info.text.includes('Documentation link not yet available'), 'a product with no docs URL says so');
  assert.equal(check.summary.missingDocs, 1);
});

test('the diagram page is vector: paths and text, no raster image', async () => {
  const state = playFixture('residency', 'en').getState();
  const r = await generateFromState(state);
  const ops = await pageOps(r.bytes, 3);
  assert.equal(ops.images, 0, 'no raster on the diagram page');
  assert.ok(ops.paths > 100, `${ops.paths} path constructions`);
  assert.ok(ops.texts > 40, `${ops.texts} text runs`);
  const info = await inspectPdf(r.bytes);
  for (const word of ['ALB', 'Portal servers', 'Customer DB', 'Request path']) assert.ok(info.pages[2].text.includes(word), `diagram text has ${word}`);
  // the cover's logo is vector too
  assert.equal((await pageOps(r.bytes, 1)).images, 0);
});

test('only the glyphs a document uses are embedded: a Latin proposal pulls in three Latin faces, nothing CJK', async () => {
  const state = playFixture('ha', 'en').getState();
  const r = await generateFromState(state);
  assert.equal(r.report.faces, 3);
  assert.ok(r.report.fontBytes < 120_000);
  assert.ok(r.bytes.length < 150_000, `${r.bytes.length} bytes`);
});

test('Korean: Hangul text, a CJK font, and every check passes', async () => {
  const state = playFixture('korean', 'ko').getState();
  const r = await generateFromState(state, { title: '음식 배달 앱 제안서', customer: '한빛푸드' });
  const check = await checkPdf(r.bytes, state, { title: '음식 배달 앱 제안서', customer: '한빛푸드' });
  assert.deepEqual(check.problems, []);
  assert.ok(/[가-힣]{4,}/u.test(check.info.text.replace(/\s/g, '')));
  assert.ok(r.report.faces > 3, 'Hangul slices were loaded');
  assert.ok(r.report.fontBytes < 2_000_000);
  assert.equal(r.fileName, '음식-배달-앱-제안서-architecture-proposal-2026-10-31.pdf');
});

test('Chinese: simplified characters render with the Chinese family, and every check passes', async () => {
  const state = playFixture('chinese', 'zh').getState();
  const r = await generateFromState(state, { title: '外卖应用后端架构方案', customer: '星河餐饮有限公司' });
  const check = await checkPdf(r.bytes, state, { title: '外卖应用后端架构方案', customer: '星河餐饮有限公司' });
  assert.deepEqual(check.problems, []);
  const text = check.info.text.replace(/\s/g, '');
  for (const word of ['摘要', '修订历史', '连接', '组件', '星河餐饮有限公司']) assert.ok(text.includes(word), word);
  assert.ok(r.report.faces > 3);
});

test('a product-need answer gets a recommendations page with dated prices and links', async () => {
  const state = playFixture('ai-agent', 'en').getState();
  const r = await generateFromState(state);
  const check = await checkPdf(r.bytes, state);
  assert.deepEqual(check.problems, []);
  assert.equal(check.model.mode, 'solution');
  const recPage = check.info.pages.find((p) => p.text.includes('Recommendations'))!;
  assert.ok(recPage.text.includes('Recommended') && recPage.text.includes('Optional'));
  assert.ok(/as of 2026-10-31/.test(recPage.text.replace(/\s+/g, ' ')), 'prices carry their date');
  assert.ok(recPage.links.length >= 3);
});

test('a session with nothing drawn still exports a valid, honest document', async () => {
  const state = playFixture('stub-fatal', 'en').getState();
  const r = await generateFromState(state);
  const info = await inspectPdf(r.bytes);
  assert.ok(info.pages.length < 5);
  assert.ok(!info.text.includes('There is no diagram yet.'));
  assert.ok(!info.pages.some(page => page.width > page.height));
  assert.ok(info.text.includes('This revision was not applied.'));
  assert.equal(info.links.length, 0);
});

test('a 25-plus-card diagram takes under 3 s from click to bytes', async () => {
  const state = playFixture('ecommerce', 'en').getState();
  const { graph, layout } = bigGraph(state, 26);
  assert.ok(Object.keys(layout.cards).length >= 25, `${Object.keys(layout.cards).length} cards`);
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await generateProposalPdf({
      session: state.session,
      graph,
      layout,
      catalog,
      lang: 'en',
      title: 'Large design',
      customer: '',
      now: new Date(2026, 9, 31),
      fontSource: nodeFontSource(),
      route: avoidRoute,
      logo: logoFor('en'),
    });
    times.push(r.report.totalMs);
    assert.ok(r.report.pages >= 8);
  }
  assert.ok(Math.max(...times) < 3000, `times ${times.join(', ')} ms`);
});

test('a diagram too tall for A4 at a readable scale moves to an A3 sheet instead of shrinking', async () => {
  const state = playFixture('ecommerce', 'en').getState();
  const { graph, layout } = bigGraph(state, 26);
  const r = await generateProposalPdf({ session: state.session, graph, layout, catalog, lang: 'en', title: 'Large', customer: '', now: new Date(2026, 9, 31), fontSource: nodeFontSource(), route: avoidRoute, logo: logoFor('en') });
  assert.equal(r.report.diagramPage?.size, 'A3');
  assert.ok(r.report.diagramPage!.scale >= 0.62);
  const info = await inspectPdf(r.bytes);
  assert.deepEqual([info.pages[2].width, info.pages[2].height], [1191, 842]);
});

// The owner's rule: nothing a browser can download shows that a second pass finished a turn the content filter stopped.
// A proposal made from a finished revision reads like any other, and no byte of it (text, revision history, document
// information, font names) spells the backup's vendor or its model family.
test('a proposal from a revision that was finished after a content-filter stop names nobody', async () => {
  const hidden = new RegExp(['cl' + 'aude', 'anth' + 'ropic'].join('|'), 'i');
  for (const id of ['stub-rescue-continue', 'stub-rescue-whole', 'stub-rescue-incomplete']) {
    const state = playFixture(id, 'en').getState();
    const r = await generateFromState(state, { title: 'Web tier', customer: 'Acme' });
    const info = await inspectPdf(r.bytes);
    assert.ok(info.text.includes('Revision history'), `${id}: the revision history is in the PDF`);
    assert.doesNotMatch(info.text, hidden, `${id}: page text`);
    assert.doesNotMatch(info.title, hidden, `${id}: title`);
    assert.doesNotMatch(Buffer.from(r.bytes).toString('latin1'), hidden, `${id}: raw bytes (document information, font names)`);
    assert.doesNotMatch(r.fileName, hidden, `${id}: file name`);
    // the history lists the revision as an ordinary one: no attribution, no mention of a filter or a second pass
    assert.doesNotMatch(info.text, /content[- ]filter|finished by|second pass/i, `${id}: no attribution`);
  }
});

// ---------- with a drafted narrative (POST /api/proposal) ----------


test('the handoff keeps the client recommendation and the real connections without the work log', async () => {
  const state = playFixture('residency', 'en').getState();
  const draft = loadDraft('residency-en');
  const r = await generateFromState(state, { title: 'Customer portal', customer: 'Acme Pay Pte Ltd', draft });
  const check = await checkPdf(r.bytes, state, { title: 'Customer portal', customer: 'Acme Pay Pte Ltd', draft });
  assert.deepEqual(check.problems, [], 'sections in order, every need, quote and reason present, links resolve, nothing overflows');
  const text = check.info.text;
  assert.ok(text.includes('“customer data must stay in Singapore”'), 'a stated need quotes the customer');
  assert.ok(!text.includes('Role in this design'), "components lead with Why it's here instead");
  assert.equal((text.match(/Why it's here/g) ?? []).length, check.model.components.length, 'every component entry leads with it');
  assert.ok(text.includes('Connections'));
  for (const h of ['Design record', 'Pinned requirements', 'Revision history']) assert.ok(!text.includes(h), h);
  assert.equal(check.summary.links, check.summary.expectedLinks, 'the documentation links all resolve');
  assert.equal(r.fileName, 'Customer-portal-architecture-proposal-2026-10-31.pdf');
});

test('without a draft the document is exactly the basic one: same pages, same text, same links', async () => {
  const state = playFixture('residency', 'en').getState();
  const a = await inspectPdf((await generateFromState(state, { title: 'T', customer: 'C' })).bytes);
  const b = await inspectPdf((await generateFromState(state, { title: 'T', customer: 'C', draft: null })).bytes);
  assert.deepEqual(b.pages.map((p) => [p.width, p.height, p.text, p.links]), a.pages.map((p) => [p.width, p.height, p.text, p.links]));
  assert.ok(a.pages[1].text.includes('Summary'), 'the summary is still page 2');
  assert.ok(!a.text.includes('Executive summary') && !a.text.includes('Why it') && !a.text.includes('Design record'));
});

test("Korean and Chinese drafts: CJK text, quotes in the customer's words, every check passes", async () => {
  for (const [fx, lang, id, customer] of [['korean', 'ko', 'korean-ko', '한빛푸드'], ['chinese', 'zh', 'chinese-zh', '星河餐饮有限公司']] as const) {
    const state = playFixture(fx, lang).getState();
    const draft = loadDraft(id);
    const r = await generateFromState(state, { title: fx, customer, draft });
    const check = await checkPdf(r.bytes, state, { title: fx, customer, draft });
    assert.deepEqual(check.problems, [], lang);
    const quote = draft.needs.find((n) => n.quote)!.quote!;
    assert.ok(check.info.text.replace(/\s+/g, '').includes(quote.replace(/\s+/g, '')), `${lang}: the quote is printed`);
  }
});

test('a long draft paginates cleanly: no overflow, no orphaned sub-heading, every part present', async () => {
  const state = playFixture('ecommerce', 'en').getState();
  const draft = loadDraft('ecommerce-en-long');
  const r = await generateFromState(state, { title: 'Cross-border e-commerce', customer: 'Lumen Retail Group', draft });
  const check = await checkPdf(r.bytes, state, { title: 'Cross-border e-commerce', customer: 'Lumen Retail Group', draft });
  assert.deepEqual(check.problems, []);
  assert.ok(check.info.pages.length >= 10, `${check.info.pages.length} pages`);
});

test("a product the draft gave no reason for keeps the drawing's reason under Why it's here; a recommendation takes the drafted why", async () => {
  const state = playFixture('residency', 'en').getState();
  const draft = { ...loadDraft('residency-en'), why: {} };
  const r = await generateFromState(state, { draft });
  const check = await checkPdf(r.bytes, state, { draft });
  assert.deepEqual(check.problems, []);
  const alb = Object.values(state.display.graph.nodes).find((n) => n.product === 'alb')!;
  assert.ok(check.info.text.includes(alb.why!), "the drawing model's reason stands in");

  const sol = playFixture('ai-agent', 'en').getState();
  const recDraft = { lang: 'en' as const, exec: 'Fifteen developers get an agent.', needs: [], outcomes: [], why: { 'qoder-teams': 'Your fifteen developers share one admin console and single sign-on.' }, tradeoffs: [], next: [], complete: false };
  const rr = await generateFromState(sol, { draft: recDraft });
  const rc = await checkPdf(rr.bytes, sol, { draft: recDraft });
  assert.deepEqual(rc.problems, []);
  const recPage = rc.info.pages.find((p) => p.text.includes('Recommendations'))!;
  assert.ok(recPage.text.includes('Your fifteen developers share one admin console'), 'the recommendation leads with the drafted why');
  assert.ok(!rc.info.text.includes('What you told us'), 'no needs page when the draft has no needs');
});

test('a drafted proposal names nobody: no hidden word in its text, title, bytes or file name', async () => {
  for (const [fx, lang, id] of [['residency', 'en', 'residency-en'], ['korean', 'ko', 'korean-ko'], ['chinese', 'zh', 'chinese-zh'], ['ecommerce', 'en', 'ecommerce-en-long']] as const) {
    const r = await generateFromState(playFixture(fx, lang).getState(), { title: 'Web tier', customer: 'Acme', draft: loadDraft(id) });
    const info = await inspectPdf(r.bytes);
    assert.doesNotMatch(info.text, HIDDEN, `${id}: text`);
    assert.doesNotMatch(Buffer.from(r.bytes).toString('latin1'), HIDDEN, `${id}: bytes`);
    assert.doesNotMatch(r.fileName, HIDDEN);
  }
});
