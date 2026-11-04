import type { WorkflowLayoutState } from '@ali/core/workflow-layout.ts';
import type { PricingSession } from '@ali/core/solution-pricing.ts';
// The session store's data model. One source of truth for the console, the canvas and the products panel.
// Everything here is plain data (no classes, no functions), so it can be persisted, replayed and tested.
import type { Constraint, Graph, SessionMemory, TurnMode, Warning, WorkflowGraph } from '@ali/core/types.ts';
import type { WorkflowCtx } from '@ali/core/workflow.ts';
import type { ApplyCtx } from '@ali/core/reducer.ts';
import type { LayoutState } from '@ali/core/layout.ts';
import type { Lang } from '../i18n/t.ts';
import type { Health, Phase, StatusCode } from '../stream/events.ts';
import type { Account } from '../stream/account.ts';

// ---------- the record: revisions, change lines, requirements ----------

/** What a change line says happened. The console localizes: a ChangeLine holds ids and names, never UI copy. */
export type ChangeKind =
  | 'added' // a card
  | 'attached' // a badge or attachment on a host card
  | 'removed'
  | 'replaced' // a remove and an add in the same lane in one revision (ECS -> ACK)
  | 'moved' // zones or frame changed
  | 'changed' // label or reason changed
  | 'connections'
  | 'connectionsRemoved'
  | 'planned' // named by a plan op, not drawn yet
  | 'recommended' // solution map
  | 'gap';

export interface ChangeLine {
  /** Absent on legacy cloud records. */
  view?: TurnMode;
  /** Stable within a revision, for React keys and for updating a line in place. */
  key: string;
  kind: ChangeKind;
  phase: Phase;
  /** Catalog id of the product (the new side of a replacement). */
  product?: string;
  /** Catalog short name: product names in change lines are never the model's spelling. */
  name: string;
  /** The card label, only when it differs from the short name. */
  label?: string;
  /** replaced and moved: the old side. */
  fromName?: string;
  fromLabel?: string;
  /** attached: the host's short name. */
  host?: string;
  /** The label of the frame the card sits in (region or VPC name), when it has one. */
  frame?: string;
  zones?: string[];
  fromZones?: string[];
  /** connections: how many, and the label pairs of the ends. */
  count?: number;
  pairs?: Array<[string, string]>;
  fit?: 'primary' | 'complement';
  need?: string;
  note?: string;
  /** Ids on the canvas this line points at (card or badge node ids, 'rec:<product>'). Hovering the line highlights them. */
  cards: string[];
  /** Ids of removed cards: hovering shows each one's dashed ghost. */
  ghosts: string[];
}

export type LifecycleKind = 'renamed' | 'retired' | 'chinaOnly' | 'restricted';
export interface LifecycleNote {
  key: string;
  kind: LifecycleKind;
  /** Name the model used (renamed) or the retired product's name. */
  old?: string;
  /** The catalog's current product name (renamed, retired). */
  new?: string;
  /** Product name for chinaOnly and restricted. */
  product?: string;
}

/** A repair the catalog rules applied on their own (attach-inline, zone-replicas, missing-group, path-order, ...). */
export interface AutoFix {
  /** Absent on legacy cloud records. */
  view?: TurnMode;
  code: Warning['code'];
  ids: string[];
}

export type FixState = 'none' | 'fixing' | 'fixed' | 'failed';

export interface FixBlock {
  autoFixes: AutoFix[];
  /** Constraint warnings that triggered the repair turn (unrepaired when they arrived). */
  constraint: Warning[];
  state: FixState;
  /** The repair-phase note. */
  note: string;
  /** The repair turn's own change lines. */
  changes: ChangeLine[];
}

export type RevisionStatus = 'waiting' | 'streaming' | 'done' | 'failed' | 'stopped';

export interface RevisionError {
  code: string;
  /** The server's localized message; empty for a client-side error, which the console words from `code`. */
  message: string;
  retryable: boolean;
  /** True for errors the browser made up (network drop, http-xxx without a body). */
  client: boolean;
}

export interface Revision {
  intent?: 'deployment';
  mode?: TurnMode;
  /** 1-based, in order of asking. */
  n: number;
  ask: string;
  /** BCP 47 tag of the ask's language (en, ko, zh, ja), from core detectReplyLanguage: set `lang` on the ask and note for screen readers. */
  askLang: string;
  startedAt: number;
  status: RevisionStatus;
  /** Qwen's narration: the main-phase say lines joined with a space. Partial text while streaming. */
  note: string;
  changes: ChangeLine[];
  /** Requirement texts this revision pinned. */
  reqs: string[];
  lifecycle: LifecycleNote[];
  fix: FixBlock;
  /** The latest status line (fallback, retry, continue, repair, finish); cleared when the next say or op arrives. */
  statusLine: { code: StatusCode; text: string } | null;
  /** The answer was cut off and no continuation followed. */
  truncated: boolean;
  /** Elapsed ms from the ask to commit. */
  durationMs: number | null;
  error: RevisionError | null;
  /** commit.warnings: what the server still found after repair. */
  commitWarnings: Warning[];
  /**
   * A second pass took over and completes this answer (a status with code 'finish' arrived). The note is then not
   * Qwen's alone, so its label is plain, the fix block keeps Qwen's name out of the record and the cut-off Qwen reported
   * no longer describes the answer. Set once and kept; absent on every other revision and in sessions saved before it existed.
   */
  finishing?: boolean;
  /** Counts for the collapsed row: "+{added} -{removed}". Cards only. */
  added: number;
  removed: number;
  /** Ids added or changed by this revision (cards and badges, 'rec:<product>'): the revision tag's cards. Final at commit. */
  cards: string[];
  /** Ids this revision removed. */
  gone: string[];
  // --- follow-up questions and assumptions (research/phase1-asks-and-scope.md section 1; additive) ---
  /** The assume ops this revision streamed. The chips come from memory.assumptions once committed; these show them while it streams. Absent in sessions saved before. */
  assumes?: AssumeNote[];
  /** The questions this revision asked (ask ops; at commit, memory.questions when the server sent it). Absent in sessions saved before. */
  asks?: AskNote[];
}

/** An assumption the design rests on; `alt` is the one-click alternative. Same shape as SessionMemory.assumptions. */
export interface AssumeNote {
  id: string;
  text: string;
  alt?: string;
}

/** A question whose answer would change the design; `options` are the quick replies. Same shape as SessionMemory.questions. */
export interface AskNote {
  id: string;
  text: string;
  options?: string[];
}

/** held: Held. checking: Checking (mid-turn). repaired: Held, fixed. broken: Not met. atRisk: the commit still carries a warning-level finding (for example a narration line naming another region) while the diagram holds. */
export type ReqState = 'held' | 'checking' | 'repaired' | 'broken' | 'atRisk';
export interface RequirementView {
  text: string;
  state: ReqState;
  /** Revision that pinned it, for "Pinned in revision {n}" when it is the latest. */
  pinnedIn: number;
  /** Revision whose fix kept it (state 'repaired') or in which it broke (state 'broken'). */
  stateRev: number | null;
  regions: string[];
  avoid: string[];
  /** The latest revision pinned it. */
  isNew: boolean;
}

export interface SessionRecord {
  mode: TurnMode;
  /** Pricing has its own conversation. Diagram generation never receives these messages. */
  pricing?: PricingSession;
  pricingOpen?: boolean;
  /** A submitted answer kept until its estimate is committed, including across a tab reload. */
  pricingPending?: string;
  workflowLayout?: WorkflowLayoutState;
  workflowProvenance?: SessionRecord['provenance'];
  id: string;
  createdAt: number;
  updatedAt: number;
  /** The first ask, for the header and the sessions menu. */
  title: string;
  /** The memory the server sent with the last commit. The next turn posts it back. */
  memory: SessionMemory;
  revisions: Revision[];
  /** requirement text -> revision that pinned it */
  reqPinnedIn: Record<string, number>;
  /** card id -> the revision that added it, and the one that last changed it. For "Added in revision {n}" and the Rev. column. */
  provenance: Record<string, { addedIn: number; changedIn: number }>;
  /** The newest revision whose requirements were folded into memory.summary (SummaryNote). 0 when none. */
  summarizedThrough: number;
  /** A summary is being written (status event) and has not arrived. */
  summarizing: boolean;
  /** Set for sessions played from a recorded fixture; they are not saved. */
  replayOf: string | null;
}

// ---------- the turn in flight ----------

export type TurnPhase = 'idle' | 'waiting' | 'streaming' | 'fallback' | 'repairing' | 'error';

export interface TurnStatus {
  phase: TurnPhase;
  /** Epoch ms of the last text delta (say), for the Cursor: solid within 600 ms of it, blinking after. */
  lastTextAt: number | null;
  startedAt: number | null;
}

/** The machinery behind a streaming revision. Never persisted. */
export interface TurnWork {
  mode: TurnMode;
  rawWorkflow: WorkflowGraph;
  workflowLayout: WorkflowLayoutState | undefined;
  workflowCtx: WorkflowCtx;
  n: number;
  /** The committed memory when the turn started. Fatal and Stop go back to its graph. */
  base: SessionMemory;
  raw: Graph;
  ctx: ApplyCtx;
  /** memory.constraints plus the requirements pinned this turn. */
  constraints: Constraint[];
  shownAtTurnStart: ReadonlySet<string>;
  touched: ReadonlySet<string>;
  /** Cards drawn right now; undefined before anything is drawn (core holdBack is a no-op then). */
  drawn: ReadonlySet<string> | undefined;
  /** Ops changed the raw graph since the last flush. */
  dirty: boolean;
  batches: number;
  workflowAnnouncement?: { text: string; at: number };
  /** say text by `${phase}:${id}`, in arrival order. */
  says: Record<string, string>;
  sayOrder: string[];
  /** What a phase-'repair' event means: a repair turn (own FixBlock), a continuation of the main answer, or nothing yet. */
  follow: 'repair' | 'continue' | null;
  /** Deterministic fixes seen so far (stream warnings and repairGraph runs). */
  autoFixes: AutoFix[];
  /** Card ids the turn has added or changed so far (for BuildMarks), as ids. */
  built: string[];
}

// ---------- what the canvas draws ----------

export type DisplayReason = 'batch' | 'commit' | 'restore' | 'revert' | 'resize' | 'empty';

export interface DisplayState {
  /** The graph the layout was computed from: displayGraph(raw) while a turn streams, memory.graph otherwise. */
  graph: Graph;
  layout: LayoutState | null;
  /** The previous layout, so the canvas can animate the difference. */
  prev: LayoutState | null;
  /** Bumped on every new layout; the canvas runs the diff once per version. */
  version: number;
  reason: DisplayReason;
  /** The canvas should refit now: the first batch of the first turn, a commit, a restore, a revert. Not per batch. */
  refit: boolean;
  /** False for a restore or a replacement of the whole picture: no entrance animation. */
  animate: boolean;
  /** Cards displayGraph held back in the last batch. */
  held: string[];
}

// ---------- the app ----------

export type ConnMode = 'checking' | 'live' | 'offline' | 'replay';
export type ReplaySpeed = '1x' | '4x' | 'instant';

export interface Highlight {
  /** Absent on legacy cloud records. */
  view?: TurnMode;
  source: 'line' | 'revision' | 'row' | 'card' | 'panel';
  /** Ids to outline in blue; everything else dims. */
  cards: string[];
  /** Ids to draw as dashed ghosts while hovered (removed cards). */
  ghosts: string[];
  revision?: number;
}

export interface Toast {
  id: number;
  kind: 'unpinned' | 'restored';
  /** unpinned: what Undo puts back. */
  undo?: { text: string; constraint?: Constraint; index: number };
  date?: string;
}

export interface ReplayState {
  fixtureId: string;
  speed: ReplaySpeed;
  /** Turn index being played or last played. */
  turn: number;
  playing: boolean;
  recordedAt: string;
  /** Written for the product, not recorded from a real session: the banner says so. */
  synthetic?: boolean;
}

export interface UiState {
  panelOpen: boolean;
  focusDiagram: boolean;
  highlight: Highlight | null;
  /** A request to pan the canvas to these ids (click or Enter on a line, a tag or a row). `seq` makes repeats distinct. */
  panTo: { ids: string[]; seq: number; view?: TurnMode } | null;
  /** A request to scroll the record to a revision (a revision tag on the canvas, a Rev. cell in the panel). */
  reveal: { revision: number; seq: number } | null;
  /** The card the user is pointing at or has focused, for the popover. */
  hoverCard: string | null;
  toast: Toast | null;
  /** One short polite line for the live region. `seq` makes repeats distinct. */
  live: { text: string; seq: number } | null;
  /** The landing view submitted and the handoff animation is running. */
  handoff: boolean;
  /** A draft the composer should show (Edit and resend, unpin undo). `seq` makes repeats distinct. */
  composerDraft: { text: string; seq: number } | null;
}

export interface AppState {
  /** A pending request is never resumed automatically after a reload. */
  pricingStatus?: 'working' | 'failed';
  pricingError?: string;
  lang: Lang;
  view: 'landing' | 'working';
  conn: { mode: ConnMode; health: Health | null; checkedAt: number | null };
  /** Who is signed in, from GET /api/me on the hosted Worker. null on the local server, which has no such route. */
  account: Account | null;
  session: SessionRecord;
  turn: TurnStatus;
  work: TurnWork | null;
  display: DisplayState;
  workflowDisplay: { layout?: WorkflowLayoutState; graph: WorkflowGraph; version: number; reason: DisplayReason };
  canvas: { w: number; h: number };
  ui: UiState;
  replay: ReplayState | null;
  sessions: SessionSummary[];
  /** Bumped when the stored session list changes. */
  sessionsVersion: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: number;
  revisions: number;
}
