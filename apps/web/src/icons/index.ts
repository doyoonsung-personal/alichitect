// Public icon API for the web app.
//   iconFor(catalogId, family?) -> { geometry, source: 'official' | 'fallback', confidence, key }
// Every catalog id has a verified row in catalog-map.generated.ts (built from scripts/icons/mapping.json). An id the
// mapping does not know yet, for example a catalog entry added after the last build, falls back to its icon family's
// default glyph and then to the generic glyph, so the canvas never draws a card without an icon.
import type { CatalogIcon } from './types.ts';
import { CATALOG_ICONS, FAMILY_ICONS } from './catalog-map.generated.ts';

export type { CatalogIcon, IconConfidence, IconGeometry, IconNode, IconSource } from './types.ts';
export { iconSvg, type SvgOptions } from './svg.ts';
export { LOGOS, type BrandLogo } from './brand.generated.ts';

export function iconFor(catalogId: string, family?: string): CatalogIcon {
  const own = Object.hasOwn(CATALOG_ICONS, catalogId) ? CATALOG_ICONS[catalogId] : undefined;
  if (own) return own;
  const fam = family && Object.hasOwn(FAMILY_ICONS, family) ? FAMILY_ICONS[family] : undefined;
  return fam ?? FAMILY_ICONS.generic;
}

/** True when the id has its own verified mapping (not a family default). */
export function hasOwnIcon(catalogId: string): boolean {
  return Object.hasOwn(CATALOG_ICONS, catalogId);
}
