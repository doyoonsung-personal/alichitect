// The landing: the lockup, a lead, the brief box (the primary action) and examples for the selected focus. No header; the
// language switch, the theme menu and Sessions sit at the top right. Enter or Draw architecture hands the box over to the console.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { BrandMark } from '../brand/BrandMark.tsx';
import { Icon } from '../shell/Icon.tsx';
import { LanguageSwitch, SessionsMenu, ThemeMenu } from '../shell/controls.tsx';
import { OfflineNotice } from '../shell/OfflineNotice.tsx';
import { AccountMenu } from '../shell/AccountMenu.tsx';
import { useAppState, useController, useT } from '../store/react.tsx';
import { catalog as bundled } from '../catalog/catalog.ts';
import { DEFAULT_MAX_ASK_CHARS } from '@ali/core/prompt.ts';
import { captureHandoff } from '../shell/handoff.ts';
import { enterAction } from '../console/logic.ts';
import { defaultFixtureFor } from '../replay/registry.ts';
import examples from './examples.json' with { type: 'json' };
import type { AppState } from '../store/types.ts';
import type { Lang } from '../i18n/t.ts';

interface Example {
  id: string;
  tag: string;
  en: string;
  ko: string;
  zh: string;
}

const selConn = (s: AppState) => s.conn;
const selHandoff = (s: AppState) => s.ui.handoff;
const selDraft = (s: AppState) => s.ui.composerDraft;

export function Landing(): ReactElement {
  const { lang, t } = useT();
  const c = useController();
  const mode = useAppState((s) => s.session.mode ?? 'cloud');
  const conn = useAppState(selConn);
  const handoff = useAppState(selHandoff);
  const draft = useAppState(selDraft);
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState<'offline' | null>(null);
  const [announce, setAnnounce] = useState('');
  const [exampleId, setExampleId] = useState<string | undefined>(undefined);
  const box = useRef<HTMLTextAreaElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const limit = conn.health?.limits.askChars ?? DEFAULT_MAX_ASK_CHARS;
  const length = Array.from(text.trim()).length;
  const tooLong = length > limit;
  const date = conn.health?.catalog.version ?? bundled.version;

  useEffect(() => {
    box.current?.focus();
  }, []);

  // a brief that the end of the session cut off comes back after sign-in (the controller puts it in the draft)
  const draftSeq = draft?.seq;
  useEffect(() => {
    if (!draft) return;
    setText((cur) => cur || draft.text);
    c.draftTaken();
  }, [draft, draftSeq, c]);

  // grows from 136 to 280 px with its content, then scrolls inside
  useLayoutEffect(() => {
    const ta = box.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 88), 232)}px`;
  }, [text]);

  // the offline notice goes away when the service answers
  useEffect(() => {
    if (conn.mode === 'live') setNotice(null);
  }, [conn.mode]);

  const submit = useCallback(() => {
    if (!text.trim()) {
      box.current?.focus();
      setAnnounce(t('landing.empty'));
      return;
    }
    const handoffRects = captureHandoff(frame.current, text.trim());
    const r = c.submit(text);
    if (r === 'offline') {
      setNotice('offline');
      box.current?.focus();
    } else if (r === 'started') handoffRects.commit();
  }, [c, text, t]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    // one tested rule: Enter commits an IME composition and never submits it
    const action = enterAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode }, { composing, busy: false, canSend: true });
    if (action !== 'send') return;
    e.preventDefault();
    submit();
  };

  const hint = tooLong ? t('landing.tooLong', { max: limit }) : composing ? t('landing.imeHint') : t('landing.hint');

  return (
    <main className="landing" data-handoff={handoff || undefined}>
      <div className="landing__util">
        <LanguageSwitch />
        <ThemeMenu />
        <SessionsMenu />
        <AccountMenu />
      </div>
      <div className="landing__stack">
        <h1 className="landing__lockup">
          <BrandMark lang={lang} name={t('app.name')} size="landing" cursor />
        </h1>
        <p id="landing-lead" className="landing__lead">
          {t(mode === 'workflow' ? 'landing.workflow.lead' : 'landing.lead')}
        </p>
        <form
          className="brief"
          ref={frame as never}
          data-flip="brief"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <fieldset className="brief__focus">
            <legend>{t('focus.label')}</legend>
            {(['cloud', 'workflow'] as const).map((value) => <label key={value}>
              <input type="radio" name="focus" value={value} checked={mode === value}
                onChange={() => { c.setMode(value); if (exampleId) { setText(''); setExampleId(undefined); } }} />
              {t(value === 'cloud' ? 'focus.cloud' : 'focus.workflow')}
            </label>)}
          </fieldset>
          <textarea
            ref={box}
            className="brief__input"
            aria-labelledby="landing-lead"
            placeholder={t(mode === 'workflow' ? 'landing.workflow.placeholder' : 'landing.placeholder')}
            value={text}
            rows={1}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              setExampleId(undefined);
              if (notice) setNotice(null);
            }}
            onKeyDown={onKey}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
          />
          <div className="brief__row">
            <p className={`brief__hint${tooLong ? ' brief__hint--error' : ''}`} id="brief-hint">
              {hint}
            </p>
            <button type="submit" className="btn btn--primary" disabled={tooLong}>
              <span>{t(mode === 'workflow' ? 'landing.workflow.submit' : 'landing.submit')}</span>
              <Icon name="send" />
            </button>
          </div>
        </form>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announce}
        </p>
        {notice === 'offline' ? <OfflineNotice t={t} checking={conn.mode === 'checking'} onRetry={() => void c.checkHealth()} onReplay={() => void c.startReplay(defaultFixtureFor(lang, exampleId))} className="notice--landing" /> : null}
        <section className="examples" aria-labelledby="examples-heading">
          <h2 id="examples-heading" className="examples__heading">
            {t(mode === 'workflow' ? 'landing.workflow.examplesHeading' : 'landing.examplesHeading')}
          </h2>
          <ExampleList
            examples={mode === 'workflow' ? examples.workflowExamples : examples.examples}
            lang={lang}
            useLabel={t('landing.useExample')}
            tag={(key) => t(key as never)}
            onPick={(ex, brief) => {
              setText(brief);
              setExampleId(ex.id);
              setNotice(null);
              requestAnimationFrame(() => {
                const ta = box.current;
                if (!ta) return;
                ta.focus();
                ta.setSelectionRange(brief.length, brief.length);
              });
            }}
          />
        </section>
      </div>
      <p className="landing__footer">{t('landing.footer', { date })}</p>
    </main>
  );
}

function ExampleList(p: { examples: Example[]; lang: Lang; useLabel: string; tag(key: string): string; onPick(ex: Example, brief: string): void }): ReactElement {
  const list = useRef<HTMLUListElement>(null);
  const onKey = (e: KeyboardEvent<HTMLUListElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length].focus();
  };
  return (
    <ul className="examples__list" ref={list} onKeyDown={onKey}>
      {p.examples.map((ex) => {
        const brief = ex[p.lang];
        return (
          <li key={ex.id}>
            <button type="button" className="example" lang={p.lang} aria-label={`${p.useLabel}: ${brief}`} onClick={() => p.onPick(ex, brief)}>
              <span className="example__tag">{p.tag(ex.tag)}</span>
              <span className="example__brief">{brief}</span>
              <Icon name="arrowRight" className="example__arrow" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
