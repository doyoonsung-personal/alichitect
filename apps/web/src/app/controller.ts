import type { WorkflowSettings, WorkflowEstimateSettings } from '@ali/core/types.ts';
// The controller owns every side effect: the network (POST /api/turn, GET /api/health), timers (the 180 ms display
// batch), local storage, the replay player and the document language. Everything it decides goes through store
// actions, so the console, canvas and panel only ever read state and call the functions on `Controller`.
import type { TurnMode, TurnRequest } from '@ali/core/types.ts';
import { DEFAULT_MAX_ASK_CHARS } from '@ali/core/prompt.ts';
import { postTurn, probeHealth } from '../stream/ndjson-client.ts';
import { authHandoff, fetchAccount, loginUrl } from '../stream/account.ts';
import { TOOLS } from './tools.ts';
import type { WireEvent } from '../stream/events.ts';
import { createPlayer, BATCH_MS } from '../replay/player.ts';
import type { Player } from '../replay/player.ts';
import type { Fixture } from '../replay/plan.ts';
import type { Store } from '../store/store.ts';
import type { Action } from '../store/reducer.ts';
import type { SessionStore } from '../store/sessions.ts';
import type { Highlight, ReplaySpeed } from '../store/types.ts';
import { isLang } from '../i18n/t.ts';
import type { Lang } from '../i18n/t.ts';
import type { CanvasSize } from '../canvas/layout.ts';

export interface ControllerEnv {
  sessions: SessionStore;
  fetchImpl?: typeof fetch;
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(h: unknown): void;
  newId(): string;
  loadFixture(id: string): Promise<Fixture | null>;
  /** URL query string, for ?replay=<id>&speed=<1x|4x|instant>&lang=<en|ko|zh>. */
  search: string;
  /** Persists the chosen UI language and sets html[lang]; the browser implementation is in main.tsx. */
  setLanguage(lang: Lang): void;
  /** The id of the session this tab was showing before a refresh: boot reopens it (when it was saved) instead of the landing. */
  resumeId?: string | null;
  /**
   * Hosted Worker only. Sends the browser to another page of the site (a full navigation). Returns false when it
   * declined, so the caller leaves the error on screen: main.tsx allows one such trip in 15 s, which stops a sign-in
   * loop if the Worker ever disagrees with itself.
   */
  leave?(to: string): boolean;
  /** The page's path and query, for /login?next=. */
  path?(): string;
  /** Keeps the ask of a turn that the session's end cut off, for this tab, and hands it back on the next boot. */
  keepAsk?(ask: string): void;
  takeAsk?(): string | null;
  /** POSTs to the Worker's sign-out address (a form post, so the browser follows its redirect to /login). */
  signOut?(url: string): void;
}

export type SubmitResult = 'started' | 'empty' | 'busy' | 'offline' | 'too-long' | 'read-only';

export interface Controller {
  boot(): Promise<void>;
  /** Checks /api/health again (the Try again button of the offline notice). */
  checkHealth(): Promise<void>;
  /** Reads GET /api/me (who is signed in, today's turns). Nothing happens where there is no such route. */
  loadAccount(): Promise<void>;
  /** Ends the hosted session. */
  signOut(): void;
  /** The landing box and the composer both call this. */
  submit(ask: string, o?: { exampleId?: string }): SubmitResult;
  stop(): void;
  /** Sends the failed revision's ask again, replacing the failed revision. */
  retry(): void;
  /** Puts the failed revision's ask back in the composer and removes the revision. */
  editAndResend(): void;
  newSession(): void;
  openSession(id: string): void;
  setMode(mode: TurnMode): void;
  setWorkflowSettings(next: WorkflowSettings): void;
  setWorkflowEstimate(next: WorkflowEstimateSettings): void;
  tidyWorkflowView(): void;
  setLanguage(lang: Lang): void;
  setCanvasSize(size: CanvasSize): void;
  unpin(text: string): void;
  undoUnpin(): void;
  setPanelOpen(open: boolean): void;
  setFocusDiagram(on: boolean): void;
  highlight(h: Highlight | null): void;
  panTo(ids: string[]): void;
  hoverCard(id: string | null): void;
  /** Highlights a revision's cards on the canvas and scrolls the record to it. */
  revealRevision(n: number): void;
  clearToast(): void;
  /** The composer or the landing box has taken the draft (Edit and resend, Undo, an ask kept across sign-in). */
  draftTaken(): void;
  endHandoff(): void;
  startReplay(id: string, o?: { speed?: ReplaySpeed }): Promise<boolean>;
  restartReplay(): void;
  exitReplay(): void;
  setReplaySpeed(speed: ReplaySpeed): void;
  /** Cancels timers and requests (unmount). */
  dispose(): void;
}

const SPEEDS: readonly ReplaySpeed[] = ['1x', '4x', 'instant'];

export function createController(store: Store, env: ControllerEnv): Controller {
  let ac: AbortController | null = null;
  let flushTimer: unknown = null;
  let player: Player | null = null;
  let healthAc: AbortController | null = null;
  let accountAc: AbortController | null = null;
  let lastAsk = '';
  let disposed = false;

  const d = (a: Action): void => store.dispatch(a);
  const st = () => store.getState();

  const saveSession = (): void => {
    const s = st().session;
    env.sessions.save(s);
    d({ type: 'sessions/list', sessions: env.sessions.list() });
  };

  const clearFlush = (): void => {
    if (flushTimer !== null) env.clearTimeout(flushTimer);
    flushTimer = null;
  };
  const scheduleFlush = (): void => {
    if (flushTimer !== null) return;
    flushTimer = env.setTimeout(() => {
      flushTimer = null;
      d({ type: 'turn/flush', now: env.now() });
    }, BATCH_MS);
  };

  const onWire = (ev: WireEvent): void => {
    d({ type: 'turn/event', event: ev, now: env.now() });
    if (ev.type === 'op') scheduleFlush();
    if (ev.type === 'commit' || ev.type === 'fatal') clearFlush();
    if (ev.type === 'commit' || ev.type === 'summary') saveSession();
    if (ev.type === 'commit' || ev.type === 'fatal') void refreshAccount();
    if (ev.type === 'fatal') {
      const to = authHandoff(ev.code);
      if (to) leaveForAuth(to, lastAsk);
    }
  };

  /**
   * The hosted Worker ended or refused the session (401 signed-out, or not-approved): send the person to sign in again,
   * to come back to this page, or to the waiting page. The ask goes with the tab so the next boot can put it back.
   */
  function leaveForAuth(to: 'login' | 'pending', ask: string): void {
    if (!env.leave) return;
    const target = to === 'login' ? loginUrl(env.path?.() ?? '/') : '/pending';
    if (ask.trim()) env.keepAsk?.(ask);
    env.leave(target);
  }

  async function loadAccount(): Promise<void> {
    accountAc?.abort();
    const mine = new AbortController();
    accountAc = mine;
    const a = await fetchAccount({ fetchImpl: env.fetchImpl, signal: mine.signal });
    // a failed refresh keeps the last known account: a dropped request must not make the menu vanish
    if (disposed || accountAc !== mine || !a) return;
    d({ type: 'account/set', account: a });
  }
  /** After a turn the day's count has changed. Only where an account was found (the local server has no /api/me). */
  const refreshAccount = async (): Promise<void> => {
    if (st().account) await loadAccount();
  };

  async function checkHealth(): Promise<void> {
    healthAc?.abort();
    healthAc = new AbortController();
    d({ type: 'conn/set', mode: 'checking', health: null, now: env.now() });
    const { health: h, anonymous } = await probeHealth({ fetchImpl: env.fetchImpl, signal: healthAc.signal });
    if (disposed) return;
    // the Worker is up but no longer knows this browser: the session ended while the page was open
    if (anonymous) leaveForAuth('login', lastFailedAsk() ?? '');
    d({ type: 'conn/set', mode: h && h.keyConfigured ? 'live' : 'offline', health: h, now: env.now() });
  }

  function start(ask: string, replaceLast: boolean, mode: TurnMode = st().session.mode ?? 'cloud'): void {
    const text = ask.trim();
    lastAsk = text;
    ac?.abort();
    const mine = new AbortController();
    ac = mine;
    const sessionId = st().session.id;
    const memory = st().session.memory;
    d({ type: 'turn/start', ask: text, now: env.now(), replaceLast, mode });
    const req: TurnRequest = { sessionId, ask: text, memory, mode };
    void postTurn(req, { signal: mine.signal, fetchImpl: env.fetchImpl, onEvent: onWire }).then((end) => {
      if (disposed || ac !== mine) return;
      if (end.kind === 'network') {
        clearFlush();
        d({ type: 'turn/fail', code: 'network', message: '', retryable: true, now: env.now() });
        void checkHealth();
      }
      // commit and fatal were dispatched as events; aborted was dispatched by stop()
    });
  }

  const askLimit = (): number => st().conn.health?.limits.askChars ?? DEFAULT_MAX_ASK_CHARS;

  function submit(ask: string): SubmitResult {
    const s = st();
    const text = ask.trim();
    if (s.replay) return 'read-only';
    if (s.work) return 'busy';
    if (!text) return 'empty';
    if (Array.from(text).length > askLimit()) return 'too-long';
    // On the landing, an unreachable service keeps the text and shows the offline notice. In the working view the
    // request is tried anyway: a drop then becomes the recoverable W11 state with Try again.
    if (s.view === 'landing' && s.conn.mode === 'offline') return 'offline';
    if (s.view === 'landing') d({ type: 'ui/handoff', on: true });
    start(text, false);
    return 'started';
  }

  function stop(): void {
    if (!st().work) return;
    ac?.abort();
    ac = null;
    clearFlush();
    d({ type: 'turn/stop', now: env.now() });
  }

  function lastFailedAsk(): string | null {
    const revs = st().session.revisions;
    const last = revs[revs.length - 1];
    return last && (last.status === 'failed' || last.status === 'stopped') ? last.ask : null;
  }

  async function startReplay(id: string, o: { speed?: ReplaySpeed } = {}): Promise<boolean> {
    const fx = await env.loadFixture(id);
    if (!fx || disposed) return false;
    ac?.abort();
    ac = null;
    clearFlush();
    player?.stop();
    d({ type: 'session/new', id: `replay-${fx.id}`, now: env.now() });
    d({ type: 'replay/set', replay: { fixtureId: fx.id, speed: o.speed ?? st().replay?.speed ?? '1x', turn: 0, playing: true, recordedAt: fx.recordedAt, synthetic: fx.synthetic } });
    player = createPlayer(
      { dispatch: d, setTimeout: (fn, ms) => env.setTimeout(fn, ms), clearTimeout: (h) => env.clearTimeout(h), now: env.now },
      {
        fixture: fx,
        speed: () => st().replay?.speed ?? '1x',
        onTurn: (turn) => {
          const r = st().replay;
          if (r) d({ type: 'replay/set', replay: { ...r, turn, playing: true } });
        },
        onDone: () => {
          const r = st().replay;
          if (r) d({ type: 'replay/set', replay: { ...r, playing: false } });
        },
      },
    );
    player.start(0);
    return true;
  }

  const ctl: Controller = {
    async boot() {
      const q = new URLSearchParams(env.search);
      const lang = q.get('lang');
      if (isLang(lang)) {
        env.setLanguage(lang);
        d({ type: 'lang/set', lang });
      }
      d({ type: 'sessions/list', sessions: env.sessions.list() });
      // ?replay= and ?speed= are test and demo switches: the production build has no recordings to play
      const replay = TOOLS ? q.get('replay') : null;
      // a refresh returns to the session on screen, as saved at its last commit; a new tab starts on the landing
      if (!replay && env.resumeId && env.sessions.get(env.resumeId)) {
        const rec = env.sessions.get(env.resumeId);
        if (rec && rec.revisions.length > 0) d({ type: 'session/open', record: rec, now: env.now() });
      }
      void loadAccount();
      const kept = env.takeAsk?.();
      if (kept && !replay) d({ type: 'ui/draft', text: kept });
      const speed = q.get('speed');
      const sp = SPEEDS.find((x) => x === speed);
      if (replay) {
        // health is still checked, so the header can tell Replay from Offline when the replay is left
        void checkHealth().then(() => undefined);
        await startReplay(replay, { speed: sp });
        return;
      }
      await checkHealth();
    },
    checkHealth,
    loadAccount,
    signOut() {
      const url = st().account?.links.signOut;
      if (url) env.signOut?.(url);
    },
    submit,
    stop,
    retry() {
      const ask = lastFailedAsk();
      if (ask && !st().work) start(ask, true, st().session.revisions.at(-1)?.mode ?? 'cloud');
    },
    editAndResend() {
      const ask = lastFailedAsk();
      if (!ask) return;
      d({ type: 'session/mode', mode: st().session.revisions.at(-1)?.mode ?? 'cloud' });
      d({ type: 'rev/discardFailed' });
      d({ type: 'ui/draft', text: ask });
    },
    newSession() {
      ac?.abort();
      ac = null;
      clearFlush();
      player?.stop();
      if (st().work) d({ type: 'turn/stop', now: env.now() });
      if (!st().replay) saveSession();
      d({ type: 'replay/set', replay: null });
      d({ type: 'session/new', id: env.newId(), now: env.now() });
      const h = st().conn.health;
      d({ type: 'conn/set', mode: h && h.keyConfigured ? 'live' : st().conn.mode === 'checking' ? 'checking' : 'offline', health: h, now: env.now() });
    },
    openSession(id) {
      const rec = env.sessions.get(id);
      if (!rec) return;
      ac?.abort();
      ac = null;
      clearFlush();
      player?.stop();
      if (st().work) d({ type: 'turn/stop', now: env.now() });
      if (!st().replay && st().session.id !== id) saveSession();
      d({ type: 'replay/set', replay: null });
      d({ type: 'session/open', record: rec, now: env.now() });
    },
    setWorkflowSettings(next) {
      if (st().work || st().replay) return;
      d({ type: 'workflow/settings', next, now: env.now() });
      saveSession();
    },
    setWorkflowEstimate(next) {
      if (st().work || st().replay) return;
      d({ type: 'workflow/estimate', next, now: env.now() });
      saveSession();
    },
    tidyWorkflowView() { d({ type: 'workflow/tidy' }); },
    setMode(mode) {
      d({ type: 'session/mode', mode });
      if (!st().replay) saveSession();
    },
    setLanguage(lang) {
      env.setLanguage(lang);
      d({ type: 'lang/set', lang });
    },
    setCanvasSize: (size) => d({ type: 'canvas/size', size }),
    unpin(text) {
      d({ type: 'req/unpin', text, now: env.now() });
      if (!st().replay) saveSession();
    },
    undoUnpin() {
      d({ type: 'req/undo' });
      if (!st().replay) saveSession();
    },
    setPanelOpen: (open) => d({ type: 'ui/panel', open }),
    setFocusDiagram: (on) => d({ type: 'ui/focusDiagram', on }),
    highlight: (h) => d({ type: 'ui/highlight', highlight: h }),
    panTo: (ids) => d({ type: 'ui/panTo', ids }),
    hoverCard: (id) => d({ type: 'ui/hoverCard', id }),
    revealRevision: (n) => d({ type: 'ui/reveal', revision: n }),
    clearToast: () => d({ type: 'ui/toastClear' }),
    draftTaken: () => d({ type: 'ui/draftTaken' }),
    endHandoff: () => d({ type: 'ui/handoff', on: false }),
    startReplay,
    restartReplay() {
      const r = st().replay;
      if (r) void startReplay(r.fixtureId, { speed: r.speed });
    },
    exitReplay() {
      player?.stop();
      player = null;
      d({ type: 'replay/set', replay: null });
      d({ type: 'session/new', id: env.newId(), now: env.now() });
      const h = st().conn.health;
      d({ type: 'conn/set', mode: h && h.keyConfigured ? 'live' : 'offline', health: h, now: env.now() });
    },
    setReplaySpeed: (speed) => d({ type: 'replay/speed', speed }),
    dispose() {
      disposed = true;
      ac?.abort();
      healthAc?.abort();
      accountAc?.abort();
      clearFlush();
      player?.stop();
    },
  };
  return ctl;
}
