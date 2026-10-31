// The React Flow node types: frames, product cards (with badges, attachments, the BuildMark and the revision tag),
// ghosts of exited cards, and one layer that draws every edge. The nodes carry plain data; the canvas owns state.
import { createContext, memo, useContext, useEffect, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { ProductIcon } from '../icons/ProductIcon.tsx';
import { Icon } from '../shell/Icon.tsx';
import type { Lang, TFn } from '../i18n/t.ts';
import { label } from './labels.ts';
import type { BadgeView, CardView, FrameView } from './scene.ts';
import type { EdgeDraw } from './edges.tsx';
import { EdgeLayer } from './edges.tsx';

/** Stable callbacks and strings for the nodes (kept out of node data so unchanged cards do not re-render). */
export interface CanvasUi {
  lang: Lang;
  t: TFn;
  pointerEnter(id: string): void;
  pointerLeave(id: string): void;
  focus(id: string): void;
  blur(id: string): void;
  click(id: string): void;
  tagEnter(n: number): void;
  tagLeave(): void;
  tagClick(n: number): void;
  /** Id of the element the open popover describes. */
  popId: string | null;
  popDomId: string;
}

export const UiContext = createContext<CanvasUi | null>(null);

function useUi(): CanvasUi {
  const ui = useContext(UiContext);
  if (!ui) throw new Error('UiContext is missing');
  return ui;
}

// ---------- frames ----------

export interface FrameData extends Record<string, unknown> {
  view: FrameView;
  emptyText: string | null;
}
export type FrameNodeType = Node<FrameData, 'frame'>;

function FrameNodeImpl({ data }: NodeProps<FrameNodeType>): ReactElement {
  const f = data.view;
  return (
    <div className="cv-frame" data-kind={f.kind} data-empty={f.empty || undefined} aria-hidden="true">
      <span className="cv-frame__label">
        {f.aside && f.asidePlace === 'before' ? <span className="cv-frame__aside cv-frame__aside--before">{f.aside}</span> : null}
        <span className="cv-frame__name">{f.text}</span>
        {f.aside && f.asidePlace === 'after' ? <span className="cv-frame__aside">{f.aside}</span> : null}
      </span>
      {data.emptyText ? <span className="cv-frame__empty">{data.emptyText}</span> : null}
    </div>
  );
}
export const FrameNode = memo(FrameNodeImpl);

// ---------- cards ----------

export interface CardData extends Record<string, unknown> {
  view: CardView;
  /** The streaming revision added or changed this card: it carries the BuildMark. */
  mark: boolean;
  /** The latest committed revision's number, when this card carries its tag. */
  tag: number | null;
  tagPressed: boolean;
  /** Linked from the record or the panel. */
  lit: boolean;
  /** Something else is linked: this card dims. */
  dim: boolean;
  /** Lit ids that name this card's badges (a badge was the target). */
  litBadges: string[];
  /** The pointer or keyboard is on this card. */
  hot: boolean;
  /** Entrance delay in ms when the card entered in this batch. */
  enter: number | null;
  /** Position changes ease (the card moved in this batch). */
  moving: boolean;
  /** Roving tabindex: this card or one of its badges holds the tab stop. */
  stop: string | null;
  ghost?: boolean;
}
export type CardNodeType = Node<CardData, 'card'>;

function Tag({ n, pressed }: { n: number; pressed: boolean }): ReactElement {
  const ui = useUi();
  return (
    <button
      type="button"
      className="cv-tag"
      tabIndex={-1}
      aria-pressed={pressed}
      aria-label={label(ui.lang, 'card.revTag', { n })}
      onMouseEnter={() => ui.tagEnter(n)}
      onMouseLeave={ui.tagLeave}
      onClick={(e) => {
        e.stopPropagation();
        ui.tagClick(n);
      }}
    >
      <span className="num">{n}</span>
    </button>
  );
}

function BuildMark({ on }: { on: boolean }): ReactElement | null {
  // the mark stays in the DOM while it fades out at commit
  const [shown, setShown] = useState(on);
  useEffect(() => {
    if (on) {
      setShown(true);
      return;
    }
    const id = window.setTimeout(() => setShown(false), 1300);
    return () => window.clearTimeout(id);
  }, [on]);
  return shown ? <i className="cv-mark" data-on={on || undefined} aria-hidden="true" /> : null;
}

function BadgeChip({ b, hostLabel, stop, lit }: { b: BadgeView; hostLabel: string; stop: boolean; lit: boolean }): ReactElement {
  const ui = useUi();
  const style = { left: b.x, top: b.y, width: b.w, height: b.h } as CSSProperties;
  return (
    <span
      className="cv-badge"
      data-as={b.as}
      data-lit={lit || undefined}
      data-nav-id={b.id}
      style={style}
      role="button"
      tabIndex={stop ? 0 : -1}
      aria-label={label(ui.lang, 'badge.on', { badge: b.short, host: hostLabel })}
      aria-describedby={ui.popId === b.id ? ui.popDomId : undefined}
      onMouseEnter={(e) => {
        e.stopPropagation();
        ui.pointerEnter(b.id);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        ui.pointerLeave(b.id);
      }}
      onFocus={(e) => {
        e.stopPropagation();
        ui.focus(b.id);
      }}
      onBlur={() => ui.blur(b.id)}
      onClick={(e) => {
        e.stopPropagation();
        ui.click(b.id);
      }}
    >
      <ProductIcon product={b.product} size={b.as === 'badge' ? 14 : 12} />
      {b.as === 'attachment' ? <span className="cv-badge__name">{b.short}</span> : null}
    </span>
  );
}

function CardNodeImpl({ data }: NodeProps<CardNodeType>): ReactElement {
  const ui = useUi();
  const c = data.view;
  const style = { '--tpx': `${c.titlePx}px`, '--delay': `${data.enter ?? 0}ms` } as CSSProperties;
  const hasChips = c.zones.length > 0;
  const accessible = [c.label, c.name !== c.label ? c.name : '', c.where].filter(Boolean).join(', ');
  if (data.ghost) {
    return (
      <div className="cv-unit" style={style} aria-hidden="true">
        <div className="cv-card cv-card--ghost">
          <div className="cv-card__body">
            <span className="cv-card__icon">
              <ProductIcon product={c.product} size={20} />
            </span>
            <span className="cv-card__text">
              <span className="cv-card__title">
                {c.titleLines.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }
  const fitText = c.fit ? ui.t(c.fit === 'primary' ? 'rec.recommended' : 'rec.optional') : '';
  return (
    <div className="cv-unit" data-dim={data.dim || undefined} data-enter={data.enter !== null || undefined} style={style}>
      <div
        className="cv-card"
        data-nav-id={c.id}
        data-hot={data.hot || undefined}
        data-lit={data.lit || undefined}
        data-rec={c.kind === 'rec' || undefined}
        role="button"
        tabIndex={data.stop === c.id ? 0 : -1}
        aria-label={[accessible, fitText].filter(Boolean).join(', ')}
        aria-describedby={[ui.popId === c.id ? ui.popDomId : '', data.stop === c.id ? 'cv-keys' : ''].filter(Boolean).join(' ') || undefined}
        onMouseEnter={() => ui.pointerEnter(c.id)}
        onMouseLeave={() => ui.pointerLeave(c.id)}
        onFocus={() => ui.focus(c.id)}
        onBlur={() => ui.blur(c.id)}
        onClick={() => ui.click(c.id)}
      >
        <div className="cv-card__body">
          <span className="cv-card__icon">
            <ProductIcon product={c.product} size={20} />
          </span>
          <span className="cv-card__text">
            <span className="cv-card__title">
              {c.titleLines.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </span>
            {c.subtitle || hasChips ? (
              <span className="cv-card__sub">
                <span className="cv-card__subtext">{c.subtitle}</span>
                {hasChips ? <span className="cv-card__zones num">{c.zones.join(' ')}</span> : null}
              </span>
            ) : null}
          </span>
        </div>
        {c.caution ? <Icon name="infoCircle" size={12} className="cv-card__caution" /> : null}
        {c.fit ? (
          <span className="cv-chip" data-fit={c.fit} aria-hidden="true">
            {fitText}
          </span>
        ) : null}
        <BuildMark on={data.mark} />
      </div>
      {data.tag !== null ? <Tag n={data.tag} pressed={data.tagPressed} /> : null}
      {c.badges.map((b) => (
        <BadgeChip key={b.id} b={b} hostLabel={c.label} stop={data.stop === b.id} lit={data.litBadges.includes(b.id)} />
      ))}
      {c.attachments.map((b) => (
        <BadgeChip key={b.id} b={b} hostLabel={c.label} stop={data.stop === b.id} lit={data.litBadges.includes(b.id)} />
      ))}
    </div>
  );
}

function sameData(a: NodeProps<CardNodeType>, b: NodeProps<CardNodeType>): boolean {
  const x = a.data;
  const y = b.data;
  return (
    x.view === y.view &&
    x.mark === y.mark &&
    x.tag === y.tag &&
    x.tagPressed === y.tagPressed &&
    x.lit === y.lit &&
    x.dim === y.dim &&
    x.hot === y.hot &&
    x.enter === y.enter &&
    x.moving === y.moving &&
    x.stop === y.stop &&
    x.ghost === y.ghost &&
    x.litBadges.join() === y.litBadges.join()
  );
}
export const CardNode = memo(CardNodeImpl, sameData);

// ---------- edges ----------

export interface EdgesData extends Record<string, unknown> {
  edges: EdgeDraw[];
  dimming: boolean;
}
export type EdgesNodeType = Node<EdgesData, 'edges'>;

function EdgesNodeImpl({ data }: NodeProps<EdgesNodeType>): ReactElement {
  return <EdgeLayer edges={data.edges} dimming={data.dimming} />;
}
export const EdgesNode = memo(EdgesNodeImpl);
