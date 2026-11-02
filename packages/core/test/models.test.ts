import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModels } from '../src/catalog-node.ts';
import { createModelTable } from '../src/models.ts';
import type { ModelFile } from '../src/models.ts';

const file = (): ModelFile => JSON.parse(readFileSync(new URL('../catalog/models.json', import.meta.url), 'utf8')) as ModelFile;
test('model file loads with unique model and tool ids', () => {
  const table = loadModels();
  assert.ok(table.version); assert.equal(table.models.length, table.byId.size);
  assert.equal(new Set([...table.byId.keys(), ...table.tools.keys()]).size, table.models.length + table.tools.size);
  for (const m of table.models) {
    assert.equal(table.model(m.id), m); assert.equal(m.family, 'qwen');
    for (const id of m.tools ?? []) assert.ok(table.tool(id));
  }
});
test('model and tool dates and prices are valid', () => {
  const table = loadModels();
  for (const entry of [...table.models, ...table.tools.values()]) {
    assert.match(entry.verified, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(entry.verified).toISOString().slice(0, 10), entry.verified);
  }
  for (const m of table.models) for (const tier of m.price?.tiers ?? []) for (const price of Object.values(tier)) assert.ok(Number.isFinite(price) && price > 0);
  for (const tool of table.tools.values()) if (tool.fee) { assert.ok(tool.fee.usd > 0); assert.ok(tool.fee.per > 0); }
});
test('prompt rows omit prices and have the documented columns', () => {
  const table = loadModels();
  assert.equal(table.promptRows().split('\n').length, table.models.length);
  for (const m of table.models) assert.ok(table.promptRows().includes(`${m.id} | ${m.tier} | ${m.in.join(',')}>${m.out.join(',')} | ${m.roles.join(',')} | ${m.note ?? ''}`));
  const changed = file(); for (const m of changed.models) delete m.price;
  assert.equal(createModelTable(changed).promptRows(), table.promptRows());
});
for (const fault of ['duplicate model', 'duplicate tool', 'tier', 'modality', 'role', 'tool reference']) test(`model table rejects ${fault}`, () => {
  const f = file();
  if (fault === 'duplicate model') f.models.push(f.models[0]);
  if (fault === 'duplicate tool') f.tools.push(f.tools[0]);
  if (fault === 'tier') Object.assign(f.models[0], { tier: 'huge' });
  if (fault === 'modality') Object.assign(f.models[0], { in: ['smell'] });
  if (fault === 'role') Object.assign(f.models[0], { roles: ['unknown'] });
  if (fault === 'tool reference') f.models[0].tools = ['unknown'];
  assert.throws(() => createModelTable(f));
});
test('model indexing does not mutate or retain the input arrays', () => {
  const f = file(), before = structuredClone(f), table = createModelTable(f);
  assert.deepEqual(f, before); table.models[0].regions.push('test'); assert.deepEqual(f, before);
});
test('model and tool ids share one namespace; missing lookups return undefined', () => {
  const f = file();
  f.tools[0].id = f.models[0].id;
  assert.throws(() => createModelTable(f), /Duplicate/);
  const table = loadModels();
  assert.equal(table.model('missing'), undefined);
  assert.equal(table.tool('missing'), undefined);
});
test('prompt rows contain no monetary notation or price field labels', () => {
  assert.doesNotMatch(loadModels().promptRows(), /\$|\bUSD\b|cacheHit|thinkingOut|perUnit/);
});
