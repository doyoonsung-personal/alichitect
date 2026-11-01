// Pure logic of the console (spec 7.7 to 7.14): how a change line is worded, what a requirement says, what the footer
// of a revision holds, where the one blinking Cursor sits, when the record follows the stream, and what Enter does in
// the composer. No React and no DOM here, so every rule has a node:test beside it. Components render these results.
import type { Catalog, Warning } from '@ali/core/types.ts';
import { regionLabel } from '@ali/core/regions.ts';
import type { TFn } from '../i18n/t.ts';
import { nameOf, connectionDetail } from '../store/changes.ts';
import type { AutoFix, ChangeLine, ReqState, RequirementView, Revision, RevisionError, TurnStatus } from '../store/types.ts';
import type { AssumptionView } from '../store/asks.ts';
import { CONSTRAINT_CODES } from '../stream/events.ts';

// ---------- composer keys (7.4, 7.13) ----------

export interface EnterEvent {
  key: string;
  shiftKey: boolean;
  /** KeyboardEvent.isComposing */
  isComposing?: boolean;
  /** Legacy: 229 for every key pressed inside an IME composition (Safari and old Chromium report this instead). */
  keyCode?: number;
}

export type EnterAction =
  /** Not an Enter, or nothing to decide: the browser does its normal thing. */
  | 'default'
  /** Send the message (the caller prevents the default newline). */
  | 'send'
  /** Shift+Enter: the browser inserts a newline. */
  | 'newline'
  /** Enter inside an IME composition: it commits the composition and never sends. */
  | 'commit-ime'
  /** Enter that must not send and must not insert a newline (a turn is streaming, or there is nothing to send). */
  | 'blocked';

/** What Enter does in a message box. IME-safe for Korean and Chinese: composition wins over everything else. */
export function enterAction(e: EnterEvent, s: { composing: boolean; busy: boolean; canSend: boolean }): EnterAction {
  if (e.key !== 'Enter') return 'default';
  if (s.composing || e.isComposing === true || e.keyCode === 229) return 'commit-ime';
  if (e.shiftKey) return 'newline';
  if (s.busy || !s.canSend) return 'blocked';
  return 'send';
}

/** Whether the keydown handler calls preventDefault. */
export const preventsDefault = (a: EnterAction): boolean => a === 'send' || a === 'blocked';

/** Number of Unicode characters the server counts against the ask limit. */
export const askLength = (text: string): number => Array.from(text.trim()).length;

// ---------- numbers and times ----------

/** "9.5": one decimal, from milliseconds. */
export function fmtSeconds(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1);
}

/** After this long without a first token, the waiting line shows a counter (7.12). */
export const WAITING_COUNTER_MS = 8000;

export function waitingLine(elapsedMs: number, t: TFn): string {
  return elapsedMs >= WAITING_COUNTER_MS ? t('rec.waitingSeconds', { s: Math.floor(elapsedMs / 1000) }) : t('rec.waiting');
}

// ---------- revision state, footer and row meta (7.8, 7.9) ----------

export type RevisionState =
  | 'live'
  | 'held'
  /** Held, because a repair turn fixed a constraint before the commit. */
  | 'fixed'
  | 'broken'
  | 'atRisk'
  | 'failed'
  | 'stopped';

export function revisionState(r: Revision): RevisionState {
  if (r.status === 'waiting' || r.status === 'streaming') return 'live';
  if (r.status === 'failed') return 'failed';
  if (r.status === 'stopped') return 'stopped';
  const open = r.commitWarnings.filter((w) => CONSTRAINT_CODES.has(w.code));
  if (open.some((w) => w.severity === 'error')) return 'broken';
  if (r.fix.state === 'failed') return 'broken';
  if (open.length) return 'atRisk';
  if (r.fix.state === 'fixed') return 'fixed';
  return 'held';
}

export type Tone = 'plain' | 'ok' | 'warn' | 'danger';

export interface FooterItem {
  key: string;
  text: string;
  tone: Tone;
  /** A 12 px check precedes the text. */
  check?: boolean;
}

/**
 * The footer of a closed revision: "Drawn in 9.5 s · Requirements held". Names the state when it is not Held (7.8).
 * `hasRequirements`: with nothing pinned there is nothing to hold, so the footer is only the time.
 */
export function footerItems(r: Revision, hasRequirements: boolean, t: TFn): FooterItem[] {
  const state = revisionState(r);
  // a revision that only asked drew nothing: "Drawn in 2.1 s" and "Requirements held" would describe a drawing that is not there
  if (state === 'held' && (r.asks?.length ?? 0) > 0 && !r.changes.length && !r.fix.changes.length) return [];
  if (state === 'stopped') return [{ key: 'stopped', text: t('rec.stopped'), tone: 'plain' }];
  if (state === 'failed' || state === 'live') return [];
  const out: FooterItem[] = [];
  if (r.durationMs !== null) out.push({ key: 'done', text: t('rec.done', { s: fmtSeconds(r.durationMs) }), tone: 'plain' });
  if (state === 'broken') out.push({ key: 'broken', text: t('req.notMet'), tone: 'danger' });
  else if (state === 'atRisk') out.push({ key: 'risk', text: t('req.risk'), tone: 'warn' });
  else if (state === 'fixed') out.push({ key: 'fixed', text: t('rec.footerFixed'), tone: 'warn' });
  else if (hasRequirements) out.push({ key: 'held', text: t('rec.reqHeld'), tone: 'ok', check: true });
  // after a rescue the attribution line says what happened to the answer; Qwen's cut-off note would describe a stale state
  if (r.truncated && !r.rescue) out.push({ key: 'cut', text: t('rec.cut'), tone: 'warn' });
  return out;
}

// ---------- the Claude backup (a rescue after Model Studio's content filter stopped Qwen) ----------

/** The small attribution under a rescued revision's footer; null when no rescue ended in a commit. */
export interface RescueNote {
  text: string;
  tone: Tone;
}

/**
 * Who finished the answer. 'finished': Claude completed it, in the footer's own voice. 'incomplete': Claude could not,
 * and the diagram keeps what was drawn (the reply-incomplete warning). A running or failed rescue says nothing here: the
 * status line and the error block carry those.
 */
export function rescueNote(r: Revision, t: TFn): RescueNote | null {
  if (r.status !== 'done') return null;
  if (r.rescue === 'finished') return { text: t('rec.rescued'), tone: 'plain' };
  if (r.rescue === 'incomplete') return { text: t('rec.rescueIncomplete'), tone: 'warn' };
  return null;
}

/** What the status line says: our own localized words for a Claude rescue status (the UI language, not the ask's), else the server's text. */
export function statusText(s: NonNullable<Revision['statusLine']>, t: TFn): string {
  if (s.provider === 'claude' && (s.code === 'fallback' || s.code === 'continue' || s.code === 'repair')) {
    return t(s.code === 'fallback' ? 'rec.claude.fallback' : s.code === 'continue' ? 'rec.claude.continue' : 'rec.claude.repair');
  }
  return s.text;
}

/** The meta line of a collapsed row: "+3 −0 · 7.3 s", plus the state when it is not Held (7.9). */
export function rowMeta(r: Revision, t: TFn): string {
  const state = revisionState(r);
  if (state === 'failed') return t('rec.failedTitle');
  if (state === 'stopped') return t('rec.stoppedShort');
  const parts: string[] = [`+${r.added} −${r.removed}`];
  if (r.durationMs !== null) parts.push(t('rec.seconds', { s: fmtSeconds(r.durationMs) }));
  if (state === 'broken') parts.push(t('req.notMet'));
  else if (state === 'atRisk') parts.push(t('req.risk'));
  else if (state === 'fixed') parts.push(t('rec.footerFixed'));
  if (r.rescue === 'finished') parts.push(t('rec.rescuedShort'));
  else if (r.rescue === 'incomplete') parts.push(t('rec.rescueIncompleteShort'));
  return parts.join(' · ');
}

/** Whether a revision is open: the newest always, an older one only when the user opened it (7.8). */
export function isExpanded(n: number, newest: number, opened: ReadonlySet<number>): boolean {
  return n === newest || opened.has(n);
}

/** Ids the revision's tag highlights: its final cards once committed, what its lines point at while it streams. */
export function revisionCards(r: Revision): { cards: string[]; ghosts: string[] } {
  if (r.status === 'done') return { cards: r.cards, ghosts: r.gone };
  const lines = [...r.changes, ...r.fix.changes];
  return { cards: [...new Set(lines.flatMap((l) => l.cards))], ghosts: [...new Set(lines.flatMap((l) => l.ghosts))] };
}

/** "2 of 5 drawn": cards the plan named against those drawn so far. Null when no plan is in effect. */
export function drawProgress(lines: readonly ChangeLine[]): { done: number; total: number } | null {
  const cardLine = (l: ChangeLine): boolean => l.kind === 'added' || l.kind === 'attached' || l.kind === 'replaced' || l.kind === 'planned' || l.kind === 'recommended';
  const cards = lines.filter(cardLine);
  const planned = cards.filter((l) => l.kind === 'planned').length;
  if (!planned) return null;
  return { done: cards.length - planned, total: cards.length };
}

// ---------- change lines (7.10) ----------

export type LineMark = 'plus' | 'minus' | 'arrow' | 'ring' | 'info';
export type DetailPart = { text: string } | { arrow: true };

export interface LineView {
  mark: LineMark;
  /** The product short name; for a replacement, the new side. */
  name: string;
  /** Replacement and change: the old side before an arrow. */
  from?: string;
  label?: string;
  detail: DetailPart[];
  /** Removed card: the name is struck through 1 px and grey. */
  struck: boolean;
  /** Planned lines read lighter. */
  muted: boolean;
  /** The gap line wears the warning ink. */
  warn: boolean;
  /** One plain sentence for the tooltip and the accessible name. */
  text: string;
}

const dot = ' · ';
const T = (text: string): DetailPart => ({ text });

function zonesText(zones: readonly string[] | undefined, t: TFn): string | undefined {
  return zones && zones.length ? t('rec.zones', { list: zones.join(', ') }) : undefined;
}

/** What a line says, as data: marks, names and detail parts. The words come from strings.json. */
export function lineView(l: ChangeLine, t: TFn): LineView {
  const base = { from: undefined as string | undefined, label: l.label, struck: false, muted: false, warn: false };
  let v: Omit<LineView, 'text'>;
  const zones = zonesText(l.zones, t);
  const where = l.frame ? t('rec.in', { frame: l.frame }) : undefined;
  switch (l.kind) {
    case 'added':
      v = { ...base, mark: 'plus', name: l.name, detail: [zones ?? where].filter((s): s is string => !!s).map(T) };
      break;
    case 'attached':
      v = { ...base, mark: 'plus', name: l.name, detail: [T(t('rec.attached', { host: l.host ?? '' }))] };
      break;
    case 'removed':
      v = { ...base, mark: 'minus', name: l.name, struck: true, detail: [zones ?? where].filter((s): s is string => !!s).map(T) };
      break;
    case 'replaced':
      v = { ...base, mark: 'arrow', name: l.name, from: l.fromName, detail: [zones ?? where].filter((s): s is string => !!s).map(T) };
      break;
    case 'moved': {
      const to = zonesText(l.zones, t);
      const from = l.fromZones && l.fromZones.length ? l.fromZones.join(', ') : undefined;
      const detail: DetailPart[] = [];
      if (from && l.zones && l.zones.length) detail.push(T(t('rec.zones', { list: from })), { arrow: true }, T(l.zones.join(', ')));
      else if (to) detail.push(T(to));
      else if (l.frame) detail.push(T(t('rec.in', { frame: l.frame })));
      v = { ...base, mark: 'arrow', name: l.name, detail };
      break;
    }
    case 'changed': {
      // a new label reads "old -> new"; when only the reason changed there is no label to compare, so the line says "Changed"
      const relabeled = !!l.fromLabel && !!l.label && l.fromLabel !== l.label;
      const detail: DetailPart[] = relabeled ? [T(l.fromLabel!), { arrow: true }, T(l.label!)] : [T(t('rec.changed'))];
      v = { ...base, mark: 'arrow', name: l.name, label: relabeled ? undefined : l.label, detail };
      break;
    }
    case 'connections':
    case 'connectionsRemoved': {
      const key = l.kind === 'connections' ? 'rec.connections' : 'rec.connectionsRemoved';
      const d = connectionDetail(l);
      v = { ...base, mark: l.kind === 'connections' ? 'plus' : 'minus', name: t(key, { n: l.count ?? 0 }), label: undefined, detail: d ? [T(d)] : [] };
      break;
    }
    case 'planned':
      v = { ...base, mark: 'ring', name: l.name, muted: true, detail: [T(t('rec.planned'))] };
      break;
    case 'recommended':
      v = { ...base, mark: 'plus', name: l.name, detail: l.fit ? [T(t(l.fit === 'primary' ? 'rec.recommended' : 'rec.optional'))] : [] };
      break;
    case 'gap':
      v = { ...base, mark: 'info', name: t('rec.gap', { need: l.need ?? '' }), label: undefined, warn: true, detail: l.note ? [T(l.note)] : [] };
      break;
  }
  const detailText = v.detail.map((d) => ('text' in d ? d.text : '→')).join(' ');
  const text = [v.from ? `${v.from} → ${v.name}` : v.name, v.label, detailText].filter(Boolean).join(dot);
  return { ...v, text };
}

/** Lines to show: at most `max`, unless expanded. */
export function visibleLines<T>(lines: readonly T[], expanded: boolean, max = 8): { shown: T[]; hidden: number } {
  if (expanded || lines.length <= max) return { shown: [...lines], hidden: 0 };
  return { shown: lines.slice(0, max), hidden: lines.length - max };
}

/** Whether a line points at anything on the canvas (a planned line does not yet). */
export const isLinked = (l: ChangeLine): boolean => l.cards.length > 0 || l.ghosts.length > 0;

// ---------- requirements (7.7) ----------

export interface StateView {
  /** The 16 px icon. */
  icon: 'check' | 'dottedRing' | 'cross' | 'info';
  tone: Tone;
  /** The short word at the right of the row. */
  label: string;
}

export function stateView(state: ReqState, t: TFn): StateView {
  switch (state) {
    case 'held':
    case 'repaired':
      return { icon: 'check', tone: 'ok', label: t('req.held') };
    case 'checking':
      return { icon: 'dottedRing', tone: 'warn', label: t('req.checking') };
    case 'broken':
      return { icon: 'cross', tone: 'danger', label: t('req.notMet') };
    case 'atRisk':
      return { icon: 'info', tone: 'warn', label: t('req.risk') };
  }
}

export interface MetaPart {
  key: string;
  text: string;
  tone: Tone;
}

/** The meta line under a requirement: how a fix or a failure happened, where data stays, what is ruled out, and "new". */
export function requirementMeta(r: RequirementView, catalog: Catalog, t: TFn): MetaPart[] {
  const out: MetaPart[] = [];
  const rev = r.stateRev ?? r.pinnedIn;
  if (r.state === 'repaired') out.push({ key: 'repaired', text: t('req.repaired', { n: rev }), tone: 'warn' });
  else if (r.state === 'broken') out.push({ key: 'broken', text: t('req.broken', { n: rev }), tone: 'danger' });
  else if (r.state === 'atRisk') out.push({ key: 'atRisk', text: t('req.atRisk', { n: rev }), tone: 'warn' });
  if (r.regions.length) out.push({ key: 'regions', text: t('req.staysIn', { regions: r.regions.map(regionLabel).join(', ') }), tone: 'plain' });
  if (r.avoid.length) out.push({ key: 'avoid', text: t('req.ruledOut', { products: r.avoid.map((p) => nameOf(catalog, p)).join(', ') }), tone: 'plain' });
  if (r.isNew) out.push({ key: 'new', text: t('req.new', { n: r.pinnedIn }), tone: 'plain' });
  return out;
}

/** The rows shown while the block is collapsed: at most 4, then "{n} more". */
export const REQ_COLLAPSED_ROWS = 4;
export function visibleRequirements<T>(rows: readonly T[], expanded: boolean): { shown: T[]; hidden: number } {
  return visibleLines(rows, expanded, REQ_COLLAPSED_ROWS);
}

// ---------- assumptions and questions (research/phase1-asks-and-scope.md section 1) ----------

/** Chips shown before "{n} more": the pinned requirements show four rows; the chips are smaller, so three. */
export const ASM_COLLAPSED = 3;

export function visibleAssumptions(list: readonly AssumptionView[], expanded: boolean): { shown: AssumptionView[]; hidden: number } {
  return visibleLines(list, expanded, ASM_COLLAPSED);
}

/** The follow-up a chip's Change sends: "Change: Internal only instead of Public-facing". Null when the assumption has no alternative. */
export function changeAsk(a: AssumptionView, t: TFn): string | null {
  return a.alt ? t('asm.changeAsk', { alt: a.alt, text: a.text }) : null;
}

/** Chips and quick replies work when no turn is in flight and the session is not a read-only replay. */
export function canAnswer(phase: TurnStatus['phase'], replay: boolean): boolean {
  return !replay && (phase === 'idle' || phase === 'error');
}

// ---------- the fix block (7.11) ----------

const FIX_KEY = {
  'attach-inline': 'fix.attachInline',
  'zone-replicas': 'fix.zoneReplicas',
  'missing-group': 'fix.missingGroup',
  'path-order': 'fix.pathOrder',
  'attach-invalid': 'fix.attachInvalid',
  containment: 'fix.containment',
  'dangling-edge': 'fix.dangling',
} as const;

/** Our own wording per repair code, never the validator's raw message. One line per code. */
export function autoFixLines(fixes: readonly AutoFix[], t: TFn): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of fixes) {
    const key = Object.hasOwn(FIX_KEY, f.code) ? FIX_KEY[f.code as keyof typeof FIX_KEY] : 'fix.generic';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t(key));
  }
  return out;
}

/** The human sentence for a constraint the repair turn fixed. `generic` is true when the warning named no card or product. */
export function fixSentence(w: Warning, ctx: { regions: readonly string[]; catalog: Catalog; t: TFn }): { text: string; generic: boolean } {
  if (w.code === 'constraint-region') {
    const regions = ctx.regions.map(regionLabel).join(', ');
    const label = /labelled "([^"]+)"/.exec(w.msg)?.[1] ?? /^region group '[^']*' \((.+)\) is in /.exec(w.msg)?.[1];
    return label ? { text: ctx.t('rec.fixRegion', { label, regions }), generic: false } : { text: ctx.t('rec.fixRegionGeneric', { regions }), generic: true };
  }
  const id = /\buses ([a-z0-9-]+),/.exec(w.msg)?.[1] ?? /^rec '([^']+)'/.exec(w.msg)?.[1];
  return id ? { text: ctx.t('rec.fixAvoid', { product: nameOf(ctx.catalog, id) }), generic: false } : { text: ctx.t('rec.fixAvoidGeneric'), generic: true };
}

/** The distinct sentences of a fix block, in the order the warnings came (at most 3). A sentence that names the card wins over a generic one. */
export function fixSentences(warnings: readonly Warning[], ctx: { regions: readonly string[]; catalog: Catalog; t: TFn }): string[] {
  const all = warnings.filter((w) => CONSTRAINT_CODES.has(w.code)).map((w) => fixSentence(w, ctx));
  const named = all.filter((s) => !s.generic);
  const pick = named.length ? named : all;
  return [...new Set(pick.map((s) => s.text))].slice(0, 3);
}

// ---------- the Cursor and live text (7.12, section 10) ----------

export type CursorSlot = 'none' | 'waiting' | 'note' | 'status' | 'fix';

/**
 * Where the one blinking Cursor sits in the streaming revision: after the waiting text, at the end of the note, in the
 * status line (which owns it while it shows), or in the fix block while a repair is written. Never two at once.
 */
export function cursorSlot(r: Revision, turn: TurnStatus): CursorSlot {
  if (r.status !== 'waiting' && r.status !== 'streaming') return 'none';
  if (turn.phase === 'idle' || turn.phase === 'error') return 'none';
  // the repair's own status text lives in the fix block, so the Cursor goes there too
  if (r.statusLine?.code === 'repair' || r.fix.state === 'fixing') return 'fix';
  if (r.statusLine && r.statusLine.code !== 'summary') return 'status';
  if (!r.note) return 'waiting';
  return 'note';
}

/** The localized words for a failed revision's error: the server's message, else our own from the code. */
export function errorText(e: RevisionError, t: TFn): string {
  if (e.message) return e.message;
  if (e.code === 'network') return t('error.network');
  if (e.code === 'http-401' || e.code === 'signed-out') return t('error.signedOut');
  const http = /^http-(\d+)$/.exec(e.code);
  if (http) return t('error.http', { code: http[1] });
  return t('error.http', { code: e.code });
}

// ---------- scroll anchoring (section 6) ----------

/** Within this many px of the bottom the record counts as "at the bottom" and keeps following the stream. */
export const STICK_PX = 32;

export function distanceFromBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }): number {
  return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
}

/** After a scroll: follow the stream while at (or near) the bottom, let go when the user scrolled up. */
export const followsStream = (distance: number): boolean => distance <= STICK_PX;

/** The Jump to latest chip shows when the user scrolled away from the bottom of a record that is still changing. */
export const showJumpChip = (follows: boolean, streaming: boolean): boolean => !follows && streaming;
