// Node-only loader: reads catalog/products.json and catalog/offerings.json next to this package and builds the Catalog.
import { readFileSync } from 'node:fs';
import { createCatalog } from './catalog.ts';
import type { CatalogFile } from './catalog.ts';
import type { Catalog } from './types.ts';

const CATALOG_DIR = new URL('../catalog/', import.meta.url);

/** Parses one catalog file ('products.json' or 'offerings.json') from packages/core/catalog/. */
export function readCatalogFile(name: 'products.json' | 'offerings.json'): CatalogFile {
  const file = JSON.parse(readFileSync(new URL(name, CATALOG_DIR), 'utf8')) as CatalogFile;
  if (!file || typeof file.version !== 'string' || !Array.isArray(file.entries)) throw new Error(`catalog/${name}: expected { version, entries[] }`);
  return file;
}

/** Loads both catalog files and returns the indexed Catalog. */
export function loadCatalog(): Catalog {
  return createCatalog(readCatalogFile('products.json'), readCatalogFile('offerings.json'));
}
