// The UI stroke icons: one authored set, 1.5 px strokes on a 16 px grid, currentColor, square caps. Product icons are a
// different thing (src/icons, the official set). Geometry is data (ui-icons.generated.ts), drawn with createElement.
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { UI_ICONS } from './ui-icons.generated.ts';
import type { UiIconName } from './ui-icons.generated.ts';

export type { UiIconName };

export interface IconProps {
  name: UiIconName;
  size?: number;
  className?: string;
  /** Accessible name; omit for decorative icons (the button or label beside it names the action). */
  title?: string;
}

const ATTR: Readonly<Record<string, string>> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
};

export function Icon({ name, size = 16, className, title }: IconProps): ReactElement {
  const nodes = UI_ICONS[name];
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: 'false' };
  return createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'square', strokeLinejoin: 'miter', className: className ? `icon ${className}` : 'icon', ...a11y },
    ...nodes.map((n, i) => {
      const props: Record<string, string> = { key: String(i) };
      for (const [k, v] of Object.entries(n.a)) props[ATTR[k] ?? k] = v;
      return createElement(n.el, props);
    }),
  );
}
