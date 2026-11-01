// One POST /api/turn, after the request passed every check: runs llm.runTurn, forwards each TurnEvent (with its phase)
// and each status as a ServerEvent, then sends commit with the new memory, or fatal when the turn failed. When the
// history window overflowed, the rolling summary is folded after the commit and sent as a summary event, so the commit
// never waits for it. With a backup (the Claude provider of packages/core/src/claude.ts), a turn Model Studio's content
// filter stopped is finished on Claude; its statuses carry provider 'claude' and say so.
import type { Catalog, ServerEvent, SessionMemory, TurnRequest } from '../../../packages/core/src/types.ts';
import { foldSummary, historyOverflows, runTurn } from '../../../packages/core/src/llm.ts';
import type { BackupCall, BackupGateResult, BackupProvider, CacheTracker, ConstraintChecker, RunStatus, RunTurnOptions, TurnEvent, TurnStats } from '../../../packages/core/src/llm.ts';
import { DEFAULT_WINDOW } from '../../../packages/core/src/prompt.ts';
import { fatalMessage, langOf, statusMessage } from './messages.ts';
import type { Lang } from './messages.ts';
import { LIMITS } from './request.ts';

export interface TurnDeps {
  apiKey: string;
  catalog: Catalog;
  system: string;
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
export type WireEvent = (TurnEvent & { phase: 'main' | 'repair' }) | ServerEvent;

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

export async function executeTurn(req: TurnRequest, deps: TurnDeps, emit: (e: WireEvent) => void, signal: AbortSignal): Promise<TurnOutcome> {
  const lang = langOf(req.ask);
  const window = deps.window ?? DEFAULT_WINDOW;
  const out: TurnOutcome = { outcome: 'aborted', lang, statuses: [], summaryCostUsd: 0, backupLog: [] };
  const onStatus = (s: RunStatus): void => {
    out.statuses.push({ code: s.code, phase: s.phase, model: s.model, ...(s.provider ? { provider: s.provider } : {}), reason: s.reason, delayMs: s.delayMs });
    emit({ type: 'status', code: s.code, text: statusMessage(s.code, lang, s.provider), ...(s.provider ? { provider: s.provider } : {}) });
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
    system: deps.system,
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
    summarize: false, // folded below, after the commit
    onEvent: (e) => emit(e),
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
    emit({ type: 'fatal', code: f.code, message: fatalMessage(f.code, lang), retryable: f.retryable });
    return out;
  }
  const memory = trimTurns(r.memory);
  out.outcome = 'commit';
  out.nodes = Object.keys(memory.graph.nodes).length;
  emit({ type: 'commit', memory, changes: r.changes, warnings: r.stats.warningsAfter });
  if (historyOverflows(memory, window) && !signal.aborted) {
    const t0 = Date.now();
    const folded = await foldSummary(memory, window, { apiKey: deps.apiKey, baseUrl: deps.baseUrl, signal, fetchImpl: deps.fetchImpl, onCost, onStatus });
    const changed = !!folded.summary && folded.summary !== memory.summary;
    out.summary = { folded: changed, ms: Date.now() - t0 };
    if (changed && !signal.aborted) emit({ type: 'summary', summary: folded.summary! });
  }
  return out;
}
