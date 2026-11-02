// Derived views over AppState. Pure, and cheap enough to call from a render. Components get these through the hooks in
// app/contracts.ts; they are separate here so they can be tested with plain states.
import type { Catalog, Graph, TurnMode, WorkflowGraph } from '@ali/core/types.ts';
import type { AppState, ChangeLine, Highlight, ConnMode, Revision, SessionRecord } from './types.ts';
import { requirementViews } from './requirements.ts';
import type { RequirementView } from './types.ts';

export function latestDone(session: SessionRecord): Revision | undefined {
  for (let i = session.revisions.length - 1; i >= 0; i--) if (session.revisions[i].status === 'done') return session.revisions[i];
  return undefined;
}

/** Ids of cards the streaming revision has added or changed and that are drawn now: they carry the BuildMark. */
export function buildMarks(s: AppState): string[] {
  const l = s.display.layout;
  if (!s.work || !l || s.work.mode === 'workflow') return [];
  return s.work.built.filter((id) => Object.hasOwn(l.cards, id) || Object.hasOwn(l.badges, id));
}

/** The revision whose number the cards carry: the latest committed one, and only while no revision is streaming. */
export function taggedRevision(s: AppState): { n: number; cards: string[]; view?: TurnMode } | null {
  if (s.work) return null;
  const rev = [...s.session.revisions].reverse().find((r) => r.status === 'done'
    && (r.mode ?? 'cloud') === (s.session.mode ?? 'cloud'));
  return rev ? { n: rev.n, cards: rev.cards, ...(rev.mode ? { view: rev.mode } : {}) } : null;
}

/** Products drawn: cards, badges and recommendations in the display graph. */
export function productCount(s: AppState): number {
  if (s.session?.mode === 'workflow') return Object.keys(s.workflowDisplay.graph.nodes).length;
  const g = s.display.graph;
  return Object.keys(g.nodes).length + g.recs.length;
}

export function headerMode(s: AppState): ConnMode {
  return s.replay ? 'replay' : s.conn.mode;
}

export function requirements(s: AppState, catalog?: Catalog): RequirementView[] {
  return requirementViews(s.session, s.work, catalog);
}

export interface SummaryView {
  /** The last revision folded into the summary. */
  through: number;
  text: string | null;
  summarizing: boolean;
}

export function summaryView(s: AppState): SummaryView | null {
  const sess = s.session;
  if (!sess.memory.summary && !sess.summarizing) return null;
  return { through: sess.summarizedThrough, text: sess.memory.summary ?? null, summarizing: sess.summarizing };
}

/** The graph is a solution map: recommendations and no infrastructure. */
export function isSolutionMap(s: AppState): boolean {
  return s.display.layout?.mode === 'solution';
}

export function isStreaming(s: AppState): boolean {
  return s.turn.phase === 'waiting' || s.turn.phase === 'streaming' || s.turn.phase === 'fallback' || s.turn.phase === 'repairing';
}

export function lastRevision(s: AppState): Revision | undefined {
  return s.session.revisions[s.session.revisions.length - 1];
}

export function activeDocument(s: AppState): { view: 'cloud'; graph: Graph } | { view: 'workflow'; graph: WorkflowGraph } {
  return s.session.mode === 'workflow'
    ? { view: 'workflow', graph: s.workflowDisplay.graph }
    : { view: 'cloud', graph: s.display.graph };
}

export function activeNodeCount(s: AppState): number {
  return Object.keys(activeDocument(s).graph.nodes).length;
}

export function canExport(s: AppState): boolean {
  const m = s.session.memory;
  return Object.keys(m.graph.nodes).length > 0 || m.graph.recs.length > 0 || Object.keys(m.workflow?.nodes ?? {}).length > 0;
}

export function activeProvenance(s: AppState): SessionRecord['provenance'] {
  return s.session.mode === 'workflow' ? s.session.workflowProvenance ?? {} : s.session.provenance;
}

export function highlightChange(line: ChangeLine): Highlight {
  return { source: 'line', view: line.view ?? 'cloud', cards: line.cards, ghosts: line.ghosts };
}

export function activeHighlight(s: AppState): Highlight | null {
  const h = s.ui.highlight;
  return h && (h.view ?? 'cloud') === (s.session.mode ?? 'cloud') ? h : null;
}

export function activePan(s: AppState): AppState['ui']['panTo'] {
  const pan = s.ui.panTo;
  return pan && (pan.view ?? 'cloud') === (s.session.mode ?? 'cloud') ? pan : null;
}
