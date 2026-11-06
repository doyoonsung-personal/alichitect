// The BD meeting brief dialog (plan §2): preparation form, the six brief areas with per-item
// editing and review states, the notes-review flow with changes shown BESIDE the saved brief,
// the staleness banner, retention notice, copy/print and delete. It follows the DraftOverlay
// grammar: createPortal into document.body, a scrim, role="dialog" aria-modal, the panel takes
// focus on open, #root goes inert, focus returns to the launch button on close, Escape closes.
// This component NEVER dispatches to the app store and never mutates SessionRecord or the
// localStorage sessions: app state is read only through host-adapter's snapshot copies, and
// every mutation lives in the module's own controller/tables behind the BD API.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { JSX, KeyboardEvent, RefObject } from 'react';
import { createPortal } from 'react-dom';
import type {
  BriefContent, BriefQuestion, ContentSection, ItemOrigin, NextEngagementKind, ReviewState,
} from '@ali/bd-brief/types.ts';
import { LIMITS } from '@ali/bd-brief/types.ts';
import { Icon } from '../../shell/Icon.tsx';
import { useCatalog, useStore, useT } from '../../store/react.tsx';
import type { GenerationFailReason } from './api.ts';
import { createBdBriefApi } from './api.ts';
import type { BdBriefApiErrorCode } from '@ali/bd-brief/types.ts';
import { createBriefController } from './controller.ts';
import type { BriefContext, BriefUiState } from './controller.ts';
import { readSnapshotInputs } from './host-adapter.ts';
import { PrintBrief, printBrief } from './print.tsx';
import type { BT, BdBriefKey } from './strings.ts';
import { makeBT } from './strings.ts';
import './styles.css';

export interface BriefDialogProps {
  /** The id the header trigger's aria-controls points at. */
  id: string;
  ctx: BriefContext;
  /** Where focus returns on close: the header trigger button. */
  returnFocus: RefObject<HTMLElement | null>;
  onClose(): void;
}

/** Section headings double as the change-target labels; the contract's ids map to our keys. */
const SECTION_KEY: Record<ContentSection, BdBriefKey> = {
  opportunity: 'bdb.brief.opportunity',
  valuePoints: 'bdb.brief.value',
  stakeholders: 'bdb.brief.people',
  questions: 'bdb.brief.questions',
  concerns: 'bdb.brief.concerns',
  nextEngagement: 'bdb.brief.next',
};

const KIND_KEY: Record<NextEngagementKind, BdBriefKey> = {
  discovery: 'bdb.brief.kind.discovery',
  'sa-workshop': 'bdb.brief.kind.sa-workshop',
  'poc-scoping': 'bdb.brief.kind.poc-scoping',
};

const ERROR_KEY: Record<BdBriefApiErrorCode, BdBriefKey> = {
  'not-available': 'bdb.error.not-available',
  'not-found': 'bdb.error.generic',
  'version-conflict': 'bdb.error.generic',
  'request-conflict': 'bdb.error.generic',
  'invalid-request': 'bdb.error.invalid-request',
  'limit-exceeded': 'bdb.error.limit-exceeded',
  'generation-failed': 'bdb.error.generation-failed',
  'method-not-allowed': 'bdb.error.generic',
  internal: 'bdb.error.generic',
};

/** The worker's generation-failed reason (routes.ts) deserves a distinct, actionable message. */
const GENERATION_REASON_KEY: Record<GenerationFailReason, BdBriefKey> = {
  timeout: 'bdb.error.generation-timeout',
  model: 'bdb.error.generation-model',
  validation: 'bdb.error.generation-validation',
};

const CHANGE_KIND_KEY: Record<string, BdBriefKey> = {
  'new-fact': 'bdb.review.new-fact',
  'answered-question': 'bdb.review.answered-question',
  conflict: 'bdb.review.conflict',
  'proposed-action': 'bdb.review.proposed-action',
  update: 'bdb.review.update',
};

interface EditTarget {
  section: ContentSection;
  id: string;
}

// ---- pure content helpers (local edits never touch anything but the draft copy) ----

/** The text one editable item shows in its editor, per section. */
export function itemText(draft: BriefContent, section: ContentSection, id: string): string {
  switch (section) {
    case 'opportunity':
      return draft.opportunity.id === id ? draft.opportunity.text : '';
    case 'valuePoints':
      return draft.valuePoints.find((v) => v.id === id)?.text ?? '';
    case 'stakeholders':
      return draft.stakeholders.find((s) => s.id === id)?.role ?? '';
    case 'questions':
      return draft.questions.find((q) => q.id === id)?.text ?? '';
    case 'concerns':
      return draft.concerns.find((c) => c.id === id)?.text ?? '';
    case 'nextEngagement':
      return draft.nextEngagement?.id === id ? draft.nextEngagement.decision : '';
  }
}

/** A per-item edit: returns a NEW content with the item's text replaced and `edited` set, so
 * regeneration and notes review keep the BD's own words intact (plan §6). */
export function editedContent(draft: BriefContent, section: ContentSection, id: string, text: string): BriefContent {
  const next = text.slice(0, LIMITS.itemChars);
  switch (section) {
    case 'opportunity':
      return { ...draft, opportunity: { ...draft.opportunity, text: next.slice(0, LIMITS.opportunityChars), edited: true } };
    case 'valuePoints':
      return { ...draft, valuePoints: draft.valuePoints.map((v) => (v.id === id ? { ...v, text: next, edited: true } : v)) };
    case 'stakeholders':
      return { ...draft, stakeholders: draft.stakeholders.map((s) => (s.id === id ? { ...s, role: next, edited: true } : s)) };
    case 'questions':
      return { ...draft, questions: draft.questions.map((q) => (q.id === id ? { ...q, text: next, edited: true } : q)) };
    case 'concerns':
      return { ...draft, concerns: draft.concerns.map((c) => (c.id === id ? { ...c, text: next, edited: true } : c)) };
    case 'nextEngagement':
      return draft.nextEngagement && draft.nextEngagement.id === id
        ? { ...draft, nextEngagement: { ...draft.nextEngagement, decision: next, edited: true } }
        : draft;
  }
}

/** Confirmation is the BD's explicit act (plan §6): toggling never goes through the server
 * until Save; the AI cannot set it. */
export function toggledReview(draft: BriefContent, section: ContentSection, id: string, review: ReviewState): BriefContent {
  const apply = <T extends { id: string; review: ReviewState }>(item: T): T => (item.id === id ? { ...item, review } : item);
  switch (section) {
    case 'opportunity':
      return { ...draft, opportunity: apply(draft.opportunity) };
    case 'valuePoints':
      return { ...draft, valuePoints: draft.valuePoints.map(apply) };
    case 'stakeholders':
      return { ...draft, stakeholders: draft.stakeholders.map(apply) };
    case 'questions':
      return { ...draft, questions: draft.questions.map(apply) };
    case 'concerns':
      return { ...draft, concerns: draft.concerns.map(apply) };
    case 'nextEngagement':
      return draft.nextEngagement ? { ...draft, nextEngagement: apply(draft.nextEngagement) } : draft;
  }
}

/** The plain-text/Markdown copy of a brief for the clipboard (plan §2: copy the brief). */
export function briefToText(c: BriefContent, bt: BT): string {
  const lines: string[] = [`# ${bt('bdb.dialog.title')}`, `> ${bt('bdb.dialog.internal')}`, ''];
  const sec = (title: string): void => {
    lines.push(`## ${title}`);
  };
  if (c.opportunity.text.trim()) {
    sec(bt('bdb.brief.opportunity'));
    lines.push(c.opportunity.text, '');
  }
  if (c.valuePoints.length) {
    sec(bt('bdb.brief.value'));
    for (const v of c.valuePoints) lines.push(`- **${v.label.trim() || bt('bdb.brief.unlabeledValue')}** — ${v.text}`);
    lines.push('');
  }
  if (c.stakeholders.length) {
    sec(bt('bdb.brief.people'));
    for (const s of c.stakeholders) lines.push(`- ${s.kind === 'named' ? (s.name ?? bt('bdb.brief.unknown')) : bt('bdb.brief.suggestedRole')}: ${s.role}`);
    lines.push('');
  }
  if (c.questions.length) {
    sec(bt('bdb.brief.questions'));
    for (const q of c.questions) {
      lines.push(`- ${q.priority ? `[${bt('bdb.brief.priority')}] ` : ''}${q.text}`);
      if (q.answer) lines.push(`  - ${bt('bdb.brief.answer')}: ${q.answer.text}`);
    }
    lines.push('');
  }
  if (c.concerns.length) {
    sec(bt('bdb.brief.concerns'));
    for (const k of c.concerns) {
      lines.push(`- ${k.kind === 'hypothesis' ? `[${bt('bdb.brief.hypothesis')}] ` : ''}${k.text}`);
      if (k.investigation) lines.push(`  - ${bt('bdb.brief.investigation')}: ${k.investigation}`);
    }
    lines.push('');
  }
  if (c.nextEngagement) {
    sec(bt('bdb.brief.next'));
    const n = c.nextEngagement;
    lines.push(`- ${bt(KIND_KEY[n.kind])}: ${n.decision}`);
    if (n.owner) lines.push(`- ${bt('bdb.brief.owner')}: ${n.owner}`);
    if (n.date) lines.push(`- ${bt('bdb.brief.date')}: ${n.date}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

const fmtElapsed = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function BriefDialog(props: BriefDialogProps): JSX.Element {
  const { ctx, returnFocus, onClose } = props;
  const { lang } = useT();
  const bt = useMemo(() => makeBT(lang), [lang]);
  const store = useStore();
  const catalog = useCatalog();

  // form state (all module-local; nothing here reaches the app store)
  const [objective, setObjective] = useState('');
  const [attendees, setAttendees] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [noteSource, setNoteSource] = useState('');
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [editText, setEditText] = useState('');
  const [editingChange, setEditingChange] = useState<string | null>(null);
  const [changeText, setChangeText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [printExtended, setPrintExtended] = useState(false);
  const [printSeq, setPrintSeq] = useState(0);

  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const liveId = useId();
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  // emitted state arrives through onState; before the first emission the controller's own
  // initial state is the view (this ordering keeps TS out of a circular inference)
  const [emitted, setEmitted] = useState<BriefUiState | null>(null);
  const controller = useMemo(
    () => createBriefController({
      api: createBdBriefApi(),
      clock: { now: () => Date.now() },
      onState: setEmitted,
      // the only read path into app state: a fresh snapshot copy, never a live reference
      capture: () => readSnapshotInputs(store, catalog, { lang: langRef.current, objective: null, now: Date.now() }),
    }),
    [store, catalog],
  );
  const state: BriefUiState = emitted ?? controller.getState();

  // open the module for this context; a session/language/account switch reloads and the
  // controller's stale guard discards anything still in flight for the old context (plan §5)
  useEffect(() => {
    controller.open({ sessionId: ctx.sessionId, lang, accountEmail: ctx.accountEmail });
    void controller.load(ctx.sessionId);
    return () => controller.close();
  }, [controller, ctx.sessionId, ctx.accountEmail, lang]);
  useEffect(() => store.subscribe(() => controller.checkSource()), [store, controller]);

  // DraftOverlay grammar: #root goes inert, the panel takes focus, focus returns on close
  useEffect(() => {
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    panel.current?.focus();
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    const containFocus = (event: FocusEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) panel.current.focus();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('focusin', containFocus);
      root?.removeAttribute('inert');
      returnFocus.current?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the module's own elapsed clock while generating; it never touches the app's busy state
  const generating = state.generating !== null;
  useEffect(() => {
    if (!generating) return;
    const h = setInterval(() => controller.tick(), 500);
    return () => clearInterval(h);
  }, [generating, controller]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  // print runs AFTER the print surface re-rendered with the chosen selection
  useEffect(() => {
    if (printSeq > 0) printBrief();
  }, [printSeq]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Tab' && panel.current) {
      const controls = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]'))
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) { e.preventDefault(); panel.current.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    // Escape closes; the controller's close-on-unmount cancels anything in flight
    close();
  }, [close]);

  const doPrint = (extended: boolean): void => {
    setPrintExtended(extended);
    setPrintSeq((n) => n + 1);
  };

  const copy = (): void => {
    const text = briefToText(state.draft, bt);
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  };

  const generate = (): void => {
    // objective and attendees are folded into the snapshot objective: both stay optional and
    // neither blocks preparation (plan §2)
    const composed = [
      objective.trim(),
      attendees.trim() ? bt('bdb.prep.attendeesLine', { names: attendees.trim() }) : '',
    ].filter(Boolean).join('\n');
    void controller.prepare(composed || null);
  };

  const saveAndReviewNotes = async (): Promise<void> => {
    const note = await controller.saveNotes(noteText, noteDate || null, noteSource || null);
    if (note) {
      setNoteText('');
      setNoteDate('');
      setNoteSource('');
      await controller.reviewNotes([note.id]);
    }
  };

  const startEdit = (section: ContentSection, id: string): void => {
    setEditing({ section, id });
    setEditText(itemText(state.draft, section, id));
  };

  const saveEdit = (): void => {
    if (!editing) return;
    controller.editContent(editedContent(state.draft, editing.section, editing.id, editText));
    setEditing(null);
  };

  const toggleConfirm = (section: ContentSection, id: string, review: ReviewState): void => {
    controller.editContent(toggledReview(state.draft, section, id, review === 'confirmed' ? 'unreviewed' : 'confirmed'));
  };

  const isEditing = (section: ContentSection, id: string): boolean => editing?.section === section && editing.id === id;

  // ---- shared bits ----

  const badges = (section: ContentSection, id: string, review: ReviewState, origin: ItemOrigin, edited: boolean | undefined): JSX.Element => (
    <span className="bdb__badges">
      <span className="bdb__badge" data-review={review}>{bt(`bdb.brief.${review}` as BdBriefKey)}</span>
      {origin === 'model' && !edited ? <span className="bdb__badge bdb__badge--model">{bt('bdb.brief.model')}</span> : null}
      {edited ? <span className="bdb__badge bdb__badge--edited">{bt('bdb.brief.edited')}</span> : null}
      <button
        type="button"
        className="bdb__item-btn"
        aria-pressed={review === 'confirmed'}
        disabled={working}
        onClick={() => toggleConfirm(section, id, review)}
      >
        {review === 'confirmed' ? bt('bdb.brief.unconfirm') : bt('bdb.brief.confirm')}
      </button>
      <button type="button" className="bdb__item-btn" disabled={working} onClick={() => (isEditing(section, id) ? setEditing(null) : startEdit(section, id))}>
        {bt('bdb.brief.edit')}
      </button>
    </span>
  );

  const editor = (section: ContentSection, id: string): JSX.Element | null =>
    isEditing(section, id) ? (
      <span className="bdb__editor">
        <textarea
          className="bdb__textarea"
          rows={3}
          maxLength={LIMITS.itemChars}
          value={editText}
          disabled={working}
          aria-label={bt(SECTION_KEY[section])}
          autoFocus
          onChange={(e) => setEditText(e.target.value)}
        />
        <span className="bdb__editor-actions">
          <button type="button" className="btn btn--secondary" disabled={working} onClick={saveEdit}>{bt('bdb.brief.save')}</button>
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>{bt('bdb.brief.cancel')}</button>
        </span>
      </span>
    ) : null;

  const renderQuestion = (q: BriefQuestion): JSX.Element => (
    <li key={q.id} className="bdb__item" data-review={q.review}>
      <div className="bdb__item-main">
        {q.priority ? <span className="bdb__badge bdb__badge--priority">{bt('bdb.brief.priority')}</span> : null}
        {isEditing('questions', q.id) ? null : <span className="bdb__item-text">{q.text}</span>}
        {q.context ? <span className="bdb__item-context">{q.context}</span> : null}
        {q.answer ? <span className="bdb__item-answer">{bt('bdb.brief.answer')}: {q.answer.text}</span> : null}
        {editor('questions', q.id)}
      </div>
      {badges('questions', q.id, q.review, q.origin, q.edited)}
    </li>
  );

  const draft = state.draft;
  const brief = state.payload?.brief ?? null;
  // the preparation form owns the screen until an accepted version or a generated draft exists
  const prepForm = !state.payload
    || (brief !== null && brief.version === 0 && !state.dirty && state.phase !== 'reviewing-changes');
  const priorityQuestions = draft.questions.filter((q) => q.priority).slice(0, LIMITS.priorityQuestions);
  const priorityIds = new Set(priorityQuestions.map((q) => q.id));
  const otherQuestions = draft.questions.filter((q) => !priorityIds.has(q.id));
  // accepted untargeted changes can leave a value point with an empty label: show a generic
  // localized fallback instead of rendering nothing
  const valueLabel = (label: string): string => label.trim() || bt('bdb.brief.unlabeledValue');
  const working = state.phase === 'generating' || state.phase === 'saving' || state.phase === 'loading-brief';
  const workingLabel = state.phase === 'generating'
    ? (state.generating?.mode === 'review-notes' ? bt('bdb.notes.reviewing') : bt('bdb.prep.generating'))
    : state.phase === 'saving' && noteText ? bt('bdb.notes.reviewing')
    : state.phase === 'saving' && state.changes ? bt('bdb.review.committing')
    : '';

  const reviewColumn = (
    <div className="bdb__review-saved" aria-label={bt('bdb.review.existing')}>
      <h3 className="bdb__review-saved-title">{bt('bdb.review.existing')}</h3>
      {draft.opportunity.text.trim() ? (
        <section className="bdb__sec"><h3 className="bdb__sec-h">{bt('bdb.brief.opportunity')}</h3><p className="bdb__p">{draft.opportunity.text}</p></section>
      ) : null}
      {draft.valuePoints.map((v) => (
        <p key={v.id} className="bdb__p"><strong>{valueLabel(v.label)}</strong> — {v.text}</p>
      ))}
      {draft.questions.map((q) => (
        <p key={q.id} className="bdb__p bdb__p--dim">{q.priority ? `${bt('bdb.brief.priority')}: ` : ''}{q.text}</p>
      ))}
      {draft.nextEngagement ? (
        <p className="bdb__p"><strong>{bt('bdb.brief.next')}</strong> — {draft.nextEngagement.decision}</p>
      ) : null}
    </div>
  );

  return createPortal(
    <div className="bdb">
      <div className="bdb__scrim" aria-hidden="true" />
      <div
        ref={panel}
        id={props.id}
        className="bdb__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="bdb__head">
          <div className="bdb__head-titles">
            <h2 id={titleId} className="bdb__title">{bt('bdb.dialog.title')}</h2>
            {/* internal working-document labeling, always visible (plan §2 first-release scope) */}
            <p className="bdb__internal"><span className="bdb__badge bdb__badge--internal">{bt('bdb.dialog.internal')}</span> {bt('bdb.dialog.internalNote')}</p>
          </div>
          <div className="bdb__head-actions">
            {brief ? <span className="bdb__version">{bt('bdb.brief.version', { version: brief.version })}</span> : null}
            <button type="button" className="btn btn--ghost" aria-label={bt('bdb.dialog.close')} onClick={close}>
              <Icon name="close" />
            </button>
          </div>
        </header>

        {generating ? (
          <p className="bdb__working" role="status">
            <Icon name="spinner" className="bdb__spin" />
            <span>{workingLabel || bt('bdb.prep.generating')}</span>
            {state.generating ? <span className="bdb__elapsed" role="timer">{fmtElapsed(state.generating.elapsedMs)}</span> : null}
            <button type="button" className="btn btn--secondary" onClick={() => controller.cancel()}>
              <Icon name="stop" />
              <span>{bt('bdb.prep.cancel')}</span>
            </button>
          </p>
        ) : null}

        {state.phase === 'loading-brief' ? <p className="bdb__working" role="status"><Icon name="spinner" className="bdb__spin" /></p> : null}

        {state.staleSource && state.payload ? (
          <div className="bdb__banner" role="status">
            <span>{bt('bdb.stale.banner')}</span>
            <button type="button" className="btn btn--secondary" disabled={working} onClick={() => void controller.refreshFromSource()}>
              <Icon name="retry" />
              <span>{bt('bdb.stale.refresh')}</span>
            </button>
          </div>
        ) : null}

        {state.phase === 'version-conflict' && state.conflict ? (
          <div className="bdb__banner bdb__banner--conflict" role="alert">
            <strong>{bt('bdb.conflict.title')}</strong>
            <span>{bt('bdb.conflict.body', { version: state.conflict.currentVersion })}</span>
            <span className="bdb__banner-actions">
              <button type="button" className="btn btn--secondary" onClick={() => void controller.load(ctx.sessionId)}>{bt('bdb.conflict.reload')}</button>
              {/* keeps the unsaved edits: editContent lifts the conflict and the draft stays (plan §7) */}
              <button type="button" className="btn btn--ghost" onClick={() => controller.editContent(state.draft)}>{bt('bdb.conflict.keep')}</button>
            </span>
          </div>
        ) : null}

        {state.phase === 'error' && state.error ? (
          <div className="bdb__banner bdb__banner--error" role="alert">
            {/* a generation failure with a known reason says WHICH failure the BD hit (m3) */}
            <span>{bt(state.error.code === 'generation-failed' && state.error.reason
              ? GENERATION_REASON_KEY[state.error.reason]
              : ERROR_KEY[state.error.code] ?? 'bdb.error.generic')}</span>
            <button type="button" className="btn btn--secondary" onClick={() => void controller.load(ctx.sessionId)}>
              <Icon name="retry" />
              <span>{bt('bdb.error.retry')}</span>
            </button>
          </div>
        ) : null}

        <div className="bdb__body">
          {prepForm && state.phase !== 'loading-brief' ? (
            <form
              className="bdb__prep"
              onSubmit={(e) => {
                e.preventDefault();
                generate();
              }}
            >
              <h3 className="bdb__sec-h">{bt('bdb.prep.heading')}</h3>
              <p className="bdb__hint">{bt('bdb.prep.noBriefYet')}</p>
              <label className="bdb__field">
                <span className="bdb__label">{bt('bdb.prep.objective')}</span>
                <textarea
                  className="bdb__textarea"
                  rows={2}
                  maxLength={LIMITS.objectiveChars}
                  placeholder={bt('bdb.prep.objectivePlaceholder')}
                  value={objective}
                  disabled={working}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </label>
              <label className="bdb__field">
                <span className="bdb__label">{bt('bdb.prep.attendees')}</span>
                <input
                  className="bdb__input"
                  type="text"
                  maxLength={200}
                  autoComplete="off"
                  placeholder={bt('bdb.prep.attendeesPlaceholder')}
                  value={attendees}
                  disabled={working}
                  onChange={(e) => setAttendees(e.target.value)}
                />
              </label>
              {/* retention notice: account storage differs from browser-local sessions (plan §7) */}
              <p className="bdb__retention">{bt('bdb.prep.retention')}</p>
              <div className="bdb__actions">
                <button type="submit" className="btn btn--primary" disabled={working}>
                  {generating ? <Icon name="spinner" className="bdb__spin" /> : null}
                  <span>{generating ? bt('bdb.prep.generating') : bt('bdb.prep.generate')}</span>
                </button>
                {generating ? (
                  <button type="button" className="btn btn--secondary" onClick={() => controller.cancel()}>
                    <Icon name="stop" />
                    <span>{bt('bdb.prep.cancel')}</span>
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {state.payload && !prepForm ? (
            <div className="bdb__brief">
              <section className="bdb__sec">
                <h3 className="bdb__sec-h">{bt('bdb.brief.opportunity')}</h3>
                <div className="bdb__item" data-review={draft.opportunity.review}>
                  <div className="bdb__item-main">
                    {isEditing('opportunity', draft.opportunity.id) ? null : (
                      <p className="bdb__p">{draft.opportunity.text.trim() || bt('bdb.brief.empty')}</p>
                    )}
                    {editor('opportunity', draft.opportunity.id)}
                  </div>
                  {badges('opportunity', draft.opportunity.id, draft.opportunity.review, draft.opportunity.origin, draft.opportunity.edited)}
                </div>
              </section>

              <section className="bdb__sec">
                <h3 className="bdb__sec-h">{bt('bdb.brief.value')}</h3>
                {draft.valuePoints.length === 0 ? <p className="bdb__p bdb__p--dim">{bt('bdb.brief.empty')}</p> : null}
                <ul className="bdb__items">
                  {draft.valuePoints.map((v) => (
                    <li key={v.id} className="bdb__item" data-review={v.review}>
                      <div className="bdb__item-main">
                        <strong className="bdb__item-label">{valueLabel(v.label)}</strong>
                        {isEditing('valuePoints', v.id) ? null : <span className="bdb__item-text">{v.text}</span>}
                        {editor('valuePoints', v.id)}
                      </div>
                      {badges('valuePoints', v.id, v.review, v.origin, v.edited)}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bdb__sec">
                <h3 className="bdb__sec-h">{bt('bdb.brief.people')}</h3>
                {draft.stakeholders.length === 0 ? <p className="bdb__p bdb__p--dim">{bt('bdb.brief.empty')}</p> : null}
                <ul className="bdb__items">
                  {draft.stakeholders.map((s) => (
                    <li key={s.id} className="bdb__item" data-review={s.review}>
                      <div className="bdb__item-main">
                        {/* a named person is distinguished from a suggested role; no invented person (plan §6) */}
                        <span className="bdb__badge">{s.kind === 'named' ? bt('bdb.brief.named') : bt('bdb.brief.suggestedRole')}</span>
                        <strong className="bdb__item-label">{s.kind === 'named' ? (s.name ?? bt('bdb.brief.unknown')) : ''}</strong>
                        {isEditing('stakeholders', s.id) ? null : <span className="bdb__item-text">{s.role}</span>}
                        {editor('stakeholders', s.id)}
                      </div>
                      {badges('stakeholders', s.id, s.review, s.origin, s.edited)}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bdb__sec">
                <h3 className="bdb__sec-h">{bt('bdb.brief.questions')}</h3>
                {draft.questions.length === 0 ? <p className="bdb__p bdb__p--dim">{bt('bdb.brief.empty')}</p> : null}
                {/* at most three priority questions first; the rest stays expandable (plan §2) */}
                <ul className="bdb__items">{priorityQuestions.map(renderQuestion)}</ul>
                {otherQuestions.length ? (
                  showAllQuestions ? (
                    <>
                      <ul className="bdb__items">{otherQuestions.map(renderQuestion)}</ul>
                      <button type="button" className="bdb__item-btn" onClick={() => setShowAllQuestions(false)}>
                        {bt('bdb.brief.fewerQuestions')}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="bdb__item-btn" onClick={() => setShowAllQuestions(true)}>
                      {bt('bdb.brief.moreQuestions', { n: otherQuestions.length })}
                    </button>
                  )
                ) : null}
              </section>

              <section className="bdb__sec">
                <h3 className="bdb__sec-h">{bt('bdb.brief.concerns')}</h3>
                {draft.concerns.length === 0 ? <p className="bdb__p bdb__p--dim">{bt('bdb.brief.empty')}</p> : null}
                <ul className="bdb__items">
                  {draft.concerns.map((c) => (
                    <li key={c.id} className="bdb__item" data-review={c.review}>
                      <div className="bdb__item-main">
                        {/* a model-inferred concern stays clearly labeled as a hypothesis (plan §6) */}
                        <span className={`bdb__badge ${c.kind === 'hypothesis' ? 'bdb__badge--hypothesis' : ''}`}>
                          {c.kind === 'hypothesis' ? bt('bdb.brief.hypothesis') : bt('bdb.brief.stated')}
                        </span>
                        {isEditing('concerns', c.id) ? null : <span className="bdb__item-text">{c.text}</span>}
                        {c.investigation ? <span className="bdb__item-context">{bt('bdb.brief.investigation')}: {c.investigation}</span> : null}
                        {editor('concerns', c.id)}
                      </div>
                      {badges('concerns', c.id, c.review, c.origin, c.edited)}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bdb__sec">
                <h3 className="bdb__sec-h">{bt('bdb.brief.next')}</h3>
                {draft.nextEngagement ? (
                  <div className="bdb__item" data-review={draft.nextEngagement.review}>
                    <div className="bdb__item-main">
                      <span className="bdb__badge">{bt(KIND_KEY[draft.nextEngagement.kind])}</span>
                      {isEditing('nextEngagement', draft.nextEngagement.id) ? null : (
                        <span className="bdb__item-text">{draft.nextEngagement.decision}</span>
                      )}
                      {/* owner and date only when known — the labels make an unknown visible */}
                      <span className="bdb__item-context">
                        {draft.nextEngagement.owner ? `${bt('bdb.brief.owner')}: ${draft.nextEngagement.owner}` : `${bt('bdb.brief.owner')}: ${bt('bdb.brief.unknown')}`}
                        {draft.nextEngagement.date ? ` · ${bt('bdb.brief.date')}: ${draft.nextEngagement.date}` : ''}
                      </span>
                      {editor('nextEngagement', draft.nextEngagement.id)}
                    </div>
                    {badges('nextEngagement', draft.nextEngagement.id, draft.nextEngagement.review, draft.nextEngagement.origin, draft.nextEngagement.edited)}
                  </div>
                ) : (
                  <p className="bdb__p bdb__p--dim">{bt('bdb.brief.empty')}</p>
                )}
              </section>
            </div>
          ) : null}

          {state.phase === 'reviewing-changes' && state.changes ? (
            <div className="bdb__review">
              <div className="bdb__review-head">
                <h3 className="bdb__sec-h">{bt('bdb.review.heading')}</h3>
                <p className="bdb__hint">{bt('bdb.review.beside')}</p>
              </div>
              {state.changes.length === 0 ? <p className="bdb__p bdb__p--dim">{bt('bdb.review.noChanges')}</p> : null}
              <div className="bdb__review-cols">
                <ul className="bdb__changes">
                  {state.changes.map((c) => {
                    const decision = state.decisions[c.id];
                    return (
                      <li key={c.id} className="bdb__change" data-kind={c.kind} data-decision={decision?.decision ?? 'undecided'}>
                        <span className="bdb__change-kind">
                          <span className={`bdb__badge ${c.kind === 'conflict' ? 'bdb__badge--conflict' : ''}`}>{bt(CHANGE_KIND_KEY[c.kind] ?? 'bdb.review.update')}</span>
                          <span className="bdb__badge">{bt(SECTION_KEY[c.section])}</span>
                        </span>
                        {/* a conflict shows BOTH sources; the newest statement is not automatically true (plan §6) */}
                        {c.conflict ? (
                          <span className="bdb__conflict">
                            <span className="bdb__conflict-hint">{bt('bdb.review.conflict')}</span>
                            <span className="bdb__conflict-side"><strong>{bt('bdb.review.existing')}</strong> {c.conflict.existingText}</span>
                            <span className="bdb__conflict-side"><strong>{bt('bdb.review.proposed')}</strong> {c.proposedText}</span>
                          </span>
                        ) : (
                          <span className="bdb__change-text">{c.proposedText}</span>
                        )}
                        {editingChange === c.id ? (
                          <span className="bdb__editor">
                            <textarea
                              className="bdb__textarea"
                              rows={3}
                              maxLength={LIMITS.itemChars}
                              value={changeText}
                              aria-label={bt('bdb.review.edit')}
                              disabled={working}
                              autoFocus
                              onChange={(e) => setChangeText(e.target.value)}
                            />
                            <span className="bdb__editor-actions">
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => {
                                  controller.acceptChange(c.id, changeText.trim() || null);
                                  setEditingChange(null);
                                }}
                              >
                                {bt('bdb.review.accept')}
                              </button>
                              <button type="button" className="btn btn--ghost" onClick={() => setEditingChange(null)}>{bt('bdb.brief.cancel')}</button>
                            </span>
                          </span>
                        ) : null}
                        <span className="bdb__change-actions">
                          {decision ? (
                            <span className="bdb__badge" data-decision={decision.decision}>
                              {decision.decision === 'accepted' ? bt('bdb.review.accepted') : bt('bdb.review.rejectedState')}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn--secondary"
                            disabled={working}
                            onClick={() => {
                              controller.acceptChange(c.id, decision?.editedText ?? null);
                              setEditingChange(null);
                            }}
                          >
                            {bt('bdb.review.accept')}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={working}
                            onClick={() => {
                              setEditingChange(c.id);
                              setChangeText(decision?.editedText ?? c.proposedText);
                            }}
                          >
                            {bt('bdb.review.edit')}
                          </button>
                          <button type="button" className="btn btn--ghost" disabled={working} onClick={() => controller.rejectChange(c.id)}>
                            {bt('bdb.review.reject')}
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {reviewColumn}
              </div>
              <div className="bdb__actions">
                <button type="button" className="btn btn--primary" disabled={working} onClick={() => void controller.commitChanges()}>
                  <span>{working ? bt('bdb.review.committing') : bt('bdb.review.commit')}</span>
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => void controller.load(ctx.sessionId)}>
                  {bt('bdb.dialog.back')}
                </button>
              </div>
            </div>
          ) : null}

          {state.payload && state.phase !== 'reviewing-changes' ? (
            <form
              className="bdb__notes"
              onSubmit={(e) => {
                e.preventDefault();
                void saveAndReviewNotes();
              }}
            >
              <h3 className="bdb__sec-h">{bt('bdb.notes.heading')}</h3>
              <label className="bdb__field">
                <span className="bdb__label">{bt('bdb.notes.paste')}</span>
                <textarea
                  className="bdb__textarea"
                  rows={4}
                  maxLength={LIMITS.noteChars}
                  placeholder={bt('bdb.notes.pastePlaceholder')}
                  value={noteText}
                  disabled={working}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              </label>
              <span className="bdb__notes-row">
                <label className="bdb__field">
                  <span className="bdb__label">{bt('bdb.notes.date')}</span>
                  <input className="bdb__input" type="text" inputMode="numeric" autoComplete="off" placeholder="YYYY-MM-DD" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
                </label>
                <label className="bdb__field">
                  <span className="bdb__label">{bt('bdb.notes.source')}</span>
                  <input className="bdb__input" type="text" autoComplete="off" value={noteSource} onChange={(e) => setNoteSource(e.target.value)} />
                </label>
              </span>
              {/* notes stay in this module; the notice says so where they are entered (plan §2) */}
              <p className="bdb__retention">{bt('bdb.notes.retention')}</p>
              <div className="bdb__actions">
                <button type="submit" className="btn btn--primary" disabled={working || !noteText.trim()}>
                  <span>{state.generating?.mode === 'review-notes' ? bt('bdb.notes.reviewing') : bt('bdb.notes.review')}</span>
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {state.payload && !prepForm ? (
          <footer className="bdb__foot">
            <button type="button" className="btn btn--primary" disabled={!state.dirty || working} onClick={() => void controller.saveEdits()}>
              <span>{state.dirty ? bt('bdb.brief.saveEdits') : bt('bdb.brief.saved')}</span>
            </button>
            <button type="button" className="btn btn--secondary" onClick={copy}>
              <span>{copied ? bt('bdb.brief.copied') : bt('bdb.brief.copy')}</span>
            </button>
            {/* one A4 page by default; the extended view is the explicit choice when it does not fit (plan §9) */}
            <button type="button" className="btn btn--secondary" onClick={() => doPrint(false)}>
              <span>{bt('bdb.brief.print')}</span>
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => doPrint(true)}>
              <span>{bt('bdb.print.extended')}</span>
            </button>
            {confirmDelete ? (
              <span className="bdb__delete-confirm" role="alertdialog" aria-label={bt('bdb.brief.deleteConfirm')}>
                <span>{bt('bdb.brief.deleteConfirm')}</span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setConfirmDelete(false);
                    void controller.remove();
                  }}
                >
                  {bt('bdb.brief.deleteYes')}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                  {bt('bdb.brief.deleteNo')}
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn--ghost bdb__delete" onClick={() => setConfirmDelete(true)}>
                {bt('bdb.brief.delete')}
              </button>
            )}
          </footer>
        ) : null}

        <p id={liveId} className="visually-hidden" aria-live="polite">
          {workingLabel}
        </p>
      </div>
      {/* the print surface lives OUTSIDE the dialog panel: @media print hides #root and .bdb
          and prints only this subtree (styles.css) */}
      {createPortal(<PrintBrief content={state.draft} lang={lang} extended={printExtended} stale={state.staleSource} />, document.body)}
    </div>,
    document.body,
  );
}
