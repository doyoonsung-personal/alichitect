// React Flow node types: product cards (with badges and attachments) and container frames.
import { memo, useContext } from 'react';
import type { CSSProperties, JSX } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { CatalogEntry, IconFamily, Lane } from '../../../../packages/core/src/types.ts';
import { GLYPHS } from './glyphs.ts';
import { HoverContext } from './hover.ts';

/** Lane -> tint family; the tokens define --hue-<family>-fg/-bg for both themes. */
const HUE: Record<Lane, string> = {
  clients: 'external', onprem: 'external', thirdparty: 'external',
  dns: 'edge', edge: 'edge',
  ingress: 'ingress', boundary: 'ingress', network: 'ingress',
  compute: 'compute',
  cache: 'data', database: 'data', search: 'data', filestore: 'data', storage: 'data',
  middleware: 'integration', integration: 'integration',
  ai: 'ai', analytics: 'analytics', ops: 'ops',
  security: 'security', governance: 'security',
  saas: 'saas',
};
export const hueOf = (e: CatalogEntry | undefined): string => (e ? HUE[e.lane] ?? 'ops' : 'ops');

export function Glyph({ icon, size = 18 }: { icon: IconFamily | undefined; size?: number }): JSX.Element {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLYPHS[icon ?? 'generic'] ?? GLYPHS.generic }} />
  );
}

export interface BadgeView {
  id: string;
  as: 'badge' | 'attachment';
  dx: number; // offset from the card's top-left
  dy: number;
  w: number;
  h: number;
  icon: IconFamily;
  short: string;
  hue: string;
}

export interface CardData extends Record<string, unknown> {
  id: string;
  label: string;
  secondary: string;
  icon: IconFamily;
  hue: string;
  zones?: string[];
  fit?: 'primary' | 'complement';
  path: boolean;
  badges: BadgeView[];
  anim?: 'enter' | 'exit';
  stagger?: number;
}

export type CardNodeType = Node<CardData, 'card'>;

const hidden: CSSProperties = { opacity: 0, pointerEvents: 'none', width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 };

function CardNodeImpl({ data }: NodeProps<CardNodeType>): JSX.Element {
  const hover = useContext(HoverContext);
  const enter = (id: string) => (ev: { currentTarget: Element }) => hover.show(id, ev.currentTarget.getBoundingClientRect());
  const style = { '--stagger': `${data.stagger ?? 0}ms` } as CSSProperties;
  return (
    <div
      className={`card${data.anim === 'enter' ? ' is-entering' : ''}${data.anim === 'exit' ? ' is-exiting' : ''}`}
      data-hue={data.hue}
      data-fit={data.fit}
      style={style}
      tabIndex={data.anim === 'exit' ? -1 : 0}
      role="button"
      aria-label={`${data.label}, ${data.secondary}${data.zones?.length ? `, zones ${data.zones.join(' and ').toUpperCase()}` : ''}`}
      aria-describedby={hover.current === data.id ? 'card-pop' : undefined}
      onMouseEnter={enter(data.id)}
      onMouseLeave={() => hover.hide(data.id)}
      onFocus={enter(data.id)}
      onBlur={() => hover.hide(data.id)}
    >
      <span className="card-glyph">
        <Glyph icon={data.icon} />
      </span>
      <span className="card-text">
        <span className="card-label">{data.label}</span>
        <span className="card-sub">{data.secondary}</span>
      </span>
      {data.fit === 'primary' && <span className="card-fit">Primary</span>}
      {data.zones && data.zones.length > 1 && (
        <span className="card-zones" title={`Spans zones ${data.zones.join(', ').toUpperCase()}`}>
          {data.zones.map((z) => (
            <i key={z}>{z.toUpperCase()}</i>
          ))}
        </span>
      )}
      {data.badges.map((b) =>
        b.as === 'badge' ? (
          <span
            key={b.id}
            className="card-badge"
            data-hue={b.hue}
            style={{ left: b.dx, top: b.dy, width: b.w, height: b.h }}
            tabIndex={0}
            role="button"
            aria-label={`${b.short} on ${data.label}`}
            onMouseEnter={(ev) => {
              ev.stopPropagation();
              hover.show(b.id, ev.currentTarget.getBoundingClientRect());
            }}
            onMouseLeave={(ev) => {
              ev.stopPropagation();
              hover.show(data.id, (ev.currentTarget.parentElement as Element).getBoundingClientRect());
            }}
            onFocus={(ev) => {
              ev.stopPropagation();
              hover.show(b.id, ev.currentTarget.getBoundingClientRect());
            }}
          >
            <Glyph icon={b.icon} size={13} />
          </span>
        ) : (
          <span key={b.id} className="card-attach" data-hue={b.hue} style={{ left: b.dx, top: b.dy, height: b.h }} onMouseEnter={(ev) => hover.show(b.id, ev.currentTarget.getBoundingClientRect())} onMouseLeave={() => hover.hide(b.id)}>
            <Glyph icon={b.icon} size={11} />
            {b.short}
          </span>
        ),
      )}
      <Handle type="target" position={Position.Left} isConnectable={false} style={hidden} />
      <Handle type="source" position={Position.Right} isConnectable={false} style={hidden} />
    </div>
  );
}
export const CardNode = memo(CardNodeImpl);

export interface FrameData extends Record<string, unknown> {
  kind: string;
  label: string;
  caption?: string;
  w: number;
  h: number;
  empty: boolean;
}
export type FrameNodeType = Node<FrameData, 'frame'>;

function FrameNodeImpl({ data }: NodeProps<FrameNodeType>): JSX.Element {
  return (
    <div className="frame" data-kind={data.kind} style={{ width: data.w, height: data.h }}>
      <span className="frame-label">
        {data.label}
        {data.caption && <span className="frame-caption">{data.caption}</span>}
      </span>
      {data.empty && data.kind === 'solution' && <span className="frame-empty">Nothing to provision</span>}
      <Handle type="target" position={Position.Left} isConnectable={false} style={hidden} />
      <Handle type="source" position={Position.Right} isConnectable={false} style={hidden} />
    </div>
  );
}
export const FrameNode = memo(FrameNodeImpl);
