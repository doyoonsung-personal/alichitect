// Derived views over AppState. Pure, and cheap enough to call from a render. Components get these through the hooks in
// app/contracts.ts; they are separate here so they can be tested with plain states.
import type { AppState, ConnMode, Revision, SessionRecord } from './types.ts';
import { requirementViews } from './requirements.ts';
import type { RequirementView } from './types.ts';

export function latestDone(session: SessionRecord): Revision | undefined {
  for (let i = session.revisions.length - 1; i >= 0; i--) if (session.revisions[i].status === 'done') return session.revisions[i];
  return undefined;
}

/** Ids of cards the streaming revision has added or changed and that are drawn now: they carry the BuildMark. */
export function buildMarks(s: AppState): string[] {
  const l = s.display.layout;
  if (!s.work || !l) return [];
  return s.work.built.filter((id) => Object.hasOwn(l.cards, id) || Object.hasOwn(l.badges, id));
}

/** The revision whose number the cards carry: the latest committed one, and only while no revision is streaming. */
export function taggedRevision(s: AppState): { n: number; cards: string[] } | null {
  if (s.work) return null;
  const rev = latestDone(s.session);
  return rev ? { n: rev.n, cards: rev.cards } : null;
}

/** Products drawn: cards, badges and recommendations in the display graph. */
export function productCount(s: AppState): number {
  const g = s.display.graph;
  return Object.keys(g.nodes).length + g.recs.length;
}

export function headerMode(s: AppState): ConnMode {
  return s.replay ? 'replay' : s.conn.mode;
}

export function requirements(s: AppState): RequirementView[] {
  return requirementViews(s.session, s.work);
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
