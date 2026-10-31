// Browser-side data: the catalog and the streams, bundled by Vite from the repo.
import products from '../../../packages/core/catalog/products.json';
import offerings from '../../../packages/core/catalog/offerings.json';
import recorded from '../../../research/probes/streams.json';
import idMap from '../../../packages/core/test/fixtures/probe-id-map.json';
import synthetic from './replay/synthetic.json';
import { createCatalog } from '../../../packages/core/src/catalog.ts';
import type { CatalogFile } from '../../../packages/core/src/catalog.ts';
import type { ScenarioData, StreamFile } from './replay/scenarios.ts';

export const catalog = createCatalog(products as unknown as CatalogFile, offerings as unknown as CatalogFile);
export const data: ScenarioData = {
  recorded: recorded as unknown as StreamFile,
  synthetic: synthetic as unknown as StreamFile,
  idMap: idMap as Record<string, string>,
};
