// Sticky workflow cells and row bands. Pure, browser-safe, and independent of the viewport.
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowOp } from './types.ts';
import type { Rect, LayoutCard, LayoutFrame, LayoutState, MeasureText, TitleSet } from './layout.ts';
import { GEOMETRY, fitTitle, layoutDiff, unrelatedMoves } from './layout.ts';

const G = GEOMETRY;
export const WORKFLOW_GEOMETRY = {
  columnPitch: G.cardW + G.gapX,
  rowPitch: G.cardH + G.gapY,
  visibleAttachments: 3,
  spareRows: 3,
  titleFloorPx: 11,
} as const;
const W = WORKFLOW_GEOMETRY;
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const sorted = <T extends { id: string }>(r: Record<string, T>): T[] => Object.values(r).sort((a, b) => compare(a.id, b.id));
const has = (r: object, id: string): boolean => Object.hasOwn(r, id);

export interface WorkflowCell { column: number; row: number }
export interface WorkflowSpan { row: number; from: number; to: number; nodes: string[] }
export interface WorkflowCard extends LayoutCard { title: TitleSet; hiddenAttached: number }
export interface WorkflowBracket extends LayoutFrame { group: string; nodes: string[]; bracket: true }
export interface WorkflowLayoutState extends Omit<LayoutState, 'mode' | 'cards' | 'frames'> {
  mode: 'workflow';
  cards: Record<string, WorkflowCard>;
  frames: Record<string, WorkflowBracket>;
  bounds: Rect;
  workflow: {
    cells: Record<string, WorkflowCell>;
    arrival: string[];
    roles: Record<string, 'inline' | 'attached'>;
    branchRows: number[];
    rowTops: number[];
    rowHeights: number[];
    /** Id-sorted membership; physical slots preserve arrivals and holes until tidy. */
    stacks: Record<string, string[]>;
    attachmentSlots: Record<string, string[]>;
    /** Physical reservations per inline root, including holes left by removed descendants. */
    attachmentOffsets: Record<string, Record<string, number>>;
    spans: Record<string, WorkflowSpan[]>;
    edges: Record<string, { from: string; to: string }>;
    routes: Record<string, { loop: boolean; backwards: boolean }>;
    /** Exact allowed translations for this transition, in pixels. */
    moves: Array<{ reason: 'splice' | 'overflow'; ids: string[]; dx: number; dy: number }>;
  };
}
export interface WorkflowLayoutOptions {
  tidy?: boolean;
  /** The applied operation. Only explicit splice provenance permits horizontal translations. */
  op?: WorkflowOp;
  /** Spare attachment rows per band. Three prevents overflow for a flat, collapsed stack. */
  spareRows?: number;
  measureText?: MeasureText;
}

// These helpers only inspect geometry. Adapt the closed cloud mode union without changing layout.ts.
const geometryState = (s: WorkflowLayoutState): LayoutState => ({ ...s, mode: 'architecture' });
export function workflowLayoutDiff(prev: WorkflowLayoutState | undefined, next: WorkflowLayoutState) {
  return layoutDiff(prev ? geometryState(prev) : undefined, geometryState(next));
}
export function workflowUnrelatedMoves(prev: WorkflowLayoutState, next: WorkflowLayoutState, moved: readonly string[]): string[] {
  return unrelatedMoves(geometryState(prev), geometryState(next), moved);
}

/** DFS back edges, excluding explicit loops from the dependency graph. Never reads positions. */
export function workflowLoopIds(wf: WorkflowGraph): string[] {
  const edges = sorted(wf.edges);
  const loops = new Set(edges.filter((e) => e.kind === 'loop').map((e) => e.id));
  const color = new Map<string, number>();
  const visit = (id: string): void => {
    color.set(id, 1);
    for (const e of edges.filter((e) => e.from === id && has(wf.nodes, e.to) && !loops.has(e.id))) {
      if (color.get(e.to) === 1) loops.add(e.id);
      else if (!color.has(e.to)) visit(e.to);
    }
    color.set(id, 2);
  };
  // Search from where runs start, so the back edge found is the one that returns upstream:
  // triggers, then steps nothing leads into, then whatever is left.
  const nodes = sorted(wf.nodes);
  const entered = new Set(edges.filter((e) => !loops.has(e.id) && has(wf.nodes, e.from)).map((e) => e.to));
  const roots = [...nodes.filter((n) => n.kind === 'trigger'), ...nodes.filter((n) => !entered.has(n.id)), ...nodes];
  for (const n of roots) if (!color.has(n.id)) visit(n.id);
  return [...loops].sort(compare);
}

function topological(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const remaining = new Set(nodes.map((n) => n.id));
  const order: string[] = [];
  while (remaining.size) {
    const ready = [...remaining].filter((id) => !edges.some((e) => e.to === id && remaining.has(e.from))).sort(compare);
    // The DFS has removed every cycle; the fallback also tolerates malformed input.
    const id = ready[0] ?? [...remaining].sort(compare)[0];
    order.push(id);
    remaining.delete(id);
  }
  return order;
}

export function layoutWorkflow(
  wf: WorkflowGraph, prev?: WorkflowLayoutState, opts: WorkflowLayoutOptions = {},
): WorkflowLayoutState {
  if (opts.tidy) prev = undefined;
  const old = prev?.workflow;
  const nodes = sorted(wf.nodes);
  const inline = nodes.filter((n) => !n.on);
  const inlineIds = new Set(inline.map((n) => n.id));
  const loops = new Set(workflowLoopIds(wf));
  const edges = sorted(wf.edges);
  const forward = edges.filter((e) => !loops.has(e.id) && inlineIds.has(e.from) && inlineIds.has(e.to));
  const cells: Record<string, WorkflowCell> = {};
  for (const id of Object.keys(old?.cells ?? {}).sort(compare)) cells[id] = { ...old!.cells[id] };
  const roles: WorkflowLayoutState['workflow']['roles'] = {};
  for (const n of nodes) roles[n.id] = n.on ? 'attached' : 'inline';
  for (const n of inline) if (old?.roles[n.id] === 'attached') delete cells[n.id];
  const arrival = [...(old?.arrival ?? [])];
  const branchRows = [...(old?.branchRows ?? [])];
  const moves: WorkflowLayoutState['workflow']['moves'] = [];
  const spliceFrom = new Map<string, string>();
  for (const e of edges) {
    if (opts.op?.t !== 'splice' || opts.op.into !== e.id) continue;
    const before = old?.edges[e.id];
    if (!before || before.from !== e.from || before.to === e.to || !inlineIds.has(e.to)) continue;
    if (!edges.some((half) => half.from === e.to && half.to === before.to && !old?.edges[half.id])) continue;
    delete cells[e.to];
    spliceFrom.set(e.to, e.from);
    const a = cells[e.from];
    const b = cells[before.to];
    if (!a || !b || b.column !== a.column + 1 || b.row !== a.row) continue;
    const reachable = new Set([before.to]);
    const queue = [before.to];
    for (const id of queue) for (const link of forward.filter((link) => link.from === id)) {
      if (!reachable.has(link.to)) { reachable.add(link.to); queue.push(link.to); }
    }
    const rows = new Set([...reachable].filter((id) => cells[id]).map((id) => cells[id].row));
    const column = b.column;
    const shifted = Object.keys(cells).filter((id) => rows.has(cells[id].row) && cells[id].column >= column);
    for (const id of shifted) cells[id].column++;
    moves.push({ reason: 'splice', ids: shifted.sort(compare), dx: W.columnPitch, dy: 0 });
  }
  const order = old ? inline.map((n) => n.id) : topological(inline, forward);
  for (const id of order) {
    if (has(cells, id)) continue;
    const node = wf.nodes[id];
    const incoming = forward.filter((e) => e.to === id && cells[e.from]);
    const last = [...arrival].reverse().find((key) => key !== id && inlineIds.has(key));
    const predecessor = spliceFrom.get(id) ?? incoming[0]?.from ?? (node.after && cells[node.after] ? node.after : last);
    const p = predecessor ? cells[predecessor] : undefined;
    const column = old
      ? node.kind === 'trigger' ? 0 : p ? p.column + 1 : 0
      : Math.max(0, ...incoming.map((e) => cells[e.from].column + 1));
    let row = p?.row ?? 0;
    while (Object.values(cells).some((c) => c.column === column && c.row === row)) row++;
    cells[id] = { column, row };
    while (branchRows.length <= row) branchRows.push(branchRows.length);
    arrival.push(id);
  }

  const stacks: Record<string, string[]> = {};
  const attachmentSlots: Record<string, string[]> = {};
  for (const node of nodes) if (node.on) (stacks[node.on] ??= []).push(node.id);
  for (const host of [...new Set([...Object.keys(old?.attachmentSlots ?? {}), ...Object.keys(stacks)])].sort(compare)) {
    const slots = [...(old?.attachmentSlots[host] ?? [])];
    for (const id of stacks[host] ?? []) if (!slots.includes(id)) slots.push(id);
    attachmentSlots[host] = slots;
  }
  // Collapsed descendants still need cells. Orphans wait for their host instead of inventing an inline position.
  for (const node of nodes.filter((n) => n.on)) {
    let root = node;
    const seen = new Set<string>();
    while (root.on && has(wf.nodes, root.on) && !seen.has(root.id)) {
      seen.add(root.id);
      root = wf.nodes[root.on];
    }
    if (!root.on && cells[root.id]) cells[node.id] = { ...cells[root.id] };
  }
  const cards: Record<string, WorkflowCard> = {};
  const offsets: Record<string, number> = {};
  const attachmentOffsets: Record<string, Record<string, number>> = {};
  for (const root of Object.keys(old?.attachmentOffsets ?? {}).sort(compare)) {
    attachmentOffsets[root] = { ...old!.attachmentOffsets[root] };
  }
  const visited = new Set<string>();
  const measure = opts.measureText ?? ((text: string, px: number) => Array.from(text).length * px);
  const makeCard = (id: string, root: string, offset: number, slot: string, index: number): void => {
    if (visited.has(id)) return;
    visited.add(id);
    const n = wf.nodes[id];
    const cell = cells[root];
    if (!n || !cell) return;
    cells[id] = { ...cell };
    offsets[id] = offset;
    const visible = (attachmentSlots[id] ?? []).filter((key) => stacks[id]?.includes(key)).slice(0, W.visibleAttachments);
    cards[id] = {
      id, kind: 'node', product: n.product ?? '', frame: '', slot, index,
      x: cell.column * W.columnPitch, y: 0, w: G.cardW, h: G.cardH, badges: [],
      title: fitTitle(n.label, measure), hiddenAttached: (stacks[id]?.length ?? 0) - visible.length,
    };
    // New descendants append below occupied slots, including descendants of sibling sub-agents.
    for (const child of visible) {
      const sameCell = (key: string): boolean => cells[key]?.row === cell.row && cells[key]?.column === cell.column;
      const sameHost = prev?.cards[child]?.slot === `${id}#attached`;
      const reserved = attachmentOffsets[root] ??= {};
      const priorOffset = sameHost && prev?.cards[id]
        ? offset + (prev.cards[child].y - prev.cards[id].y) / W.rowPitch : reserved[child];
      const occupied = [
        ...Object.keys(offsets).filter(sameCell).map((key) => offsets[key]),
        ...Object.keys(reserved).filter((key) => key !== child).map((key) => reserved[key]),
      ];
      const childOffset = priorOffset !== undefined && priorOffset > offset && !occupied.includes(priorOffset)
        ? priorOffset : Math.max(offset, ...occupied) + 1;
      reserved[child] = childOffset;
      makeCard(child, root, childOffset, `${id}#attached`, attachmentSlots[id].indexOf(child));
    }
    for (const child of stacks[id] ?? []) if (!has(cells, child)) cells[child] = { ...cell };
  };
  for (const n of inline) makeCard(n.id, n.id, 0, `workflow:${n.id}`, 0);

  const spare = Number.isFinite(opts.spareRows) ? Math.max(0, Math.floor(opts.spareRows!)) : W.spareRows;
  const rowTops = [...(old?.rowTops ?? [])];
  const rowHeights = [...(old?.rowHeights ?? [])];
  for (const row of branchRows) {
    const used = Math.max(0, ...Object.keys(cards).filter((id) => cells[id].row === row).map((id) => offsets[id]));
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, (1 + Math.max(spare, used)) * W.rowPitch + G.head);
    rowTops[row] = Math.max(rowTops[row] ?? 0, row === 0 ? 0 : rowTops[row - 1] + rowHeights[row - 1]);
    const dy = old && row < old.rowTops.length ? rowTops[row] - old.rowTops[row] : 0;
    if (dy > 0) moves.push({ reason: 'overflow', ids: Object.keys(cards).filter((id) => cells[id].row === row).sort(compare), dx: 0, dy });
  }
  for (const id of Object.keys(cards)) cards[id].y = rowTops[cells[id].row] + offsets[id] * W.rowPitch;

  const spans: Record<string, WorkflowSpan[]> = {};
  const frames: Record<string, WorkflowBracket> = {};
  for (const group of sorted(wf.groups)) {
    const members = inline.filter((n) => n.repeat === group.id).sort((a, b) =>
      cells[a.id].row - cells[b.id].row || cells[a.id].column - cells[b.id].column || compare(a.id, b.id));
    const runs: WorkflowSpan[] = [];
    for (const n of members) {
      const c = cells[n.id];
      const last = runs.at(-1);
      if (last && last.row === c.row && last.to + 1 === c.column) { last.to = c.column; last.nodes.push(n.id); }
      else runs.push({ row: c.row, from: c.column, to: c.column, nodes: [n.id] });
    }
    spans[group.id] = runs;
    for (const run of runs) {
      const id = `repeat:${group.id}:${run.row}:${run.nodes[0]}`;
      frames[id] = {
        id, kind: 'lane', label: group.over, parent: null, depth: 0, implicit: false, empty: false,
        x: run.from * W.columnPitch, y: rowTops[run.row] + rowHeights[run.row] - G.head,
        w: (run.to - run.from) * W.columnPitch + G.cardW, h: G.head,
        group: group.id, nodes: [...run.nodes], bracket: true,
      };
    }
  }
  const routes: WorkflowLayoutState['workflow']['routes'] = {};
  const savedEdges: WorkflowLayoutState['workflow']['edges'] = {};
  for (const e of edges) {
    savedEdges[e.id] = { from: e.from, to: e.to };
    routes[e.id] = { loop: loops.has(e.id), backwards: !!cells[e.from] && !!cells[e.to] && cells[e.to].column <= cells[e.from].column };
  }
  const rects: Rect[] = [...Object.values(cards), ...Object.values(frames)];
  const bounds = { x: 0, y: 0, w: Math.max(0, ...rects.map((r) => r.x + r.w)), h: Math.max(0, ...rects.map((r) => r.y + r.h)) };
  const orderedCards = Object.fromEntries(Object.keys(cards).sort(compare).map((id) => [id, cards[id]]));
  return {
    version: 2, mode: 'workflow', width: bounds.w, height: bounds.h, pathY: 0,
    cards: orderedCards, frames, badges: {}, slots: attachmentSlots, shelves: {}, shelfKinds: {}, order: {}, bounds,
    workflow: {
      cells, arrival, roles, branchRows, rowTops, rowHeights, stacks, attachmentSlots, attachmentOffsets,
      spans, edges: savedEdges, routes, moves,
    },
  };
}

export function tidyWorkflow(wf: WorkflowGraph, opts: WorkflowLayoutOptions = {}): WorkflowLayoutState {
  return layoutWorkflow(wf, undefined, opts);
}

/** Fit both axes between the actual title floor and natural size. */
export function workflowViewport(state: WorkflowLayoutState, size: { width: number; height: number }) {
  const titles = Object.values(state.cards).map((c) => c.title.px);
  const floor = W.titleFloorPx / (titles.length ? Math.min(...titles) : G.titlePx);
  const width = Math.max(0, size.width - 2 * G.fitPad);
  const height = Math.max(0, size.height - 2 * G.fitPad);
  const fit = Math.min(1, state.width ? width / state.width : 1, state.height ? height / state.height : 1);
  const zoom = Math.min(1, Math.max(floor, fit));
  return { zoom, panX: state.width * zoom > width, panY: state.height * zoom > height };
}
