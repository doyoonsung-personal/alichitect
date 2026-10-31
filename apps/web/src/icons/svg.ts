// Framework-free rendering of icon geometry to an SVG string (contact sheets, tests, non-React surfaces).
import type { IconGeometry, IconNode } from './types.ts';

export interface SvgOptions {
  size?: number; // px, square; default 24
  color?: string; // root fill; default currentColor
  title?: string; // accessible name; omitted means aria-hidden
  /** Replacement colours for literal fills in multi-colour icons, for example { '#FFFFFF': 'var(--card)' }. */
  palette?: Readonly<Record<string, string>>;
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');

function nodeSvg(n: IconNode, palette: Readonly<Record<string, string>> | undefined): string {
  const attrs = Object.entries(n.a)
    .map(([k, v]) => `${k}="${escapeAttr(k === 'fill' && palette?.[v] ? palette[v] : v)}"`)
    .join(' ');
  const open = `<${n.el}${attrs ? ' ' + attrs : ''}`;
  if (!n.c || n.c.length === 0) return n.el === 'g' ? `${open}></g>` : `${open}/>`;
  return `${open}>${n.c.map((c) => nodeSvg(c, palette)).join('')}</${n.el}>`;
}

export function iconSvg(g: IconGeometry, opts: SvgOptions = {}): string {
  const size = opts.size ?? 24;
  const a11y = opts.title ? `role="img" aria-label="${escapeAttr(opts.title)}"` : 'aria-hidden="true" focusable="false"';
  const title = opts.title ? `<title>${escapeText(opts.title)}</title>` : '';
  const body = g.nodes.map((n) => nodeSvg(n, opts.palette)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttr(g.viewBox)}" width="${size}" height="${size}" fill="${escapeAttr(opts.color ?? 'currentColor')}" ${a11y}>${title}${body}</svg>`;
}
