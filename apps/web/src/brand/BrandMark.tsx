// The lockup: the official Alibaba Cloud logo (orange, as delivered, never recoloured), a hairline rule, and the product
// name. The landing adds the Cursor: the bar from the logo's centre, still. The logo is one <img> of the sanitized
// official SVG in public/brand; the Chinese logo is used when the UI is Chinese, the English one otherwise.
import type { ReactElement } from 'react';
import { LOGOS } from '../icons/index.ts';
import type { Lang } from '../i18n/t.ts';

export function logoFor(lang: Lang) {
  return lang === 'zh' ? LOGOS.zh : LOGOS.en;
}

export interface BrandMarkProps {
  lang: Lang;
  name: string;
  size: 'header' | 'landing';
  /** The Cursor after the name (landing only). */
  cursor?: boolean;
  /** Renders the lockup as a link to the landing; disabled while a turn streams. */
  onHome?: () => void;
  homeLabel?: string;
  homeDisabled?: boolean;
}

export function BrandMark(p: BrandMarkProps): ReactElement {
  const logo = logoFor(p.lang);
  const img = <img className="brand__logo" src={`${import.meta.env.BASE_URL}${logo.file}`} alt="Alibaba Cloud" height={p.size === 'landing' ? 32 : 18} width={Math.round((p.size === 'landing' ? 32 : 18) * logo.aspect)} />;
  const inner = (
    <>
      {img}
      <span className="brand__rule" aria-hidden="true" />
      <span className="brand__name">{p.name}</span>
      {p.cursor ? <span className="cursor cursor--still" aria-hidden="true" /> : null}
    </>
  );
  if (p.onHome) {
    return (
      <button type="button" className={`brand brand--${p.size} brand--home`} onClick={p.onHome} disabled={p.homeDisabled} aria-label={p.homeLabel} data-flip="lockup">
        {inner}
      </button>
    );
  }
  return (
    <div className={`brand brand--${p.size}`} data-flip="lockup">
      {inner}
    </div>
  );
}
