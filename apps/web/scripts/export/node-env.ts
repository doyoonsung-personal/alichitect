// Shared by the export tests and the sample script: plays a recorded conversation through the app's reducer and turns
// the final state into a PDF with the Node font source, the channel router (or libavoid when it loads) and the logo files.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import type { Catalog } from '@ali/core/types.ts';
import { AvoidLib } from 'libavoid-js';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../../src/routing/avoid.ts';
import { routeChannels } from '../../src/routing/channel.ts';
import type { RouteRequest, RouteResult } from '../../src/routing/types.ts';
import { LOGOS } from '../../src/icons/brand.generated.ts';
import type { Lang } from '../../src/i18n/t.ts';
import { generateProposalPdf } from '../../src/export/generate.ts';
import type { GenerateResult } from '../../src/export/generate.ts';
import { nodeFontSource } from '../../src/export/fonts-node.ts';
import { createInitialState } from '../../src/store/reducer.ts';
import { createStore } from '../../src/store/store.ts';
import type { Store } from '../../src/store/store.ts';
import type { AppState } from '../../src/store/types.ts';
import { play } from '../../src/test/fixtures.ts';
import type { Fixture } from '../../src/replay/plan.ts';

export const catalog: Catalog = loadCatalog();

export function fixture(id: string): Fixture {
  return JSON.parse(readFileSync(new URL(`../../src/replay/fixtures/${id}.json`, import.meta.url), 'utf8')) as Fixture;
}

/** Plays a fixture to the end in `lang`'s UI and returns the store. */
export function playFixture(id: string, lang: Lang): Store {
  const store = createStore(catalog, createInitialState({ lang, canvas: { w: 1040, h: 800 }, id: 'export-' + id, now: 0 }));
  play(store, fixture(id));
  return store;
}

export function logoFor(lang: Lang): { svg: string; aspect: number } {
  const l = lang === 'zh' ? LOGOS.zh : LOGOS.en;
  return { svg: readFileSync(new URL(`../../public/${l.file}`, import.meta.url), 'utf8'), aspect: l.aspect };
}

export const channelRoute = async (req: RouteRequest): Promise<RouteResult> => routeChannels(req);

let avoidLoaded: Promise<void> | null = null;
/** libavoid (the router the canvas uses) in Node; the channel router answers if it cannot load. */
export async function avoidRoute(req: RouteRequest): Promise<RouteResult> {
  try {
    avoidLoaded ??= AvoidLib.load(fileURLToPath(new URL('../../node_modules/libavoid-js/dist/libavoid.wasm', import.meta.url)));
    await avoidLoaded;
    const state = createAvoidState(AvoidLib.getInstance());
    try {
      return routeWithAvoid(state, req);
    } finally {
      disposeAvoidState(state);
    }
  } catch {
    return routeChannels(req);
  }
}

export function generateFromState(state: AppState, o: { title?: string; customer?: string; route?: (r: RouteRequest) => Promise<RouteResult>; now?: Date } = {}): Promise<GenerateResult> {
  return generateProposalPdf({
    session: state.session,
    graph: state.display.graph,
    layout: state.display.layout,
    catalog,
    lang: state.lang,
    title: o.title ?? '',
    customer: o.customer ?? '',
    now: o.now ?? new Date(2026, 9, 31, 12, 0, 0),
    fontSource: nodeFontSource(),
    route: o.route ?? avoidRoute,
    logo: logoFor(state.lang),
  });
}
