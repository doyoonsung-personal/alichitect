// The independent residency scan and the family exclusion. Review (backend lens): the eval's residency assertion called the
// product's own checker, so it shared the checker's blind spots, and the avoid assertion used a short hand-written list.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Graph } from '../../packages/core/src/types.ts';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
import { evaluateTurn, expandFamilies, productNamePattern } from '../lib.ts';
import type { EvalTurn, TurnView } from '../lib.ts';
import { placesIn, scanResidency } from '../residency-scan.ts';

const catalog = loadCatalog();
const SG = ['ap-southeast-1'];
const empty: Graph = { groups: {}, nodes: {}, edges: {}, recs: [] };

const hits = (text: string, allowed: string[] = SG): number => scanResidency(allowed, empty, [text]).length;

describe('scanResidency: narration', () => {
  test('a foreign place with a copy cue is a hit, in English, Korean and Chinese', () => {
    assert.equal(hits('A standby database runs in Tokyo.'), 1);
    assert.equal(hits('Backups are replicated to Frankfurt every night.'), 1);
    assert.equal(hits('도쿄 리전으로 데이터를 복제합니다.'), 1);
    assert.equal(hits('在香港部署容灾站点。'), 1);
    assert.equal(hits('A standby in ap-northeast-1 takes over.'), 1, 'a region id names its own place');
  });

  test('the cross-region branch is a hit when exactly one region is allowed, even with no place named', () => {
    assert.equal(hits('We also replicate cross-region for DR.'), 1);
    assert.equal(hits('해외 지역에 백업 사본을 안전하게 보관합니다.'), 1);
    assert.equal(hits('We also replicate cross-region for DR.', ['ap-southeast-1', 'ap-northeast-1']), 0);
  });

  test('negated, refused, confined and user-location sentences are quiet', () => {
    for (const ok of [
      'Backups stay in Singapore instead of Tokyo.',
      'We will not replicate to Tokyo.',
      '도쿄로 복제하지 않습니다.',
      '프랑크푸르트 리전으로 플레이어 데이터를 복제할 수 없습니다.',
      '不要复制到东京。',
      '因数据驻留约束，无法添加跨区域异地备份，所有备份必须保留在新加坡区域',
      '根据已固定的要求，客户数据必须留在新加坡，因此无法添加其他国家的异地备份',
      '因数据驻留约束，未添加跨区域备份，所有数据保留在新加坡',
      'Virginia copy blocked by the GDPR residency rule',
      'Replicating the claims DB to Tokyo violates this, so I cannot draw that', // fix3-heldout ho-p1-residency-japan#3
      '이전 답변에서 제안한 유럽 리전 에셋 복제는 개인정보보호법 요건에 따라 제거합니다',
      '备份仅在新加坡区域内的不同可用区之间进行，不涉及跨区域',
      'The GDPR rule requires all personal data to stay in Europe, so I cannot add a Virginia replica.',
      'Replication to Osaka is turned off.',
      'European users access the application, which stores data only in Singapore.',
      '일본 사용자의 접근 지연을 줄이기 위해 CDN을 추가했습니다. 데이터 저장은 싱가포르에서만 이루어집니다.',
      'Data stays in Singapore: replication runs between zones in the same region.',
    ]) assert.equal(hits(ok), 0, ok);
    assert.equal(hits('서울 리전 내 복제본으로 데이터 해외 반출 없이 재해 복구를 구성했습니다.', ['ap-northeast-2']), 0);
  });

  test('an allowed place never counts, and 中国香港 is Hong Kong, not China', () => {
    assert.equal(hits('Backups are copied to Singapore.'), 0);
    assert.equal(hits('Replicate to 中国香港.', ['cn-hongkong']), 0);
    assert.equal(hits('Replicate to Malaysia.', ['ap-southeast-3']), 0, 'Malaysia holds the allowed Kuala Lumpur');
    assert.equal(hits('Replicate to Malaysia.', SG), 1);
  });

  test('placesIn takes the longest name: Hong Kong is not Kong, 中国香港 is not 中国', () => {
    assert.deepEqual(placesIn('中国香港').map((m) => m.ids), [['cn-hongkong']]);
    assert.deepEqual(placesIn('N. Virginia and US East').map((m) => m.ids), [['us-east-1'], ['us-east-1']]);
  });
});

describe('scanResidency: the diagram', () => {
  const g: Graph = {
    groups: { sg: { id: 'sg', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null }, dr: { id: 'dr', kind: 'region', label: 'Disaster recovery - Tokyo', parent: null } },
    nodes: {
      db: { id: 'db', product: 'rds', label: 'DB', group: 'sg' },
      users: { id: 'users', product: 'users', label: 'Japanese customers', group: null },
      dr1: { id: 'dr1', product: 'rds', label: 'Standby (Osaka)', group: 'dr' },
    },
    edges: {},
    recs: [],
  };
  test('a region group and a node label naming a foreign place are hits; client nodes are dropped', () => {
    const r = scanResidency(SG, g, [], (id) => id === 'users');
    assert.deepEqual(r.map((h) => `${h.where}:${h.ids[0]}`).sort(), ['group:dr', 'node:dr1']);
    assert.equal(scanResidency(SG, g, []).filter((h) => h.ids[0] === 'users').length, 1, 'without the client filter the label is a hit');
  });
});

describe('scanResidency: labelled lines of the core fixture (a different checker, different blind spots)', () => {
  interface Item { lang: string; label: 'violation' | 'ok'; text: string }
  const sets = (JSON.parse(readFileSync(new URL('../../packages/core/test/fixtures/say-recall.json', import.meta.url), 'utf8')) as { sets: Array<{ id: string; allowed: string[]; items: Item[] }> }).sets;
  test('recall of violations: at least 85% on the sets the scan was tuned on, at least 65% on the two fresh batches it was not; false hits under 35%', (t) => {
    for (const s of sets) {
      let v = 0;
      let found = 0;
      let o = 0;
      let fp = 0;
      for (const it of s.items) {
        const hit = hits(it.text, s.allowed) > 0;
        if (it.label === 'violation') (v++, hit && found++);
        else (o++, hit && fp++);
      }
      t.diagnostic(`${s.id}: recall ${found}/${v}, false hits ${fp}/${o}`);
      const fresh = /review2/.test(s.id);
      assert.ok(found / v >= (fresh ? 0.65 : 0.85), `${s.id} recall ${found}/${v}`);
      assert.ok(fp / o < 0.35, `${s.id} false hits ${fp}/${o}`);
    }
  });
});

describe('residency assertion: the scan runs next to the checker', () => {
  const names = productNamePattern(catalog);
  const turn: EvalTurn = { ask: 'x', expect: { residency: SG } };
  const view = (over: Partial<TurnView>): TurnView =>
    ({ ask: 'x', ops: [], says: [], reqs: [], gaps: [], rawProducts: [], graph: empty, before: empty, requirements: [], constraints: [], userTexts: [], stats: { ops: 0, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true, finishReason: 'stop', escapes: 0 }, ...over }) as TurnView;
  test('a clean turn passes both; a say line the scan reads as a violation fails only the scan assertion when the checker is quiet', () => {
    const clean = evaluateTurn(view({ ops: [{ t: 'say', text: 'Everything runs in Singapore.' }, { t: 'done', summary: 'ok' }] as never, stats: { ops: 2, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true, finishReason: 'stop', escapes: 0 } }), turn, 'en', names, catalog);
    assert.deepEqual(clean.filter((a) => a.type.startsWith('residency')).map((a) => [a.type, a.pass]), [['residency', true], ['residencyScan', true]]);
    const bad = evaluateTurn(view({ ops: [{ t: 'say', text: 'A hot standby is hosted in Oregon.' }, { t: 'done', summary: 'ok' }] as never, stats: { ops: 2, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true, finishReason: 'stop', escapes: 0 } }), turn, 'en', names, catalog);
    const scan = bad.find((a) => a.type === 'residencyScan')!;
    assert.equal(scan.pass, false);
    assert.match(scan.detail!, /Oregon/);
  });
});

describe('exclude families', () => {
  test('family:kubernetes expands to every catalog entry tagged with it; plain ids stay; no catalog leaves the token alone', () => {
    const ids = expandFamilies(['family:kubernetes', 'ecs'], catalog);
    for (const id of ['ack', 'acs', 'asm', 'ack-one', 'ack-serverless', 'ack-dedicated', 'ack-edge', 'dify-on-ack', 'ecs']) assert.ok(ids.includes(id), id);
    assert.deepEqual(expandFamilies(['family:kubernetes'], undefined), []);
    assert.deepEqual(expandFamilies(['ack', 'ack'], catalog), ['ack']);
  });

  test('a diagram with Service Mesh (not on the case author\'s old list of three) fails a no-Kubernetes exclude', () => {
    const names = productNamePattern(catalog);
    const g: Graph = { groups: {}, nodes: { m: { id: 'm', product: 'asm', label: 'Mesh', group: null }, w: { id: 'w', product: 'ack-serverless', label: 'Workers', group: null } }, edges: {}, recs: [] };
    const v = { ask: 'x', ops: [], says: [], reqs: [], gaps: [], rawProducts: [], graph: g, before: g, requirements: [], constraints: [], userTexts: [], stats: { ops: 0, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true, finishReason: 'stop', escapes: 0 } } as unknown as TurnView;
    const res = evaluateTurn(v, { ask: 'x', expect: { exclude: ['ack', 'acs', 'ack-one'] } }, 'en', names, catalog).find((a) => a.type === 'exclude' && a.name.startsWith('exclude'))!;
    assert.equal(res.pass, true, 'the old three-id list misses both');
    const fam = evaluateTurn(v, { ask: 'x', expect: { exclude: ['family:kubernetes'] } }, 'en', names, catalog).find((a) => a.type === 'exclude' && a.name.startsWith('exclude'))!;
    assert.equal(fam.pass, false);
    assert.match(fam.detail!, /asm/);
  });
});
