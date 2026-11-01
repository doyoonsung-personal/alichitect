// The assume and ask ops in the console (research/phase1-asks-and-scope.md section 1): what becomes a chip, what becomes
// a question, when each one goes. Driven by the synthetic fixtures asks-shop and asks-vague (English and Korean) through
// the real reducer, plus small hand-built records for the edge cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeT } from '../i18n/t.ts';
import { correctionAsk, canAnswer, visibleAssumptions, ASM_COLLAPSED } from '../console/logic.ts';
import { catalog, loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { createInitialState } from './reducer.ts';
import { createStore } from './store.ts';
import type { Fixture } from '../replay/plan.ts';
import { askViews, assumptionViews, settles } from './asks.ts';
import type { AssumptionView } from './asks.ts';
import type { AppState, Revision } from './types.ts';

const en = makeT('en');
const ko = makeT('ko');
const last = <T>(xs: readonly T[]): T => xs[xs.length - 1];
const texts = (s: AppState): string[] => assumptionViews(s.session, s.work).map((a) => a.text);

/** The state after the first `turns` turns of a fixture have committed. */
function after(fx: Fixture, turns: number): AppState {
  const store = fx.lang === 'en' ? newStore() : createStore(catalog, createInitialState({ lang: fx.lang, canvas: { w: 1040, h: 800 }, id: 's1', now: 0 }));
  play(store, fx, { flushEvery: 6, count: turns });
  return store.getState();
}

// ---------- settles ----------

test('a requirement settles an assumption when it states its text or its alternative', () => {
  const a = { id: 'exposure', text: 'Public-facing', alt: 'Internal only' };
  assert.equal(settles('Internal only, no public access', a), true);
  assert.equal(settles('The portal is public-facing', a), true);
  assert.equal(settles('PUBLIC FACING.', a), true, 'case, spacing and punctuation do not matter');
  assert.equal(settles('Customer data must stay in Singapore', a), false);
  assert.equal(settles('Add disaster recovery', a), false);
});

test('a text too short to mean anything settles nothing', () => {
  assert.equal(settles('Use HA for the DB', { id: 'x', text: 'HA' }), false);
  assert.equal(settles('Use HA for the DB', { id: 'x', text: 'DB' }), false);
  assert.equal(settles('Single region', { id: 'x', text: '' }), false);
});

test('settling works for Korean and Chinese', () => {
  assert.equal(settles('내부 전용, 외부 접근 없음', { id: 'e', text: '외부 공개', alt: '내부 전용' }), true);
  assert.equal(settles('数据必须留在新加坡', { id: 'r', text: '新加坡区域', alt: '香港区域' }), false);
  assert.equal(settles('仅限内部访问', { id: 'e', text: '面向公众', alt: '仅限内部访问' }), true);
});

// ---------- chips ----------

test('draw first: the assume ops show as chips while the turn streams, before the commit', () => {
  const fx = loadFixtureFile('asks-shop');
  const store = newStore();
  const firstAssume = fx.turns[0].ev.findIndex(([, e]) => e.type === 'op' && e.op.t === 'assume');
  assert.ok(firstAssume > 0);
  play(store, fx, { flushEvery: 6, count: 1, stopAfter: firstAssume + 1 });
  let s = store.getState();
  assert.ok(s.work, 'the turn is still streaming');
  assert.deepEqual(texts(s), ['Public-facing']);
  s = after(fx, 1);
  assert.equal(s.work, null);
  assert.deepEqual(texts(s), ['Public-facing', 'Singapore region']);
});

test('the chips carry the one-click alternative', () => {
  const s = after(loadFixtureFile('asks-shop'), 1);
  assert.deepEqual(assumptionViews(s.session, s.work), [
    { id: 'exposure', text: 'Public-facing', alt: 'Internal only' },
    { id: 'region', text: 'Singapore region', alt: 'Hong Kong region' },
  ]);
});

test('the editor sends a sentence that quotes the assumption and says it is corrected, in the session language, and it is what the fixture sends', () => {
  const chip = (id: string): AssumptionView => assumptionViews(after(loadFixtureFile('asks-shop'), 1).session, null).find((a) => a.id === id)!;
  assert.equal(correctionAsk(chip('exposure'), 'Internal only', true, en), 'About the assumption “Public-facing”: it should be Internal only.');
  assert.equal(correctionAsk(chip('exposure'), 'Internal only', true, en), loadFixtureFile('asks-shop').turns[2].ask);
  const kchip = assumptionViews(after(loadFixtureFile('asks-shop-ko'), 1).session, null).find((a) => a.id === 'exposure')!;
  assert.equal(correctionAsk(kchip, '내부 전용', true, ko), '가정 “외부 공개”에 대해: 실제로는 “내부 전용”입니다.');
  assert.equal(correctionAsk(kchip, '내부 전용', true, ko), loadFixtureFile('asks-shop-ko').turns[2].ask);
});

test('the turn in flight retires the assumption it corrects by id, even when the model streams a new guess for it', () => {
  const fx = loadFixtureFile('asks-shop');
  const store = newStore();
  play(store, fx, { flushEvery: 6, count: 2 });
  assert.deepEqual(texts(store.getState()), ['Public-facing', 'Singapore region']);
  const ask = 'About the assumption “Public-facing”: only our staff on the VPN';
  store.dispatch({ type: 'turn/start', ask, now: 900_000 });
  const s0 = store.getState();
  assert.ok(s0.work, 'streaming');
  assert.deepEqual(texts(s0), ['Singapore region'], 'gone at once, before any op arrives');
  store.dispatch({ type: 'turn/event', event: { type: 'op', op: { t: 'assume', id: 'exposure', text: 'Staff VPN only', alt: 'Public-facing' } } as never, now: 900_100 });
  assert.deepEqual(texts(store.getState()), ['Singapore region'], 'a re-guess with the same id never shows');
});

test('answering a question does not touch the assumptions; the requirement that settles one removes only its chip', () => {
  const fx = loadFixtureFile('asks-shop');
  assert.deepEqual(texts(after(fx, 2)), ['Public-facing', 'Singapore region'], 'turn 2 answers the scale question');
  const s3 = after(fx, 3);
  assert.deepEqual(s3.session.memory.requirements, ['About 100,000 shoppers on a busy day', 'Internal only, no public access']);
  assert.deepEqual(texts(s3), ['Singapore region'], 'the flipped assumption is now a pinned requirement and its chip is gone');
});

test('the chip goes as soon as the requirement streams, before the commit', () => {
  const fx = loadFixtureFile('asks-shop');
  const store = newStore();
  play(store, fx, { flushEvery: 6, count: 2 });
  const turn3 = fx.turns[2];
  const reqAt = turn3.ev.findIndex(([, e]) => e.type === 'op' && e.op.t === 'req');
  assert.ok(reqAt >= 0);
  store.dispatch({ type: 'turn/start', ask: turn3.ask, now: 900_000 });
  for (let i = 0; i <= reqAt; i++) store.dispatch({ type: 'turn/event', event: turn3.ev[i][1], now: 900_000 + turn3.ev[i][0] });
  const s = store.getState();
  assert.ok(s.work, 'still streaming');
  assert.deepEqual(texts(s), ['Singapore region']);
  assert.deepEqual(s.session.memory.assumptions?.map((a) => a.id), ['exposure', 'region'], 'the server memory has not changed yet');
});

test('a requirement already pinned hides a chip the memory still lists', () => {
  const s = after(loadFixtureFile('asks-shop'), 1);
  const session = { ...s.session, memory: { ...s.session.memory, requirements: ['Everything is internal only'] } };
  assert.deepEqual(assumptionViews(session, null).map((a) => a.id), ['region']);
});

test('a session with no assumptions has no chips; a Korean session shows Korean chips', () => {
  const s = after(loadFixtureFile('ha'), 1);
  assert.deepEqual(assumptionViews(s.session, s.work), []);
  assert.deepEqual(texts(after(loadFixtureFile('asks-shop-ko'), 1)), ['외부 공개', '싱가포르 리전']);
});

test('chips collapse past three and report how many are hidden', () => {
  const list: AssumptionView[] = ['a', 'b', 'c', 'd', 'e'].map((x) => ({ id: x, text: x.repeat(5) }));
  assert.equal(ASM_COLLAPSED, 3);
  const c = visibleAssumptions(list, false);
  assert.equal(c.shown.length, 3);
  assert.equal(c.hidden, 2);
  assert.equal(visibleAssumptions(list, true).shown.length, 5);
  assert.equal(visibleAssumptions(list.slice(0, 3), false).hidden, 0);
});

test('chips and options work only between turns and never in a replay', () => {
  assert.equal(canAnswer('idle', false), true);
  assert.equal(canAnswer('error', false), true);
  assert.equal(canAnswer('streaming', false), false);
  assert.equal(canAnswer('waiting', false), false);
  assert.equal(canAnswer('idle', true), false);
});

// ---------- questions ----------

test('draw first, then ask: the shop revision has a design and two open questions with options', () => {
  const s = after(loadFixtureFile('asks-shop'), 1);
  const rev = last(s.session.revisions);
  assert.ok(rev.added > 8, 'a diagram was drawn');
  const views = askViews(s.session.revisions, 0);
  assert.equal(views.length, 2);
  assert.deepEqual(views.map((v) => v.state), ['open', 'open']);
  assert.deepEqual(views[0].options, ['Under 10,000 shoppers', 'About 100,000 shoppers', 'Over 1 million shoppers']);
  assert.equal(views[0].id, 'scale');
});

test('an option sent as the next ask answers its question; the other question is replied-to and closed', () => {
  const s = after(loadFixtureFile('asks-shop'), 2);
  const views = askViews(s.session.revisions, 0);
  assert.equal(views[0].state, 'answered');
  assert.equal(views[0].answer, 'About 100,000 shoppers');
  assert.equal(views[0].closedIn, 2);
  assert.equal(views[1].state, 'replied', 'the question the answer did not address is closed too');
  assert.equal(views[1].closedIn, 2);
  assert.deepEqual(askViews(s.session.revisions, 1), [], 'revision 2 asked nothing');
});

test('the question is open only while its revision is the newest', () => {
  const s = after(loadFixtureFile('asks-shop'), 3);
  assert.deepEqual(askViews(s.session.revisions, 0).map((v) => v.state), ['answered', 'replied']);
  assert.deepEqual(askViews(s.session.revisions, 2), []);
});

test('a free-typed answer clears every open question, and an option typed word for word counts as that option', () => {
  const ask = (text: string, options: string[]) => ({ id: text, text, options });
  const revs: Revision[] = [
    { ...baseRev(1, 'Build a store'), asks: [ask('Scale?', ['About 100,000 shoppers', 'Over 1 million']), ask('Where?', ['On-premises', 'Another cloud'])] },
    baseRev(2, 'We expect around fifty thousand'),
  ];
  assert.deepEqual(askViews(revs, 0).map((v) => v.state), ['replied', 'replied']);
  const typedOption = [revs[0], baseRev(2, ' about 100,000 shoppers. ')];
  const v = askViews(typedOption, 0);
  assert.equal(v[0].state, 'answered');
  assert.equal(v[0].answer, 'About 100,000 shoppers');
  assert.equal(v[1].state, 'replied');
  assert.deepEqual(askViews([revs[0]], 0).map((x) => x.state), ['open', 'open']);
});

test('a question with no options is open until the next revision, then replied; one without asks has no views', () => {
  const revs: Revision[] = [{ ...baseRev(1, 'x'), asks: [{ id: 'q', text: 'Anything else?' }] }, baseRev(2, 'no')];
  assert.deepEqual(askViews(revs, 0).map((v) => [v.state, v.options.length]), [['replied', 0]]);
  assert.deepEqual(askViews(revs, 1), []);
  assert.deepEqual(askViews([], 0), []);
});

test('question first: "We need cloud" asks two questions and draws nothing', () => {
  const s = after(loadFixtureFile('asks-vague'), 1);
  const rev = last(s.session.revisions);
  assert.equal(rev.status, 'done');
  assert.equal(rev.added, 0);
  assert.equal(rev.cards.length, 0);
  assert.equal(Object.keys(s.session.memory.graph.nodes).length, 0);
  assert.deepEqual(assumptionViews(s.session, s.work), [], 'nothing is assumed before anything is drawn');
  const views = askViews(s.session.revisions, 0);
  assert.equal(views.length, 2);
  assert.deepEqual(views.map((v) => v.options.length), [4, 2]);
});

test('question first, then an option: the next revision draws, assumes and answers the first question', () => {
  const s = after(loadFixtureFile('asks-vague'), 2);
  const [r1, r2] = s.session.revisions;
  assert.equal(r2.ask, 'A website or online store');
  assert.ok(r2.added > 8);
  const v = askViews(s.session.revisions, 0);
  assert.deepEqual(v.map((x) => x.state), ['answered', 'replied']);
  assert.equal(v[0].answer, 'A website or online store');
  assert.deepEqual(askViews(s.session.revisions, 1).map((x) => x.state), ['open'], 'the store turn asks about scale');
  assert.deepEqual(texts(s), ['Public-facing', 'Singapore region']);
  assert.ok(r1.asks?.length === 2);
});

test('the commit memory has the final say: the server may drop questions that broke its limits', () => {
  const fx = structuredClone(loadFixtureFile('asks-vague'));
  const commit = fx.turns[0].ev.find(([, e]) => e.type === 'commit')![1];
  assert.ok(commit.type === 'commit');
  commit.memory.questions = commit.memory.questions!.slice(0, 1);
  const s = after(fx, 1);
  assert.equal(last(s.session.revisions).asks?.length, 1);
});

test('a failed turn keeps no questions or assumptions of its own', () => {
  const store = newStore();
  store.dispatch({ type: 'turn/start', ask: 'We need cloud', now: 1000 });
  store.dispatch({ type: 'turn/event', event: { type: 'op', seq: 1, op: { t: 'assume', id: 'a', text: 'Public-facing', alt: 'Internal only' }, added: [], updated: [], removed: [], phase: 'main' }, now: 1100 });
  store.dispatch({ type: 'turn/event', event: { type: 'op', seq: 2, op: { t: 'ask', id: 'q', text: 'Who?', options: ['A', 'B'] }, added: [], updated: [], removed: [], phase: 'main' }, now: 1200 });
  let s = store.getState();
  assert.equal(assumptionViews(s.session, s.work).length, 1, 'visible while streaming');
  store.dispatch({ type: 'turn/event', event: { type: 'fatal', code: 'idle-timeout', message: 'Stopped', retryable: true }, now: 1300 });
  s = store.getState();
  assert.equal(last(s.session.revisions).status, 'failed');
  assert.deepEqual(last(s.session.revisions).asks, []);
  assert.deepEqual(assumptionViews(s.session, s.work), []);
});

test('the reducer trims, de-duplicates and caps options at four; a note with no text is dropped; the same id replaces', () => {
  const store = newStore();
  store.dispatch({ type: 'turn/start', ask: 'x', now: 1000 });
  const op = (seq: number, o: unknown) => store.dispatch({ type: 'turn/event', event: { type: 'op', seq, op: o, added: [], updated: [], removed: [], phase: 'main' } as never, now: 1000 + seq });
  op(1, { t: 'ask', id: 'q', text: ' Who? ', options: [' A ', 'A', 'B', '', 'C', 'D', 'E'] });
  op(2, { t: 'ask', id: 'blank', text: '   ' });
  op(3, { t: 'assume', id: 'a', text: 'Public-facing' });
  op(4, { t: 'assume', id: 'a', text: 'Internal only', alt: ' Public-facing ' });
  const rev = last(store.getState().session.revisions);
  assert.deepEqual(rev.asks, [{ id: 'q', text: 'Who?', options: ['A', 'B', 'C', 'D'] }]);
  assert.deepEqual(rev.assumes, [{ id: 'a', text: 'Internal only', alt: 'Public-facing' }]);
});

// ---------- the polite announcement ----------

test('new questions are announced politely, after what the revision drew', () => {
  const shop = after(loadFixtureFile('asks-shop'), 1);
  const text = shop.ui.live?.text ?? '';
  assert.match(text, /^Revision 1 drawn: \d+ added, 0 removed\. Qwen has 2 questions\. First: How many shoppers/);
  const vague = after(loadFixtureFile('asks-vague'), 1);
  assert.equal(vague.ui.live?.text, 'Qwen has 2 questions. First: What should the cloud run first?', 'a question-first revision drew nothing, so it says nothing about drawing');
  const one = after(loadFixtureFile('asks-vague'), 2);
  assert.match(one.ui.live?.text ?? '', /Qwen asks: How many shoppers/);
  assert.ok(!/Revision 2 drawn: 0/.test(one.ui.live?.text ?? ''));
});

test('the announcement is localized', () => {
  const s = after(loadFixtureFile('asks-vague-ko'), 1);
  assert.equal(s.ui.live?.text, 'Qwen의 질문이 2개 있습니다. 첫 번째: 클라우드에서 가장 먼저 운영할 것은 무엇인가요?');
});

// ---------- the fixtures themselves ----------

test('the fixtures obey the limits of the spec: 3 assumes and 2 asks per turn, text and option lengths', () => {
  for (const id of ['asks-shop', 'asks-vague', 'asks-shop-ko', 'asks-vague-ko']) {
    const fx = loadFixtureFile(id);
    assert.equal(fx.synthetic, true);
    for (const turn of fx.turns) {
      const ops = turn.ev.flatMap(([, e]) => (e.type === 'op' ? [e.op] : []));
      const assumes = ops.filter((o) => o.t === 'assume');
      const asks = ops.filter((o) => o.t === 'ask');
      assert.ok(assumes.length <= 3, `${id}: at most 3 assume ops`);
      assert.ok(asks.length <= 2, `${id}: at most 2 ask ops`);
      for (const a of assumes) {
        assert.ok(a.text.length <= 60 && (a.alt?.length ?? 0) <= 60, `${id}: ${a.text}`);
      }
      for (const q of asks) {
        assert.ok(q.text.length <= 160, `${id}: ${q.text}`);
        assert.ok((q.options?.length ?? 2) >= 2 && (q.options?.length ?? 2) <= 4, `${id}: ${q.text}`);
        for (const o of q.options ?? []) assert.ok(o.length <= 40, `${id}: ${o}`);
      }
    }
  }
});

test('every ask fixture plays to done revisions with no failed turn', () => {
  for (const id of ['asks-shop', 'asks-vague', 'asks-shop-ko', 'asks-vague-ko']) {
    const fx = loadFixtureFile(id);
    const s = after(fx, fx.turns.length);
    assert.equal(s.session.revisions.length, fx.turns.length, id);
    assert.ok(s.session.revisions.every((r) => r.status === 'done'), id);
    assert.equal(s.turn.phase, 'idle');
  }
});

function baseRev(n: number, ask: string): Revision {
  return {
    n,
    ask,
    askLang: 'en',
    startedAt: 0,
    status: 'done',
    note: '',
    changes: [],
    reqs: [],
    lifecycle: [],
    fix: { autoFixes: [], constraint: [], state: 'none', note: '', changes: [] },
    statusLine: null,
    truncated: false,
    durationMs: 1000,
    error: null,
    commitWarnings: [],
    added: 0,
    removed: 0,
    cards: [],
    gone: [],
  };
}
