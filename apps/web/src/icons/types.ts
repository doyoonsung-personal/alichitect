// Icon contract for the web app. Geometry is sanitized at build time (apps/web/scripts/icons/sanitize.ts) and drawn
// on a 1024 grid. A node without a fill inherits currentColor from the root, so the theme controls the colour.

export type IconElement = 'g' | 'path' | 'circle' | 'ellipse' | 'rect' | 'polygon' | 'polyline';

export interface IconNode {
  el: IconElement;
  a: Readonly<Record<string, string>>; // geometry and paint attributes only, in SVG spelling (fill-rule, not fillRule)
  c?: readonly IconNode[];
}

export interface IconGeometry {
  viewBox: string; // '0 0 1024 1024'
  nodes: readonly IconNode[];
  /** True when some nodes keep a literal fill (for example a white knockout) instead of currentColor. */
  multicolor: boolean;
}

export interface OfficialIcon extends IconGeometry {
  key: string; // stable key derived from the iconfont code, for example 'ecs', 'csk', 'hitsdb'
  name: string; // source name as published: '<code> <Chinese name>'
  iconfontId: number;
}

export interface FallbackIcon extends IconGeometry {
  key: string;
  name: string; // what the glyph depicts, in English
}

export type IconSource = 'official' | 'fallback';

/**
 * exact: the product's own official icon, or a fallback drawn for this product.
 * close: the icon of a predecessor, edition, sibling or parent product.
 * generic: a family glyph standing in for the category.
 */
export type IconConfidence = 'exact' | 'close' | 'generic';

export interface CatalogIcon {
  geometry: IconGeometry;
  source: IconSource;
  confidence: IconConfidence;
  key: string; // the official or fallback icon key, for debugging and contact sheets
}
