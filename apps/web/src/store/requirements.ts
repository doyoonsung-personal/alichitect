// Requirement state (spec 7.7): Held, Checking, Held by a fix, Not met. Derived from the session record, never stored.
import type { Catalog, Constraint, TurnMode, Warning } from '@ali/core/types.ts';
import { avoidedProducts } from '@ali/core/constraints.ts';
import { CONSTRAINT_CODES } from '../stream/events.ts';
import type { RequirementView, ReqState, SessionRecord, TurnWork } from './types.ts';

const key = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

/** True when this warning is about this constraint's kind of rule. */
function concerns(c: Constraint | undefined, w: Warning, products: (id: string, w: Warning) => string[], catalog?: Catalog): boolean {
  if (!c) return false;
  if (w.code === 'constraint-region') return !!c.regions?.length;
  if (w.code !== 'constraint-avoid' || !c.avoid?.length) return false;
  if (!w.ids.length) return true;
  const avoid = w.view === 'workflow' ? avoidedProducts([c], catalog) : new Set(c.avoid);
  return w.ids.some((id) => products(id, w).some((product) => {
    if (avoid.has(product)) return true;
    if (w.view !== 'workflow' || !catalog) return false;
    try { return avoid.has((catalog.byId.get(product) ?? catalog.resolve(product).entry)?.id ?? product); }
    catch { return false; }
  }));
}

/** Each document retains its last finished findings until a turn in that view supersedes them. */
export function requirementViews(session: SessionRecord, work: TurnWork | null, catalog?: Catalog): RequirementView[] {
  const mem = session.memory;
  const revs = session.revisions;
  const last = revs[revs.length - 1];
  const inFlight = !!last && (last.status === 'waiting' || last.status === 'streaming') && !!work;
  const done = [...revs].reverse().filter((r) => r.status === 'done');
  const latest = (['cloud', 'workflow'] as TurnMode[]).map((view) => done.find((r) => (r.mode ?? 'cloud') === view));
  const constraints = (inFlight && work ? work.constraints : mem.constraints) ?? [];
  const texts = [...mem.requirements];
  if (inFlight && last) for (const t of last.reqs) if (!texts.some((x) => key(x) === key(t))) texts.push(t);
  const products = (streaming: boolean) => (id: string, w: Warning): string[] => {
    if (w.view !== 'workflow') return [mem.graph.nodes[id]?.product ?? id];
    const node = (streaming && work ? work.rawWorkflow : mem.workflow)?.nodes[id];
    // A repaired step can change product or disappear; the core finding retains the ruled-out product.
    const warnedProduct = /\buses ([a-z0-9-]+),/.exec(w.msg)?.[1];
    return [node?.product, node?.runs, warnedProduct].filter((p): p is string => !!p);
  };
  const rank: Record<ReqState, number> = { held: 0, repaired: 1, atRisk: 2, broken: 3, checking: 4 };
  return texts.map((text) => {
    const c = constraints.find((x) => key(x.text) === key(text));
    const pinnedIn = session.reqPinnedIn[text] ?? (last ? last.n : 1);
    let state: ReqState = 'held';
    let stateRev: number | null = null;
    for (const rev of latest) {
      if (!rev || !c) continue;
      const matches = (w: Warning) => (w.view ?? 'cloud') === (rev.mode ?? 'cloud') && concerns(c, w, products(false), catalog);
      const open = rev.commitWarnings.filter((w) => CONSTRAINT_CODES.has(w.code) && matches(w));
      const candidate: ReqState = open.some((w) => w.severity === 'error') ? 'broken'
        : open.length ? 'atRisk' : rev.fix.constraint.some(matches) ? 'repaired' : 'held';
      if (rank[candidate] > rank[state] || (candidate !== 'held' && rank[candidate] === rank[state] && rev.n > (stateRev ?? 0))) {
        state = candidate;
        stateRev = rev.n;
      }
    }
    if (inFlight && last && c && last.fix.constraint.some((w) =>
      (w.view ?? 'cloud') === (last.mode ?? 'cloud') && concerns(c, w, products(true), catalog))) {
      state = 'checking';
      stateRev = last.n;
    }
    const latestN = inFlight && last ? last.n : done[0]?.n ?? 0;
    return { text, state, pinnedIn, stateRev, regions: c?.regions ? [...c.regions] : [],
      avoid: c?.avoid ? [...c.avoid] : [], isNew: pinnedIn === latestN && latestN > 0 };
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
