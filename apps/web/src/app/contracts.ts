// What the builders implement and what the shell gives them. Each builder's folder exports one component whose props are
// the interface below; the shell fills the props from the store with the hooks at the bottom of this file, so a builder
// never touches the store directly (and can render its component from a fixture state in a test or a screenshot).
//
//   src/console/index.tsx   export function Console(props: ConsoleProps)
//   src/canvas/index.tsx    export function Canvas(props: CanvasProps)
//   src/panel/index.tsx     export function Panel(props: PanelProps)
//
// State lives in the store (src/store); side effects live in the controller (src/app/controller.ts). Components
// render props and call `actions`. Strings come from `t` (strings.json); never hard-code copy.
import type { Catalog } from '@ali/core/types.ts';
import type { CanvasSize } from '../canvas/layout.ts';
export { fitCamera, DEFAULT_CANVAS } from '../canvas/layout.ts';
export type { Camera, LayoutState } from '../canvas/layout.ts';
import type { Lang, TFn } from '../i18n/t.ts';
import type { Health } from '../stream/events.ts';
import type {
  ConnMode,
  DisplayState,
  Highlight,
  ReplayState,
  ReplaySpeed,
  RequirementView,
  Revision,
  SessionRecord,
  Toast,
  TurnStatus,
} from '../store/types.ts';
import type { SummaryView } from '../store/selectors.ts';
import type { AskView, AssumptionView } from '../store/asks.ts';
import type { SubmitResult } from './controller.ts';

export type { Lang, TFn, Catalog, CanvasSize, ConnMode, DisplayState, Highlight, ReplayState, ReplaySpeed, RequirementView, Revision, SummaryView, Toast, TurnStatus, SubmitResult, Health };
export type { AskView, AssumptionView };
export type { ChangeLine, ChangeKind, LifecycleNote, AutoFix, FixBlock, ReqState, RevisionStatus } from '../store/types.ts';
export { cursorMode, nextCursorChange, CURSOR_SOLID_MS } from '../stream/cursor.ts';
export type { CursorMode } from '../stream/cursor.ts';
export { connectionDetail, nameOf, labelIfDiffers } from '../store/changes.ts';
export { useAppState, useController, useCatalog, useT } from '../store/react.tsx';

// ---------- console ----------

export interface ConsoleActions {
  /** Sends a follow-up. Returns why it did not start ('busy', 'empty', 'too-long', 'read-only'). */
  submit(ask: string): SubmitResult;
  /** Stop: aborts the stream and returns the canvas to the committed graph. */
  stop(): void;
  /** Try again after a failure: sends the failed revision's ask again, replacing the failed revision. */
  retry(): void;
  /** Edit and resend: removes the failed revision and puts its ask back in the composer (the `draft` prop). */
  editAndResend(): void;
  unpin(text: string): void;
  undoUnpin(): void;
  clearToast(): void;
  /** Call once the draft is in the composer; the shell then forgets it (so it cannot be applied again). */
  draftTaken(): void;
  /** Highlight cards on the canvas while a change line, a revision tag or a row is hovered or focused. Pass null to clear. */
  highlight(h: Highlight | null): void;
  /** Pan the canvas to cards (click or Enter on a source, never on hover). */
  panTo(ids: string[]): void;
  /** Re-check /api/health (the offline notice's Try again). */
  checkHealth(): Promise<void>;
  /** The offline notice's Replay a recorded session. */
  startReplay(): void;
  restartReplay(): void;
  exitReplay(): void;
  setReplaySpeed(speed: ReplaySpeed): void;
}

export interface ConsoleProps {
  lang: Lang;
  t: TFn;
  /** Pinned requirements with their state (Held, Checking, Held by a fix, Not met, At risk). */
  requirements: RequirementView[];
  /** Oldest first. The last one is the newest (expanded); older ones collapse to rows. */
  revisions: readonly Revision[];
  /** The assumptions the drawing rests on, as chips next to the pinned requirements ("Assumed: Public-facing · Change"). A requirement that settles one removes it. */
  assumptions: AssumptionView[];
  /** idle, waiting, streaming, fallback, repairing or error; `lastTextAt` drives the Cursor (see cursorMode). */
  turn: TurnStatus;
  /** The revision that is streaming now, or null. */
  streamingRevision: number | null;
  /** The rolling summary note (7.14), or null. */
  summary: SummaryView | null;
  conn: ConnMode;
  replay: ReplayState | null;
  /** Characters allowed in one ask (from /api/health, else the default). */
  askLimit: number;
  /** Text to put in the composer (Edit and resend, Undo). Apply when `seq` changes. */
  draft: { text: string; seq: number } | null;
  toast: Toast | null;
  /** The revision highlighted on the canvas, for the tag's pressed state. */
  highlightedRevision: number | null;
  /** The latest committed revision: its tag is the filled one. */
  latestCommitted: number | null;
  /** Scroll the record to this revision when `seq` changes. */
  reveal: { revision: number; seq: number } | null;
  actions: ConsoleActions;
}

// ---------- canvas ----------

export interface CanvasActions {
  /** Tell the store the stage size (in CSS px): the layout and the refit depend on it. */
  setSize(size: CanvasSize): void;
  highlight(h: Highlight | null): void;
  /** Card the pointer or focus is on; null when it leaves. The popover (canvas-owned) opens after 300 ms or on focus. */
  hoverCard(id: string | null): void;
  /** A card's revision tag: highlight the revision's cards and scroll the record to it. */
  revealRevision(n: number): void;
}

export interface CanvasProps {
  lang: Lang;
  t: TFn;
  catalog: Catalog;
  /** The graph, layout (null before the first card) and how to animate to it. Fit when `display.refit` and `version` change. */
  display: DisplayState;
  /** 'solution' when the answer is recommendations with no infrastructure. */
  mode: 'architecture' | 'solution';
  /** Card and badge ids that carry the BuildMark (added or changed by the streaming revision). */
  building: string[];
  /** The latest committed revision and the ids it added or changed: they carry its number. Null while streaming. */
  tagged: { n: number; cards: string[] } | null;
  /** First turn, nothing drawn yet and a turn in flight: show `canvas.reading` and the Cursor. */
  reading: boolean;
  /** A second pass is completing the first answer while `reading`: show the calm `rec.finishing` line instead of `canvas.reading`. */
  finishing: boolean;
  /** The first revision failed or was stopped and nothing was drawn: show `canvas.blank`. */
  blank: boolean;
  /** A turn is in flight. */
  streaming: boolean;
  highlight: Highlight | null;
  /** Pan to these ids when `seq` changes. */
  panTo: { ids: string[]; seq: number } | null;
  hoverCard: string | null;
  /** card id -> the revision that added it and the one that last changed it ("Added in revision {n}"). */
  provenance: SessionRecord['provenance'];
  /** The user focused Focus diagram: the stage is full width, so refit once the width settles. */
  focusDiagram: boolean;
  actions: CanvasActions;
}

// ---------- products panel ----------

export interface PanelActions {
  setOpen(open: boolean): void;
  highlight(h: Highlight | null): void;
  panTo(ids: string[]): void;
  revealRevision(n: number): void;
}

export interface PanelProps {
  lang: Lang;
  t: TFn;
  catalog: Catalog;
  open: boolean;
  /** The drawn graph and its layout: groups for the table's group rows, nodes and recs for the product rows. */
  display: DisplayState;
  mode: 'architecture' | 'solution';
  /** Products drawn (cards, badges, recommendations). */
  count: number;
  revisions: readonly Revision[];
  provenance: SessionRecord['provenance'];
  latestCommitted: number | null;
  highlight: Highlight | null;
  /** Catalog version for "Catalog checked {date}": the server's, else the bundled one. */
  catalogVersion: string;
  streaming: boolean;
  actions: PanelActions;
}

export { activeDocument, activeNodeCount, canExport, activeProvenance, activeHighlight, highlightChange } from '../store/selectors.ts';
export type { TurnMode, WorkflowGraph } from '@ali/core/types.ts';
