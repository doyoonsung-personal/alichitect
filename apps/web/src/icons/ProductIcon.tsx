// React rendering of catalog icons. Geometry is pre-sanitized data, so it is drawn with createElement, never
// dangerouslySetInnerHTML. Colour comes from CSS `color` (currentColor) unless `color` is passed.
import { createElement, type ReactElement } from 'react';
import { iconFor } from './index.ts';
import type { IconGeometry, IconNode } from './types.ts';

const REACT_ATTR: Readonly<Record<string, string>> = {
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'fill-opacity': 'fillOpacity',
};

function draw(n: IconNode, key: number, palette?: Readonly<Record<string, string>>): ReactElement {
  const props: Record<string, string | number> = { key };
  for (const [k, v] of Object.entries(n.a)) props[REACT_ATTR[k] ?? k] = k === 'fill' && palette?.[v] ? palette[v] : v;
  return createElement(n.el, props, ...(n.c ?? []).map((c, i) => draw(c, i, palette)));
}

export interface IconGlyphProps {
  geometry: IconGeometry;
  size?: number | string; // default 24
  color?: string; // default currentColor
  title?: string; // accessible name; omit for decorative icons (the card label names the product)
  className?: string;
  /** Replacement colours for literal fills in multi-colour icons, for example { '#FFFFFF': 'var(--card)' }. */
  palette?: Readonly<Record<string, string>>;
}

export function IconGlyph({ geometry, size = 24, color = 'currentColor', title, className, palette }: IconGlyphProps): ReactElement {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: 'false' };
  return createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: geometry.viewBox, width: size, height: size, fill: color, className, ...a11y },
    ...(title ? [createElement('title', { key: 't' }, title)] : []),
    ...geometry.nodes.map((n, i) => draw(n, i, palette)),
  );
}

export interface ProductIconProps extends Omit<IconGlyphProps, 'geometry'> {
  product: string; // catalog id
  family?: string; // the entry's icon family, used when the id has no mapping yet
}

export function ProductIcon({ product, family, ...rest }: ProductIconProps): ReactElement {
  const icon = iconFor(product, family);
  return createElement(IconGlyph, { geometry: icon.geometry, ...rest });
}
