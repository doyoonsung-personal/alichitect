// End to end in Node: a recorded conversation goes through the reducer, the exporter makes a PDF, and pdf.js reads it
// back. Nothing here trusts the generator's own report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateProposalPdf } from '../../src/export/generate.ts';
import { nodeFontSource } from '../../src/export/fonts-node.ts';
import { avoidRoute, catalog, generateFromState, logoFor, playFixture } from './node-env.ts';
import { bigGraph } from './big.ts';
import { checkPdf } from './checks.ts';
import { inspectPdf, pageOps } from './inspect.ts';

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
  assert.ok(info.pages.length >= 5);
  assert.ok(info.text.includes('There is no diagram yet.'));
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
