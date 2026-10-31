// The Alibaba Cloud Cursor as the build's live mark (spec section 10). It blinks while Qwen is silent (waiting for the
// first token, status lines, the repair's wait), holds solid while text is arriving, and goes away at commit or fatal.
// Pure: the component feeds it timestamps and sets one timer for `nextCursorChange`.

/** Solid for this long after the last text delta, then blinking again. */
export const CURSOR_SOLID_MS = 600;

export type CursorMode = 'blink' | 'solid' | 'hidden';

/**
 * @param active  a turn is in flight (waiting, streaming, fallback or repairing)
 * @param lastTextAt epoch ms of the last say delta, or null when none arrived yet
 */
export function cursorMode(active: boolean, lastTextAt: number | null, now: number): CursorMode {
  if (!active) return 'hidden';
  if (lastTextAt !== null && now - lastTextAt < CURSOR_SOLID_MS) return 'solid';
  return 'blink';
}

/** Ms from `now` until the mode changes from solid to blinking, or null when no change is due. */
export function nextCursorChange(active: boolean, lastTextAt: number | null, now: number): number | null {
  if (cursorMode(active, lastTextAt, now) !== 'solid' || lastTextAt === null) return null;
  return Math.max(0, lastTextAt + CURSOR_SOLID_MS - now);
}
