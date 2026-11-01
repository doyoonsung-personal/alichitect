import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Warning } from '@ali/core/types.ts';
import { makeT } from '../i18n/t.ts';
import { catalog, newStore, play, loadFixtureFile } from '../test/fixtures.ts';
import type { ChangeLine, RequirementView, Revision, TurnStatus } from '../store/types.ts';
import { requirementViews } from '../store/requirements.ts';
import {
  askLength,
  autoFixLines,
  cursorSlot,
  distanceFromBottom,
  drawProgress,
  enterAction,
  errorText,
  fixSentences,
  followsStream,
  footerItems,
  fmtSeconds,
  isExpanded,
  isLinked,
  lineView,
  preventsDefault,
  requirementMeta,
  revisionCards,
  revisionState,
  rescueNote,
  rowMeta,
  statusText,
  showJumpChip,
  stateView,
  visibleLines,
  visibleRequirements,
  waitingLine,
} from './logic.ts';

const t = makeT('en');
const ko = makeT('ko');

const line = (p: Partial<ChangeLine> & Pick<ChangeLine, 'kind' | 'name'>): ChangeLine => ({ key: p.kind + p.name, phase: 'main', cards: [], ghosts: [], ...p });

function rev(p: Partial<Revision> = {}): Revision {
  return {
    n: 1,
    ask: 'ask',
    askLang: 'en',
    startedAt: 0,
    status: 'done',
    note: 'note',
    changes: [],
    reqs: [],
    lifecycle: [],
    fix: { autoFixes: [], constraint: [], state: 'none', note: '', changes: [] },
    statusLine: null,
    truncated: false,
    durationMs: 9500,
    error: null,
    commitWarnings: [],
    added: 3,
    removed: 1,
    cards: ['a', 'b'],
    gone: ['c'],
    ...p,
  };
}
const W = (code: Warning['code'], msg: string, ids: string[] = ['n1'], severity: Warning['severity'] = 'error'): Warning => ({ code, ids, msg, severity, repaired: false });
const turn = (phase: TurnStatus['phase']): TurnStatus => ({ phase, lastTextAt: null, startedAt: 0 });

// ---------- Enter in a message box ----------

const ev = (o: Partial<{ key: string; shiftKey: boolean; isComposing: boolean; keyCode: number }> = {}) => ({ key: 'Enter', shiftKey: false, ...o });
const idle = { composing: false, busy: false, canSend: true };

test('Enter sends, Shift+Enter is a newline, other keys are left alone', () => {
  assert.equal(enterAction(ev(), idle), 'send');
  assert.equal(enterAction(ev({ shiftKey: true }), idle), 'newline');
  assert.equal(enterAction(ev({ key: 'a' }), idle), 'default');
  assert.equal(enterAction(ev({ key: 'Escape' }), idle), 'default');
});

test('Enter during IME composition never sends (Korean and Chinese): flag, isComposing and keyCode 229', () => {
  assert.equal(enterAction(ev(), { ...idle, composing: true }), 'commit-ime');
  assert.equal(enterAction(ev({ isComposing: true }), idle), 'commit-ime');
  assert.equal(enterAction(ev({ keyCode: 229 }), idle), 'commit-ime');
  // composition wins over Shift and over a busy turn
  assert.equal(enterAction(ev({ isComposing: true, shiftKey: true }), idle), 'commit-ime');
  assert.equal(enterAction(ev({ keyCode: 229 }), { ...idle, busy: true }), 'commit-ime');
  assert.equal(preventsDefault('commit-ime'), false, 'the browser must commit the composition');
});

test('Enter while a turn streams, or with nothing to send, is swallowed: no send and no newline', () => {
  assert.equal(enterAction(ev(), { ...idle, busy: true }), 'blocked');
  assert.equal(enterAction(ev(), { ...idle, canSend: false }), 'blocked');
  assert.equal(enterAction(ev({ shiftKey: true }), { ...idle, busy: true }), 'newline', 'a draft can still take line breaks while streaming');
  assert.equal(preventsDefault('blocked'), true);
  assert.equal(preventsDefault('send'), true);
  assert.equal(preventsDefault('newline'), false);
});

test('ask length counts characters the way the server does', () => {
  assert.equal(askLength('  데이터  '), 3);
  assert.equal(askLength('a😀b'), 3);
});

// ---------- times ----------

test('seconds and the waiting counter', () => {
  assert.equal(fmtSeconds(9500), '9.5');
  assert.equal(fmtSeconds(-3), '0.0');
  assert.equal(waitingLine(7999, t), 'Waiting for Qwen');
  assert.equal(waitingLine(8000, t), 'Waiting for Qwen · 8 s');
  assert.equal(waitingLine(12400, ko), ko('rec.waitingSeconds', { s: 12 }));
});

// ---------- revision state, footer, row ----------

test('revision state: live, held, fixed, broken, at risk, failed, stopped', () => {
  assert.equal(revisionState(rev({ status: 'waiting' })), 'live');
  assert.equal(revisionState(rev({ status: 'streaming' })), 'live');
  assert.equal(revisionState(rev()), 'held');
  assert.equal(revisionState(rev({ fix: { autoFixes: [], constraint: [], state: 'fixed', note: '', changes: [] } })), 'fixed');
  assert.equal(revisionState(rev({ commitWarnings: [W('constraint-region', 'x')] })), 'broken');
  assert.equal(revisionState(rev({ commitWarnings: [W('constraint-region', 'x', ['n'], 'warn')] })), 'atRisk');
  assert.equal(revisionState(rev({ fix: { autoFixes: [], constraint: [], state: 'failed', note: '', changes: [] } })), 'broken');
  assert.equal(revisionState(rev({ commitWarnings: [W('orphan-node', 'x', ['n'], 'info')] })), 'held', 'other warnings are not requirement states');
  assert.equal(revisionState(rev({ status: 'failed' })), 'failed');
  assert.equal(revisionState(rev({ status: 'stopped' })), 'stopped');
});

test('footer: time and Requirements held; names the state when it is not Held', () => {
  assert.deepEqual(footerItems(rev(), true, t).map((i) => i.text), ['Drawn in 9.5 s', 'Requirements held']);
  assert.equal(footerItems(rev(), true, t)[1].check, true);
  assert.deepEqual(footerItems(rev(), false, t).map((i) => i.text), ['Drawn in 9.5 s'], 'nothing pinned, nothing held');
  const broken = footerItems(rev({ commitWarnings: [W('constraint-avoid', 'x')] }), true, t);
  assert.deepEqual(broken.map((i) => [i.text, i.tone]), [['Drawn in 9.5 s', 'plain'], ['Not met', 'danger']]);
  const fixed = footerItems(rev({ fix: { autoFixes: [], constraint: [], state: 'fixed', note: '', changes: [] } }), true, t);
  assert.deepEqual(fixed.map((i) => [i.text, i.tone]), [['Drawn in 9.5 s', 'plain'], ['Kept by a fix', 'warn']]);
  assert.deepEqual(footerItems(rev({ truncated: true }), false, t).map((i) => i.key), ['done', 'cut']);
  assert.deepEqual(footerItems(rev({ status: 'stopped' }), true, t).map((i) => i.text), ['Stopped. Your diagram is unchanged.']);
  assert.deepEqual(footerItems(rev({ status: 'failed' }), true, t), []);
  assert.deepEqual(footerItems(rev({ status: 'streaming' }), true, t), []);
});

test('collapsed row meta: +added minus removed, seconds, and the state when it is not Held', () => {
  assert.equal(rowMeta(rev({ added: 15, removed: 0, durationMs: 23000 }), t), '+15 −0 · 23.0 s');
  assert.equal(rowMeta(rev({ added: 2, removed: 0, durationMs: 4500, commitWarnings: [W('constraint-region', 'x')] }), t), '+2 −0 · 4.5 s · Not met');
  assert.equal(rowMeta(rev({ status: 'failed' }), t), 'This revision was not applied');
  assert.equal(rowMeta(rev({ status: 'stopped' }), t), 'Stopped');
  assert.equal(rowMeta(rev({ added: 2, removed: 1, durationMs: 4500 }), ko), `+2 −1 · ${ko('rec.seconds', { s: '4.5' })}`);
});

test('the newest revision is open; an older one only when the user opened it', () => {
  assert.equal(isExpanded(3, 3, new Set()), true);
  assert.equal(isExpanded(2, 3, new Set()), false);
  assert.equal(isExpanded(2, 3, new Set([2])), true);
});

test('revision cards: final ids after commit, the lines own ids while streaming', () => {
  assert.deepEqual(revisionCards(rev()), { cards: ['a', 'b'], ghosts: ['c'] });
  const live = rev({ status: 'streaming', cards: [], gone: [], changes: [line({ kind: 'added', name: 'ALB', cards: ['alb'] }), line({ kind: 'removed', name: 'ECS', ghosts: ['ecs'] })] });
  assert.deepEqual(revisionCards(live), { cards: ['alb'], ghosts: ['ecs'] });
});

test('draw progress counts planned lines against drawn ones, and is null without a plan', () => {
  assert.equal(drawProgress([line({ kind: 'added', name: 'ALB' })]), null);
  assert.deepEqual(drawProgress([line({ kind: 'added', name: 'ALB' }), line({ kind: 'planned', name: 'ECS' }), line({ kind: 'planned', name: 'RDS' }), line({ kind: 'connections', name: '' })]), { done: 1, total: 3 });
});

// ---------- change lines ----------

test('added: name, label, zones; the frame only when there are no zones', () => {
  const a = lineView(line({ kind: 'added', name: 'RDS', label: 'DR read replica', zones: ['B'] }), t);
  assert.equal(a.mark, 'plus');
  assert.deepEqual(a.detail, [{ text: 'zones B' }]);
  assert.equal(a.text, 'RDS · DR read replica · zones B');
  assert.deepEqual(lineView(line({ kind: 'added', name: 'ALB', frame: 'Portal VPC' }), t).detail, [{ text: 'in Portal VPC' }]);
  assert.deepEqual(lineView(line({ kind: 'added', name: 'ECS', frame: 'Portal VPC', zones: ['A', 'B'] }), t).detail, [{ text: 'zones A, B' }]);
});

test('attached: "WAF on ALB"', () => {
  const v = lineView(line({ kind: 'attached', name: 'WAF', host: 'ALB' }), t);
  assert.equal(v.mark, 'plus');
  assert.equal(v.text, 'WAF · on ALB');
});

test('removed: minus, struck name; replaced: arrow from old to new', () => {
  const r = lineView(line({ kind: 'removed', name: 'ESA' }), t);
  assert.deepEqual([r.mark, r.struck], ['minus', true]);
  const p = lineView(line({ kind: 'replaced', name: 'ACK', fromName: 'ECS', label: 'Portal servers' }), t);
  assert.deepEqual([p.mark, p.from, p.name, p.label, p.struck], ['arrow', 'ECS', 'ACK', 'Portal servers', false]);
  assert.equal(p.text, 'ECS → ACK · Portal servers');
});

test('moved: zones from and to with an arrow part', () => {
  const v = lineView(line({ kind: 'moved', name: 'Customer DB', fromZones: ['A', 'B'], zones: ['A'] }), t);
  assert.equal(v.mark, 'arrow');
  assert.deepEqual(v.detail, [{ text: 'zones A, B' }, { arrow: true }, { text: 'A' }]);
  assert.deepEqual(lineView(line({ kind: 'moved', name: 'X', zones: ['B'] }), t).detail, [{ text: 'zones B' }]);
});

test('changed: the old label to the new one, or just "Changed" when only the reason moved', () => {
  const v = lineView(line({ kind: 'changed', name: 'ECS', fromLabel: 'Australian customers', label: 'Fintech customers' }), t);
  assert.deepEqual(v.detail, [{ text: 'Australian customers' }, { arrow: true }, { text: 'Fintech customers' }]);
  assert.equal(v.label, undefined);
  const same = lineView(line({ kind: 'changed', name: 'Tair (Redis)', fromLabel: 'Menu cache', label: 'Menu cache' }), t);
  assert.deepEqual([same.label, same.detail], ['Menu cache', [{ text: 'Changed' }]]);
  assert.equal(same.text, 'Tair (Redis) · Menu cache · Changed');
});

test('connections: plural name and the ends when there are three or fewer', () => {
  const v = lineView(line({ kind: 'connections', name: '', count: 2, pairs: [['Fintech customers', 'GA'], ['GA', 'ESA']] }), t);
  assert.equal(v.name, '2 connections');
  assert.deepEqual(v.detail, [{ text: 'Fintech customers to GA to ESA' }]);
  const one = lineView(line({ kind: 'connectionsRemoved', name: '', count: 1, pairs: [['Fintech customers', 'ESA']] }), t);
  assert.deepEqual([one.mark, one.name, one.struck], ['minus', '1 connection removed', false]);
  assert.deepEqual(lineView(line({ kind: 'connections', name: '', count: 5, pairs: Array.from({ length: 5 }, () => ['a', 'b'] as [string, string]) }), t).detail, []);
  assert.equal(lineView(line({ kind: 'connections', name: '', count: 3 }), ko).name, '연결 3개');
});

test('planned reads lighter; recommended carries its fit; a gap names the need', () => {
  const p = lineView(line({ kind: 'planned', name: 'Milvus' }), t);
  assert.deepEqual([p.mark, p.muted, p.text], ['ring', true, 'Milvus · planned']);
  assert.equal(lineView(line({ kind: 'recommended', name: 'Qoder Teams', fit: 'primary' }), t).text, 'Qoder Teams · Recommended');
  assert.equal(lineView(line({ kind: 'recommended', name: 'Token Plan', fit: 'complement' }), t).text, 'Token Plan · Optional');
  const g = lineView(line({ kind: 'gap', name: '', need: 'GPU training', note: 'Not in the catalog' }), t);
  assert.deepEqual([g.mark, g.warn, g.name, g.detail], ['info', true, 'Not covered: GPU training', [{ text: 'Not in the catalog' }]]);
});

test('at most 8 lines show until expanded; a planned line points at nothing yet', () => {
  const many = Array.from({ length: 11 }, (_, i) => i);
  assert.deepEqual(visibleLines(many, false), { shown: many.slice(0, 8), hidden: 3 });
  assert.deepEqual(visibleLines(many, true), { shown: many, hidden: 0 });
  assert.deepEqual(visibleLines([1, 2], false), { shown: [1, 2], hidden: 0 });
  assert.equal(isLinked(line({ kind: 'planned', name: 'x' })), false);
  assert.equal(isLinked(line({ kind: 'removed', name: 'x', ghosts: ['g'] })), true);
});

// ---------- requirements ----------

const req = (p: Partial<RequirementView> = {}): RequirementView => ({ text: 'Customer data must stay in Singapore', state: 'held', pinnedIn: 1, stateRev: null, regions: ['ap-southeast-1'], avoid: [], isNew: false, ...p });

test('requirement state words and icons', () => {
  assert.deepEqual(stateView('held', t), { icon: 'check', tone: 'ok', label: 'Held' });
  assert.deepEqual(stateView('repaired', t), { icon: 'check', tone: 'ok', label: 'Held' });
  assert.deepEqual(stateView('checking', t), { icon: 'dottedRing', tone: 'warn', label: 'Checking' });
  assert.deepEqual(stateView('broken', t), { icon: 'cross', tone: 'danger', label: 'Not met' });
  assert.equal(stateView('atRisk', t).icon, 'info');
});

test('requirement meta: where data stays with the region name, what is ruled out, and new', () => {
  assert.deepEqual(requirementMeta(req(), catalog, t).map((m) => m.text), ['Stays in Singapore (ap-southeast-1)']);
  const avoid = requirementMeta(req({ regions: [], avoid: ['ecs', 'rds'], isNew: true, pinnedIn: 2 }), catalog, t);
  assert.equal(avoid[0].text, `Ruled out: ${catalog.byId.get('ecs')!.short}, ${catalog.byId.get('rds')!.short}`);
  assert.equal(avoid[1].text, 'Pinned in revision 2');
});

test('requirement meta: a fix or a failure leads, with the revision number and its tone', () => {
  const fixed = requirementMeta(req({ state: 'repaired', stateRev: 3 }), catalog, t);
  assert.deepEqual([fixed[0].text, fixed[0].tone], ['Kept by a fix in revision 3', 'warn']);
  const broken = requirementMeta(req({ state: 'broken', stateRev: 4 }), catalog, t);
  assert.deepEqual([broken[0].text, broken[0].tone], ['Not met in revision 4', 'danger']);
});

test('requirements show 4 rows, then "{n} more"', () => {
  const rows = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(visibleRequirements(rows, false), { shown: [1, 2, 3, 4], hidden: 2 });
  assert.equal(t('req.more', { n: 2 }), '2 more');
  assert.deepEqual(visibleRequirements(rows, true).hidden, 0);
});

// ---------- fix block ----------

test('auto fixes use our wording, once per code, never the raw message', () => {
  const lines = autoFixLines([{ code: 'attach-inline', ids: ['a'] }, { code: 'attach-inline', ids: ['b'] }, { code: 'zone-replicas', ids: ['c'] }, { code: 'orphan-node', ids: ['d'] }], t);
  assert.deepEqual(lines, [t('fix.attachInline'), t('fix.zoneReplicas'), t('fix.generic')]);
});

test('the fix sentence names the card and the pinned region, or the ruled-out product', () => {
  const ctx = { regions: ['ap-southeast-1'], catalog, t };
  const region = W('constraint-region', `'users' is labelled "Australian customers", which places it in Sydney; data must stay in Singapore`);
  assert.deepEqual(fixSentences([region], ctx), ['Australian customers was drawn outside Singapore (ap-southeast-1). Qwen fixed it before the change was saved.']);
  const group = W('constraint-region', `region group 'syd' (Sydney (ap-southeast-2)) is in ap-southeast-2 and holds n1; rule`);
  assert.match(fixSentences([group], ctx)[0], /^Sydney \(ap-southeast-2\) was drawn outside/);
  const unnamed = W('constraint-region', 'the why of n3 says "replicated to Tokyo"');
  assert.match(fixSentences([unnamed], ctx)[0], /^Part of the diagram was drawn outside Singapore/);
  assert.deepEqual(fixSentences([unnamed, region], ctx), fixSentences([region], ctx), 'a sentence that names the card replaces the generic one');
  const avoid = W('constraint-avoid', `'n2' uses ecs, which the user ruled out (no ECS); replace or remove it`);
  assert.equal(fixSentences([avoid], ctx)[0], `${catalog.byId.get('ecs')!.short} was ruled out, so Qwen removed it before the change was saved.`);
  assert.deepEqual(fixSentences([region, region, avoid, W('orphan-node', 'x')], ctx).length, 2, 'duplicates collapse and other codes are skipped');
});

// ---------- the Cursor ----------

test('the Cursor sits in exactly one place', () => {
  const live = (p: Partial<Revision> = {}) => rev({ status: 'streaming', note: '', ...p });
  assert.equal(cursorSlot(live({ status: 'waiting' }), turn('waiting')), 'waiting');
  assert.equal(cursorSlot(live({ note: 'I will add' }), turn('streaming')), 'note');
  assert.equal(cursorSlot(live({ note: 'x', statusLine: { code: 'fallback', text: 'Switching to a backup model…' } }), turn('fallback')), 'status', 'the status line owns it, the note does not also blink');
  assert.equal(cursorSlot(live({ note: 'x', statusLine: { code: 'repair', text: 'Fixing' }, fix: { autoFixes: [], constraint: [], state: 'fixing', note: '', changes: [] } }), turn('repairing')), 'fix', 'the repair status is written inside the fix block');
  assert.equal(cursorSlot(live({ note: 'x', fix: { autoFixes: [], constraint: [], state: 'fixing', note: 'fixed it', changes: [] } }), turn('repairing')), 'fix');
  assert.equal(cursorSlot(live({ statusLine: { code: 'summary', text: 'Summarizing' } }), turn('streaming')), 'waiting', 'the summary status belongs to the SummaryNote');
  assert.equal(cursorSlot(rev(), turn('idle')), 'none');
  assert.equal(cursorSlot(live(), turn('error')), 'none');
});

test('errors: the server message, else our own words from the code', () => {
  assert.equal(errorText({ code: 'x', message: 'Qwen rate limit.', retryable: true, client: false }, t), 'Qwen rate limit.');
  assert.equal(errorText({ code: 'network', message: '', retryable: true, client: true }, t), t('error.network'));
  assert.equal(errorText({ code: 'http-502', message: '', retryable: true, client: true }, t), 'The drawing service returned an error (502). Your diagram is unchanged.');
});

// ---------- scroll anchoring ----------

test('the record follows the stream at the bottom and lets go when the user scrolls up', () => {
  assert.equal(distanceFromBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 400 }), 0);
  assert.equal(distanceFromBottom({ scrollHeight: 1000, scrollTop: 100, clientHeight: 400 }), 500);
  assert.equal(distanceFromBottom({ scrollHeight: 300, scrollTop: 0, clientHeight: 400 }), 0, 'short content has no distance');
  assert.equal(followsStream(0), true);
  assert.equal(followsStream(32), true);
  assert.equal(followsStream(33), false);
  assert.equal(showJumpChip(false, true), true);
  assert.equal(showJumpChip(true, true), false);
  assert.equal(showJumpChip(false, false), false, 'nothing is streaming, so nothing to jump to');
});

// ---------- against recorded sessions ----------

test('a recorded session produces sensible lines, states and footers end to end', () => {
  const store = newStore();
  play(store, loadFixtureFile('residency'), { flushEvery: 4 });
  const s = store.getState();
  const revs = s.session.revisions;
  assert.equal(revs.length, 4);
  for (const r of revs) {
    assert.equal(r.status, 'done');
    const items = footerItems(r, true, t);
    assert.ok(items.length >= 1 && /^Drawn in \d+\.\d s$/.test(items[0].text), `footer ${r.n}: ${items[0]?.text}`);
    assert.match(rowMeta(r, t), /^\+\d+ −\d+ · \d+\.\d s/);
    for (const l of r.changes) {
      const v = lineView(l, t);
      assert.ok(v.name.length > 0 && v.text.length > 0, `line ${l.key}`);
      assert.doesNotMatch(v.text, /\{\w+\}/, `unfilled placeholder in ${v.text}`);
    }
  }
  const views = requirementViews(s.session, s.work);
  assert.ok(views.length >= 1);
  const meta = requirementMeta(views[0], catalog, t);
  assert.match(meta.map((m) => m.text).join(' | '), /Stays in Singapore \(ap-southeast-1\)/);
  assert.equal(stateView(views[0].state, t).tone, 'ok');
});

test('the repair fixture words its fix block', () => {
  const store = newStore();
  play(store, loadFixtureFile('chinese-fix'));
  const r = store.getState().session.revisions.find((x) => x.fix.constraint.length > 0);
  assert.ok(r, 'a revision with a constraint fix');
  assert.equal(revisionState(r!), 'fixed');
  const sentences = fixSentences(r!.fix.constraint, { regions: ['ap-southeast-1'], catalog, t });
  assert.ok(sentences.length >= 1);
  for (const s of sentences) assert.doesNotMatch(s, /\{\w+\}|labelled|'n\d/, s);
});

// ---------- the Claude backup: status words, footer attribution, row meta ----------

test('a Claude rescue status is worded in the UI language; every other status keeps the server text', () => {
  const claude = { code: 'fallback' as const, text: 'server text', provider: 'claude' as const };
  assert.equal(statusText(claude, t), "Qwen's answer was stopped by a content filter. Claude is taking over…");
  assert.equal(statusText({ ...claude, code: 'continue' }, t), 'Claude is finishing the answer…');
  assert.equal(statusText({ ...claude, code: 'repair' }, t), 'Claude is fixing the diagram…');
  assert.equal(statusText({ ...claude, code: 'continue' }, ko), 'Claude가 답변을 마무리하는 중…');
  assert.equal(statusText({ code: 'fallback', text: 'Switching to a backup model…' }, t), 'Switching to a backup model…', "a Qwen fallback is the server's own line");
  assert.equal(statusText({ code: 'retry', text: 'Trying again…', provider: 'claude' }, t), 'Trying again…', 'only the three rescue codes are reworded');
});

test('the status line owns the Cursor during a rescue, like any other status', () => {
  const r = rev({ status: 'streaming', rescue: 'running', note: 'x', statusLine: { code: 'continue', text: 'Claude: ...', provider: 'claude' } });
  assert.equal(cursorSlot(r, turn('repairing')), 'status');
});

test('the attribution names who finished the answer, and replaces the cut-off note', () => {
  assert.equal(rescueNote(rev(), t), null, 'no rescue, no attribution');
  assert.deepEqual(rescueNote(rev({ rescue: 'finished' }), t), { text: 'Finished by Claude after a content-filter stop', tone: 'plain' });
  assert.equal(rescueNote(rev({ rescue: 'finished' }), makeT('zh'))?.text, '内容过滤中断后由 Claude 完成');
  assert.equal(rescueNote(rev({ rescue: 'finished' }), ko)?.text, '콘텐츠 필터로 중단된 뒤 Claude가 마무리함');
  const inc = rescueNote(rev({ rescue: 'incomplete' }), t)!;
  assert.equal(inc.tone, 'warn');
  assert.match(inc.text, /Claude could not finish the answer\. The diagram shows what was drawn\./);
  assert.equal(rescueNote(rev({ rescue: 'running', status: 'streaming' }), t), null, 'the status line speaks while it runs');
  assert.equal(rescueNote(rev({ rescue: 'failed', status: 'failed' }), t), null, 'the error block speaks when it failed');
  // the footer's own items are unchanged, and the stale cut-off note never sits beside the attribution
  assert.deepEqual(footerItems(rev({ rescue: 'incomplete', truncated: true }), true, t).map((i) => i.key), ['done', 'held']);
  assert.deepEqual(footerItems(rev({ truncated: true }), true, t).map((i) => i.key), ['done', 'held', 'cut']);
});

test('the collapsed row says it was finished by Claude, or left unfinished', () => {
  assert.equal(rowMeta(rev({ rescue: 'finished' }), t), '+3 −1 · 9.5 s · via Claude');
  assert.equal(rowMeta(rev({ rescue: 'incomplete' }), t), '+3 −1 · 9.5 s · Unfinished');
  assert.equal(rowMeta(rev(), t), '+3 −1 · 9.5 s');
});
