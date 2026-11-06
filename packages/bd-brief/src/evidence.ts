// Deterministic evidence handling (plan §6): canonical JSON, a non-crypto snapshot
// fingerprint for staleness detection, the valid evidence-id set and a tolerant
// snapshot coercion used by host adapters. Pure and platform-neutral: no clock,
// no randomness, no node built-ins (browser + worker safe).

import type { BriefNote, BriefSnapshot, SnapshotCapability, SnapshotDesign, SnapshotPricing, SnapshotStatement } from './types.ts';
import { BD_BRIEF_SCHEMA_VERSION, EVIDENCE_DESIGN, EVIDENCE_OBJECTIVE, EVIDENCE_PRICING, LIMITS } from './types.ts';

/** Stable key-ordered JSON (arrays keep order). Key order must not change the
 * fingerprint of otherwise identical evidence, so every object is serialized
 * with sorted keys. */
export function canonicalJson(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  const t = typeof v;
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'number') return Number.isFinite(v) ? JSON.stringify(v) : 'null';
  if (t === 'string') return JSON.stringify(v);
  if (t === 'bigint') return JSON.stringify(String(v));
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (t === 'object') {
    const rec = v as Record<string, unknown>;
    const keys = Object.keys(rec)
      .filter((k) => rec[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(',')}}`;
  }
  // functions/symbols never appear in the contracts; serialize like JSON.stringify(undefined).
  return 'null';
}

/** FNV-1a 64-bit over UTF-8 bytes, as a zero-padded hex string. Deterministic
 * and non-crypto on purpose: the fingerprint only detects source changes for one
 * owner's brief, it is never a security boundary. BigInt keeps the 64-bit math
 * exact without node built-ins. */
function fnv1a64Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let h = 0xcbf29ce484222325n;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

/** Deterministic fingerprint over ONLY the source-evidence fields: the conversation
 * statements, the design and the pricing status/figures, keyed by source and revision.
 *
 * Deliberately excluded, because none of them is a change in the SOURCE (plan §6:
 * "A changed title or opened menu should not make the brief stale"):
 * - capturedAt: re-capturing the same committed state must not look like a change.
 * - objective: the BD's own meeting objective, entered per preparation. The staleness
 *   check re-captures from live state without it, so hashing it would leave every
 *   brief prepared with an objective permanently marked stale.
 * - lang: switching the UI language is not a source change either. */
export function snapshotFingerprint(s: BriefSnapshot): string {
  return fnv1a64Hex(
    canonicalJson({
      sourceKind: s.sourceKind,
      sourceKey: s.sourceKey,
      sourceRevision: s.sourceRevision,
      statements: s.statements,
      design: s.design,
      pricing: s.pricing,
    }),
  );
}

/** The evidence ids a generated item may reference: every snapshot statement id,
 * every selected note id, plus the reserved whole-object references. EVIDENCE_PRICING
 * is always valid because the pricing STATUS is itself evidence ('missing'/'stale'
 * are facts the brief may cite); objective/design ids exist only when the data does. */
export function evidenceIds(snapshot: BriefSnapshot, notes: BriefNote[]): Set<string> {
  const ids = new Set<string>();
  for (const st of snapshot.statements) ids.add(st.id);
  for (const n of notes) ids.add(n.id);
  if (snapshot.objective !== null && snapshot.objective.trim().length > 0) ids.add(EVIDENCE_OBJECTIVE);
  if (snapshot.design !== null) ids.add(EVIDENCE_DESIGN);
  ids.add(EVIDENCE_PRICING);
  return ids;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function toTrimmed(v: unknown, maxChars: number): string | null {
  const s = toStr(v);
  if (s === null) return null;
  const trimmed = s.trim();
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;
}

function toNonNegativeNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

const LANG_VALUES: readonly string[] = ['en', 'ko', 'zh'];
const PRICING_STATUSES: readonly string[] = ['missing', 'current', 'stale'];

function normalizePricing(raw: unknown): SnapshotPricing {
  const missing: SnapshotPricing = { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null };
  if (!isRecord(raw)) return missing;
  const status = toStr(raw.status);
  if (status === null || !PRICING_STATUSES.includes(status)) return missing;
  const typedStatus = status as SnapshotPricing['status'];
  // Exact figures only when current: a stale/missing estimate must never carry
  // numbers that could be reprinted as a live price (plan §6).
  if (typedStatus !== 'current') {
    return { status: typedStatus, currency: null, monthlyUsd: null, oneTimeUsd: null, source: null };
  }
  const figure = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  return {
    status: 'current',
    currency: raw.currency === 'USD' ? 'USD' : null,
    monthlyUsd: figure(raw.monthlyUsd),
    oneTimeUsd: figure(raw.oneTimeUsd),
    source: toTrimmed(raw.source, 200),
  };
}

function normalizeDesign(raw: unknown): SnapshotDesign | null {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw)) return null;
  const capabilities: SnapshotCapability[] = [];
  if (Array.isArray(raw.capabilities)) {
    for (const c of raw.capabilities) {
      if (capabilities.length >= LIMITS.capabilities) break; // deterministic selection: keep the first N
      if (!isRecord(c)) continue;
      const id = toTrimmed(c.id, 128);
      const name = toTrimmed(c.name, LIMITS.itemChars);
      if (id && name) capabilities.push({ id, name });
    }
  }
  const boundaries: string[] = [];
  if (Array.isArray(raw.boundaries)) {
    for (const b of raw.boundaries) {
      if (boundaries.length >= LIMITS.boundaries) break;
      const text = toTrimmed(b, LIMITS.boundaryChars);
      if (text) boundaries.push(text); // boundaries must survive normalization (plan §8)
    }
  }
  return {
    summary: toTrimmed(raw.summary, LIMITS.designSummaryChars) ?? '',
    capabilities,
    boundaries,
  };
}

/** Tolerant coercion used by host adapters: trims strings, drops empty/duplicate
 * statements, caps arrays and lengths at LIMITS (keeping the MOST RECENT statements,
 * i.e. the tail of the array, up to the cap) and returns null when the shape is
 * unusable. Never throws: a bad adapter input must degrade to "no snapshot",
 * not crash the feature or the host app. */
export function normalizeSnapshot(input: unknown): BriefSnapshot | null {
  if (!isRecord(input)) return null;
  const sourceKey = toTrimmed(input.sourceKey, 512);
  if (!sourceKey) return null; // without a grouping key nothing can be stored or found
  const langRaw = toStr(input.lang);
  const lang = (langRaw !== null && LANG_VALUES.includes(langRaw) ? langRaw : 'en') as BriefSnapshot['lang'];

  const statements: SnapshotStatement[] = [];
  const seenIds = new Set<string>();
  if (Array.isArray(input.statements)) {
    // Deterministic selection under the cap: the tail is the most recent evidence.
    const start = Math.max(0, input.statements.length - LIMITS.statements);
    for (let i = start; i < input.statements.length; i++) {
      const raw = input.statements[i];
      if (!isRecord(raw)) continue;
      const id = toTrimmed(raw.id, 128);
      const text = toTrimmed(raw.text, LIMITS.statementChars);
      if (!id || !text) continue; // empty statements carry no evidence
      if (seenIds.has(id)) continue; // duplicate ids would corrupt evidence references
      seenIds.add(id);
      statements.push({ id, text });
    }
  }

  const objective = toTrimmed(input.objective, LIMITS.objectiveChars);
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    sourceKind: 'browser-session', // only source kind in the first release; adapters cannot widen it
    sourceKey,
    sourceRevision: Math.floor(toNonNegativeNumber(input.sourceRevision, 0)),
    suppliedBy: 'signed-in-user', // a browser snapshot is always user-supplied (plan §6)
    capturedAt: Math.floor(Math.min(toNonNegativeNumber(input.capturedAt, 0), 8_640_000_000_000_000)),
    lang,
    objective: objective && objective.length > 0 ? objective : null,
    statements,
    design: normalizeDesign(input.design),
    pricing: normalizePricing(input.pricing),
  };
}
