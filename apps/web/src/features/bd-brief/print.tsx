// The isolated print surface (plan §9): a dedicated DOM subtree that is aria-hidden and
// display:none on screen and becomes the ONLY printed thing under @media print (styles.css
// hides #root and the dialog chrome via body:has(.bdb__print)). It targets ONE A4 page:
// headline (opportunity), key value points, priority questions and next engagement. The
// `extended` flag is the explicit user choice that adds stakeholders, concerns and answers —
// content never gets silently clipped or shrunk below readability; when one page is not
// enough, the dialog offers this shorter/extended selection instead.
// This file never touches export/pdf.ts or the proposal rendering.
import type { JSX } from 'react';
import type { BriefContent, Lang } from '@ali/bd-brief/types.ts';
import { LIMITS } from '@ali/bd-brief/types.ts';
import { makeBT } from './strings.ts';

export interface PrintBriefProps {
  content: BriefContent;
  lang: Lang;
  /** false: the one-page selection. true: adds stakeholders, concerns and answers. */
  extended: boolean;
  stale?: boolean;
}

export function PrintBrief({ content, lang, extended, stale = false }: PrintBriefProps): JSX.Element {
  const bt = makeBT(lang);
  const priority = content.questions.filter((q) => q.priority).slice(0, LIMITS.priorityQuestions);
  const priorityIds = new Set(priority.map((q) => q.id));
  const rest = content.questions.filter((q) => !priorityIds.has(q.id));
  const next = content.nextEngagement;

  return (
    <div className="bdb__print" lang={lang} aria-hidden="true">
      <p className="bdb__print-note">{bt('bdb.print.pageNote')}</p>
      <h1 className="bdb__print-title">{bt('bdb.print.headline')}</h1>
      {stale ? <p className="bdb__print-note">{bt('bdb.stale.banner')}</p> : null}

      {content.opportunity.text.trim() ? (
        <section className="bdb__print-sec">
          <h2 className="bdb__print-h">{bt('bdb.brief.opportunity')}</h2>
          <p className="bdb__print-p">{content.opportunity.text}</p>
        </section>
      ) : null}

      {content.valuePoints.length ? (
        <section className="bdb__print-sec">
          <h2 className="bdb__print-h">{bt('bdb.brief.value')}</h2>
          <ul className="bdb__print-ul">
            {content.valuePoints.slice(0, LIMITS.valuePoints).map((v) => (
              <li key={v.id}>
                <span className="bdb__print-label">{v.label}</span> {v.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {priority.length ? (
        <section className="bdb__print-sec">
          <h2 className="bdb__print-h">{bt('bdb.brief.priorityQuestions')}</h2>
          <ol className="bdb__print-ol">
            {priority.map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {next ? (
        <section className="bdb__print-sec">
          <h2 className="bdb__print-h">{bt('bdb.brief.next')}</h2>
          <p className="bdb__print-p">
            <span className="bdb__print-label">{bt(`bdb.brief.kind.${next.kind}`)}</span> {next.decision}
          </p>
          {/* owner and date print only when known — never invented (plan §2) */}
          <p className="bdb__print-meta">
            {next.owner ? `${bt('bdb.brief.owner')}: ${next.owner}` : bt('bdb.brief.unknown')}
            {next.date ? ` · ${bt('bdb.brief.date')}: ${next.date}` : ''}
          </p>
        </section>
      ) : null}

      {extended ? (
        <>
          {content.stakeholders.length ? (
            <section className="bdb__print-sec">
              <h2 className="bdb__print-h">{bt('bdb.brief.people')}</h2>
              <ul className="bdb__print-ul">
                {content.stakeholders.map((s) => (
                  <li key={s.id}>
                    <span className="bdb__print-label">{s.kind === 'named' ? (s.name ?? bt('bdb.brief.unknown')) : bt('bdb.brief.suggestedRole')}</span>{' '}
                    {s.role}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.concerns.length ? (
            <section className="bdb__print-sec">
              <h2 className="bdb__print-h">{bt('bdb.brief.concerns')}</h2>
              <ul className="bdb__print-ul">
                {content.concerns.map((c) => (
                  <li key={c.id}>
                    <span className="bdb__print-label">{c.kind === 'hypothesis' ? bt('bdb.brief.hypothesis') : bt('bdb.brief.stated')}</span> {c.text}
                    {c.investigation ? <span className="bdb__print-meta"> — {bt('bdb.brief.investigation')}: {c.investigation}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {rest.length ? (
            <section className="bdb__print-sec">
              <h2 className="bdb__print-h">{bt('bdb.brief.questions')}</h2>
              <ol className="bdb__print-ol">
                {rest.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {content.questions.some((q) => q.answer) ? (
            <section className="bdb__print-sec">
              <h2 className="bdb__print-h">{bt('bdb.brief.answer')}</h2>
              <ul className="bdb__print-ul">
                {content.questions.filter((q) => q.answer).map((q) => (
                  <li key={q.id}>
                    {q.text} — <span className="bdb__print-meta">{q.answer?.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Browser Print / Save as PDF (plan §9). The @media print rules make .bdb__print the page. */
export function printBrief(): void {
  document.body.classList.add('bdb-printing');
  const cleanup = () => { document.body.classList.remove('bdb-printing'); window.removeEventListener('afterprint', cleanup); clearTimeout(timer); };
  const timer = setTimeout(cleanup, 120_000);
  window.addEventListener('afterprint', cleanup, { once: true });
  try { window.print(); } catch { cleanup(); }
}
