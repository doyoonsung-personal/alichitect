// BD meeting brief module: versioned domain contracts shared by the web feature
// (apps/web/src/features/bd-brief), the worker feature (apps/worker/src/features/bd-brief)
// and this package's engine/validation code.
//
// Dependency rules (plan §4):
// - This package imports nothing: no React, no Worker bindings, no SessionRecord.
// - Existing design, pricing, report and MCP modules never import bd-brief.
// - Every persisted or transported contract carries schemaVersion and is validated
//   at the boundary (validate.ts). Host adapters translate app state into these
//   contracts and always return copies, never mutable references.
//
// Editorial rule that shapes every content type (plan §2): never invent a budget,
// buying intent, urgency, economic buyer, competitor, savings figure, probability of
// closing or an agreed next step. Unknown stays unknown.

/** Bumped only together with a reviewed migration of stored briefs. */
export const BD_BRIEF_SCHEMA_VERSION = 1;

export type BriefSchemaVersion = 1;

/** UI and stored-content languages; matches the app's Lang union. */
export type Lang = 'en' | 'ko' | 'zh';

// ---------------------------------------------------------------------------
// Evidence and input snapshot (plan §6)
// ---------------------------------------------------------------------------

/** Discovery belongs to the BD module and does not require an architecture session. */
export type BriefSourceKind = 'browser-session' | 'discovery';

/** Reserved evidence ids. Per-item evidence ids are the raw snapshot statement ids
 * and saved note ids; these three cover the whole-objective/design/pricing references. */
export const EVIDENCE_OBJECTIVE = 'objective';
export const EVIDENCE_DESIGN = 'design';
export const EVIDENCE_PRICING = 'pricing';

/** A customer statement carried in the snapshot; the id is stable within the snapshot. */
export interface SnapshotStatement {
  id: string;
  text: string;
}

/** A catalog capability selected in the proposed design and relevant to the brief. */
export interface SnapshotCapability {
  id: string;
  name: string;
}

/** The proposed design, summarized deterministically by the host snapshot adapter. */
export interface SnapshotDesign {
  summary: string;
  capabilities: SnapshotCapability[];
  /** Approval gates and external-system boundaries; these must survive summarization (plan §8). */
  boundaries: string[];
}

/** Pricing evidence. Exact figures appear only when status is 'current' (plan §6):
 * a stale estimate is never reprinted as a current price, and the model never
 * recalculates totals. */
export interface SnapshotPricing {
  status: 'missing' | 'current' | 'stale';
  currency: 'USD' | null;
  monthlyUsd: number | null;
  oneTimeUsd: number | null;
  /** Where the figures came from (e.g. 'session-pricing'); null unless status is 'current'. */
  source: string | null;
}

/**
 * The bounded, deterministic copy of committed app state a brief is generated from.
 * A browser-provided session id is a grouping key, not proof of server-side ownership
 * and not proof that a statement came from the customer: the snapshot is always marked
 * as supplied by the signed-in user (plan §6). Only the SOURCE evidence is fingerprinted
 * (statements, design, pricing, source key/revision); capturedAt, objective and lang are
 * BD-side or transient inputs and never make a saved brief stale — see snapshotFingerprint.
 */
export interface BriefSnapshot {
  schemaVersion: BriefSchemaVersion;
  sourceKind: BriefSourceKind;
  /** Browser session id or module-owned discovery id (grouping key only). */
  sourceKey: string;
  /** Last committed architecture revision, or zero for independent discovery. */
  sourceRevision: number;
  suppliedBy: 'signed-in-user';
  /** Epoch ms; excluded from the fingerprint. */
  capturedAt: number;
  lang: Lang;
  /** Optional meeting objective entered by the BD; never required for preparation. */
  objective: string | null;
  statements: SnapshotStatement[];
  design: SnapshotDesign | null;
  pricing: SnapshotPricing;
}

// ---------------------------------------------------------------------------
// Meeting notes (plan §2 "After a meeting", §7 bd_brief_notes)
// ---------------------------------------------------------------------------

/**
 * An explicitly saved meeting note. Note text is untrusted data, never instructions:
 * it must not be able to disclose secrets, send messages or invoke tools (plan §8).
 * Notes stay inside this module; they are never added automatically to the
 * architecture conversation, pricing inputs, customer report or MCP context.
 */
export interface BriefNote {
  id: string;
  briefId: string;
  /** Client request id; deduplicates repeated submissions of the same note. */
  requestId: string;
  text: string;
  /** Meeting date as entered by the BD (free text, e.g. '2026-11-03'); null when unknown. */
  meetingDate: string | null;
  /** Where the notes came from, as entered by the BD; null when unknown. */
  source: string | null;
  /** Epoch ms. */
  savedAt: number;
}

// ---------------------------------------------------------------------------
// Brief content (plan §2 first-screen areas, §6 attribution and review)
// ---------------------------------------------------------------------------

/** Review state of one editable item. Only the owner can set 'confirmed';
 * AI-generated updates never set it (plan §6). */
export type ReviewState = 'unreviewed' | 'confirmed' | 'rejected' | 'conflicted';

/** How an item came to exist. 'model' items are inferences and are never promoted
 * to agreed facts, accepted actions or confirmed stakeholders (plan §8). */
export type ItemOrigin = 'user' | 'model' | 'edit';

export interface BriefItemBase {
  /** Stable within one brief across versions; used for review state, conflicts and change targeting. */
  id: string;
  /** Evidence ids supporting this item (snapshot statement ids, note ids, or the reserved
  * EVIDENCE_OBJECTIVE / EVIDENCE_DESIGN / EVIDENCE_PRICING). A named stakeholder requires
  * at least one; invented references are rejected by validate.ts. */
  sourceIds: string[];
  review: ReviewState;
  origin: ItemOrigin;
  /** True once the BD edited this item. Manual edits and confirmed items remain intact
  * across regeneration until the user accepts changes (plan §6). */
  edited?: boolean;
}

/** "Opportunity": customer problem, business impact and why they might act now.
 * One short paragraph; unknown impact or timing stays unknown. */
export interface BriefOpportunity extends BriefItemBase {
  text: string;
}

/** "Proposed value": how the proposed approach could help, with relevant evidence. */
export interface BriefValuePoint extends BriefItemBase {
  label: string;
  text: string;
}

/** "People to involve": named people are distinguished from suggested roles.
 * A 'suggested-role' item has name null — no invented person (plan §6). */
export interface BriefStakeholder extends BriefItemBase {
  kind: 'named' | 'suggested-role';
  name: string | null;
  /** The person's or suggested role's part, e.g. 'budget approver'. An IT contact is
  * not automatically the budget approver. */
  role: string;
}

export interface BriefAnswer {
  text: string;
  /** The note that answered this question, when the answer came from meeting notes. */
  noteId: string | null;
  /** Epoch ms. */
  answeredAt: number;
}

/** "Questions for the meeting": questions whose answers could change scope, feasibility
 * or the next engagement. At most LIMITS.priorityQuestions priority items; additional
 * context stays expandable. */
export interface BriefQuestion extends BriefItemBase {
  text: string;
  priority: boolean;
  /** Optional expandable context: why the answer could change scope or feasibility. */
  context: string | null;
  answer: BriefAnswer | null;
}

/** "Concerns to address": stated objections or clearly labeled possible concerns,
 * with a way to investigate them. A model-inferred concern is kind 'hypothesis'. */
export interface BriefConcern extends BriefItemBase {
  kind: 'stated' | 'hypothesis';
  text: string;
  /** How to investigate; null when none is known. */
  investigation: string | null;
}

/** "Next engagement": discovery, SA workshop or PoC scoping. */
export type NextEngagementKind = 'discovery' | 'sa-workshop' | 'poc-scoping';

/** One recommended next action, including the decision that meeting should enable.
 * Owner and date only when known — never invented. */
export interface BriefNextEngagement extends BriefItemBase {
  kind: NextEngagementKind;
  decision: string;
  owner: string | null;
  date: string | null;
}

/** The accepted brief content: the six first-screen areas from plan §2. */
export interface BriefContent {
  schemaVersion: BriefSchemaVersion;
  opportunity: BriefOpportunity;
  /** 0..LIMITS.valuePoints labeled points. */
  valuePoints: BriefValuePoint[];
  /** 0..LIMITS.stakeholders items. */
  stakeholders: BriefStakeholder[];
  /** 0..LIMITS.questions items, at most LIMITS.priorityQuestions of them priority. */
  questions: BriefQuestion[];
  /** 0..LIMITS.concerns items. */
  concerns: BriefConcern[];
  /** null when the input supports no recommendation. */
  nextEngagement: BriefNextEngagement | null;
}

/** The content of a fresh brief container (version 0): everything empty, nothing invented. */
export function makeEmptyContent(): BriefContent {
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    opportunity: { id: 'opportunity', text: '', sourceIds: [], review: 'unreviewed', origin: 'user' },
    valuePoints: [],
    stakeholders: [],
    questions: [],
    concerns: [],
    nextEngagement: null,
  };
}

// ---------------------------------------------------------------------------
// Stored records (plan §6 brief records, §7 tables)
// ---------------------------------------------------------------------------

/** How a version came to be accepted. */
export type VersionOrigin = 'initial' | 'generated' | 'edit' | 'notes-review';

/** The accepted brief: the bd_briefs row projected into the contract. */
export interface BriefRecord {
  id: string;
  /** Authenticated owner id; every query includes it (plan §7). */
  ownerId: string;
  sourceKind: BriefSourceKind;
  sourceKey: string;
  schemaVersion: BriefSchemaVersion;
  lang: Lang;
  /** Accepted-version number. 0 means a container without accepted content yet. */
  version: number;
  content: BriefContent;
  /** Fingerprint of the snapshot the current accepted version was prepared from. */
  snapshotFingerprint: string;
  /** Source revision at that capture time. */
  sourceRevision: number;
  /** Epoch ms. */
  createdAt: number;
  updatedAt: number;
  /** Saved only for an independent discovery meeting; never copied into core sessions. */
  discovery?: { title: string; snapshot: BriefSnapshot };
}

/** One retained accepted-version's metadata (bd_brief_versions). */
export interface BriefVersionMeta {
  version: number;
  origin: VersionOrigin;
  snapshotFingerprint: string;
  /** Epoch ms. */
  savedAt: number;
}

/** What GET /briefs/:id returns. Staleness is NOT computed here: the source session
 * lives in the browser, so the web feature re-fingerprints its current snapshot and
 * compares it with brief.snapshotFingerprint to show "Source changed since this brief
 * was prepared" (plan §6). */
export interface BriefPayload {
  brief: BriefRecord;
  versions: BriefVersionMeta[];
  notes: BriefNote[];
}

// ---------------------------------------------------------------------------
// Reviewed changes (plan §2 "After a meeting", §6 conflicts)
// ---------------------------------------------------------------------------

/** What kind of update reviewing notes proposed. */
export type ChangeKind = 'new-fact' | 'answered-question' | 'conflict' | 'proposed-action' | 'update';

/** The content section a change targets. */
export type ContentSection = 'opportunity' | 'valuePoints' | 'stakeholders' | 'questions' | 'concerns' | 'nextEngagement';

/** One proposed change from reviewing notes beside a saved brief version.
 * An AI-generated update never overwrites the BD's edits silently: changes are
 * proposed here and applied only through explicit acceptance. */
export interface ProposedChange {
  id: string;
  kind: ChangeKind;
  section: ContentSection;
  /** Existing content item this change targets; null for additions. */
  targetId: string | null;
  /** The proposed text (item text, answer text, or the action). */
  proposedText: string;
  /** Note/evidence ids supporting the change; must exist in the reviewed sources. */
  sourceIds: string[];
  /** For kind 'conflict': the existing claim and its sources. The newest statement is
  * not automatically true; the conflict is shown for review (plan §6). */
  conflict: { existingText: string; existingSourceIds: string[] } | null;
}

/** The BD's decision on one proposed change, sent with PATCH /briefs/:id. */
export interface ChangeAcceptance {
  changeId: string;
  decision: 'accepted' | 'rejected';
  /** The BD's own text when they accepted with edits; null when accepted as proposed. */
  editedText: string | null;
}

// ---------------------------------------------------------------------------
// Generation (plan §8): bounded, injected dependencies, one repair attempt
// ---------------------------------------------------------------------------

/** 'initial' prepares the first brief; 'regenerate' re-prepares from an explicit
 * version; 'review-notes' proposes changes from notes beside the saved brief. */
export type GenerateMode = 'initial' | 'regenerate' | 'review-notes';

/** A generated candidate. It never overwrites accepted content by itself (plan §7). */
export interface BriefCandidate {
  kind: 'content' | 'changes';
  /** The accepted version this candidate was generated against (0 for a fresh container). */
  baseVersion: number;
  /** Fingerprint of the snapshot used. */
  snapshotFingerprint: string;
  /** kind 'content': the full proposed content. */
  content: BriefContent | null;
  /** kind 'changes': proposed changes beside the saved brief. */
  changes: ProposedChange[] | null;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

/** The injected model interface (plan §4 rule 4). The worker feature adapts the
 * existing platform transport to it; the engine never reads global credentials. */
export interface ModelAdapter {
  complete(req: {
    system: string;
    user: string;
    lang: Lang;
    maxOutputTokens?: number;
    signal?: AbortSignal;
    deadlineMs?: number;
  }): Promise<{ text: string; usage: ModelUsage | null }>;
}

export interface Clock {
  now(): number;
}

export interface IdFactory {
  /** Short, collision-resistant id with a readable prefix, e.g. next('q') -> 'q-lk2j3h'. */
  next(prefix: string): string;
}

/** Every non-deterministic dependency the engine receives explicitly. */
export interface EngineDeps {
  model: ModelAdapter;
  clock: Clock;
  ids: IdFactory;
}

/** Everything one bounded generation needs. */
export interface GenerateInput {
  mode: GenerateMode;
  lang: Lang;
  snapshot: BriefSnapshot;
  /** The accepted brief the candidate is based on; null only for mode 'initial'
  * before any version exists. */
  base: BriefRecord | null;
  /** Saved notes selected for review; mode 'review-notes' requires at least one. */
  notes: BriefNote[];
}

export interface GenerateResult {
  candidate: BriefCandidate;
  usage: ModelUsage | null;
  /** Bounded format-repair attempts used (at most 1, inside the same total deadline). */
  repairs: number;
}

// ---------------------------------------------------------------------------
// HTTP contract (plan §7): same-origin, cookie-authenticated, owner-scoped
// ---------------------------------------------------------------------------

/** Route prefix; registered in the worker after the existing approved-account checks. */
export const BD_BRIEF_API_PREFIX = '/api/features/bd-brief';

/** Structured error codes. Error bodies are { error: BdBriefApiErrorCode, message? }
 * (plus currentVersion for 'version-conflict'), matching the platform's JSON style. */
export type BdBriefApiErrorCode =
  | 'not-available' // feature disabled server-side or the account is not eligible; the app stays usable
  | 'not-found' // no such brief for this owner; other owners' ids are also 'not-found'
  | 'version-conflict' // expectedVersion is stale; the caller reconciles
  | 'request-conflict' // requestId replayed with a different payload
  | 'invalid-request' // body or snapshot failed validation
  | 'limit-exceeded' // payload, module or feature-quota limit reached
  | 'generation-failed' // model timeout/validation failure; the saved brief is intact
  | 'method-not-allowed'
  | 'internal';

export interface BriefSummary {
  id: string;
  sourceKind: BriefSourceKind;
  sourceKey: string;
  version: number;
  lang: Lang;
  snapshotFingerprint: string;
  /** Epoch ms. */
  updatedAt: number;
}

/** GET /briefs?sourceKey=... — finds only this owner's brief for the source. */
export interface ListBriefsResponse {
  brief: BriefSummary | null;
}

/** Owner-scoped, bounded library of meetings started without an architecture session. */
export interface ListDiscoveryBriefsResponse {
  briefs: Array<BriefSummary & { title: string }>;
}

/** POST /briefs — creates the brief container from a bounded source snapshot. */
export interface CreateBriefRequest {
  sourceKey: string;
  lang: Lang;
  snapshot: BriefSnapshot;
  /** Optional discovery-meeting label; empty defaults to a localized first-meeting label. */
  title?: string;
}
export interface CreateBriefResponse {
  brief: BriefRecord;
}

/** GET /briefs/:id — this owner's accepted brief, history and notes. */
export type GetBriefResponse = BriefPayload;

/** PATCH /briefs/:id — saves explicit edits and/or accepted changes with optimistic
 * concurrency. A stale save returns 409 { error: 'version-conflict', currentVersion }
 * and the client keeps the unsaved edits for reconciliation. */
export interface PatchBriefRequest {
  expectedVersion: number;
  /** The full content to accept as the next version. */
  content: BriefContent;
  origin: VersionOrigin;
  /** When this patch applies reviewed changes: the decisions, kept for the audit trail. */
  acceptances: ChangeAcceptance[] | null;
  /** Fingerprint of the snapshot the edited content refers to. */
  snapshotFingerprint: string;
  sourceRevision: number;
}
export interface PatchBriefResponse {
  brief: BriefRecord;
}
export interface VersionConflictBody {
  error: 'version-conflict';
  currentVersion: number;
}

/** POST /briefs/:id/notes — requestId prevents duplicate submissions; a replayed
 * requestId with the same text returns the stored note with deduplicated: true. */
export interface AddNoteRequest {
  requestId: string;
  text: string;
  meetingDate: string | null;
  source: string | null;
}
export interface AddNoteResponse {
  note: BriefNote;
  deduplicated: boolean;
}

/** POST /briefs/:id/generate — generates a candidate from a specific brief version and
 * snapshot; never overwrites accepted content. The server stores a claim (lease) before
 * calling the model: a retry with the same requestId and payload reuses the result or
 * returns in-progress; the same requestId with different content is 'request-conflict'.
 * An explicit retry of a FAILED generation uses a NEW requestId. */
export interface GenerateHttpRequest {
  requestId: string;
  mode: GenerateMode;
  expectedVersion: number;
  lang: Lang;
  /** Required for 'initial' and 'regenerate'. */
  snapshot: BriefSnapshot | null;
  /** Note ids to review; required for 'review-notes'. */
  noteIds: string[] | null;
}
export type GenerateHttpResponse =
  | { state: 'completed'; candidate: BriefCandidate; usage: ModelUsage | null }
  | { state: 'in-progress' }
  | { state: 'failed'; reason: 'timeout' | 'model' | 'validation' };

/** DELETE /briefs/:id — deletes only this owner's brief, notes, versions and retained
 * candidate data. Success is 204 with no body. */

// ---------------------------------------------------------------------------
// Bounds (plan §2 editorial limits, §6 bounded payloads, §7 retention, §8 deadline)
// ---------------------------------------------------------------------------

/** Editorial and payload bounds. validate.ts rejects anything past these; the UI
 * writes within them. Retention and quota values here are the proposed starting
 * limits — final values are configuration decisions before rollout (plan §7/§13). */
export const LIMITS = {
  discoveryBriefs: 50,
  discoveryTitleChars: 120,
  /** "Up to three labeled points" (plan §2). */
  valuePoints: 3,
  /** "At most three priority questions" (plan §2). */
  priorityQuestions: 3,
  /** Total questions including non-priority expandable context. */
  questions: 8,
  concerns: 3,
  stakeholders: 12,
  opportunityChars: 700,
  itemChars: 400,
  contextChars: 400,
  investigationChars: 400,
  objectiveChars: 400,
  noteChars: 8_000,
  /** Snapshot payload bounds (plan §6: bounded payloads, deterministic selection). */
  statements: 60,
  statementChars: 1_200,
  designSummaryChars: 2_000,
  boundaries: 12,
  boundaryChars: 400,
  capabilities: 40,
  notesPerGenerate: 10,
  /** Accepted versions retained per brief; pruning preserves evidence referenced by
  * every retained version (plan §7). */
  acceptedVersions: 10,
  /** Days before abandoned candidates and request records expire (plan §7). */
  requestRetentionDays: 7,
  /** Starting generation deadline (plan §8); at most one bounded format repair inside it. */
  generationDeadlineMs: 30_000,
  modelOutputTokens: 4_000,
  /** Feature anti-abuse starting points (plan §8): per account per UTC day, and
  * in-flight generations per account. Separate from chat-turn counters. */
  generationsPerUserDay: 20,
  maxConcurrentGenerations: 1,
} as const;
