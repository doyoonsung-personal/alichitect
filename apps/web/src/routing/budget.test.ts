import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeWithBudget } from './budget.ts';
import type { AvoidPort } from './budget.ts';
import type { RouteRequest, RouteResult } from './types.ts';

const req: RouteRequest = { edges: [], obstacles: [] };
const result = (router: 'libavoid' | 'channel'): RouteResult => ({ router, routes: { e: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }, ms: 1, failed: [] });
const channel = (): RouteResult => result('channel');

/** A timer that fires only when the test says so. */
function manualTimer() {
  const pending: Array<() => void> = [];
  return {
    timer: (fn: () => void) => {
      pending.push(fn);
      return () => {
        const i = pending.indexOf(fn);
        if (i >= 0) pending.splice(i, 1);
      };
    },
    fire: () => pending.splice(0).forEach((f) => f()),
  };
}
const port = (route: AvoidPort['route']): AvoidPort => ({ route, reset: async () => {}, dispose: () => {} });

describe('routeWithBudget', () => {
  it('uses libavoid when it answers within the budget', async () => {
    const m = manualTimer();
    const r = await routeWithBudget(req, { avoid: port(async () => result('libavoid')), channel, budgetMs: 50, timer: m.timer });
    assert.equal(r.source, 'libavoid');
    assert.equal(r.late, null);
  });

  it('answers with the channel router when libavoid is late, and hands the late answer back', async () => {
    const m = manualTimer();
    let release!: (r: RouteResult) => void;
    const slow = new Promise<RouteResult>((res) => (release = res));
    const p = routeWithBudget(req, { avoid: port(() => slow), channel, budgetMs: 50, timer: m.timer });
    m.fire();
    const r = await p;
    assert.equal(r.source, 'channel');
    assert.equal(r.reason, 'budget');
    assert.ok(r.late);
    release(result('libavoid'));
    assert.equal((await r.late)!.router, 'libavoid');
  });

  it('falls back when libavoid fails', async () => {
    const m = manualTimer();
    const r = await routeWithBudget(req, { avoid: port(async () => { throw new Error('wasm'); }), channel, budgetMs: 50, timer: m.timer });
    assert.equal(r.source, 'channel');
    assert.equal(r.reason, 'error');
    assert.equal(r.late, null);
  });

  it('falls back when libavoid answers nothing', async () => {
    const m = manualTimer();
    const r = await routeWithBudget(req, { avoid: port(async () => null), channel, budgetMs: 50, timer: m.timer });
    assert.equal(r.source, 'channel');
  });

  it('routes with the channel router alone when there is no worker', async () => {
    const r = await routeWithBudget(req, { avoid: null, channel, budgetMs: 50 });
    assert.equal(r.source, 'channel');
    assert.equal(r.reason, 'unavailable');
  });

  it('a late failure resolves the late promise with null, not a rejection', async () => {
    const m = manualTimer();
    let fail!: (e: Error) => void;
    const slow = new Promise<RouteResult>((_, rej) => (fail = rej));
    const p = routeWithBudget(req, { avoid: port(() => slow), channel, budgetMs: 50, timer: m.timer });
    m.fire();
    const r = await p;
    fail(new Error('late'));
    assert.equal(await r.late, null);
  });
});
