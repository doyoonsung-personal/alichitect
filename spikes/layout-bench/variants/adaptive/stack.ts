// Reserved stacks: the stability mechanism of the adaptive layout. Pure.
//
// A stack is a list of units (frames, frame groups, lane blocks) laid out one after another from an anchor, in one
// direction. Each unit keeps a reserved extent that never shrinks within a session (its high-water mark), so a removal
// leaves a gap instead of pulling later units back. A unit that is removed stays in the order as a ghost and keeps its
// space, and it takes the same place if it comes back. New units are appended at the far end of the stack, its frontier,
// where nothing can be pushed. A new unit may instead take over the place of a ghost the stack calls replaceable (an
// implicit frame such as '~external' that an explicit group replaced).
//
// When a new unit is appended after unit i, unit i's reservation is raised to its live extent plus `spare`. The new unit
// is positioned after that headroom, so later growth of unit i (by up to `spare`) moves nothing. When unit i outgrows its
// reservation anyway (the units beyond it are pushed in that batch), it takes the same headroom again in that push, so
// the next growth is absorbed. The last unit needs no headroom: nothing lies beyond it.

export interface StackItem {
  id: string;
  /** Extent the unit needs now, in px (0 for a unit that is absent but must keep its place). */
  live: number;
  /** Headroom, in px, granted when a unit is appended after this one. */
  spare: number;
}

export interface StackMemory {
  order: Record<string, string[]>;
  res: Record<string, number>;
}

export interface StackResult {
  /** Offset of each present unit from the anchor, in px along the stack direction. */
  at: Map<string, number>;
  /** Offset of the far end of the last present unit (0 when none is present). */
  end: number;
  /** Offset of the far end of the last reservation, ghosts included (0 for an empty stack). */
  resEnd: number;
  /** The stack order, ghosts included. */
  order: string[];
}

/**
 * Positions `items` along a stack. `key` names the stack in the sticky memory; `prev` is the previous layout's memory
 * (undefined for a canonical layout), `next` receives this layout's memory. `replaceable(ghostId)` says which ghosts a
 * new unit may take over.
 */
export function stackUnits(key: string, items: readonly StackItem[], gap: number, prev: StackMemory | undefined, next: StackMemory, replaceable?: (ghostId: string) => boolean): StackResult {
  const byId = new Map(items.map((i) => [i.id, i]));
  const prevOrder = prev?.order[key] ?? [];
  const known = new Set(prevOrder);
  const order = prevOrder.slice();
  const inherited = new Map<string, string>(); // new id -> ghost id whose place it takes
  for (const it of items) {
    if (known.has(it.id)) continue;
    const g = replaceable ? order.findIndex((id) => !byId.has(id) && !inherited.has(id) && replaceable(id)) : -1;
    if (g >= 0) {
      inherited.set(it.id, order[g]);
      order[g] = it.id;
    } else order.push(it.id);
  }
  const old = (id: string): boolean => known.has(id) || inherited.has(id);
  next.order[key] = order;
  const at = new Map<string, number>();
  let off = 0;
  let end = 0;
  let resEnd = 0;
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const it = byId.get(id);
    const live = it ? it.live : 0;
    const rk = key + '|' + id;
    const was = Math.max(prev?.res[rk] ?? 0, inherited.has(id) ? (prev?.res[key + '|' + inherited.get(id)] ?? 0) : 0);
    let r = Math.max(was, live);
    // outgrowing the reservation pushes the units beyond anyway: take the headroom in the same push
    if (it && live > was && i + 1 < order.length) r = live + it.spare;
    const nextNew = i + 1 < order.length && !old(order[i + 1]);
    if (nextNew && it) r = Math.max(r, live + it.spare);
    next.res[rk] = r;
    if (it) {
      at.set(id, off);
      end = off + live;
    }
    if (r > 0) {
      resEnd = off + r;
      off += r + gap;
    }
  }
  return { at, end, resEnd, order };
}
