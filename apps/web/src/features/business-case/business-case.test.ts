import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSessionRecord } from '../../store/reducer.ts';
import { pricingDesignKey } from '@ali/core/solution-pricing.ts';
import { calculateBusinessCase, defaultInputs, validateDocument } from '../../../../../packages/business-case/src/engine.ts';
import type { BusinessCaseDocument } from '../../../../../packages/business-case/src/types.ts';
import { captureSource, refreshSource, sourceChanged } from './source.ts';
import { BusinessCaseError, deleteVersion, explainCase, listAllVersions, listVersions, parseRecord, parseRecords, parseVersionSummaries, saveVersion } from './api.ts';
import { businessCaseBodyHtml, businessCaseHtml } from './print.ts';
import { en, makeText } from './strings.ts';
import translations from './translations.json' with { type: 'json' };

const fixture = () => {
  const session = newSessionRecord('business-case-test', 100);
  session.title = 'Inventory planning';
  session.memory.turns = [{ role: 'user', text: 'Help our retail team reduce manual inventory work.' }];
  session.pricing = { designKey: pricingDesignKey(session.memory), messages: [], estimate: {
    currency: 'USD', monthlyUsd: 400, oneTimeUsd: null, items: [], assumptions: ['Regional rates require review.'], unknowns: ['Migration effort is unpriced.'],
  } };
  return session;
};
const documentFixture = async (): Promise<BusinessCaseDocument> => ({ schemaVersion: 1, source: await captureSource(fixture(), 1234), inputs: defaultInputs() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('source captures current USD evidence, withholds stale prices, and never mutates the host session', async () => {
  const session = fixture();
  const before = structuredClone(session);
  const current = await captureSource(session, 1234);
  assert.equal(current.estimateStatus, 'current');
  assert.equal(current.monthlyUsd, 400);
  assert.equal(current.oneTimeUsd, null);
  assert.deepEqual(current.caveats, ['Migration effort is unpriced.', 'Regional rates require review.']);
  assert.match(current.designFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(session, before);
  session.memory.requirements.push('Use a second region');
  const stale = await captureSource(session, 1235);
  assert.equal(stale.estimateStatus, 'stale');
  assert.equal(stale.monthlyUsd, null);
  assert.equal(stale.oneTimeUsd, null);
  assert.equal(sourceChanged(current, stale), true);
  delete session.pricing;
  const missing = await captureSource(session, 1236);
  assert.equal(missing.estimateStatus, 'missing');
  assert.equal(missing.monthlyUsd, null);
});

test('source detects repricing without a changed design; explicit refresh preserves customer inputs and overrides', async () => {
  const session = fixture();
  const document: BusinessCaseDocument = { schemaVersion: 1, source: await captureSource(session, 1234), inputs: defaultInputs() };
  document.inputs.monthlyCostOverrideUsd = 350;
  document.inputs.costOverrideReason = 'Customer supplied a contracted rate.';
  document.inputs.manualHoursMonthly = 200;
  session.pricing!.estimate.monthlyUsd = 500;
  const latest = await captureSource(session, 1235);
  assert.equal(latest.designFingerprint, document.source.designFingerprint);
  assert.equal(sourceChanged(document.source, latest), true);
  const refreshed = refreshSource(document, latest);
  assert.deepEqual(refreshed.inputs, document.inputs);
  assert.notEqual(refreshed.inputs, document.inputs);
  assert.equal(document.source.monthlyUsd, 400);
  assert.equal(refreshed.source.monthlyUsd, 500);
  assert.throws(() => refreshSource(document, { ...latest, sessionId: 'another-session' }), /session-mismatch/);
  assert.equal(validateDocument(refreshed).ok, true);
});

test('snapshot clipping preserves Unicode and fits boundary limits', async () => {
  const session = fixture();
  session.title = '😀'.repeat(500);
  session.pricing!.estimate.assumptions = ['😀'.repeat(500)];
  const source = await captureSource(session, 1234);
  assert.equal(source.title.length, 180);
  assert.equal(source.caveats[1].length, 500);
  assert.equal(validateDocument({ schemaVersion: 1, source, inputs: defaultInputs() }).ok, true);
});

test('record readers reject malformed/cross-session responses instead of loading another worksheet', async () => {
  const document = await documentFixture();
  const record = { id: 'bc_one', createdAt: 1234, document };
  assert.deepEqual(parseRecord(record, document.source.sessionId), record);
  assert.equal(parseRecord(record, 'another-session'), null);
  assert.equal(parseRecord({ ...record, id: '../escape' }, document.source.sessionId), null);
  assert.equal(parseRecord({ ...record, createdAt: Infinity }, document.source.sessionId), null);
  assert.equal(parseRecord({ ...record, createdAt: Number.MAX_SAFE_INTEGER }, document.source.sessionId), null);
  assert.equal(parseRecords({ records: [record, { ...record, document: {} }] }, document.source.sessionId), null);
  assert.equal(parseRecords({ records: Array(21).fill(record) }, document.source.sessionId), null);
});

test('API client uses scoped routes and same-origin credentials, validates saves and generated prose', async () => {
  const document = await documentFixture();
  const record = { id: 'bc_one', createdAt: 1234, document };
  const requests: Array<{ url: string; options?: RequestInit }> = [];
  const fetchImpl = (async (url: string | URL | Request, options?: RequestInit) => {
    requests.push({ url: String(url), options });
    if (options?.method === 'DELETE') return new Response(null, { status: 204 });
    if (String(url).endsWith('/explain')) return json({ explanation: { summary: 'Validate the operating baseline together.', questions: ['Which costs can actually be retired?'], validationSteps: ['Measure representative tasks before and after the trial.'] } });
    return json(options?.method === 'GET' ? { records: [record] } : { record });
  }) as typeof fetch;
  assert.equal((await listVersions(document.source.sessionId, { fetchImpl }))[0].id, 'bc_one');
  assert.equal((await saveVersion(document, { fetchImpl })).id, 'bc_one');
  assert.match((await explainCase(document, 'ko', { fetchImpl })).summary, /Validate/);
  await deleteVersion(record.id, { fetchImpl });
  assert.ok(requests.every(item => item.url.startsWith('/api/features/business-case') && item.options?.credentials === 'same-origin'));
  assert.deepEqual(JSON.parse(requests[2].options!.body as string), { document, lang: 'ko' });
  await assert.rejects(() => saveVersion(document, { fetchImpl: (async () => json({ error: 'limited' }, 429)) as typeof fetch }), error => error instanceof BusinessCaseError && error.status === 429);
  await assert.rejects(() => explainCase(document, 'en', { fetchImpl: (async () => json({ explanation: { summary: 'Save $900', questions: ['Question'], validationSteps: ['Measure'] } })) as typeof fetch }), /invalid-response/);
  await assert.rejects(() => deleteVersion('../no', { fetchImpl }), /invalid-id/);
});

test('account-wide cleanup reads bounded metadata, drops documents, and uses a dedicated read route', async () => {
  const summary = { id: 'bc-old', sessionId: 'removed-session', title: 'Earlier customer conversation', createdAt: 1234 };
  assert.deepEqual(parseVersionSummaries({ versions: [{ ...summary, document: { private: 'Do not import' } }] }), [summary]);
  assert.equal(parseVersionSummaries({ versions: [summary, summary] }), null);
  assert.equal(parseVersionSummaries({ versions: [{ ...summary, sessionId: '../another' }] }), null);
  assert.equal(parseVersionSummaries({ versions: [{ ...summary, createdAt: Number.MAX_SAFE_INTEGER }] }), null);
  assert.equal(parseVersionSummaries({ versions: [{ ...summary, title: 'x'.repeat(241) }] }), null);
  assert.equal(parseVersionSummaries({ versions: Array.from({ length: 201 }, (_, index) => ({ ...summary, id: `bc-${index}` })) }), null);
  let requestedPath = '';
  const versions = await listAllVersions({ fetchImpl: (async (path, options) => {
    requestedPath = String(path);
    assert.equal(options?.method, 'GET');
    assert.equal(options?.credentials, 'same-origin');
    return json({ versions: [summary] });
  }) as typeof fetch });
  assert.equal(requestedPath, '/api/features/business-case/versions');
  assert.deepEqual(versions, [summary]);
});

test('own print document escapes untrusted evidence, labels stale snapshots, and retains explicit assumptions', async () => {
  const document = await documentFixture();
  document.source.title = '<script>steal()</script>';
  document.source.context = '<img src=x onerror=evil()>';
  document.inputs.evidence = 'Customer says <b>measure it</b>.';
  const html = businessCaseHtml(document, calculateBusinessCase(document), null, 'en', true);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;steal()&lt;/script&gt;'));
  assert.ok(html.includes('&lt;b&gt;measure it&lt;/b&gt;'));
  assert.ok(html.includes(en.changed));
  assert.ok(html.includes(en.cashHint));
  assert.ok(html.includes('Migration effort is unpriced.'));
  assert.ok(!html.includes(en.questions));
  const body = businessCaseBodyHtml(document, calculateBusinessCase(document), null, 'en', true);
  assert.ok(!/<(?:style|head|script|iframe)\b/i.test(body), 'runtime print parsing must never see the standalone style/head');
  assert.ok(body.includes('&lt;script&gt;steal()&lt;/script&gt;'));
  assert.ok(body.includes('Migration effort is unpriced.'));
});

test('every visible business-case string has Korean and Chinese copy', () => {
  for (const lang of ['ko', 'zh'] as const) {
    for (const key of Object.keys(en)) {
      assert.equal(typeof (translations[lang] as Record<string, unknown>)[key], 'string', `${lang}.${key}`);
      assert.ok(makeText(lang)(key).trim());
    }
  }
});
