// Card text rule for the stacked variant. One rule for every card:
//   title    = the node label (a recommendation's title is the product's short name)
//   subtitle = the product's official short name. When the title already says it, the official full name when it
//              fits (without a trailing "(ABBR)" if only that fits), else nothing. Recommendations show the purchase
//              model instead. Never the lane name.
// Pure: the caller passes a `fits` predicate for the subtitle (the bench measures with its Inter advance table).
import type { LayoutCard } from '../../../../packages/core/src/layout.ts';
import type { Catalog, CatalogEntry, Graph } from '../../../../packages/core/src/types.ts';

export interface CardText {
  title: string;
  subtitle: string;
}

const PURCHASE: Record<string, string> = {
  'saas-seat': 'Per-seat SaaS',
  'subscription-plan': 'Subscription plan',
  'cloud-payg': 'Pay as you go',
  'open-source': 'Open source',
  'contact-sales': 'Contact sales',
};

export function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  const direct = catalog.byId.get(product);
  if (direct) return direct;
  try {
    return catalog.resolve(product).entry;
  } catch {
    return undefined;
  }
}

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
const same = (a: string, b: string): boolean => norm(a) === norm(b);

export function stackedCardText(card: LayoutCard, display: Graph, catalog: Catalog, fits: (subtitle: string) => boolean = () => true): CardText {
  const e = entryOf(catalog, card.product);
  const short = e?.short ?? card.product;
  const node = Object.prototype.hasOwnProperty.call(display.nodes, card.id) ? display.nodes[card.id] : undefined;
  const title = card.kind === 'rec' ? short : (node?.label ?? card.id).trim() || short;
  if (card.kind === 'rec') {
    const p = e?.purchase ? PURCHASE[e.purchase] : undefined;
    if (p) return { title, subtitle: p };
  } else if (!same(title, short)) {
    return { title, subtitle: short };
  }
  // the title already is the short name: the official full name, if it adds something and fits
  const name = e?.name ?? '';
  if (!name || same(name, title)) return { title, subtitle: '' };
  if (fits(name)) return { title, subtitle: name };
  const bare = name.replace(/\s*\([^)]*\)\s*$/, '');
  if (bare && !same(bare, title) && fits(bare)) return { title, subtitle: bare };
  return { title, subtitle: '' };
}
