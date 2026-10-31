import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { requirements, taggedRevision, buildMarks, summaryView } from './selectors.ts';
import { sessionSummary } from './reducer.ts';
import type { Revision } from './types.ts';

const last = (rs: readonly Revision[]): Revision => rs[rs.length - 1];

test('a turn goes waiting, streaming, then idle at commit with the server memory', () => {
  const store = newStore();
  const fx = loadFixtureFile('ha');
  store.dispatch({ type: 'turn/start', ask: fx.turns[0].ask, now: 1000 });
  let s = store.getState();
  assert.equal(s.view, 'working');
  assert.equal(s.turn.phase, 'waiting');
  assert.equal(last(s.session.revisions).status, 'waiting');
  assert.equal(s.session.title, fx.turns[0].ask);
  assert.equal(s.ui.live?.text, 'Revision 1 started.');

  const first = fx.turns[0].ev.findIndex(([, e]) => e.type === 'say');
  store.dispatch({ type: 'turn/event', event: fx.turns[0].ev[first][1], now: 1000 + fx.turns[0].ev[first][0] });
  s = store.getState();
  assert.equal(s.turn.phase, 'streaming');
  assert.ok(s.turn.lastTextAt !== null);
  assert.ok(last(s.session.revisions).note.length > 0);

  play(store, fx, { flushEvery: 6, from: 0, count: 0 }); // no-op: count 0
  const store2 = newStore();
  play(store2, fx, { flushEvery: 6 });
  s = store2.getState();
  const rev = last(s.session.revisions);
  assert.equal(s.turn.phase, 'idle');
  assert.equal(s.work, null);
  assert.equal(rev.status, 'done');
  assert.equal(rev.durationMs, fx.turns[0].ev[fx.turns[0].ev.length - 1][0]);
  const commit = fx.turns[0].ev.find(([, e]) => e.type === 'commit')![1];
  assert.equal(s.session.memory, commit.type === 'commit' ? commit.memory : null);
  // the display equals the committed graph at turn end
  assert.equal(s.display.graph, s.session.memory.graph);
  assert.equal(s.display.reason, 'commit');
  assert.ok(s.display.refit);
  assert.ok(Object.keys(s.display.layout!.cards).length >= 8);
  assert.ok(rev.changes.some((l) => l.kind === 'added'));
  assert.ok(rev.cards.length > 0);
  assert.equal(rev.added > 0, true);
  assert.deepEqual(taggedRevision(s)?.n, 1);
});

test('batches lay out mid-turn, hold the refit to the first batch of the first turn, and keep BuildMarks', () => {
  const store = newStore();
  const fx = loadFixture('ha');
  play(store, fx, { flushEvery: 5, stopAfter: 28 });
  const s = store.getState();
  assert.ok(s.work);
  assert.equal(s.display.reason, 'batch');
  assert.equal(s.display.refit, false); // only the first batch refits
  assert.ok(s.display.layout);
  assert.ok(buildMarks(s).length > 0);
  assert.equal(taggedRevision(s), null);
  assert.equal(s.turn.phase, 'streaming');
});

function loadFixture(id: string) {
  return loadFixtureFile(id);
}

test('the first batch of the first turn refits once', () => {
  const store = newStore();
  const fx = loadFixture('ha');
  store.dispatch({ type: 'turn/start', ask: fx.turns[0].ask, now: 0 });
  let batches = 0;
  let refits = 0;
  let version = 0;
  for (const [t, event] of fx.turns[0].ev) {
    store.dispatch({ type: 'turn/event', event, now: t });
    if (event.type === 'op') {
      store.dispatch({ type: 'turn/flush', now: t });
      const d = store.getState().display;
      if (d.version !== version && d.reason === 'batch') {
        batches++;
        if (d.refit) refits++;
        version = d.version;
      }
    }
  }
  assert.ok(batches > 3);
  assert.equal(refits, 1);
});

test('requirements pin mid-turn and hold after commit; revisions keep numbering and provenance', () => {
  const store = newStore();
  const fx = loadFixture('residency');
  play(store, fx, { flushEvery: 8, count: 1 });
  let s = store.getState();
  const reqs = requirements(s);
  assert.ok(reqs.length >= 1);
  assert.ok(reqs.every((r) => r.state === 'held'));
  assert.equal(reqs[0].isNew, true);
  assert.deepEqual(reqs[0].regions, ['ap-southeast-1']);
  assert.equal(s.session.reqPinnedIn[reqs[0].text], 1);

  play(store, fx, { flushEvery: 8, from: 1, count: 1 });
  s = store.getState();
  assert.equal(s.session.revisions.length, 2);
  assert.deepEqual(s.session.revisions.map((r) => r.n), [1, 2]);
  assert.equal(requirements(s)[0].isNew, false);
  const added2 = last(s.session.revisions).cards.filter((id) => s.session.provenance[id]?.addedIn === 2);
  assert.ok(added2.length > 0, 'disaster recovery adds cards in revision 2');
  assert.equal(sessionSummary(s.session).revisions, 2);
});

test('a revision that pins a requirement shows it as soon as the req op arrives', () => {
  const store = newStore();
  const fx = loadFixture('residency');
  const turn = fx.turns[0];
  store.dispatch({ type: 'turn/start', ask: turn.ask, now: 0 });
  const i = turn.ev.findIndex(([, e]) => e.type === 'op' && e.op.t === 'req');
  for (let k = 0; k <= i; k++) store.dispatch({ type: 'turn/event', event: turn.ev[k][1], now: turn.ev[k][0] });
  const s = store.getState();
  assert.equal(s.session.memory.requirements.length, 0, 'memory is replaced only at commit');
  assert.equal(requirements(s).length, 1);
  assert.match(s.ui.live!.text, /^Requirement pinned/);
});

test('repair turn: Checking, then the FixBlock, then Held by a fix', () => {
  const store = newStore();
  const fx = loadFixture('chinese-fix');
  const turn = fx.turns[0];
  store.dispatch({ type: 'turn/start', ask: turn.ask, now: 0 });
  let sawChecking = false;
  let sawFixing = false;
  for (const [t, event] of turn.ev) {
    store.dispatch({ type: 'turn/event', event, now: t });
    const s = store.getState();
    if (requirements(s).some((r) => r.state === 'checking')) sawChecking = true;
    if (s.turn.phase === 'repairing' && last(s.session.revisions).fix.state === 'fixing') sawFixing = true;
  }
  assert.ok(sawChecking, 'Checking appears mid-turn');
  assert.ok(sawFixing, 'the FixBlock is fixing while the repair streams');
  const s = store.getState();
  const rev = last(s.session.revisions);
  assert.equal(rev.fix.state, 'fixed');
  assert.ok(rev.fix.note.length > 0, 'the repair-phase note');
  assert.ok(rev.fix.constraint.length > 0);
  assert.equal(rev.note.includes(rev.fix.note), false, 'the repair note is not in the main note');
  assert.equal(rev.statusLine, null);
  const r = requirements(s)[0];
  assert.equal(r.state, 'repaired');
  assert.equal(r.stateRev, 1);
  // the repair relabelled the card in place
  assert.equal(s.session.memory.graph.nodes.users.label, '海外用户');
  assert.equal(rev.askLang, 'zh');
});

test('a Kubernetes swap becomes a replacement with ghosts, and unrelated cards are not touched', () => {
  const store = newStore();
  const fx = loadFixture('ecommerce-k8s');
  play(store, fx, { flushEvery: 6 });
  const rev = last(store.getState().session.revisions);
  assert.equal(rev.n, 2);
  const rep = rev.changes.filter((l) => l.kind === 'replaced');
  assert.ok(rep.length >= 1, JSON.stringify(rev.changes.map((l) => [l.kind, l.name, l.fromName])));
  assert.ok(rep.some((l) => l.fromName === 'ECS' && l.name === 'ACK'), JSON.stringify(rep.map((l) => [l.fromName, l.name])));
  assert.ok(rep[0].ghosts.length >= 1 && rep[0].cards.length >= 1);
  assert.ok(rev.removed >= 1 && rev.added >= 1);
});

test('"oh i also want waf" when WAF is already drawn changes nothing', () => {
  const store = newStore();
  const fx = loadFixture('ecommerce');
  play(store, fx, { flushEvery: 6 });
  const s = store.getState();
  const rev = last(s.session.revisions);
  assert.equal(rev.n, 2);
  assert.equal(rev.changes.length, 0);
  assert.match(rev.note, /WAF/);
});

test('a product need draws a solution map from rec ops', () => {
  const store = newStore();
  const fx = loadFixture('ai-agent');
  play(store, fx, { flushEvery: 3 });
  const s = store.getState();
  const rev = last(s.session.revisions);
  assert.ok(rev.changes.some((l) => l.kind === 'recommended' && l.name === 'Qoder Teams'), JSON.stringify(rev.changes.map((l) => l.name)));
  assert.equal(s.display.layout!.mode, 'solution');
  assert.ok(s.display.graph.recs.length >= 1);
});

test('fatal: the revision keeps its ask, shows the error, and the canvas returns to the committed graph', () => {
  const store = newStore();
  const ha = loadFixtureFile('ha');
  play(store, ha, { flushEvery: 6 });
  const committed = store.getState().session.memory;
  const fx = loadFixture('stub-fatal');
  const base = 99_000;
  store.dispatch({ type: 'turn/start', ask: 'Add a data warehouse', now: base });
  for (const [t, event] of fx.turns[0].ev) {
    store.dispatch({ type: 'turn/event', event, now: base + t });
    if (event.type === 'op') store.dispatch({ type: 'turn/flush', now: base + t });
  }
  const s = store.getState();
  const rev = last(s.session.revisions);
  assert.equal(rev.status, 'failed');
  assert.equal(rev.ask, 'Add a data warehouse');
  assert.equal(rev.error?.code, 'idle-timeout');
  assert.equal(rev.error?.retryable, true);
  assert.equal(rev.changes.length, 0);
  assert.equal(s.turn.phase, 'error');
  assert.equal(s.work, null);
  assert.equal(s.session.memory, committed, 'memory is unchanged');
  assert.equal(s.display.graph, committed.graph);
  assert.equal(s.display.reason, 'revert');
  assert.match(s.ui.live!.text, /^Revision 2 failed\./);

  // Edit and resend: the failed revision leaves the record
  store.dispatch({ type: 'rev/discardFailed' });
  assert.equal(store.getState().session.revisions.length, 1);
});

test('content-filtered keeps its code and is not retryable', () => {
  const store = newStore();
  const fx = loadFixture('stub-filtered');
  play(store, fx);
  const rev = last(store.getState().session.revisions);
  assert.equal(rev.error?.code, 'content-filtered');
  assert.equal(rev.error?.retryable, false);
  assert.equal(store.getState().display.layout, null, 'the first turn failed: nothing to draw');
});

test('a dropped stream is a client error; Try again replaces the failed revision', () => {
  const store = newStore();
  const fx = loadFixture('stub-network');
  play(store, fx, { flushEvery: 4 });
  assert.ok(store.getState().work, 'the stream ended with no commit and no fatal');
  store.dispatch({ type: 'turn/fail', code: 'network', message: '', retryable: true, now: 50_000 });
  const s = store.getState();
  const rev = last(s.session.revisions);
  assert.equal(rev.status, 'failed');
  assert.equal(rev.error?.client, true);
  assert.equal(rev.error?.code, 'network');
  store.dispatch({ type: 'turn/start', ask: rev.ask, now: 60_000, replaceLast: true });
  const s2 = store.getState();
  assert.equal(s2.session.revisions.length, 1);
  assert.equal(last(s2.session.revisions).n, 1);
  assert.equal(last(s2.session.revisions).status, 'waiting');
});

test('Stop returns to the committed graph and marks the revision stopped', () => {
  const store = newStore();
  const fx = loadFixture('ecommerce');
  play(store, fx, { flushEvery: 6, count: 1 });
  const committed = store.getState().session.memory;
  const turn2 = fx.turns[1];
  store.dispatch({ type: 'turn/start', ask: turn2.ask, now: 90_000 });
  store.dispatch({ type: 'turn/event', event: turn2.ev[0][1], now: 90_100 });
  store.dispatch({ type: 'turn/stop', now: 91_000 });
  const s = store.getState();
  assert.equal(last(s.session.revisions).status, 'stopped');
  assert.equal(s.work, null);
  assert.equal(s.turn.phase, 'idle');
  assert.equal(s.session.memory, committed);
});

test('status lines and the rolling summary', () => {
  const store = newStore();
  const fb = loadFixture('stub-fallback');
  const turn = fb.turns[0];
  store.dispatch({ type: 'turn/start', ask: turn.ask, now: 0 });
  store.dispatch({ type: 'turn/event', event: turn.ev[0][1], now: 600 });
  let s = store.getState();
  assert.equal(s.turn.phase, 'fallback');
  assert.equal(last(s.session.revisions).statusLine?.code, 'fallback');
  const say = turn.ev.find(([, e]) => e.type === 'say')!;
  store.dispatch({ type: 'turn/event', event: say[1], now: say[0] });
  s = store.getState();
  assert.equal(last(s.session.revisions).statusLine, null, 'cleared when text arrives');
  assert.equal(s.turn.phase, 'streaming');

  const store2 = newStore();
  play(store2, loadFixture('stub-summary'), { flushEvery: 6 });
  s = store2.getState();
  const v = summaryView(s);
  assert.ok(v && v.text?.startsWith('Stub summary'));
  assert.equal(v!.summarizing, false);
  assert.ok(v!.through >= 1);
});

test('unpin removes the requirement and its constraint; Undo puts both back', () => {
  const store = newStore();
  play(store, loadFixture('residency'), { flushEvery: 8, count: 1 });
  const text = store.getState().session.memory.requirements[0];
  assert.ok(store.getState().session.memory.constraints?.length);
  store.dispatch({ type: 'req/unpin', text, now: 5 });
  let s = store.getState();
  assert.equal(s.session.memory.requirements.length, 0);
  assert.equal(s.session.memory.constraints, undefined);
  assert.equal(s.ui.toast?.kind, 'unpinned');
  store.dispatch({ type: 'req/undo' });
  s = store.getState();
  assert.deepEqual(s.session.memory.requirements, [text]);
  assert.equal(s.session.memory.constraints?.length, 1);
  assert.equal(s.ui.toast, null);
});

test('opening a saved session rebuilds the record and the committed graph with no entrance animation', () => {
  const a = newStore();
  play(a, loadFixture('residency'), { flushEvery: 8, count: 2 });
  const rec = a.getState().session;
  const b = newStore();
  b.dispatch({ type: 'session/open', record: rec, now: 123_456_789_000 });
  const s = b.getState();
  assert.equal(s.view, 'working');
  assert.equal(s.session.revisions.length, 2);
  assert.equal(s.display.animate, false);
  assert.equal(s.display.reason, 'restore');
  assert.equal(s.display.graph, rec.memory.graph);
  assert.equal(s.ui.toast?.kind, 'restored');
  assert.equal(Object.keys(s.display.layout!.cards).length, Object.keys(a.getState().display.layout!.cards).length);
});

test('every fixture plays to a commit or its intended ending without throwing, and lays out every committed graph', () => {
  const ids = ['ecommerce', 'ecommerce-k8s', 'ha', 'residency', 'ai-agent', 'korean', 'chinese', 'chinese-fix', 'stub-fallback', 'stub-summary'];
  for (const id of ids) {
    const store = newStore();
    const fx = loadFixtureFile(id);
    play(store, fx, { flushEvery: 4 });
    const s = store.getState();
    assert.equal(s.work, null, id);
    assert.equal(s.session.revisions.length, fx.turns.length, id);
    assert.ok(s.session.revisions.every((r) => r.status === 'done'), id);
    assert.ok(s.display.layout, id);
    for (const c of Object.values(s.display.layout!.cards)) assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y), id);
  }
  // nodes are named from the catalog
  const store = newStore();
  play(store, loadFixtureFile('ha'), { flushEvery: 4 });
  for (const l of last(store.getState().session.revisions).changes) {
    if (l.product) assert.equal(l.name, catalog.byId.get(l.product)?.short);
  }
});

test('requirement states from the commit warnings: error-level is Not met, warning-level is At risk, none is Held', () => {
  const store = newStore();
  play(store, loadFixture('residency'), { flushEvery: 8, count: 1 });
  const s = store.getState();
  const withWarnings = (severity: 'error' | 'warn' | null) => {
    const revs = s.session.revisions.map((r) => (severity ? { ...r, commitWarnings: [{ code: 'constraint-region' as const, ids: [], msg: 'x', severity, repaired: false }] } : r));
    return requirements({ ...s, session: { ...s.session, revisions: revs } }).filter((r) => r.regions.length);
  };
  assert.ok(withWarnings(null).length > 0);
  assert.ok(withWarnings(null).every((r) => r.state === 'held'));
  assert.ok(withWarnings('error').every((r) => r.state === 'broken' && r.stateRev === 1));
  assert.ok(withWarnings('warn').every((r) => r.state === 'atRisk'));
});

test('a draft stays until the composer takes it, then it is gone; the account survives a new session', () => {
  const store = newStore();
  store.dispatch({ type: 'ui/draft', text: 'an ask kept across sign-in' });
  assert.equal(store.getState().ui.composerDraft?.text, 'an ask kept across sign-in');
  store.dispatch({ type: 'ui/draftTaken' });
  assert.equal(store.getState().ui.composerDraft, null);
  const before = store.getState();
  store.dispatch({ type: 'ui/draftTaken' });
  assert.equal(store.getState(), before, 'nothing to take: the state object is unchanged');
  const account = { email: 'mina@example.com', name: 'Mina Park', role: 'member' as const, turnsToday: 2, turnsPerDay: 60, links: { account: '/account', admin: null, signOut: '/auth/logout' } };
  store.dispatch({ type: 'account/set', account });
  store.dispatch({ type: 'session/new', id: 'fresh', now: 5 });
  assert.deepEqual(store.getState().account, account);
});
