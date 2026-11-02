// Same drawing rules as the UI icon set (16 px grid, 1.5 px stroke, square caps); the set has no download glyph yet.
import type { ReactElement } from 'react';

export function DownloadIcon(): ReactElement {
  return (
    <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <line x1="8" y1="2.5" x2="8" y2="10.5" />
      <polyline points="4.5,7.5 8,11 11.5,7.5" />
      <line x1="2.5" y1="13.5" x2="13.5" y2="13.5" />
    </svg>
  );
}
