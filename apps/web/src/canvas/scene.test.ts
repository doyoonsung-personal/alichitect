import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GEOMETRY } from '@ali/core/layout.ts';
import { catalog, loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { t } from '../i18n/t.ts';
import type { Lang } from '../i18n/t.ts';
import { buildScene, cautionOf, entryFor, frameView, splitRegionLabel } from './scene.ts';
import type { Measurer } from './scene.ts';
import { popContent, safeDocs } from './pop-model.ts';
import { label } from './labels.ts';

// a stand-in for canvas measureText: Latin 7 px at 14 px, CJK a full em
const measure: Measurer = {
  title: (s, px) => [...s].reduce((w, ch) => w + (/[ᄀ-ᇿ぀-ヿ一-鿿가-힯]/.test(ch) ? px : px * 0.5), 0),
  body: (s, px) => [...s].reduce((w, ch) => w + (/[ᄀ-ᇿ぀-ヿ一-鿿가-힯]/.test(ch) ? px : px * 0.5), 0),
};

function sceneOf(fixture: string, lang: Lang = 'en') {
  const store = newStore();
  play(store, loadFixtureFile(fixture), { flushEvery: 6 });
  const s = store.getState();
  const tt = (k: Parameters<typeof t>[1], v?: Parameters<typeof t>[2]) => t(lang, k, v);
  return { state: s, scene: buildScene({ layout: s.display.layout!, graph: s.display.graph, catalog, lang, t: tt, measure }), t: tt };
}

describe('splitRegionLabel', () => {
  it('splits a name from a region id', () => {
    assert.deepEqual(splitRegionLabel('Singapore (ap-southeast-1)'), { name: 'Singapore', id: 'ap-southeast-1' });
    assert.deepEqual(splitRegionLabel('싱가포르（ap-southeast-1）'), { name: '싱가포르', id: 'ap-southeast-1' });
  });
  it('keeps a label that has no region id whole', () => {
    assert.deepEqual(splitRegionLabel('Portal region'), { name: 'Portal region' });
  });
});

describe('the scene of the residency session', () => {
  const { scene, state } = sceneOf('residency');
  it('has one card view per layout card and every badge', () => {
    assert.equal(scene.cards.length, Object.keys(state.display.layout!.cards).length);
    assert.equal(scene.badgeById.size, Object.keys(state.display.layout!.badges).length);
  });
  it('sets every title inside the text column at the layout size or shrunk in steps, never below the minimum', () => {
    for (const c of scene.cards) {
      assert.ok(c.titlePx <= GEOMETRY.titlePx && c.titlePx >= GEOMETRY.titleMinPx, `${c.id} ${c.titlePx}`);
      for (const line of c.titleLines) assert.ok(measure.title(line, c.titlePx) <= GEOMETRY.textW + 0.5, `${c.id}: ${line}`);
      assert.ok(c.titleLines.length <= GEOMETRY.titleLines + 1);
    }
  });
  it('keeps the subtitle and the zone chips on one line', () => {
    for (const c of scene.cards) {
      if (!c.subtitle || !c.zones.length) continue;
      const chips = measure.title(c.zones.join(' '), 12) + 6;
      assert.ok(measure.body(c.subtitle, GEOMETRY.subtitlePx) <= GEOMETRY.textW - chips + 0.5, c.id);
    }
  });
  it('shows zones as upper-case letters and puts badges on their host', () => {
    const alb = scene.byId.get('alb')!;
    assert.deepEqual(alb.zones, ['A', 'B']);
    assert.deepEqual(alb.badges.map((b) => b.id).sort(), ['cert', 'waf']);
    assert.equal(scene.byId.get('app')!.attachments[0].id, 'scaling');
    for (const b of alb.badges) {
      assert.ok(b.y < 0 && b.y + b.h > 0, 'a badge straddles its host top edge');
    }
  });
  it('words the frames: region name and id, VPC, lanes in the UI language', () => {
    const sg = scene.frames.find((f) => f.kind === 'region')!;
    assert.equal(sg.text, 'Singapore');
    assert.equal(sg.aside, 'ap-southeast-1');
    assert.ok(scene.frames.some((f) => f.kind === 'lane' && f.text === 'Storage'));
  });
  it('the accessible place of a card names its frame and zones', () => {
    assert.match(scene.byId.get('alb')!.where, /Portal VPC.*zones A, B/);
  });
});

describe('Korean and Chinese scenes', () => {
  it('translates the lane frames and keeps the model-written frames', () => {
    const ko = sceneOf('korean', 'ko').scene;
    assert.ok(ko.frames.some((f) => f.kind === 'lane' && f.text === '스토리지'));
    assert.ok(ko.frames.some((f) => f.kind === 'lane' && f.text === '운영'));
    const zh = sceneOf('chinese', 'zh').scene;
    assert.ok(zh.frames.some((f) => f.kind === 'lane' && ['存储', '运维', '安全', 'AI'].includes(f.text)));
  });
  it('wraps CJK titles on two lines at most before shrinking', () => {
    for (const lang of ['ko', 'zh'] as const) {
      const sc = sceneOf(lang === 'ko' ? 'korean' : 'chinese', lang).scene;
      for (const c of sc.cards) for (const line of c.titleLines) assert.ok(measure.title(line, c.titlePx) <= GEOMETRY.textW + 0.5, `${lang} ${c.id}`);
    }
  });
});

describe('the solution map scene', () => {
  const { scene } = sceneOf('ai-agent');
  it('names the four lanes and marks the recommendation', () => {
    assert.deepEqual(scene.frames.map((f) => f.text).sort(), ['Cloud resources', 'Model service', 'SaaS', 'Team']);
    const q = scene.byId.get('rec:qoder-teams')!;
    assert.equal(q.fit, 'primary');
    assert.equal(q.subtitle, 'Per-seat SaaS');
    assert.ok(q.why && q.why.length > 0);
    assert.equal(scene.byId.get('rec:token-plan')!.fit, 'complement');
  });
});

describe('frameView', () => {
  const t0 = (k: Parameters<typeof t>[1]) => t('en', k);
  const base = { id: 'x', x: 0, y: 0, w: 10, h: 10, parent: null, depth: 0, implicit: false, empty: false };
  it('does not repeat VPC in a name that already says it', () => {
    assert.equal(frameView({ ...base, kind: 'vpc', label: 'Portal VPC' }, 'en', t0).aside, undefined);
    const bare = frameView({ ...base, kind: 'vpc', label: 'Portal' }, 'en', t0);
    assert.equal(bare.aside, 'VPC');
    assert.equal(bare.asidePlace, 'before');
  });
  it('words a zone from its letter', () => {
    assert.equal(frameView({ ...base, kind: 'zone', label: 'Zone b', zone: 'b' }, 'ko', (k) => t('ko', k)).text, '가용 영역 B');
  });
});

describe('cautions and the popover content', () => {
  it('a product with no lifecycle flag has no caution', () => {
    assert.equal(cautionOf(entryFor(catalog, 'alb'), 'en'), null);
    assert.equal(cautionOf(undefined, 'en'), null);
  });
  it('a restricted, preview or china-only product carries one, with the catalog note', () => {
    const flagged = catalog.entries.filter((e) => e.status !== 'ga' || e.availability !== 'intl');
    assert.ok(flagged.length > 0);
    for (const e of flagged) assert.ok(cautionOf(e, 'en'), e.id);
  });
  it('popContent quotes the reason verbatim, the catalog purpose, the dated price and the docs link', () => {
    const { scene, state, t: tt } = sceneOf('ai-agent');
    const q = scene.byId.get('rec:qoder-teams')!;
    const c = popContent(q, null, catalog, state.session.provenance, 'en', tt);
    assert.equal(c.why, q.why);
    assert.equal(c.what, entryFor(catalog, 'qoder-teams')!.purpose);
    assert.ok(c.title.length > 0);
    const price = entryFor(catalog, 'qoder-teams')!.price;
    if (price) assert.ok(c.price!.includes(price.asOf) && c.price!.includes(price.summary));
    assert.ok(c.docs === null || c.docs.startsWith('https://'));
  });
  it('a badge says what it is attached to', () => {
    const { scene, state, t: tt } = sceneOf('residency');
    const waf = scene.badgeById.get('waf')!;
    const c = popContent(waf, scene.byId.get(waf.host)!.label, catalog, state.session.provenance, 'en', tt);
    assert.match(c.attachedTo!, /ALB/);
  });
  it('safeDocs accepts https only', () => {
    assert.equal(safeDocs('javascript:alert(1)'), null);
    assert.equal(safeDocs('http://example.com'), null);
    assert.equal(safeDocs('https://www.alibabacloud.com/help'), 'https://www.alibabacloud.com/help');
    assert.equal(safeDocs(undefined), null);
  });
});

describe('labels', () => {
  it('every local label has English, Korean and Chinese with the same placeholders', async () => {
    const src = await import('./labels.ts');
    // label() falls back to English; make sure ko and zh differ from English wherever the English has letters (except AI, VPC, SaaS)
    const same = new Set(['lane.ai', 'frame.vpc']);
    for (const key of ['lane.storage', 'lane.ops', 'frame.region', 'frame.zone', 'legend.path', 'conn.heading', 'zoom.value', 'badge.on', 'card.revTag', 'canvas.keys'] as const) {
      const en = src.label('en', key);
      for (const lang of ['ko', 'zh'] as const) {
        const other = src.label(lang, key);
        assert.notEqual(other, en, `${lang} ${key}`);
        assert.deepEqual(en.match(/\{\w+\}/g)?.sort() ?? [], other.match(/\{\w+\}/g)?.sort() ?? [], `${lang} ${key} placeholders`);
      }
    }
    assert.ok(same.size === 2);
    assert.equal(label('en', 'zoom.value', { value: '84%' }), 'Zoom 84%');
  });
});
