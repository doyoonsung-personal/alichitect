// The assumption chips (research/phase1-asks-and-scope.md section 1), beside the pinned requirements:
// "Assumed: Public-facing · Change". A chip is one button. Pressing it (or its Change) opens a small editor inside the chip,
// not a modal: the assumption stays as the label, the model's alternative is one suggestion button, and "What's actually
// the case?" is a field with focus at once. Enter sends, Escape or "Keep this" closes, and Enter during a Korean or
// Chinese composition only commits it. Sending posts a follow-up that names the assumption and the answer
// (logic.ts correctionAsk); the model never guesses the replacement, the user says what is true. Plain buttons and one
// input: Tab reaches them, the focus ring is the global one.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import { ASM_COLLAPSED, askLength, canAnswer, correctionAsk, editorKeyAction, visibleAssumptions } from './logic.ts';
import { focusComposer } from './focus.ts';
import type { AssumptionView } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

export function Assumptions({ ctx }: { ctx: ConsoleCtx }): ReactElement | null {
  const { t, assumptions, turn, replay } = ctx;
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const live = canAnswer(turn.phase, !!replay);
  const { shown, hidden } = visibleAssumptions(assumptions, expanded);
  const openShown = openId !== null && shown.some((a) => a.id === openId);
  // a turn started elsewhere (the composer, a quick reply), the chip went (settled, corrected), or "less" hid it: the editor closes
  useEffect(() => {
    if (openId !== null && (!live || !openShown)) setOpenId(null);
  }, [openId, live, openShown]);
  if (!assumptions.length) return null;
  return (
    <div className="asm">
      <ul className="asm__list" aria-label={t('asm.listLabel')}>
        {shown.map((a, i) => (
          <Chip key={a.id} ctx={ctx} a={a} i={i} live={live} open={openShown && openId === a.id} setOpen={(on) => setOpenId(on ? a.id : null)} />
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" className="link-btn asm__more" aria-expanded={false} onClick={() => setExpanded(true)}>
          {t('req.more', { n: hidden })}
        </button>
      ) : null}
      {expanded && assumptions.length > ASM_COLLAPSED ? (
        <button type="button" className="link-btn asm__more" aria-expanded={true} onClick={() => setExpanded(false)}>
          {t('req.less')}
        </button>
      ) : null}
    </div>
  );
}

function Chip({ ctx, a, i, live, open, setOpen }: { ctx: ConsoleCtx; a: AssumptionView; i: number; live: boolean; open: boolean; setOpen: (on: boolean) => void }): ReactElement {
  const { t, turn, replay } = ctx;
  // a chip that lands while a turn streams enters; one that is there when the block mounts does not
  const [entering, setEntering] = useState(turn.phase !== 'idle' && turn.phase !== 'error');
  const button = useRef<HTMLButtonElement>(null);
  const editorId = useId();
  return (
    <li
      className="asm__chip"
      data-enter={entering || undefined}
      data-open={open || undefined}
      style={{ '--i': Math.min(i, 3) } as CSSProperties}
      onAnimationEnd={(e) => e.target === e.currentTarget && setEntering(false)}
    >
      <button
        ref={button}
        type="button"
        className="asm__btn"
        disabled={!live}
        aria-expanded={open}
        aria-controls={open ? editorId : undefined}
        title={replay ? t('composer.replayReadOnly') : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className="asm__text prose">
          <span className="asm__label">{t('asm.label')}</span>
          {ctx.lang === 'zh' ? '' : ' '}
          <span className="asm__what">{a.text}</span>
        </span>
        <span className="asm__sep" aria-hidden="true">
          {'·'}
        </span>
        <span className="asm__change">{t('asm.change')}</span>
      </button>
      {open ? (
        <Editor
          ctx={ctx}
          a={a}
          id={editorId}
          onKeep={() => {
            setOpen(false);
            // the editor held focus and is about to leave the page: hand it back to the chip that opened it
            button.current?.focus();
          }}
          onSent={() => {
            setOpen(false);
            focusComposer();
          }}
        />
      ) : null}
    </li>
  );
}

/** The answer box inside an open chip. Mounts focused; nothing here is stored, closing it drops the draft. */
function Editor({ ctx, a, id, onKeep, onSent }: { ctx: ConsoleCtx; a: AssumptionView; id: string; onKeep: () => void; onSent: () => void }): ReactElement {
  const { t, askLimit, actions } = ctx;
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const hintId = useId();

  useEffect(() => {
    field.current?.focus();
    // the editor opens below the chip: keep all of it in view inside the scrolling console
    root.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  const typed = correctionAsk(a, text, false, t);
  const tooLong = !!typed && askLength(typed) > askLimit;
  const canSend = !!typed && !tooLong;

  const send = (ask: string | null): void => {
    if (!ask || askLength(ask) > askLimit) return;
    if (actions.submit(ask) === 'started') onSent();
  };

  const onFieldKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    const action = editorKeyAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode }, { composing, canSend });
    if (action === 'send' || action === 'blocked' || action === 'cancel') e.preventDefault();
    if (action === 'send') send(typed);
    else if (action === 'cancel') {
      e.stopPropagation();
      onKeep();
    }
  };

  // Escape from the suggestion or Send button closes it too (the field handles its own, composition-aware)
  const onGroupKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape' && e.target !== field.current) {
      e.preventDefault();
      onKeep();
    }
  };

  const suggest = a.alt ? correctionAsk(a, a.alt, true, t) : null;
  const hint = tooLong ? t('error.tooLong', { max: askLimit }) : composing ? t('asm.imeHint') : t('asm.editorHint');

  return (
    <div ref={root} className="asme" id={id} role="group" aria-label={t('asm.editorLabel', { text: a.text })} onKeyDown={onGroupKey}>
      {a.alt && suggest ? (
        <div className="asme__suggest">
          <span className="asme__cap">{t('asm.suggested')}</span>
          <button type="button" className="btn btn--secondary asme__alt" aria-label={t('asm.useSuggestion', { alt: a.alt })} onClick={() => send(suggest)}>
            {a.alt}
          </button>
        </div>
      ) : null}
      <label className="asme__label" htmlFor={fieldId}>
        {t('asm.fieldLabel')}
      </label>
      <div className="asme__box">
        <input
          ref={field}
          id={fieldId}
          className="asme__field prose"
          type="text"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-describedby={hintId}
          aria-invalid={tooLong || undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onFieldKey}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
        <button type="button" className="btn btn--primary btn--icon asme__send" disabled={!canSend} aria-label={t('asm.send')} title={t('asm.send')} onClick={() => send(typed)}>
          <Icon name="send" />
        </button>
      </div>
      <div className="asme__foot">
        <p className="asme__hint" id={hintId} data-error={tooLong || undefined}>
          {hint}
        </p>
        <button type="button" className="link-btn asme__keep" onClick={onKeep}>
          {t('asm.keep')}
        </button>
      </div>
    </div>
  );
}
