import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { PRICING_ASK_LIMIT, pricingDesignKey, type SolutionEstimate } from '@ali/core/solution-pricing.ts';
import { askLength, enterAction, preventsDefault } from '../console/logic.ts';
import { useAppState, useController, useT } from '../store/react.tsx';
import { monthlyUsd } from '../workflow/panel-model.ts';
import { Icon } from '../shell/Icon.tsx';
import './pricing.css';

function Estimate({ estimate, stale }: { estimate?: SolutionEstimate; stale: boolean }): ReactElement {
  const { t, lang } = useT();
  // A unit price can be a fraction of a cent. Only round the extended amount to currency precision.
  const number = new Intl.NumberFormat(lang, { maximumSignificantDigits: 17 });
  const amount = (value?: number | null) => value == null ? t('pricing.unpriced') : monthlyUsd(value, lang);
  return (
    <section className="pricing-summary" aria-labelledby="estimate-title" id="estimate" tabIndex={-1}>
      <h2 id="estimate-title">{t('pricing.breakdown')}</h2>
      <p>{t('pricing.coverage')}</p>
      {stale && <p className="pricing-warning" role="status">{t('pricing.stale')}</p>}
      <dl className="pricing-totals">
        <div><dt>{t('pricing.monthly')}</dt><dd>{amount(estimate?.monthlyUsd)}</dd></div>
        <div><dt>{t('pricing.once')}</dt><dd>{amount(estimate?.oneTimeUsd)}</dd></div>
      </dl>
      {estimate?.items.length ? (
        <ul className="pricing-items" aria-label={t('pricing.items')}>
          {estimate.items.map((item, i) => {
            const citation = item.basis === 'catalog' ? /(?:^| · )(https:\/\/[^\s]+)$/i.exec(item.source) : null;
            return (
            <li key={i}>
              <div className="pricing-item-title"><strong>{item.label}</strong><strong>{amount(item.amountUsd)}</strong></div>
              <small>{t(item.period === 'monthly' ? 'pricing.monthly' : 'pricing.once')}</small>
              <p>{number.format(item.quantity)} {item.unit} × ${number.format(item.unitUsd)}</p>
              {item.quantityNote && <p>{item.quantityNote}</p>}
              <p className="pricing-source">
                <strong>{t(item.basis === 'catalog' ? 'pricing.catalog' : item.basis === 'user' ? 'pricing.customerRate' : 'pricing.assumedRate')}</strong>
                {' · '}{citation ? <>{item.source.slice(0, citation.index)}{' '}
                  <a href={citation[1]} target="_blank" rel="noreferrer">{t('workflow.cost.source')}</a></> : item.source}
              </p>
            </li>
            );
          })}
        </ul>
      ) : <p>{t('pricing.noRows')}</p>}
      {!!estimate?.assumptions.length && <><h3>{t('pricing.assumptions')}</h3><ul>{estimate.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
      {!!estimate?.unknowns.length && <><h3>{t('pricing.unknowns')}</h3><ul>{estimate.unknowns.map((u, i) => <li key={i}>{u}</li>)}</ul></>}
    </section>
  );
}

export function PricingStage({ open }: { open: boolean }): ReactElement {
  const { t } = useT();
  const c = useController();
  const session = useAppState((s) => s.session);
  const busy = useAppState((s) => s.pricingStatus === 'working');
  const error = useAppState((s) => s.pricingError);
  const [draft, setDraft] = useState<string>();
  const [composing, setComposing] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pricing = session.pricing;
  const stale = useMemo(() => !!pricing && pricing.designKey !== pricingDesignKey(session.memory), [pricing, session.memory]);
  // While waiting the submitted answer lives in the log. If interrupted, return it to the field for editing.
  const text = draft ?? (busy ? '' : session.pricingPending ?? '');
  const tooLong = askLength(text) > PRICING_ASK_LIMIT;
  const sendable = !!text.trim() && !tooLong && !busy;
  function send(value: string): void {
    if (c.sendPricing(value) === 'started') setDraft(undefined);
  }
  useEffect(() => { if (open) heading.current?.focus(); }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [pricing?.messages, busy, open]);

  return (
    <main className="pricing-stage" aria-labelledby="pricing-title" hidden={!open}>
      <section className="pricing-conversation" aria-labelledby="pricing-title">
        <div className="pricing-intro">
          <h1 id="pricing-title" ref={heading} tabIndex={-1}>{t('pricing.stage')}</h1>
          <p>{t('pricing.intro')}</p>
        </div>
        <div className="pricing-log" role="log" aria-label={t('pricing.conversation')} ref={log}>
          {pricing?.messages.map((message, i) => <div className="pricing-message" key={i}>
            <strong>{message.role === 'user' ? t('pricing.you') : 'Qwen'}</strong><p dir="auto">{message.text}</p>
          </div>)}
          {busy && <>
            <div className="pricing-message"><strong>{t('pricing.you')}</strong><p dir="auto">{session.pricingPending}</p></div>
            <p className="pricing-working" role="status">{t('pricing.thinking')}</p>
          </>}
          {!busy && !pricing && !error && <p>{t('pricing.begin')}</p>}
        </div>
        <form className="pricing-compose" onSubmit={(e: FormEvent) => { e.preventDefault(); if (sendable) send(text); }}>
          {error && <p className="pricing-warning" role="alert">{error}</p>}
          {stale && !busy && <button type="button" className="btn btn--secondary" onClick={() => send(t('pricing.refreshAsk'))}>
            {t('pricing.refresh')}
          </button>}
          <label htmlFor="pricing-reply">{t('pricing.answer')}</label>
          <textarea id="pricing-reply" rows={2} value={text} placeholder={t('pricing.placeholder')}
            readOnly={busy} aria-invalid={tooLong || undefined} onChange={(e) => setDraft(e.target.value)}
            onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
            onKeyDown={(e) => {
              const action = enterAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode },
                { composing, busy, canSend: sendable });
              if (preventsDefault(action)) e.preventDefault();
              if (action === 'send') send(text);
            }} />
          <div className="pricing-compose-actions">
            <p>{tooLong ? t('error.tooLong', { max: PRICING_ASK_LIMIT }) : t('pricing.replyHint')}</p>
            {busy ? <button key="stop" className="btn btn--secondary" type="button" onClick={c.stopPricing}>{t('rec.stop')}</button>
              : <button key="send" className="btn btn--primary" type="submit" disabled={!sendable}>
                {t('composer.send')}<Icon name="send" />
              </button>}
          </div>
        </form>
      </section>
      <Estimate estimate={pricing?.estimate} stale={stale} />
    </main>
  );
}
