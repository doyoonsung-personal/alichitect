// One POST /api/turn, after the request passed every check: runs llm.runTurn, forwards each TurnEvent (with its phase)
// and each status as a ServerEvent, then sends commit with the new memory, or fatal when the turn failed. When the
// history window overflowed, the rolling summary is folded after the commit and sent as a summary event, so the commit
// never waits for it.
import type { Catalog, ServerEvent, SessionMemory, TurnRequest } from '../../../packages/core/src/types.ts';
import { foldSummary, historyOverflows, runTurn } from '../../../packages/core/src/llm.ts';
import type { CacheTracker, ConstraintChecker, RunStatus, RunTurnOptions, TurnEvent, TurnStats } from '../../../packages/core/src/llm.ts';
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
  window?: number;
  fetchImpl?: typeof fetch;
  checkConstraints?: ConstraintChecker;
  /** Extra runTurn options (watchdogs, retries, backoff); tests shorten timeouts here. */
  turnOptions?: Partial<RunTurnOptions>;
}

/** What goes on the wire: a TurnEvent with its phase, or a ServerEvent. */
export type WireEvent = (TurnEvent & { phase: 'main' | 'repair' }) | ServerEvent;

export interface TurnOutcome {
  outcome: 'commit' | 'fatal' | 'aborted';
  lang: Lang;
  fatalCode?: string;
  stats?: TurnStats;
  statuses: Array<{ code: string; phase: string; model?: string; reason?: string; delayMs?: number }>;
  summary?: { folded: boolean; ms: number };
  summaryCostUsd: number;
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

export async function executeTurn(req: TurnRequest, deps: TurnDeps, emit: (e: WireEvent) => void, signal: AbortSignal): Promise<TurnOutcome> {
  const lang = langOf(req.ask);
  const window = deps.window ?? DEFAULT_WINDOW;
  const out: TurnOutcome = { outcome: 'aborted', lang, statuses: [], summaryCostUsd: 0 };
  const onStatus = (s: RunStatus): void => {
    out.statuses.push({ code: s.code, phase: s.phase, model: s.model, reason: s.reason, delayMs: s.delayMs });
    emit({ type: 'status', code: s.code, text: statusMessage(s.code, lang) });
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
    out.outcome = 'fatal';
    out.fatalCode = r.stats.error.code;
    emit({ type: 'fatal', code: r.stats.error.code, message: fatalMessage(r.stats.error.code, lang), retryable: r.stats.error.retryable });
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
