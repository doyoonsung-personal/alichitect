// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed and corrected by Claude (corner and escape cases, tolerances).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHoverMachine, type HoverTimers, type OpenedBy } from './hover.ts';

interface Pending { id: number; fn: () => void; due: number }

function setup() {
  let nextId = 1;
  const pending: Pending[] = [];
  const timers: HoverTimers = {
    set(fn, ms) {
      const id = nextId++;
      pending.push({ id, fn, due: now + ms });
      return id;
    },
    clear(id) {
      const i = pending.findIndex(p => p.id === id);
      if (i >= 0) pending.splice(i, 1);
    },
  };
  let now = 0;
  function advance(ms: number) {
    now += ms;
    while (true) {
      pending.sort((a, b) => a.due - b.due);
      const nxt = pending.find(p => p.due <= now);
      if (!nxt) break;
      pending.splice(pending.indexOf(nxt), 1);
      nxt.fn();
    }
  }
  const changes: Array<{ open: string | null; by: OpenedBy | null }> = [];
  const m = createHoverMachine(
    (open, by) => changes.push({ open, by }),
    timers,
  );
  return { m, advance, changes, pending };
}

describe('hover machine', () => {
  it('(1) pointerEnter opens nothing before 300ms and opens by hover at 300ms', () => {
    const { m, advance, changes } = setup();
    m.pointerEnter('a');
    advance(299);
    assert.equal(changes.length, 0);
    advance(1);
    assert.deepEqual(changes, [{ open: 'a', by: 'hover' }]);
  });

  it('(2) pointerLeave before 300ms cancels the open', () => {
    const { m, advance, changes } = setup();
    m.pointerEnter('a');
    advance(100);
    m.pointerLeave('a');
    advance(300);
    assert.equal(changes.length, 0);
  });

  it('(3) pointerLeave on the open card closes after 150ms, not before', () => {
    const { m, advance, changes } = setup();
    m.pointerEnter('a');
    advance(300);
    changes.length = 0;
    m.pointerLeave('a');
    advance(149);
    assert.equal(changes.length, 0);
    advance(1);
    assert.deepEqual(changes, [{ open: null, by: null }]);
  });

  it('(4) popoverEnter during grace cancels close; popoverLeave schedules again', () => {
    const { m, advance, changes } = setup();
    m.pointerEnter('a');
    advance(300);
    m.pointerLeave('a');
    advance(100);
    m.popoverEnter();
    advance(200);
    assert.equal(changes.length, 1); // only the open
    m.popoverLeave();
    advance(149);
    assert.equal(changes.length, 1);
    advance(1);
    assert.deepEqual(changes[1], { open: null, by: null });
  });

  it('(5) focus opens at once with by focus', () => {
    const { m, changes } = setup();
    m.focus('a');
    assert.deepEqual(changes, [{ open: 'a', by: 'focus' }]);
  });

  it('(6) blur closes at once', () => {
    const { m, changes } = setup();
    m.focus('a');
    changes.length = 0;
    m.blur('a');
    assert.deepEqual(changes, [{ open: null, by: null }]);
  });

  it('(7) blur does not close while holdForFocus is active; closeNow still closes and clears hold', () => {
    const { m, changes } = setup();
    m.focus('a');
    m.holdForFocus();
    changes.length = 0;
    m.blur('a');
    assert.equal(changes.length, 0);
    m.closeNow();
    assert.deepEqual(changes, [{ open: null, by: null }]);
  });

  it('(8) escape closes at once and cancels pending timers', () => {
    const { m, advance, changes, pending } = setup();
    m.focus('a');
    m.pointerEnter('b');
    m.escape();
    assert.deepEqual(changes, [{ open: 'a', by: 'focus' }, { open: null, by: null }]);
    assert.equal(pending.length, 0);
    advance(500);
    assert.equal(changes.length, 2);
  });

  it('(9) moving pointer from a to b: a stays open until b opens, then only b', () => {
    const { m, advance, changes } = setup();
    m.pointerEnter('a');
    advance(300);
    m.pointerEnter('b');
    assert.equal(m.open, 'a');
    advance(300);
    assert.equal(m.open, 'b');
    const last = changes[changes.length - 1];
    assert.deepEqual(last, { open: 'b', by: 'hover' });
  });

  it('(10) click opens at once with by click', () => {
    const { m, changes } = setup();
    m.click('a');
    assert.deepEqual(changes, [{ open: 'a', by: 'click' }]);
  });

  it('(11) dispose cancels pending timers', () => {
    const { m, advance, changes } = setup();
    m.pointerEnter('a');
    m.dispose();
    advance(500);
    assert.equal(changes.length, 0);
  });
});
