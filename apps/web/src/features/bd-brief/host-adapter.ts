// The ONLY bridge between the BD brief module and the app's store (plan §4 rule 2). It reads
// the committed SessionRecord and returns a fresh BriefSnapshot copy; it never dispatches and
// never hands out a mutable reference into app state. All extraction rules live in snapshot.ts
// so they can be unit-tested without a store; this file only wires store + catalog into them.
import type { Catalog } from '@ali/core/types.ts';
import type { BriefSnapshot, Lang } from '@ali/bd-brief/types.ts';
import { entryFor } from '../../canvas/scene.ts';
import type { Store } from '../../store/store.ts';
import { buildSnapshot } from './snapshot.ts';

export interface SnapshotInputOpts {
  lang: Lang;
  objective: string | null;
  now: number;
}

export function readSnapshotInputs(store: Store, catalog: Catalog, opts: SnapshotInputOpts): BriefSnapshot {
  const session = store.getState().session;
  return buildSnapshot(session, { nameOf: (productId) => entryFor(catalog, productId)?.name ?? null }, opts);
}
