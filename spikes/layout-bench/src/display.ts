// What the canvas draws while a turn streams: the display rule over repairGraph(working).
//
// displayDuringTurn() is the one place the bench takes that rule from. It now calls the core rule
// (packages/core/src/display.ts, displayGraph with the turn open). spikeDisplay() below is the local copy of the
// spike's rule (spikes/canvas/src/replay/pipeline.ts, displayOf) that the bench used until core landed; it is kept for
// the equivalence check in test/pipeline.test.ts. One deliberate change from the spike, shared with core: "was a card
// in the previous frame" is read from the previous display graph instead of the previous LayoutState, so the replay
// trace does not depend on the layout under test (every layout draws each card node of the display graph).
import { repairGraph } from '../../../packages/core/src/validate.ts';
import { displayGraph } from '../../../packages/core/src/display.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';

export interface DisplayArgs {
  /** The reducer graph of the open turn (not repaired). */
  working: Graph;
  catalog: Catalog;
  /** Node ids drawn as cards in the previous display graph; null when nothing was drawn yet (no hold-back then). */
  prevCards: ReadonlySet<string> | null;
  /** Node ids drawn as cards when the turn started. */
  shownAtTurnStart: ReadonlySet<string>;
  /** Node ids this turn's ops named (node, insert, move subjects; rec products). */
  touched: ReadonlySet<string>;
  /** Nodes kept inline in the request path (WAF in CNAME mode); the spike's rule 1. Empty in the bench. */
  keepInline?: ReadonlySet<string>;
}

export interface DisplayResult {
  graph: Graph;
  /** Cards held back this frame because they would only flash in and out. */
  held: string[];
}

/** Node ids drawn as cards (not attached to a host that exists). */
export function cardIds(g: Graph): Set<string> {
  const out = new Set<string>();
  for (const n of Object.values(g.nodes)) if (!n.attachTo || !Object.hasOwn(g.nodes, n.attachTo)) out.add(n.id);
  return out;
}

/** The display graph for one frame of an open turn. */
export function displayDuringTurn(a: DisplayArgs): DisplayResult {
  const r = displayGraph(a.working, a.catalog, { turnOpen: true, drawn: a.prevCards ?? undefined, shownAtTurnStart: a.shownAtTurnStart, touched: a.touched }, { keepInline: a.keepInline });
  return { graph: r.graph, held: r.held }; // the spike's rule instead: return spikeDisplay(a);
}

/**
 * The spike's rule. 1. keepInline nodes skip repair's attach-inline rule. 2. No resurrection mid-turn: a node that
 * was not a card at the start of the turn, was not touched by this turn's ops and was not a card in the previous
 * frame does not become a card until the turn ends (removing a merged replica would otherwise flash the hidden one).
 */
export function spikeDisplay(a: DisplayArgs): DisplayResult {
  const inlineSet = a.keepInline ?? new Set<string>();
  let raw = a.working;
  const inline = [...inlineSet].filter((id) => Object.hasOwn(raw.nodes, id));
  if (inline.length) {
    const nodes = { ...raw.nodes };
    const edges = { ...raw.edges };
    for (const id of inline) delete nodes[id];
    for (const [eid, e] of Object.entries(edges)) if (inline.includes(e.from) || inline.includes(e.to)) delete edges[eid];
    raw = { ...raw, nodes, edges };
  }
  const rep = repairGraph(raw, a.catalog).graph;
  let g: Graph = rep;
  if (inline.length) {
    const nodes = { ...rep.nodes };
    const edges = { ...rep.edges };
    for (const id of inline) {
      const n = { ...a.working.nodes[id] };
      delete n.attachTo;
      nodes[id] = n;
    }
    const exists = (id: string): boolean => Object.hasOwn(nodes, id) || rep.recs.some((r) => r.product === id);
    for (const [eid, e] of Object.entries(a.working.edges)) if ((inline.includes(e.from) || inline.includes(e.to)) && exists(e.from) && exists(e.to)) edges[eid] = e;
    g = { ...rep, nodes, edges };
  }
  const held: string[] = [];
  const prev = a.prevCards;
  if (!prev) return { graph: g, held };
  const nodes = { ...g.nodes };
  for (const n of Object.values(g.nodes)) {
    const isCard = !n.attachTo || !Object.hasOwn(g.nodes, n.attachTo);
    if (isCard && !a.shownAtTurnStart.has(n.id) && !a.touched.has(n.id) && !prev.has(n.id)) {
      delete nodes[n.id];
      held.push(n.id);
    }
  }
  if (held.length) {
    const edges = Object.fromEntries(Object.entries(g.edges).filter(([, e]) => !held.includes(e.from) && !held.includes(e.to)));
    g = { ...g, nodes, edges };
  }
  return { graph: g, held };
}
