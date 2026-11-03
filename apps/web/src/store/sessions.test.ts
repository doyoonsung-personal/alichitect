import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createSessionStore, parseStored, reviveSession } from './sessions.ts';
import type { KeyValueStorage } from './sessions.ts';
import { loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import type { SessionRecord } from './types.ts';

function memoryStorage(limit = Infinity): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) {
      if (v.length > limit) throw new DOMException('quota', 'QuotaExceededError');
      data.set(k, v);
    },
  };
}

function record(id: string, updatedAt: number, fixture = 'ha'): SessionRecord {
  const store = newStore();
  play(store, loadFixtureFile(fixture), { flushEvery: 6 });
  return { ...store.getState().session, id, updatedAt };
}

test('save and load round-trip a session, newest first', () => {
  const st = memoryStorage();
  const s = createSessionStore(st);
  assert.equal(s.save(record('a', 100)), true);
  assert.equal(s.save(record('b', 200)), true);
  assert.deepEqual(s.list().map((x) => x.id), ['b', 'a']);
  const back = s.get('a')!;
  assert.equal(back.revisions.length, 1);
  assert.equal(back.revisions[0].status, 'done');
  assert.deepEqual(back.memory.graph, record('a', 100).memory.graph);
});

test('storage that is missing, throws, or holds garbage never throws', () => {
  assert.deepEqual(createSessionStore(null).list(), []);
  assert.equal(createSessionStore(null).save(record('a', 1)), false);
  const throwing: KeyValueStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  const s = createSessionStore(throwing);
  assert.deepEqual(s.list(), []);
  assert.equal(s.save(record('a', 1)), false);
  for (const junk of ['', 'not json', '[]', '{"sessions":5}', '{"sessions":[1,null,{"id":"x"}]}', '{"v":1,"sessions":[{"id":"a","title":"t","memory":{},"revisions":[]}]}']) {
    assert.deepEqual(parseStored(junk), [], junk);
  }
});

test('one corrupt record does not take the others with it', () => {
  const good = record('good', 5);
  const text = JSON.stringify({ v: 1, sessions: [{ id: 'bad', title: 1 }, good] });
  const out = parseStored(text);
  assert.deepEqual(out.map((s) => s.id), ['good']);
});

test('a revision that was streaming when the tab closed comes back stopped, with no changes', () => {
  const rec = record('a', 1);
  const raw = JSON.parse(JSON.stringify(rec)) as SessionRecord;
  raw.revisions[0].status = 'streaming';
  const back = reviveSession(raw)!;
  assert.equal(back.revisions[0].status, 'stopped');
  assert.deepEqual(back.revisions[0].changes, []);
});

test('on quota errors the oldest sessions go first and the current one is kept', () => {
  const a = record('a', 100);
  const one = JSON.stringify({ v: 1, sessions: [a] }).length;
  const st = memoryStorage(Math.round(one * 2.5));
  const s = createSessionStore(st);
  assert.equal(s.save(a), true);
  assert.equal(s.save(record('b', 200)), true);
  assert.equal(s.save(record('c', 300)), true);
  const ids = s.list().map((x) => x.id);
  assert.equal(ids[0], 'c', 'the session being saved survives');
  assert.ok(ids.length < 3, 'older sessions were dropped to fit');
  // a record that alone exceeds the quota is reported, not thrown
  const tiny = createSessionStore(memoryStorage(50));
  assert.equal(tiny.save(a), false);
});

test('replay sessions and empty sessions are not saved', () => {
  const st = memoryStorage();
  const s = createSessionStore(st);
  assert.equal(s.save({ ...record('r', 1), replayOf: 'ha' }), false);
  assert.equal(s.save({ ...record('e', 1), revisions: [] }), false);
  assert.equal(st.data.has(STORAGE_KEY), false);
});

test('the list keeps at most 20 sessions', () => {
  const s = createSessionStore(memoryStorage());
  const base = record('x', 0);
  for (let i = 0; i < 25; i++) s.save({ ...base, id: `s${i}`, updatedAt: i });
  assert.equal(s.list().length, 20);
  assert.equal(s.list()[0].id, 's24');
});


import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { applyWorkflowOp, emptyWorkflow } from '@ali/core/workflow.ts';
test('legacy workflow layouts are discarded once; committed memory lays out fresh and new saves stay sticky', () => {
  let wf = emptyWorkflow();
  for (const op of [
    { t: 'step', id: 'a', kind: 'trigger', label: 'A' },
    { t: 'step', id: 'b', kind: 'human', label: 'B', after: 'a' },
    { t: 'link', id: 'ab', from: 'a', to: 'b' },
  ] as const) wf = applyWorkflowOp(wf, op).workflow;
  const saved = record('legacy-workflow', 1);
  saved.mode = 'workflow'; saved.memory.workflow = wf;
  saved.workflowLayout = layoutWorkflow(wf);
  saved.workflowLayout.workflow.rowHeights[0] = 360;
  Reflect.deleteProperty(saved.workflowLayout.workflow, 'hostHeights');
  const revived = reviveSession(JSON.parse(JSON.stringify(saved)))!;
  assert.equal(revived.workflowLayout, undefined);
  assert.deepEqual(revived.memory.workflow, wf);
  const store = newStore();
  store.dispatch({ type: 'session/open', record: revived, now: 2 });
  const fresh = store.getState().workflowDisplay.layout!;
  assert.deepEqual(fresh, layoutWorkflow(wf));
  const op = { t: 'step', id: 'branch', kind: 'end', label: 'Done', after: 'a' } as const;
  const next = layoutWorkflow(applyWorkflowOp(wf, op).workflow, fresh, { op });
  assert.equal(next.cards.branch.y, 108, 'new branches do not inherit the old 360-unit spread');
  const modern = { ...revived, workflowLayout: fresh };
  assert.deepEqual(reviveSession(JSON.parse(JSON.stringify(modern)))!.workflowLayout, fresh);
});
