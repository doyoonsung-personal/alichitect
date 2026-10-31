// Hover and focus state for the "why" popover, shared by cards and badges without re-creating node data.
import { createContext } from 'react';

export interface HoverApi {
  current: string | null;
  show(id: string, rect: DOMRect): void;
  hide(id: string): void;
}

export const HoverContext = createContext<HoverApi>({ current: null, show: () => {}, hide: () => {} });
