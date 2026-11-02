import { useAppState } from '../store/react.tsx';
// The composer (spec 7.13): the box the landing brief travelled into. Enter sends, Shift+Enter adds a line, and Enter
// during a Korean or Chinese composition only commits it. While a turn streams the draft stays editable, Enter does not
// send, and Send becomes Stop.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import { askLength, enterAction, preventsDefault } from './logic.ts';
import { isBusy } from './ctx.ts';
import { armFlight, disarmFlight } from '../shell/flight.ts';
import type { ConsoleCtx } from './ctx.ts';

/** 12 px padding above and below, up to eight lines of 24 px. */
const MAX_PX = 12 + 8 * 24 + 12;
const MIN_PX = 48;

export function Composer({ ctx }: { ctx: ConsoleCtx }): ReactElement {
  const { t, turn, replay, askLimit, draft, actions } = ctx;
  const workflow = useAppState((s) => (s.session.mode ?? 'cloud') === 'workflow');
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const busy = isBusy(turn.phase);
  const readOnly = !!replay;
  const tooLong = askLength(text) > askLimit;
  const empty = !text.trim();
  const canSend = !empty && !tooLong && !readOnly;

  // Edit and resend, Undo, and an ask kept across sign-in: put the text back, leave the caret at its end, and tell the
  // shell the draft is taken (a draft already waiting when the composer mounts counts, so a remount cannot lose it or apply it twice)
  const draftSeq = draft?.seq;
  const { draftTaken } = actions;
  useEffect(() => {
    if (!draft) return;
    draftTaken();
    setText(draft.text);
    requestAnimationFrame(() => {
      const el = field.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(draft.text.length, draft.text.length);
    });
  }, [draft, draftSeq, draftTaken]);

  // grows from one line (48 px) to eight, then scrolls inside
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_PX), MAX_PX)}px`;
  }, [text]);

  const send = (): void => {
    // the words leave the box for the record: note where they are while the field still holds them
    armFlight(field.current);
    if (actions.submit(text) === 'started') setText('');
    else disarmFlight();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    const action = enterAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode }, { composing, busy, canSend });
    if (preventsDefault(action)) e.preventDefault();
    if (action === 'send') send();
  };

  const hint = tooLong ? t('error.tooLong', { max: askLimit }) : readOnly ? '' : composing ? t('landing.imeHint') : busy ? t('composer.busy') : t('composer.hint');

  return (
    <form
      className="cmp"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && canSend) send();
      }}
    >
      {workflow && <p className="workflow-editing">{t('workflow.editing')}</p>}
      <div className="cmp__box" data-flip="composer" data-busy={busy || undefined}>
        <textarea
          ref={field}
          className="cmp__field prose"
          aria-label={t('composer.label')}
          aria-describedby="cmp-hint"
          placeholder={readOnly ? t('composer.replayReadOnly') : t('composer.placeholder')}
          value={text}
          disabled={readOnly}
          rows={1}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
        <div className="cmp__row">
          <p className="cmp__hint" id="cmp-hint" data-error={tooLong || undefined}>
            {hint}
          </p>
          {busy && !readOnly ? (
            <button
              key="stop"
              type="button"
              className="btn btn--secondary cmp__stop"
              onClick={(e) => {
                // Stop turns into Send in this same click: without a distinct key React reuses the button, it becomes a
                // submit button before the click's default action runs, and the draft would be sent
                e.preventDefault();
                actions.stop();
              }}
            >
              <Icon name="stop" />
              <span>{t('rec.stop')}</span>
            </button>
          ) : (
            <button key="send" type="submit" className="btn btn--primary btn--icon cmp__send" disabled={!canSend} aria-label={t('composer.send')} title={t('composer.send')}>
              <Icon name="send" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
