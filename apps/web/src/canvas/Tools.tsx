// The small furniture on the sheet: the zoom tools (top right), the legend (bottom left) and the pan hint.
import type { ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import type { Lang, TFn } from '../i18n/t.ts';
import { belowFloor, zoomPercent } from './camera.ts';
import { label } from './labels.ts';

export interface ZoomToolsProps {
  t: TFn;
  lang: Lang;
  zoom: number;
  onOut(): void;
  onIn(): void;
  onFit(): void;
  onValueHover(on: boolean): void;
}

export function ZoomTools(p: ZoomToolsProps): ReactElement {
  const low = belowFloor(p.zoom);
  return (
    <div className="cv-tools" role="group" aria-label={p.t('canvas.label')}>
      <button type="button" className="cv-tool" aria-label={p.t('canvas.zoomOut')} title={p.t('canvas.zoomOut')} onClick={p.onOut}>
        <Icon name="zoomOut" size={16} />
      </button>
      <span
        className="cv-tools__value num"
        data-low={low || undefined}
        title={low ? label(p.lang, 'zoom.floor') : undefined}
        aria-label={label(p.lang, 'zoom.value', { value: zoomPercent(p.zoom) })}
        onMouseEnter={() => p.onValueHover(true)}
        onMouseLeave={() => p.onValueHover(false)}
      >
        {zoomPercent(p.zoom)}
      </span>
      <button type="button" className="cv-tool" aria-label={p.t('canvas.zoomIn')} title={p.t('canvas.zoomIn')} onClick={p.onIn}>
        <Icon name="zoomIn" size={16} />
      </button>
      <span className="cv-tools__rule" aria-hidden="true" />
      <button type="button" className="cv-tool" aria-label={p.t('canvas.fit')} title={p.t('canvas.fit')} onClick={p.onFit}>
        <Icon name="fit" size={16} />
      </button>
    </div>
  );
}

function Swatch({ kind }: { kind: 'path' | 'data' | 'async' | 'resolve' }): ReactElement {
  return (
    <svg className="cv-legend__swatch" width="28" height="12" viewBox="0 0 28 12" aria-hidden="true" focusable="false">
      <line className="cv-legend__line" data-kind={kind} x1="1" y1="6" x2={kind === 'resolve' ? 27 : 24} y2="6" />
      {kind !== 'resolve' ? <path className="cv-legend__arrow" data-kind={kind} d="M19.5,2.8 L25,6 L19.5,9.2" /> : null}
    </svg>
  );
}

export function Legend({ t, lang }: { t: TFn; lang: Lang }): ReactElement {
  return (
    <ul className="cv-legend" aria-hidden="true">
      <li>
        <Swatch kind="path" />
        {label(lang, 'legend.path')}
      </li>
      <li>
        <Swatch kind="data" />
        {t('panel.edge.data')}
      </li>
      <li>
        <Swatch kind="async" />
        {t('panel.edge.async')}
      </li>
      <li>
        <Swatch kind="resolve" />
        {t('panel.edge.resolve')}
      </li>
    </ul>
  );
}

export function PanHint({ t, show }: { t: TFn; show: boolean }): ReactElement {
  return (
    <p className="cv-hint" data-show={show || undefined} aria-hidden="true">
      {t('canvas.pan')}
    </p>
  );
}
