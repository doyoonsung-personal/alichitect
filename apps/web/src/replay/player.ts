// Streams a recorded conversation through the same dispatch path as a live turn: turn/start, then every recorded wire
// event at its recorded time (or 4x, or at once), batched into display and layout steps every BATCH_MS exactly as the
// live controller does. Timers and the clock are injected, so tests run it on a fake clock.
import type { Action } from '../store/reducer.ts';
import type { ReplaySpeed } from '../store/types.ts';
import { DROP_AFTER_MS, TURN_GAP_MS, planTurn, scaled, turnEnding } from './plan.ts';
import type { Fixture } from './plan.ts';

/** The canvas lays out and animates once per batch; the record updates per event (spec section 9). */
export const BATCH_MS = 180;

export interface PlayerHost {
  dispatch(a: Action): void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(h: unknown): void;
  /** Real clock, ms. */
  now(): number;
}

export interface PlayerOptions {
  fixture: Fixture;
  speed(): ReplaySpeed;
  /** A turn starts (0-based index). */
  onTurn?(index: number): void;
  /** Every recorded turn has ended. */
  onDone?(): void;
}

export interface Player {
  /** Starts from a turn (0 by default). Stops anything already playing first. */
  start(fromTurn?: number): void;
  stop(): void;
  readonly playing: boolean;
}

export function createPlayer(host: PlayerHost, o: PlayerOptions): Player {
  let timer: unknown = null;
  let flushTimer: unknown = null;
  let gen = 0;
  let playing = false;

  const clear = (): void => {
    if (timer !== null) host.clearTimeout(timer);
    if (flushTimer !== null) host.clearTimeout(flushTimer);
    timer = flushTimer = null;
  };

  const runTurn = (index: number, myGen: number): void => {
    const turn = o.fixture.turns[index];
    if (!turn) {
      playing = false;
      o.onDone?.();
      return;
    }
    const speed = o.speed();
    const startReal = host.now();
    const vBase = startReal; // the reducer's clock: real start plus recorded offsets
    o.onTurn?.(index);
    host.dispatch({ type: 'turn/start', ask: turn.ask, now: vBase, replayOf: o.fixture.id });
    const plan = planTurn(turn, speed);
    const ending = turnEnding(turn);
    let i = 0;

    const afterTurn = (): void => {
      if (myGen !== gen) return;
      const gap = scaled(TURN_GAP_MS, o.speed());
      if (gap === 0) runTurn(index + 1, myGen);
      else timer = host.setTimeout(() => runTurn(index + 1, myGen), gap);
    };

    const finish = (): void => {
      if (myGen !== gen) return;
      if (ending === 'cut') {
        const lastVt = plan.length ? plan[plan.length - 1].vt : 0;
        const drop = (): void => {
          if (myGen !== gen) return;
          host.dispatch({ type: 'turn/fail', code: 'network', message: '', retryable: true, now: vBase + lastVt + DROP_AFTER_MS });
          // a dropped turn ends the recording: there is nothing after it to play
          playing = false;
          o.onDone?.();
        };
        const wait = scaled(DROP_AFTER_MS, o.speed());
        if (wait === 0) drop();
        else timer = host.setTimeout(drop, wait);
        return;
      }
      if (ending === 'fatal') {
        playing = false;
        o.onDone?.();
        return;
      }
      afterTurn();
    };

    const scheduleFlush = (): void => {
      if (flushTimer !== null || speed === 'instant') return;
      flushTimer = host.setTimeout(() => {
        flushTimer = null;
        if (myGen === gen) host.dispatch({ type: 'turn/flush', now: host.now() });
      }, BATCH_MS);
    };

    const step = (): void => {
      if (myGen !== gen) return;
      for (;;) {
        if (i >= plan.length) {
          if (flushTimer !== null) {
            host.clearTimeout(flushTimer);
            flushTimer = null;
          }
          finish();
          return;
        }
        const e = plan[i];
        const due = startReal + e.at;
        const wait = due - host.now();
        if (wait > 0 && speed !== 'instant') {
          timer = host.setTimeout(step, wait);
          return;
        }
        i++;
        host.dispatch({ type: 'turn/event', event: e.event, now: vBase + e.vt });
        if (e.event.type === 'op') scheduleFlush();
      }
    };
    step();
  };

  return {
    start(fromTurn = 0) {
      clear();
      gen++;
      playing = true;
      runTurn(fromTurn, gen);
    },
    stop() {
      clear();
      gen++;
      playing = false;
    },
    get playing() {
      return playing;
    },
  };
}
