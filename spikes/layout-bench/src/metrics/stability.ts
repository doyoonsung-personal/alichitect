// Stability: which cards moved between two consecutive frames, and why. The classification reuses core layout.ts:
// layoutDiff (moved means more than 0.5 px) and unrelatedMoves/blockOf (a bystander: its block saw no entry, exit or
// block change, and it kept its slot). The rest are same-block moves (a sibling inserted or removed) or re-slotted
// cards (repair or the layout moved the card to another slot).
import { layoutDiff, unrelatedMoves } from '../../../../packages/core/src/layout.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { histogram, round, summary } from '../stats.ts';
import type { Summary } from '../stats.ts';

export type MoveClass = 'unrelated' | 'same-block' | 'reslotted';

export interface Move {
  id: string;
  px: number;
  cls: MoveClass;
}

export interface BatchMoves {
  moved: Move[];
  entered: number;
  exited: number;
}

export function classifyMoves(prev: LayoutState, next: LayoutState): BatchMoves {
  const d = layoutDiff(prev, next);
  const unrelated = new Set(unrelatedMoves(prev, next, d.moved));
  const moved: Move[] = d.moved.map((id) => {
    const cls: MoveClass = unrelated.has(id) ? 'unrelated' : prev.cards[id].slot !== next.cards[id].slot ? 'reslotted' : 'same-block';
    return { id, px: d.displacement[id] ?? 0, cls };
  });
  return { moved, entered: d.entered.length, exited: d.exited.length };
}

export interface StabilityRecord {
  session: string;
  case: string;
  turn: number;
  kind: 'mid' | 'commit';
  first: boolean;
  label: string;
  moves: BatchMoves;
}

export interface PhaseStats {
  batches: number;
  batchesWithMove: number;
  batchesWithUnrelated: number;
  moved: number;
  unrelated: number;
  sameBlock: number;
  reslotted: number;
  /** Conversations (sessions) and distinct cases with at least one unrelated move. */
  sessionsWithUnrelated: number;
  casesWithUnrelated: string[];
  unrelatedPx: Summary;
  unrelatedHistogram: Record<string, number>;
  movedHistogram: Record<string, number>;
  maxUnrelatedPx: number;
  maxMovedPx: number;
}

export const PX_EDGES: readonly number[] = [25, 50, 100, 300, 500];

function phase(records: readonly StabilityRecord[]): PhaseStats {
  const all = records.flatMap((r) => r.moves.moved);
  const un = all.filter((m) => m.cls === 'unrelated');
  const withUn = records.filter((r) => r.moves.moved.some((m) => m.cls === 'unrelated'));
  return {
    batches: records.length,
    batchesWithMove: records.filter((r) => r.moves.moved.length > 0).length,
    batchesWithUnrelated: withUn.length,
    moved: all.length,
    unrelated: un.length,
    sameBlock: all.filter((m) => m.cls === 'same-block').length,
    reslotted: all.filter((m) => m.cls === 'reslotted').length,
    sessionsWithUnrelated: new Set(withUn.map((r) => r.session)).size,
    casesWithUnrelated: [...new Set(withUn.map((r) => r.case))].sort(),
    unrelatedPx: summary(un.map((m) => m.px), 1),
    unrelatedHistogram: histogram(un.map((m) => m.px), PX_EDGES),
    movedHistogram: histogram(all.map((m) => m.px), PX_EDGES),
    maxUnrelatedPx: round(Math.max(0, ...un.map((m) => m.px)), 1),
    maxMovedPx: round(Math.max(0, ...all.map((m) => m.px)), 1),
  };
}

export interface WorstCase {
  session: string;
  turn: number;
  batch: string;
  unrelated: number;
  maxPx: number;
  cards: string[];
}

export interface StabilityReport {
  all: PhaseStats;
  /** New diagrams: the first turn of a conversation without a base. */
  firstTurns: PhaseStats;
  /** Follow-up turns and edits of a base diagram. */
  followUps: PhaseStats;
  worst: WorstCase[];
}

export function aggregateStability(records: readonly StabilityRecord[], worstN = 12): StabilityReport {
  const worst = records
    .filter((r) => r.moves.moved.some((m) => m.cls === 'unrelated'))
    .map((r) => {
      const un = r.moves.moved.filter((m) => m.cls === 'unrelated').sort((a, b) => b.px - a.px);
      return { session: r.session, turn: r.turn + 1, batch: r.label, unrelated: un.length, maxPx: un[0].px, cards: un.slice(0, 6).map((m) => `${m.id} ${m.px}px`) };
    })
    .sort((a, b) => b.maxPx - a.maxPx || b.unrelated - a.unrelated)
    .slice(0, worstN);
  return { all: phase(records), firstTurns: phase(records.filter((r) => r.first)), followUps: phase(records.filter((r) => !r.first)), worst };
}
