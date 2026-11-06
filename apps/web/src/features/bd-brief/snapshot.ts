// The thin pure layer between a committed SessionRecord and the frozen BriefSnapshot contract
// (plan §4 rule 2: adapters return copies, never mutable references). Kept separate from
// host-adapter.ts so the extraction rules are unit-testable without a store.
//
// Deterministic statement order (documented choice): pinned requirements first (ids 'rq-<i>',
// i = index in memory.requirements), then user turns in chronological order (ids 'st-<n>',
// n = the turn's index in memory.turns, so assistant turns consume numbers and ids stay stable
// within a snapshot). Most recent entries sit last; when the combined list exceeds
// LIMITS.statements the OLDEST entries are dropped (a tail slice), never the newest.
import type { SessionRecord } from '../../store/types.ts';
import type { BriefSnapshot, Lang, SnapshotCapability, SnapshotPricing, SnapshotStatement, SnapshotDesign } from '@ali/bd-brief/types.ts';
import { BD_BRIEF_SCHEMA_VERSION, LIMITS } from '@ali/bd-brief/types.ts';
import { pricingDesignKey } from '@ali/core/solution-pricing.ts';
import { needsApproval } from '@ali/core/approval.ts';

export interface CatalogLookups {
  /** The catalog's current name for a product id; null when the id is unknown. */
  nameOf(productId: string): string | null;
}

export interface SnapshotOpts {
  lang: Lang;
  objective: string | null;
  /** Epoch ms; never fingerprinted (contract comment on BriefSnapshot.capturedAt). */
  now: number;
}

const cut = (text: string, max: number): string => (text.length > max ? text.slice(0, max) : text);

export function buildSnapshot(session: SessionRecord, catalogLookups: CatalogLookups, opts: SnapshotOpts): BriefSnapshot {
  const mem = session.memory;

  const statements: SnapshotStatement[] = [];
  (mem.requirements ?? []).forEach((text, i) => {
    if (text.trim()) statements.push({ id: `rq-${i}`, text: cut(text, LIMITS.statementChars) });
  });
  mem.turns.forEach((turn, n) => {
    if (turn.role === 'user' && turn.text.trim()) statements.push({ id: `st-${n}`, text: cut(turn.text, LIMITS.statementChars) });
  });

  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    sourceKind: 'browser-session',
    sourceKey: session.id,
    sourceRevision: session.revisions.reduce((latest, revision) => Math.max(latest, revision.n), 0),
    suppliedBy: 'signed-in-user',
    capturedAt: opts.now,
    lang: opts.lang,
    objective: opts.objective && opts.objective.trim() ? cut(opts.objective.trim(), LIMITS.objectiveChars) : null,
    statements: statements.slice(-LIMITS.statements),
    design: buildDesign(session, catalogLookups),
    pricing: buildPricing(session),
  };
}

/** Cloud and workflow evidence share one bounded summary; no live host reference escapes. */
function buildDesign(session: SessionRecord, catalogLookups: CatalogLookups): SnapshotDesign | null {
  const mem = session.memory;
  const nodes = Object.values(mem.graph?.nodes ?? {});
  const workflow = mem.workflow;
  const steps = Object.values(workflow?.nodes ?? {});
  if (nodes.length === 0 && steps.length === 0) return null;

  // distinct product ids in node order; an unknown id keeps the id as its name rather than vanishing
  const seen = new Set<string>();
  const capabilities: SnapshotCapability[] = [];
  for (const id of [...nodes.map(node => node.product), ...steps.flatMap(node => [node.product, node.runs])]) {
    if (!id || seen.has(id)) continue;
    if (id === 'customer') continue;
    seen.add(id);
    capabilities.push({ id, name: catalogLookups.nameOf(id) ?? id });
    if (capabilities.length >= LIMITS.capabilities) break;
  }

  const boundaries = [
    ...steps.filter(step => needsApproval(step, mem.workflowSettings)).map(step => `Approval required before ${step.id}: ${step.label}${step.effect ? `; effect ${step.effect}` : ''}`),
    ...steps.filter(step => step.runs === 'customer').map(step => `Customer-managed runtime boundary: ${step.id}: ${step.label}`),
    ...(mem.constraints ?? []).map(constraint => constraint.text),
  ].map(text => cut(text, LIMITS.boundaryChars))
    .filter((t) => t.trim())
    .slice(0, LIMITS.boundaries);

  return {
    summary: cut([
      ...Object.values(workflow?.edges ?? {}).filter(edge => edge.outcome || edge.kind === 'loop')
        .map(edge => `Workflow route: ${edge.from} -> ${edge.to}; ${edge.kind ?? 'flow'}; ${edge.outcome ?? ''}${edge.max ? `; max ${edge.max}` : ''}`),
      ...steps.map(step => `Workflow step ${step.id}: ${step.label} [${step.kind}]${step.subject ? `; subject ${step.subject}` : ''}; effective approval ${needsApproval(step, mem.workflowSettings) ? 'required' : 'not-required'}${step.effect ? `; effect ${step.effect}` : ''}${step.runs ? `; runtime ${step.runs}` : ''}${step.ai ? `; selected model ${step.ai}` : ''}`),
      mem.summary ?? '',
    ].filter(Boolean).join('\n'), LIMITS.designSummaryChars),
    capabilities,
    boundaries,
  };
}

/**
 * Pricing evidence (plan §6): exact figures only when the stored estimate still belongs to the
 * current design. The freshness rule is the SAME one export/model.ts uses — the pure core helper
 * pricingDesignKey(memory) — so a stale estimate is never reprinted as a current price. Figures
 * are copied from the stored estimate verbatim; nothing is recomputed or reformatted here.
 */
function buildPricing(session: SessionRecord): SnapshotPricing {
  const pricing = session.pricing;
  if (!pricing) return { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null };
  if (pricing.designKey !== pricingDesignKey(session.memory)) {
    return { status: 'stale', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null };
  }
  return {
    status: 'current',
    currency: 'USD',
    monthlyUsd: pricing.estimate?.monthlyUsd ?? null,
    oneTimeUsd: pricing.estimate?.oneTimeUsd ?? null,
    source: 'session-pricing',
  };
}
