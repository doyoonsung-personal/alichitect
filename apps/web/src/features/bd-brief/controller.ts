// The BD brief module's own state machine (plan §5): framework-agnostic and unit-testable,
// with its own request state and abort controller. It never touches the main app's busy state,
// turn counters or store — the only bridge inward is the injected `capture` (host-adapter).
//
// STALE-CALLBACK GUARD: every async continuation captures the context it started with
// (sessionId, lang, accountEmail) plus its own call id; when the response arrives, any
// difference — a session switch, a language change, a sign-out, a cancel or a close —
// DISCARDS it without emitting state. One account's or session's response is never displayed
// in another. Generation results for an expectedVersion older than the current accepted
// version are discarded into a version-conflict state; a stale PATCH keeps the local draft.
import type {
  BdBriefApiErrorCode, BriefContent, BriefNote, BriefPayload, BriefRecord, BriefSnapshot,
  ChangeAcceptance, Clock, GenerateHttpResponse, GenerateMode, IdFactory, Lang, ProposedChange,
} from '@ali/bd-brief/types.ts';
import { LIMITS, makeEmptyContent } from '@ali/bd-brief/types.ts';
// pinned package exports (parallel workstream): fingerprint for staleness, reviewed application
// of accepted changes. Deliberately imported, never stubbed here.
import { snapshotFingerprint } from '@ali/bd-brief/evidence.ts';
import { applyChanges } from '@ali/bd-brief/changes.ts';
import type { BdBriefApi, GenerationFailReason } from './api.ts';
import { BdBriefApiError } from './api.ts';

/** Who and where the dialog is acting for; the stale-callback guard compares against it. */
export interface BriefContext {
  sessionId: string;
  lang: Lang;
  accountEmail: string | null;
}

export type BriefPhase =
  | 'idle'
  | 'loading-brief'
  | 'ready'
  | 'generating'
  | 'reviewing-changes'
  | 'saving'
  | 'error'
  | 'version-conflict';

/** The BD's decision on one proposed change; 'accepted' with editedText is an accept-with-edit. */
export interface ChangeDecision {
  decision: 'accepted' | 'rejected';
  editedText: string | null;
}

/** One flat state object per emission; `phase` discriminates what the dialog draws. */
export interface BriefUiState {
  phase: BriefPhase;
  briefId: string | null;
  sourceKey: string | null;
  /** null until a brief exists for this source: the dialog shows the preparation form. */
  payload: BriefPayload | null;
  /** The local working copy of the content; starts empty, becomes the accepted content on load. */
  draft: BriefContent;
  dirty: boolean;
  /** The live source fingerprint differs from brief.snapshotFingerprint (plan §6): show the
   * staleness banner with the explicit Refresh action. Never a background rewrite. */
  staleSource: boolean;
  generating: { mode: GenerateMode; startedAt: number; elapsedMs: number } | null;
  /** Candidate changes under review, shown beside the saved brief. */
  changes: ProposedChange[] | null;
  decisions: Record<string, ChangeDecision>;
  error: { code: BdBriefApiErrorCode; message: string; reason?: GenerationFailReason } | null;
  /** Set on a version conflict; the unsaved local draft is KEPT for reconciliation (plan §7). */
  conflict: { currentVersion: number } | null;
}

export interface BriefControllerDeps {
  api: BdBriefApi;
  clock: Clock;
  /** Optional id source; requestIds fall back to crypto.randomUUID (plan §7 dedup). */
  ids?: IdFactory;
  /** Reads a fresh snapshot of the committed source; the ONLY app-state access (host-adapter). */
  capture: () => BriefSnapshot;
  /** Server-lease poll interval; override only in tests (default POLL_MS). */
  pollMs?: number;
  onState: (s: BriefUiState) => void;
}

export interface BriefController {
  open(ctx: BriefContext): void;
  load(sourceKey?: string): Promise<void>;
  prepare(objective: string | null): Promise<void>;
  generate(mode: 'initial' | 'regenerate'): Promise<void>;
  saveNotes(text: string, meetingDate: string | null, source: string | null): Promise<BriefNote | null>;
  reviewNotes(noteIds: string[]): Promise<void>;
  acceptChange(changeId: string, editedText: string | null): void;
  rejectChange(changeId: string): void;
  commitChanges(): Promise<void>;
  editContent(next: BriefContent): void;
  saveEdits(): Promise<void>;
  refreshFromSource(): Promise<void>;
  /** Deletes the brief, its notes and versions (owner-scoped on the server). */
  remove(): Promise<void>;
  cancel(): void;
  close(): void;
  /** Recomputes the generating elapsed time; the dialog drives it from its own interval. */
  tick(): void;
  /** Observe source changes without replacing any customer-edited content. */
  checkSource(): void;
  getState(): BriefUiState;
}

/** Server-side lease polling interval for a generate that answered 'in-progress'. */
const POLL_MS = 2000;

function initialState(): BriefUiState {
  return {
    phase: 'idle',
    briefId: null,
    sourceKey: null,
    payload: null,
    draft: makeEmptyContent(),
    dirty: false,
    staleSource: false,
    generating: null,
    changes: null,
    decisions: {},
    error: null,
    conflict: null,
  };
}

const copyContent = (c: BriefContent): BriefContent => structuredClone(c);

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

interface Guard {
  sessionId: string;
  lang: Lang;
  accountEmail: string | null;
  callId: string;
}

export function createBriefController(deps: BriefControllerDeps): BriefController {
  let state = initialState();
  let ctx: BriefContext | null = null;
  let ac: AbortController | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  // the callId whose lease poll is still pending: its guard must survive the caller's endCall,
  // or the poll result is discarded and the dialog strands in 'generating' forever
  let pendingPollCallId: string | null = null;
  let callCounter = 0;
  let reqCounter = 0;
  const liveCalls = new Set<string>();

  // requestId reuse (plan §7, worker routes.ts): the server ABORTS the lease on a client
  // disconnect, so a canceled/failed requestId is dead — replaying it answers 409. Reuse is
  // only valid where the body is byte-identical (the in-progress lease poll; a review-notes
  // replay without a re-capture). Anything that re-captures the snapshot mints a NEW id: the
  // payload hash covers capturedAt, so a re-captured body could never hash-match anyway.
  let lastGenerate: { requestId: string; mode: GenerateMode; expectedVersion: number; failed: boolean } | null = null;
  let lastNote: { requestId: string; text: string; failed: boolean } | null = null;
  // the source the current draft refers to; every PATCH sends it back
  let lastSource = { fingerprint: '', revision: 0 };

  const idsFactory: IdFactory = deps.ids ?? {
    next: (prefix) => `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? String(Math.random())).slice(0, 8)}`,
  };

  function newRequestId(): string {
    const rand = deps.ids ? deps.ids.next('r') : globalThis.crypto?.randomUUID?.() ?? String(++reqCounter);
    return `bdb-req-${++reqCounter}-${rand}`;
  }

  function set(patch: Partial<BriefUiState>): void {
    state = { ...state, ...patch };
    deps.onState(state);
  }

  const pollMs = deps.pollMs ?? POLL_MS;

  function clearPoll(): void {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (pendingPollCallId !== null) {
      // the pending poll will never fire: its call can no longer produce an emission either
      liveCalls.delete(pendingPollCallId);
      pendingPollCallId = null;
    }
  }

  /** Starts one module-owned operation: aborts the previous one and returns its guard + signal. */
  function begin(): { g: Guard; signal: AbortSignal } | null {
    if (!ctx) return null;
    ac?.abort();
    clearPoll();
    liveCalls.clear();
    ac = new AbortController();
    const callId = `call-${++callCounter}`;
    liveCalls.add(callId);
    return { g: { sessionId: ctx.sessionId, lang: ctx.lang, accountEmail: ctx.accountEmail, callId }, signal: ac.signal };
  }

  /** True when this continuation's context no longer matches: discard without emitting. */
  function stale(g: Guard): boolean {
    return !ctx
      || ctx.sessionId !== g.sessionId
      || ctx.lang !== g.lang
      || ctx.accountEmail !== g.accountEmail
      || !liveCalls.has(g.callId);
  }

  function endCall(g: Guard): void {
    // while a lease poll for this call is pending the guard stays alive (see pendingPollCallId)
    if (pendingPollCallId === g.callId) return;
    liveCalls.delete(g.callId);
  }

  function fingerprintNow(): string | null {
    try {
      return snapshotFingerprint(deps.capture());
    } catch {
      // a broken capture must not break an otherwise usable brief view
      return null;
    }
  }

  function isStaleAgainst(brief: BriefRecord): boolean {
    if (brief.version === 0 || !brief.snapshotFingerprint) return false;
    const current = fingerprintNow();
    return current !== null && current !== brief.snapshotFingerprint;
  }

  function failWith(g: Guard, err: unknown): void {
    // a cancellation shows its own state (cancel()); an abort is never an error emission
    if (isAbort(err)) {
      endCall(g);
      return;
    }
    // staleness is checked BEFORE the call leaves liveCalls, then the response is discarded
    if (stale(g)) {
      endCall(g);
      return;
    }
    endCall(g);
    if (err instanceof BdBriefApiError) {
      if (err.code === 'version-conflict') {
        // plan §7: the conflict is surfaced and the unsaved edits stay in state for reconciliation
        set({
          phase: 'version-conflict',
          conflict: { currentVersion: err.currentVersion ?? state.payload?.brief.version ?? 0 },
          generating: null,
          error: null,
        });
        return;
      }
      set({ phase: 'error', error: { code: err.code, message: err.message, ...(err.reason ? { reason: err.reason } : {}) }, generating: null });
      return;
    }
    set({ phase: 'error', error: { code: 'internal', message: err instanceof Error ? err.message : String(err) }, generating: null });
  }

  function adoptPayload(payload: BriefPayload): void {
    const brief = payload.brief;
    lastSource = { fingerprint: brief.snapshotFingerprint, revision: brief.sourceRevision };
    set({
      phase: 'ready',
      briefId: brief.id,
      sourceKey: brief.sourceKey,
      payload,
      draft: copyContent(brief.content),
      dirty: false,
      staleSource: isStaleAgainst(brief),
      generating: null,
      changes: null,
      decisions: {},
      error: null,
      conflict: null,
    });
  }

  function pickGenerateRequestId(mode: GenerateMode, expectedVersion: number, allowReuse: boolean): string {
    // allowReuse is true ONLY where the replayed body is byte-identical (review-notes without a
    // re-capture); a failed or canceled lease is dead server-side and is never replayed
    if (allowReuse && lastGenerate && !lastGenerate.failed && lastGenerate.mode === mode && lastGenerate.expectedVersion === expectedVersion) {
      return lastGenerate.requestId;
    }
    return newRequestId();
  }

  async function runGenerate(
    g: Guard,
    signal: AbortSignal,
    mode: GenerateMode,
    expectedVersion: number,
    snapshot: BriefSnapshot | null,
    noteIds: string[] | null,
    reuseRequestId?: string,
  ): Promise<void> {
    const briefId = state.briefId;
    if (!briefId) throw new BdBriefApiError('not-found', 0);
    // the lease poll passes its requestId back in: same id + byte-identical body, so the server
    // lease dedups it and no second paid call happens (plan §7)
    const requestId = reuseRequestId ?? pickGenerateRequestId(mode, expectedVersion, snapshot === null);
    // registered BEFORE the await so the in-progress poll and any error path below can find it
    lastGenerate = { requestId, mode, expectedVersion, failed: false };
    set({
      phase: 'generating',
      generating: { mode, startedAt: deps.clock.now(), elapsedMs: 0 },
      error: null,
      conflict: null,
    });
    let res: GenerateHttpResponse;
    try {
      res = await deps.api.generate(briefId, { requestId, mode, expectedVersion, lang: g.lang, snapshot, noteIds }, { signal });
    } catch (err) {
      // the worker's real failure shape is a THROWN error (504/502/422 generation-failed, 409
      // request-conflict), not { state: 'failed' }: any non-abort error kills this requestId —
      // the lease is failed server-side — so the next attempt must mint a NEW one
      if (!isAbort(err) && lastGenerate?.requestId === requestId) lastGenerate = { ...lastGenerate, failed: true };
      throw err;
    }
    if (stale(g)) return endCall(g);
    if (res.state === 'in-progress') {
      // the server lease is still running: the same requestId polls it (no second paid call)
      clearPoll();
      // keep this call's guard alive across the poll: the outer caller's endCall would otherwise
      // make the poll result stale and strand the dialog in 'generating'
      pendingPollCallId = g.callId;
      pollTimer = setTimeout(() => {
        pollTimer = null;
        pendingPollCallId = null;
        if (stale(g) || !ac) return endCall(g);
        void runGenerate(g, ac.signal, mode, expectedVersion, snapshot, noteIds, requestId)
          .then(() => endCall(g))
          .catch((err: unknown) => failWith(g, err));
      }, pollMs);
      return;
    }
    if (res.state === 'failed') {
      lastGenerate = { requestId, mode, expectedVersion, failed: true };
      set({ phase: 'error', error: { code: 'generation-failed', message: res.reason, reason: res.reason }, generating: null });
      return;
    }
    adoptCandidate(res, snapshot);
  }

  function adoptCandidate(res: Extract<GenerateHttpResponse, { state: 'completed' }>, snapshot: BriefSnapshot | null): void {
    const cand = res.candidate;
    const curVersion = state.payload?.brief.version ?? 0;
    // a candidate generated against an older accepted version can never be shown (plan §5/§7)
    if (cand.baseVersion < curVersion) {
      lastGenerate = null;
      set({ phase: 'version-conflict', conflict: { currentVersion: curVersion }, generating: null });
      return;
    }
    lastGenerate = null;
    if (snapshot) lastSource = { fingerprint: snapshotFingerprint(snapshot), revision: snapshot.sourceRevision };
    // review-notes (snapshot null): the worker synthesizes an EMPTY snapshot server-side, so
    // cand.snapshotFingerprint describes an empty source — adopting it would make every later
    // live capture look stale. The brief's existing fingerprint (already in lastSource) stays.
    if (cand.kind === 'changes' && cand.changes) {
      set({
        phase: 'reviewing-changes',
        changes: cand.changes,
        decisions: {},
        generating: null,
        staleSource: fingerprintNow() !== lastSource.fingerprint,
        dirty: false,
      });
      return;
    }
    if (cand.content) {
      // a content candidate is a DRAFT: the BD reviews/edits it and saves it explicitly (plan §7)
      set({
        phase: 'ready',
        draft: copyContent(cand.content),
        dirty: true,
        generating: null,
        staleSource: fingerprintNow() !== lastSource.fingerprint,
        changes: null,
        decisions: {},
      });
    }
  }

  /** Shared body of generate() and refreshFromSource(): a fresh capture, then the run. */
  async function generateFromSource(mode: 'initial' | 'regenerate'): Promise<void> {
    const b = begin();
    if (!b) return;
    const { g, signal } = b;
    if (!state.payload?.brief) {
      endCall(g);
      set({ phase: 'error', error: { code: 'not-found', message: 'no brief' } });
      return;
    }
    try {
      const snapshot = { ...deps.capture(), capturedAt: deps.clock.now() };
      await runGenerate(g, signal, mode, state.payload.brief.version, snapshot, null);
      endCall(g);
    } catch (err) {
      failWith(g, err);
    }
  }

  async function patch(origin: 'edit' | 'notes-review' | 'initial', content: BriefContent, acceptances: ChangeAcceptance[] | null, g: Guard, signal: AbortSignal): Promise<void> {
    const brief = state.payload?.brief;
    if (!brief) throw new BdBriefApiError('not-found', 0);
    set({ phase: 'saving', error: null });
    const res = await deps.api.patchBrief(brief.id, {
      expectedVersion: brief.version,
      content,
      origin,
      acceptances,
      snapshotFingerprint: lastSource.fingerprint,
      sourceRevision: lastSource.revision,
    }, { signal });
    if (stale(g)) return endCall(g);
    const payload = state.payload ? { ...state.payload, brief: res.brief } : null;
    lastSource = { fingerprint: res.brief.snapshotFingerprint, revision: res.brief.sourceRevision };
    set({
      phase: 'ready',
      payload,
      briefId: res.brief.id,
      draft: copyContent(res.brief.content),
      dirty: false,
      changes: null,
      decisions: {},
      staleSource: isStaleAgainst(res.brief),
      conflict: null,
    });
  }

  return {
    open(next: BriefContext): void {
      const switched = ctx !== null && (ctx.sessionId !== next.sessionId || ctx.accountEmail !== next.accountEmail);
      ctx = next;
      if (switched) {
        // another session/account never sees the previous one's data (plan §5)
        ac?.abort();
        clearPoll();
        liveCalls.clear();
        lastGenerate = null;
        lastNote = null;
        lastSource = { fingerprint: '', revision: 0 };
        state = initialState();
      }
      set({});
    },

    async load(sourceKey?: string): Promise<void> {
      const b = begin();
      if (!b) return;
      const { g, signal } = b;
      const key = sourceKey ?? g.sessionId;
      set({ phase: 'loading-brief', sourceKey: key, error: null, conflict: null });
      try {
        const list = await deps.api.listBriefs(key, { signal }, deps.capture().sourceKind);
        if (stale(g)) return endCall(g);
        if (!list.brief) {
          lastSource = { fingerprint: '', revision: 0 };
          set({ phase: 'ready', briefId: null, payload: null, draft: makeEmptyContent(), dirty: false, staleSource: false, changes: null, decisions: {}, generating: null });
          return endCall(g);
        }
        const full = await deps.api.getBrief(list.brief.id, { signal });
        if (stale(g)) return endCall(g);
        adoptPayload(full);
        endCall(g);
      } catch (err) {
        failWith(g, err);
      }
    },

    async prepare(objective: string | null): Promise<void> {
      const b = begin();
      if (!b) return;
      const { g, signal } = b;
      const obj = objective && objective.trim() ? objective.trim().slice(0, LIMITS.objectiveChars) : null;
      let snapshot: BriefSnapshot;
      try {
        // capture reads the committed session; objective and capturedAt are overlaid here so the
        // snapshot the server stores matches what the BD asked for at this moment
        snapshot = { ...deps.capture(), objective: obj, capturedAt: deps.clock.now() };
      } catch (err) {
        failWith(g, err);
        return;
      }
      try {
        let brief = state.payload?.brief ?? null;
        if (!brief) {
          set({ phase: 'saving', sourceKey: snapshot.sourceKey, error: null, conflict: null });
          const created = await deps.api.createBrief({ sourceKey: snapshot.sourceKey, lang: g.lang, snapshot }, { signal });
          if (stale(g)) return endCall(g);
          brief = created.brief;
          lastSource = { fingerprint: snapshotFingerprint(snapshot), revision: snapshot.sourceRevision };
          set({
            briefId: brief.id,
            sourceKey: brief.sourceKey,
            payload: { brief, versions: [], notes: [] },
            draft: copyContent(brief.content),
            dirty: false,
            staleSource: false,
          });
        }
        await runGenerate(g, signal, 'initial', brief.version, snapshot, null);
        endCall(g);
      } catch (err) {
        failWith(g, err);
      }
    },

    async generate(mode: 'initial' | 'regenerate'): Promise<void> {
      await generateFromSource(mode);
    },

    async saveNotes(text: string, meetingDate: string | null, source: string | null): Promise<BriefNote | null> {
      const b = begin();
      if (!b) return null;
      const { g, signal } = b;
      const brief = state.payload?.brief;
      const body = {
        text: text.slice(0, LIMITS.noteChars),
        meetingDate: meetingDate && meetingDate.trim() ? meetingDate.trim() : null,
        source: source && source.trim() ? source.trim() : null,
      };
      if (!brief || !body.text.trim()) {
        endCall(g);
        return null;
      }
      // an interrupted identical submission reuses its requestId: the server dedups the replay
      const requestId = lastNote && !lastNote.failed && lastNote.text === body.text ? lastNote.requestId : newRequestId();
      lastNote = { requestId, text: body.text, failed: false };
      set({ phase: 'saving', error: null });
      try {
        const res = await deps.api.addNote(brief.id, { requestId, ...body }, { signal });
        if (stale(g)) {
          endCall(g);
          return null;
        }
        lastNote = null;
        const notes = state.payload ? [...state.payload.notes] : [];
        if (!notes.some((n) => n.id === res.note.id)) notes.push(res.note);
        set({ phase: 'ready', payload: state.payload ? { ...state.payload, notes } : null });
        endCall(g);
        return res.note;
      } catch (err) {
        if (!isAbort(err)) lastNote = { requestId, text: body.text, failed: true };
        failWith(g, err);
        return null;
      }
    },

    async reviewNotes(noteIds: string[]): Promise<void> {
      const b = begin();
      if (!b) return;
      const { g, signal } = b;
      const brief = state.payload?.brief;
      if (!brief || noteIds.length === 0) {
        endCall(g);
        return;
      }
      try {
        await runGenerate(g, signal, 'review-notes', brief.version, null, noteIds.slice(0, LIMITS.notesPerGenerate));
        endCall(g);
      } catch (err) {
        failWith(g, err);
      }
    },

    acceptChange(changeId: string, editedText: string | null): void {
      set({ decisions: { ...state.decisions, [changeId]: { decision: 'accepted', editedText } } });
    },

    rejectChange(changeId: string): void {
      set({ decisions: { ...state.decisions, [changeId]: { decision: 'rejected', editedText: null } } });
    },

    async commitChanges(): Promise<void> {
      const b = begin();
      if (!b) return;
      const { g, signal } = b;
      const brief = state.payload?.brief;
      const changes = state.changes;
      if (!brief || !changes) {
        endCall(g);
        return;
      }
      const decisions = state.decisions;
      const acceptances: ChangeAcceptance[] = changes
        .filter((c) => decisions[c.id])
        .map((c) => ({ changeId: c.id, decision: decisions[c.id].decision, editedText: decisions[c.id].editedText }));
      // the reviewed application itself is the package's pure logic: accepted edits are applied,
      // rejected and undecided changes leave the saved content untouched
      const applied = applyChanges(state.draft, changes, acceptances, { ids: idsFactory, clock: deps.clock });
      try {
        await patch('notes-review', applied.content, acceptances, g, signal);
        endCall(g);
      } catch (err) {
        failWith(g, err);
      }
    },

    editContent(next: BriefContent): void {
      // a local-only edit also lifts a transient error/conflict back to the working view;
      // 'version-conflict' keeps the draft either way — this is the "keep my edits" path
      set({ draft: next, dirty: true, phase: state.phase === 'error' || state.phase === 'version-conflict' ? 'ready' : state.phase });
    },

    async saveEdits(): Promise<void> {
      const b = begin();
      if (!b) return;
      const { g, signal } = b;
      try {
        await patch('edit', state.draft, null, g, signal);
        endCall(g);
      } catch (err) {
        failWith(g, err);
      }
    },

    async refreshFromSource(): Promise<void> {
      // explicit staleness refresh (plan §6): regenerate against the NEW source, producing
      // reviewable changes — never a background rewrite of the accepted brief
      await generateFromSource('regenerate');
    },

    async remove(): Promise<void> {
      const b = begin();
      if (!b) return;
      const { g, signal } = b;
      const brief = state.payload?.brief;
      if (!brief) {
        endCall(g);
        return;
      }
      set({ phase: 'saving', error: null });
      try {
        await deps.api.deleteBrief(brief.id, { signal });
        if (stale(g)) return endCall(g);
        lastSource = { fingerprint: '', revision: 0 };
        lastGenerate = null;
        lastNote = null;
        set({ ...initialState(), phase: 'ready', sourceKey: brief.sourceKey });
        endCall(g);
      } catch (err) {
        failWith(g, err);
      }
    },

    cancel(): void {
      clearPoll();
      liveCalls.clear();
      ac?.abort();
      ac = null;
      // the disconnect aborts the generation server-side and books the lease as failed
      // (worker routes.ts): the requestId is dead, so the next attempt mints a NEW one
      if (lastGenerate) lastGenerate = { ...lastGenerate, failed: true };
      // a user-initiated cancel is NOT an error state: the retry stays clean (no error emission)
      set({
        phase: state.payload || state.briefId ? 'ready' : 'idle',
        generating: null,
        error: null,
      });
    },

    close(): void {
      clearPoll();
      liveCalls.clear();
      ac?.abort();
      ac = null;
      ctx = null;
      lastGenerate = null;
      lastNote = null;
      lastSource = { fingerprint: '', revision: 0 };
      state = initialState();
      deps.onState(state);
    },

    tick(): void {
      const gen = state.generating;
      if (!gen) return;
      set({ generating: { ...gen, elapsedMs: Math.max(0, deps.clock.now() - gen.startedAt) } });
    },

    checkSource(): void {
      if (!ctx || !lastSource.fingerprint || !state.payload) return;
      const current = fingerprintNow();
      if (current !== null && state.staleSource !== (current !== lastSource.fingerprint)) set({ staleSource: current !== lastSource.fingerprint });
    },

    getState(): BriefUiState {
      return state;
    },
  };
}
