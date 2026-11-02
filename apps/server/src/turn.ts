// One POST /api/turn, after the request passed every check: runs llm.runTurn, forwards each TurnEvent (with its phase)
// and each status as a ServerEvent, then sends commit with the new memory, or fatal when the turn failed. When the
// history window overflowed, cloud-only memory folds after commit. Dual documents fold departing exchanges before
// compaction and commit so their summary survives byte-budget eviction. With a backup, a turn Model Studio's content
// filter stopped is finished there. The browser is never told: its status lines are the neutral 'finish' code, no event
// carries a provider or model field, a filter-stop error event is held back and a failed rescue is a neutral fatal. The
// real provider, models and codes stay in TurnOutcome (the log: spend tracking and the caps).
import type { Catalog, ServerEvent, SessionMemory, TurnRequest, TurnMode } from '../../../packages/core/src/types.ts';
import { foldSummary, historyOverflows, runTurn } from '../../../packages/core/src/llm.ts';
import type {
  BackupCall, BackupGateResult, BackupProvider, CacheTracker, ConstraintChecker, RunStatus, RunTurnOptions, TurnEvent as CoreTurnEvent, TurnStats,
} from '../../../packages/core/src/llm.ts';
import type { ModelTable } from '../../../packages/core/src/models.ts';
import { DEFAULT_WINDOW } from '../../../packages/core/src/prompt.ts';
import { fatalMessage, langOf, statusMessage } from './messages.ts';
import type { Lang } from './messages.ts';
import { LIMITS, memoryBytes, TURN_MEMORY_BUDGET } from './request.ts';

export interface TurnDeps {
  apiKey: string;
  catalog: Catalog;
  system: string;
  workflowSystem?: string;
  models?: ModelTable;
  model: string;
  fallbackModel: string | null;
  baseUrl: string;
  tracker: CacheTracker;
  /** Finishes turns Model Studio's content filter stopped (claude.ts createClaudeBackup). Undefined: no backup, behaviour as before. */
  backup?: BackupProvider;
  /** Asked once, right before the backup would run (RunTurnOptions.backupGate): the worker's per-user and global rescue caps. */
  backupGate?: () => Promise<BackupGateResult> | BackupGateResult;
  /** Milliseconds left of the turn deadline (RunTurnOptions.msLeft): no rescue starts with less than a minute. */
  msLeft?: () => number;
  /** Awaited after each backup call with its cost (RunTurnOptions.onBackupCall): the worker books spending here. */
  onBackupCall?: (c: BackupCall) => Promise<void> | void;
  window?: number;
  fetchImpl?: typeof fetch;
  checkConstraints?: ConstraintChecker;
  /** Extra runTurn options (watchdogs, retries, backoff); tests shorten timeouts here. */
  turnOptions?: Partial<RunTurnOptions>;
}

/** What goes on the wire: a TurnEvent with its phase, or a ServerEvent. */
export type WireEvent<M extends TurnMode = 'cloud'> = (CoreTurnEvent<M> & { phase: 'main' | 'repair' }) | ServerEvent;

/** One backup usage or error event, as kept for the log (tokens and codes; never text). */
export type BackupLogEntry =
  | { type: 'usage'; phase: 'main' | 'repair'; promptTokens: number; cachedTokens: number; completionTokens: number; costUsd: number }
  | { type: 'error'; phase: 'main' | 'repair'; code: string };

export interface TurnOutcome {
  outcome: 'commit' | 'fatal' | 'aborted';
  lang: Lang;
  fatalCode?: string;
  stats?: TurnStats;
  statuses: Array<{ code: string; phase: string; model?: string; provider?: string; reason?: string; delayMs?: number }>;
  summary?: { folded: boolean; ms: number };
  summaryCostUsd: number;
  /** What the browser is not sent about the backup's calls (usage and errors), for the log. */
  backupLog: BackupLogEntry[];
  nodes?: number;
  says?: string[];
}

/** Drops the oldest exchanges until the history fits the request limit, so a committed memory is always accepted back. */
export function trimTurns(memory: SessionMemory, max: number = LIMITS.turns): SessionMemory {
  if (memory.turns.length <= max) return memory;
  let turns = memory.turns;
  while (turns.length > max) {
    let i = 1;
    while (i < turns.length && turns[i].role !== 'user') i++;
    turns = turns.slice(i);
  }
  return { ...memory, turns };
}

/** Reserve a maximum next ask (including JSON escapes) and envelope within the 512 KiB transport cap. */
export function compactTurnMemory(memory: SessionMemory, dropTurns = true, budget = TURN_MEMORY_BUDGET): SessionMemory {
  if (!memory.workflow) return memory;
  const bytes = memoryBytes;
  if (bytes(memory) <= budget) return memory;
  let next = { ...memory, turns: memory.turns.map((t) => ({ ...t })) };
  for (const turn of next.turns) {
    delete turn.changes;
    if (bytes(next) <= budget) return next;
  }
  while (dropTurns && next.turns.length && bytes(next) > budget) {
    let end = 1;
    while (end < next.turns.length && next.turns[end].role !== 'user') end++;
    next.turns = next.turns.slice(end);
  }
  for (const key of ['tombstones', 'workflowTombstones'] as const) {
    while (next[key]?.length && bytes(next) > budget) next = { ...next, [key]: next[key]!.slice(1) };
  }
  if (bytes(next) > budget) throw new Error('turn memory budget exhausted');
  return next;
}

/** Plan departures against the full history, reserving the largest possible folded summary. */
function summaryWindow(memory: SessionMemory, window: number): number {
  const planned = compactTurnMemory(trimTurns(memory), true, TURN_MEMORY_BUDGET - 9002);
  const exchanges = planned.turns.filter((t, i) => i === 0 || t.role === 'user').length;
  return Math.min(window, exchanges);
}

function keepExchanges(memory: SessionMemory, window: number): SessionMemory {
  const starts = memory.turns.flatMap((t, i) => i === 0 || t.role === 'user' ? [i] : []);
  const cut = window === 0 ? memory.turns.length : starts[Math.max(0, starts.length - window)];
  return { ...memory, turns: memory.turns.slice(cut) };
}

/** The codes a browser sees for a failed rescue. The log keeps the real ones (fatalOf, TurnOutcome.fatalCode). */
export const WIRE_FATAL: Readonly<Record<string, string>> = { 'backup-limit': 'request-limit', 'backup-failed': 'not-completed' };

/**
 * The fatal a failed turn reports. A turn the content filter stopped keeps the code content-filtered when there was no
 * backup to try; when a backup was configured it says what became of the rescue: backup-limit when a spending cap kept it
 * from starting, backup-failed when it was not started for lack of time or a cap check that failed, or was asked and
 * could not answer. (stats.error stays content-filtered either way, for the log.)
 */
export function fatalOf(stats: TurnStats): { code: string; retryable: boolean } {
  const e = stats.error!;
  if (e.code === 'content-filtered') {
    const skipped = stats.backupSkipped;
    if (skipped) return skipped.reason === 'limit' ? { code: 'backup-limit', retryable: false } : { code: 'backup-failed', retryable: true };
    if (stats.rescue && !stats.rescue.ok) return { code: 'backup-failed', retryable: stats.rescue.error ? stats.rescue.error.retryable : true };
  }
  return { code: e.code, retryable: e.retryable };
}

export async function executeTurn<M extends TurnMode = 'cloud'>(
  req: TurnRequest, deps: TurnDeps, listener: (e: WireEvent<M>) => void, signal: AbortSignal,
): Promise<TurnOutcome> {
  const emit = listener as unknown as (e: WireEvent<TurnMode>) => void;
  const lang = langOf(req.ask);
  const window = deps.window ?? DEFAULT_WINDOW;
  const out: TurnOutcome = { outcome: 'aborted', lang, statuses: [], summaryCostUsd: 0, backupLog: [] };
  const onStatus = (s: RunStatus): void => {
    // The log gets the real status (provider, model, reason). The browser gets a code and a line: the status that starts
    // the second pass is 'finish'; its continuation and repair keep their codes (the browser rebuilds its reducer state
    // on them) but read the same calm line.
    out.statuses.push({ code: s.code, phase: s.phase, model: s.model, ...(s.provider ? { provider: s.provider } : {}), reason: s.reason, delayMs: s.delayMs });
    const code = s.provider && s.code === 'fallback' ? 'finish' : s.code;
    emit({ type: 'status', code, text: statusMessage(s.provider ? 'finish' : s.code, lang) });
  };
  const onCost: RunTurnOptions['onCost'] = (c) => {
    if (c.phase === 'summary') out.summaryCostUsd += c.costUsd;
  };
  const r = await runTurn(req.memory, req.ask, deps.catalog, {
    ...deps.turnOptions,
    apiKey: deps.apiKey,
    baseUrl: deps.baseUrl,
    model: deps.model,
    fallbackModel: deps.fallbackModel,
    mode: req.mode ?? 'cloud',
    models: deps.models,
    system: req.mode === 'workflow' ? deps.workflowSystem : deps.system,
    tracker: deps.tracker,
    backup: deps.backup,
    backupGate: deps.backupGate,
    msLeft: deps.msLeft,
    onBackupCall: deps.onBackupCall,
    onBackupDetail: (e) => {
      if (e.type === 'usage') out.backupLog.push({ type: 'usage', phase: e.phase, promptTokens: e.usage.prompt_tokens ?? 0, cachedTokens: e.usage.prompt_tokens_details?.cached_tokens ?? 0, completionTokens: e.usage.completion_tokens ?? 0, costUsd: Number(e.costUsd.toFixed(6)) });
      else if (e.type === 'error') out.backupLog.push({ type: 'error', phase: e.phase, code: e.error.code });
    },
    window,
    signal,
    fetchImpl: deps.fetchImpl,
    checkConstraints: deps.checkConstraints,
    summarize: false, // folded below, before dual-document compaction or after a cloud-only commit
    onEvent: (e) => {
      // With a backup configured, the content-filter stop of the first pass is not shown: the second pass finishes the
      // answer (or the turn ends with a neutral fatal), and the revision must look like any other.
      if (deps.backup && e.type === 'error' && e.error.code === 'content-filtered') return;
      emit(e);
    },
    onStatus,
    onCost,
  });
  out.stats = r.stats;
  out.says = r.says;
  if (signal.aborted) return out;
  if (r.stats.error && r.memory === req.memory) {
    // A hard failure: no op arrived, or the content filter stopped the turn. The client keeps its memory.
    const f = fatalOf(r.stats);
    out.outcome = 'fatal';
    out.fatalCode = f.code;
    const wire = WIRE_FATAL[f.code] ?? f.code;
    emit({ type: 'fatal', code: wire, message: fatalMessage(wire, lang), retryable: f.retryable });
    return out;
  }
  let memory: SessionMemory;
  if (r.memory.workflow) {
    try {
      const keep = summaryWindow(r.memory, window);
      let retained = r.memory;
      if (historyOverflows(retained, keep)) {
        const t0 = Date.now();
        const folded = await foldSummary(retained, keep, {
          apiKey: deps.apiKey, baseUrl: deps.baseUrl, signal, fetchImpl: deps.fetchImpl, onCost, onStatus, allDeparting: true,
        });
        const success = folded !== retained;
        out.summary = { folded: success, ms: Date.now() - t0 };
        if (success) retained = keepExchanges(folded, keep);
      }
      if (signal.aborted) return out;
      // On summary failure preserve every exchange, or leave the client's previous memory intact with a fatal.
      memory = compactTurnMemory(retained, false);
      if (memory.turns.length > LIMITS.turns) throw new Error('turn memory budget exhausted');
    } catch {
      if (signal.aborted) return out;
      out.outcome = 'fatal';
      out.fatalCode = 'memory-budget';
      emit({ type: 'fatal', code: 'memory-budget', message: 'Conversation memory is full. Shorten the documents or retry.', retryable: true });
      return out;
    }
  } else memory = trimTurns(r.memory);
  out.outcome = 'commit';
  out.nodes = Object.keys(req.mode === 'workflow' ? memory.workflow!.nodes : memory.graph.nodes).length;
  emit({ type: 'commit', memory, changes: r.changes, warnings: r.stats.warningsAfter });
  if (!memory.workflow && historyOverflows(memory, window) && !signal.aborted) {
    const t0 = Date.now();
    const folded = await foldSummary(memory, window, { apiKey: deps.apiKey, baseUrl: deps.baseUrl, signal, fetchImpl: deps.fetchImpl, onCost, onStatus });
    const changed = !!folded.summary && folded.summary !== memory.summary;
    out.summary = { folded: changed, ms: Date.now() - t0 };
    if (changed && !signal.aborted) emit({ type: 'summary', summary: folded.summary! });
  }
  return out;
}
