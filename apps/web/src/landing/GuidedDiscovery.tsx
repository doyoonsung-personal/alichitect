import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { t, type Lang } from '../i18n/t.ts';
import { Icon } from '../shell/Icon.tsx';
import { buildDiscoveryBrief, discoveryQuestion, type DiscoveryAnswer } from './discovery.ts';
import './guided-discovery.css';

interface GuidedDiscoveryProps {
  lang: Lang;
  limit: number;
  initialText?: string;
  onExit(): void;
  onStart(brief: string): void;
}

// Keep handwritten text when someone tries a preset and then goes back to their own answer.
interface DraftAnswer {
  selected: string;
  text: string;
}
const own = 'own-words';
const empty: DraftAnswer = { selected: '', text: '' };

function answerOf(draft: DraftAnswer): DiscoveryAnswer | undefined {
  if (!draft.selected) return undefined;
  if (draft.selected !== own) return { kind: 'choice', id: draft.selected };
  const text = draft.text.trim();
  return text ? { kind: 'text', text } : undefined;
}

/** All discovery input stays in this form until the prospect submits the reviewed brief. */
export function GuidedDiscovery({ lang, limit, initialText, onExit, onStart }: GuidedDiscoveryProps): ReactElement {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [first, setFirst] = useState<DraftAnswer>(() =>
    initialText?.trim() ? { selected: own, text: initialText } : empty);
  const [second, setSecond] = useState<DraftAnswer>(empty);
  const [editedBrief, setEditedBrief] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);

  const firstAnswer = answerOf(first);
  const secondAnswer = answerOf(second);
  const reviewing = step === 3;
  const question = discoveryQuestion(lang, step === 2 ? firstAnswer : undefined);
  const draft = step === 1 ? first : second;
  const brief = editedBrief ?? (reviewing && firstAnswer && secondAnswer ? buildDiscoveryBrief(lang, firstAnswer, secondAnswer) : '');
  const tooLong = reviewing && Array.from(brief.trim()).length > limit;
  const canAdvance = reviewing ? !!brief.trim() && !tooLong : !!answerOf(draft);

  function changeAnswer(next: DraftAnswer): void {
    if (step === 1) {
      setFirst(next);
      setSecond(empty); // The second question depends on the first answer.
    } else {
      setSecond(next);
    }
    setEditedBrief(undefined);
  }

  function advance(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canAdvance) return;
    if (reviewing) onStart(brief.trim());
    else setStep(step === 1 ? 2 : 3);
  }

  return (
    <form className="discovery" aria-labelledby="discovery-title" onSubmit={advance}>
      <div className="discovery__bar">
        <p className="discovery__stage" id="discovery-stage">
          <span>{t(lang, 'discovery.name')}</span>
          <span>{reviewing ? t(lang, 'discovery.review') : t(lang, 'discovery.question', { n: step })}</span>
        </p>
        <button type="button" className="btn btn--ghost discovery__exit" onClick={onExit}>
          {t(lang, 'discovery.exit')}
        </button>
      </div>
      <h2 id="discovery-title" className="discovery__title" ref={heading} tabIndex={-1} aria-describedby="discovery-stage">
        {reviewing ? t(lang, 'discovery.title') : question.title}
      </h2>
      {reviewing ? (
        <div className="discovery__review">
          <p id="discovery-review-hint">{t(lang, 'discovery.intro')}</p>
          <label className="discovery__label" htmlFor="discovery-brief">{t(lang, 'discovery.brief')}</label>
          <textarea id="discovery-brief" rows={5} value={brief} onChange={(e) => setEditedBrief(e.target.value)}
            aria-describedby={tooLong ? 'discovery-limit' : 'discovery-review-hint'} aria-invalid={tooLong || undefined} />
          {tooLong && <p id="discovery-limit" className="discovery__error" role="status">{t(lang, 'landing.tooLong', { max: limit })}</p>}
        </div>
      ) : (
        <fieldset className="discovery__answers" key={step} aria-labelledby="discovery-title">
          {question.choices.map(({ id, label }) => (
            <label key={id} className="discovery__choice">
              <input type="radio" name="discovery-answer" value={id} checked={draft.selected === id}
                onChange={() => changeAnswer({ ...draft, selected: id })} />
              {label}
            </label>
          ))}
          <label className="discovery__choice">
            <input type="radio" name="discovery-answer" value={own} checked={draft.selected === own}
              onChange={() => changeAnswer({ ...draft, selected: own })} />
            {t(lang, 'discovery.own')}
          </label>
          {draft.selected === own && (
            <div className="discovery__written">
              <label className="discovery__label" htmlFor="discovery-answer">{t(lang, 'discovery.answer')}</label>
              <textarea id="discovery-answer" rows={2} value={draft.text} placeholder={question.placeholder}
                onChange={(e) => changeAnswer({ selected: own, text: e.target.value })} />
            </div>
          )}
        </fieldset>
      )}
      <div className="discovery__actions">
        {step > 1 && <button type="button" className="btn btn--ghost" onClick={() => setStep(reviewing ? 2 : 1)}>
          {t(lang, 'discovery.back')}
        </button>}
        <button type="submit" className="btn btn--primary discovery__next" disabled={!canAdvance}>
          {t(lang, reviewing ? 'discovery.start' : step === 1 ? 'discovery.next' : 'discovery.preview')}
          <Icon name={reviewing ? 'send' : 'arrowRight'} />
        </button>
      </div>
    </form>
  );
}
