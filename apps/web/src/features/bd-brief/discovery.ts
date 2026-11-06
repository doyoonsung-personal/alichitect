import type { BriefSnapshot, Lang } from '@ali/bd-brief/types.ts';
import { BD_BRIEF_SCHEMA_VERSION, LIMITS } from '@ali/bd-brief/types.ts';

/** No host-session input: a first meeting may start with nothing known. */
export function discoverySnapshot(sourceKey: string, lang: Lang, context: string, now: number): BriefSnapshot {
  const text = context.trim().slice(0, LIMITS.statementChars);
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION, sourceKind: 'discovery', sourceKey, sourceRevision: 0,
    suppliedBy: 'signed-in-user', capturedAt: now, lang, objective: null,
    statements: text ? [{ id: 'discovery-context', text }] : [], design: null,
    pricing: { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null },
  };
}
