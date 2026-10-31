// The revision record (spec section 6): the scroll region. Oldest first; the newest revision is open, older ones are rows
// unless the user opened them. While a turn streams it follows the bottom, and lets go when the user scrolls up, with a
// "Jump to latest" chip. The streaming text itself is never announced: the shell's polite region carries short lines.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import { OfflineNotice } from '../shell/OfflineNotice.tsx';
import { Cursor } from './Cursor.tsx';
import { RevisionBlock } from './Revision.tsx';
import { RevisionRow } from './RevisionRow.tsx';
import { distanceFromBottom, followsStream, isExpanded, showJumpChip } from './logic.ts';
import { isBusy } from './ctx.ts';
import type { ConsoleCtx } from './ctx.ts';

export function SummaryNote({ ctx }: { ctx: ConsoleCtx }): ReactElement | null {
  const { t, summary, turn } = ctx;
  const [open, setOpen] = useState(false);
  if (!summary) return null;
  const has = summary.text !== null && summary.through > 0;
  return (
    <section className="sum" aria-label={t('rec.summaryUpdated')}>
      {has ? (
        <>
          <p className="sum__line">
            <span>{t('rec.summaryNote', { n: summary.through })}</span>{' '}
            <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? t('rec.hideSummary') : t('rec.showSummary')}
            </button>
          </p>
          {open ? (
            <div className="sum__text">
              <h3 className="sum__heading">{t('rec.summaryHeading', { n: summary.through })}</h3>
              <p className="prose">{summary.text}</p>
            </div>
          ) : null}
        </>
      ) : null}
      {summary.summarizing ? (
        <p className="sum__line sum__line--live">
          <Cursor lastTextAt={turn.lastTextAt} lead />
          <span>{t('rec.summarizing')}</span>
        </p>
      ) : null}
    </section>
  );
}

export function RevisionLog({ ctx }: { ctx: ConsoleCtx }): ReactElement {
  const { t, revisions, turn, reveal, conn, actions } = ctx;
  const busy = isBusy(turn.phase);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [jump, setJump] = useState(false);
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const newest = revisions.length ? revisions[revisions.length - 1].n : 0;

  const toBottom = useCallback((): void => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const onScroll = (): void => {
    const el = scroller.current;
    if (!el) return;
    follow.current = followsStream(distanceFromBottom(el));
    setJump(showJumpChip(follow.current, busy));
    setScrolled(el.scrollTop > 2);
  };

  // a new turn, or another session: the newest revision comes into view and the record follows it from there
  const firstStart = revisions[0]?.startedAt;
  useLayoutEffect(() => {
    follow.current = true;
    setJump(false);
    toBottom();
  }, [newest, firstStart, toBottom]);

  // content grew (a note typed, a line landed): stay at the bottom unless the user scrolled up
  useEffect(() => {
    const box = content.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      if (follow.current) toBottom();
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [toBottom]);

  useEffect(() => {
    if (!busy) setJump(false);
  }, [busy]);

  // a revision tag on the canvas or a Rev. cell in the panel: open that revision and scroll to it
  const revealSeq = reveal?.seq;
  const revealN = reveal?.revision;
  const seenSeq = useRef(revealSeq); // a request left over from an earlier session is not new
  useEffect(() => {
    if (revealN === undefined || revealSeq === seenSeq.current) return;
    seenSeq.current = revealSeq;
    setOpened((s) => (s.has(revealN) ? s : new Set(s).add(revealN)));
    follow.current = false;
    const h = requestAnimationFrame(() => {
      const el = content.current?.querySelector<HTMLElement>(`[data-rev="${revealN}"]`);
      const sc = scroller.current;
      if (!el || !sc) return;
      sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
      setJump(showJumpChip(false, busy));
      setFlash(revealN);
    });
    return () => cancelAnimationFrame(h);
  }, [revealSeq]);

  const toggle = (n: number): void => {
    // the user is working with the record, so it stops following the stream until they jump back
    follow.current = false;
    setJump(showJumpChip(false, busy));
    setOpening(opened.has(n) ? null : n);
    setOpened((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
    // the button that was pressed is replaced by its other half: keep keyboard focus on the same spot in the record
    requestAnimationFrame(() => content.current?.querySelector<HTMLElement>(`[data-rev="${n}"] .rev__collapse, [data-rev="${n}"] .row`)?.focus({ preventScroll: true }));
  };

  // another session: forget which old revisions were open
  useEffect(() => setOpened(new Set()), [firstStart]);

  return (
    <div className="rec-wrap">
      <div className="rec" data-scrolled={scrolled || undefined} role="log" aria-live="off" aria-busy={busy} aria-label={t('rec.logLabel')} ref={scroller} onScroll={onScroll}>
        <div ref={content}>
          {conn === 'offline' ? (
            <div className="rec__offline">
              <OfflineNotice
                t={t}
                checking={checking}
                onRetry={() => {
                  setChecking(true);
                  void actions.checkHealth().finally(() => setChecking(false));
                }}
                onReplay={actions.startReplay}
              />
            </div>
          ) : null}
          <SummaryNote ctx={ctx} />
          <ol className="revs">
            {revisions.map((r) => {
              const open = isExpanded(r.n, newest, opened);
              const closable = open && r.n !== newest;
              return (
                <li
                  key={r.n}
                  data-rev={r.n}
                  data-flash={flash === r.n || undefined}
                  data-opening={opening === r.n || undefined}
                  onAnimationEnd={(e) => {
                    if (e.target !== e.currentTarget) return;
                    setFlash(null);
                    setOpening(null);
                  }}
                >
                  {open ? <RevisionBlock ctx={ctx} r={r} onCollapse={closable ? () => toggle(r.n) : undefined} /> : <RevisionRow ctx={ctx} r={r} onOpen={() => toggle(r.n)} />}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {jump ? (
        <button
          type="button"
          className="rec__jump"
          onClick={() => {
            follow.current = true;
            setJump(false);
            toBottom();
          }}
        >
          <Icon name="chevronDown" size={14} />
          <span>{t('rec.jumpLatest')}</span>
        </button>
      ) : null}
    </div>
  );
}
