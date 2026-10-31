// Replay timing, pure. A fixture turn is a list of [ms since the ask, wire event]; the plan says when each event is
// dispatched for a speed. The reducer's clock is the recorded time ("virtual time"), whatever the speed, so a
// revision always reads "Drawn in 9.5 s" as recorded.
import type { WireEvent } from '../stream/events.ts';
import type { ReplaySpeed } from '../store/types.ts';

export interface FixtureTurn {
  ask: string;
  ev: Array<[number, WireEvent]>;
}

export interface Fixture {
  id: string;
  title: string;
  lang: 'en' | 'ko' | 'zh';
  recordedAt: string;
  source: string;
  model: string;
  note: string;
  synthetic: boolean;
  turns: FixtureTurn[];
}

export interface FixtureInfo {
  id: string;
  title: string;
  lang: 'en' | 'ko' | 'zh';
  recordedAt: string;
  synthetic: boolean;
  turns: number;
  ask: string;
  durationMs: number;
  note: string;
}

export interface PlannedEvent {
  /** Real ms after the ask when the event is dispatched. */
  at: number;
  /** Recorded ms after the ask: the clock the reducer sees. */
  vt: number;
  event: WireEvent;
}

export const SPEED_FACTOR: Record<ReplaySpeed, number> = { '1x': 1, '4x': 4, instant: Infinity };
/** Pause between two recorded turns, at 1x. */
export const TURN_GAP_MS = 2200;
/** After a stream that ends with no commit and no fatal, the player waits this long (at 1x) before reporting the drop. */
export const DROP_AFTER_MS = 800;

export function planTurn(turn: FixtureTurn, speed: ReplaySpeed): PlannedEvent[] {
  const f = SPEED_FACTOR[speed];
  const out = turn.ev.map(([vt, event]) => ({ at: f === Infinity ? 0 : Math.round(vt / f), vt, event }));
  // stable by time (the recording is already in order, but a hand-built fixture may not be)
  return out.map((e, i) => [e, i] as const).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(([e]) => e);
}

/** How a recorded turn ends: with a commit, a fatal, or cut off (a network drop). */
export function turnEnding(turn: FixtureTurn): 'commit' | 'fatal' | 'cut' {
  for (let i = turn.ev.length - 1; i >= 0; i--) {
    const t = turn.ev[i][1].type;
    if (t === 'commit') return 'commit';
    if (t === 'fatal') return 'fatal';
    if (t !== 'summary' && t !== 'status') break;
  }
  return 'cut';
}

/** Recorded duration of a turn: the time of its last event. */
export function turnDuration(turn: FixtureTurn): number {
  return turn.ev.length ? turn.ev[turn.ev.length - 1][0] : 0;
}

/** Real ms from now until a recorded moment, at a speed. */
export function scaled(ms: number, speed: ReplaySpeed): number {
  const f = SPEED_FACTOR[speed];
  return f === Infinity ? 0 : Math.round(ms / f);
}
