import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import type { JSX } from 'react';

export interface AnchorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PopoverProps {
  id: string;
  open: boolean;
  anchor: AnchorRect | null;
  title: string;
  label: string;
  why?: string;
  purpose: string;
  meta: string[];
  note?: string;
}

interface Position {
  left: number;
  top: number;
  side: 'top' | 'bottom';
}

export function Popover(props: PopoverProps): JSX.Element | null {
  const { id, open, anchor, title, label, why, purpose, meta, note } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [measuring, setMeasuring] = useState(true);
  const [pos, setPos] = useState<Position>({ left: 0, top: 0, side: 'bottom' });

  // re-measure only when the anchor box or the content really changes (props arrive as fresh objects every render)
  const ax = anchor?.x, ay = anchor?.y, aw = anchor?.w, ah = anchor?.h;
  const contentKey = [title, label, why ?? '', purpose, note ?? '', meta.join('')].join('');
  useLayoutEffect(() => {
    if (!open || ax === undefined) return;
    setMeasuring(true);
  }, [open, ax, ay, aw, ah, contentKey]);

  useLayoutEffect(() => {
    if (!measuring || !open || !anchor || !ref.current) return;
    const h = ref.current.offsetHeight;
    const bottomY = anchor.y + anchor.h + 10;
    const fitsBelow = bottomY + h <= window.innerHeight - 12;
    const side: 'top' | 'bottom' = fitsBelow ? 'bottom' : 'top';
    const top =
      side === 'bottom' ? bottomY : anchor.y - h - 10;
    const rawLeft = anchor.x + anchor.w / 2 - 150;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - 312));
    setPos({ left, top, side });
    setMeasuring(false);
  }, [measuring, open, anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !anchor) return null;

  const content = (
    <div
      role="tooltip"
      id={id}
      className="pop"
      data-side={pos.side}
      data-measuring={measuring ? 'true' : undefined}
      ref={ref}
      style={{ position: 'fixed', left: pos.left, top: pos.top }}
    >
      <div className="pop-title">{title}</div>
      {label !== title && <div className="pop-label">{label}</div>}
      {why && (
        <>
          <div className="pop-k">Why it is here</div>
          <p className="pop-why">{why}</p>
        </>
      )}
      <div className="pop-k">What it does</div>
      <p className="pop-purpose">{purpose}</p>
      {note && <p className="pop-note">{note}</p>}
      {meta.length > 0 && (
        <ul className="pop-meta">
          {meta.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
