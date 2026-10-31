// Requirement state (spec 7.7): Held, Checking, Held by a fix, Not met. Derived from the session record, never stored.
import type { Constraint, Warning } from '@ali/core/types.ts';
import { CONSTRAINT_CODES } from '../stream/events.ts';
import type { RequirementView, ReqState, SessionRecord, TurnWork } from './types.ts';

const key = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

/** True when this warning is about this constraint's kind of rule. */
function concerns(c: Constraint | undefined, w: Warning, productsByNode: (id: string) => string | undefined): boolean {
  if (!c) return false;
  if (w.code === 'constraint-region') return !!c.regions?.length;
  if (w.code === 'constraint-avoid') {
    if (!c.avoid?.length) return false;
    if (!w.ids.length) return true;
    return w.ids.some((id) => {
      const p = productsByNode(id) ?? id;
      return c.avoid!.includes(p);
    });
  }
  return false;
}

/**
 * The pinned requirements with their state. Committed requirements take their state from the newest finished
 * revision: Not met when its commit still carried an error-level constraint warning (At risk for a warning-level one), Held by a fix when a constraint warning
 * appeared mid-turn and the commit no longer had it, Held otherwise. While a revision streams, a requirement with an
 * open constraint warning reads Checking, and requirements pinned in that revision appear at once.
 */
export function requirementViews(session: SessionRecord, work: TurnWork | null): RequirementView[] {
  const mem = session.memory;
  const revs = session.revisions;
  const last = revs[revs.length - 1];
  const inFlight = !!last && (last.status === 'waiting' || last.status === 'streaming') && !!work;
  const doneRev = [...revs].reverse().find((r) => r.status === 'done');
  const constraints = (inFlight && work ? work.constraints : mem.constraints) ?? [];
  const texts = [...mem.requirements];
  if (inFlight && last) for (const t of last.reqs) if (!texts.some((x) => key(x) === key(t))) texts.push(t);
  const productOf = (id: string): string | undefined => mem.graph.nodes[id]?.product;

  return texts.map((text) => {
    const c = constraints.find((x) => key(x.text) === key(text));
    const pinnedIn = session.reqPinnedIn[text] ?? (last ? last.n : 1);
    let state: ReqState = 'held';
    let stateRev: number | null = null;
    if (doneRev && c) {
      const open = doneRev.commitWarnings.filter((w) => CONSTRAINT_CODES.has(w.code) && concerns(c, w, productOf));
      if (open.some((w) => w.severity === 'error')) {
        state = 'broken';
        stateRev = doneRev.n;
      } else if (open.length) {
        state = 'atRisk';
        stateRev = doneRev.n;
      } else if (doneRev.fix.constraint.some((w) => concerns(c, w, productOf))) {
        state = 'repaired';
        stateRev = doneRev.n;
      }
    }
    if (inFlight && last && c && last.fix.constraint.some((w) => concerns(c, w, productOf))) {
      state = 'checking';
      stateRev = last.n;
    }
    const latestN = inFlight && last ? last.n : doneRev ? doneRev.n : 0;
    return { text, state, pinnedIn, stateRev, regions: c?.regions ? [...c.regions] : [], avoid: c?.avoid ? [...c.avoid] : [], isNew: pinnedIn === latestN && latestN > 0 };
  });
}

/** Removes a requirement and its constraint from a memory (unpin). Pure. */
export function unpinFrom<M extends { requirements: string[]; constraints?: Constraint[] }>(memory: M, text: string): M {
  const requirements = memory.requirements.filter((t) => key(t) !== key(text));
  const out: M = { ...memory, requirements };
  if (memory.constraints) {
    const constraints = memory.constraints.filter((c) => key(c.text) !== key(text));
    if (constraints.length) out.constraints = constraints;
    else delete out.constraints;
  }
  return out;
}
