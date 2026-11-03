// One revision of the record (spec 7.8 to 7.12): tag, the ask, Qwen's note with the Cursor, the change set, the fix
// block, notes and status lines, the footer, and the error block when it failed. Never a bubble.
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import { ChangeList } from './ChangeList.tsx';
import { Questions } from './Questions.tsx';
import { Cursor, useNow } from './Cursor.tsx';
import { autoFixLines, cursorSlot, drawProgress, errorText, fixSentences, fmtSeconds, footerItems, revisionCards, statusText, waitingLine } from './logic.ts';
import type { Revision } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

export function RevTag({ ctx, r }: { ctx: ConsoleCtx; r: Revision }): ReactElement {
  const { t, actions, latestCommitted, highlightedRevision } = ctx;
  const live = r.status === 'waiting' || r.status === 'streaming';
  // the tag that was live when this record mounted stamps on as ink when the revision commits, with the canvas's tags
  const sawLive = useRef(live);
  if (live) sawLive.current = true;
  const stamp = sawLive.current && !live && latestCommitted === r.n;
  const { cards, ghosts } = revisionCards(r);
  const cls = `tag${latestCommitted === r.n ? ' tag--latest' : ''}${live ? ' tag--live' : ''}`;
  if (!cards.length && !ghosts.length) {
    return (
      <span className={`${cls} tag--static`} data-stamp={stamp || undefined} aria-hidden="true">
        <span className="num">{r.n}</span>
      </span>
    );
  }
  const on = (): void => actions.highlight({ source: 'revision', cards, ghosts, revision: r.n });
  return (
    <button
      type="button"
      className={cls}
      data-stamp={stamp || undefined}
      aria-pressed={highlightedRevision === r.n}
      aria-label={t('rec.tagLabel', { n: r.n })}
      onMouseEnter={on}
      onMouseLeave={() => actions.highlight(null)}
      onFocus={on}
      onBlur={() => actions.highlight(null)}
      onClick={() => cards.length && actions.panTo(cards)}
    >
      <span className="num">{r.n}</span>
    </button>
  );
}

/**
 * Qwen's note as it streams: what has arrived settles into ink, and the words that just arrived come in light and settle
 * (--d-ink), so the eye sees where the note is growing. Text present when the note mounts (a finished revision, a
 * restored session) is simply there.
 */
export function NoteText({ text, live }: { text: string; live: boolean }): ReactElement {
  const seen = useRef(live ? '' : text);
  const base = text.startsWith(seen.current) ? seen.current : '';
  const fresh = text.slice(base.length);
  useEffect(() => {
    seen.current = text;
  }, [text]);
  return (
    <>
      {base}
      {fresh ? (
        <span key={text.length} className="ink" data-live={live || undefined}>
          {fresh}
        </span>
      ) : null}
    </>
  );
}

/** The user's words, verbatim, up to six lines, then Show all. */
function Ask({ ctx, r }: { ctx: ConsoleCtx; r: Revision }): ReactElement {
  const { t } = ctx;
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = (): void => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [r.ask, open]);
  return (
    <div className="rev__askwrap">
      <p className="rev__ask prose" lang={r.askLang} ref={ref} data-open={open || undefined}>
        <span className="visually-hidden">{t('rec.askLabel')}: </span>
        {r.ask}
      </p>
      {clipped || open ? (
        <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t('rec.showLess') : t('rec.showAll')}
        </button>
      ) : null}
    </div>
  );
}

function Footer({ ctx, r }: { ctx: ConsoleCtx; r: Revision }): ReactElement | null {
  const { t, requirements } = ctx;
  const live = r.status === 'streaming';
  const now = useNow(live, 200);
  // the closing line ("Drawn in 9.5 s · Requirements held") arrives when this revision commits in front of the reader
  const sawLive = useRef(live);
  if (live) sawLive.current = true;
  if (live) {
    const p = drawProgress(r.changes);
    const items: string[] = [];
    if (p) items.push(t('rec.planProgress', { done: p.done, total: p.total }));
    items.push(t('rec.seconds', { s: fmtSeconds(now - r.startedAt) }));
    return (
      <p className="rev__foot num">
        <span className="rev__foot-live">{t('rec.drawing')}</span>
        {items.map((s) => (
          <Fragment key={s}>
            <span aria-hidden="true"> {'·'} </span>
            <span>{s}</span>
          </Fragment>
        ))}
      </p>
    );
  }
  const items = footerItems(r, requirements.length > 0, t);
  if (!items.length) return null;
  return (
    <p className="rev__foot num" data-enter={sawLive.current || undefined}>
      {items.map((it, i) => (
        <Fragment key={it.key}>
          {i > 0 ? <span aria-hidden="true"> {'·'} </span> : null}
          <span className="rev__foot-item" data-tone={it.tone}>
            {it.check ? <Icon name="check" size={12} /> : null}
            {it.text}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

/** The fix block (7.11): deterministic repairs in one collapsed line, and the repair turn when a pinned requirement was at stake. */
function FixBlock({ ctx, r, slot }: { ctx: ConsoleCtx; r: Revision; slot: ReturnType<typeof cursorSlot> }): ReactElement | null {
  const { t, catalog, requirements, turn } = ctx;
  const [open, setOpen] = useState(false);
  const fix = r.fix;
  const hasTurn = fix.state !== 'none';
  if (!hasTurn && !fix.autoFixes.length) return null;
  const regions = [...new Set(requirements.flatMap((q) => q.regions))];
  const sentences = fixSentences(fix.constraint, { regions, catalog, t });
  const lines = autoFixLines(fix.autoFixes, t);
  const statusLabel = r.statusLine?.code === 'repair' ? statusText(r.statusLine, r, t) : t('rec.fixing');
  // a second pass finished this revision: the sentences below name Qwen as the fixer, so they stay out of its record
  const rescued = r.finishing === true;
  return (
    <div className="fix" data-state={fix.state} data-rescue={rescued || undefined}>
      {hasTurn ? (
        <div className="fix__turn">
          {fix.state === 'fixing' ? (
            <p className="fix__head fix__head--fixing">
              {!fix.note && slot === 'fix' ? <Cursor lastTextAt={turn.lastTextAt} lead /> : null}
              <span>{statusLabel}</span>
            </p>
          ) : fix.state === 'fixed' ? (
            <p className="fix__head fix__head--fixed">
              <Icon name="check" size={14} />
              <span>{t('rec.fixed')}</span>
            </p>
          ) : (
            <p className="fix__head fix__head--failed" role="status">
              {t(rescued ? 'rec.fixFailedRescued' : 'rec.fixFailed')}
            </p>
          )}
          {fix.state !== 'failed' && !rescued && sentences.length
            ? sentences.map((s) => (
                <p key={s} className="fix__sentence prose">
                  {s}
                </p>
              ))
            : null}
          {fix.note ? (
            <p className="fix__note prose" lang={r.askLang}>
              <NoteText text={fix.note} live={slot === 'fix'} />
              {slot === 'fix' ? <Cursor lastTextAt={turn.lastTextAt} /> : null}
            </p>
          ) : null}
          <ChangeList ctx={ctx} lines={fix.changes} live={r.status === 'streaming'} />
        </div>
      ) : null}
      {fix.autoFixes.length ? (
        <div className="fix__auto" data-sep={hasTurn || undefined}>
          <button type="button" className="fix__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span>{t(r.mode === 'workflow' ? 'workflow.fix.heading' : 'rec.autoFixes', { n: fix.autoFixes.length })}</span>
            <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} />
          </button>
          {open ? (
            <ul className="fix__list">
              {lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ErrorBlock({ ctx, r }: { ctx: ConsoleCtx; r: Revision }): ReactElement | null {
  const { t, actions, revisions, replay } = ctx;
  const e = r.error;
  if (!e) return null;
  const last = revisions[revisions.length - 1]?.n === r.n;
  return (
    <div className="err" role="alert">
      <p className="err__title">
        <Icon name="infoCircle" />
        <span>{t('rec.failedTitle')}</span>
      </p>
      <p className="err__msg prose">{errorText(e, t)}</p>
      {last ? (
        <div className="err__actions">
          {e.retryable ? (
            <button type="button" className="btn btn--secondary" disabled={!!replay} onClick={actions.retry}>
              <Icon name="retry" />
              <span>{t('rec.retry')}</span>
            </button>
          ) : null}
          {r.intent !== 'deployment' && <button type="button" className="btn btn--secondary" disabled={!!replay} onClick={actions.editAndResend}>
            <Icon name="edit" />
            <span>{t('rec.editResend')}</span>
          </button>}
        </div>
      ) : null}
    </div>
  );
}

export function RevisionBlock({ ctx, r, onCollapse }: { ctx: ConsoleCtx; r: Revision; onCollapse?: () => void }): ReactElement {
  const { t, turn } = ctx;
  const slot = cursorSlot(r, turn);
  const ended = r.status === 'failed' || r.status === 'stopped';
  const waiting = r.status === 'waiting';
  const now = useNow(waiting, 1000);
  const live = waiting || r.status === 'streaming';
  // this revision was drawn in front of the reader (not restored or reopened): what it adds arrives with motion
  const sawLive = useRef(live);
  if (live) sawLive.current = true;
  const quiet = r.status === 'done' && !(r.asks?.length) && !r.changes.length && !r.fix.changes.length && !r.fix.autoFixes.length && r.fix.state === 'none' && !r.lifecycle.length;
  return (
    <article className="rev" aria-label={t('rec.revision', { n: r.n })} data-n={r.n} data-status={r.status} data-closable={onCollapse ? true : undefined}>
      <RevTag ctx={ctx} r={r} />
      <div className="rev__body">
        <Ask ctx={ctx} r={r} />
        {waiting && r.finishing ? null : waiting ? (
          <p className="rev__note rev__note--waiting">
            {waitingLine(now - r.startedAt, t)}
            {slot === 'waiting' ? <Cursor lastTextAt={turn.lastTextAt} /> : null}
          </p>
        ) : r.status === 'streaming' && !r.note && slot === 'waiting' ? (
          <p className="rev__note" aria-hidden="true">
            <Cursor lastTextAt={turn.lastTextAt} />
          </p>
        ) : r.note && !ended ? (
          <p className="rev__note prose" lang={r.askLang}>
            <span className="visually-hidden">{t(r.finishing ? 'rec.noteLabelPlain' : 'rec.noteLabel')}: </span>
            <NoteText text={r.note} live={r.status === 'streaming'} />
            {slot === 'note' ? <Cursor lastTextAt={turn.lastTextAt} /> : null}
          </p>
        ) : null}
        {r.lifecycle.map((n) => (
          <p key={n.key} className="rev__life">
            <Icon name="infoCircle" />
            <span>{t(n.kind === 'renamed' ? 'rec.lifecycle.renamed' : n.kind === 'retired' ? 'rec.lifecycle.retired' : n.kind === 'chinaOnly' ? 'rec.lifecycle.chinaOnly' : 'rec.lifecycle.restricted', { old: n.old ?? '', new: n.new ?? '', product: n.product ?? '' })}</span>
          </p>
        ))}
        {r.statusLine && slot === 'status' ? (
          <p className="rev__status">
            <Cursor lastTextAt={turn.lastTextAt} lead />
            <span>{statusText(r.statusLine, r, t)}</span>
          </p>
        ) : null}
        <ChangeList ctx={ctx} lines={r.changes} live={live} />
        {quiet ? <p className="rev__quiet">{t('rec.noChange')}</p> : null}
        <FixBlock ctx={ctx} r={r} slot={slot} />
        <ErrorBlock ctx={ctx} r={r} />
        <Questions ctx={ctx} r={r} fresh={sawLive.current} />
        <Footer ctx={ctx} r={r} />
      </div>
      {onCollapse ? (
        <button type="button" className="btn btn--ghost btn--icon rev__collapse" aria-label={t('rec.collapse', { n: r.n })} title={t('rec.collapse', { n: r.n })} onClick={onCollapse}>
          <Icon name="chevronUp" />
        </button>
      ) : null}
    </article>
  );
}
