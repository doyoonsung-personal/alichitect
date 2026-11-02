import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, BATCH_MS } from './player.ts';
import type { PlayerHost } from './player.ts';
import { DROP_AFTER_MS, TURN_GAP_MS, planTurn, turnEnding } from './plan.ts';
import type { Action } from '../store/reducer.ts';
import type { ReplaySpeed } from '../store/types.ts';
import { loadFixtureFile, newStore } from '../test/fixtures.ts';

/** A fake clock and timer queue: advance(ms) runs everything due, in order. */
function fakeHost(dispatch: (a: Action) => void): PlayerHost & { advance(ms: number): void; pending(): number; time(): number } {
  let now = 10_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    dispatch,
    now: () => now,
    setTimeout(fn, ms) {
      const id = ++seq;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout(h) {
      timers.delete(h as number);
    },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        timers.delete(due[0]);
        now = Math.max(now, due[1].at);
        due[1].fn();
      }
      now = end;
    },
    pending: () => timers.size,
    time: () => now,
  };
}

test('planTurn keeps recorded order and scales time by speed', () => {
  const fx = loadFixtureFile('ha');
  const turn = fx.turns[0];
  const one = planTurn(turn, '1x');
  const four = planTurn(turn, '4x');
  const now = planTurn(turn, 'instant');
  assert.equal(one.length, turn.ev.length);
  assert.equal(one[one.length - 1].at, turn.ev[turn.ev.length - 1][0]);
  assert.equal(four[four.length - 1].at, Math.round(turn.ev[turn.ev.length - 1][0] / 4));
  assert.ok(now.every((e) => e.at === 0));
  assert.deepEqual(one.map((e) => e.vt), turn.ev.map(([t]) => t), 'the reducer clock is always the recorded time');
  assert.equal(turnEnding(turn), 'commit');
  assert.equal(turnEnding(loadFixtureFile('stub-fatal').turns[0]), 'fatal');
  assert.equal(turnEnding(loadFixtureFile('stub-network').turns[0]), 'cut');
  assert.equal(turnEnding(loadFixtureFile('stub-summary').turns[0]), 'commit', 'a summary after the commit still ends in a commit');
});

function runFixture(id: string, speed: ReplaySpeed) {
  const store = newStore();
  const log: Array<{ at: number; a: Action }> = [];
  const host = fakeHost((a) => {
    log.push({ at: host.time(), a });
    store.dispatch(a);
  });
  const fx = loadFixtureFile(id);
  let done = false;
  const turns: number[] = [];
  const player = createPlayer(host, { fixture: fx, speed: () => speed, onTurn: (i) => turns.push(i), onDone: () => (done = true) });
  return { store, host, player, log, fx, isDone: () => done, turns };
}

test('1x dispatches each event at its recorded time and batches the display every 180 ms', () => {
  const r = runFixture('ha', '1x');
  const t0 = r.host.time();
  r.player.start();
  assert.equal(r.log[0].a.type, 'turn/start');
  const turn = r.fx.turns[0];
  const lastT = turn.ev[turn.ev.length - 1][0];
  r.host.advance(lastT + 1);
  const events = r.log.filter((l) => l.a.type === 'turn/event');
  assert.equal(events.length, turn.ev.length);
  // real dispatch time equals recorded time
  for (let i = 0; i < events.length; i++) assert.equal(events[i].at - t0, turn.ev[i][0], `event ${i}`);
  // the reducer's clock is the recorded time, offset by the turn start
  assert.equal((events[5].a as Extract<Action, { type: 'turn/event' }>).now - t0, turn.ev[5][0]);
  const flushes = r.log.filter((l) => l.a.type === 'turn/flush');
  assert.ok(flushes.length >= 5);
  for (const f of flushes) assert.equal((f.at - t0) % 1 === 0, true);
  // no two flushes closer than a batch
  for (let i = 1; i < flushes.length; i++) assert.ok(flushes[i].at - flushes[i - 1].at >= BATCH_MS);
  const rev = r.store.getState().session.revisions[0];
  assert.equal(rev.status, 'done');
  assert.equal(rev.durationMs, lastT);
  assert.equal(r.store.getState().display.reason, 'commit');
  r.host.advance(TURN_GAP_MS + 10);
  assert.equal(r.isDone(), true);
  assert.equal(r.host.pending(), 0);
});

test('4x is four times faster; instant dispatches everything synchronously and ends', () => {
  const r4 = runFixture('ha', '4x');
  r4.player.start();
  const lastT = r4.fx.turns[0].ev[r4.fx.turns[0].ev.length - 1][0];
  r4.host.advance(Math.round(lastT / 4) + 2);
  assert.equal(r4.store.getState().session.revisions[0].status, 'done');

  const ri = runFixture('residency', 'instant');
  ri.player.start();
  assert.equal(ri.isDone(), true, 'every turn played with no timers');
  assert.equal(ri.store.getState().session.revisions.length, 4);
  assert.ok(ri.store.getState().session.revisions.every((x) => x.status === 'done'));
  assert.equal(ri.host.pending(), 0);
});

test('turns follow each other after the pause, and the second turn sees the first turn memory', () => {
  const r = runFixture('ecommerce', '1x');
  r.player.start();
  const [t1, t2] = r.fx.turns;
  r.host.advance(t1.ev[t1.ev.length - 1][0] + 1);
  assert.deepEqual(r.turns, [0]);
  r.host.advance(TURN_GAP_MS);
  assert.deepEqual(r.turns, [0, 1]);
  r.host.advance(t2.ev[t2.ev.length - 1][0] + 1);
  const s = r.store.getState();
  assert.equal(s.session.revisions.length, 2);
  assert.equal(s.session.revisions[1].status, 'done');
});

test('stop cancels everything that was scheduled', () => {
  const r = runFixture('ha', '1x');
  r.player.start();
  r.host.advance(3000);
  const before = r.log.length;
  r.player.stop();
  r.host.advance(60_000);
  assert.equal(r.log.length, before);
  assert.equal(r.host.pending(), 0);
  assert.equal(r.player.playing, false);
});

test('restarting mid-play replays from the start without leftover timers', () => {
  const r = runFixture('ha', '1x');
  r.player.start();
  r.host.advance(5000);
  r.player.start();
  const turnStarts = r.log.filter((l) => l.a.type === 'turn/start').length;
  assert.equal(turnStarts, 2);
  const lastT = r.fx.turns[0].ev[r.fx.turns[0].ev.length - 1][0];
  r.host.advance(lastT + 1);
  const commits = r.log.filter((l) => l.a.type === 'turn/event' && l.a.event.type === 'commit').length;
  assert.equal(commits, 1, 'the first run was cancelled before it could commit');
});

test('a stream that ends with no commit is reported as a network drop after a pause', () => {
  const r = runFixture('stub-network', '1x');
  r.player.start();
  const turn = r.fx.turns[0];
  const lastT = turn.ev[turn.ev.length - 1][0];
  r.host.advance(lastT + 1);
  assert.equal(r.store.getState().session.revisions[0].status, 'streaming');
  r.host.advance(DROP_AFTER_MS);
  const rev = r.store.getState().session.revisions[0];
  assert.equal(rev.status, 'failed');
  assert.equal(rev.error?.code, 'network');
  assert.equal(r.isDone(), true);
});

test('a fatal ends the recording without a next turn', () => {
  const r = runFixture('stub-fatal', 'instant');
  r.player.start();
  const rev = r.store.getState().session.revisions[0];
  assert.equal(rev.status, 'failed');
  assert.equal(rev.error?.code, 'idle-timeout');
  assert.equal(r.isDone(), true);
});

for (const id of ['stub-workflow', 'stub-mixed-workflow']) {
  for (const speed of ['1x', '4x', 'instant'] as const) {
    test(`${id} replays its fake support-email stream at ${speed}`, () => {
      const r = runFixture(id, speed);
      r.player.start();
      r.host.advance(100000);
      assert.equal(r.isDone(), true);
      const s = r.store.getState();
      const commit = r.fx.turns.at(-1)!.ev.at(-1)![1];
      assert.equal(commit.type, 'commit');
      if (commit.type !== 'commit') return;
      assert.deepEqual(s.session.memory, commit.memory);
      assert.equal(s.session.mode, 'workflow');
      assert.equal(s.session.revisions.at(-1)?.mode, 'workflow');
      assert.equal(s.session.revisions.at(-1)?.status, 'done');
      assert.ok(Object.keys(s.workflowDisplay.graph.nodes).length > 5);
      if (speed !== 'instant') assert.ok(r.log.some((l) => l.a.type === 'turn/flush'));
      if (id === 'stub-mixed-workflow') {
        assert.equal(s.session.revisions[0].mode, 'cloud');
        assert.equal(s.session.provenance.in.addedIn, 1);
        assert.equal(s.session.workflowProvenance?.in.addedIn, 2);
      }
    });
  }
}
