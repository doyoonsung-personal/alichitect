// What moves between two layouts, and when (spec section 10). Pure: the canvas reads the plan while it renders, and
// CSS does the animating. Only what changed moves: an unrelated card never gets a transition.
import { layoutDiff } from '@ali/core/layout.ts';
import type { LayoutState } from '@ali/core/layout.ts';

export const ENTER_MS = 240;
export const MOVE_MS = 300;
export const EXIT_MS = 160;
/** The ghost of an exited card stays this long after its content has faded. */
export const GHOST_MS = 160;
export const STAGGER_MS = 30;
export const STAGGER_MAX = 6;

export interface MotionPlan {
  /** Cards that enter, with the delay of their entrance in ms (30 ms steps, at most 6 steps per batch). */
  enter: Map<string, number>;
  /** Cards that move to another slot. */
  move: Set<string>;
  /** Frames that moved or resized (they share the card move). */
  frames: Set<string>;
  /** Cards that left: drawn as ghosts at their old slot. */
  exit: string[];
  /** Cards and badges an edge must wait for: the edges that end on them appear after they land. */
  touched: Set<string>;
  /** When the edges of touched cards may appear, ms after the layout lands. */
  edgeDelay: number;
  animate: boolean;
}

export const STILL: MotionPlan = { enter: new Map(), move: new Set(), frames: new Set(), exit: [], touched: new Set(), edgeDelay: 0, animate: false };

/** The plan to get from `prev` to `next`. With animate false (a restore, a resize) nothing moves. */
export function planMotion(prev: LayoutState | null, next: LayoutState | null, animate: boolean): MotionPlan {
  if (!animate || !prev || !next) return STILL;
  const d = layoutDiff(prev, next);
  const enter = new Map<string, number>();
  d.entered.forEach((id, i) => enter.set(id, Math.min(i, STAGGER_MAX - 1) * STAGGER_MS));
  const touched = new Set<string>([...d.entered, ...d.moved, ...d.exited]);
  const lands = d.moved.length || d.framesChanged.length ? MOVE_MS : d.entered.length ? ENTER_MS + (Math.min(d.entered.length, STAGGER_MAX) - 1) * STAGGER_MS : 0;
  return { enter, move: new Set(d.moved), frames: new Set(d.framesChanged), exit: d.exited, touched, edgeDelay: lands, animate: true };
}

/** Ids from a highlight or a tag that name a badge: they light their host card. Returns the set of card ids to light. */
export function litCards(ids: readonly string[], layout: LayoutState | null): Set<string> {
  const out = new Set<string>();
  if (!layout) return out;
  for (const id of ids) {
    if (Object.hasOwn(layout.cards, id)) out.add(id);
    else if (Object.hasOwn(layout.badges, id)) out.add(layout.badges[id].host);
    else if (Object.hasOwn(layout.cards, 'rec:' + id)) out.add('rec:' + id);
  }
  return out;
}
