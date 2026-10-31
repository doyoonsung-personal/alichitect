// Constraints as data (src/constraints.ts) and req op validation of regions and avoid (src/validate.ts).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constraint, Graph } from '../src/types.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { createLineParser } from '../src/ndjson.ts';
import { applyOp, createCtx, emptyGraph } from '../src/reducer.ts';
import { constraintChecker as viaValidate, repairGraph, validateOp } from '../src/validate.ts';
import { allowedRegions, avoidedProducts, checkConstraints, constraintChecker, mergeConstraints, sayRegionFindings } from '../src/constraints.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAT = loadCatalog();
const SG: Constraint = { text: 'Customer data stays in Singapore', regions: ['ap-southeast-1'] };

function build(ops: unknown[]): Graph {
  const ctx = createCtx();
  let g = emptyGraph();
  for (const raw of ops) {
    const v = validateOp(raw, CAT, ctx);
    if (v.op) g = applyOp(g, v.op, ctx).graph;
  }
  return g;
}

describe('mergeConstraints', () => {
  test('keeps req ops with regions or avoid, replaces a restated text in place, skips duplicates, keeps the newest 12', () => {
    const a = mergeConstraints([], [
      { t: 'req', text: 'Budget under $500' },
      { t: 'req', text: 'Customer data stays in Singapore', regions: ['ap-southeast-1'] },
      { t: 'req', text: 'No Kubernetes', avoid: ['ack', 'ack'] },
    ]);
    assert.deepEqual(a, [SG, { text: 'No Kubernetes', avoid: ['ack'] }]);
    const b = mergeConstraints(a, [{ t: 'req', text: 'customer data stays in singapore!', regions: ['ap-southeast-1', 'ap-southeast-3'] }]);
    assert.deepEqual(b[0], { text: 'customer data stays in singapore!', regions: ['ap-southeast-1', 'ap-southeast-3'] });
    assert.equal(b.length, 2);
    const c = mergeConstraints(a, [{ text: 'Data must remain in SG', regions: ['ap-southeast-1'] }]);
    assert.equal(c.length, 2, 'same lists under another wording is a duplicate');
    const many = mergeConstraints([], Array.from({ length: 15 }, (_, i) => ({ text: `avoid ${i}`, avoid: [`p${i}`] })));
    assert.equal(many.length, 12);
    assert.equal(many[0].text, 'avoid 3');
    assert.deepEqual(a, mergeConstraints(a, []), 'inputs are not mutated');
  });

  test('allowed regions are the intersection of every pinned list; avoid is the union', () => {
    assert.equal(allowedRegions([]), null);
    assert.equal(allowedRegions([{ text: 'x', avoid: ['ack'] }]), null);
    assert.deepEqual(allowedRegions([SG, { text: 'SEA', regions: ['ap-southeast-1', 'ap-southeast-3'] }]), ['ap-southeast-1']);
    assert.deepEqual([...avoidedProducts([{ text: 'a', avoid: ['ack'] }, { text: 'b', avoid: ['acs', 'ack'] }])], ['ack', 'acs']);
  });
});

describe('say lines', () => {
  test('72 drafted lines in English, Korean and Chinese: errors exactly for data actions in another region', () => {
    const items: Array<{ lang: string; label: string; text: string }> = JSON.parse(readFileSync(path.join(HERE, 'fixtures/say-lines.json'), 'utf8')).items;
    assert.equal(items.length, 72);
    for (const it of items) {
      const f = sayRegionFindings(it.text, ['ap-southeast-1']);
      const got = f.some((x) => x.severity === 'error') ? 'error' : f.length ? 'warn' : 'none';
      assert.equal(got, it.label === 'error' ? 'error' : 'warn', `${it.lang} ${it.label}: ${it.text}`);
    }
  });

  test('allowed regions, countries and clause scope', () => {
    assert.deepEqual(sayRegionFindings('Backups stay in Singapore across two zones.', ['ap-southeast-1']), []);
    assert.equal(sayRegionFindings('Backups go to OSS in Singapore, not Kuala Lumpur.', ['ap-southeast-1'])[0].severity, 'warn');
    assert.equal(sayRegionFindings('Sydney is closed, so I will back up data in Singapore.', ['ap-southeast-1'])[0].severity, 'warn');
    assert.deepEqual(sayRegionFindings('Replicas stay in Malaysia.', ['ap-southeast-3']), [], 'a country with an allowed region is not foreign');
    const xr = sayRegionFindings("I'll add disaster recovery with a cross-region standby database.", ['ap-northeast-2']);
    assert.equal(xr[0].severity, 'error');
    assert.equal(xr[0].crossRegion, true);
    assert.deepEqual(sayRegionFindings("I'll add disaster recovery with a cross-region standby database.", ['ap-southeast-3', 'ap-southeast-8']), [], 'two allowed regions: cross-region may stay inside them');
    assert.deepEqual(sayRegionFindings('No cross-region replication: backups stay local.', ['ap-southeast-1']), []);
  });
});

describe('checkConstraints', () => {
  const T = JSON.parse(readFileSync(path.join(HERE, 'fixtures/phase0-turns.json'), 'utf8')).turns as Array<{ ref: string; content: string; says: string[]; start: Graph }>;
  const turnGraph = (ref: string): { graph: Graph; says: string[] } => {
    const t = T.find((x) => x.ref.endsWith(ref));
    if (!t) throw new Error(ref);
    let g = t.start;
    const ctx = createCtx();
    const p = createLineParser({
      onOp(raw) {
        const v = validateOp(raw, CAT, ctx);
        if (v.op) g = applyOp(g, v.op, ctx).graph;
      },
    });
    p.push(t.content + '\n');
    p.end();
    return { graph: repairGraph(g, CAT).graph, says: t.says };
  };

  test('mt-03-data-in-singapore#3 T1 (final): the narrated replication to Kuala Lumpur that passed Phase 0 is now an error', () => {
    const { graph, says } = turnGraph('mt-03-data-in-singapore#3 T1');
    const w = checkConstraints(graph, says, [SG], CAT);
    assert.equal(w.length, 1);
    assert.equal(w[0].code, 'constraint-region');
    assert.equal(w[0].severity, 'error');
    assert.match(w[0].msg, /Kuala Lumpur \(ap-southeast-3\)/);
    assert.match(w[0].msg, /Correct the narration/);
  });

  test('mt-06-summary-window#1 T4 (final): a Singapore DR region under "data stays in Indonesia" flags the group, its nodes and the narration', () => {
    const { graph, says } = turnGraph('mt-06-summary-window#1 T4');
    const w = checkConstraints(graph, says, [{ text: 'Customer data must stay in Indonesia', regions: ['ap-southeast-5'] }], CAT);
    const group = w.find((x) => x.ids[0] === 'sg');
    assert.ok(group && group.severity === 'error');
    assert.ok(group.ids.includes('db-dr') && group.ids.includes('oss-dr'));
    assert.ok(w.some((x) => x.ids.length === 0 && /say line/.test(x.msg) && x.severity === 'error'));
    assert.ok(w.every((x) => x.code === 'constraint-region' && !x.repaired));
  });

  test('node labels, why, edge labels and ruled-out products; nothing is checked without constraints', () => {
    const g = build([
      { t: 'group', id: 'sg', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
      { t: 'group', id: 'v', kind: 'vpc', label: 'VPC', parent: 'sg' },
      { t: 'node', id: 'app', product: 'ack', label: 'App cluster', group: 'v' },
      { t: 'node', id: 'db', product: 'rds', label: 'Orders DB', group: 'v', why: 'Primary database; backups are copied to Tokyo nightly.' },
      { t: 'node', id: 'bk', product: 'oss', label: 'Backups (Kuala Lumpur)', group: 'sg' },
      { t: 'edge', id: 'e1', from: 'db', to: 'bk', label: 'replicate to Jakarta' },
      { t: 'rec', product: 'acs', fit: 'complement', why: 'x' },
    ]);
    const cs: Constraint[] = [SG, { text: 'No Kubernetes', avoid: ['ack', 'acs'] }];
    const w = checkConstraints(g, ['Users in Tokyo get low latency.'], cs, CAT);
    const by = (id: string) => w.filter((x) => x.ids[0] === id).map((x) => `${x.code}/${x.severity}`);
    assert.deepEqual(by('bk'), ['constraint-region/error']);
    assert.deepEqual(by('db'), ['constraint-region/error']);
    assert.deepEqual(by('e1'), ['constraint-region/error']);
    assert.deepEqual(by('app'), ['constraint-avoid/error']);
    assert.deepEqual(by('acs'), ['constraint-avoid/error']);
    assert.deepEqual(w.filter((x) => x.ids.length === 0).map((x) => x.severity), ['warn'], 'a mention without a data action is a warn');
    assert.deepEqual(checkConstraints(g, ['Replicate to Tokyo.'], [], CAT), []);
    assert.deepEqual(constraintChecker({ graph: g, says: [], constraints: cs, catalog: CAT }), checkConstraints(g, [], cs, CAT));
    assert.equal(viaValidate, constraintChecker, 'validate.ts re-exports it for llm.ts');
  });
});

describe('validateOp req: regions and avoid', () => {
  test('names and aliases resolve to open region ids; closed and unknown regions are dropped with an info warning', () => {
    const v = validateOp({ t: 'req', text: '데이터는 싱가포르와 말레이시아에만', regions: ['싱가포르', 'Malaysia', 'ap-southeast-1', 'Sydney', 'Atlantis'] }, CAT);
    assert.deepEqual(v.op, { t: 'req', text: '데이터는 싱가포르와 말레이시아에만', regions: ['ap-southeast-1', 'ap-southeast-3', 'ap-southeast-8'] });
    assert.equal(v.warnings.filter((w) => w.severity === 'info' && /dropped/.test(w.msg)).length, 2);
    const s = validateOp({ t: 'req', text: 'Stay in Tokyo', regions: 'Tokyo' }, CAT);
    assert.deepEqual(s.op, { t: 'req', text: 'Stay in Tokyo', regions: ['ap-northeast-1'] });
  });

  test('avoid resolves names and aliases through the catalog; a req with neither list stays a plain requirement', () => {
    const v = validateOp({ t: 'req', text: 'No Kubernetes', avoid: ['Kubernetes', 'acs', 'ack', 'not-a-product'] }, CAT);
    assert.deepEqual(v.op, { t: 'req', text: 'No Kubernetes', avoid: ['ack', 'acs', 'asm', 'ack-one', 'ack-serverless', 'ack-dedicated', 'ack-edge', 'dify-on-ack'] }, 'ack stands for its family');
    assert.equal(v.warnings.filter((w) => w.code === 'unknown-product' && w.severity === 'info').length, 1);
    assert.deepEqual(validateOp({ t: 'req', text: 'Budget under $500', regions: [], avoid: [] }, CAT).op, { t: 'req', text: 'Budget under $500' });
  });
});
