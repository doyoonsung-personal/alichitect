// The Alibaba Cloud Cursor as the live build mark in the record (spec section 10): blinks while Qwen is silent, holds
// solid while text arrives, gone at commit. One timer per mounted Cursor, set for the next change only.
import { useEffect, useReducer, useState } from 'react';
import type { ReactElement } from 'react';
import { cursorMode, nextCursorChange } from '../app/contracts.ts';
import type { CursorMode } from '../app/contracts.ts';

/** The mode now, re-rendering when the solid window after the last text delta runs out. */
export function useCursorMode(active: boolean, lastTextAt: number | null): CursorMode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const wait = nextCursorChange(active, lastTextAt, Date.now());
    if (wait === null) return;
    const h = window.setTimeout(bump, wait + 8);
    return () => window.clearTimeout(h);
  }, [active, lastTextAt]);
  return cursorMode(active, lastTextAt, Date.now());
}

/** A Cursor bar. `lead` is the 8 px bar that opens a status line; otherwise it sits inline after the last character. */
export function Cursor(p: { lastTextAt: number | null; lead?: boolean }): ReactElement | null {
  const mode = useCursorMode(true, p.lastTextAt);
  return <span className={`cursor cursor--${mode === 'solid' ? 'solid' : 'blink'}${p.lead ? ' cursor--lead' : ''}`} aria-hidden="true" />;
}

/** Re-renders every `ms` while `enabled`, returning the clock. For elapsed-time counters in the record. */
export function useNow(enabled: boolean, ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const h = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(h);
  }, [enabled, ms]);
  return now;
}
