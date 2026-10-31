// Phase 1 fixes after review: say-line recall and negation, regions the table did not know, region groups without a
// name, avoid families, and relaxing a pin in chat. Every test here failed before the fix (see decisions in the report).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constraint, Graph } from '../src/types.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { applyOp, createCtx, emptyGraph } from '../src/reducer.ts';
import { validateOp } from '../src/validate.ts';
import {
  allowedRegions,
  avoidedProducts,
  checkConstraints,
  expandAvoid,
  familyMembers,
  mergeConstraints,
  mergeConstraintsDetailed,
  sayRegionFindings,
} from '../src/constraints.ts';
import { regionLabel, regionMentions, resolveRegions } from '../src/regions.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAT = loadCatalog();
const SG: Constraint = { text: 'Customer data stays in Singapore', regions: ['ap-southeast-1'] };
const SG1 = ['ap-southeast-1'];

function build(ops: unknown[]): Graph {
  const ctx = createCtx();
  let g = emptyGraph();
  for (const raw of ops) {
    const v = validateOp(raw, CAT, ctx);
    if (v.op) g = applyOp(g, v.op, ctx).graph;
  }
  return g;
}

describe('say lines: recall and precision on labelled fixtures', () => {
  interface Item { lang: string; label: 'violation' | 'ok'; text: string; src: string }
  interface FixtureSet { id: string; allowed: string[]; items: Item[] }
  const sets: FixtureSet[] = JSON.parse(readFileSync(path.join(HERE, 'fixtures/say-recall.json'), 'utf8')).sets;

  for (const set of sets) {
    test(`${set.id} pin: every violation is an error and no ok line is`, (t) => {
      const miss: string[] = [];
      const fp: string[] = [];
      for (const it of set.items) {
        const err = sayRegionFindings(it.text, set.allowed).some((x) => x.severity === 'error');
        if (it.label === 'violation' && !err) miss.push(`${it.lang} ${it.text}`);
        if (it.label === 'ok' && err) fp.push(`${it.lang} ${it.text}`);
      }
      const v = set.items.filter((i) => i.label === 'violation').length;
      t.diagnostic(`${set.id}: ${set.items.length} lines, recall ${v - miss.length}/${v}, false errors ${fp.length}/${set.items.length - v}`);
      assert.deepEqual({ miss, fp }, { miss: [], fp: [] });
    });
  }

  test('the fixture covers English, Korean and Chinese, violations and ok lines', () => {
    const all = sets.flatMap((s) => s.items);
    for (const lang of ['en', 'ko', 'zh']) {
      for (const label of ['violation', 'ok']) assert.ok(all.filter((i) => i.lang === lang && i.label === label).length >= 25, `${lang} ${label}`);
    }
    assert.ok(all.length >= 400, `${all.length} lines`);
  });
});

describe('say lines: the negation must bind to the data word', () => {
  const err = (s: string): boolean => sayRegionFindings(s, SG1).some((x) => x.severity === 'error');

  test('an adverb such as "without downtime", "지연 없이" or 无损 does not negate a violation', () => {
    for (const s of [
      'Replicate to Tokyo without downtime.',
      'No-downtime failover to Tokyo.',
      'Nonstop replication to Seoul.',
      'Backup to Tokyo without delay.',
      '지연 없이 도쿄로 복제합니다.',
      '실시간으로 끊김 없이 도쿄에 백업합니다.',
      '实现不间断同步到东京。',
      '无损复制到东京。',
      '没有延迟地备份到东京。',
    ]) assert.ok(err(s), s);
  });

  test('a negator or a negative predicate next to the data word negates it', () => {
    for (const s of [
      'Do not replicate to Tokyo.',
      'Replication to Tokyo is disabled.',
      'Tokyo replication is out of scope.',
      'We could replicate to Tokyo but will not.',
      'Data is never replicated to Tokyo.',
      'Seoul was evaluated for disaster recovery but rejected immediately.',
      '도쿄로 복제하지 마세요.',
      '도쿄로의 복제는 비활성화되어 있습니다.',
      '도쿄 백업 계획은 취소되었고 싱가포르만 사용합니다.',
      '不要复制到东京。',
      '禁止将任何客户数据的副本放置在东京。',
      '跨区域复制功能已禁用。',
    ]) assert.ok(!err(s), s);
  });

  test('a place named only for where users are is a warn at most; so are a language name, Jakarta EE and EU rules', () => {
    for (const s of [
      'Users in Japan store sessions in the browser.',
      '일본어 번역을 저장합니다.',
      '인도 시장 대상 사용자 데이터는 싱가포르에 저장합니다.',
      'Use Jakarta EE application servers in Singapore.',
      'The EU regulation review confirms that data is stored in Singapore only.',
    ]) assert.ok(!err(s), s);
    assert.equal(sayRegionFindings('Users in Japan store sessions in Singapore.', SG1)[0].severity, 'warn');
  });

  test('a cross-region branch is an error even when the allowed region is named in the same clause', () => {
    const f = sayRegionFindings('Singapore primary with cross-region replication for DR.', SG1);
    assert.equal(f[0].severity, 'error');
    assert.equal(f[0].crossRegion, true);
    for (const s of ['Set up geo-redundant storage.', 'Add an offsite backup in another country.', 'Keep a copy in a different region.', 'Replicate to a remote region.']) assert.ok(err(s), s);
    for (const s of ['No cross-region replication: backups stay local.', 'Backups are copied between zones inside the same region.', '因此异地容灾只能在同一区域的不同可用区之间实现。']) assert.ok(!err(s), s);
  });
});

describe('region names: short forms, places without a region of their own, blocs, mainland China', () => {
  test('KL, JB, HKG, Osaka, Ashburn, California, Europe, the EU and China resolve to regions', () => {
    assert.deepEqual(regionMentions('Back up to KL, JB and HKG.'), ['ap-southeast-3', 'ap-southeast-8', 'cn-hongkong']);
    assert.deepEqual(regionMentions('Sync to Osaka'), ['ap-northeast-1']);
    assert.deepEqual(regionMentions('Ashburn and California'), ['us-east-1', 'us-west-1']);
    assert.deepEqual(regionMentions('Store it in the EU').slice(0, 3), ['eu-central-1', 'eu-west-1', 'eu-west-2']);
    assert.ok(regionMentions('mainland China').every((id) => id.startsWith('cn-') && id !== 'cn-hongkong'));
    assert.deepEqual(regionMentions('中国香港'), ['cn-hongkong'], 'Hong Kong is not mainland China');
    assert.deepEqual(regionMentions('Kuala-Lumpur'), ['ap-southeast-3']);
    assert.deepEqual(regionMentions('Jakarta EE servers'), [], 'Jakarta EE is Java');
  });

  test('a country with no international region is a place too, and never an open region', () => {
    assert.deepEqual(regionMentions('Taipei'), ['x-taiwan']);
    assert.deepEqual(regionMentions('越南'), ['x-vietnam']);
    assert.equal(regionLabel('x-taiwan'), 'Taiwan (no Alibaba Cloud region)');
    assert.deepEqual(resolveRegions('Taiwan'), ['x-taiwan']);
    const v = validateOp({ t: 'req', text: 'Data in Taiwan', regions: ['Taiwan'] }, CAT);
    assert.equal((v.op as { regions?: string[] }).regions, undefined, 'it cannot be pinned');
    assert.ok(v.warnings.some((w) => /not an open international region/.test(w.msg)));
  });
});

describe('checkConstraints: a region group that names no region', () => {
  const regionGraph = (labels: Record<string, string>): Graph => {
    const ids = Object.keys(labels);
    return {
      groups: Object.fromEntries(ids.map((id) => [id, { id, kind: 'region' as const, label: labels[id], parent: null }])),
      nodes: { db: { id: 'db', product: 'rds', label: 'DB', group: ids[ids.length - 1] } },
      edges: {},
      recs: [],
    };
  };

  test('a "DR Region" next to the Singapore group is an error, whatever its label says; a lone group is fine', () => {
    const w = checkConstraints(regionGraph({ sg: 'Singapore (ap-southeast-1)', dr: 'DR Region' }), [], [SG], CAT);
    assert.equal(w.length, 1);
    assert.equal(w[0].severity, 'error');
    assert.deepEqual(w[0].ids, ['dr', 'db']);
    assert.match(w[0].msg, /names no region/);
    assert.deepEqual(checkConstraints(regionGraph({ r: 'Region' }), [], [SG], CAT), []);
    assert.equal(checkConstraints(regionGraph({ a: 'Primary', b: 'Secondary' }), [], [SG], CAT).filter((x) => x.severity === 'error').length, 1, 'with none naming the region, the first group is the primary');
    assert.deepEqual(checkConstraints(regionGraph({ sg: 'Singapore', dr: 'DR Region' }), [], [{ text: 'SEA', regions: ['ap-southeast-1', 'ap-southeast-3'] }], CAT), [], 'two regions allowed: no judgement without a name');
  });
});

describe('avoid families', () => {
  const FAMILY = ['ack', 'acs', 'asm', 'ack-one', 'ack-serverless', 'ack-dedicated', 'ack-edge', 'dify-on-ack'];

  test('the catalog tags the Kubernetes family; the family word or its root gives every member, another member only itself', () => {
    assert.deepEqual(familyMembers(CAT, 'kubernetes').sort(), [...FAMILY].sort());
    assert.deepEqual(expandAvoid(CAT, ['kubernetes']).sort(), [...FAMILY].sort());
    assert.deepEqual(expandAvoid(CAT, ['ack']).sort(), [...FAMILY].sort());
    assert.deepEqual(expandAvoid(CAT, ['acs']), ['acs']);
    assert.deepEqual(expandAvoid(CAT, ['oss']), ['oss']);
    assert.ok(!familyMembers(CAT, 'kubernetes').includes('sae') && !familyMembers(CAT, 'kubernetes').includes('eci'), 'SAE and ECI run containers without Kubernetes');
  });

  test('validateOp turns "no Kubernetes" in any wording into the whole family', () => {
    for (const avoid of [['kubernetes'], ['K8s'], ['쿠버네티스'], 'ACK, ASM', ['ack-serverless', 'ack']]) {
      const v = validateOp({ t: 'req', text: 'No Kubernetes', avoid }, CAT);
      assert.deepEqual([...(v.op as { avoid: string[] }).avoid].sort(), [...FAMILY].sort(), JSON.stringify(avoid));
    }
    assert.deepEqual((validateOp({ t: 'req', text: 'No ACS', avoid: ['acs'] }, CAT).op as { avoid: string[] }).avoid, ['acs']);
  });

  test('checkConstraints flags every member even when an older constraint holds only [ack, acs, ack-one]', () => {
    const old: Constraint = { text: 'No Kubernetes', avoid: ['ack', 'acs', 'ack-one'] };
    for (const p of FAMILY) {
      const g = build([{ t: 'node', id: 'n', product: p, label: p, group: null }]);
      const w = checkConstraints(g, [], [old], CAT);
      assert.equal(w.filter((x) => x.code === 'constraint-avoid' && x.severity === 'error').length, 1, p);
    }
    const sae = build([{ t: 'node', id: 'n', product: 'sae', label: 'SAE', group: null }]);
    assert.deepEqual(checkConstraints(sae, [], [old], CAT).filter((x) => x.code === 'constraint-avoid'), [], 'SAE is not Kubernetes');
    assert.deepEqual([...avoidedProducts([old], CAT)].sort(), [...FAMILY].sort());
    assert.deepEqual([...avoidedProducts([old])].sort(), ['ack', 'ack-one', 'acs'], 'without a catalog, as before');
  });
});

describe('relaxing a pin in chat', () => {
  test('a req with regions replaces the older region pin (newest wins) and keeps the avoid part of an older constraint', () => {
    const r = mergeConstraintsDetailed(
      [SG, { text: 'Singapore only, no Kubernetes', regions: ['ap-southeast-1'], avoid: ['ack'] }],
      [{ text: 'A Tokyo replica is fine', regions: ['ap-southeast-1', 'ap-northeast-1'] }],
    );
    assert.deepEqual(r.constraints, [{ text: 'Singapore only, no Kubernetes', avoid: ['ack'] }, { text: 'A Tokyo replica is fine', regions: ['ap-southeast-1', 'ap-northeast-1'] }]);
    assert.deepEqual(allowedRegions(r.constraints), ['ap-southeast-1', 'ap-northeast-1']);
    assert.deepEqual(r.superseded.map((c) => c.text), ['Customer data stays in Singapore', 'Singapore only, no Kubernetes']);
  });

  test('lifts drops every region list, or the listed products from the avoid lists', () => {
    const r1 = mergeConstraintsDetailed([SG, { text: 'No Kubernetes', avoid: ['ack', 'acs'] }], [{ text: 'Residency rule lifted', lifts: ['regions'] }]);
    assert.deepEqual(r1.constraints, [{ text: 'No Kubernetes', avoid: ['ack', 'acs'] }]);
    const r2 = mergeConstraintsDetailed(r1.constraints, [{ text: 'ACK is fine now', lifts: ['ack'] }]);
    assert.deepEqual(r2.constraints, [{ text: 'No Kubernetes', avoid: ['acs'] }]);
    const v = validateOp({ t: 'req', text: 'Kubernetes is fine now', lifts: ['kubernetes'] }, CAT);
    assert.deepEqual([...(v.op as { lifts: string[] }).lifts].sort(), ['ack', 'ack-dedicated', 'ack-edge', 'ack-one', 'ack-serverless', 'acs', 'asm', 'dify-on-ack']);
    assert.deepEqual((validateOp({ t: 'req', text: 'Drop the residency rule', lifts: ['residency'] }, CAT).op as { lifts: string[] }).lifts, ['regions']);
    assert.deepEqual(mergeConstraints([], [{ text: 'x', lifts: ['kubernetes'] }]), [], 'a lift on its own pins nothing');
  });

  test('a restated requirement and a duplicate list behave as before', () => {
    assert.deepEqual(mergeConstraints([SG], [{ text: 'customer data stays in singapore', regions: ['ap-southeast-1', 'ap-southeast-3'] }]), [{ text: 'customer data stays in singapore', regions: ['ap-southeast-1', 'ap-southeast-3'] }]);
    assert.deepEqual(mergeConstraints([SG], [{ text: 'Data must remain in SG', regions: ['ap-southeast-1'] }]), [SG], 'same list, another wording: a duplicate');
  });

  test('the oldest constraint over the cap is reported as capped', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ text: `avoid ${i}`, avoid: [`p${i}`] }));
    const r = mergeConstraintsDetailed([], many);
    assert.equal(r.constraints.length, 12);
    assert.deepEqual(r.capped.map((c) => c.text), ['avoid 0', 'avoid 1']);
  });

  test('pinned lists that do not overlap (memory from an older version) are one warn, not an error on every group', () => {
    const g = build([
      { t: 'group', id: 'sg', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
      { t: 'group', id: 'tk', kind: 'region', label: 'Tokyo (ap-northeast-1)', parent: null },
    ]);
    const w = checkConstraints(g, ['Replicate to Tokyo.'], [SG, { text: 'Tokyo', regions: ['ap-northeast-1'] }], CAT);
    assert.equal(w.length, 1);
    assert.equal(w[0].severity, 'warn');
    assert.match(w[0].msg, /do not overlap/);
  });
});

describe('second review pass: a place that is only ruled out, and "without leaving the country"', () => {
  const sev = (text: string, allowed: string[]): string[] => sayRegionFindings(text, allowed).map((f) => f.severity);

  test('a region named only to be ruled out ("instead of", "not", "而不是", "대신") is a warn at most, but the plan next to it still counts', () => {
    assert.deepEqual(sev('Backups stay in Singapore instead of Kuala Lumpur.', SG1), ['warn']);
    assert.deepEqual(sev('We keep the replica in Singapore, not in Tokyo.', SG1), ['warn']);
    assert.deepEqual(sev('备份保存在新加坡，而不是东京。', SG1), ['warn']);
    assert.deepEqual(sev('백업은 도쿄 대신 싱가포르에 저장합니다.', SG1), ['warn']);
    assert.ok(sev('Back up to Tokyo, not Seoul.', SG1).includes('error'), 'Tokyo is still the plan');
    assert.ok(sev('Replicate to Tokyo instead of Seoul.', SG1).includes('error'), 'Tokyo is still the plan');
  });

  test('"데이터 해외 반출 없이" and "never leaves the country" confine the copy: no cross-region error', () => {
    assert.deepEqual(sev('서울 리전 내 RDS 읽기 전용 복제본과 Cloud Backup을 추가하여 데이터 해외 반출 없이 재해 복구를 구성했습니다', ['ap-northeast-2']), []);
    assert.deepEqual(sev('Disaster recovery uses a second zone, so the data never leaves the country.', SG1), []);
    assert.ok(sev('Disaster recovery copies the data to a site overseas.', SG1).includes('error'), 'the same words without the confinement still fail');
  });
});
