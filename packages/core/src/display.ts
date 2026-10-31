// Display rules: what the canvas draws while a turn streams. The session truth is fixed: during a turn the browser
// shows displayGraph(working raw graph) = holdBack(repairGraph(raw)), and at turn end the repaired graph is committed
// (memory.graph) and sent to the model on the next turn. holdBack() only acts while the turn is open, so at turn end
// the display is exactly the committed graph. Moved here from spikes/canvas/src/replay/pipeline.ts. Pure, browser-safe.
import type { Catalog, Graph, GraphNode, Op } from './types.ts';
import { repairGraph } from './validate.ts';
import type { RepairOptions, RepairResult } from './validate.ts';

export interface DisplayState {
  /** False for the closing batch (done or end of stream): nothing is held back, so the display equals the commit. */
  turnOpen: boolean;
  /** Card ids drawn right now (the previous display); undefined before anything has been drawn. */
  drawn?: ReadonlySet<string>;
  /** Card ids drawn when the turn started. */
  shownAtTurnStart: ReadonlySet<string>;
  /** Ids this turn's ops named as their own subject (see touchedBy). */
  touched: ReadonlySet<string>;
}

export interface DisplayResult {
  /** What the canvas draws. */
  graph: Graph;
  /** Cards held back in this batch. */
  held: string[];
  /** The repaired graph (what would be committed if the turn ended now) and the repair's warnings. */
  repair: RepairResult;
}

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

/** A node drawn as a card: not a badge or attachment riding on an existing host. */
export function isCard(g: Graph, n: GraphNode): boolean {
  return !n.attachTo || !has(g.nodes, n.attachTo);
}

/** Ids of the nodes drawn as cards. */
export function cardIds(g: Graph): string[] {
  return Object.values(g.nodes).filter((n) => isCard(g, n)).map((n) => n.id);
}

/**
 * The ids an op names as its own subject: node, insert and move ids, and a rec's product. Only these count as touched:
 * a badge whose host was removed, or a replica uncovered by a removal, is changed by the op but is not its subject.
 */
export function touchedBy(op: Op): string[] {
  if (op.t === 'node' || op.t === 'insert' || op.t === 'move') return [op.id];
  if (op.t === 'rec') return [op.product];
  return [];
}

/**
 * No flash mid-turn: while the turn is open, a card that was not drawn when the turn started, is not drawn now, and was
 * not named by this turn's ops is held back until the turn ends. Without this, removing the surviving node of merged
 * replicas briefly shows the hidden replica (B3 removes the multi-zone ecs-a first, uncovering ecs-b), and a badge
 * orphaned by its host's removal briefly becomes a card. Edges to held cards are held too. A no-op when the turn is
 * closed or nothing has been drawn yet.
 */
export function holdBack(g: Graph, state: DisplayState): { graph: Graph; held: string[] } {
  if (!state.turnOpen || !state.drawn) return { graph: g, held: [] };
  const drawn = state.drawn;
  const held: string[] = [];
  for (const n of Object.values(g.nodes)) {
    if (isCard(g, n) && !state.shownAtTurnStart.has(n.id) && !state.touched.has(n.id) && !drawn.has(n.id)) held.push(n.id);
  }
  if (!held.length) return { graph: g, held };
  const gone = new Set(held);
  const nodes: Graph['nodes'] = {};
  for (const [id, n] of Object.entries(g.nodes)) if (!gone.has(id)) nodes[id] = n;
  const edges: Graph['edges'] = {};
  for (const [id, e] of Object.entries(g.edges)) if (!gone.has(e.from) && !gone.has(e.to)) edges[id] = e;
  return { graph: { ...g, nodes, edges }, held };
}

/**
 * The display graph for the working raw graph: repairGraph (with keepInline and the pinned constraints in `opts`, so
 * nodes the user keeps in the path are never turned into badges), then holdBack. At turn end (turnOpen false) the
 * result's graph is repair.graph, the graph to commit.
 */
export function displayGraph(raw: Graph, catalog: Catalog, state: DisplayState, opts: RepairOptions = {}): DisplayResult {
  const repair = repairGraph(raw, catalog, opts);
  const { graph, held } = holdBack(repair.graph, state);
  return { graph, held, repair };
}
