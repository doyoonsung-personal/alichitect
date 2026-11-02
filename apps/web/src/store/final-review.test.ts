import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, loadFixtureFile, newStore } from '../test/fixtures.ts';
import { createPlayer } from '../replay/player.ts';
import { requirementViews } from './requirements.ts';
import { buildMarks } from './selectors.ts';
import { reviveSession } from './sessions.ts';
import { checkWorkflowConstraints } from '@ali/core/workflow-constraints.ts';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { autoFixLines } from '../console/logic.ts';
import { makeT } from '../i18n/t.ts';
import type { Op, TurnMode, Warning, WorkflowOp } from '@ali/core/types.ts';
import type { Store } from './store.ts';
import type { WireEvent } from '../stream/events.ts';

const start = (s: Store, mode: TurnMode = 'workflow') => s.dispatch({ type: 'turn/start', mode, ask: 'Update', now: 0 });
const op = (s: Store, op: Op | WorkflowOp, phase: 'main' | 'repair' = 'main') =>
  s.dispatch({ type: 'turn/event', now: 100,
    event: { type: 'op', phase, op, seq: 1, added: [], updated: [], removed: [] } as WireEvent });
function commit(s: Store, warnings: Warning[] = []) {
  const w = s.getState().work!;
  s.dispatch({ type: 'turn/event', now: 15000, event: { type: 'commit', changes: '', warnings,
    memory: { ...w.base, graph: w.raw, workflow: w.rawWorkflow, constraints: w.constraints,
      requirements: w.constraints.map((c) => c.text) } } });
}
function mixed() {
  const s = newStore();
  createPlayer({ dispatch: s.dispatch, now: () => 0, setTimeout: () => 0, clearTimeout: () => {} },
    { fixture: loadFixtureFile('stub-mixed-workflow'), speed: () => 'instant' }).start();
  s.dispatch({ type: 'replay/set', replay: null });
  return s;
}
const avoid = { t: 'req', text: 'Do not use EventBridge', avoid: ['eventbridge'] } as const;
const warning: Warning = { code: 'constraint-avoid', ids: ['in'], severity: 'error', repaired: false, msg: 'Avoid EventBridge', view: 'workflow' };

for (const field of ['product', 'runs'] as const) {
  for (const clean of [false, true]) test(`C0/C1: ${field} repair captures findings without warn events; clean=${clean}`, () => {
    const s = newStore();
    start(s);
    op(s, { ...avoid, avoid: [...avoid.avoid] });
    op(s, { t: 'step', id: 'in', kind: 'trigger', label: 'Input', [field]: 'eventbridge' });
    s.dispatch({ type: 'turn/event', now: 200, event: { type: 'status', code: 'repair', text: 'Repairing' } });
    assert.ok(s.getState().session.revisions.at(-1)!.fix.constraint.length);
    assert.equal(requirementViews(s.getState().session, s.getState().work)[0].state, 'checking');
    if (clean) op(s, { t: 'unstep', id: 'in' }, 'repair');
    commit(s, clean ? [] : [warning]);
    assert.equal(s.getState().session.revisions.at(-1)!.fix.state, clean ? 'fixed' : 'failed');
    assert.equal(requirementViews(s.getState().session, null)[0].state, clean ? 'repaired' : 'broken');
  });
}
test('C0: Singapore requirement and Frankfurt bucket stay failed at commit', () => {
  const s = newStore();
  start(s);
  op(s, { t: 'req', text: 'Keep data in Singapore', regions: ['ap-southeast-1'] });
  op(s, { t: 'step', id: 'in', kind: 'act', label: 'Write to Frankfurt bucket', product: 'oss' });
  s.dispatch({ type: 'turn/event', now: 200, event: { type: 'status', code: 'repair', text: '' } });
  const w = s.getState().work!;
  commit(s, checkWorkflowConstraints(w.rawWorkflow, [], w.constraints, catalog));
  assert.equal(s.getState().session.revisions.at(-1)!.fix.state, 'failed');
});
for (const first of ['cloud', 'workflow'] as const) test(`C2: clean other-view commit preserves broken ${first} requirement`, () => {
  const s = newStore();
  start(s, first);
  op(s, { ...avoid, avoid: [...avoid.avoid] });
  if (first === 'cloud') op(s, { t: 'node', id: 'bus', product: 'eventbridge', label: 'Bus' });
  else op(s, { t: 'step', id: 'in', kind: 'trigger', label: 'Input', product: 'eventbridge' });
  commit(s, [{ ...warning, ids: [first === 'cloud' ? 'bus' : 'in'], view: first }]);
  assert.equal(requirementViews(s.getState().session, null)[0].state, 'broken');
  start(s, first === 'cloud' ? 'workflow' : 'cloud');
  commit(s);
  const req = requirementViews(s.getState().session, null)[0];
  assert.equal(req.state, 'broken');
  assert.equal(req.stateRev, 1);
});
test('C3: main and repair workflow gaps survive commit', () => {
  const s = newStore();
  start(s);
  op(s, { t: 'step', id: 'in', kind: 'trigger', label: 'Input' });
  const gap: Op = { t: 'gap', need: 'Browser sandbox for the agent', note: 'AgentBay access is gated...' };
  op(s, gap);
  s.dispatch({ type: 'turn/event', now: 200, event: { type: 'status', code: 'repair', text: '' } });
  op(s, gap, 'repair');
  commit(s);
  const r = s.getState().session.revisions.at(-1)!;
  for (const lines of [r.changes, r.fix.changes]) {
    assert.equal(lines.filter((l) => l.kind === 'gap').length, 1);
    assert.equal(lines.find((l) => l.kind === 'gap')!.view, 'workflow');
  }
});
test('C4: record pan preserves the clicked revision or line view for colliding ids', () => {
  const s = mixed();
  for (const r of s.getState().session.revisions) {
    s.dispatch({ type: 'ui/panTo', ids: r.cards });
    assert.equal((s.getState().ui.panTo as { view?: TurnMode })?.view, r.mode ?? 'cloud');
    for (const l of r.changes) {
      s.dispatch({ type: 'ui/panTo', ids: l.cards });
      assert.equal((s.getState().ui.panTo as { view?: TurnMode })?.view, l.view ?? 'cloud');
    }
  }
});
test('C5: workflow build marks do not mark the same cloud id', () => {
  const s = mixed();
  start(s);
  op(s, { t: 'step', id: 'in', kind: 'trigger', label: 'Changed' });
  s.dispatch({ type: 'turn/flush', now: 200 });
  s.dispatch({ type: 'session/mode', mode: 'cloud' });
  assert.deepEqual(buildMarks(s.getState()), []);
});
test('C6: revival clears unfinished repair and question just like Stop', () => {
  const s = mixed();
  start(s);
  s.dispatch({ type: 'turn/event', now: 10, event: { type: 'say', phase: 'main', id: 1, text: 'Working', final: true } });
  op(s, { t: 'ask', id: 'q1', text: 'Which payment provider?' });
  s.dispatch({ type: 'turn/event', now: 200, event: { type: 'status', code: 'repair', text: '' } });
  const revived = reviveSession(structuredClone(s.getState().session))!;
  s.dispatch({ type: 'turn/stop', now: 300 });
  const stopped = s.getState().session.revisions.at(-1)!;
  assert.deepEqual({ ...revived.revisions.at(-1), durationMs: stopped.durationMs }, stopped);
});
for (const corrupt of ['rowTops', 'rowTopEntry', 'highRow', 'negativeRow', 'collision'] as const) {
  test(`D0 / Codex #1: discard corrupt saved layout: ${corrupt}`, () => {
    const s = mixed();
    const record = structuredClone(s.getState().session);
    const layout = record.workflowLayout!;
    const ids = Object.keys(layout.workflow.cells).filter((id) => layout.workflow.roles[id] === 'inline');
    if (corrupt === 'rowTops') (layout.workflow as unknown as { rowTops: string }).rowTops = 'x';
    if (corrupt === 'rowTopEntry') (layout.workflow.rowTops as unknown as string[])[0] = 'broken';
    if (corrupt === 'highRow') layout.workflow.cells[ids[0]].row = 7;
    if (corrupt === 'negativeRow') layout.workflow.cells[ids[0]].row = -1;
    if (corrupt === 'collision') layout.workflow.cells[ids[1]] = { ...layout.workflow.cells[ids[0]] };
    const revived = reviveSession(record)!;
    assert.equal(revived.workflowLayout, undefined);
    s.dispatch({ type: 'session/open', record: revived, now: 1 });
    assert.deepEqual(s.getState().workflowDisplay.layout, layoutWorkflow(record.memory.workflow!));
  });
}
test('C39: workflow repairs use specific workflow copy in every locale', () => {
  for (const lang of ['en', 'ko', 'zh'] as const) {
    const t = makeT(lang);
    const codes = ['wf-mixed-out', 'wf-cycle', 'wf-agent-turns', 'wf-attach-form', 'wf-dangling-ref'] as const;
    const lines = autoFixLines(codes.map((code) => ({ code, ids: ['check'], view: 'workflow' })), t);
    assert.equal(lines.length, 5);
    assert.ok(lines.every((l) => l !== t('fix.generic') && !l.startsWith('workflow.fix.')));
  }
});
test('C44 / Codex #9: six batches over 900ms render six times but announce once, then completion', () => {
  const s = newStore();
  start(s);
  const seqs = new Set<number>();
  for (let i = 0; i < 6; i++) {
    op(s, { t: 'step', id: `s${i}`, kind: 'act', label: `Step ${i}` });
    s.dispatch({ type: 'turn/flush', now: i * 180 });
    seqs.add(s.getState().ui.live!.seq);
  }
  assert.equal(s.getState().workflowDisplay.version, 6);
  assert.equal(seqs.size, 1);
  const seq = s.getState().ui.live!.seq;
  commit(s);
  assert.equal(s.getState().ui.live!.seq, seq + 1);
});
test('C44: 29 support-email-triage ops at 400ms cadence do not repeat or flood announcements', () => {
  const s = newStore();
  start(s);
  const events = loadFixtureFile('stub-workflow').turns[0].ev.map(([, e]) => e).filter((e) => e.type === 'op');
  let prev = s.getState().ui.live;
  const spoken: Array<{ time: number; text: string }> = [];
  events.forEach((event, i) => {
    s.dispatch({ type: 'turn/event', event, now: i * 400 });
    s.dispatch({ type: 'turn/flush', now: i * 400 });
    const live = s.getState().ui.live;
    if (live && live.seq !== prev?.seq && live.text.startsWith('Workflow updated:')) spoken.push({ time: i * 400, text: live.text });
    prev = live;
  });
  assert.equal(spoken[0].text, 'Workflow updated: 1 step.');
  for (let i = 1; i < spoken.length; i++) {
    assert.ok(spoken[i].time - spoken[i - 1].time >= 2000);
    assert.notEqual(spoken[i].text, spoken[i - 1].text);
  }
});
