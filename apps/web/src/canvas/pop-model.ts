// The content of the "why it's here" popover (spec 7.27), assembled from the card, the model's reason and the catalog.
// Pure, so the rules (verbatim reason, catalog purpose, dated price, the link) are testable.
import type { Catalog } from '@ali/core/types.ts';
import type { Lang, TFn } from '../i18n/t.ts';
import type { BadgeView, CardView } from './scene.ts';
import { cautionOf, entryFor } from './scene.ts';

export interface PopContent {
  id: string;
  product: string;
  /** Full official name. */
  title: string;
  /** Category · where. */
  meta: string;
  /** The model's reason, verbatim. Null when the model gave none. */
  why: string | null;
  /** The catalog's purpose. */
  what: string | null;
  note: string | null;
  price: string | null;
  addedIn: string | null;
  attachedTo: string | null;
  docs: string | null;
}

export type Provenance = Record<string, { addedIn: number; changedIn: number }>;

/** Only an official https link is offered: catalog data is ours, but the rule holds if an entry is ever wrong. */
export function safeDocs(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

export function popContent(target: CardView | BadgeView, hostLabel: string | null, catalog: Catalog, prov: Provenance, lang: Lang, t: TFn): PopContent {
  const e = entryFor(catalog, target.product);
  const isCard = 'titleLines' in target;
  const where = isCard ? target.where : '';
  const fromProv = prov[target.id] ?? (isCard ? undefined : prov[target.host]);
  const price = e?.price ? t('pop.price', { summary: e.price.summary, date: e.price.asOf }) : null;
  return {
    id: target.id,
    product: target.product,
    title: e?.name ?? target.product,
    meta: [e?.category, where].filter(Boolean).join(' · '),
    why: target.why && target.why.trim() ? target.why.trim() : null,
    what: e?.purpose ?? null,
    note: cautionOf(e, lang),
    price,
    addedIn: fromProv ? t('pop.addedIn', { n: fromProv.addedIn }) : null,
    attachedTo: !isCard && hostLabel ? t('pop.attachedTo', { host: hostLabel }) : null,
    docs: safeDocs(e?.docs),
  };
}
