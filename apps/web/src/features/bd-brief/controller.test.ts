// The controller's state machine against a fake api/clock/ids (plan §5/§7): the prepare flow,
// the stale-callback guard, cancellation, version conflicts keeping the local draft, requestId
// dedup semantics, and commitChanges routing acceptances through the package's applyChanges.
// applyChanges/evidence come from the parallel package workstream: imported, never stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  BriefNote, BriefRecord, BriefSummary, GenerateHttpRequest, GenerateHttpResponse,
  PatchBriefRequest, ProposedChange,
} from '@ali/bd-brief/types.ts';
import { emptyBriefRecord, sampleBriefRecord, sampleContent, thinSnapshot } from '@ali/bd-brief/fixtures.ts';
import { snapshotFingerprint } from '@ali/bd-brief/evidence.ts';
import { applyChanges } from '@ali/bd-brief/changes.ts';
import type { BdBriefApi } from './api.ts';
import { BdBriefApiError } from './api.ts';
import type { BriefContext, BriefUiState } from './controller.ts';
import { createBriefController } from './controller.ts';

const CTX: BriefContext = { sessionId: 'sess-thin-001', lang: 'en', accountEmail: 'bd@example.com' };

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const summaryOf = (r: BriefRecord): BriefSummary => ({
  id: r.id, sourceKind: r.sourceKind, sourceKey: r.sourceKey, version: r.version,
  lang: r.lang, snapshotFingerprint: r.snapshotFingerprint, updatedAt: r.updatedAt,
});

const completedContent = (expectedVersion: number): GenerateHttpResponse => ({
  state: 'completed',
  candidate: { kind: 'content', baseVersion: expectedVersion, snapshotFingerprint: 'fp-cand', content: sampleContent(), changes: null },
  usage: null,
});

interface Harness {
  api: BdBriefApi;
  states: BriefUiState[];
  last: () => BriefUiState;
  generateCalls: GenerateHttpRequest[];
  patchCalls: PatchBriefRequest[];
  signals: Array<AbortSignal | undefined>;
  controller: ReturnType<typeof createBriefController>;
}

function setup(over: Partial<BdBriefApi> = {}, withBrief = false, savedOver: Partial<BriefRecord> = {}, capture = () => thinSnapshot()): Harness {
  const generateCalls: GenerateHttpRequest[] = [];
  const patchCalls: PatchBriefRequest[] = [];
  const signals: Array<AbortSignal | undefined> = [];
  const saved = sampleBriefRecord(savedOver);
  const base: BdBriefApi = {
    listBriefs: async () => ({ brief: withBrief ? summaryOf(saved) : null }),
    createBrief: async () => ({ brief: emptyBriefRecord({ id: 'brief-new-1' }) }),
    getBrief: async () => ({ brief: saved, versions: [], notes: [] }),
    patchBrief: async (_id, body) => {
      patchCalls.push(body);
      return { brief: { ...saved, version: body.expectedVersion + 1, content: body.content, snapshotFingerprint: body.snapshotFingerprint } };
    },
    addNote: async (id, body) => {
      const note: BriefNote = {
        id: `note-${body.requestId}`, briefId: id, requestId: body.requestId, text: body.text,
        meetingDate: body.meetingDate, source: body.source, savedAt: 0,
      };
      return { note, deduplicated: false };
    },
    generate: async (_id, body, o) => {
      generateCalls.push(body);
      signals.push(o?.signal);
      return completedContent(body.expectedVersion);
    },
    deleteBrief: async () => {},
  };
  const api: BdBriefApi = { ...base, ...over };
  const states: BriefUiState[] = [];
  let t = 1_000;
  const controller = createBriefController({
    api,
    clock: { now: () => t },
    // short lease-poll interval: the in-progress test never waits the production 2s
    pollMs: 5,
    // constant suffix: requestIds stay unique through the controller's own counter, and a
    // re-run of applyChanges in a test produces the identical id sequence
    ids: { next: (prefix) => `${prefix}-x` },
    capture,
    onState: (s) => states.push(s),
  });
  return { api, states, last: () => states[states.length - 1], generateCalls, patchCalls, signals, controller };
}

const change = (id: string, over: Partial<ProposedChange> = {}): ProposedChange => ({
  id, kind: 'new-fact', section: 'opportunity', targetId: null,
  proposedText: 'The CFO already signed off on the cloud budget.', sourceIds: ['note-1'], conflict: null,
  ...over,
});

test('prepare: creates the container from a bounded snapshot, then generates mode initial with a fresh requestId', async () => {
  const h = setup();
  h.controller.open(CTX);
  await h.controller.load();
  assert.equal(h.last().phase, 'ready');
  assert.equal(h.last().payload, null); // no brief yet: the dialog shows the preparation form

  await h.controller.prepare('  Understand whether the migration is worth a PoC  ');
  const gen = h.generateCalls[0];
  assert.ok(gen);
  assert.equal(gen.mode, 'initial');
  assert.equal(gen.expectedVersion, 0);
  assert.match(gen.requestId, /^bdb-req-\d+-r-x$/);
  assert.ok(gen.snapshot);
  // the objective the BD typed rides on the captured snapshot, trimmed and bounded
  assert.equal(gen.snapshot.objective, 'Understand whether the migration is worth a PoC');
  assert.equal(gen.snapshot.sourceKey, 'sess-thin-001');

  const s = h.last();
  assert.equal(s.phase, 'ready');
  assert.equal(s.briefId, 'brief-new-1');
  assert.equal(s.dirty, true); // the candidate is a draft, not an accepted version (plan §7)
  assert.equal(s.draft.opportunity.text, sampleContent().opportunity.text);
});

test('stale-callback guard: a session switch mid-flight discards the generation without emitting', async () => {
  const d = deferred<GenerateHttpResponse>();
  const h = setup({ generate: async (_id, body, o) => { h.generateCalls.push(body); h.signals.push(o?.signal); return d.promise; } });
  h.controller.open(CTX);
  const p = h.controller.prepare(null);
  await flush(); // createBrief resolved; generate is in flight
  const before = h.states.length;

  h.controller.open({ ...CTX, sessionId: 'sess-other' }); // the user switched conversations
  d.resolve(completedContent(0));
  await p;

  // nothing after the switch may carry the old session's generated content (plan §5)
  assert.ok(h.states.length > before, 'open() itself re-emits');
  for (const s of h.states.slice(before)) {
    assert.notEqual(s.draft.opportunity.text, sampleContent().opportunity.text);
  }
  assert.equal(h.last().payload, null);
});

test('cancel aborts the in-flight fetch and a late response is discarded', async () => {
  const d = deferred<GenerateHttpResponse>();
  const h = setup({ generate: async (_id, body, o) => { h.generateCalls.push(body); h.signals.push(o?.signal); return d.promise; } });
  h.controller.open(CTX);
  const p = h.controller.prepare(null);
  await flush();
  const signal = h.signals.at(-1);
  assert.ok(signal && !signal.aborted);

  h.controller.cancel();
  assert.equal(signal.aborted, true);
  assert.equal(h.last().phase, 'ready'); // the created container survives; only the run is gone
  assert.equal(h.last().generating, null);

  d.resolve(completedContent(0));
  await p;
  assert.equal(h.last().draft.opportunity.text, ''); // discarded: liveCalls no longer holds the call
});

test('a superseded call in the same context cannot overwrite the newer operation', async () => {
  const late = deferred<GenerateHttpResponse>();
  const h = setup({ generate: async () => late.promise });
  h.controller.open(CTX);
  const pending = h.controller.prepare(null);
  await flush();
  await h.controller.load();
  assert.equal(h.last().payload, null);
  late.resolve(completedContent(0));
  await pending;
  assert.equal(h.last().payload, null);
  assert.equal(h.last().dirty, false);
  assert.equal(h.last().draft.opportunity.text, '');
});

test('live source changes mark the brief stale without rewriting edited content', async () => {
  let source = thinSnapshot();
  const h = setup({}, true, { snapshotFingerprint: snapshotFingerprint(source) }, () => source);
  h.controller.open(CTX);
  await h.controller.load();
  h.controller.editContent({ ...h.last().draft, opportunity: { ...h.last().draft.opportunity, text: 'Customer-edited statement' } });
  source = { ...source, sourceRevision: source.sourceRevision + 1 };
  h.controller.checkSource();
  assert.equal(h.last().staleSource, true);
  assert.equal(h.last().dirty, true);
  assert.equal(h.last().draft.opportunity.text, 'Customer-edited statement');
  assert.equal(h.generateCalls.length, 0);
});

test('version conflict on save: the notice carries currentVersion and the unsaved draft is KEPT', async () => {
  const h = setup({
    patchBrief: async () => {
      throw new BdBriefApiError('version-conflict', 409, 'saved elsewhere', 7);
    },
  }, true);
  h.controller.open(CTX);
  await h.controller.load();
  assert.equal(h.last().payload?.brief.version, 2);

  const mine = { ...sampleContent(), opportunity: { ...sampleContent().opportunity, text: 'my own words' } };
  h.controller.editContent(mine);
  assert.equal(h.last().dirty, true);

  await h.controller.saveEdits();
  const s = h.last();
  assert.equal(s.phase, 'version-conflict');
  assert.equal(s.conflict?.currentVersion, 7);
  assert.equal(s.draft.opportunity.text, 'my own words'); // plan §7: edits survive for reconciliation
  assert.equal(s.dirty, true);
});

test('a generation candidate based on an older version is discarded into version-conflict', async () => {
  const h = setup({
    generate: async (_id, body) => {
      h.generateCalls.push(body);
      return { state: 'completed', candidate: { kind: 'content', baseVersion: body.expectedVersion - 1, snapshotFingerprint: 'fp', content: sampleContent(), changes: null }, usage: null };
    },
  }, true);
  h.controller.open(CTX);
  await h.controller.load();
  await h.controller.generate('regenerate');
  const s = h.last();
  assert.equal(s.phase, 'version-conflict');
  assert.equal(s.conflict?.currentVersion, 2);
});

test('retry after a FAILED generation uses a NEW requestId (worker failure shape: thrown 504 generation-failed)', async () => {
  let calls = 0;
  const h = setup({
    generate: async (_id, body) => {
      h.generateCalls.push(body);
      calls++;
      // the worker's REAL failure shape (routes.ts): HTTP 504/502/422 with
      // { error:'generation-failed', reason } — never { state:'failed' }
      if (calls === 1) throw new BdBriefApiError('generation-failed', 504, undefined, undefined, 'timeout');
      return completedContent(body.expectedVersion);
    },
  });
  h.controller.open(CTX);
  await h.controller.prepare(null);
  assert.equal(h.last().phase, 'error');
  assert.equal(h.last().error?.code, 'generation-failed');
  assert.equal(h.last().error?.reason, 'timeout');

  await h.controller.generate('initial');
  assert.equal(h.generateCalls.length, 2);
  const [first, second] = h.generateCalls;
  assert.notEqual(first.requestId, second.requestId); // no hidden repeated paid call under one claim
  assert.equal(h.last().phase, 'ready');
});

test('after a CANCEL the retry uses a NEW requestId (the disconnect killed the lease server-side)', async () => {
  const d = deferred<GenerateHttpResponse>();
  let calls = 0;
  const h = setup({
    generate: async (_id, body, o) => {
      h.generateCalls.push(body);
      h.signals.push(o?.signal);
      calls++;
      return calls === 1 ? d.promise : completedContent(body.expectedVersion);
    },
  });
  h.controller.open(CTX);
  const p = h.controller.prepare(null);
  await flush();
  h.controller.cancel();
  d.reject(new DOMException('aborted', 'AbortError'));
  await p;
  // a user-initiated cancel is not an error state: the retry path stays clean
  assert.equal(h.last().phase, 'ready');
  assert.equal(h.last().error, null);

  await h.controller.generate('initial');
  assert.equal(h.generateCalls.length, 2);
  // the retry re-captures the snapshot (fresh capturedAt) and the old lease is failed: NEW id
  assert.notEqual(h.generateCalls[0].requestId, h.generateCalls[1].requestId);
  assert.equal(h.last().draft.opportunity.text, sampleContent().opportunity.text);
});

test('a 409 request-conflict poisons the requestId: the next attempt mints a NEW one (no lockout loop)', async () => {
  let calls = 0;
  const h = setup({
    generate: async (_id, body) => {
      h.generateCalls.push(body);
      calls++;
      // the worker's replay-of-a-failed-lease answer (routes.ts)
      if (calls === 1) throw new BdBriefApiError('request-conflict', 409, 'a failed generation cannot be retried with the same requestId; use a new requestId');
      return completedContent(body.expectedVersion);
    },
  });
  h.controller.open(CTX);
  await h.controller.prepare(null);
  assert.equal(h.last().phase, 'error');
  assert.equal(h.last().error?.code, 'request-conflict');

  await h.controller.generate('initial');
  assert.equal(h.generateCalls.length, 2);
  assert.notEqual(h.generateCalls[0].requestId, h.generateCalls[1].requestId);
  assert.equal(h.last().phase, 'ready'); // retried cleanly, not re-poisoned
});

test('an in-progress lease is polled with the SAME requestId and byte-identical body and reaches completed', async () => {
  let calls = 0;
  const h = setup({
    generate: async (_id, body) => {
      h.generateCalls.push(body);
      calls++;
      return calls === 1 ? { state: 'in-progress' } : completedContent(body.expectedVersion);
    },
  });
  h.controller.open(CTX);
  await h.controller.prepare(null);
  // prepare() resolves while the lease poll is still pending; the guard must survive that
  assert.equal(h.last().phase, 'generating');
  await new Promise((r) => setTimeout(r, 50)); // pollMs is 5 in the harness

  assert.equal(h.generateCalls.length, 2);
  assert.equal(h.generateCalls[0].requestId, h.generateCalls[1].requestId); // same lease, no second paid call
  assert.deepEqual(h.generateCalls[1], h.generateCalls[0]); // byte-identical body: the server dedups the replay
  assert.equal(h.last().phase, 'ready'); // the poll result is NOT discarded as stale
  assert.equal(h.last().draft.opportunity.text, sampleContent().opportunity.text);
});

test('stale-callback guard: a generation resolving after a LANGUAGE switch is discarded', async () => {
  const d = deferred<GenerateHttpResponse>();
  const h = setup({ generate: async (_id, body, o) => { h.generateCalls.push(body); h.signals.push(o?.signal); return d.promise; } });
  h.controller.open(CTX);
  const p = h.controller.prepare(null);
  await flush(); // createBrief resolved; generate is in flight
  const before = h.states.length;

  h.controller.open({ ...CTX, lang: 'ko' }); // same session/account: no reset, but the guard's lang differs
  d.resolve(completedContent(0));
  await p;

  assert.ok(h.states.length > before, 'open() itself re-emits');
  for (const s of h.states.slice(before)) {
    assert.notEqual(s.draft.opportunity.text, sampleContent().opportunity.text);
  }
  assert.equal(h.last().draft.opportunity.text, '');
});

test('stale-callback guard: a generation resolving after an ACCOUNT switch is discarded and nothing is saved', async () => {
  const d = deferred<GenerateHttpResponse>();
  const h = setup({ generate: async (_id, body, o) => { h.generateCalls.push(body); h.signals.push(o?.signal); return d.promise; } });
  h.controller.open(CTX);
  const p = h.controller.prepare(null);
  await flush();
  const before = h.states.length;

  h.controller.open({ ...CTX, accountEmail: 'other-bd@example.com' }); // sign-out/switch: full reset
  d.resolve(completedContent(0));
  await p;

  for (const s of h.states.slice(before)) {
    assert.notEqual(s.draft.opportunity.text, sampleContent().opportunity.text);
  }
  assert.equal(h.last().payload, null);
  assert.equal(h.last().draft.opportunity.text, '');
  assert.equal(h.patchCalls.length, 0); // nothing from the old account's run is ever saved
});

test('notes review: reviewNotes proposes changes beside the saved brief; commitChanges applies acceptances through applyChanges and PATCHes origin notes-review', async () => {
  const changes: ProposedChange[] = [
    change('ch-1'),
    change('ch-2', { kind: 'conflict', conflict: { existingText: 'The CFO wants the run-rate first.', existingSourceIds: ['st-2'] } }),
  ];
  // the saved brief's fingerprint MATCHES the live capture: any staleness after the commit can
  // only come from the controller adopting the candidate's empty-snapshot fingerprint (M1)
  const originalFp = snapshotFingerprint(thinSnapshot());
  const h = setup({
    generate: async (_id, body) => {
      h.generateCalls.push(body);
      return { state: 'completed', candidate: { kind: 'changes', baseVersion: body.expectedVersion, snapshotFingerprint: 'fp-notes', content: null, changes }, usage: null };
    },
  }, true, { snapshotFingerprint: originalFp, sourceKey: 'sess-thin-001', sourceRevision: 2 });
  h.controller.open(CTX);
  await h.controller.load();
  assert.equal(h.last().staleSource, false);
  const draftBefore = h.last().draft;

  await h.controller.reviewNotes(['note-1']);
  assert.equal(h.last().phase, 'reviewing-changes');
  assert.deepEqual(h.last().changes?.map((c) => c.id), ['ch-1', 'ch-2']);
  assert.equal(h.generateCalls[0].mode, 'review-notes');
  assert.deepEqual(h.generateCalls[0].noteIds, ['note-1']);

  h.controller.acceptChange('ch-1', 'BD edited the wording');
  h.controller.rejectChange('ch-2');
  assert.deepEqual(h.last().decisions['ch-1'], { decision: 'accepted', editedText: 'BD edited the wording' });

  await h.controller.commitChanges();
  const acceptances = [
    { changeId: 'ch-1', decision: 'accepted' as const, editedText: 'BD edited the wording' },
    { changeId: 'ch-2', decision: 'rejected' as const, editedText: null },
  ];
  const expected = applyChanges(draftBefore, changes, acceptances, { ids: { next: (p) => `${p}-x` }, clock: { now: () => 1_000 } });
  assert.equal(h.patchCalls.length, 1);
  assert.equal(h.patchCalls[0].origin, 'notes-review');
  assert.equal(h.patchCalls[0].expectedVersion, 2);
  assert.deepEqual(h.patchCalls[0].acceptances, acceptances);
  assert.deepEqual(h.patchCalls[0].content, expected.content);
  // M1: the PATCH carries the brief's ORIGINAL fingerprint — the candidate's 'fp-notes'
  // describes the worker's synthesized EMPTY review snapshot and must never reach lastSource
  assert.equal(h.patchCalls[0].snapshotFingerprint, originalFp);
  assert.notEqual(h.patchCalls[0].snapshotFingerprint, 'fp-notes');
  const s = h.last();
  assert.equal(s.phase, 'ready');
  assert.equal(s.dirty, false);
  assert.equal(s.changes, null);
  assert.equal(s.payload?.brief.version, 3);
  assert.equal(s.staleSource, false); // committing a notes review never poisons staleness
});

test('saveNotes dedups an interrupted identical submission under the same requestId', async () => {
  const noteRequests: string[] = [];
  const d = deferred<{ note: BriefNote; deduplicated: boolean }>();
  let calls = 0;
  const h = setup({
    addNote: async (id, body) => {
      noteRequests.push(body.requestId);
      calls++;
      if (calls === 1) {
        void id;
        return d.promise;
      }
      return { note: { id: 'n1', briefId: id, requestId: body.requestId, text: body.text, meetingDate: body.meetingDate, source: body.source, savedAt: 0 }, deduplicated: false };
    },
  }, true);
  h.controller.open(CTX);
  await h.controller.load();

  const p = h.controller.saveNotes('they confirmed the pipeline requirement', '2026-11-03', null);
  await flush();
  h.controller.cancel();
  d.reject(new DOMException('aborted', 'AbortError'));
  assert.equal(await p, null);

  const note = await h.controller.saveNotes('they confirmed the pipeline requirement', '2026-11-03', null);
  assert.ok(note);
  assert.equal(noteRequests.length, 2);
  assert.equal(noteRequests[0], noteRequests[1]); // same text, interrupted: the server dedups the replay
  assert.ok(h.last().payload?.notes.some((x) => x.id === 'n1'));
});

test('load staleness: a live source fingerprint different from the brief marks staleSource for the explicit refresh', async () => {
  const h = setup({}, true);
  h.controller.open(CTX);
  await h.controller.load();
  // sampleBriefRecord carries 'fp-fixture-0001', which cannot match a real thinSnapshot fingerprint
  assert.equal(h.last().staleSource, true);
  assert.equal(h.last().phase, 'ready');
});

test('close resets everything and in-flight work can no longer emit', async () => {
  const d = deferred<GenerateHttpResponse>();
  const h = setup({ generate: async () => d.promise });
  h.controller.open(CTX);
  const p = h.controller.prepare(null);
  await flush();
  h.controller.close();
  d.resolve(completedContent(0));
  await p;
  assert.equal(h.last().phase, 'idle');
  assert.equal(h.last().payload, null);
  assert.equal(h.last().draft.opportunity.text, '');
});
