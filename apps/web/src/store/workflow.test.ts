import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Warning, WorkflowOp } from '@ali/core/types.ts';
import { loadFixtureFile, newStore } from '../test/fixtures.ts';
import { createPlayer } from '../replay/player.ts';
import { createSessionStore, reviveSession } from './sessions.ts';
import { activeDocument, activeNodeCount, activeHighlight, activeProvenance, canExport, highlightChange } from './selectors.ts';
import type { Store } from './store.ts';
import type { SessionRecord } from './types.ts';

function replay(id = 'stub-mixed-workflow') {
  const store = newStore();
  createPlayer({ dispatch: store.dispatch, now: () => 100, setTimeout: () => 0, clearTimeout: () => {} },
    { fixture: loadFixtureFile(id), speed: () => 'instant' }).start();
  return store;
}
function op(store: Store, op: WorkflowOp) {
  store.dispatch({ type: 'turn/event', event: { type: 'op', phase: 'main', op }, now: 200 });
}
function start(store: Store, mode: 'cloud' | 'workflow' = 'workflow') {
  store.dispatch({ type: 'turn/start', mode, ask: 'Update the design', now: 100 });
}

test('workflow commit retains both documents, settings, estimates and independent provenance', () => {
  const store = replay();
  const s = store.getState();
  assert.equal(s.session.mode, 'workflow');
  assert.equal(s.session.revisions[0].mode, 'cloud');
  assert.equal(s.session.revisions[1].mode, 'workflow');
  assert.equal(s.session.memory.turns.at(-1)?.mode, 'workflow');
  assert.deepEqual(s.session.provenance.in, { addedIn: 1, changedIn: 1 });
  assert.deepEqual(s.session.workflowProvenance?.in, { addedIn: 2, changedIn: 2 });
  assert.equal(s.session.memory.graph.nodes.in.label, 'Email backend');
  assert.equal(s.session.memory.workflow?.nodes.in.label, 'Email webhook');
  assert.equal(activeDocument(s).view, 'workflow');
  assert.equal(activeNodeCount(s), Object.keys(s.session.memory.workflow!.nodes).length);
  assert.equal(canExport(s), true);
  assert.equal(s.session.memory.estimate?.runsPerMonth, 1000);
  assert.equal(s.session.memory.workflowSettings?.region, 'ap-southeast-1');
  assert.ok(s.session.revisions[1].changes.every((l) => l.view === 'workflow' && l.key.startsWith('workflow:')));
  start(store, 'cloud');
  store.dispatch({ type: 'turn/event', now: 300, event: { type: 'commit', memory: s.session.memory, changes: '', warnings: [] } });
  assert.deepEqual(store.getState().session.workflowProvenance, s.session.workflowProvenance);
});

test('mode and all workflow memory fields survive storage and restore; legacy records default to cloud', () => {
  const store = replay();
  const record = { ...store.getState().session, replayOf: null };
  record.memory.workflowTombstones = [{ id: 'old', kind: 'end', label: 'Old result' }];
  let text = '';
  const sessions = createSessionStore({ getItem: () => text, setItem: (_, value) => { text = value; } });
  assert.equal(sessions.save(record), true);
  const restored = sessions.get(record.id)!;
  assert.deepEqual(restored, JSON.parse(JSON.stringify(record)));
  store.dispatch({ type: 'session/new', id: 'new', now: 400 });
  store.dispatch({ type: 'session/open', record: restored, now: 500 });
  assert.deepEqual(activeDocument(store.getState()).graph, record.memory.workflow);
  assert.equal(store.getState().workflowDisplay.reason, 'restore');
  const legacy = structuredClone(record) as Partial<SessionRecord>;
  delete legacy.mode;
  delete legacy.memory!.workflow;
  delete legacy.memory!.workflowTombstones;
  delete legacy.memory!.workflowSettings;
  delete legacy.memory!.estimate;
  assert.equal(reviveSession(legacy)?.mode, 'cloud');
  assert.equal(reviveSession({ ...record, memory: { ...record.memory, workflow: { nodes: [] } } }), null);
});

test('stop and fatal revert the edited document even after switching views', () => {
  const store = replay();
  const base = store.getState();
  start(store);
  op(store, { t: 'unstep', id: 'in' });
  store.dispatch({ type: 'turn/flush', now: 210 });
  assert.equal(store.getState().workflowDisplay.graph.nodes.in, undefined);
  store.dispatch({ type: 'session/mode', mode: 'cloud' });
  store.dispatch({ type: 'turn/stop', now: 220 });
  assert.deepEqual(store.getState().workflowDisplay.graph, base.session.memory.workflow);
  assert.strictEqual(store.getState().display, base.display);
  assert.equal(store.getState().session.revisions.at(-1)?.mode, 'workflow');
  start(store, 'cloud');
  store.dispatch({ type: 'turn/event', now: 230, event: {
    type: 'op', phase: 'main', seq: 1, added: [], updated: [], removed: ['in'], op: { t: 'remove', id: 'in' },
  } });
  store.dispatch({ type: 'turn/flush', now: 240 });
  store.dispatch({ type: 'session/mode', mode: 'workflow' });
  store.dispatch({ type: 'turn/fail', code: 'network', message: '', retryable: true, now: 250 });
  assert.deepEqual(store.getState().display.graph, base.session.memory.graph);
  assert.deepEqual(activeDocument(store.getState()).graph, base.session.memory.workflow);
});

test('workflow stream routes all five op kinds, queues links, and keeps the cloud document untouched', () => {
  const store = newStore();
  start(store);
  op(store, { t: 'link', id: 'path', from: 'a', to: 'b' });
  op(store, { t: 'step', id: 'a', kind: 'trigger', label: 'Start' });
  op(store, { t: 'step', id: 'b', kind: 'end', label: 'End' });
  op(store, { t: 'each', id: 'items', over: 'Emails' });
  op(store, { t: 'splice', into: 'path', id: 'review', kind: 'human', label: 'Review' });
  assert.ok(store.getState().work!.rawWorkflow.nodes.review);
  assert.ok(store.getState().work!.rawWorkflow.groups.items);
  assert.equal(Object.keys(store.getState().work!.rawWorkflow.edges).length, 2);
  op(store, { t: 'unstep', id: 'review' });
  store.dispatch({ type: 'turn/flush', now: 300 });
  assert.equal(activeNodeCount(store.getState()), 2);
  assert.equal(Object.keys(store.getState().display.graph.nodes).length, 0);
});

test('repair continuation resets only the workflow context and repairs workflow ids', () => {
  const store = newStore();
  start(store);
  op(store, { t: 'step', id: 'agent', kind: 'agent', label: 'Agent' });
  op(store, { t: 'link', id: 'pending', from: 'agent', to: 'missing' });
  const before = store.getState();
  store.dispatch({ type: 'turn/event', now: 300, event: { type: 'status', code: 'continue', text: 'Continuing' } });
  assert.equal(store.getState().work!.rawWorkflow.nodes.agent.turns, 10);
  assert.deepEqual(store.getState().work!.workflowCtx.pending, []);
  assert.strictEqual(store.getState().work!.raw, before.work!.raw);
});

test('auto-fix dedupe uses view, code and ids, treating absent view as cloud', () => {
  const store = newStore();
  start(store);
  const warning: Warning = { code: 'cap-exceeded', ids: ['same'], msg: 'Fixed', severity: 'info', repaired: true };
  for (const view of [undefined, 'cloud', 'workflow', 'workflow'] as const) {
    store.dispatch({ type: 'turn/event', now: 200, event: { type: 'warn', phase: 'main',
      warning: { ...warning, ...(view ? { view } : {}) } } });
  }
  assert.equal(store.getState().work!.autoFixes.length, 2);
  const memory = store.getState().session.memory;
  store.dispatch({ type: 'turn/event', now: 300, event: { type: 'commit', memory, changes: '', warnings: [] } });
  assert.equal(store.getState().session.revisions.at(-1)!.fix.autoFixes.length, 2);
});

test('historical hover and provenance distinguish the same id in each view', () => {
  const store = replay();
  const r = store.getState().session.revisions[0];
  store.dispatch({ type: 'ui/highlight', highlight: { source: 'revision', cards: r.cards, ghosts: r.gone, revision: r.n } });
  assert.equal(store.getState().ui.highlight?.view, 'cloud');
  assert.equal(activeHighlight(store.getState()), null);
  const line = store.getState().session.revisions[1].changes.find((l) => l.cards.includes('in'))!;
  store.dispatch({ type: 'ui/highlight', highlight: highlightChange(line) });
  assert.equal(activeHighlight(store.getState())?.view, 'workflow');
  assert.equal(activeProvenance(store.getState()).in.addedIn, 2);
  store.dispatch({ type: 'session/mode', mode: 'cloud' });
  assert.equal(activeProvenance(store.getState()).in.addedIn, 1);
  assert.equal(activeNodeCount(store.getState()), 1);
});

test('large dual-document quota fixture evicts oldest sessions and keeps both documents intact', () => {
  const large = JSON.parse(readFileSync(new URL('./fixtures/large-dual-session.json', import.meta.url), 'utf8')) as SessionRecord;
  const size = JSON.stringify({ v: 1, sessions: [large] }).length;
  assert.ok(size > 80000);
  let text = '';
  let evictions = 0;
  const sessions = createSessionStore({ getItem: () => text, setItem: (_, value) => {
    if (value.length > size * 2.5) { evictions++; throw new DOMException('quota', 'QuotaExceededError'); }
    text = value;
  } });
  for (let i = 1; i <= 3; i++) assert.equal(sessions.save({ ...large, id: `s${i}`, updatedAt: i }), true);
  assert.ok(evictions > 0);
  assert.deepEqual(sessions.list().map((s) => s.id), ['s3', 's2']);
  assert.deepEqual(sessions.get('s3')!.memory, large.memory);
  assert.equal(sessions.get('s3')!.mode, 'workflow');
});

test('workflow-only committed content enables export while an empty document does not', () => {
  assert.equal(canExport(newStore().getState()), false);
  const store = replay('stub-workflow');
  assert.equal(Object.keys(store.getState().session.memory.graph.nodes).length, 0);
  assert.equal(canExport(store.getState()), true);
});

test('workflow settings preserve memory, advance time and refuse active edits', () => {
  const store = newStore(), old = store.getState().session.memory.graph;
  store.dispatch({ type: 'workflow/settings', next: { region: 'ap-southeast-1', approvalOn: ['send'] }, now: 101 });
  store.dispatch({ type: 'workflow/estimate', next: { runsPerMonth: 42 }, now: 102 });
  assert.equal(store.getState().session.memory.graph, old);
  assert.equal(store.getState().session.updatedAt, 102);
  assert.equal(store.getState().session.memory.workflowSettings?.approvalOn?.[0], 'send');
  const version = store.getState().workflowDisplay.version;
  store.dispatch({ type: 'workflow/tidy' });
  assert.equal(store.getState().workflowDisplay.version, version + 1);
  assert.ok(store.getState().workflowDisplay.layout);
  start(store);
  const before = store.getState();
  store.dispatch({ type: 'workflow/estimate', next: { runsPerMonth: 99 }, now: 103 });
  store.dispatch({ type: 'workflow/tidy' });
  assert.equal(store.getState(), before);
});

test('settings persist across save/reload and replay refuses all settings mutations', () => {
  const store = replay();
  store.dispatch({ type: 'replay/set', replay: {
    fixtureId: 'stub-mixed-workflow', speed: 'instant', turn: 1, playing: false, recordedAt: '',
  } });
  const before = store.getState();
  store.dispatch({ type: 'workflow/settings', next: { region: 'different' }, now: 500 });
  store.dispatch({ type: 'workflow/estimate', next: { runsPerMonth: 7 }, now: 500 });
  assert.equal(store.getState(), before);
  store.dispatch({ type: 'replay/set', replay: null });
  store.dispatch({ type: 'workflow/settings', next: { approvalOff: ['pay'] }, now: 501 });
  const record = { ...store.getState().session, replayOf: null };
  let saved = '';
  const persistence = createSessionStore({ getItem: () => saved, setItem: (_, v) => { saved = v; } });
  assert.ok(persistence.save(record));
  const revived = persistence.get(record.id)!;
  assert.deepEqual(revived.memory.workflowSettings, { approvalOff: ['pay'] });
  assert.equal(revived.memory.estimate?.runsPerMonth, 1000);
});
