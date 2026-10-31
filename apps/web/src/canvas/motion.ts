// What moves between two layouts, and when (spec section 10, extended by src/styles/motion.css). Pure: the canvas reads
// the plan while it renders, and CSS does the animating. Only what changed moves: an unrelated card never gets a
// transition. The clock below keeps every running entrance, move, exit and edge draw going when the next batch lands
// mid-animation: a new op retargets what is moving and never cuts or queues what is already under way.
import { layoutDiff } from '@ali/core/layout.ts';
import type { LayoutState } from '@ali/core/layout.ts';

// These match the tokens (tokens.css and motion.css; motion.test.ts checks them).
export const ENTER_MS = 240;
export const MOVE_MS = 300;
export const EXIT_MS = 160;
/** The ghost of an exited card stays this long after its content has faded, while it collapses. */
export const GHOST_MS = 160;
export const STAGGER_MS = 30;
export const STAGGER_MAX = 6;
/** An edge draws itself from its source to its target. */
export const DRAW_MS = 320;
/** A new frame (region, VPC, zone) fades in. */
export const FRAME_MS = 200;
/** A badge snaps onto its host. */
export const SNAP_MS = 200;
/** The revision tag stamps onto a card at commit. */
export const STAMP_MS = 240;
/**
 * When the batch also moves cards or frames (a frame grows to take the new card), the new cards wait this long, so
 * the container has all but arrived (the ease-out is 90 % there) before they land in it.
 */
export const ROOM_MS = 100;

export interface MotionPlan {
  /** Cards that enter, in request-path order, with their entrance delay in ms (30 ms steps, at most 6 steps per batch). */
  enter: Map<string, number>;
  /** Cards that move to another slot. */
  move: Set<string>;
  /** Frames that moved or resized (they share the card move). */
  frames: Set<string>;
  /** Frames that are new in this layout: they fade in under their first cards. */
  frameEnter: Set<string>;
  /** Badges and attachments that are new on their host, with the delay of their snap (after the host lands). */
  badges: Map<string, number>;
  /** Cards that left: drawn as ghosts at their old slot. */
  exit: string[];
  /** Cards and badges an edge must wait for: the edges that end on them appear after they land. */
  touched: Set<string>;
  /** When each touched card has landed, ms after the layout lands. */
  lands: Map<string, number>;
  /** When every touched card has landed, ms after the layout lands. */
  edgeDelay: number;
  animate: boolean;
}

export const STILL: MotionPlan = { enter: new Map(), move: new Set(), frames: new Set(), frameEnter: new Set(), badges: new Map(), exit: [], touched: new Set(), lands: new Map(), edgeDelay: 0, animate: false };

/**
 * Request-path order: the request path runs left to right (users, edge, ingress, compute, data), so cards are taken by
 * column, then top to bottom within it. Columns are 40 px buckets so a card nudged by a badge does not jump the queue.
 */
export function pathOrder(ids: readonly string[], layout: LayoutState): string[] {
  const at = (id: string): { col: number; y: number } => {
    const c = layout.cards[id];
    return c ? { col: Math.round(c.x / 40), y: c.y } : { col: Infinity, y: Infinity };
  };
  return [...ids].sort((a, b) => {
    const p = at(a);
    const q = at(b);
    return p.col - q.col || p.y - q.y || (a < b ? -1 : a > b ? 1 : 0);
  });
}

/**
 * The plan to get from `prev` to `next`. With animate false (a restore, a resize) nothing moves. Without a previous
 * layout (the first batch of a session) every card enters.
 */
export function planMotion(prev: LayoutState | null, next: LayoutState | null, animate: boolean): MotionPlan {
  if (!animate || !next) return STILL;
  prev ??= { ...next, cards: {}, frames: {}, badges: {} };
  const d = layoutDiff(prev, next);
  const enter = new Map<string, number>();
  const lands = new Map<string, number>();
  const room = d.moved.length || d.framesChanged.length ? ROOM_MS : 0;
  pathOrder(d.entered, next).forEach((id, i) => {
    const delay = room + Math.min(i, STAGGER_MAX - 1) * STAGGER_MS;
    enter.set(id, delay);
    lands.set(id, delay + ENTER_MS);
  });
  for (const id of d.moved) lands.set(id, MOVE_MS);
  const frameEnter = new Set(Object.keys(next.frames).filter((id) => !Object.hasOwn(prev.frames, id)));
  const badges = new Map<string, number>();
  for (const [id, b] of Object.entries(next.badges)) {
    if (Object.hasOwn(prev.badges, id) && prev.badges[id].host === b.host) continue;
    badges.set(id, lands.get(b.host) ?? 0);
  }
  const touched = new Set<string>([...d.entered, ...d.moved, ...d.exited]);
  const edgeDelay = d.moved.length || d.framesChanged.length ? Math.max(MOVE_MS, ...lands.values()) : lands.size ? Math.max(...lands.values()) : 0;
  return { enter, move: new Set(d.moved), frames: new Set(d.framesChanged), frameEnter, badges, exit: d.exited, touched, lands, edgeDelay, animate: true };
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

// ---------- the clock: running animations survive the next batch ----------

interface Run {
  /** When the animation starts (after its delay), ms on the clock. */
  start: number;
  /** When it has finished. */
  end: number;
  /** The CSS delay the element was given when it mounted: kept as it is while the element lives. */
  delay: number;
}

export interface EdgeTiming {
  /** The edge is still drawing (or waiting to): it carries the draw animation. */
  draw: boolean;
  /** CSS animation delay for this rendering of the edge (negative when a re-routed edge resumes mid-draw). */
  delay: number;
  /** An edge that was drawn before and comes back on a new route (its card moved): it fades in, after this delay. */
  fade: number | null;
}

/** A drawn edge that comes back on a new route fades in over this long. */
export const RETURN_MS = 200;
/**
 * A flag stays on this much longer than its animation: the element mounts a few ms after the render that started its
 * clock, and the arrowhead and label of a drawing edge finish after the line. Dropping a flag early would cut the end.
 */
export const SLACK_MS = 90;

export interface MotionClock {
  /** A new layout version reached the screen at `now`. */
  apply(plan: MotionPlan, now: number): void;
  /** The entrance delay to keep on a card while its entrance runs, else null. */
  enter(id: string, now: number): number | null;
  /** The card or frame is gliding to a new slot (its position transition must stay on until it lands). */
  moving(id: string, now: number): boolean;
  /** The frame is fading in. */
  frameEnter(id: string, now: number): boolean;
  /** The snap delay to keep on a new badge while it snaps, else null. */
  badge(id: string, now: number): number | null;
  /** Ms from `now` until every card in `ids` has landed (0 when none is entering or moving). */
  wait(ids: Iterable<string>, now: number): number;
  /**
   * An edge's draw: started the first time the edge is seen in an animated layout, then kept, whatever its route.
   * `returning`: the edge was not on the sheet in the last pass (its route went stale while a card moved).
   */
  edge(id: string, key: string, now: number, waitMs: number, animate: boolean, returning: boolean): EdgeTiming;
  /** Cards that left and are still on screen as ghosts. */
  ghosts(now: number): string[];
  /** The revision tag stamps on: keep its delay while it does. `delay` is used the first time only. */
  stamp(id: string, n: number, delay: number, now: number): number | null;
  /** The next moment a flag above runs out (ghosts and leaving edges need a render then), or null. */
  nextChange(now: number): number | null;
  /** Edges that left the graph: kept for their fade, by id, until the returned time. */
  leave(id: string, now: number): number;
  leaving(now: number): string[];
}

export function createMotionClock(): MotionClock {
  const enters = new Map<string, Run>();
  const moves = new Map<string, number>();
  const frames = new Map<string, number>();
  const badges = new Map<string, Run>();
  const exits = new Map<string, number>();
  const edges = new Map<string, Run>();
  const fades = new Map<string, Run>();
  const keys = new Map<string, number>();
  const stamps = new Map<string, Run & { n: number }>();
  const leaves = new Map<string, number>();
  const live = (run: { end: number } | number | undefined, now: number): boolean => run !== undefined && (typeof run === 'number' ? run : run.end) > now;

  return {
    apply(plan, now) {
      if (!plan.animate) return;
      for (const [id, delay] of plan.enter) {
        enters.set(id, { start: now + delay, end: now + delay + ENTER_MS + SLACK_MS, delay });
        exits.delete(id);
      }
      for (const id of plan.move) moves.set(id, now + MOVE_MS);
      for (const id of plan.frames) moves.set('f:' + id, now + MOVE_MS);
      for (const id of plan.frameEnter) frames.set(id, now + FRAME_MS + SLACK_MS);
      for (const [id, delay] of plan.badges) badges.set(id, { start: now + delay, end: now + delay + SNAP_MS + SLACK_MS, delay });
      for (const id of plan.exit) {
        exits.set(id, now + EXIT_MS + GHOST_MS);
        enters.delete(id);
      }
    },
    enter(id, now) {
      const r = enters.get(id);
      if (!r || r.end <= now) {
        if (r) enters.delete(id);
        return null;
      }
      return r.delay;
    },
    moving(id, now) {
      return live(moves.get(id), now);
    },
    frameEnter(id, now) {
      return live(frames.get(id), now);
    },
    badge(id, now) {
      const r = badges.get(id);
      return r && r.end > now ? r.delay : null;
    },
    wait(ids, now) {
      let until = now;
      for (const id of ids) {
        const e = enters.get(id);
        if (e && e.end - SLACK_MS > until) until = e.end - SLACK_MS;
        const m = moves.get(id);
        if (m !== undefined && m > until) until = m;
        const b = badges.get(id);
        if (b && b.end - SLACK_MS > until) until = b.end - SLACK_MS;
      }
      return until - now;
    },
    edge(id, key, now, waitMs, animate, returning) {
      let r = edges.get(id);
      if (!r) {
        // an edge on the sheet before anything animated (a restore, a resize) never draws
        r = animate ? { start: now + waitMs, end: now + waitMs + DRAW_MS + SLACK_MS, delay: waitMs } : { start: -1, end: -1, delay: 0 };
        edges.set(id, r);
        leaves.delete(id);
        returning = false;
      }
      // a new route for an edge that is still drawing resumes where the old one was (a negative delay)
      const keep = (k: string, start: number): number => {
        let d = keys.get(k);
        if (d === undefined) {
          d = Math.round(start - now);
          keys.set(k, d);
        }
        return d;
      };
      if (r.end > now) return { draw: true, delay: keep(key, r.start), fade: null };
      let f = fades.get(id);
      if (returning && animate && (!f || f.end <= now)) {
        f = { start: now + waitMs, end: now + waitMs + RETURN_MS + SLACK_MS, delay: waitMs };
        fades.set(id, f);
      }
      if (f && f.end > now) return { draw: false, delay: 0, fade: keep('f|' + key, f.start) };
      return { draw: false, delay: 0, fade: null };
    },
    ghosts(now) {
      const out: string[] = [];
      for (const [id, until] of exits) {
        if (until > now) out.push(id);
        else exits.delete(id);
      }
      return out;
    },
    stamp(id, n, delay, now) {
      let r = stamps.get(id);
      if (!r || r.n !== n) {
        r = { start: now + delay, end: now + delay + STAMP_MS + SLACK_MS, delay, n };
        stamps.set(id, r);
      }
      return r.end > now ? r.delay : null;
    },
    leave(id, now) {
      const until = leaves.get(id) ?? now + EXIT_MS;
      leaves.set(id, until);
      edges.delete(id);
      return until;
    },
    leaving(now) {
      const out: string[] = [];
      for (const [id, until] of leaves) {
        if (until > now) out.push(id);
        else leaves.delete(id);
      }
      return out;
    },
    nextChange(now) {
      let next = Infinity;
      for (const t of exits.values()) if (t > now) next = Math.min(next, t);
      for (const t of leaves.values()) if (t > now) next = Math.min(next, t);
      if (keys.size > 400) keys.clear();
      return next === Infinity ? null : next;
    },
  };
}

/** Polyline length of a route: at least the drawn length (rounded corners only shorten it). */
export function routeLength(pts: readonly { x: number; y: number }[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return Math.ceil(l) + 1;
}

const PATTERN: Partial<Record<string, readonly number[]>> = { async: [5, 4], resolve: [0.1, 4.5] };

/**
 * The dash array that draws a line from its source as `stroke-dashoffset` goes from `from` to 0: the line's own dash
 * pattern laid out over its length, then a gap at least as long. Solid lines are one dash. A dashed line comes out of
 * its source with its dashes travelling, like a line being drawn. At offset 0 the line looks exactly as it does at rest.
 */
export function drawDash(kind: string, len: number): { array: string; from: number } {
  const p = PATTERN[kind];
  if (!p) return { array: `${len} ${len}`, from: len };
  const out: number[] = [];
  let at = 0;
  while (at < len) {
    out.push(p[0], p[1]);
    at += p[0] + p[1];
  }
  // the last gap grows by the line's length: nothing of the pattern shows until the offset brings it in
  out[out.length - 1] += len;
  return { array: out.map((n) => +n.toFixed(2)).join(' '), from: +at.toFixed(2) };
}
