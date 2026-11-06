import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverySnapshot } from './discovery.ts';
import { validateSnapshot } from '@ali/bd-brief/validate.ts';
import { buildGeneratePrompt } from '@ali/bd-brief/prompt.ts';
import { createBdBriefApi } from './api.ts';

test('a first meeting needs no prompt, pain point, architecture or estimate', () => {
  const s = discoverySnapshot('discovery-one', 'ko', '  ', 1000);
  assert.equal(validateSnapshot(s).ok, true);
  assert.deepEqual(s.statements, []);assert.equal(s.design, null);assert.equal(s.pricing.status, 'missing');
  assert.equal(s.sourceRevision, 0);assert.equal(s.objective, null);
  const p = buildGeneratePrompt({ mode: 'initial', lang: 'ko', snapshot: s, base: null, notes: [] });
  assert.match(p.system, /problem and business impact are not yet known/);
  assert.match(p.system, /Discovery questions.*sourceIds: \[\]/);
});
test('optional context is bounded and cannot carry architecture or current pricing as a discovery source', () => {
  const s = discoverySnapshot('discovery-one', 'en', 'Retail company; first introduction.', 1000);
  assert.deepEqual(s.statements, [{ id: 'discovery-context', text: 'Retail company; first introduction.' }]);
  assert.equal(validateSnapshot({ ...s, design: { summary: 'invented', capabilities: [], boundaries: [] } }).ok, false);
  assert.equal(validateSnapshot({ ...s, sourceRevision: 1 }).ok, false);
  assert.equal(validateSnapshot({ ...s, pricing: { ...s.pricing, status: 'current' } }).ok, false);
});
test('discovery lookup is distinguished from a browser session with the same grouping key', async () => {
  const urls: string[] = [];
  const api = createBdBriefApi({ fetchImpl: async input => { urls.push(String(input));return Response.json({ brief: null, briefs: [] }); } });
  await api.listBriefs('same-key');await api.listBriefs('same-key', undefined, 'discovery');await api.listDiscoveryBriefs();
  assert.deepEqual(urls, ['/api/features/bd-brief/briefs?sourceKey=same-key', '/api/features/bd-brief/briefs?sourceKey=same-key&sourceKind=discovery', '/api/features/bd-brief/discovery-briefs']);
});
