import { layoutWorkflow, tidyWorkflow } from '@ali/core/workflow-layout.ts';
import { compactSessionTitle } from '@ali/core/session-title.ts';
import type { PricingSession } from '@ali/core/solution-pricing.ts';
import type { WorkflowSettings, WorkflowEstimateSettings } from '@ali/core/types.ts';
// The session store's reducer: pure, deterministic, no timers and no DOM. The controller dispatches actions with the
// clock in them, so replays and tests are exact. One reducer owns the turn: the working raw graph (core applyOp on each
// streamed op), the display graph (displayGraph over repairGraph), the layout (layoutGraph with the previous layout, for
// stability), the record model of the revision in progress, and the commit that replaces memory with the server's.
import type { Catalog, Graph, Op, SessionMemory, TurnMode, Warning, WorkflowGraph, WorkflowOp } from '@ali/core/types.ts';
import { applyOp, createCtx, emptyGraph } from '@ali/core/reducer.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import { checkWorkflowConstraints } from '@ali/core/workflow-constraints.ts';
import { repairWorkflow } from '@ali/core/workflow-validate.ts';
import { createModelTable } from '@ali/core/models.ts';
import type { ModelFile } from '@ali/core/models.ts';
import modelFile from '@ali/catalog/models.json' with { type: 'json' };
import { repairGraph } from '@ali/core/validate.ts';
import { defaultConstraintChecker } from '@ali/core/llm.ts';
import type { ConstraintChecker } from '@ali/core/llm.ts';
import { mergeConstraints } from '@ali/core/constraints.ts';
import { touchedBy } from '@ali/core/display.ts';
import { diffGraphs } from '@ali/core/diff.ts';
import { detectReplyLanguage, turnsOutsideWindow } from '@ali/core/prompt.ts';
import { layoutFor } from '../canvas/layout.ts';
import type { CanvasSize } from '../canvas/layout.ts';
import { displayOpenTurn } from '../stream/display.ts';
import { CONSTRAINT_CODES } from '../stream/events.ts';
import type { WireEvent } from '../stream/events.ts';
import { t } from '../i18n/t.ts';
import type { Lang } from '../i18n/t.ts';
import { applyChange, countChanges, reconcileChanges, workflowChanges } from './changes.ts';
import { addLifecycle, lifecycleNote } from './lifecycle.ts';
import { unpinFrom } from './requirements.ts';
import type {
  AppState,
  AskNote,
  AssumeNote,
  AutoFix,
  ConnMode,
  DisplayReason,
  DisplayState,
  Highlight,
  ReplaySpeed,
  Revision,
  RevisionError,
  SessionRecord,
  SessionSummary,
  TurnWork,
} from './types.ts';
import type { Health } from '../stream/events.ts';
import type { Account } from '../stream/account.ts';

const models = createModelTable(modelFile as ModelFile);

export interface StoreDeps {
  catalog: Catalog;
  /** Pinned-constraint checker used when a repair turn starts without any constraint warning having streamed. Default: the server's. */
  checkConstraints?: ConstraintChecker;
}

export type Action =
  | { type: 'app/init'; lang: Lang; sessions: SessionSummary[]; canvas?: CanvasSize }
  | { type: 'lang/set'; lang: Lang }
  | { type: 'conn/set'; mode: ConnMode; health: Health | null; now: number }
  | { type: 'account/set'; account: Account | null }
  | { type: 'workflow/settings'; next: WorkflowSettings; now: number }
  | { type: 'workflow/estimate'; next: WorkflowEstimateSettings; now: number }
  | { type: 'workflow/tidy' }
  | { type: 'pricing/open'; open: boolean }
  | { type: 'pricing/start'; ask?: string; now: number }
  | { type: 'pricing/stop' }
  | { type: 'pricing/failure'; error: string }
  | { type: 'pricing/commit'; pricing: PricingSession; now: number }
  | { type: 'session/mode'; mode: TurnMode }
  | { type: 'session/new'; id: string; now: number }
  | { type: 'session/open'; record: SessionRecord; now: number }
  | { type: 'sessions/list'; sessions: SessionSummary[] }
  | { type: 'session/title'; id: string; previousTitle: string; title: string; titleVersion?: number; titleRetryAt?: number }
  | { type: 'turn/start'; mode?: TurnMode; intent?: 'deployment'; ask: string; now: number; replayOf?: string | null; replaceLast?: boolean }
  | { type: 'rev/discardFailed' }
  | { type: 'turn/event'; event: WireEvent; now: number }
  | { type: 'turn/flush'; now: number }
  | { type: 'turn/stop'; now: number }
  | { type: 'turn/fail'; code: string; message: string; retryable: boolean; now: number }
  | { type: 'canvas/size'; size: CanvasSize }
  | { type: 'ui/panel'; open: boolean }
  | { type: 'ui/focusDiagram'; on: boolean }
  | { type: 'ui/highlight'; highlight: Highlight | null }
  | { type: 'ui/panTo'; ids: string[]; view?: TurnMode }
  | { type: 'ui/reveal'; revision: number }
  | { type: 'ui/hoverCard'; id: string | null }
  | { type: 'ui/toastClear' }
  | { type: 'ui/handoff'; on: boolean }
  | { type: 'ui/draft'; text: string }
  /** The composer (or the landing box) has put the draft in its field: forget it, so a remount cannot apply it twice. */
  | { type: 'ui/draftTaken' }
  | { type: 'req/unpin'; text: string; now: number }
  | { type: 'req/undo' }
  | { type: 'replay/set'; replay: AppState['replay'] }
  | { type: 'replay/speed'; speed: ReplaySpeed };

// ---------- construction ----------

export function emptyMemory(): SessionMemory {
  return { turns: [], requirements: [], graph: emptyGraph(), tombstones: [] };
}

export function newSessionRecord(id: string, now: number): SessionRecord {
  return {
    id,
    mode: 'cloud',
    createdAt: now,
    updatedAt: now,
    title: '',
    memory: emptyMemory(),
    revisions: [],
    reqPinnedIn: {},
    provenance: {},
    summarizedThrough: 0,
    summarizing: false,
    replayOf: null,
  };
}

const emptyDisplay = (): DisplayState => ({ graph: emptyGraph(), layout: null, prev: null, version: 0, reason: 'empty', refit: false, animate: false, held: [] });

export function createInitialState(init: { lang: Lang; sessions?: SessionSummary[]; canvas?: CanvasSize; id?: string; now?: number }): AppState {
  return {
    lang: init.lang,
    view: 'landing',
    conn: { mode: 'checking', health: null, checkedAt: null },
    account: null,
    session: newSessionRecord(init.id ?? 'session-0', init.now ?? 0),
    turn: { phase: 'idle', lastTextAt: null, startedAt: null },
    work: null,
    display: emptyDisplay(),
    workflowDisplay: { graph: emptyWorkflow(), version: 0, reason: 'empty' },
    canvas: init.canvas ?? { w: 0, h: 0 },
    ui: { panelOpen: false, focusDiagram: false, highlight: null, panTo: null, reveal: null, hoverCard: null, toast: null, live: null, handoff: false, composerDraft: null },
    replay: null,
    sessions: init.sessions ?? [],
    sessionsVersion: 0,
  };
}

export function emptyRevision(n: number, ask: string, now: number): Revision {
  return {
    n,
    ask,
    askLang: askLangTag(ask),
    startedAt: now,
    status: 'waiting',
    note: '',
    changes: [],
    reqs: [],
    lifecycle: [],
    fix: { autoFixes: [], constraint: [], state: 'none', note: '', changes: [] },
    statusLine: null,
    truncated: false,
    durationMs: null,
    error: null,
    commitWarnings: [],
    added: 0,
    removed: 0,
    cards: [],
    gone: [],
    assumes: [],
    asks: [],
  };
}

/** BCP 47 tag for the ask: Korean, Chinese and Japanese from core's detector, English otherwise. */
export function askLangTag(ask: string): string {
  switch (detectReplyLanguage(ask)) {
    case 'Korean':
      return 'ko';
    case 'Chinese':
      return 'zh';
    case 'Japanese':
      return 'ja';
    default:
      return 'en';
  }
}

// ---------- helpers ----------

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);
const keyOf = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

function live(state: AppState, text: string): AppState {
  return { ...state, ui: { ...state.ui, live: { text, seq: (state.ui.live?.seq ?? 0) + 1 } } };
}

function patchLast(state: AppState, fn: (r: Revision) => Revision): AppState {
  const revs = state.session.revisions;
  if (!revs.length) return state;
  const next = revs.slice();
  next[next.length - 1] = fn(revs[revs.length - 1]);
  return { ...state, session: { ...state.session, revisions: next } };
}

function relayout(state: AppState, deps: StoreDeps, graph: Graph, reason: DisplayReason, o: { refit: boolean; animate: boolean; held?: string[]; fresh?: boolean }): AppState {
  const prev = state.display.layout;
  const layout = layoutFor(graph, deps.catalog, o.fresh ? null : prev, state.canvas);
  const display: DisplayState = {
    graph,
    layout,
    prev: prev,
    version: state.display.version + 1,
    reason,
    refit: o.refit,
    animate: o.animate,
    held: o.held ?? [],
  };
  return { ...state, display };
}

function sameFix(a: AutoFix, b: AutoFix): boolean {
  return (a.view ?? 'cloud') === (b.view ?? 'cloud') && a.code === b.code && a.ids.join(',') === b.ids.join(',');
}

const NOT_AN_AUTO_FIX: ReadonlySet<Warning['code']> = new Set<Warning['code']>(['alias-resolved', 'retired-product', 'unknown-id']);

function mergeFixes(have: AutoFix[], warnings: readonly Warning[]): AutoFix[] {
  let out = have;
  for (const w of warnings) {
    if (!w.repaired || NOT_AN_AUTO_FIX.has(w.code)) continue;
    const fix: AutoFix = { code: w.code, ids: w.ids, ...(w.view ? { view: w.view } : {}) };
    if (!out.some((f) => sameFix(f, fix))) out = [...out, fix];
  }
  return out;
}

function foldedThrough(session: SessionRecord, memory: SessionMemory): number {
  if (!memory.summary) return 0;
  const folded = Math.floor(turnsOutsideWindow(memory).length / 2);
  const trimmed = Math.max(0, session.revisions.length - Math.floor(memory.turns.length / 2));
  return Math.max(1, trimmed + folded);
}

// ---------- the reducer ----------

/** The calendar date on the reader's clock (YYYY-MM-DD): a session saved at 01:00 in Seoul is from that day, not from the UTC day before. */
function localDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function reduce(state: AppState, action: Action, deps: StoreDeps): AppState {
  switch (action.type) {
    case 'app/init':
      return { ...state, lang: action.lang, sessions: action.sessions, canvas: action.canvas ?? state.canvas };
    case 'lang/set':
      return state.lang === action.lang ? state : { ...state, lang: action.lang };
    case 'conn/set': {
      const mode = state.replay && action.mode !== 'replay' ? 'replay' : action.mode;
      return { ...state, conn: { mode, health: action.health, checkedAt: action.now } };
    }
    case 'account/set':
      return { ...state, account: action.account };
    case 'sessions/list':
      return { ...state, sessions: action.sessions, sessionsVersion: state.sessionsVersion + 1 };
    case 'session/title':
      if (state.session.id !== action.id || state.session.title !== action.previousTitle || state.replay) return state;
      return { ...state, session: { ...state.session, title: action.title,
        titleVersion: action.titleVersion, titleRetryAt: action.titleRetryAt } };
    case 'pricing/open':
      return { ...state, session: { ...state.session, pricingOpen: action.open } };
    case 'pricing/start':
      return { ...state, pricingStatus: 'working', pricingError: undefined,
        session: { ...state.session, pricingPending: action.ask, updatedAt: action.now } };
    case 'pricing/stop':
      return { ...state, pricingStatus: undefined, pricingError: undefined };
    case 'pricing/failure':
      return { ...state, pricingStatus: 'failed', pricingError: action.error };
    case 'pricing/commit':
      return { ...state, pricingStatus: undefined, pricingError: undefined,
        session: { ...state.session, pricing: action.pricing, pricingPending: undefined, updatedAt: action.now } };
    case 'workflow/settings':
    case 'workflow/estimate': {
      if (state.work || state.replay) return state;
      const field = action.type === 'workflow/settings' ? 'workflowSettings' : 'estimate';
      const next = { ...state, session: { ...state.session, updatedAt: action.now,
        memory: { ...state.session.memory, [field]: structuredClone(action.next) } } };
      return action.type === 'workflow/estimate' ? live(next, t(state.lang, 'workflow.live.estimate')) : next;
    }
    case 'workflow/tidy': {
      if (state.work || state.replay) return state;
      const layout = tidyWorkflow(state.workflowDisplay.graph);
      return live({ ...state, session: { ...state.session, workflowLayout: layout }, workflowDisplay: { ...state.workflowDisplay,
        layout, version: state.workflowDisplay.version + 1 } },
      t(state.lang, 'workflow.live.tidied'));
    }
    case 'session/mode':
      return { ...state, session: { ...state.session, mode: action.mode },
        ui: { ...state.ui, highlight: null, hoverCard: null, panTo: null } };
    case 'session/new':
      return {
        ...createInitialState({ lang: state.lang, sessions: state.sessions, canvas: state.canvas, id: action.id, now: action.now }),
        conn: state.conn.mode === 'replay' && state.replay ? { ...state.conn, mode: state.conn.health ? 'live' : 'offline' } : state.conn,
        account: state.account,
        sessionsVersion: state.sessionsVersion,
        ui: { ...state.ui, highlight: null, panTo: null, reveal: null, hoverCard: null, toast: null, live: null, handoff: false, composerDraft: null, panelOpen: false, focusDiagram: false },
      };
    case 'session/open': {
      const rec = action.record;
      const base: AppState = {
        ...state,
        view: 'working',
        pricingStatus: undefined,
        pricingError: undefined,
        session: { ...rec, mode: rec.mode ?? 'cloud' },
        workflowDisplay: workflowDisplay({ ...state, session: rec }, rec.memory.workflow ?? emptyWorkflow(), 'restore'),
        work: null,
        turn: { phase: 'idle', lastTextAt: null, startedAt: null },
        replay: null,
        ui: { ...state.ui, highlight: null, panTo: null, hoverCard: null, handoff: false, composerDraft: null, toast: { id: action.now, kind: 'restored', date: localDate(rec.updatedAt) } },
      };
      return relayout(base, deps, rec.memory.graph, 'restore', { refit: true, animate: false, fresh: true });
    }
    case 'turn/start':
      return startTurn(action.replaceLast ? discardFailed(state) : state, action.ask, action.now, action.replayOf ?? null,
        action.mode ?? (action.replaceLast ? latestRevision(state)?.mode ?? 'cloud' : state.session.mode ?? 'cloud'), action.intent);
    case 'rev/discardFailed':
      return discardFailed(state);
    case 'turn/event':
      return onEvent(state, action.event, action.now, deps);
    case 'turn/flush':
      return flush(state, deps, action.now);
    case 'turn/stop':
      return endWithoutCommit(state, deps, 'stopped', null, action.now);
    case 'turn/fail':
      return endWithoutCommit(state, deps, 'failed', { code: action.code, message: action.message, retryable: action.retryable, client: true }, action.now);
    case 'canvas/size': {
      const { w, h } = action.size;
      if (state.canvas.w === w && state.canvas.h === h) return state;
      const next = { ...state, canvas: { w, h } };
      // a size change re-lays out the committed picture (sticky, so nothing moves unless the layout depends on size);
      // mid-turn the next batch picks the new size up, because the customer is reading
      if (state.work || !state.display.layout) return next;
      return relayout(next, deps, state.display.graph, 'resize', { refit: true, animate: false });
    }
    case 'ui/panel':
      return state.ui.panelOpen === action.open ? state : { ...state, ui: { ...state.ui, panelOpen: action.open } };
    case 'ui/focusDiagram':
      return { ...state, ui: { ...state.ui, focusDiagram: action.on } };
    case 'ui/highlight': {
      let highlight = action.highlight;
      if (highlight && !highlight.view) {
        const rev = state.session.revisions.find((r) => r.n === highlight?.revision);
        const line = state.session.revisions.flatMap((r) => [...r.changes, ...r.fix.changes])
          .find((l) => l.cards === highlight?.cards && l.ghosts === highlight?.ghosts);
        const view = rev?.mode ?? line?.view;
        if (view) highlight = { ...highlight, view };
      }
      return { ...state, ui: { ...state.ui, highlight } };
    }
    case 'ui/panTo': {
      const rev = state.session.revisions.find((r) => r.cards === action.ids);
      const line = state.session.revisions.flatMap((r) => [...r.changes, ...r.fix.changes]).find((l) => l.cards === action.ids);
      const highlight = state.ui.highlight?.cards === action.ids ? state.ui.highlight : null;
      const view = action.view ?? (line ? line.view ?? 'cloud' : rev ? rev.mode ?? 'cloud' : highlight?.view ?? state.session.mode ?? 'cloud');
      return { ...state, ui: { ...state.ui, panTo: { ids: action.ids, view, seq: (state.ui.panTo?.seq ?? 0) + 1 } } };
    }
    case 'ui/reveal': {
      const rev = state.session.revisions.find((r) => r.n === action.revision);
      const highlight: Highlight | null = rev
        ? { source: 'revision', cards: rev.cards, ghosts: rev.gone, revision: rev.n, ...(rev.mode ? { view: rev.mode } : {}) }
        : state.ui.highlight;
      return { ...state, ui: { ...state.ui, highlight, reveal: { revision: action.revision, seq: (state.ui.reveal?.seq ?? 0) + 1 } } };
    }
    case 'ui/hoverCard':
      return state.ui.hoverCard === action.id ? state : { ...state, ui: { ...state.ui, hoverCard: action.id } };
    case 'ui/toastClear':
      return state.ui.toast ? { ...state, ui: { ...state.ui, toast: null } } : state;
    case 'ui/handoff':
      return { ...state, ui: { ...state.ui, handoff: action.on } };
    case 'ui/draftTaken':
      return state.ui.composerDraft ? { ...state, ui: { ...state.ui, composerDraft: null } } : state;
    case 'ui/draft':
      return { ...state, ui: { ...state.ui, composerDraft: { text: action.text, seq: (state.ui.composerDraft?.seq ?? 0) + 1 } } };
    case 'req/unpin': {
      if (state.work) return state; // the next turn's request carries the memory; changing it mid-turn would race the commit
      const mem = state.session.memory;
      const index = mem.requirements.findIndex((x) => keyOf(x) === keyOf(action.text));
      if (index < 0) return state;
      const constraint = mem.constraints?.find((c) => keyOf(c.text) === keyOf(action.text));
      const session = { ...state.session, memory: unpinFrom(mem, action.text), updatedAt: action.now };
      return { ...state, session, ui: { ...state.ui, toast: { id: action.now, kind: 'unpinned', undo: { text: mem.requirements[index], constraint, index } } } };
    }
    case 'req/undo': {
      const u = state.ui.toast?.undo;
      if (!u || state.work) return state;
      const mem = state.session.memory;
      if (mem.requirements.some((x) => keyOf(x) === keyOf(u.text))) return { ...state, ui: { ...state.ui, toast: null } };
      const requirements = mem.requirements.slice();
      requirements.splice(Math.min(u.index, requirements.length), 0, u.text);
      const memory: SessionMemory = { ...mem, requirements };
      if (u.constraint) memory.constraints = [...(mem.constraints ?? []), u.constraint];
      return { ...state, session: { ...state.session, memory }, ui: { ...state.ui, toast: null } };
    }
    case 'replay/set':
      return { ...state, replay: action.replay, conn: action.replay ? { ...state.conn, mode: 'replay' } : state.conn };
    case 'replay/speed':
      return state.replay ? { ...state, replay: { ...state.replay, speed: action.speed } } : state;
  }
}

// ---------- the turn ----------

/** Drops a failed or stopped revision from the end of the record (Try again and Edit and resend replace it). */
function discardFailed(state: AppState): AppState {
  const revs = state.session.revisions;
  const last = revs[revs.length - 1];
  if (state.work || !last || (last.status !== 'failed' && last.status !== 'stopped')) return state;
  const session = { ...state.session, revisions: revs.slice(0, -1), title: revs.length === 1 ? '' : state.session.title };
  return { ...state, session, turn: { phase: 'idle', lastTextAt: null, startedAt: null } };
}

function startTurn(state: AppState, ask: string, now: number, replayOf: string | null, mode: TurnMode, intent?: 'deployment'): AppState {
  const text = ask.trim();
  const session = state.session;
  const n = session.revisions.length + 1;
  const mem = session.memory;
  const shown = state.display.layout ? new Set(Object.keys(state.display.layout.cards)) : new Set<string>();
  const work: TurnWork = {
    n,
    mode,
    rawWorkflow: mem.workflow ?? emptyWorkflow(),
    workflowLayout: state.workflowDisplay.layout,
    workflowCtx: createWorkflowCtx(),
    base: mem,
    raw: mem.graph,
    ctx: createCtx(),
    constraints: [...(mem.constraints ?? [])],
    shownAtTurnStart: shown,
    touched: new Set(),
    drawn: state.display.layout ? shown : undefined,
    dirty: false,
    batches: 0,
    says: {},
    sayOrder: [],
    follow: null,
    autoFixes: [],
    built: [],
  };
  const next: AppState = {
    ...state,
    view: 'working',
    session: {
      ...session,
      mode,
      title: session.title || compactSessionTitle(text),
      updatedAt: now,
      replayOf: replayOf ?? session.replayOf,
      revisions: [...session.revisions, { ...emptyRevision(n, text, now), mode, ...(intent ? { intent } : {}) }],
    },
    work,
    turn: { phase: 'waiting', lastTextAt: null, startedAt: now },
    ui: { ...state.ui, highlight: null, hoverCard: null, toast: null },
  };
  return live(next, t(state.lang, 'live.started', { n }));
}

function onEvent(state: AppState, ev: WireEvent, now: number, deps: StoreDeps): AppState {
  const work = state.work;
  // summary and its status arrive after the commit, when no turn is in flight
  if (ev.type === 'summary') {
    const memory = { ...state.session.memory, summary: ev.summary };
    const session = { ...state.session, memory, summarizing: false, summarizedThrough: foldedThrough(state.session, memory) };
    return { ...state, session };
  }
  if (ev.type === 'status' && ev.code === 'summary') return { ...state, session: { ...state.session, summarizing: true } };
  if (!work) return state;

  switch (ev.type) {
    case 'say':
      return onSay(state, work, ev, now);
    case 'op':
      return onOp(state, work, ev, deps);
    case 'warn':
      return onWarn(state, work, ev.warning, deps);
    case 'usage':
    case 'error':
      return state;
    case 'done': {
      if (ev.phase !== 'main' && work.follow !== 'continue') return state;
      return patchLast(state, (r) => ({ ...r, truncated: ev.truncated }));
    }
    case 'status':
      return onStatus(state, work, ev.code, ev.text, deps);
    case 'commit':
      return onCommit(state, work, ev, now, deps);
    case 'fatal':
      return endWithoutCommit(state, deps, 'failed', { code: ev.code, message: ev.message, retryable: ev.retryable, client: false }, now);
  }
}

function firstToken(state: AppState): AppState {
  if (state.turn.phase === 'waiting' || state.turn.phase === 'fallback' || state.turn.phase === 'repairing') {
    const keep = state.turn.phase === 'repairing' ? 'repairing' : 'streaming';
    return { ...state, turn: { ...state.turn, phase: keep } };
  }
  return state;
}

function onSay(state: AppState, work: TurnWork, ev: Extract<WireEvent, { type: 'say' }>, now: number): AppState {
  const toFix = ev.phase === 'repair' && work.follow !== 'continue';
  const key = `${ev.phase}:${ev.id}`;
  const says = { ...work.says, [key]: ev.text };
  const sayOrder = has(work.says, key) ? work.sayOrder : [...work.sayOrder, key];
  const main = sayOrder.filter((k) => k.startsWith('main:') || (work.follow === 'continue' && k.startsWith('repair:'))).map((k) => says[k]);
  const fixed = sayOrder.filter((k) => k.startsWith('repair:') && work.follow !== 'continue').map((k) => says[k]);
  let next: AppState = { ...state, work: { ...work, says, sayOrder } };
  next = patchLast(next, (r) => ({ ...r, status: 'streaming', statusLine: null, note: toFix ? r.note : main.join(' '), fix: toFix ? { ...r.fix, note: fixed.join(' ') } : r.fix }));
  next = firstToken(next);
  next = { ...next, turn: { ...next.turn, lastTextAt: now } };
  if (ev.final && !toFix && main.length === 1) next = live(next, firstSentence(ev.text));
  return next;
}

function firstSentence(s: string): string {
  const m = /^.*?[.!?。！？](?=\s|$)/u.exec(s.trim());
  return (m ? m[0] : s).trim();
}

function onOp(state: AppState, work: TurnWork, ev: Extract<WireEvent, { type: 'op' }>, deps: StoreDeps): AppState {
  const op = ev.op;
  const phase = ev.phase;
  let next = firstToken(state);
  next = patchLast(next, (r) => ({ ...r, status: 'streaming', statusLine: null }));
  if (op.t === 'say') return next; // the say event carries the text; the op repeats it
  if (op.t === 'assume' || op.t === 'ask') return onAssumeOrAsk(next, op); // not graph ops: they feed the chips and the questions

  if (isWorkflowOp(op)) return work.mode === 'workflow' ? onWorkflowOp(next, work, op, phase) : next;
  if (work.mode === 'workflow' && !['req', 'gap', 'done'].includes(op.t)) return next;

  const toFix = phase === 'repair' && work.follow !== 'continue';
  const res = applyOp(work.raw, op, work.ctx);
  const touched = new Set(work.touched);
  for (const id of touchedBy(op)) touched.add(id);
  let constraints = work.constraints;
  if (op.t === 'req') constraints = mergeConstraints(constraints, [op]);

  const lines = toFix ? next.session.revisions[next.session.revisions.length - 1].fix.changes : next.session.revisions[next.session.revisions.length - 1].changes;
  const changed = op.t === 'req' || op.t === 'done' ? lines : applyChange(lines, op, work.raw, res, deps.catalog, phase);
  const isNode = (id: string): boolean => id.startsWith('rec:') || has(res.graph.nodes, id);
  const built = res.added.length || res.updated.length ? [...new Set([...work.built, ...res.added.filter(isNode), ...res.updated.filter(isNode)])] : work.built;

  next = {
    ...next,
    work: { ...work, raw: res.graph, touched, constraints, dirty: work.dirty || res.graph !== work.raw, built },
  };
  next = patchLast(next, (r) => {
    let out = r;
    if (op.t === 'req') {
      if (!out.reqs.some((x) => keyOf(x) === keyOf(op.text))) out = { ...out, reqs: [...out.reqs, op.text] };
    } else if (changed !== lines) out = toFix ? { ...out, fix: { ...out.fix, changes: changed } } : { ...out, changes: changed };
    return out;
  });
  if (op.t === 'req') {
    const pinnedIn = next.session.reqPinnedIn;
    next = { ...next, session: { ...next.session, reqPinnedIn: has(pinnedIn, op.text) ? pinnedIn : { ...pinnedIn, [op.text]: work.n } } };
    next = live(next, t(next.lang, 'live.reqPinned', { text: op.text }));
  }
  return next;
}

// ---------- assume and ask ops (additive: research/phase1-asks-and-scope.md section 1) ----------

function upsertNote<T extends { id: string }>(list: readonly T[], note: T): T[] {
  const i = list.findIndex((x) => x.id === note.id);
  if (i < 0) return [...list, note];
  const out = list.slice();
  out[i] = note;
  return out;
}

/** The same id replaces. A note with no text says nothing and is dropped; options are trimmed, deduplicated and capped at four. */
function onAssumeOrAsk(state: AppState, op: Extract<Op, { t: 'assume' | 'ask' }>): AppState {
  const text = op.text.trim();
  if (!op.id || !text) return state;
  if (op.t === 'assume') {
    const alt = op.alt?.trim();
    const note: AssumeNote = alt ? { id: op.id, text, alt } : { id: op.id, text };
    return patchLast(state, (r) => ({ ...r, assumes: upsertNote(r.assumes ?? [], note) }));
  }
  const options = [...new Set((op.options ?? []).map((o) => String(o).trim()).filter(Boolean))].slice(0, 4);
  const note: AskNote = options.length ? { id: op.id, text, options } : { id: op.id, text };
  return patchLast(state, (r) => ({ ...r, asks: upsertNote(r.asks ?? [], note) }));
}

function onWarn(state: AppState, work: TurnWork, w: Warning, deps: StoreDeps): AppState {
  let next = state;
  const note = lifecycleNote(w, deps.catalog);
  if (note) next = patchLast(next, (r) => ({ ...r, lifecycle: addLifecycle(r.lifecycle, note) }));
  if (CONSTRAINT_CODES.has(w.code) && !w.repaired) {
    next = patchLast(next, (r) => (r.fix.constraint.some((x) => x.code === w.code && x.msg === w.msg) ? r : { ...r, fix: { ...r.fix, constraint: [...r.fix.constraint, w] } }));
  }
  const autoFixes = mergeFixes(work.autoFixes, [w]);
  if (autoFixes !== work.autoFixes && next.work) next = { ...next, work: { ...next.work, autoFixes } };
  return next;
}

function onStatus(state: AppState, work: TurnWork, code: Extract<WireEvent, { type: 'status' }>['code'], text: string, deps: StoreDeps): AppState {
  // 'finish' is a second pass taking over the answer. The wire never says who it is. The revision remembers that it
  // happened (its note is not Qwen's alone), and the cut-off Qwen reported no longer describes the answer.
  const finish = code === 'finish';
  let next = patchLast(state, (r) => ({ ...r, statusLine: { code, text }, ...(finish ? { finishing: true, truncated: false } : {}) }));
  if (finish) next = live(next, t(next.lang, 'live.finishing', { n: work.n }));
  if (code === 'repair' || code === 'continue') {
    // The server's follow-up turn starts from the repaired graph with a fresh reducer context: mirror that, so its ops
    // (which name ids of the repaired graph) apply to the same graph here.
    if (work.mode === 'workflow') {
      const rep = repairWorkflow(work.rawWorkflow, deps.catalog, models, work.base.workflowSettings);
      const follow = code === 'continue' ? 'continue' : 'repair';
      next = { ...next, work: { ...work, rawWorkflow: rep.workflow,
        workflowLayout: layoutWorkflow(rep.workflow, work.workflowLayout), workflowCtx: createWorkflowCtx(),
        follow, dirty: true, autoFixes: mergeFixes(work.autoFixes, rep.warnings.map((w) => ({ ...w, view: 'workflow' }))) },
        turn: { ...next.turn, phase: 'repairing' } };
      return patchLast(next, (r) => {
        if (follow !== 'repair') return { ...r, truncated: false };
        let found = r.fix.constraint;
        if (!found.length && work.constraints.length) {
          const says = work.sayOrder.filter((k) => k.startsWith('main:')).map((k) => work.says[k]);
          try {
            found = checkWorkflowConstraints(rep.workflow, says, work.constraints, deps.catalog).filter((w) => w.severity !== 'info');
          } catch { found = []; }
        }
        return { ...r, fix: { ...r.fix, state: 'fixing', constraint: found } };
      });
    }
    const rep = repairGraph(work.raw, deps.catalog, { constraints: work.constraints });
    const follow = code === 'continue' ? 'continue' : 'repair';
    next = {
      ...next,
      work: { ...work, raw: rep.graph, ctx: createCtx(), follow, dirty: true, autoFixes: mergeFixes(work.autoFixes, rep.warnings) },
      turn: { ...next.turn, phase: 'repairing' },
    };
    if (follow === 'repair') {
      // The server does not stream the findings that trigger a repair turn. When none arrived as warn events, run the
      // same checker over the same repaired graph, so Checking and the FixBlock's sentence still have their data.
      let found = next.session.revisions[next.session.revisions.length - 1].fix.constraint;
      if (!found.length && work.constraints.length) {
        const says = work.sayOrder.filter((k) => k.startsWith('main:')).map((k) => work.says[k]);
        try {
          found = (deps.checkConstraints ?? defaultConstraintChecker)({ graph: rep.graph, says, constraints: work.constraints, catalog: deps.catalog }).filter((w) => w.severity !== 'info');
        } catch {
          found = [];
        }
      }
      next = patchLast(next, (r) => ({ ...r, fix: { ...r.fix, state: 'fixing', constraint: found } }));
    }
    else next = patchLast(next, (r) => ({ ...r, truncated: false }));
    return next;
  }
  return { ...next, turn: { ...next.turn, phase: 'fallback' } };
}

// ---------- flush: one display and layout step per batch ----------

function flush(state: AppState, deps: StoreDeps, now: number): AppState {
  const work = state.work;
  if (!work || !work.dirty) return state;
  if (work.mode === 'workflow') {
    const text = t(state.lang, 'workflow.live.updated', { n: Object.keys(work.rawWorkflow.nodes).length });
    const previous = work.workflowAnnouncement;
    const announce = (!previous || now - previous.at >= 2000) && previous?.text !== text && state.ui.live?.text !== text;
    const next: AppState = { ...state, workflowDisplay: {
      graph: work.rawWorkflow, layout: work.workflowLayout ?? layoutWorkflow(work.rawWorkflow),
      version: state.workflowDisplay.version + 1, reason: 'batch' },
      work: { ...work, dirty: false, batches: work.batches + 1,
        ...(announce ? { workflowAnnouncement: { text, at: now } } : {}) } };
    return announce ? live(next, text) : next;
  }
  const d = displayOpenTurn({ raw: work.raw, catalog: deps.catalog, drawn: work.drawn, shownAtTurnStart: work.shownAtTurnStart, touched: work.touched, constraints: work.constraints });
  const first = work.batches === 0;
  // refit only at turn start (the first batch of the first turn): the customer is reading mid-turn
  let next = relayout(state, deps, d.graph, 'batch', { refit: first && work.n === 1, animate: true, held: d.held });
  const layout = next.display.layout;
  next = { ...next, work: { ...work, dirty: false, batches: work.batches + 1, drawn: layout ? new Set(Object.keys(layout.cards)) : work.drawn } };
  return next;
}

// ---------- commit ----------

function onCommit(state: AppState, work: TurnWork, ev: Extract<WireEvent, { type: 'commit' }>, now: number, deps: StoreDeps): AppState {
  const memory = ev.memory;
  const committed = memory.graph;
  const workflow = work.mode === 'workflow';
  const beforeWorkflow = work.base.workflow ?? emptyWorkflow();
  const afterWorkflow = memory.workflow ?? emptyWorkflow();
  const beforeDoc = workflow ? beforeWorkflow : work.base.graph;
  const afterDoc = workflow ? afterWorkflow : committed;
  const diff = workflow ? workflowNodeDiff(beforeWorkflow, afterWorkflow) : diffGraphs(work.base.graph, committed);
  const isCard = (id: string): boolean => id.startsWith('rec:') || has(afterDoc.nodes, id) || has(beforeDoc.nodes, id);
  const cards = [...diff.added, ...diff.updated].filter((id) => isCard(id) && !has(afterDoc.edges, id) && !has(afterDoc.groups, id));
  const gone = diff.removed.filter((id) => isCard(id) && !has(beforeDoc.edges, id) && !has(beforeDoc.groups, id));
  const autoFixes = mergeFixes(work.autoFixes, [...(workflow ? ev.warnings : []), ...(workflow
    ? repairWorkflow(work.rawWorkflow, deps.catalog, models, work.base.workflowSettings).warnings.map((w) => ({ ...w, view: 'workflow' as const }))
    : repairGraph(work.raw, deps.catalog, { constraints: work.constraints }).warnings)]);
  const n = work.n;

  let next = state;
  next = patchLast(next, (r) => {
    const wfLines = workflow ? workflowChanges(beforeWorkflow, afterWorkflow, 'main') : [];
    const repairKeys = new Set(r.fix.changes.map((l) => l.key));
    const gaps = (lines: Revision['changes']) => lines.filter((l) => l.kind === 'gap').map((l) => ({ ...l, view: 'workflow' as const }));
    const changes = workflow ? [...wfLines.filter((l) => !repairKeys.has(l.key)), ...gaps(r.changes)]
      : reconcileChanges(r.changes, work.base.graph, committed, deps.catalog, 'main', true);
    const fixChanges = workflow
      ? [...wfLines.filter((l) => repairKeys.has(l.key)).map((l) => ({ ...l, phase: 'repair' as const })), ...gaps(r.fix.changes)]
      : reconcileChanges(r.fix.changes, work.base.graph, committed, deps.catalog, 'repair', false);
    const stillBroken = ev.warnings.some((w) => CONSTRAINT_CODES.has(w.code));
    const incomplete = ev.warnings.some((w) => w.code === 'reply-incomplete');
    let fixState = r.fix.state;
    if (work.follow === 'repair') fixState = r.fix.constraint.length && stillBroken ? 'failed' : 'fixed';
    else if (r.fix.constraint.length && stillBroken) fixState = 'failed';
    else if (fixState === 'fixing') fixState = 'fixed';
    const counts = countChanges([...changes, ...fixChanges]);
    return {
      ...r,
      status: 'done',
      statusLine: null,
      // a finished answer is not cut off; one the server says is incomplete keeps the plain cut-off note (the diagram keeps what was drawn)
      ...(r.finishing || incomplete ? { truncated: incomplete } : {}),
      changes,
      commitWarnings: ev.warnings,
      durationMs: Math.max(0, now - r.startedAt),
      fix: { ...r.fix, autoFixes, state: fixState, changes: fixChanges },
      added: counts.added,
      removed: counts.removed,
      cards,
      gone,
      // the server's questions are the validated ones (limits applied); without them, keep what streamed
      asks: memory.questions ?? r.asks ?? [],
    };
  });

  const provenance = { ...(workflow ? next.session.workflowProvenance : next.session.provenance) };
  for (const id of diff.added) if (isCard(id)) provenance[id] = { addedIn: n, changedIn: n };
  for (const id of diff.updated) if (isCard(id)) provenance[id] = { addedIn: provenance[id]?.addedIn ?? n, changedIn: n };
  for (const id of diff.removed) delete provenance[id];
  const reqPinnedIn: Record<string, number> = { ...next.session.reqPinnedIn };
  for (const text of memory.requirements) {
    if (has(reqPinnedIn, text)) continue;
    reqPinnedIn[text] = n;
  }
  const session: SessionRecord = { ...next.session, memory, updatedAt: now, reqPinnedIn,
    ...(n === 1 && typeof ev.title === 'string' && ev.title.trim() ? { title: compactSessionTitle(ev.title), titleVersion: 1 } : {}),
    ...(workflow ? { workflowLayout: layoutWorkflow(afterWorkflow, work.workflowLayout) } : {}),
    ...(workflow ? { workflowProvenance: provenance } : { provenance }) };
  session.summarizedThrough = memory.summary ? Math.max(session.summarizedThrough, foldedThrough(session, memory)) : session.summarizedThrough;
  next = { ...next, session, work: null, turn: { phase: 'idle', lastTextAt: null, startedAt: null } };
  next = workflow
    ? { ...next, workflowDisplay: { graph: afterWorkflow, layout: session.workflowLayout!,
      version: next.workflowDisplay.version + 1, reason: 'commit' } }
    : relayout(next, deps, committed, 'commit', { refit: true, animate: true });
  const rev = next.session.revisions[next.session.revisions.length - 1];
  const broken = ev.warnings.find((w) => CONSTRAINT_CODES.has(w.code));
  next = live(next, t(next.lang, 'live.drawn', { n, added: rev.added, removed: rev.removed }));
  if (broken) next = live(next, t(next.lang, 'live.reqBroken', { text: memory.requirements[memory.requirements.length - 1] ?? '' }));
  // new questions are announced politely, after what the revision drew (a question-first revision drew nothing)
  const asked = rev.asks ?? [];
  if (asked.length) {
    const first = asked[0].text;
    const what = asked.length === 1 ? t(next.lang, 'live.asked', { text: first }) : t(next.lang, 'live.askedMore', { count: asked.length, text: first });
    const before = broken ? t(next.lang, 'live.reqBroken', { text: memory.requirements[memory.requirements.length - 1] ?? '' }) : rev.added + rev.removed > 0 ? t(next.lang, 'live.drawn', { n, added: rev.added, removed: rev.removed }) : '';
    next = live(next, before ? `${before} ${what}` : what);
  }
  return next;
}

// ---------- fatal and stop ----------

/** A revision that ended with no commit: its streamed work is dropped. */
export function failedRevision(r: Revision, status: 'failed' | 'stopped', error: RevisionError | null, now?: number): Revision {
  const rest: Revision = { ...r };
  delete rest.finishing;
  return {
    ...rest,
    status,
    error,
    statusLine: null,
    changes: [],
    reqs: [],
    lifecycle: [],
    assumes: [],
    asks: [],
    truncated: false,
    durationMs: now === undefined ? r.durationMs : Math.max(0, now - r.startedAt),
    fix: { autoFixes: [], constraint: [], state: 'none', note: '', changes: [] },
  };
}

function endWithoutCommit(state: AppState, deps: StoreDeps, status: 'failed' | 'stopped', error: RevisionError | null, now: number): AppState {
  const work = state.work;
  if (!work) return state;
  let next = patchLast(state, (r) =>
    r.status === 'done' || r.status === 'failed' || r.status === 'stopped'
      ? r
      : failedRevision(r, status, error, now),
  );
  // memory is unchanged, so the pinned requirements are too: drop the ones this revision announced mid-turn
  const reqPinnedIn = { ...next.session.reqPinnedIn };
  for (const text of Object.keys(reqPinnedIn)) if (reqPinnedIn[text] === work.n && !work.base.requirements.includes(text)) delete reqPinnedIn[text];
  const failedFirstDeployment = latestRevision(next)?.intent === 'deployment' && !work.base.deploymentSource
    && !Object.keys(work.base.graph.nodes).length && !work.base.graph.recs.length;
  next = { ...next, session: { ...next.session, reqPinnedIn, ...(failedFirstDeployment ? { mode: 'workflow' as const } : {}) }, work: null };
  next = { ...next, turn: { phase: status === 'failed' ? 'error' : 'idle', lastTextAt: null, startedAt: null } };
  // the streamed cards leave and the committed graph returns
  next = work.mode === 'workflow'
    ? { ...next, workflowDisplay: workflowDisplay(next, work.base.workflow ?? emptyWorkflow(), 'revert') }
    : relayout(next, deps, work.base.graph, 'revert', { refit: true, animate: true });
  if (status === 'failed') {
    const rev = next.session.revisions[next.session.revisions.length - 1];
    next = live(next, t(next.lang, 'live.failed', { n: rev.n, message: error?.message ?? '' }));
  }
  return next;
}

// ---------- selectors that need no hooks ----------

export function latestRevision(state: AppState): Revision | undefined {
  return state.session.revisions[state.session.revisions.length - 1];
}

export function isBusy(state: AppState): boolean {
  return state.work !== null;
}

export function sessionSummary(s: SessionRecord): SessionSummary {
  return { id: s.id, title: s.title, updatedAt: s.updatedAt, revisions: s.revisions.length };
}

// Restores and rollbacks use committed cells, never a partially streamed layout.
function workflowDisplay(state: AppState, graph: WorkflowGraph, reason: DisplayReason): AppState['workflowDisplay'] {
  return { graph, layout: layoutWorkflow(graph, state.session.workflowLayout),
    version: state.workflowDisplay.version + 1, reason };
}

function isWorkflowOp(op: Op | WorkflowOp): op is WorkflowOp {
  return ['step', 'link', 'each', 'splice', 'unstep'].includes(op.t);
}

function workflowNodeDiff(base: WorkflowGraph, after: WorkflowGraph): { added: string[]; updated: string[]; removed: string[] } {
  return {
    added: Object.keys(after.nodes).filter((id) => !has(base.nodes, id)),
    updated: Object.keys(after.nodes).filter((id) => has(base.nodes, id)
      && JSON.stringify(base.nodes[id]) !== JSON.stringify(after.nodes[id])),
    removed: Object.keys(base.nodes).filter((id) => !has(after.nodes, id)),
  };
}

function onWorkflowOp(state: AppState, work: TurnWork, op: WorkflowOp, phase: 'main' | 'repair'): AppState {
  const ctx = { ...work.workflowCtx, pending: [...work.workflowCtx.pending], removedThisTurn: [...work.workflowCtx.removedThisTurn] };
  const res = applyWorkflowOp(work.rawWorkflow, op, ctx);
  const toFix = phase === 'repair' && work.follow !== 'continue';
  const changes = workflowChanges(work.rawWorkflow, res.workflow, toFix ? 'repair' : 'main');
  const built = [...new Set([...work.built, ...res.added, ...res.updated])].filter((id) => has(res.workflow.nodes, id));
  const next = { ...state, work: { ...work, rawWorkflow: res.workflow, workflowCtx: ctx,
    // Advance each transition with its operation before the display batch coalesces it.
    workflowLayout: res.workflow === work.rawWorkflow ? work.workflowLayout : layoutWorkflow(res.workflow, work.workflowLayout, { op }),
    dirty: work.dirty || res.workflow !== work.rawWorkflow, built } };
  return patchLast(next, (r) => {
    const lines = toFix ? r.fix.changes : r.changes;
    const keys = new Set(changes.map((l) => l.key));
    const merged = [...lines.filter((l) => !keys.has(l.key)), ...changes];
    return toFix ? { ...r, fix: { ...r.fix, changes: merged } } : { ...r, changes: merged };
  });
}
